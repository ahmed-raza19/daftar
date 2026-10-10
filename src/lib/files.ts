// Files attached to a submission (browser side).
// - Text files (txt, md, csv, code, json...) are read as text and stored in the session.
// - Images and PDFs are read as base64 and kept in memory only (localStorage is too
//   small for them); they are sent to the AI reviewer when the work is graded.
// - Anything else is accepted, but only its name and size are shared with the reviewer.

import type { SubmissionFile } from "./types";

export const MAX_FILES = 5;
export const MAX_BINARY_BYTES = 2.5 * 1024 * 1024; // total for images + PDFs (Vercel body limit)
const MAX_TEXT_CHARS = 20_000;

const TEXT_EXT = /\.(txt|md|csv|tsv|json|py|js|ts|tsx|jsx|java|c|cpp|cs|go|rb|php|sql|html|css|xml|yaml|yml|ipynb|log)$/i;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const blobs = new Map<string, string>(); // file id -> base64 (no data: prefix)

export function kindOf(file: File): SubmissionFile["kind"] {
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) return "text";
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  return "other";
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Reads a browser File into a SubmissionFile (and stores image/PDF bytes in memory). */
export async function readSubmissionFile(file: File): Promise<SubmissionFile> {
  const id = Math.random().toString(36).slice(2, 10);
  const kind = kindOf(file);
  const base = { id, name: file.name, type: file.type || "application/octet-stream", size: file.size, kind };
  if (kind === "text") {
    const text = await file.text();
    return { ...base, text: text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n[...truncated]` : text };
  }
  if (kind === "image" || kind === "pdf") {
    blobs.set(id, await readAsBase64(file));
    return { ...base, type: kind === "pdf" ? "application/pdf" : file.type };
  }
  return base;
}

export function binaryBytes(files: SubmissionFile[]): number {
  return files.filter((f) => f.kind === "image" || f.kind === "pdf").reduce((n, f) => n + f.size, 0);
}

/** Image/PDF contents for the grader; files lost after a page refresh are skipped. */
export function attachmentsFor(files: SubmissionFile[] | undefined): { name: string; mimeType: string; data: string }[] {
  return (files ?? [])
    .filter((f) => (f.kind === "image" || f.kind === "pdf") && blobs.has(f.id))
    .map((f) => ({ name: f.name, mimeType: f.type, data: blobs.get(f.id)! }));
}

export function hasBytes(id: string): boolean {
  return blobs.has(id);
}

export function previewUrl(f: SubmissionFile): string | null {
  const data = blobs.get(f.id);
  return data && f.kind === "image" ? `data:${f.type};base64,${data}` : null;
}

export function forgetFile(id: string) {
  blobs.delete(id);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
