import { describe, expect, mock, test } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskForm } from "./task-form";
import type { TaskFormInput } from "@/lib/api-client";
import { renderWithQueryClient } from "@/test/test-utils";
import { projectMembers } from "@/test/fixtures";

describe("TaskForm", () => {
  test("validates required title and description", async () => {
    const user = userEvent.setup();
    const onSubmit = mock(() => {});

    renderWithQueryClient(<TaskForm members={projectMembers} submitLabel="Create task" isSubmitting={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(screen.getByText("Title is required.")).not.toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits normalized payload with assignee, priority, due date, and client visibility", async () => {
    const user = userEvent.setup();
    const onSubmit = mock(() => {});

    renderWithQueryClient(<TaskForm members={projectMembers} submitLabel="Create task" isSubmitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Title"), "New delivery task");
    await user.type(screen.getByLabelText("Description"), "Prepare the next delivery handoff.");

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole("option", { name: "Ira Internal" }));
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(await screen.findByRole("option", { name: "HIGH" }));

    await user.type(screen.getByLabelText("Due date"), "2026-06-22T10:30");
    await user.click(screen.getByLabelText("Client visible"));
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = (onSubmit.mock.calls as unknown as Array<[TaskFormInput]>)[0]?.[0];
    expect(payload).toBeDefined();
    expect(payload).toMatchObject({
      title: "New delivery task",
      description: "Prepare the next delivery handoff.",
      assigneeId: "user-internal",
      priority: "HIGH",
      clientVisible: true,
    });
    expect(payload.dueDate).toContain("2026-06-22");
  });
});
