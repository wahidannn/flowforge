import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { forbidden } from "../../errors";
import { canGenerateStandup, canViewStandup } from "../permissions/policy";
import { assertProjectMembership } from "../projects/service";

export const standupRoutes = new Hono();
standupRoutes.use("*", authMiddleware);

standupRoutes.get("/projects/:projectId/standup/daily", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!canViewStandup(user.role)) throw forbidden("Client guests cannot view internal standup summaries.");
  await assertProjectMembership(projectId, user.id);
  const summaries = await prisma.dailyStandupSummary.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { summaryDate: "desc" },
    take: 10,
  });
  return c.json({ data: summaries });
});

standupRoutes.post("/projects/:projectId/standup/generate", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!canGenerateStandup(user.role)) throw forbidden("Only PM can generate standup summaries.");
  await assertProjectMembership(projectId, user.id);
  const tasks = await prisma.task.findMany({ where: { projectId, deletedAt: null } });
  const completedCount = tasks.filter((task) => task.status === "DONE").length;
  const inProgressCount = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const blockedCount = tasks.filter((task) => task.status === "BLOCKED").length;
  const blockers = tasks.filter((task) => task.status === "BLOCKED").map((task) => ({ id: task.id, title: task.title }));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summary = await prisma.dailyStandupSummary.upsert({
    where: { projectId_summaryDate: { projectId, summaryDate: today } },
    update: {
      completedCount,
      inProgressCount,
      blockedCount,
      blockers,
      summaryText: `${completedCount} done, ${inProgressCount} in progress, ${blockedCount} blocked.`,
      deletedAt: null,
    },
    create: {
      projectId,
      summaryDate: today,
      completedCount,
      inProgressCount,
      blockedCount,
      blockers,
      summaryText: `${completedCount} done, ${inProgressCount} in progress, ${blockedCount} blocked.`,
    },
  });
  return c.json({ data: summary }, 201);
});
