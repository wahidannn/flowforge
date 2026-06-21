import { describe, expect, test } from "bun:test";
import { AppError } from "../../errors";
import {
  assertStatusTransition,
  canDeleteOrRestoreTask,
  canManageDependencies,
  canUpdateTaskMetadata,
  canUploadAttachment,
  canViewAudit,
  canViewTask,
} from "./policy";

describe("permission policy", () => {
  test("PM can manage task metadata, dependencies, delete/restore, and audit", () => {
    expect(canViewTask({ userId: "pm", role: "PM", task: { assigneeId: null, clientVisible: false } })).toBe(true);
    expect(canUpdateTaskMetadata("PM")).toBe(true);
    expect(canManageDependencies("PM")).toBe(true);
    expect(canDeleteOrRestoreTask("PM")).toBe(true);
    expect(canViewAudit("PM")).toBe(true);
  });

  test("internal users are limited to assigned task execution", () => {
    expect(canViewTask({ userId: "u1", role: "INTERNAL", task: { assigneeId: "u1", clientVisible: false } })).toBe(true);
    expect(canViewTask({ userId: "u1", role: "INTERNAL", task: { assigneeId: "u2", clientVisible: true } })).toBe(false);
    expect(canUpdateTaskMetadata("INTERNAL")).toBe(false);
    expect(canManageDependencies("INTERNAL")).toBe(false);
    expect(canUploadAttachment({ userId: "u1", role: "INTERNAL", task: { assigneeId: "u1", clientVisible: false } })).toBe(true);
  });

  test("clients only see client-visible tasks and cannot use internal controls", () => {
    expect(canViewTask({ userId: "client", role: "CLIENT", task: { assigneeId: "u1", clientVisible: true } })).toBe(true);
    expect(canViewTask({ userId: "client", role: "CLIENT", task: { assigneeId: "u1", clientVisible: false } })).toBe(false);
    expect(canUpdateTaskMetadata("CLIENT")).toBe(false);
    expect(canManageDependencies("CLIENT")).toBe(false);
    expect(canUploadAttachment({ userId: "client", role: "CLIENT", task: { assigneeId: null, clientVisible: true } })).toBe(false);
    expect(canViewAudit("CLIENT")).toBe(false);
  });
});

describe("status transition policy", () => {
  test("allows legal transitions", () => {
    expect(() =>
      assertStatusTransition({
        role: "INTERNAL",
        userId: "u1",
        assigneeId: "u1",
        from: "TODO",
        to: "IN_PROGRESS",
        isBlocked: false,
      }),
    ).not.toThrow();
  });

  test("rejects PM direct IN_PROGRESS to DONE", () => {
    expect(() =>
      assertStatusTransition({
        role: "PM",
        userId: "pm",
        assigneeId: "u1",
        from: "IN_PROGRESS",
        to: "DONE",
        isBlocked: false,
      }),
    ).toThrow(AppError);
  });

  test("rejects blocked task start and illegal terminal transitions", () => {
    expect(() =>
      assertStatusTransition({
        role: "INTERNAL",
        userId: "u1",
        assigneeId: "u1",
        from: "TODO",
        to: "IN_PROGRESS",
        isBlocked: true,
      }),
    ).toThrow(AppError);

    expect(() =>
      assertStatusTransition({
        role: "PM",
        userId: "pm",
        assigneeId: "u1",
        from: "DONE",
        to: "TODO",
        isBlocked: false,
      }),
    ).toThrow(AppError);
  });
});
