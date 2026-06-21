import type { AuthUser } from "../../types";
import { forbidden, notFound } from "../../errors";
import { prisma } from "../../lib/prisma";
import { canManageProject } from "../permissions/policy";

export type ProjectInput = {
  name?: string;
  description?: string;
  clientName?: string;
};

export async function assertProjectMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId, deletedAt: null, project: { deletedAt: null } },
  });
  if (!membership) throw forbidden("User is not a member of this project.");
  return membership;
}

export async function listProjects(user: AuthUser) {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
      members: { some: { userId: user.id, deletedAt: null } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProject(user: AuthUser, input: Required<Pick<ProjectInput, "name" | "clientName">> & ProjectInput) {
  if (!canManageProject(user.role)) throw forbidden("Only PM can create projects.");

  return prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      clientName: input.clientName,
      members: { create: { userId: user.id, role: "PM" } },
    },
  });
}

export async function getProject(user: AuthUser, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      members: { some: { userId: user.id, deletedAt: null } },
    },
  });
  if (!project) throw notFound("Project not found.");
  return project;
}

export async function listProjectMembers(user: AuthUser, projectId: string) {
  await assertProjectMembership(projectId, user.id);

  return prisma.projectMember.findMany({
    where: { projectId, deletedAt: null, user: { deletedAt: null } },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateProject(user: AuthUser, projectId: string, input: ProjectInput) {
  if (!canManageProject(user.role)) throw forbidden("Only PM can update projects.");
  await assertProjectMembership(projectId, user.id);

  return prisma.project.update({
    where: { id: projectId },
    data: input,
  });
}

export async function deleteProject(user: AuthUser, projectId: string) {
  if (!canManageProject(user.role)) throw forbidden("Only PM can delete projects.");
  await assertProjectMembership(projectId, user.id);

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
  return { ok: true };
}
