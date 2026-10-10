// Builds the review as a formatted A4 PDF in the browser (jsPDF + autotable):
// header, score and stars, the at-a-glance table, a skills bar chart, evidence,
// hidden tests, hidden information, deliverable feedback and the 30-day plan.
// Loaded only when the user clicks "Download PDF".

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { shiftAnalytics } from "./analytics";
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

// ---- Shift analytics (dashboard charts) ----

/** Draws the analytics section starting at y; returns the new y. */
function drawAnalytics(doc: jsPDF, session: Session, y: number): number {
  const a = shiftAnalytics(session);
  const r = session.report!;
  const W = doc.internal.pageSize.getWidth();
  const innerW = W - 2 * M;

  // KPI boxes
  const lastRun = a.testRuns.at(-1);
  const consulted = a.people.filter((p) => p.count > 0).length;
  const kpis: [string, string, string][] = [
    ["Overall score", `${r.overall}`, r.verdict],
    ["Time on shift", `${a.durationMin} min`, `${a.activity.at(-1)?.total ?? 0} messages sent`],
    ["Hidden info found", `${a.intel.found}/${a.intel.total}`, `${Math.round((a.intel.found / Math.max(1, a.intel.total)) * 100)}% uncovered`],
    lastRun
      ? ["Hidden tests", `${lastRun.passed}/${lastRun.total}`, `${a.testRuns.length} test runs`]
      : ["People consulted", `${consulted}/${a.people.length}`, "messaged or @mentioned"],
  ];
  const gap = 10;
  const boxW = (innerW - gap * 3) / 4;
  kpis.forEach(([label, value, sub], i) => {
    const x = M + i * (boxW + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...TRACK);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, boxW, 56, 6, 6, "FD");
    doc.setFillColor(...BRAND);
    doc.circle(x + 14, y + 16, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 22, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text(clean(value), x + 10, y + 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(clean(sub), x + 10, y + 49);
  });
  y += 72;

  // Activity area chart (left) + donut (right)
  const chartW = innerW - 170;
  const chartH = 150;
  const cx0 = M;
  const cy0 = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Your shift, minute by minute", cx0, cy0 + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Messages sent so far. Dashed lines mark the surprises.", cx0, cy0 + 15);

  const P = { l: 22, r: 8, t: 30, b: 18 };
  const pts = a.activity;
  const maxY = Math.max(2, pts.at(-1)!.total);
  const maxX = Math.max(pts.at(-1)!.minute, 1);
  const px = (m: number) => cx0 + P.l + (m / maxX) * (chartW - P.l - P.r);
  const py = (v: number) => cy0 + chartH - P.b - (v / maxY) * (chartH - P.t - P.b);

  // grid + y labels
  doc.setDrawColor(...TRACK);
  doc.setLineWidth(0.5);
  for (const t of Array.from(new Set([0, Math.ceil(maxY / 2), maxY]))) {
    doc.line(cx0 + P.l, py(t), cx0 + chartW - P.r, py(t));
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(String(t), cx0 + P.l - 5, py(t) + 2.5, { align: "right" });
  }
  // x labels
  pts.forEach((p, i) => {
    if (i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1) {
      doc.text(`${p.minute}m`, px(p.minute), cy0 + chartH - 6, { align: "center" });
    }
  });
  // area fill
  const poly: [number, number][] = [
    [px(0), py(0)],
    ...pts.map((p) => [px(p.minute), py(p.total)] as [number, number]),
    [px(pts.at(-1)!.minute), py(0)],
  ];
  doc.setFillColor(214, 234, 224);
  polygon(doc, poly);
  // line
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1.6);
  for (let i = 1; i < pts.length; i++) {
    doc.line(px(pts[i - 1].minute), py(pts[i - 1].total), px(pts[i].minute), py(pts[i].total));
  }
  // end point + label
  const last = pts.at(-1)!;
  doc.setFillColor(...BRAND);
  doc.circle(px(last.minute), py(last.total), 2.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  doc.text(`${last.total} messages`, px(last.minute) - 4, py(last.total) - 6, { align: "right" });
  // surprise markers
  doc.setLineDashPattern([2.5, 2.5], 0);
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.5);
  a.markers.forEach((m, i) => {
    const mx = px(Math.min(m.minute, maxX));
    doc.line(mx, cy0 + P.t - 4, mx, cy0 + chartH - P.b);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...INK);
    doc.text(m.label, mx + 2, cy0 + P.t - 6 + (i % 2) * 8);
  });
  doc.setLineDashPattern([], 0);

  // donut
  const dcx = M + innerW - 70;
  const dcy = cy0 + 80;
  const dr = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Hidden information", dcx, cy0 + 4, { align: "center" });
  doc.setDrawColor(...TRACK);
  doc.setLineWidth(11);
  doc.circle(dcx, dcy, dr, "S");
  const share = a.intel.total ? a.intel.found / a.intel.total : 0;
  if (share > 0) {
    doc.setDrawColor(...BRAND);
    doc.setLineCap("round");
    const steps = Math.max(2, Math.round(share * 240));
    for (let i = 0; i < steps; i++) {
      const a0 = -Math.PI / 2 + (i / steps) * share * 2 * Math.PI;
      const a1 = -Math.PI / 2 + ((i + 1) / steps) * share * 2 * Math.PI;
      doc.line(dcx + dr * Math.cos(a0), dcy + dr * Math.sin(a0), dcx + dr * Math.cos(a1), dcy + dr * Math.sin(a1));
    }
  }
  doc.setLineCap("butt");
  doc.setLineWidth(0.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(`${a.intel.found}/${a.intel.total}`, dcx, dcy + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("found", dcx, dcy + 15, { align: "center" });
  doc.text(`Found ${a.intel.found}   Missed ${a.intel.total - a.intel.found}`, dcx, dcy + dr + 20, { align: "center" });

  y = cy0 + chartH + 18;

  // Who you talked to
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Who you talked to", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Direct messages, #client replies and @mentions per teammate", M, y + 11);
  y += 22;
  const maxCount = Math.max(1, ...a.people.map((p) => p.count));
  const barX = M + 170;
  const barW = innerW - 170 - 30;
  for (const p of a.people) {
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(clean(p.name), M, y);
    doc.setFillColor(...TRACK);
    doc.rect(barX, y - 7, barW, 7, "F");
    if (p.count > 0) {
      doc.setFillColor(...BRAND);
      doc.rect(barX, y - 7, (barW * p.count) / maxCount, 7, "F");
    }
    doc.setFont("helvetica", p.count ? "bold" : "normal");
    doc.setTextColor(...(p.count ? INK : MUTED));
    doc.text(String(p.count), barX + barW + 22, y, { align: "right" });
  }
  y += 10;

  // Code Shift: passing tests per run
  if (a.testRuns.length > 0) {
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("Hidden tests per run (run in the browser by the app)", M, y);
    const tH = 90;
    const tY = y + 10;
    const total = Math.max(...a.testRuns.map((t) => t.total));
    const tx = (i: number) =>
      a.testRuns.length === 1 ? M + innerW / 2 : M + 30 + (i / (a.testRuns.length - 1)) * (innerW - 60);
    const ty = (v: number) => tY + tH - 16 - (v / total) * (tH - 30);
    doc.setDrawColor(...TRACK);
    doc.setLineWidth(0.5);
    doc.line(M + 20, ty(0), M + innerW - 10, ty(0));
    doc.line(M + 20, ty(total), M + innerW - 10, ty(total));
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1.6);
    for (let i = 1; i < a.testRuns.length; i++) {
      doc.line(tx(i - 1), ty(a.testRuns[i - 1].passed), tx(i), ty(a.testRuns[i].passed));
    }
    a.testRuns.forEach((t, i) => {
      doc.setFillColor(...(t.passed === t.total ? BRAND : ([255, 255, 255] as RGB)));
      doc.setDrawColor(...BRAND);
      doc.setLineWidth(1.2);
      doc.circle(tx(i), ty(t.passed), 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK);
      doc.text(`${t.passed}/${t.total}`, tx(i), ty(t.passed) - 7, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`Run ${t.run}`, tx(i), tY + tH - 2, { align: "center" });
    });
    y = tY + tH;
  }
  return y;
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

  // ---- Conduct concern ----
  if (r.conduct && !r.conduct.respectful) {
    const lines = r.conduct.incidents.flatMap((i) => doc.splitTextToSize(`“${clean(i.quote)}” ${clean(i.why)}`, W - 2 * M - 24));
    const boxH = 34 + lines.length * 11;
    ensure(boxH + 10);
    y += 8;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.setLineWidth(0.8);
    doc.roundedRect(M, y, W - 2 * M, boxH, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...RED);
    doc.text("Conduct concern: abusive or disrespectful messages. People skills capped at 2/10.", M + 12, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(lines, M + 12, y + 30);
    y += boxH;
  }

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

  // ---- Shift analytics (charts) ----
  heading("Shift analytics", 420);
  y = drawAnalytics(doc, session, y + 10);

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

  // ---- Review conversation ----
  if (r.review) {
    heading(`Review conversation: explains own work ${r.review.score}/10`, 110);
    if (r.review.summary) {
      const sum = doc.splitTextToSize(clean(r.review.summary), W - 2 * M);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(sum, M, y);
      y += (sum.length - 1) * 11;
    }
    autoTable(doc, {
      startY: y + 8,
      margin: { left: M, right: M },
      head: [["Manager's question", "Your answer", "Verdict"]],
      body: r.review.items.map((item, i) => [
        clean(item.question),
        session.reviewQA?.[i]?.answer ? `“${clean(session.reviewQA[i].answer)}”` : "Skipped",
        `${item.verdict}\n${clean(item.comment)}`,
      ]),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: INK, valign: "top" },
      headStyles: { fillColor: [241, 245, 249], textColor: MUTED, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 170 }, 1: { cellWidth: 170, fontStyle: "italic" } },
    });
    y = lastY();
  }

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
  if ((session.files ?? []).length) {
    bullets(
      "Attached files",
      (session.files ?? []).map((f) => `${f.name} (${Math.round(f.size / 1024)} KB, ${f.kind === "other" ? "not readable by the reviewer" : f.kind === "text" ? "read by the reviewer" : "viewed by the AI"})`),
    );
  }
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
