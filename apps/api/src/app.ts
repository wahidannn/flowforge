import "./types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorMiddleware, formatErrorResponse } from "./middleware/error";
import { authRoutes } from "./modules/auth/routes";
import { projectsRoutes } from "./modules/projects/routes";
import { tasksRoutes } from "./modules/tasks/routes";
import { standupRoutes } from "./modules/standup/routes";

export const app = new Hono();

app.onError((error, c) => formatErrorResponse(error, c));

app.use("*", errorMiddleware);
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/auth", authRoutes);
app.route("/api/projects", projectsRoutes);
app.route("/api", tasksRoutes);
app.route("/api", standupRoutes);
