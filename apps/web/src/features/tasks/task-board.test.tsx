import { describe, expect, test } from "bun:test";
import { screen } from "@testing-library/react";
import { TaskBoard } from "./task-board";
import { renderWithQueryClient } from "@/test/test-utils";
import { baseTask } from "@/test/fixtures";

describe("TaskBoard", () => {
  test("renders all six FlowForge status columns without column add-task buttons", () => {
    renderWithQueryClient(
      <TaskBoard
        tasks={[baseTask]}
        role="PM"
        isLoading={false}
        error={null}
        mutationPending={false}
        onOpenTask={() => {}}
        onStatusChange={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "TODO" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "BLOCKED" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "IN PROGRESS" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "REVIEW" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "DONE" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "CANCELLED" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /add task/i })).toBeNull();
  });
});
