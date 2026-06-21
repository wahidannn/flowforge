import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { AppError } from "../../errors";
import { authMiddleware } from "../../middleware/auth";

export const authRoutes = new Hono();

authRoutes.post(
  "/login",
  zValidator("json", z.object({ email: z.string().email(), password: z.string().min(1) })),
  async (c) => {
    const input = c.req.valid("json");
    const user = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError("UNAUTHORIZED", "Invalid email or password.", 401);
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return c.json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  },
);

authRoutes.get("/me", authMiddleware, (c) => c.json({ data: c.get("user") }));
