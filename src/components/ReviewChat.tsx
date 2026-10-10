"use client";

// Post-submission review: the manager asks 3 questions about the work the
// graduate just submitted, one at a time. Answers go into the final review.

import { useEffect, useRef, useState } from "react";
import { manager } from "@/lib/org";
import type { ReviewQA, Session } from "@/lib/types";
import Avatar from "./Avatar";
import { Logo } from "./Logo";

interface Props {
  session: Session;
  questions: string[];
  onDone: (qa: ReviewQA[]) => void;
}

export default function ReviewChat({ session, questions, onDone }: Props) {
  const s = session.scenario;
  const mgr = manager(s);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const current = answers.length;
  const finished = current >= questions.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    if (!finished) inputRef.current?.focus();
  }, [current, finished]);

  function answer(text: string) {
    const next = [...answers, text.trim()];
    setAnswers(next);
    setDraft("");
    if (next.length >= questions.length) {
      setTimeout(() => onDone(questions.map((q, i) => ({ question: q, answer: next[i] ?? "" }))), 900);
    }
  }

  return (
    <main className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Logo />
          <span className="ml-auto text-sm text-slate-500">
            Question {Math.min(current + 1, questions.length)} of {questions.length}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            {mgr && <Avatar scenario={s} id={mgr.id} size={40} />}
            <div>
              <h1 className="font-display text-xl font-bold text-ink">Quick review with {mgr?.name ?? "your manager"}</h1>
              <p className="text-sm text-slate-500">
                {mgr?.title}. Three questions about the work you just submitted. Answer in your own words; this is part of your
                review.
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-6 space-y-4">
          {questions.slice(0, current + 1).map((q, i) => (
            <li key={i} className="space-y-3">
              <div className="msg-in flex gap-3">
                {mgr && <Avatar scenario={s} id={mgr.id} size={32} />}
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink">
                  {q}
                </div>
              </div>
              {answers[i] !== undefined && (
                <div className="msg-in flex justify-end">
                  <div
                    className={`max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed ${
                      answers[i] ? "bg-brand-700 text-white" : "border border-dashed border-slate-300 text-slate-500"
                    }`}
                  >
                    {answers[i] || "Skipped"}
                  </div>
                </div>
              )}
            </li>
          ))}
          {finished && (
            <li className="msg-in flex gap-3">
              {mgr && <Avatar scenario={s} id={mgr.id} size={32} />}
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink">
                Thanks, that&apos;s all. Putting your review together now.
              </div>
            </li>
          )}
        </ul>
        <div ref={bottomRef} />
      </div>

      {!finished && (
        <div className="sticky bottom-0 border-t border-slate-200 bg-white">
          <form
            className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) answer(draft);
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (draft.trim()) answer(draft);
                }
              }}
              rows={3}
              placeholder="Type your answer. Enter to send, Shift+Enter for a new line."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:bg-slate-300"
              >
                Send answer
              </button>
              <button type="button" onClick={() => answer("")} className="text-sm text-slate-500 hover:text-ink">
                Skip this question
              </button>
              <span className="ml-auto text-xs text-slate-400">Skipped questions count against &quot;Explains own work&quot;.</span>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
