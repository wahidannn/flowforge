import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../../middleware/auth";
import { createProject, deleteProject, getProject, listProjectMembers, listProjects, updateProject } from "./service";

export const projectsRoutes = new Hono();
projectsRoutes.use("*", authMiddleware);

const projectBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientName: z.string().min(1),
});

projectsRoutes.get("/", async (c) => {
  return c.json({ data: await listProjects(c.get("user")) });
});

projectsRoutes.post("/", zValidator("json", projectBody), async (c) => {
  return c.json({ data: await createProject(c.get("user"), c.req.valid("json")) }, 201);
});

projectsRoutes.get("/:projectId/members", async (c) => {
  return c.json({ data: await listProjectMembers(c.get("user"), c.req.param("projectId")) });
});

projectsRoutes.get("/:projectId", async (c) => {
  return c.json({ data: await getProject(c.get("user"), c.req.param("projectId")) });
});

projectsRoutes.patch("/:projectId", zValidator("json", projectBody.partial()), async (c) => {
  return c.json({ data: await updateProject(c.get("user"), c.req.param("projectId"), c.req.valid("json")) });
});

projectsRoutes.delete("/:projectId", async (c) => {
  return c.json({ data: await deleteProject(c.get("user"), c.req.param("projectId")) });
});
