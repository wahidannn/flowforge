import { describe, expect, test } from "bun:test";
import { getTaskMetrics } from "./task-metrics";
import { baseTask, blockedTask } from "@/test/fixtures";

describe("getTaskMetrics", () => {
  test("derives priority, total, done, and blocked counts", () => {
    const metrics = getTaskMetrics([
      { ...baseTask, id: "low", priority: "LOW", status: "TODO", isBlocked: false },
      { ...baseTask, id: "medium", priority: "MEDIUM", status: "DONE", isBlocked: false },
      { ...baseTask, id: "high", priority: "HIGH", status: "REVIEW", isBlocked: false },
      blockedTask,
    ]);

    expect(metrics).toEqual({
      low: 1,
      medium: 1,
      high: 2,
      total: 4,
      done: 1,
      blocked: 1,
    });
  });
});
