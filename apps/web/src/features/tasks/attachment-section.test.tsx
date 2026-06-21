import { afterEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentSection } from "./attachment-section";
import { api, queryKeys } from "@/lib/api-client";
import { renderWithQueryClient } from "@/test/test-utils";
import { attachment, baseTask } from "@/test/fixtures";

const originalApi = { ...api };

afterEach(() => {
  Object.assign(api, originalApi);
});

describe("AttachmentSection", () => {
  test("is hidden for Client", () => {
    const { container } = renderWithQueryClient(<AttachmentSection taskId={baseTask.id} role="CLIENT" open />);
    expect(container.innerHTML).toBe("");
  });

  test("renders attachment list for PM/Internal", async () => {
    api.attachments = mock(async () => [attachment]);

    renderWithQueryClient(<AttachmentSection taskId={baseTask.id} role="PM" open />);

    expect(await screen.findByText("handoff.pdf")).not.toBeNull();
    expect(screen.getByText(/application\/pdf \| 2.0 KB/)).not.toBeNull();
  });

  test("validates invalid URL and size", async () => {
    api.attachments = mock(async () => []);
    api.addAttachment = mock(async () => attachment);

    renderWithQueryClient(<AttachmentSection taskId={baseTask.id} role="PM" open />);

    await screen.findByText("No attachments.");
    fireEvent.change(screen.getByLabelText("File name"), { target: { value: "bad.txt" } });
    fireEvent.change(screen.getByLabelText("MIME type"), { target: { value: "text/plain" } });
    fireEvent.change(screen.getByLabelText("File URL"), { target: { value: "not-a-url" } });
    fireEvent.change(screen.getByLabelText("Size bytes"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));

    expect(await screen.findByText("File URL must be valid.")).not.toBeNull();
    expect(api.addAttachment).not.toHaveBeenCalled();
  });

  test("adds and deletes attachments with attachments/audit invalidation", async () => {
    const user = userEvent.setup();
    api.attachments = mock(async () => [attachment]);
    api.addAttachment = mock(async () => attachment);
    api.deleteAttachment = mock(async () => ({ ok: true as const }));
    const view = renderWithQueryClient(<AttachmentSection taskId={baseTask.id} role="INTERNAL" open />);
    const invalidate = mock(view.client.invalidateQueries.bind(view.client));
    view.client.invalidateQueries = invalidate as typeof view.client.invalidateQueries;

    expect(await screen.findByText("handoff.pdf")).not.toBeNull();

    await user.type(screen.getByLabelText("File name"), "notes.txt");
    await user.type(screen.getByLabelText("MIME type"), "text/plain");
    await user.type(screen.getByLabelText("File URL"), "https://example.com/notes.txt");
    await user.clear(screen.getByLabelText("Size bytes"));
    await user.type(screen.getByLabelText("Size bytes"), "4096");
    await user.click(screen.getByRole("button", { name: "Add attachment" }));

    await waitFor(() =>
      expect(api.addAttachment).toHaveBeenCalledWith(baseTask.id, {
        fileName: "notes.txt",
        fileUrl: "https://example.com/notes.txt",
        mimeType: "text/plain",
        sizeBytes: 4096,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.attachments(baseTask.id) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.audit(baseTask.id) });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.deleteAttachment).toHaveBeenCalledWith(baseTask.id, attachment.id));
  });
});
