"use client";

import { create } from "zustand";
import type { ApiErrorPayload } from "./api-client";

type UiState = {
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  isCreateTaskOpen: boolean;
  isDeletedTasksOpen: boolean;
  conflict: ApiErrorPayload["error"] | null;
  setSelectedProjectId: (projectId: string | null) => void;
  openTask: (taskId: string) => void;
  closeTask: () => void;
  openCreateTask: () => void;
  closeCreateTask: () => void;
  openDeletedTasks: () => void;
  closeDeletedTasks: () => void;
  openConflict: (conflict: ApiErrorPayload["error"]) => void;
  closeConflict: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedProjectId: null,
  selectedTaskId: null,
  isCreateTaskOpen: false,
  isDeletedTasksOpen: false,
  conflict: null,
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  openTask: (selectedTaskId) => set({ selectedTaskId }),
  closeTask: () => set({ selectedTaskId: null }),
  openCreateTask: () => set({ isCreateTaskOpen: true }),
  closeCreateTask: () => set({ isCreateTaskOpen: false }),
  openDeletedTasks: () => set({ isDeletedTasksOpen: true }),
  closeDeletedTasks: () => set({ isDeletedTasksOpen: false }),
  openConflict: (conflict) => set({ conflict }),
  closeConflict: () => set({ conflict: null }),
}));
