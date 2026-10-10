"use client";

// Attach files to a submission: drag and drop or click to choose.
// Shows what the AI reviewer will be able to do with each file.

import { useRef, useState } from "react";
import { binaryBytes, forgetFile, formatSize, hasBytes, MAX_BINARY_BYTES, MAX_FILES, previewUrl, readSubmissionFile } from "@/lib/files";
import type { SubmissionFile } from "@/lib/types";

const KIND_LABEL: Record<SubmissionFile["kind"], { text: string; style: string }> = {
  text: { text: "Read by the reviewer", style: "bg-brand-50 text-brand-800" },
  image: { text: "Viewed by the AI", style: "bg-sky-50 text-sky-800" },
  pdf: { text: "Viewed by the AI", style: "bg-sky-50 text-sky-800" },
  other: { text: "Name and size only", style: "bg-slate-100 text-slate-600" },
};

export default function FileAttach({ files, onChange }: { files: SubmissionFile[]; onChange: (f: SubmissionFile[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const incoming = [...list];
    if (files.length + incoming.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    setBusy(true);
    try {
      const read: SubmissionFile[] = [];
      for (const f of incoming) read.push(await readSubmissionFile(f));
      if (binaryBytes([...files, ...read]) > MAX_BINARY_BYTES) {
        read.forEach((f) => forgetFile(f.id));
        setError(`Images and PDFs can total up to ${formatSize(MAX_BINARY_BYTES)}.`);
        return;
      }
      onChange([...files, ...read]);
    } catch {
      setError("Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-500" aria-hidden>
          <path d="M21 12.5l-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="font-medium text-ink">{busy ? "Reading files…" : "Attach files (optional)"}</div>
          <div className="text-xs text-slate-500">Drop or click: text and code files, images, PDFs, or anything else</div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-xs text-red-700">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => {
            const url = previewUrl(f);
            const lost = (f.kind === "image" || f.kind === "pdf") && !hasBytes(f.id);
            return (
              <li key={f.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 font-mono text-[10px] uppercase text-slate-600">
                    {(f.name.split(".").pop() ?? "file").slice(0, 4)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{f.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    {formatSize(f.size)}
                    <span className={`rounded px-1 py-px font-medium ${lost ? "bg-amber-50 text-amber-800" : KIND_LABEL[f.kind].style}`}>
                      {lost ? "Re-attach after refresh" : KIND_LABEL[f.kind].text}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    forgetFile(f.id);
                    onChange(files.filter((x) => x.id !== f.id));
                  }}
                  className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-red-700"
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
