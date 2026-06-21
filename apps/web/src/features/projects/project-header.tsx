"use client";

import type { TaskStatus, UserRole } from "@flowforge/shared";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectDto } from "@/lib/api-client";
import { formatStatus, statuses } from "@/features/tasks/statuses";

type ProjectHeaderProps = {
  user?: {
    name: string;
    role: UserRole;
  };
  projects?: ProjectDto[];
  selectedProjectId: string | null;
  canCreateTask: boolean;
  canViewDeletedTasks: boolean;
  taskSearch: string;
  priorityFilter: string;
  assigneeFilter: string;
  statusFilter: TaskStatus | "all";
  assigneeOptions: Array<{ id: string; name: string }>;
  onProjectChange: (projectId: string) => void;
  onCreateTask: () => void;
  onOpenDeletedTasks: () => void;
  onTaskSearchChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
  onAssigneeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatus | "all") => void;
};

export function ProjectHeader({
  user,
  projects,
  selectedProjectId,
  canCreateTask,
  canViewDeletedTasks,
  taskSearch,
  priorityFilter,
  assigneeFilter,
  statusFilter,
  assigneeOptions,
  onProjectChange,
  onCreateTask,
  onOpenDeletedTasks,
  onTaskSearchChange,
  onPriorityFilterChange,
  onAssigneeFilterChange,
  onStatusFilterChange,
}: ProjectHeaderProps) {
  return (
    <section className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">FlowForge Tasks</h2>
            {user ? <span className="border border-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-500">{user.role}</span> : null}
          </div>
          <div className="mt-1 max-w-xs">
            <Select value={selectedProjectId ?? ""} onValueChange={onProjectChange} disabled={!projects?.length}>
              <SelectTrigger className="h-9 border-slate-200 bg-white px-3 text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <div className="relative min-w-48 flex-1 sm:max-w-64 md:hidden">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-8 border-slate-200 bg-slate-50 pl-8 text-xs"
              placeholder="Search task..."
              value={taskSearch}
              onChange={(event) => onTaskSearchChange(event.target.value)}
            />
          </div>

          <Select value={assigneeFilter} onValueChange={onAssigneeFilterChange}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Assignee</SelectItem>
              {assigneeOptions.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as TaskStatus | "all")}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canViewDeletedTasks ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onOpenDeletedTasks}>
              <Trash2 className="h-3.5 w-3.5" />
              Deleted
            </Button>
          ) : null}
          {canCreateTask ? (
            <Button size="sm" className="h-8 gap-1.5 bg-violet-600 text-xs hover:bg-violet-700" onClick={onCreateTask}>
              <Plus className="h-3.5 w-3.5" />
              Create Task
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
