"use client";

import type { BoardTaskDto, TaskStatus, UserRole } from "@flowforge/shared";
import { CheckCircle2, CircleDashed, Clock3, Hourglass, PauseCircle, XCircle } from "lucide-react";
import { formatStatus } from "./statuses";
import { TaskCard } from "./task-card";

type TaskColumnProps = {
  status: TaskStatus;
  tasks: BoardTaskDto[];
  role?: UserRole;
  mutationPending: boolean;
  onOpenTask: (taskId: string) => void;
  onStatusChange: (task: BoardTaskDto, status: TaskStatus) => void;
};

export function TaskColumn({ status, tasks, role, mutationPending, onOpenTask, onStatusChange }: TaskColumnProps) {
  const statusStyle: Record<TaskStatus, { header: string; icon: typeof CircleDashed; dot: string }> = {
    TODO: { header: "border-violet-200 bg-violet-50 text-violet-700", icon: CircleDashed, dot: "bg-violet-400" },
    BLOCKED: { header: "border-rose-200 bg-rose-50 text-rose-700", icon: PauseCircle, dot: "bg-rose-400" },
    IN_PROGRESS: { header: "border-orange-200 bg-orange-50 text-orange-700", icon: Clock3, dot: "bg-orange-400" },
    REVIEW: { header: "border-yellow-200 bg-yellow-50 text-yellow-700", icon: Hourglass, dot: "bg-yellow-400" },
    DONE: { header: "border-sky-200 bg-sky-50 text-sky-700", icon: CheckCircle2, dot: "bg-sky-400" },
    CANCELLED: { header: "border-slate-200 bg-slate-50 text-slate-600", icon: XCircle, dot: "bg-slate-400" },
  };
  const Icon = statusStyle[status].icon;

  return (
    <section className="min-h-[420px] min-w-0">
      <div className={`flex items-center justify-between rounded-lg border px-3 py-2 shadow-sm ${statusStyle[status].header}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle[status].dot}`} />
          <h2 className="text-sm font-semibold">{formatStatus(status)}</h2>
        </div>
        <span className="min-w-6 rounded-md bg-white/75 px-1.5 py-0.5 text-center text-[10px] font-semibold">{tasks.length}</span>
      </div>
      <div className="mt-3 space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              role={role}
              disabled={mutationPending}
              onOpen={() => onOpenTask(task.id)}
              onStatusChange={(nextStatus) => onStatusChange(task, nextStatus)}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white/50 py-10 text-center text-xs text-slate-400">No tasks</p>
        )}
      </div>
    </section>
  );
}
