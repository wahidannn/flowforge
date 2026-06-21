import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import bcrypt from "bcryptjs";
import { app } from "../../app";
import { prisma } from "../../lib/prisma";

const runIntegration = process.env.DATABASE_URL ? describe : describe.skip;

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const ids = {
  project: `it_project_${suffix}`,
  otherProject: `it_other_project_${suffix}`,
  pm: `it_pm_${suffix}`,
  internal: `it_internal_${suffix}`,
  otherInternal: `it_other_internal_${suffix}`,
  client: `it_client_${suffix}`,
  taskVisible: `it_task_visible_${suffix}`,
  taskInternal: `it_task_internal_${suffix}`,
  taskOtherAssigned: `it_task_other_assigned_${suffix}`,
  taskDeleted: `it_task_deleted_${suffix}`,
  taskRestore: `it_task_restore_${suffix}`,
  taskRestoreConflict: `it_task_restore_conflict_${suffix}`,
  taskA: `it_task_a_${suffix}`,
  taskB: `it_task_b_${suffix}`,
  taskC: `it_task_c_${suffix}`,
  otherTask: `it_other_task_${suffix}`,
};

type LoginResult = {
  token: string;
};

async function request(path: string, init: RequestInit = {}) {
  return app.request(path, init);
}

async function json(response: Response) {
  return response.json() as Promise<any>;
}

async function login(email: string): Promise<LoginResult> {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  expect(response.status).toBe(200);
  const payload = await json(response);
  return { token: payload.data.token };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

runIntegration("task API integration", () => {
  let pmToken = "";
  let internalToken = "";
  let clientToken = "";

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.createMany({
        data: [
          { id: ids.pm, email: `${ids.pm}@flowforge.test`, name: "Integration PM", role: "PM", passwordHash },
          { id: ids.internal, email: `${ids.internal}@flowforge.test`, name: "Integration Internal", role: "INTERNAL", passwordHash },
          { id: ids.otherInternal, email: `${ids.otherInternal}@flowforge.test`, name: "Other Internal", role: "INTERNAL", passwordHash },
          { id: ids.client, email: `${ids.client}@flowforge.test`, name: "Integration Client", role: "CLIENT", passwordHash },
        ],
      });
      await tx.project.createMany({
        data: [
          { id: ids.project, name: "Integration Project", clientName: "Client" },
          { id: ids.otherProject, name: "Other Integration Project", clientName: "Other Client" },
        ],
      });
      await tx.projectMember.createMany({
        data: [
          { projectId: ids.project, userId: ids.pm, role: "PM" },
          { projectId: ids.project, userId: ids.internal, role: "INTERNAL" },
          { projectId: ids.project, userId: ids.otherInternal, role: "INTERNAL" },
          { projectId: ids.project, userId: ids.client, role: "CLIENT" },
          { projectId: ids.otherProject, userId: ids.pm, role: "PM" },
        ],
      });
      await tx.task.createMany({
        data: [
          {
            id: ids.taskVisible,
            projectId: ids.project,
            assigneeId: ids.internal,
            title: "Visible task",
            description: "Visible to client",
            status: "TODO",
            clientVisible: true,
          },
          {
            id: ids.taskInternal,
            projectId: ids.project,
            assigneeId: ids.internal,
            title: "Internal task",
            description: "Internal only",
            status: "IN_PROGRESS",
            clientVisible: false,
          },
          {
            id: ids.taskOtherAssigned,
            projectId: ids.project,
            assigneeId: ids.otherInternal,
            title: "Other assigned task",
            description: "Hidden from first internal",
            status: "TODO",
            clientVisible: true,
          },
          {
            id: ids.taskDeleted,
            projectId: ids.project,
            assigneeId: ids.internal,
            title: "Soft deleted candidate",
            description: "Will be deleted",
            status: "TODO",
            clientVisible: true,
          },
          {
            id: ids.taskRestore,
            projectId: ids.project,
            assigneeId: ids.internal,
            title: "Restore candidate",
            description: "Will be restored",
            status: "TODO",
            clientVisible: true,
            deletedAt: new Date(),
          },
          {
            id: ids.taskRestoreConflict,
            projectId: ids.project,
            assigneeId: ids.internal,
            title: "Restore conflict candidate",
            description: "Will conflict",
            status: "TODO",
            version: 2,
            clientVisible: true,
            deletedAt: new Date(),
          },
          { id: ids.taskA, projectId: ids.project, title: "A", description: "A", status: "TODO" },
          { id: ids.taskB, projectId: ids.project, title: "B", description: "B", status: "TODO" },
          { id: ids.taskC, projectId: ids.project, title: "C", description: "C", status: "TODO" },
          { id: ids.otherTask, projectId: ids.otherProject, title: "Other", description: "Other", status: "TODO" },
        ],
      });
      await tx.taskDependency.createMany({
        data: [
          { taskId: ids.taskA, dependsOnTaskId: ids.taskB },
          { taskId: ids.taskB, dependsOnTaskId: ids.taskC },
        ],
      });
    });

    pmToken = (await login(`${ids.pm}@flowforge.test`)).token;
    internalToken = (await login(`${ids.internal}@flowforge.test`)).token;
    clientToken = (await login(`${ids.client}@flowforge.test`)).token;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { taskId: { in: Object.values(ids).filter((id) => id.includes("task")) } } });
    await prisma.attachment.deleteMany({ where: { taskId: { in: Object.values(ids).filter((id) => id.includes("task")) } } });
    await prisma.taskDependency.deleteMany({
      where: {
        OR: [
          { taskId: { in: Object.values(ids).filter((id) => id.includes("task")) } },
          { dependsOnTaskId: { in: Object.values(ids).filter((id) => id.includes("task")) } },
        ],
      },
    });
    await prisma.task.deleteMany({ where: { id: { in: Object.values(ids).filter((id) => id.includes("task")) } } });
    await prisma.dailyStandupSummary.deleteMany({ where: { projectId: { in: [ids.project, ids.otherProject] } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: [ids.project, ids.otherProject] } } });
    await prisma.project.deleteMany({ where: { id: { in: [ids.project, ids.otherProject] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.pm, ids.internal, ids.otherInternal, ids.client] } } });
  });

  test("role-based board visibility and client DTO safety", async () => {
    const pmBoard = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(pmToken) }));
    expect(pmBoard.data.some((task: any) => task.id === ids.taskInternal)).toBe(true);
    const taskA = pmBoard.data.find((task: any) => task.id === ids.taskA);
    expect(typeof taskA.dependencies[0].id).toBe("string");
    expect(taskA.dependencies[0].taskId).toBe(ids.taskB);

    const internalBoard = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(internalToken) }));
    expect(internalBoard.data.some((task: any) => task.id === ids.taskVisible)).toBe(true);
    expect(internalBoard.data.some((task: any) => task.id === ids.taskOtherAssigned)).toBe(false);

    const clientBoard = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(clientToken) }));
    expect(clientBoard.data.some((task: any) => task.id === ids.taskVisible)).toBe(true);
    expect(clientBoard.data.some((task: any) => task.id === ids.taskInternal)).toBe(false);
    expect(
      clientBoard.data.every(
        (task: any) =>
          task.assignee === undefined &&
          task.description === undefined &&
          task.clientVisible === undefined &&
          task.dependencies === undefined,
      ),
    ).toBe(true);
  });

  test("project members endpoint is membership-protected", async () => {
    const membersResponse = await request(`/api/projects/${ids.project}/members`, { headers: auth(pmToken) });
    expect(membersResponse.status).toBe(200);
    const members = await json(membersResponse);
    expect(members.data.map((member: any) => member.user.id).sort()).toEqual([ids.client, ids.internal, ids.otherInternal, ids.pm].sort());

    const nonMemberResponse = await request(`/api/projects/${ids.otherProject}/members`, { headers: auth(clientToken) });
    expect(nonMemberResponse.status).toBe(403);
  });

  test("concurrent status updates return one success and one conflict", async () => {
    const body = JSON.stringify({ version: 1, status: "BLOCKED" });
    const responses = await Promise.all([
      request(`/api/tasks/${ids.taskVisible}/status`, { method: "PATCH", headers: auth(pmToken), body }),
      request(`/api/tasks/${ids.taskVisible}/status`, { method: "PATCH", headers: auth(pmToken), body }),
    ]);
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 409]);

    const conflictResponse = responses.find((response) => response.status === 409);
    const payload = await json(conflictResponse as Response);
    expect(payload.error.code).toBe("TASK_VERSION_CONFLICT");
    expect(payload.error.currentVersion).toBe(2);
    expect(payload.error.currentTask.id).toBe(ids.taskVisible);
  });

  test("soft-deleted task disappears from board and creates audit", async () => {
    const response = await request(`/api/tasks/${ids.taskDeleted}`, {
      method: "DELETE",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1 }),
    });
    expect(response.status).toBe(200);

    const board = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(pmToken) }));
    expect(board.data.some((task: any) => task.id === ids.taskDeleted)).toBe(false);

    const audit = await prisma.auditLog.findFirst({ where: { taskId: ids.taskDeleted, action: "SOFT_DELETE" } });
    expect(audit).not.toBeNull();
  });

  test("deleted tasks list and restore workflow are PM-only and versioned", async () => {
    const internalDeletedResponse = await request(`/api/projects/${ids.project}/tasks/deleted`, { headers: auth(internalToken) });
    expect(internalDeletedResponse.status).toBe(403);

    const clientDeletedResponse = await request(`/api/projects/${ids.project}/tasks/deleted`, { headers: auth(clientToken) });
    expect(clientDeletedResponse.status).toBe(403);

    const deletedResponse = await request(`/api/projects/${ids.project}/tasks/deleted`, { headers: auth(pmToken) });
    expect(deletedResponse.status).toBe(200);
    const deletedPayload = await json(deletedResponse);
    expect(deletedPayload.data.some((task: any) => task.id === ids.taskRestore && task.deletedAt)).toBe(true);

    const boardBefore = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(pmToken) }));
    expect(boardBefore.data.some((task: any) => task.id === ids.taskRestore)).toBe(false);

    const staleRestore = await request(`/api/tasks/${ids.taskRestoreConflict}/restore`, {
      method: "POST",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1 }),
    });
    expect(staleRestore.status).toBe(409);

    const restoreResponse = await request(`/api/tasks/${ids.taskRestore}/restore`, {
      method: "POST",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1 }),
    });
    expect(restoreResponse.status).toBe(200);

    const boardAfter = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(pmToken) }));
    expect(boardAfter.data.some((task: any) => task.id === ids.taskRestore)).toBe(true);

    const deletedAfter = await json(await request(`/api/projects/${ids.project}/tasks/deleted`, { headers: auth(pmToken) }));
    expect(deletedAfter.data.some((task: any) => task.id === ids.taskRestore)).toBe(false);

    const audit = await prisma.auditLog.findFirst({ where: { taskId: ids.taskRestore, action: "RESTORE" } });
    expect(audit).not.toBeNull();
  });

  test("dependency validation rejects self, cross-project, and circular dependencies", async () => {
    const selfResponse = await request(`/api/tasks/${ids.taskA}/dependencies`, {
      method: "POST",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1, dependsOnTaskId: ids.taskA }),
    });
    expect(selfResponse.status).toBe(422);

    const crossProjectResponse = await request(`/api/tasks/${ids.taskA}/dependencies`, {
      method: "POST",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1, dependsOnTaskId: ids.otherTask }),
    });
    expect(crossProjectResponse.status).toBe(404);

    const circularResponse = await request(`/api/tasks/${ids.taskC}/dependencies`, {
      method: "POST",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1, dependsOnTaskId: ids.taskA }),
    });
    expect(circularResponse.status).toBe(422);
  });

  test("status change creates audit log and blocked task cannot start", async () => {
    const blockedResponse = await request(`/api/tasks/${ids.taskA}/status`, {
      method: "PATCH",
      headers: auth(pmToken),
      body: JSON.stringify({ version: 1, status: "IN_PROGRESS" }),
    });
    expect(blockedResponse.status).toBe(422);

    const statusResponse = await request(`/api/tasks/${ids.taskInternal}/status`, {
      method: "PATCH",
      headers: auth(internalToken),
      body: JSON.stringify({ version: 1, status: "REVIEW" }),
    });
    expect(statusResponse.status).toBe(200);

    const auditResponse = await request(`/api/tasks/${ids.taskInternal}/audit`, { headers: auth(internalToken) });
    expect(auditResponse.status).toBe(200);
    const audit = await json(auditResponse);
    expect(audit.data.some((entry: any) => entry.action === "STATUS_CHANGE" && entry.field === "status")).toBe(true);
  });

  test("dependency relation id supports remove dependency and audit", async () => {
    const board = await json(await request(`/api/projects/${ids.project}/tasks/board`, { headers: auth(pmToken) }));
    const taskA = board.data.find((task: any) => task.id === ids.taskA);
    const dependencyId = taskA.dependencies[0].id;

    const removeResponse = await request(`/api/tasks/${ids.taskA}/dependencies/${dependencyId}`, {
      method: "DELETE",
      headers: auth(pmToken),
      body: JSON.stringify({ version: taskA.version }),
    });
    expect(removeResponse.status).toBe(200);

    const audit = await prisma.auditLog.findFirst({ where: { taskId: ids.taskA, action: "DEPENDENCY_REMOVE" } });
    expect(audit).not.toBeNull();
  });

  test("attachment add/list/delete follows permissions and audit policy", async () => {
    const pmAddResponse = await request(`/api/tasks/${ids.taskInternal}/attachments`, {
      method: "POST",
      headers: auth(pmToken),
      body: JSON.stringify({
        fileName: "spec.pdf",
        fileUrl: "https://example.com/spec.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1200,
      }),
    });
    expect(pmAddResponse.status).toBe(201);
    const pmAttachment = (await json(pmAddResponse)).data;

    const internalAddResponse = await request(`/api/tasks/${ids.taskInternal}/attachments`, {
      method: "POST",
      headers: auth(internalToken),
      body: JSON.stringify({
        fileName: "note.txt",
        fileUrl: "https://example.com/note.txt",
        mimeType: "text/plain",
        sizeBytes: 120,
      }),
    });
    expect(internalAddResponse.status).toBe(201);

    const clientListResponse = await request(`/api/tasks/${ids.taskVisible}/attachments`, { headers: auth(clientToken) });
    expect(clientListResponse.status).toBe(200);
    const clientList = await json(clientListResponse);
    expect(clientList.data).toEqual([]);

    const deleteResponse = await request(`/api/tasks/${ids.taskInternal}/attachments/${pmAttachment.id}`, {
      method: "DELETE",
      headers: auth(pmToken),
    });
    expect(deleteResponse.status).toBe(200);

    const deletedAttachment = await prisma.attachment.findFirst({ where: { id: pmAttachment.id } });
    expect(deletedAttachment?.deletedAt).not.toBeNull();

    const addAudit = await prisma.auditLog.findFirst({ where: { taskId: ids.taskInternal, action: "ATTACHMENT_ADD" } });
    const deleteAudit = await prisma.auditLog.findFirst({ where: { taskId: ids.taskInternal, action: "ATTACHMENT_DELETE" } });
    expect(addAudit).not.toBeNull();
    expect(deleteAudit).not.toBeNull();
  });

  test("standup summary role access and same-day upsert", async () => {
    const clientReadResponse = await request(`/api/projects/${ids.project}/standup/daily`, { headers: auth(clientToken) });
    expect(clientReadResponse.status).toBe(403);

    const clientGenerateResponse = await request(`/api/projects/${ids.project}/standup/generate`, {
      method: "POST",
      headers: auth(clientToken),
    });
    expect(clientGenerateResponse.status).toBe(403);

    const firstGenerate = await request(`/api/projects/${ids.project}/standup/generate`, {
      method: "POST",
      headers: auth(pmToken),
    });
    expect(firstGenerate.status).toBe(201);

    const secondGenerate = await request(`/api/projects/${ids.project}/standup/generate`, {
      method: "POST",
      headers: auth(pmToken),
    });
    expect(secondGenerate.status).toBe(201);

    const summariesInDb = await prisma.dailyStandupSummary.findMany({ where: { projectId: ids.project, deletedAt: null } });
    expect(summariesInDb).toHaveLength(1);

    const internalReadResponse = await request(`/api/projects/${ids.project}/standup/daily`, { headers: auth(internalToken) });
    expect(internalReadResponse.status).toBe(200);
    const summaries = await json(internalReadResponse);
    expect(summaries.data[0].projectId).toBe(ids.project);
    expect(summaries.data[0].summaryText).toContain("done");
  });
});
