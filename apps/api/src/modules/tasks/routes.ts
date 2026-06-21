import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { TaskStatus } from "@prisma/client";
import { authMiddleware } from "../../middleware/auth";
import {
  addAttachment,
  addDependency,
  createTask,
  deleteAttachment,
  deleteTask,
  getTask,
  listAttachments,
  listAudit,
  listBoardTasks,
  listDeletedTasks,
  removeDependency,
  restoreTask,
  updateTask,
  updateTaskStatus,
} from "./service";

export const tasksRoutes = new Hono();
tasksRoutes.use("*", authMiddleware);

const versionSchema = z.object({ version: z.number().int().positive() });
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  assigneeId: z.string().nullable().optional(),
  priority: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  clientVisible: z.boolean().default(false),
});
const updateTaskSchema = createTaskSchema.partial().extend({ version: z.number().int().positive() });
const statusSchema = versionSchema.extend({ status: z.nativeEnum(TaskStatus) });
const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

tasksRoutes.get("/projects/:projectId/tasks/board", async (c) => {
  return c.json({ data: await listBoardTasks(c.get("user"), c.req.param("projectId")) });
});

tasksRoutes.get("/projects/:projectId/tasks/deleted", async (c) => {
  return c.json({ data: await listDeletedTasks(c.get("user"), c.req.param("projectId")) });
});

tasksRoutes.post("/projects/:projectId/tasks", zValidator("json", createTaskSchema), async (c) => {
  return c.json({ data: await createTask(c.get("user"), c.req.param("projectId"), c.req.valid("json")) }, 201);
});

tasksRoutes.get("/tasks/:taskId", async (c) => {
  return c.json({ data: await getTask(c.get("user"), c.req.param("taskId")) });
});

tasksRoutes.patch("/tasks/:taskId", zValidator("json", updateTaskSchema), async (c) => {
  return c.json({ data: await updateTask(c.get("user"), c.req.param("taskId"), c.req.valid("json")) });
});

tasksRoutes.patch("/tasks/:taskId/status", zValidator("json", statusSchema), async (c) => {
  return c.json({ data: await updateTaskStatus(c.get("user"), c.req.param("taskId"), c.req.valid("json")) });
});

tasksRoutes.delete("/tasks/:taskId", zValidator("json", versionSchema), async (c) => {
  return c.json({ data: await deleteTask(c.get("user"), c.req.param("taskId"), c.req.valid("json")) });
});

tasksRoutes.post("/tasks/:taskId/restore", zValidator("json", versionSchema), async (c) => {
  return c.json({ data: await restoreTask(c.get("user"), c.req.param("taskId"), c.req.valid("json")) });
});

tasksRoutes.post("/tasks/:taskId/dependencies", zValidator("json", versionSchema.extend({ dependsOnTaskId: z.string().min(1) })), async (c) => {
  return c.json({ data: await addDependency(c.get("user"), c.req.param("taskId"), c.req.valid("json")) }, 201);
});

tasksRoutes.delete("/tasks/:taskId/dependencies/:dependencyId", zValidator("json", versionSchema), async (c) => {
  return c.json({
    data: await removeDependency(c.get("user"), c.req.param("taskId"), c.req.param("dependencyId"), c.req.valid("json")),
  });
});

tasksRoutes.post("/tasks/:taskId/attachments", zValidator("json", attachmentSchema), async (c) => {
  return c.json({ data: await addAttachment(c.get("user"), c.req.param("taskId"), c.req.valid("json")) }, 201);
});

tasksRoutes.get("/tasks/:taskId/attachments", async (c) => {
  return c.json({ data: await listAttachments(c.get("user"), c.req.param("taskId")) });
});

tasksRoutes.delete("/tasks/:taskId/attachments/:attachmentId", async (c) => {
  return c.json({ data: await deleteAttachment(c.get("user"), c.req.param("taskId"), c.req.param("attachmentId")) });
});

tasksRoutes.get("/tasks/:taskId/audit", async (c) => {
  return c.json({ data: await listAudit(c.get("user"), c.req.param("taskId")) });
});
