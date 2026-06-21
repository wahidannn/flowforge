"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { UserRole } from "@flowforge/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, api, queryKeys, type AttachmentInput } from "@/lib/api-client";

const attachmentSchema = z.object({
  fileName: z.string().min(1, "File name is required."),
  fileUrl: z.string().url("File URL must be valid."),
  mimeType: z.string().min(1, "MIME type is required."),
  sizeBytes: z.coerce.number().int().positive("Size must be a positive integer."),
});

type AttachmentFormValues = z.input<typeof attachmentSchema>;

type AttachmentSectionProps = {
  taskId: string;
  role?: UserRole;
  open: boolean;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentSection({ taskId, role, open }: AttachmentSectionProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const canViewAttachments = role === "PM" || role === "INTERNAL";
  const canAddAttachment = canViewAttachments;
  const { register, handleSubmit, reset } = useForm<AttachmentFormValues>({
    defaultValues: {
      fileName: "",
      fileUrl: "",
      mimeType: "",
      sizeBytes: 1,
    },
  });

  const attachments = useQuery({
    queryKey: queryKeys.attachments(taskId),
    queryFn: () => api.attachments(taskId),
    enabled: Boolean(open && taskId && canViewAttachments),
  });

  const invalidateAttachments = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.attachments(taskId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.audit(taskId) });
  };

  const addMutation = useMutation({
    mutationFn: (input: AttachmentInput) => api.addAttachment(taskId, input),
    onSuccess: () => {
      reset();
      setFormError(null);
      setSectionError(null);
      invalidateAttachments();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Failed to add attachment.");
      if (error instanceof ApiClientError && error.status === 403) setSectionError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => api.deleteAttachment(taskId, attachmentId),
    onSuccess: () => {
      setSectionError(null);
      invalidateAttachments();
    },
    onError: (error) => {
      setSectionError(error instanceof Error ? error.message : "Failed to delete attachment.");
    },
  });

  if (!canViewAttachments) return null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Attachments</h3>
        <p className="text-xs text-slate-500">Attach existing file URLs for internal delivery context.</p>
      </div>

      {sectionError ? <Alert className="border-coral text-coral">{sectionError}</Alert> : null}
      {attachments.error ? <Alert className="border-coral text-coral">{(attachments.error as Error).message}</Alert> : null}
      {attachments.isLoading ? <p className="text-sm text-slate-500">Loading attachments...</p> : null}

      {attachments.data?.length ? (
        <div className="space-y-2">
          {attachments.data.map((attachment) => (
            <div key={attachment.id} className="flex items-start justify-between gap-3 border border-line px-3 py-2 text-sm">
              <div className="min-w-0">
                <a className="font-medium text-ink underline-offset-4 hover:underline" href={attachment.fileUrl} target="_blank" rel="noreferrer">
                  {attachment.fileName}
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  {attachment.mimeType} | {formatBytes(attachment.sizeBytes)} | {new Date(attachment.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(attachment.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      ) : !attachments.isLoading ? (
        <p className="text-sm text-slate-500">No attachments.</p>
      ) : null}

      {canAddAttachment ? (
        <form
          className="space-y-3 border border-line bg-paper p-3"
          onSubmit={handleSubmit((values) => {
            const parsed = attachmentSchema.safeParse(values);
            if (!parsed.success) {
              setFormError(parsed.error.issues[0]?.message ?? "Invalid attachment.");
              return;
            }
            addMutation.mutate(parsed.data);
          })}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="attachment-file-name">File name</Label>
              <Input id="attachment-file-name" {...register("fileName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attachment-mime-type">MIME type</Label>
              <Input id="attachment-mime-type" placeholder="application/pdf" {...register("mimeType")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attachment-file-url">File URL</Label>
            <Input id="attachment-file-url" placeholder="https://example.com/file.pdf" {...register("fileUrl")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attachment-size">Size bytes</Label>
            <Input id="attachment-size" type="number" min={1} {...register("sizeBytes")} />
          </div>
          {formError ? <p className="text-sm text-coral">{formError}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add attachment"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
