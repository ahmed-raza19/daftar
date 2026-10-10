// Builds the review as a formatted A4 PDF in the browser (jsPDF + autotable):
// header, score and stars, the at-a-glance table, a skills bar chart, evidence,
// hidden tests, hidden information, deliverable feedback and the 30-day plan.
// Loaded only when the user clicks "Download PDF".

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { overallStars, shiftSignals } from "./metrics";
import { fileStem } from "./session";
import type { Session } from "./types";
import { SKILLS } from "./types";

type RGB = [number, number, number];
const BRAND: RGB = [14, 94, 70];
const BRAND_TINT: RGB = [238, 247, 242];
const INK: RGB = [30, 36, 51];
const MUTED: RGB = [100, 116, 139];
const TRACK: RGB = [226, 232, 240];
const AMBER: RGB = [245, 158, 11];
const RED: RGB = [185, 28, 28];

const M = 40; // page margin (pt)

/** The standard PDF fonts only cover Latin-1 + a few symbols; drop anything else (emoji etc.). */
function clean(s: string): string {
  return s.replace(/[^\x20-\x7E\xA0-\xFF‘’“”–—•…\n]/g, "").replace(/[ \t]+/g, " ").trim();
}

function starPoints(cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return pts;
}

/** Keep the part of a polygon left of xMax (for half stars). */
function clipLeft(pts: [number, number][], xMax: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const aIn = a[0] <= xMax;
    const bIn = b[0] <= xMax;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (xMax - a[0]) / (b[0] - a[0]);
      out.push([xMax, a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

function polygon(doc: jsPDF, pts: [number, number][]) {
  if (pts.length < 3) return;
  const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], "F", true);
}

function drawStars(doc: jsPDF, value: number, x: number, y: number, size: number) {
  for (let i = 0; i < 5; i++) {
    const cx = x + i * (size + 2) + size / 2;
    const cy = y + size / 2;
    const pts = starPoints(cx, cy, size / 2);
    doc.setFillColor(...TRACK);
    polygon(doc, pts);
    const fill = Math.max(0, Math.min(1, value - i));
    if (fill > 0) {
      doc.setFillColor(...AMBER);
      polygon(doc, fill >= 1 ? pts : clipLeft(pts, cx - size / 2 + size * fill));
    }
  }
}

export async function downloadReportPdf(session: Session) {
  const doc = buildReportPdf(session);
  doc?.save(`${fileStem(session)}-review.pdf`);
}

export function buildReportPdf(session: Session): jsPDF | null {
  const r = session.report;
  if (!r) return null;
  const s = session.scenario;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed > H - 60) {
      doc.addPage();
      y = 56;
    }
  };
  // minSpace: room the section needs below its heading, so a heading is never
  // left alone at the bottom of a page.
  const heading = (text: string, minSpace = 40) => {
    ensure(minSpace + 36);
    y += 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(text, M, y);
    y += 10;
  };

  // ---- Header band ----
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 62, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Daftar", M, 39);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("First-shift review", W - M, 29, { align: "right" });
  const date = new Date(session.submittedAt ?? Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(date, W - M, 43, { align: "right" });

  // ---- Name, role, summary (left) and score box (right) ----
  const boxW = 150;
  const boxX = W - M - boxW;
  const boxY = 82;
  doc.setFillColor(...BRAND_TINT);
  doc.roundedRect(boxX, boxY, boxW, 104, 8, 8, "F");
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.text(String(r.overall), boxX + 16, boxY + 44);
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("/100", boxX + 16 + doc.getTextWidth(String(r.overall)) * (38 / 11) + 4, boxY + 44);
  const stars = overallStars(r.overall);
  drawStars(doc, stars, boxX + 16, boxY + 56, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(stars.toFixed(1), boxX + 16 + 5 * 15 + 4, boxY + 66);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1.5);
  doc.roundedRect(boxX + 16, boxY + 76, doc.getTextWidth(r.verdict) * (11 / 9) + 16, 19, 3, 3, "S");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND);
  doc.text(r.verdict, boxX + 24, boxY + 89);

  const leftW = boxX - M - 20;
  y = 100;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(doc.splitTextToSize(clean(session.profile.name), leftW), M, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const sub = doc.splitTextToSize(clean(`${s.graduateTitle} at ${s.company.name} (a fictional company), ${session.profile.degree}`), leftW);
  doc.text(sub, M, y);
  y += sub.length * 12 + 8;
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const summary = doc.splitTextToSize(clean(r.summary), leftW);
  doc.text(summary, M, y);
  y = Math.max(y + summary.length * 13, boxY + 104) + 6;

  // ---- At a glance ----
  heading("At a glance", 120);
  const signals = shiftSignals(session);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [["Criteria", "Result", "Rating", "Source"]],
    body: signals.map((sig) => [
      `${clean(sig.label)}\n${clean(sig.note)}`,
      clean(sig.value),
      sig.stars === null ? "n/a" : "",
      sig.source === "measured" ? "Measured by app" : "AI review",
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: INK, valign: "middle" },
    headStyles: { fillColor: [241, 245, 249], textColor: MUTED, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 200 }, 1: { cellWidth: 130, fontStyle: "bold" }, 2: { cellWidth: 100 }, 3: { textColor: MUTED } },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 2) return;
      const sig = signals[data.row.index];
      if (sig?.stars == null) return;
      drawStars(doc, sig.stars, data.cell.x + 5, data.cell.y + data.cell.height / 2 - 5, 10);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(sig.stars.toFixed(1), data.cell.x + 5 + 5 * 12 + 2, data.cell.y + data.cell.height / 2 + 3);
    },
  });
  y = lastY();

  // ---- Skills bar chart ----
  heading("Six workplace skills (0-10)", 150);
  const barX = M + 175;
  const barW = W - M - barX - 60;
  for (const { id, label } of SKILLS) {
    const k = r.skills.find((x) => x.id === id);
    ensure(24);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(label, M, y);
    doc.setFillColor(...TRACK);
    doc.rect(barX, y - 8, barW, 9, "F");
    if (k && k.assessed !== false) {
      doc.setFillColor(...BRAND);
      doc.rect(barX, y - 8, (barW * k.score) / 10, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.text(`${k.score}/10`, barX + barW + 10, y);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...MUTED);
      doc.text("not assessed", barX + barW + 10, y);
    }
  }
  y += 8;

  // ---- Evidence ----
  heading("Evidence and feedback", 130);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [["Skill", "Your words", "Feedback"]],
    body: SKILLS.map(({ id, label }) => {
      const k = r.skills.find((x) => x.id === id);
      const assessed = k?.assessed !== false;
      return [
        `${label}\n${assessed ? `${k?.score ?? 0}/10` : "not assessed"}`,
        assessed && k?.evidence && k.evidence !== "No evidence in transcript" ? `“${clean(k.evidence)}”` : "No evidence in transcript",
        clean(k?.feedback ?? ""),
      ];
    }),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: INK, valign: "top" },
    headStyles: { fillColor: [241, 245, 249], textColor: MUTED, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 105, fontStyle: "bold" }, 1: { cellWidth: 170, fontStyle: "italic" } },
  });
  y = lastY();

  // ---- Code Shift tests ----
  const lastRun = session.codeRuns?.at(-1);
  if (s.codeTask && lastRun) {
    heading(`Hidden tests: ${lastRun.passed}/${lastRun.total} passing (run by the app)`, 110);
    autoTable(doc, {
      startY: y + 4,
      margin: { left: M, right: M },
      head: [["Result", "Test", "Details"]],
      body: lastRun.results.map((t) => [t.passed ? "PASS" : "FAIL", clean(t.name), clean(t.message)]),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: INK },
      headStyles: { fillColor: [241, 245, 249], textColor: MUTED, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          data.cell.styles.textColor = data.cell.raw === "PASS" ? BRAND : RED;
        }
      },
    });
    y = lastY();
  }

  // ---- Hidden information ----
  const facts = s.personas.flatMap((p) => p.privateFacts.map((f) => ({ ...f, holder: p })));
  const found = facts.filter((f) => session.revealedFactIds.includes(f.id)).length;
  heading(`Hidden information: ${found} of ${facts.length} found`, 110);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [["Found?", "Who knew it", "What they knew", "Used in your work?"]],
    body: facts.map((f) => {
      const use = r.facts.find((x) => x.factId === f.id);
      return [
        session.revealedFactIds.includes(f.id) ? "Found" : "Missed",
        clean(`${f.holder.name}\n${f.holder.title}`),
        clean(f.fact),
        use ? (use.usedInDeliverable ? "Yes" : "No") : "-",
      ];
    }),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: INK, valign: "top" },
    headStyles: { fillColor: [241, 245, 249], textColor: MUTED, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold" }, 1: { cellWidth: 110 }, 3: { cellWidth: 70 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.textColor = data.cell.raw === "Found" ? BRAND : MUTED;
      }
    },
  });
  y = lastY();

  // ---- Deliverable ----
  heading(`${s.codeTask ? "Your code and note" : "Your deliverable"}: ${r.deliverable.score}/10`);
  const bullets = (title: string, items: string[]) => {
    if (!items.length) return;
    ensure(30);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(title, M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    for (const item of items) {
      const lines = doc.splitTextToSize(clean(item), W - 2 * M - 14);
      ensure(lines.length * 12 + 4);
      y += 13;
      doc.text("•", M, y);
      doc.text(lines, M + 12, y);
      y += (lines.length - 1) * 12;
    }
  };
  bullets("What worked", r.deliverable.strengths);
  bullets("What to fix", r.deliverable.issues);
  const senior = doc.splitTextToSize(clean(r.deliverable.seniorVersion), W - 2 * M - 20);
  ensure(senior.length * 12 + 34);
  y += 14;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, y, W - 2 * M, senior.length * 12 + 26, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("What a senior would have submitted", M + 10, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  doc.text(senior, M + 10, y + 29);
  y += senior.length * 12 + 26;

  // ---- 30-day plan ----
  heading("Your 30-day plan", 120);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: M, right: M },
    head: [["Week", "Focus", "Actions"]],
    body: r.plan.map((w) => [`Week ${w.week}`, clean(w.focus), w.actions.map((a) => `• ${clean(a)}`).join("\n")]),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: INK, valign: "top" },
    headStyles: { fillColor: [241, 245, 249], textColor: MUTED, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" }, 1: { cellWidth: 130, fontStyle: "bold" } },
  });

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...TRACK);
    doc.setLineWidth(0.5);
    doc.line(M, H - 36, W - M, H - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "Daftar: AI-generated practice feedback, not a hiring decision. Companies and people are fictional. Measured rows are counted by the app.",
      M,
      H - 24,
    );
    doc.text(`Page ${i} of ${pages}`, W - M, H - 24, { align: "right" });
  }

  return doc;
}
