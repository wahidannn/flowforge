import type { TaskStatus, UserRole } from "@flowforge/shared";
import { AppError } from "../../errors";

type TaskAccessTarget = {
  assigneeId: string | null;
  clientVisible: boolean;
};

export type TaskAccessInput = {
  userId: string;
  role: UserRole;
  task: TaskAccessTarget;
};

export function canManageProject(role: UserRole) {
  return role === "PM";
}

export function canCreateTask(role: UserRole) {
  return role === "PM";
}

export function canViewTask(input: TaskAccessInput) {
  if (input.role === "PM") return true;
  if (input.role === "INTERNAL") return input.task.assigneeId === input.userId;
  return input.task.clientVisible;
}

export function canUpdateTaskMetadata(role: UserRole) {
  return role === "PM";
}

export function canManageDependencies(role: UserRole) {
  return role === "PM";
}

export function canDeleteOrRestoreTask(role: UserRole) {
  return role === "PM";
}

export function canUploadAttachment(input: TaskAccessInput) {
  if (input.role === "PM") return true;
  return input.role === "INTERNAL" && input.task.assigneeId === input.userId;
}

export function canDeleteAttachment(input: TaskAccessInput & { uploaderId: string }) {
  if (input.role === "PM") return true;
  return input.role === "INTERNAL" && input.task.assigneeId === input.userId && input.uploaderId === input.userId;
}

export function canViewAttachments(role: UserRole) {
  return role !== "CLIENT";
}

export function canViewAudit(role: UserRole) {
  return role !== "CLIENT";
}

export function canViewStandup(role: UserRole) {
  return role !== "CLIENT";
}

export function canGenerateStandup(role: UserRole) {
  return role === "PM";
}

export function assertStatusTransition(params: {
  role: UserRole;
  userId: string;
  assigneeId: string | null;
  from: TaskStatus;
  to: TaskStatus;
  isBlocked: boolean;
}) {
  const { role, userId, assigneeId, from, to, isBlocked } = params;

  if (role === "CLIENT") {
    throw new AppError("FORBIDDEN", "Client guests cannot update task status.", 403);
  }

  if (role === "INTERNAL" && assigneeId !== userId) {
    throw new AppError("FORBIDDEN", "Internal users can only update assigned tasks.", 403);
  }

  if (role === "PM" && from === "IN_PROGRESS" && to === "DONE") {
    throw new AppError("INVALID_TASK_TRANSITION", "PM cannot move In Progress directly to Done.", 422);
  }

  if (to === "IN_PROGRESS" && isBlocked) {
    throw new AppError("TASK_BLOCKED_BY_DEPENDENCY", "Task cannot start before all dependencies are done.", 422);
  }

  const allowed: Record<TaskStatus, TaskStatus[]> = {
    TODO: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
    BLOCKED: ["TODO", "CANCELLED"],
    IN_PROGRESS: ["REVIEW", "DONE", "CANCELLED"],
    REVIEW: ["DONE", "IN_PROGRESS", "CANCELLED"],
    DONE: [],
    CANCELLED: [],
  };

  if (!allowed[from].includes(to)) {
    throw new AppError("INVALID_TASK_TRANSITION", `Cannot move task from ${from} to ${to}.`, 422);
  }
}
