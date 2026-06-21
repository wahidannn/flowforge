import { afterEach, describe, expect, mock, test } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StandupSummaryPanel } from "./standup-summary-panel";
import { api, queryKeys } from "@/lib/api-client";
import { renderWithQueryClient } from "@/test/test-utils";
import { latestStandup, previousStandup } from "@/test/fixtures";

const originalApi = { ...api };

afterEach(() => {
  Object.assign(api, originalApi);
});

describe("StandupSummaryPanel", () => {
  test("is hidden for Client", () => {
    const { container } = renderWithQueryClient(<StandupSummaryPanel projectId="project-1" role="CLIENT" />);
    expect(container.innerHTML).toBe("");
  });

  test("PM sees generate action and can invalidate standup query", async () => {
    const user = userEvent.setup();
    api.dailyStandup = mock(async () => []);
    api.generateStandup = mock(async () => latestStandup);
    const view = renderWithQueryClient(<StandupSummaryPanel projectId="project-1" role="PM" />);
    const invalidate = mock(view.client.invalidateQueries.bind(view.client));
    view.client.invalidateQueries = invalidate as typeof view.client.invalidateQueries;

    expect(await screen.findByText("Generate a summary to capture today's delivery progress.")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Generate today" }));

    await waitFor(() => expect(api.generateStandup).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.standup("project-1") });
  });

  test("Internal sees read-only latest summary, counts, blockers, and previous summaries", async () => {
    api.dailyStandup = mock(async () => [latestStandup, previousStandup]);

    renderWithQueryClient(<StandupSummaryPanel projectId="project-1" role="INTERNAL" />);

    expect(await screen.findByText("4 done")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Generate today" })).toBeNull();
    expect(screen.getByText("2 in progress")).not.toBeNull();
    expect(screen.getByText("1 blocked")).not.toBeNull();
    expect(screen.getByText("Blocked integration task")).not.toBeNull();
    expect(screen.getByText("Previous summaries")).not.toBeNull();
    expect(screen.getByText("Previous day summary.")).not.toBeNull();
  });
});
