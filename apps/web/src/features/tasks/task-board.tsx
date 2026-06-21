"use client";

import { useMemo } from "react";
import type { BoardTaskDto, TaskStatus, UserRole } from "@flowforge/shared";
import { Alert } from "@/components/ui/alert";
import { statuses } from "./statuses";
import { TaskColumn } from "./task-column";

type TaskBoardProps = {
  tasks?: BoardTaskDto[];
  role?: UserRole;
  isLoading: boolean;
  error: Error | null;
  mutationPending: boolean;
  onOpenTask: (taskId: string) => void;
  onStatusChange: (task: BoardTaskDto, status: TaskStatus) => void;
};

export function TaskBoard({ tasks, role, isLoading, error, mutationPending, onOpenTask, onStatusChange }: TaskBoardProps) {
  const grouped = useMemo(() => {
    const result = new Map<TaskStatus, BoardTaskDto[]>();
    statuses.forEach((status) => result.set(status, []));
    tasks?.forEach((task) => result.get(task.status)?.push(task));
    return result;
  }, [tasks]);

  if (isLoading) {
    return <Alert className="mt-4 border-slate-200 bg-white">Loading board...</Alert>;
  }

  if (error) {
    return <Alert className="mt-4 border-coral bg-white text-coral">{error.message}</Alert>;
  }

  if (!tasks?.length) {
    return <Alert className="border-slate-200 bg-white">No tasks match the current board view.</Alert>;
  }

  return (
    <section className="overflow-x-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-6 gap-3">
        {statuses.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={grouped.get(status) ?? []}
            role={role}
            mutationPending={mutationPending}
            onOpenTask={onOpenTask}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </section>
  );
}
