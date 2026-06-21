import type { ApiErrorCode } from "@flowforge/shared";

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "AppError";
  }
}

export const forbidden = (message = "Forbidden") => new AppError("FORBIDDEN", message, 403);
export const notFound = (message = "Not found") => new AppError("NOT_FOUND", message, 404);
export const conflict = (message = "Task has been modified by another user.", details?: unknown) =>
  new AppError("TASK_VERSION_CONFLICT", message, 409, details);
