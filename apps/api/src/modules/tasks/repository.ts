import { prisma } from "../../lib/prisma";

export const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  dependencies: {
    where: { deletedAt: null },
    include: {
      dependsOnTask: {
        select: { id: true, title: true, status: true, clientVisible: true },
      },
    },
  },
} as const;

export function findTask(taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: taskInclude,
  });
}

export async function hasProjectMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId, deletedAt: null, project: { deletedAt: null } },
  });
  return Boolean(membership);
}
