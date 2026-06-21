import "./setup";
import { afterEach } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { cleanupDom } from "./setup";
import { useUiStore } from "@/lib/ui-store";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithQueryClient(ui: ReactElement, client = createTestQueryClient()) {
  cleanup();
  cleanupDom();
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  };
}

export async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  cleanup();
  cleanupDom();
  useUiStore.setState({
    selectedProjectId: null,
    selectedTaskId: null,
    isCreateTaskOpen: false,
    isDeletedTasksOpen: false,
    conflict: null,
  });
});
