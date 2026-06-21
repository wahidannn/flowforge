"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardTaskDto, ProjectMemberDto, TaskDependencyDto, UserRole } from "@flowforge/shared";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApiClientError, api, queryKeys, type TaskFormInput } from "@/lib/api-client";
import { AttachmentSection } from "./attachment-section";
import { formatStatus } from "./statuses";
import { TaskForm } from "./task-form";

type TaskDetailDrawerProps = {
  taskId: string | null;
  projectId: string | null;
  role?: UserRole;
  members?: ProjectMemberDto[];
  boardTasks?: BoardTaskDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConflict: (error: ApiClientError) => void;
};

function stringifyAuditValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-ink">{value || "-"}</p>
    </div>
  );
}

export function TaskDetailDrawer({ taskId, projectId, role, members, boardTasks, open, onOpenChange, onConflict }: TaskDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null);
  const canManage = role === "PM";
  const canViewAudit = role === "PM" || role === "INTERNAL";

  const task = useQuery({
    queryKey: queryKeys.task(taskId),
    queryFn: () => api.getTask(taskId as string),
    enabled: Boolean(open && taskId),
  });

  const audit = useQuery({
    queryKey: queryKeys.audit(taskId),
    queryFn: () => api.audit(taskId as string),
    enabled: Boolean(open && taskId && canViewAudit),
  });

  const invalidateTaskSurfaces = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.audit(taskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.board(projectId) });
  };

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiClientError && error.status === 409) onConflict(error);
  };

  const updateMutation = useMutation({
    mutationFn: (input: TaskFormInput & { version: number }) => api.updateTask(taskId as string, input),
    onSuccess: () => {
      setEditing(false);
      invalidateTaskSurfaces();
    },
    onError: handleMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: (version: number) => api.deleteTask(taskId as string, { version }),
    onSuccess: () => {
      setDeleteOpen(false);
      onOpenChange(false);
      invalidateTaskSurfaces();
    },
    onError: handleMutationError,
  });

  const addDependencyMutation = useMutation({
    mutationFn: ({ version, dependsOnTaskId }: { version: number; dependsOnTaskId: string }) =>
      api.addDependency(taskId as string, { version, dependsOnTaskId }),
    onSuccess: () => {
      setDependencyTaskId(null);
      invalidateTaskSurfaces();
    },
    onError: handleMutationError,
  });

  const removeDependencyMutation = useMutation({
    mutationFn: ({ version, dependencyId }: { version: number; dependencyId: string }) =>
      api.removeDependency(taskId as string, dependencyId, { version }),
    onSuccess: invalidateTaskSurfaces,
    onError: handleMutationError,
  });

  const detail = task.data;
  const dependencies = detail?.dependencies ?? [];
  const dependencyTaskIds = new Set(dependencies.map((dependency) => dependency.taskId));
  const dependencyCandidates = useMemo(
    () => boardTasks?.filter((candidate) => candidate.id !== detail?.id && !dependencyTaskIds.has(candidate.id)) ?? [],
    [boardTasks, dependencyTaskIds, detail?.id],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detail?.title ?? "Task detail"}</SheetTitle>
            <SheetDescription>
              {detail ? `${formatStatus(detail.status)} | Version ${detail.version}` : "Loading task details"}
            </SheetDescription>
          </SheetHeader>

          <SheetBody>
            {task.isLoading ? <Alert>Loading task...</Alert> : null}
            {task.error ? <Alert className="border-coral text-coral">{(task.error as Error).message}</Alert> : null}

            {detail ? (
              <div className="space-y-6">
                {editing && canManage ? (
                  <TaskForm
                    task={detail}
                    members={members}
                    submitLabel="Save changes"
                    isSubmitting={updateMutation.isPending}
                    onCancel={() => setEditing(false)}
                    onSubmit={(input) => updateMutation.mutate({ ...input, version: detail.version })}
                  />
                ) : (
                  <section className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={detail.isBlocked ? "warning" : "outline"}>{detail.isBlocked ? "Blocked" : formatStatus(detail.status)}</Badge>
                      {detail.clientVisible ? <Badge>Client visible</Badge> : null}
                      {detail.priority ? <Badge variant="muted">{detail.priority}</Badge> : null}
                    </div>
                    {detail.description ? <p className="text-sm leading-6 text-slate-700">{detail.description}</p> : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Assignee" value={detail.assignee?.name} />
                      <Field label="Due date" value={detail.dueDate ? new Date(detail.dueDate).toLocaleString() : null} />
                      <Field label="Updated" value={detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : null} />
                      <Field label="Project task" value={detail.projectId} />
                    </div>
                    {canManage ? (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditing(true)}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Dependencies</h3>
                  {dependencies.length ? (
                    <div className="space-y-2">
                      {dependencies.map((dependency: TaskDependencyDto) => (
                        <div key={dependency.id} className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{dependency.title}</p>
                            <p className="text-xs text-slate-500">{formatStatus(dependency.status)}</p>
                          </div>
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={removeDependencyMutation.isPending}
                              onClick={() => removeDependencyMutation.mutate({ version: detail.version, dependencyId: dependency.id })}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No dependencies.</p>
                  )}

                  {detail.isBlocked ? (
                    <p className="text-sm text-coral">
                      Blocked by {detail.blockedBy.length ? detail.blockedBy.map((blocker) => blocker.title).join(", ") : "internal dependency"}.
                    </p>
                  ) : null}

                  {canManage ? (
                    <div className="flex gap-2">
                      <Select value={dependencyTaskId ?? ""} onValueChange={setDependencyTaskId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dependency" />
                        </SelectTrigger>
                        <SelectContent>
                          {dependencyCandidates.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        disabled={!dependencyTaskId || addDependencyMutation.isPending}
                        onClick={() => {
                          if (dependencyTaskId) addDependencyMutation.mutate({ version: detail.version, dependsOnTaskId: dependencyTaskId });
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ) : null}
                </section>

                {detail.id && role !== "CLIENT" ? <AttachmentSection taskId={detail.id} role={role} open={open} /> : null}

                {canViewAudit ? (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">Audit trail</h3>
                    {audit.isLoading ? <p className="text-sm text-slate-500">Loading audit...</p> : null}
                    {audit.data?.length ? (
                      <div className="space-y-2">
                        {audit.data.map((entry) => (
                          <div key={entry.id} className="border border-line px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{entry.action}</p>
                              <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                            </div>
                            {entry.field ? <p className="mt-1 text-xs text-slate-600">Field: {entry.field}</p> : null}
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {stringifyAuditValue(entry.oldValue)} -&gt; {stringifyAuditValue(entry.newValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : !audit.isLoading ? (
                      <p className="text-sm text-slate-500">No audit entries.</p>
                    ) : null}
                  </section>
                ) : null}
              </div>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>This task will be soft-deleted and removed from the board.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!detail || deleteMutation.isPending} onClick={() => detail && deleteMutation.mutate(detail.version)}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
