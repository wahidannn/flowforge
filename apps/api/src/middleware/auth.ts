import type { Context, Next } from "hono";
import { AppError } from "../errors";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    throw new AppError("UNAUTHORIZED", "Missing bearer token.", 401);
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError("UNAUTHORIZED", "User is not active.", 401);
    }

    c.set("user", user);
    await next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("UNAUTHORIZED", "Invalid token.", 401);
  }
}
