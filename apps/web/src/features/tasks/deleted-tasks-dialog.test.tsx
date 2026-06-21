import { afterEach, describe, expect, mock, test } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletedTasksDialog } from "./deleted-tasks-dialog";
import { ApiClientError, api, queryKeys } from "@/lib/api-client";
import { renderWithQueryClient } from "@/test/test-utils";
import { deletedTask } from "@/test/fixtures";

const originalApi = { ...api };

afterEach(() => {
  Object.assign(api, originalApi);
});

describe("DeletedTasksDialog", () => {
  test("renders empty state", async () => {
    api.deletedTasks = mock(async () => []);

    renderWithQueryClient(<DeletedTasksDialog open projectId="project-1" onOpenChange={() => {}} onConflict={() => {}} />);

    expect(await screen.findByText("No deleted tasks.")).not.toBeNull();
  });

  test("renders deleted tasks and restores with query invalidation", async () => {
    const user = userEvent.setup();
    api.deletedTasks = mock(async () => [deletedTask]);
    api.restoreTask = mock(async () => ({ ok: true as const }));
    const view = renderWithQueryClient(<DeletedTasksDialog open projectId="project-1" onOpenChange={() => {}} onConflict={() => {}} />);
    const invalidate = mock(view.client.invalidateQueries.bind(view.client));
    view.client.invalidateQueries = invalidate as typeof view.client.invalidateQueries;

    expect(await screen.findByText(deletedTask.title)).not.toBeNull();
    expect(screen.getByText(/REVIEW \| Version 7/)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(api.restoreTask).toHaveBeenCalledWith(deletedTask.id, { version: deletedTask.version }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.deletedTasks("project-1") });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.board("project-1") });
  });

  test("passes restore conflicts to the shared conflict handler", async () => {
    const user = userEvent.setup();
    const onConflict = mock(() => {});
    api.deletedTasks = mock(async () => [deletedTask]);
    api.restoreTask = mock(async () => {
      throw new ApiClientError(409, "TASK_VERSION_CONFLICT", "Task version conflict", {
        error: { code: "TASK_VERSION_CONFLICT", message: "Conflict", currentVersion: 8, currentTask: deletedTask },
      });
    });

    renderWithQueryClient(<DeletedTasksDialog open projectId="project-1" onOpenChange={() => {}} onConflict={onConflict} />);

    await user.click(await screen.findByRole("button", { name: "Restore" }));
    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
  });
});
