"use client";

import type { BoardTaskDto } from "@flowforge/shared";
import { AlertTriangle, CheckCircle2, Flag, ListChecks } from "lucide-react";

type TaskMetricsProps = {
  tasks?: BoardTaskDto[];
};

function countPriority(tasks: BoardTaskDto[] | undefined, priority: string) {
  return tasks?.filter((task) => task.priority === priority).length ?? 0;
}

export function getTaskMetrics(tasks: BoardTaskDto[] | undefined) {
  return {
    low: countPriority(tasks, "LOW"),
    medium: countPriority(tasks, "MEDIUM"),
    high: countPriority(tasks, "HIGH"),
    total: tasks?.length ?? 0,
    done: tasks?.filter((task) => task.status === "DONE").length ?? 0,
    blocked: tasks?.filter((task) => task.isBlocked || task.status === "BLOCKED").length ?? 0,
  };
}

export function TaskMetrics({ tasks }: TaskMetricsProps) {
  const metrics = getTaskMetrics(tasks);
  const items = [
    { label: "Low Priority", value: metrics.low, icon: Flag, color: "text-emerald-700", bg: "bg-emerald-50/90", iconBg: "bg-white/70" },
    { label: "Medium Priority", value: metrics.medium, icon: Flag, color: "text-amber-700", bg: "bg-amber-50/90", iconBg: "bg-white/70" },
    { label: "High Priority", value: metrics.high, icon: Flag, color: "text-rose-700", bg: "bg-rose-50/90", iconBg: "bg-white/70" },
    { label: "Total Task", value: metrics.total, icon: ListChecks, color: "text-violet-700", bg: "bg-violet-50/90", iconBg: "bg-white/70" },
    { label: "Total Done", value: metrics.done, icon: CheckCircle2, color: "text-sky-700", bg: "bg-sky-50/90", iconBg: "bg-white/70" },
    { label: "Blocked", value: metrics.blocked, icon: AlertTriangle, color: "text-rose-700", bg: "bg-red-50/90", iconBg: "bg-white/70" },
  ];

  return (
    <section className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`rounded-2xl border border-white/80 px-4 py-3 shadow-sm ${item.bg}`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${item.iconBg} ${item.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="truncate text-xs font-medium text-slate-600">{item.label}</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-ink">{item.value}</p>
          </div>
        );
      })}
    </section>
  );
}
