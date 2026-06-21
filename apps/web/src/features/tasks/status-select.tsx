"use client";

import type { TaskStatus } from "@flowforge/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatStatus, statuses } from "./statuses";

type StatusSelectProps = {
  value: TaskStatus;
  isBlocked: boolean;
  disabled: boolean;
  onChange: (status: TaskStatus) => void;
};

export function StatusSelect({ value, isBlocked, disabled, onChange }: StatusSelectProps) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(nextStatus) => onChange(nextStatus as TaskStatus)}>
      <SelectTrigger className="h-8 border-slate-200 bg-white/80 px-2.5 text-[11px] shadow-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status} disabled={status === "IN_PROGRESS" && isBlocked}>
            {formatStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
