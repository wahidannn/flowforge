"use client";

import type { ApiErrorCode, AttachmentDto, AuditLogDto, BoardTaskDto, DailyStandupSummaryDto, ProjectMemberDto } from "@flowforge/shared";
import { useAuthStore } from "./auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type UserDto = {
  id: string;
  email: string;
  name: string;
  role: "PM" | "INTERNAL" | "CLIENT";
};

export type ProjectDto = {
  id: string;
  name: string;
  description?: string | null;
  clientName: string;
};

export type ApiErrorPayload = {
  error?: {
    code?: ApiErrorCode | string;
    message?: string;
    details?: unknown;
    currentVersion?: number;
    currentTask?: BoardTaskDto | null;
  };
};

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public payload?: ApiErrorPayload,
  ) {
    super(message);
  }
}

export const queryKeys = {
  me: ["me"] as const,
  projects: ["projects"] as const,
  projectMembers: (projectId: string | null) => ["project-members", projectId] as const,
  board: (projectId: string | null) => ["board", projectId] as const,
  deletedTasks: (projectId: string | null) => ["deleted-tasks", projectId] as const,
  task: (taskId: string | null) => ["task", taskId] as const,
  audit: (taskId: string | null) => ["audit", taskId] as const,
  attachments: (taskId: string | null) => ["attachments", taskId] as const,
  standup: (projectId: string | null) => ["standup", projectId] as const,
};

export type TaskFormInput = {
  title: string;
  description: string;
  assigneeId?: string | null;
  priority?: string;
  dueDate?: string | null;
  clientVisible: boolean;
};

export type AttachmentInput = {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
};

async function request<T>(path: string, init: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & { data?: unknown };
  if (!response.ok) {
    throw new ApiClientError(response.status, payload.error?.code ?? "BAD_REQUEST", payload.error?.message ?? "Request failed", payload);
  }
  return payload.data as T;
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: UserDto }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<UserDto>("/auth/me"),
  projects: () => request<ProjectDto[]>("/projects"),
  projectMembers: (projectId: string) => request<ProjectMemberDto[]>(`/projects/${projectId}/members`),
  board: (projectId: string) => request<BoardTaskDto[]>(`/projects/${projectId}/tasks/board`),
  deletedTasks: (projectId: string) => request<BoardTaskDto[]>(`/projects/${projectId}/tasks/deleted`),
  getTask: (taskId: string) => request<BoardTaskDto>(`/tasks/${taskId}`),
  createTask: (projectId: string, body: TaskFormInput) =>
    request<BoardTaskDto>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  updateTask: (taskId: string, body: TaskFormInput & { version: number }) =>
    request<BoardTaskDto>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateStatus: (taskId: string, body: { version: number; status: BoardTaskDto["status"] }) =>
    request<BoardTaskDto>(`/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTask: (taskId: string, body: { version: number }) =>
    request<{ ok: true }>(`/tasks/${taskId}`, { method: "DELETE", body: JSON.stringify(body) }),
  restoreTask: (taskId: string, body: { version: number }) =>
    request<{ ok: true }>(`/tasks/${taskId}/restore`, { method: "POST", body: JSON.stringify(body) }),
  addDependency: (taskId: string, body: { version: number; dependsOnTaskId: string }) =>
    request<{ ok: true }>(`/tasks/${taskId}/dependencies`, { method: "POST", body: JSON.stringify(body) }),
  removeDependency: (taskId: string, dependencyId: string, body: { version: number }) =>
    request<{ ok: true }>(`/tasks/${taskId}/dependencies/${dependencyId}`, { method: "DELETE", body: JSON.stringify(body) }),
  audit: (taskId: string) => request<AuditLogDto[]>(`/tasks/${taskId}/audit`),
  attachments: (taskId: string) => request<AttachmentDto[]>(`/tasks/${taskId}/attachments`),
  addAttachment: (taskId: string, body: AttachmentInput) =>
    request<AttachmentDto>(`/tasks/${taskId}/attachments`, { method: "POST", body: JSON.stringify(body) }),
  deleteAttachment: (taskId: string, attachmentId: string) =>
    request<{ ok: true }>(`/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" }),
  dailyStandup: (projectId: string) => request<DailyStandupSummaryDto[]>(`/projects/${projectId}/standup/daily`),
  generateStandup: (projectId: string) =>
    request<DailyStandupSummaryDto>(`/projects/${projectId}/standup/generate`, { method: "POST" }),
};
