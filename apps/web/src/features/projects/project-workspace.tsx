"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardTaskDto, TaskStatus } from "@flowforge/shared";
import { Bell, LogOut, Search, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiClientError, api, queryKeys } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useUiStore } from "@/lib/ui-store";
import { ConflictDialog } from "@/features/tasks/conflict-dialog";
import { CreateTaskDialog } from "@/features/tasks/create-task-dialog";
import { DeletedTasksDialog } from "@/features/tasks/deleted-tasks-dialog";
import { StandupSummaryPanel } from "@/features/standup/standup-summary-panel";
import { TaskBoard } from "@/features/tasks/task-board";
import { filterBoardTasks } from "@/features/tasks/task-board-filters";
import { TaskDetailDrawer } from "@/features/tasks/task-detail-drawer";
import { TaskMetrics } from "@/features/tasks/task-metrics";
import { ProjectHeader } from "./project-header";

export function ProjectWorkspace() {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((state) => state.setToken);
  const [taskSearch, setTaskSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const {
    selectedProjectId,
    selectedTaskId,
    isCreateTaskOpen,
    isDeletedTasksOpen,
    setSelectedProjectId,
    openTask,
    closeTask,
    openCreateTask,
    closeCreateTask,
    openDeletedTasks,
    closeDeletedTasks,
    conflict,
    openConflict,
    closeConflict,
  } = useUiStore();
  const me = useQuery({ queryKey: queryKeys.me, queryFn: api.me });
  const projects = useQuery({ queryKey: queryKeys.projects, queryFn: api.projects });

  useEffect(() => {
    if (!selectedProjectId && projects.data?.[0]) setSelectedProjectId(projects.data[0].id);
  }, [projects.data, selectedProjectId, setSelectedProjectId]);

  const board = useQuery({
    queryKey: queryKeys.board(selectedProjectId),
    queryFn: () => api.board(selectedProjectId as string),
    enabled: Boolean(selectedProjectId),
  });

  const members = useQuery({
    queryKey: queryKeys.projectMembers(selectedProjectId),
    queryFn: () => api.projectMembers(selectedProjectId as string),
    enabled: Boolean(selectedProjectId),
  });

  const assigneeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    board.data?.forEach((task) => {
      if (task.assignee) seen.set(task.assignee.id, task.assignee.name);
    });
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [board.data]);

  const filteredTasks = useMemo(() => {
    return filterBoardTasks(board.data, {
      search: taskSearch,
      priority: priorityFilter,
      assigneeId: assigneeFilter,
      status: statusFilter,
    });
  }, [assigneeFilter, board.data, priorityFilter, statusFilter, taskSearch]);

  const invalidateBoard = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.board(selectedProjectId) });
  };

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiClientError && error.status === 409) {
      openConflict(error.payload?.error ?? { code: error.code, message: error.message });
      invalidateBoard();
    }
  };

  const createTaskMutation = useMutation({
    mutationFn: (input: Parameters<typeof api.createTask>[1]) => api.createTask(selectedProjectId as string, input),
    onSuccess: (task) => {
      closeCreateTask();
      invalidateBoard();
      openTask(task.id);
    },
    onError: handleMutationError,
  });

  const statusMutation = useMutation({
    mutationFn: ({ task, status }: { task: BoardTaskDto; status: TaskStatus }) =>
      api.updateStatus(task.id, { version: task.version, status }),
    onSuccess: () => {
      invalidateBoard();
      closeConflict();
    },
    onError: handleMutationError,
  });

  return (
    <main className="min-h-screen bg-[#f7f9fd] text-ink">
      <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border border-emerald-100 bg-emerald-50 text-xs font-bold text-emerald-700">
                  F
                </div>
                <div>
                  <p className="text-xs text-slate-500">Workspace</p>
                  <h1 className="text-base font-semibold">Tasks</h1>
                </div>
              </div>
              <div className="relative hidden min-w-64 max-w-md flex-1 md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-violet-300"
                  placeholder="Search..."
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 border border-slate-200 bg-white px-2 py-1">
                  <UserCircle2 className="h-5 w-5 text-violet-600" />
                  <div className="hidden leading-tight sm:block">
                    <p className="text-xs font-medium">{me.data?.name ?? "User"}</p>
                    <p className="text-[10px] uppercase text-slate-500">{me.data?.role ?? "..."}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" onClick={() => setToken(null)} aria-label="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <ProjectHeader
            user={me.data}
            projects={projects.data}
            selectedProjectId={selectedProjectId}
            canCreateTask={me.data?.role === "PM"}
            canViewDeletedTasks={me.data?.role === "PM"}
            taskSearch={taskSearch}
            priorityFilter={priorityFilter}
            assigneeFilter={assigneeFilter}
            statusFilter={statusFilter}
            assigneeOptions={assigneeOptions}
            onProjectChange={setSelectedProjectId}
            onCreateTask={openCreateTask}
            onOpenDeletedTasks={openDeletedTasks}
            onTaskSearchChange={setTaskSearch}
            onPriorityFilterChange={setPriorityFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <div className="px-4 pb-6">
            <section className="my-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <StandupSummaryPanel projectId={selectedProjectId} role={me.data?.role} />
              <TaskMetrics tasks={board.data} />
            </section>

            <TaskBoard
              tasks={filteredTasks}
              role={me.data?.role}
              isLoading={projects.isLoading || board.isLoading}
              error={(projects.error as Error | null) ?? (board.error as Error | null)}
              mutationPending={statusMutation.isPending}
              onOpenTask={openTask}
              onStatusChange={(task, status) => statusMutation.mutate({ task, status })}
            />
          </div>
      </div>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        members={members.data}
        isSubmitting={createTaskMutation.isPending}
        onOpenChange={(open) => (open ? openCreateTask() : closeCreateTask())}
        onSubmit={(input) => createTaskMutation.mutate(input)}
      />

      <TaskDetailDrawer
        taskId={selectedTaskId}
        projectId={selectedProjectId}
        role={me.data?.role}
        members={members.data}
        boardTasks={board.data}
        open={Boolean(selectedTaskId)}
        onOpenChange={(open) => {
          if (!open) closeTask();
        }}
        onConflict={(error) => {
          openConflict(error.payload?.error ?? { code: error.code, message: error.message });
          invalidateBoard();
        }}
      />

      <DeletedTasksDialog
        open={isDeletedTasksOpen}
        projectId={selectedProjectId}
        onOpenChange={(open) => (open ? openDeletedTasks() : closeDeletedTasks())}
        onConflict={(error) => {
          openConflict(error.payload?.error ?? { code: error.code, message: error.message });
          invalidateBoard();
        }}
      />

      <ConflictDialog
        conflict={conflict}
        onClose={closeConflict}
        onReloadLatest={() => {
          closeConflict();
          invalidateBoard();
        }}
      />
    </main>
  );
}
