import type { ClientTaskDto, InternalTaskDto, TaskStatus } from "@flowforge/shared";

type TaskWithRelations = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string | null;
  dueDate: Date | null;
  clientVisible: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  assignee?: { id: string; name: string; email: string } | null;
  dependencies: Array<{
    id: string;
    dependsOnTask: {
      id: string;
      title: string;
      status: TaskStatus;
      clientVisible: boolean;
    };
  }>;
};

export function blockedBy(task: TaskWithRelations, forClient = false) {
  return task.dependencies
    .map((dependency) => dependency.dependsOnTask)
    .filter((dependency) => dependency.status !== "DONE")
    .map((dependency) =>
      forClient && !dependency.clientVisible
        ? { id: "hidden", title: "Internal dependency", status: dependency.status }
        : { id: dependency.id, title: dependency.title, status: dependency.status },
    );
}

export function toInternalTaskDto(task: TaskWithRelations): InternalTaskDto {
  const blockers = blockedBy(task);
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    clientVisible: task.clientVisible,
    version: task.version,
    isBlocked: blockers.length > 0,
    blockedBy: blockers,
    dependencyIds: task.dependencies.map((dependency) => dependency.dependsOnTask.id),
    dependencies: task.dependencies.map((dependency) => ({
      id: dependency.id,
      taskId: dependency.dependsOnTask.id,
      title: dependency.dependsOnTask.title,
      status: dependency.dependsOnTask.status,
      clientVisible: dependency.dependsOnTask.clientVisible,
    })),
    assignee: task.assignee ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt?.toISOString() ?? null,
  };
}

export function toClientTaskDto(task: TaskWithRelations): ClientTaskDto {
  const blockers = blockedBy(task, true);
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    isBlocked: blockers.length > 0,
    dueDate: task.dueDate?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
  };
}
