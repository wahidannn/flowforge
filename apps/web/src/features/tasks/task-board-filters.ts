import type { BoardTaskDto, TaskStatus } from "@flowforge/shared";

export type TaskBoardFilters = {
  search: string;
  priority: string;
  assigneeId: string;
  status: TaskStatus | "all";
};

export function filterBoardTasks(tasks: BoardTaskDto[] | undefined, filters: TaskBoardFilters) {
  const search = filters.search.trim().toLowerCase();
  return tasks?.filter((task) => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search) ||
      task.description?.toLowerCase().includes(search) ||
      task.assignee?.name.toLowerCase().includes(search);
    const matchesPriority = filters.priority === "all" || (task.priority ?? "none") === filters.priority;
    const matchesAssignee = filters.assigneeId === "all" || task.assignee?.id === filters.assigneeId;
    const matchesStatus = filters.status === "all" || task.status === filters.status;
    return matchesSearch && matchesPriority && matchesAssignee && matchesStatus;
  });
}
