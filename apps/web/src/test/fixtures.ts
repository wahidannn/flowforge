import type { AttachmentDto, BoardTaskDto, DailyStandupSummaryDto, ProjectMemberDto } from "@flowforge/shared";
import type { UserDto } from "@/lib/api-client";

export const pmUser: UserDto = {
  id: "user-pm",
  email: "pm@example.com",
  name: "Pat PM",
  role: "PM",
};

export const internalUser: UserDto = {
  id: "user-internal",
  email: "internal@example.com",
  name: "Ira Internal",
  role: "INTERNAL",
};

export const clientUser: UserDto = {
  id: "user-client",
  email: "client@example.com",
  name: "Casey Client",
  role: "CLIENT",
};

export const projectMembers: ProjectMemberDto[] = [
  { id: "member-pm", role: "PM", user: pmUser },
  { id: "member-internal", role: "INTERNAL", user: internalUser },
  { id: "member-client", role: "CLIENT", user: clientUser },
];

export const baseTask: BoardTaskDto = {
  id: "task-1",
  projectId: "project-1",
  title: "Build board regression coverage",
  description: "Keep the board workflow covered by tests.",
  status: "TODO",
  priority: "HIGH",
  dueDate: "2026-06-21T09:00:00.000Z",
  clientVisible: true,
  version: 3,
  isBlocked: false,
  blockedBy: [],
  dependencyIds: [],
  dependencies: [],
  assignee: {
    id: internalUser.id,
    name: internalUser.name,
    email: internalUser.email,
  },
  createdAt: "2026-06-20T08:00:00.000Z",
  updatedAt: "2026-06-20T09:00:00.000Z",
};

export const blockedTask: BoardTaskDto = {
  ...baseTask,
  id: "task-blocked",
  title: "Blocked integration task",
  isBlocked: true,
  blockedBy: [{ id: "dependency-1", title: "Finish schema review", status: "TODO" }],
};

export const deletedTask: BoardTaskDto = {
  ...baseTask,
  id: "task-deleted",
  title: "Deleted but restorable task",
  status: "REVIEW",
  version: 7,
  deletedAt: "2026-06-20T10:00:00.000Z",
};

export const attachment: AttachmentDto = {
  id: "attachment-1",
  taskId: baseTask.id,
  uploaderId: pmUser.id,
  fileName: "handoff.pdf",
  fileUrl: "https://example.com/handoff.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  createdAt: "2026-06-20T11:00:00.000Z",
};

export const latestStandup: DailyStandupSummaryDto = {
  id: "standup-1",
  projectId: "project-1",
  summaryDate: "2026-06-20T00:00:00.000Z",
  completedCount: 4,
  inProgressCount: 2,
  blockedCount: 1,
  summaryText: "Four tasks completed, two in progress, one blocker remains.",
  blockers: [{ id: "task-blocked", title: "Blocked integration task" }],
  generatedAt: "2026-06-20T12:00:00.000Z",
};

export const previousStandup: DailyStandupSummaryDto = {
  ...latestStandup,
  id: "standup-previous",
  summaryDate: "2026-06-19T00:00:00.000Z",
  summaryText: "Previous day summary.",
};
