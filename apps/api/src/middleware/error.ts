import type { Context, Next } from "hono";
import { AppError } from "../errors";

function isAppError(error: unknown): error is AppError {
  return error instanceof AppError || (typeof error === "object" && error !== null && "code" in error && "status" in error);
}

export function formatErrorResponse(error: unknown, c: Context) {
  if (isAppError(error)) {
    const details = error.details as Record<string, unknown> | undefined;
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: details?.details ?? error.details,
          currentVersion: details?.currentVersion,
          currentTask: details?.currentTask,
        },
      },
      error.status as never,
    );
  }

  console.error(error);
  return c.json({ error: { code: "BAD_REQUEST", message: "Unexpected server error." } }, 500);
}

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    return formatErrorResponse(error, c);
  }
}
