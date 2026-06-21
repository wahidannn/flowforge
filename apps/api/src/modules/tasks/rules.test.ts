import { describe, expect, test } from "bun:test";
import { AppError } from "../../errors";
import { assertStatusTransition, canUpdateTaskMetadata, canViewTask } from "./rules";

describe("task permission rules", () => {
  test("PM can view tasks and edit metadata", () => {
    expect(canViewTask({ userId: "pm", role: "PM", task: { assigneeId: null, clientVisible: false } })).toBe(true);
    expect(canUpdateTaskMetadata("PM")).toBe(true);
  });

  test("internal user only sees assigned tasks", () => {
    expect(canViewTask({ userId: "u1", role: "INTERNAL", task: { assigneeId: "u1", clientVisible: false } })).toBe(true);
    expect(canViewTask({ userId: "u1", role: "INTERNAL", task: { assigneeId: "u2", clientVisible: true } })).toBe(false);
  });

  test("client only sees client visible tasks", () => {
    expect(canViewTask({ userId: "client", role: "CLIENT", task: { assigneeId: "u1", clientVisible: true } })).toBe(true);
    expect(canViewTask({ userId: "client", role: "CLIENT", task: { assigneeId: "u1", clientVisible: false } })).toBe(false);
  });
});

describe("task transition rules", () => {
  test("PM cannot move IN_PROGRESS directly to DONE", () => {
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

  test("blocked task cannot start", () => {
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
  });

  test("assigned internal user can move IN_PROGRESS to REVIEW", () => {
    expect(() =>
      assertStatusTransition({
        role: "INTERNAL",
        userId: "u1",
        assigneeId: "u1",
        from: "IN_PROGRESS",
        to: "REVIEW",
        isBlocked: false,
      }),
    ).not.toThrow();
  });
});
