export type UserRole = "PM" | "INTERNAL" | "CLIENT";

export type TaskStatus = "TODO" | "BLOCKED" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "TASK_VERSION_CONFLICT"
  | "INVALID_TASK_TRANSITION"
  | "TASK_BLOCKED_BY_DEPENDENCY"
  | "CIRCULAR_DEPENDENCY";

export type TaskBlockerDto = {
  id: string;
  title: string;
  status: TaskStatus;
};

export type TaskDependencyDto = {
  id: string;
  taskId: string;
  title: string;
  status: TaskStatus;
  clientVisible: boolean;
};

export type ProjectMemberDto = {
  id: string;
  role: UserRole;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
};

export type AuditLogDto = {
  id: string;
  taskId: string;
  actorUserId: string;
  action: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};

export type AttachmentDto = {
  id: string;
  taskId: string;
  uploaderId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type StandupBlockerDto = {
  id: string;
  title: string;
};

export type DailyStandupSummaryDto = {
  id: string;
  projectId: string;
  summaryDate: string;
  completedCount: number;
  inProgressCount: number;
  blockedCount: number;
  summaryText: string;
  blockers: StandupBlockerDto[];
  generatedAt: string;
};

export type InternalTaskDto = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: string | null;
  dueDate: string | null;
  clientVisible: boolean;
  version: number;
  isBlocked: boolean;
  blockedBy: TaskBlockerDto[];
  dependencyIds: string[];
  dependencies: TaskDependencyDto[];
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ClientTaskDto = {
  id: string;
  title: string;
  status: TaskStatus;
  isBlocked: boolean;
  dueDate: string | null;
  updatedAt: string;
};

export type BoardTaskDto = {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: string | null;
  dueDate: string | null;
  clientVisible?: boolean;
  version: number;
  isBlocked: boolean;
  blockedBy: TaskBlockerDto[];
  dependencyIds?: string[];
  dependencies?: TaskDependencyDto[];
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt: string;
  deletedAt?: string | null;
};
