import { describe, expect, test } from "bun:test";
import { filterBoardTasks } from "./task-board-filters";
import { baseTask, blockedTask } from "@/test/fixtures";

const tasks = [
  { ...baseTask, id: "task-a", title: "Prepare launch plan", priority: "HIGH", status: "TODO" as const },
  { ...baseTask, id: "task-b", title: "Review copy", priority: "LOW", status: "DONE" as const, assignee: undefined },
  { ...blockedTask, id: "task-c", title: "Blocked API task", priority: "MEDIUM", status: "BLOCKED" as const },
];

describe("filterBoardTasks", () => {
  test("filters by search, priority, assignee, and status", () => {
    expect(filterBoardTasks(tasks, { search: "launch", priority: "all", assigneeId: "all", status: "all" })?.map((task) => task.id)).toEqual([
      "task-a",
    ]);
    expect(filterBoardTasks(tasks, { search: "", priority: "LOW", assigneeId: "all", status: "all" })?.map((task) => task.id)).toEqual([
      "task-b",
    ]);
    expect(filterBoardTasks(tasks, { search: "", priority: "all", assigneeId: "user-internal", status: "all" })?.map((task) => task.id)).toEqual([
      "task-a",
      "task-c",
    ]);
    expect(filterBoardTasks(tasks, { search: "", priority: "all", assigneeId: "all", status: "BLOCKED" })?.map((task) => task.id)).toEqual([
      "task-c",
    ]);
  });
});
