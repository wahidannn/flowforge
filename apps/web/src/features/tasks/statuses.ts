import type { TaskStatus } from "@flowforge/shared";

export const statuses: TaskStatus[] = ["TODO", "BLOCKED", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"];

export function formatStatus(status: TaskStatus) {
  return status.replace("_", " ");
}
