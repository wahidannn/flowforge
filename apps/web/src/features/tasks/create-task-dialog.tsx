"use client";

import type { ProjectMemberDto } from "@flowforge/shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TaskFormInput } from "@/lib/api-client";
import { TaskForm } from "./task-form";

type CreateTaskDialogProps = {
  open: boolean;
  members?: ProjectMemberDto[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: TaskFormInput) => void;
};

export function CreateTaskDialog({ open, members, isSubmitting, onOpenChange, onSubmit }: CreateTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Create a task for the selected project.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <TaskForm members={members} submitLabel="Create task" isSubmitting={isSubmitting} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
