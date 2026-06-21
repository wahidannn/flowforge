import type { Prisma } from "@prisma/client";
import type { TaskStatus } from "@flowforge/shared";
import type { AuthUser } from "../../types";
import { AppError, conflict, forbidden, notFound } from "../../errors";
import { prisma } from "../../lib/prisma";
import { assertProjectMembership } from "../projects/service";
import {
  assertStatusTransition,
  canDeleteAttachment,
  canDeleteOrRestoreTask,
  canManageDependencies,
  canUpdateTaskMetadata,
  canUploadAttachment,
  canViewAttachments,
  canViewAudit,
  canViewTask,
} from "../permissions/policy";
import { blockedBy, toClientTaskDto, toInternalTaskDto } from "./dto";
import { findTask, taskInclude } from "./repository";

type TaskTransaction = Prisma.TransactionClient;

export type CreateTaskInput = {
  title: string;
  description: string;
  assigneeId?: string | null;
  priority?: string;
  dueDate?: string | null;
  clientVisible: boolean;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & { version: number };

export type StatusInput = {
  version: number;
  status: TaskStatus;
};

export type VersionInput = {
  version: number;
};

export type AttachmentInput = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
};

function taskDtoForUser(user: AuthUser, task: Parameters<typeof toInternalTaskDto>[0]) {
  return user.role === "CLIENT" ? toClientTaskDto(task) : toInternalTaskDto(task);
}

async function latestConflict(taskId: string, tx: TaskTransaction = prisma) {
  const latest = await tx.task.findFirst({ where: { id: taskId }, include: taskInclude });
  throw conflict(undefined, {
    currentVersion: latest?.version,
    currentTask: latest ? toInternalTaskDto(latest) : null,
  });
}

async function ensureTaskAccess(taskId: string, user: AuthUser, includeDeleted = false) {
  const task = includeDeleted
    ? await prisma.task.findFirst({ where: { id: taskId }, include: taskInclude })
    : await findTask(taskId);
  if (!task) throw notFound("Task not found.");
  await assertProjectMembership(task.projectId, user.id);
  if (!includeDeleted && !canViewTask({ userId: user.id, role: user.role, task })) throw forbidden();
  return task;
}

async function hasActiveDependencyPath(fromTaskId: string, targetTaskId: string, seen = new Set<string>()): Promise<boolean> {
  if (fromTaskId === targetTaskId) return true;
  if (seen.has(fromTaskId)) return false;
  seen.add(fromTaskId);

  const dependencies = await prisma.taskDependency.findMany({
    where: { taskId: fromTaskId, deletedAt: null, dependsOnTask: { deletedAt: null } },
    select: { dependsOnTaskId: true },
  });

  for (const dependency of dependencies) {
    if (await hasActiveDependencyPath(dependency.dependsOnTaskId, targetTaskId, seen)) return true;
  }
  return false;
}

export async function listBoardTasks(user: AuthUser, projectId: string) {
  await assertProjectMembership(projectId, user.id);

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      ...(user.role === "INTERNAL" ? { assigneeId: user.id } : {}),
      ...(user.role === "CLIENT" ? { clientVisible: true } : {}),
    },
    include: taskInclude,
    orderBy: { createdAt: "asc" },
  });

  return tasks.map((task) => taskDtoForUser(user, task));
}

export async function listDeletedTasks(user: AuthUser, projectId: string) {
  if (user.role !== "PM") throw forbidden("Only PM can view deleted tasks.");
  await assertProjectMembership(projectId, user.id);

  const tasks = await prisma.task.findMany({
    where: { projectId, deletedAt: { not: null } },
    include: taskInclude,
    orderBy: { deletedAt: "desc" },
  });

  return tasks.map(toInternalTaskDto);
}

export async function createTask(user: AuthUser, projectId: string, input: CreateTaskInput) {
  if (user.role !== "PM") throw forbidden("Only PM can create tasks.");
  await assertProjectMembership(projectId, user.id);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        clientVisible: input.clientVisible,
      },
    });
    await tx.auditLog.create({
      data: {
        taskId: created.id,
        actorUserId: user.id,
        action: "CREATE",
        newValue: { title: created.title, status: created.status },
      },
    });
    return tx.task.findFirstOrThrow({ where: { id: created.id }, include: taskInclude });
  });

  return toInternalTaskDto(task);
}

export async function getTask(user: AuthUser, taskId: string) {
  const task = await ensureTaskAccess(taskId, user);
  return taskDtoForUser(user, task);
}

export async function updateTask(user: AuthUser, taskId: string, input: UpdateTaskInput) {
  if (!canUpdateTaskMetadata(user.role)) throw forbidden("Only PM can update task metadata.");
  const current = await ensureTaskAccess(taskId, user);
  const { version, dueDate, ...data } = input;

  const updated = await prisma.$transaction(async (tx) => {
    const updateData = { ...data, dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined };
    const result = await tx.task.updateMany({
      where: { id: taskId, version, deletedAt: null },
      data: { ...updateData, version: { increment: 1 } },
    });
    if (result.count === 0) await latestConflict(taskId, tx);

    const latest = await tx.task.findFirstOrThrow({ where: { id: taskId }, include: taskInclude });
    const auditData = Object.entries(updateData)
      .filter(([key, value]) => value !== undefined && current[key as keyof typeof current] !== value)
      .map(([field, newValue]) => ({
        taskId,
        actorUserId: user.id,
        action: "UPDATE" as const,
        field,
        oldValue: current[field as keyof typeof current] as never,
        newValue: newValue as never,
      }));
    if (auditData.length) await tx.auditLog.createMany({ data: auditData });
    return latest;
  });

  return toInternalTaskDto(updated);
}

export async function updateTaskStatus(user: AuthUser, taskId: string, input: StatusInput) {
  const current = await ensureTaskAccess(taskId, user);
  const blockers = blockedBy(current);

  assertStatusTransition({
    role: user.role,
    userId: user.id,
    assigneeId: current.assigneeId,
    from: current.status,
    to: input.status,
    isBlocked: blockers.length > 0,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id: taskId, version: input.version, deletedAt: null },
      data: { status: input.status, version: { increment: 1 } },
    });
    if (result.count === 0) await latestConflict(taskId, tx);

    await tx.auditLog.create({
      data: {
        taskId,
        actorUserId: user.id,
        action: "STATUS_CHANGE",
        field: "status",
        oldValue: current.status,
        newValue: input.status,
      },
    });
    return tx.task.findFirstOrThrow({ where: { id: taskId }, include: taskInclude });
  });

  return toInternalTaskDto(updated);
}

export async function deleteTask(user: AuthUser, taskId: string, input: VersionInput) {
  if (!canDeleteOrRestoreTask(user.role)) throw forbidden("Only PM can delete tasks.");
  await ensureTaskAccess(taskId, user);

  await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id: taskId, version: input.version, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    if (result.count === 0) await latestConflict(taskId, tx);
    await tx.auditLog.create({ data: { taskId, actorUserId: user.id, action: "SOFT_DELETE" } });
  });

  return { ok: true };
}

export async function restoreTask(user: AuthUser, taskId: string, input: VersionInput) {
  if (!canDeleteOrRestoreTask(user.role)) throw forbidden("Only PM can restore tasks.");
  const task = await ensureTaskAccess(taskId, user, true);

  await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id: task.id, version: input.version, deletedAt: { not: null } },
      data: { deletedAt: null, version: { increment: 1 } },
    });
    if (result.count === 0) await latestConflict(task.id, tx);
    await tx.auditLog.create({ data: { taskId: task.id, actorUserId: user.id, action: "RESTORE" } });
  });

  return { ok: true };
}

export async function addDependency(user: AuthUser, taskId: string, input: VersionInput & { dependsOnTaskId: string }) {
  if (!canManageDependencies(user.role)) throw forbidden("Only PM can manage dependencies.");
  const task = await ensureTaskAccess(taskId, user);
  if (task.id === input.dependsOnTaskId) throw new AppError("CIRCULAR_DEPENDENCY", "Task cannot depend on itself.", 422);

  const dependsOn = await findTask(input.dependsOnTaskId);
  if (!dependsOn || dependsOn.projectId !== task.projectId) throw notFound("Dependency task not found.");
  if (await hasActiveDependencyPath(input.dependsOnTaskId, task.id)) {
    throw new AppError("CIRCULAR_DEPENDENCY", "Dependency would create a cycle.", 422);
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id: task.id, version: input.version, deletedAt: null },
      data: { version: { increment: 1 } },
    });
    if (result.count === 0) await latestConflict(task.id, tx);

    await tx.taskDependency.upsert({
      where: { taskId_dependsOnTaskId: { taskId: task.id, dependsOnTaskId: input.dependsOnTaskId } },
      update: { deletedAt: null },
      create: { taskId: task.id, dependsOnTaskId: input.dependsOnTaskId },
    });
    await tx.auditLog.create({
      data: {
        taskId: task.id,
        actorUserId: user.id,
        action: "DEPENDENCY_ADD",
        field: "dependsOnTaskId",
        newValue: input.dependsOnTaskId,
      },
    });
  });

  return { ok: true };
}

export async function removeDependency(user: AuthUser, taskId: string, dependencyId: string, input: VersionInput) {
  if (!canManageDependencies(user.role)) throw forbidden("Only PM can manage dependencies.");
  const task = await ensureTaskAccess(taskId, user);
  const dependency = await prisma.taskDependency.findFirst({
    where: { id: dependencyId, taskId: task.id, deletedAt: null },
  });
  if (!dependency) throw notFound("Dependency not found.");

  await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id: task.id, version: input.version, deletedAt: null },
      data: { version: { increment: 1 } },
    });
    if (result.count === 0) await latestConflict(task.id, tx);
    await tx.taskDependency.update({
      where: { id: dependency.id },
      data: { deletedAt: new Date() },
    });
    await tx.auditLog.create({
      data: { taskId: task.id, actorUserId: user.id, action: "DEPENDENCY_REMOVE", field: "dependencyId", oldValue: dependency.id },
    });
  });

  return { ok: true };
}

export async function addAttachment(user: AuthUser, taskId: string, input: AttachmentInput) {
  const task = await ensureTaskAccess(taskId, user);
  if (!canUploadAttachment({ userId: user.id, role: user.role, task })) throw forbidden();

  return prisma.$transaction(async (tx) => {
    const attachment = await tx.attachment.create({ data: { ...input, taskId: task.id, uploaderId: user.id } });
    await tx.auditLog.create({
      data: { taskId: task.id, actorUserId: user.id, action: "ATTACHMENT_ADD", newValue: { fileName: attachment.fileName } },
    });
    return attachment;
  });
}

export async function listAttachments(user: AuthUser, taskId: string) {
  const task = await ensureTaskAccess(taskId, user);
  if (!canViewAttachments(user.role)) return [];
  return prisma.attachment.findMany({ where: { taskId: task.id, deletedAt: null } });
}

export async function deleteAttachment(user: AuthUser, taskId: string, attachmentId: string) {
  const task = await ensureTaskAccess(taskId, user);
  const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, taskId: task.id, deletedAt: null } });
  if (!attachment) throw notFound("Attachment not found.");
  if (!canDeleteAttachment({ userId: user.id, role: user.role, task, uploaderId: attachment.uploaderId })) throw forbidden();

  await prisma.$transaction(async (tx) => {
    await tx.attachment.update({ where: { id: attachment.id }, data: { deletedAt: new Date() } });
    await tx.auditLog.create({
      data: { taskId: task.id, actorUserId: user.id, action: "ATTACHMENT_DELETE", oldValue: { fileName: attachment.fileName } },
    });
  });

  return { ok: true };
}

export async function listAudit(user: AuthUser, taskId: string) {
  const task = await ensureTaskAccess(taskId, user);
  if (!canViewAudit(user.role)) throw forbidden("Client guests cannot view audit trail.");
  return prisma.auditLog.findMany({ where: { taskId: task.id }, orderBy: { createdAt: "desc" } });
}
