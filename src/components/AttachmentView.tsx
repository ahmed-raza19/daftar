import type { Attachment } from "@/lib/types";

// Minimal CSV parser (handles quoted cells with commas).
function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const cells: string[] = [];
      let cur = "";
      let quoted = false;
      for (const ch of line) {
        if (ch === '"') quoted = !quoted;
        else if (ch === "," && !quoted) {
          cells.push(cur);
          cur = "";
        } else cur += ch;
      }
      cells.push(cur);
      return cells.map((c) => c.trim());
    });
}

export default function AttachmentView({ a }: { a: Attachment }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <figcaption className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
        <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
          {a.kind === "table" ? "csv" : a.kind}
        </span>
        <span className="truncate font-mono">{a.name}</span>
      </figcaption>
      {a.kind === "table" ? <CsvTable text={a.content} /> : null}
      {a.kind === "code" ? (
        <pre className="scroll-thin max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed text-slate-800">
          {a.content.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-3 w-6 shrink-0 select-none text-right text-slate-400">{i + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
        </pre>
      ) : null}
      {a.kind === "text" ? (
        <p className="whitespace-pre-wrap p-3 text-sm leading-relaxed text-slate-700">{a.content}</p>
      ) : null}
    </figure>
  );
}

function CsvTable({ text }: { text: string }) {
  const [head, ...rows] = parseCsv(text);
  if (!head) return null;
  const numeric = head.map((_, c) => rows.every((r) => r[c] === undefined || r[c] === "" || !isNaN(Number(r[c].replace(/,/g, "")))));
  return (
    <div className="scroll-thin max-h-80 overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-white">
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className={`border-b border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 ${numeric[i] ? "text-right" : "text-left"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-slate-50/60">
              {head.map((_, c) => (
                <td
                  key={c}
                  className={`whitespace-nowrap border-b border-slate-100 px-2.5 py-1.5 text-slate-700 ${numeric[c] ? "text-right font-mono tabular-nums" : ""}`}
                >
                  {r[c]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
