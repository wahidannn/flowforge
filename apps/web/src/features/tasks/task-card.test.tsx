import { describe, expect, mock, test } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BoardTaskDto } from "@flowforge/shared";
import { TaskCard } from "./task-card";
import { renderWithQueryClient } from "@/test/test-utils";
import { baseTask, blockedTask } from "@/test/fixtures";

describe("TaskCard", () => {
  test("shows status control for PM and Internal, but not Client", () => {
    renderWithQueryClient(<TaskCard task={baseTask} role="PM" disabled={false} onOpen={() => {}} onStatusChange={() => {}} />);
    expect(screen.getByRole("combobox")).not.toBeNull();

    renderWithQueryClient(<TaskCard task={baseTask} role="INTERNAL" disabled={false} onOpen={() => {}} onStatusChange={() => {}} />);
    expect(screen.getByRole("combobox")).not.toBeNull();

    renderWithQueryClient(<TaskCard task={baseTask} role="CLIENT" disabled={false} onOpen={() => {}} onStatusChange={() => {}} />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  test("renders minimal Client DTO without internal dependency fields", () => {
    renderWithQueryClient(
      <TaskCard
        task={{
          id: "client-task",
          title: "Client visible milestone",
          status: "TODO",
          isBlocked: false,
          dueDate: null,
          updatedAt: "2026-06-21T00:00:00.000Z",
        } as BoardTaskDto}
        role="CLIENT"
        disabled={false}
        onOpen={() => {}}
        onStatusChange={() => {}}
      />,
    );

    expect(screen.getByText("Client visible milestone")).not.toBeNull();
    expect(screen.getByText("No due date")).not.toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  test("blocks IN_PROGRESS when task is dependency-blocked", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<TaskCard task={blockedTask} role="PM" disabled={false} onOpen={() => {}} onStatusChange={() => {}} />);

    await user.click(screen.getByRole("combobox"));
    const inProgressItem = await screen.findByText("IN PROGRESS");

    expect(inProgressItem.closest("[data-disabled]")).not.toBeNull();
  });

  test("card click opens drawer while status select click stays local", async () => {
    const user = userEvent.setup();
    const onOpen = mock(() => {});
    const onStatusChange = mock(() => {});

    renderWithQueryClient(<TaskCard task={baseTask} role="PM" disabled={false} onOpen={onOpen} onStatusChange={onStatusChange} />);

    await user.click(screen.getByRole("combobox"));
    expect(onOpen).not.toHaveBeenCalled();

    renderWithQueryClient(<TaskCard task={baseTask} role="PM" disabled={false} onOpen={onOpen} onStatusChange={onStatusChange} />);
    await user.click(screen.getByRole("button", { name: /Build board regression coverage/ }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
  });
});
