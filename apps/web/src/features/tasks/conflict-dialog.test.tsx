import { describe, expect, mock, test } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConflictDialog } from "./conflict-dialog";
import { renderWithQueryClient } from "@/test/test-utils";
import { baseTask } from "@/test/fixtures";

describe("ConflictDialog", () => {
  test("renders current task details and supports reload/close actions", async () => {
    const user = userEvent.setup();
    const onReloadLatest = mock(() => {});
    const onClose = mock(() => {});

    renderWithQueryClient(
      <ConflictDialog
        conflict={{
          code: "TASK_VERSION_CONFLICT",
          message: "Task changed by another user.",
          currentVersion: 9,
          currentTask: { ...baseTask, status: "REVIEW", version: 9 },
        }}
        onReloadLatest={onReloadLatest}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Task changed elsewhere")).not.toBeNull();
    expect(screen.getByText("Task changed by another user.")).not.toBeNull();
    expect(screen.getByText(baseTask.title)).not.toBeNull();
    expect(screen.getByText("Current status: REVIEW | Version 9")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Reload latest" }));
    expect(onReloadLatest).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
