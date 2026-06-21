import { PrismaClient, TaskStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("password123", 10);

async function main() {
  const [pm, uiux, frontend, backend, client] = await Promise.all(
    [
      ["pm@flowforge.test", "Project Manager", UserRole.PM],
      ["uiux@flowforge.test", "UI/UX Designer", UserRole.INTERNAL],
      ["frontend@flowforge.test", "Frontend Engineer", UserRole.INTERNAL],
      ["backend@flowforge.test", "Backend Engineer", UserRole.INTERNAL],
      ["client@flowforge.test", "Client Guest", UserRole.CLIENT],
    ].map(([email, name, role]) =>
      prisma.user.upsert({
        where: { email: String(email) },
        update: { name: String(name), role: role as UserRole, passwordHash, deletedAt: null },
        create: { email: String(email), name: String(name), role: role as UserRole, passwordHash },
      }),
    ),
  );

  const project = await prisma.project.upsert({
    where: { id: "demo_project" },
    update: { name: "FlowForge Demo", clientName: "Acme Client", deletedAt: null },
    create: {
      id: "demo_project",
      name: "FlowForge Demo",
      description: "Demo project for state-based delivery workflow.",
      clientName: "Acme Client",
    },
  });

  for (const user of [pm, uiux, frontend, backend, client]) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      update: { role: user.role, deletedAt: null },
      create: { projectId: project.id, userId: user.id, role: user.role },
    });
  }

  const design = await prisma.task.upsert({
    where: { id: "task_design" },
    update: {},
    create: {
      id: "task_design",
      projectId: project.id,
      assigneeId: uiux.id,
      title: "Design delivery board",
      description: "Create UI/UX for dependency-aware task board.",
      status: TaskStatus.DONE,
      priority: "HIGH",
      clientVisible: true,
    },
  });

  const api = await prisma.task.upsert({
    where: { id: "task_api" },
    update: {},
    create: {
      id: "task_api",
      projectId: project.id,
      assigneeId: backend.id,
      title: "Build task API",
      description: "Implement permission, dependency, audit, and locking APIs.",
      status: TaskStatus.IN_PROGRESS,
      priority: "HIGH",
      clientVisible: false,
    },
  });

  const web = await prisma.task.upsert({
    where: { id: "task_web" },
    update: {},
    create: {
      id: "task_web",
      projectId: project.id,
      assigneeId: frontend.id,
      title: "Implement frontend board",
      description: "Render project board and conflict recovery UI.",
      status: TaskStatus.BLOCKED,
      priority: "MEDIUM",
      clientVisible: true,
    },
  });

  await prisma.taskDependency.upsert({
    where: { taskId_dependsOnTaskId: { taskId: web.id, dependsOnTaskId: api.id } },
    update: { deletedAt: null },
    create: { taskId: web.id, dependsOnTaskId: api.id },
  });

  await prisma.auditLog.createMany({
    data: [design, api, web].map((task) => ({
      taskId: task.id,
      actorUserId: pm.id,
      action: "CREATE",
      field: null,
      oldValue: undefined,
      newValue: { title: task.title, status: task.status },
    })),
    skipDuplicates: true,
  });
}

await main();
await prisma.$disconnect();
