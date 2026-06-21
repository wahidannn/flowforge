"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardTaskDto } from "@flowforge/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiClientError, api, queryKeys } from "@/lib/api-client";
import { formatStatus } from "./statuses";

type DeletedTasksDialogProps = {
  open: boolean;
  projectId: string | null;
  onOpenChange: (open: boolean) => void;
  onConflict: (error: ApiClientError) => void;
};

function TaskMeta({ task }: { task: BoardTaskDto }) {
  return (
    <p className="mt-1 text-xs text-slate-500">
      {formatStatus(task.status)} | Version {task.version}
      {task.assignee ? ` | ${task.assignee.name}` : ""}
      {task.deletedAt ? ` | Deleted ${new Date(task.deletedAt).toLocaleString()}` : ""}
    </p>
  );
}

export function DeletedTasksDialog({ open, projectId, onOpenChange, onConflict }: DeletedTasksDialogProps) {
  const queryClient = useQueryClient();
  const deletedTasks = useQuery({
    queryKey: queryKeys.deletedTasks(projectId),
    queryFn: () => api.deletedTasks(projectId as string),
    enabled: Boolean(open && projectId),
  });

  const restoreMutation = useMutation({
    mutationFn: (task: BoardTaskDto) => api.restoreTask(task.id, { version: task.version }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deletedTasks(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.board(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.standup(projectId) });
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409) onConflict(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deleted tasks</DialogTitle>
          <DialogDescription>Restore soft-deleted tasks for the selected project.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {deletedTasks.isLoading ? <p className="text-sm text-slate-500">Loading deleted tasks...</p> : null}
          {deletedTasks.error ? <Alert className="border-coral text-coral">{(deletedTasks.error as Error).message}</Alert> : null}

          {deletedTasks.data?.length ? (
            <div className="space-y-2">
              {deletedTasks.data.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-3 border border-line px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <TaskMeta task={task} />
                  </div>
                  <Button variant="outline" size="sm" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(task)}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          ) : !deletedTasks.isLoading ? (
            <p className="text-sm text-slate-500">No deleted tasks.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
