"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatStatus } from "./statuses";
import type { ApiErrorPayload } from "@/lib/api-client";

type ConflictDialogProps = {
  conflict: ApiErrorPayload["error"] | null;
  onReloadLatest: () => void;
  onClose: () => void;
};

export function ConflictDialog({ conflict, onReloadLatest, onClose }: ConflictDialogProps) {
  const currentTask = conflict?.currentTask;

  return (
    <Dialog open={Boolean(conflict)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Task changed elsewhere</DialogTitle>
          <DialogDescription>{conflict?.message ?? "Reload the latest task data before continuing."}</DialogDescription>
        </DialogHeader>
        {currentTask ? (
          <div className="mt-4 border border-line bg-paper p-3 text-sm">
            <p className="font-medium">{currentTask.title}</p>
            <p className="mt-1 text-slate-600">
              Current status: {formatStatus(currentTask.status)} | Version {conflict?.currentVersion ?? currentTask.version}
            </p>
          </div>
        ) : conflict?.currentVersion ? (
          <p className="mt-4 text-sm text-slate-600">Current version: {conflict.currentVersion}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onReloadLatest}>Reload latest</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
