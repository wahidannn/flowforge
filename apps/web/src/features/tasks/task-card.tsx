"use client";

import type { BoardTaskDto, TaskStatus, UserRole } from "@flowforge/shared";
import { CalendarDays, Clock3, Plus } from "lucide-react";
import { StatusSelect } from "./status-select";

type TaskCardProps = {
  task: BoardTaskDto;
  role?: UserRole;
  disabled: boolean;
  onOpen: () => void;
  onStatusChange: (status: TaskStatus) => void;
};

export function TaskCard({ task, role, disabled, onOpen, onStatusChange }: TaskCardProps) {
  const canChangeStatus = role === "PM" || role === "INTERNAL";
  const priority = task.priority ?? "None";
  const blockedBy = task.blockedBy ?? [];
  const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date";
  const assigneeNames = task.assignee?.name ? task.assignee.name.split(/\s+/).filter(Boolean) : [];
  const assigneeInitials = assigneeNames.length
    ? assigneeNames.slice(0, 2).map((name) => name[0]?.toUpperCase()).join("")
    : "";
  const cardStyle: Record<TaskStatus, { card: string; chip: string; avatar: string }> = {
    TODO: { card: "bg-violet-50/80 shadow-violet-100/70", chip: "bg-white/70 text-violet-700", avatar: "bg-violet-200 text-violet-800" },
    BLOCKED: { card: "bg-rose-50/85 shadow-rose-100/70", chip: "bg-white/70 text-rose-700", avatar: "bg-rose-200 text-rose-800" },
    IN_PROGRESS: { card: "bg-orange-50/85 shadow-orange-100/70", chip: "bg-white/70 text-orange-700", avatar: "bg-orange-200 text-orange-800" },
    REVIEW: { card: "bg-yellow-50/85 shadow-yellow-100/70", chip: "bg-white/70 text-yellow-700", avatar: "bg-yellow-200 text-yellow-800" },
    DONE: { card: "bg-sky-50/85 shadow-sky-100/70", chip: "bg-white/70 text-sky-700", avatar: "bg-sky-200 text-sky-800" },
    CANCELLED: { card: "bg-slate-100/80 shadow-slate-100", chip: "bg-white/70 text-slate-600", avatar: "bg-slate-200 text-slate-700" },
  };
  const style = cardStyle[task.status];

  return (
    <article
      className={`cursor-pointer rounded-2xl border border-white/80 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${style.card}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${style.chip}`}>{priority === "None" ? "Task" : `${priority} Priority`}</span>
      </div>
      <h2 className="mt-4 text-sm font-semibold leading-5 text-ink">{task.title}</h2>
      {task.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{task.description}</p> : null}
      <div className="mt-4 space-y-3 text-xs text-slate-600">
        {task.assignee ? (
          <div className="flex items-center gap-2 border-b border-white/70 pb-3">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${style.avatar}`}>{assigneeInitials}</span>
            <span className="max-w-28 truncate font-medium text-ink">{task.assignee.name}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/60 text-slate-500">
              <Plus className="h-3 w-3" />
            </span>
          </div>
        ) : null}
      </div>
      {task.isBlocked ? (
        <p className="mt-3 rounded-lg border border-red-100 bg-white/60 px-2 py-1.5 text-xs text-coral">
          Blocked by {blockedBy.length ? blockedBy.map((dependency) => dependency.title).join(", ") : "internal dependency"}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {dueDate}
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/65 px-2 py-1 text-[11px]">
          <Clock3 className="h-3 w-3" />
          Time
        </span>
      </div>
      {canChangeStatus ? (
        <div className="mt-3" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <StatusSelect value={task.status} isBlocked={task.isBlocked} disabled={disabled} onChange={onStatusChange} />
        </div>
      ) : null}
    </article>
  );
}
