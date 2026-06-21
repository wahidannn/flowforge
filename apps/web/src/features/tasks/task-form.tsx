"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { BoardTaskDto, ProjectMemberDto } from "@flowforge/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TaskFormInput } from "@/lib/api-client";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  assigneeId: z.string().nullable(),
  priority: z.string().optional(),
  dueDate: z.string().nullable(),
  clientVisible: z.boolean(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type TaskFormProps = {
  task?: BoardTaskDto;
  members?: ProjectMemberDto[];
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (input: TaskFormInput) => void;
  onCancel?: () => void;
};

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toApiDateTime(value?: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export function TaskForm({ task, members, submitLabel, isSubmitting, onSubmit, onCancel }: TaskFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<TaskFormValues>({
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeId: task?.assignee?.id ?? null,
      priority: task?.priority ?? "",
      dueDate: toLocalDateTime(task?.dueDate),
      clientVisible: Boolean(task?.clientVisible),
    },
  });

  useEffect(() => {
    reset({
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeId: task?.assignee?.id ?? null,
      priority: task?.priority ?? "",
      dueDate: toLocalDateTime(task?.dueDate),
      clientVisible: Boolean(task?.clientVisible),
    });
  }, [reset, task]);

  const assigneeId = watch("assigneeId");
  const priority = watch("priority");
  const clientVisible = watch("clientVisible");

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        const parsed = taskFormSchema.safeParse(values);
        if (!parsed.success) {
          setFormError(parsed.error.issues[0]?.message ?? "Invalid task data.");
          return;
        }
        setFormError(null);
        onSubmit({
          title: parsed.data.title,
          description: parsed.data.description,
          assigneeId: parsed.data.assigneeId,
          priority: parsed.data.priority || undefined,
          dueDate: toApiDateTime(parsed.data.dueDate),
          clientVisible: parsed.data.clientVisible,
        });
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="task-title">Title</Label>
        <Input id="task-title" {...register("title")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-description">Description</Label>
        <Textarea id="task-description" {...register("description")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Assignee</Label>
          <Select value={assigneeId ?? "unassigned"} onValueChange={(value) => setValue("assigneeId", value === "unassigned" ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members
                ?.filter((member) => member.user.role !== "CLIENT")
                .map((member) => (
                  <SelectItem key={member.user.id} value={member.user.id}>
                    {member.user.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority || "none"} onValueChange={(value) => setValue("priority", value === "none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="No priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No priority</SelectItem>
              <SelectItem value="LOW">LOW</SelectItem>
              <SelectItem value="MEDIUM">MEDIUM</SelectItem>
              <SelectItem value="HIGH">HIGH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-due-date">Due date</Label>
        <Input id="task-due-date" type="datetime-local" {...register("dueDate")} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <Checkbox checked={clientVisible} onChange={(event) => setValue("clientVisible", event.target.checked)} />
        Client visible
      </label>

      {formError ? <p className="text-sm text-coral">{formError}</p> : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
