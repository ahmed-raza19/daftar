"use client";

// The Slack-like workspace where the graduate works with their AI team.
// Flow for each message the graduate sends:
//   1. Director agent (/api/chat) decides who replies and writes the replies.
//   2. Code checks hierarchy rules (skip-level contact -> manager reacts).
//   3. Code fires scripted curveballs once enough messages have been sent.

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiCallError, postJson } from "@/lib/api";
import {
  availabilityLabel,
  channelInfo,
  channels,
  isSkipLevel,
  levelLabel,
  manager,
  personaById,
  replyDelayMs,
} from "@/lib/org";
import { downloadFile, fileStem, firstName, newId, sessionTranscript } from "@/lib/session";
import type { ChatTurnResult } from "@/lib/prompts/chat";
import type { ChannelId, ChatMessage, Session } from "@/lib/types";
import { YOU } from "@/lib/types";
import AttachmentView from "./AttachmentView";
import Avatar from "./Avatar";
import OrgChart from "./OrgChart";
import { Logo } from "./Setup";

interface Props {
  session: Session;
  update: (fn: (s: Session) => Session) => void;
  onSubmit: (s: Session) => void;
  onRestart: () => void;
  submitError: string | null;
}

type Tab = "task" | "org" | "intel" | "submit";
type Pane = "channels" | "chat" | "side";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

export default function Workspace({ session, update, onSubmit, onRestart, submitError }: Props) {
  const s = session.scenario;
  const youName = firstName(session.profile.name);
  const allChannels = useMemo(() => channels(s), [s]);
  const totalFacts = s.personas.reduce((n, p) => n + p.privateFacts.length, 0);

  const [active, setActive] = useState<ChannelId>("team");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<{ personaId: string; channel: ChannelId } | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  // A brand-new shift starts with unread kickoff messages; a resumed shift starts all read.
  const [lastSeen, setLastSeen] = useState<Record<string, number>>(() => {
    if (!session.messages.some((m) => m.from === YOU)) return {};
    const seen: Record<string, number> = {};
    for (const m of session.messages) if (m.from !== YOU) seen[m.channel] = (seen[m.channel] ?? 0) + 1;
    return seen;
  });
  const [tab, setTab] = useState<Tab>("task");
  const [pane, setPane] = useState<Pane>("chat");
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Live copies of the conversation state, updated synchronously so queued
  // turns always see the latest messages (React state updates are async).
  const liveMsgs = useRef(session.messages);
  const liveRevealed = useRef(session.revealedFactIds);
  const liveFired = useRef(session.firedCurveballIds);
  const skipNoticed = useRef(session.orgEvents.some((e) => e.type === "skip_level"));
  const queue = useRef<{ channel: ChannelId; skipLevel: boolean }[]>([]);
  const processing = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const channelMessages = session.messages.filter((m) => m.channel === active);
  const incomingCount = (ch: ChannelId) =>
    session.messages.filter((m) => m.channel === ch && m.from !== YOU).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [channelMessages.length, active, typing]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function openChannel(id: ChannelId) {
    // Everything in the channel we leave and the one we open counts as read.
    setLastSeen((prev) => ({ ...prev, [active]: incomingCount(active), [id]: incomingCount(id) }));
    setActive(id);
    setPane("chat");
    setChatError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ---- The conversation engine -------------------------------------------
  // Messages are queued, so the graduate can keep writing in any channel
  // while teammates are still replying elsewhere. Turns run one at a time.

  function append(m: ChatMessage) {
    liveMsgs.current = [...liveMsgs.current, m];
    update((x) => ({ ...x, messages: [...x.messages, m] }));
  }

  async function speak(ch: ChannelId, personaId: string, text: string, kind: ChatMessage["kind"] = "normal") {
    setTyping({ personaId, channel: ch });
    await sleep(replyDelayMs(personaById(s, personaId), text));
    append({ id: newId(), channel: ch, from: personaId, text, at: Date.now(), kind });
    setTyping(null);
  }

  async function turn(ch: ChannelId, event?: { personaId: string; description: string }) {
    const res = await postJson<ChatTurnResult>("/api/chat", {
      scenario: s,
      profile: session.profile,
      messages: liveMsgs.current,
      channel: ch,
      revealedFactIds: liveRevealed.current,
      event,
    });
    for (const r of res.replies) await speak(ch, r.personaId, r.text, event ? "orgEvent" : "normal");

    const fresh = res.revealed.filter((v) => !liveRevealed.current.includes(v.factId));
    if (fresh.length > 0) {
      liveRevealed.current = union(liveRevealed.current, fresh.map((v) => v.factId));
      const quotes = Object.fromEntries(fresh.map((v) => [v.factId, v.quote]));
      update((x) => ({
        ...x,
        revealedFactIds: union(x.revealedFactIds, Object.keys(quotes)),
        factQuotes: { ...x.factQuotes, ...quotes },
      }));
      const who = personaById(s, fresh[0].personaId)?.name ?? "A teammate";
      setToast(`New intel from ${who} · ${liveRevealed.current.length}/${totalFacts} discovered`);
    }
  }

  async function flow(channel: ChannelId, skipLevel: boolean) {
    // 1. Replies from the people in this channel
    await turn(channel);

    // 2. Hierarchy rule: contacting someone above your manager is noticed
    const mgr = manager(s);
    if (skipLevel && mgr) {
      const target = personaById(s, channel.slice(3));
      const lastText = [...liveMsgs.current].reverse().find((m) => m.from === YOU && m.channel === channel)?.text ?? "";
      update((x) => ({
        ...x,
        orgEvents: [
          ...x.orgEvents,
          { type: "skip_level", at: Date.now(), detail: `Messaged ${target?.name} (${target?.title}) directly: "${lastText}"` },
        ],
      }));
      await sleep(1200);
      await turn(`dm:${mgr.id}`, {
        personaId: mgr.id,
        description: `You (${mgr.name}) just found out that your new hire messaged ${target?.name} (${target?.title}) directly, skipping you: "${lastText}". React as their manager in a short DM. If it was a work question or request that should have come through you, gently ask them to loop you in first. If it was harmless, like a thank-you, keep it light and friendly.`,
      });
    }

    // 3. Scripted curveballs, top-down
    const sent = liveMsgs.current.filter((m) => m.from === YOU).length;
    const due = s.curveballs.filter((c) => c.afterMessages <= sent && !liveFired.current.includes(c.id));
    for (const c of due) {
      liveFired.current = [...liveFired.current, c.id];
      update((x) => ({ ...x, firedCurveballIds: union(x.firedCurveballIds, [c.id]) }));
      await sleep(900);
      await speak(c.channel, c.from, c.text, "curveball");
    }
  }

  async function processQueue() {
    if (processing.current) return;
    processing.current = true;
    setSending(true);
    try {
      while (queue.current.length > 0) {
        const job = queue.current.shift()!;
        try {
          await flow(job.channel, job.skipLevel);
        } catch (e) {
          setTyping(null);
          setChatError(e instanceof ApiCallError ? e.message : "Something went wrong. Try again.");
          queue.current = [];
        }
      }
    } finally {
      processing.current = false;
      setSending(false);
    }
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setChatError(null);
    const channel = active;
    append({ id: newId(), channel, from: YOU, text, at: Date.now() });
    const skipLevel = isSkipLevel(s, channel) && !skipNoticed.current;
    if (skipLevel) skipNoticed.current = true;
    queue.current.push({ channel, skipLevel });
    void processQueue();
  }

  function retry() {
    const last = [...liveMsgs.current].reverse().find((m) => m.from === YOU);
    if (!last) return;
    setChatError(null);
    queue.current.push({ channel: last.channel, skipLevel: false });
    void processQueue();
  }

  function submit() {
    const words = countWords(sessionRef.current.deliverable);
    if (words === 0) {
      setTab("submit");
      setPane("side");
      return;
    }
    if (words < 60 && !window.confirm(`Your deliverable is only ${words} words. Submit anyway?`)) return;
    onSubmit(sessionRef.current);
  }

  // ---- Render -------------------------------------------------------------

  const info = channelInfo(s, active);
  const dmPersona = active.startsWith("dm:") ? personaById(s, active.slice(3)) : undefined;
  const members = info?.kind === "channel" ? info.members : [];
  const elapsed = Math.max(0, Math.floor((now - session.startedAt) / 1000));
  const facts = s.personas.flatMap((p) => p.privateFacts.map((f) => ({ ...f, holder: p })));
  const found = facts.filter((f) => session.revealedFactIds.includes(f.id));

  return (
    <div className="flex h-dvh flex-col bg-white">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-3 py-2 text-white sm:px-4">
        <Logo dark />
        <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-slate-300 md:flex">
          <span className="text-slate-600">/</span>
          <span className="truncate font-medium text-white">{s.company.name}</span>
          <span className="truncate text-slate-400">· {s.graduateTitle} · Day 1</span>
          {session.source === "sample" && (
            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">sample</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="hidden rounded-md bg-slate-800 px-2 py-1 font-mono text-xs tabular-nums text-slate-300 sm:inline">
            {fmtClock(elapsed)}
          </span>
          <HeaderButton onClick={() => downloadFile(`${fileStem(session)}.txt`, sessionTranscript(session))} title="Download the chat transcript">
            Transcript .txt
          </HeaderButton>
          <HeaderButton
            onClick={() => downloadFile(`${fileStem(session)}.json`, JSON.stringify(session, null, 2), "application/json")}
            title="Save this session to reopen later"
            className="hidden sm:inline-flex"
          >
            Save
          </HeaderButton>
          <HeaderButton
            onClick={() => {
              if (window.confirm("Leave this shift? Save it first if you want to keep it.")) onRestart();
            }}
          >
            Exit
          </HeaderButton>
          <button
            type="button"
            onClick={submit}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-500"
          >
            Submit work
          </button>
        </div>
      </header>

      {/* Mobile pane switcher */}
      <nav className="grid grid-cols-3 border-b border-slate-200 text-sm lg:hidden">
        {(["channels", "chat", "side"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPane(p)}
            className={`py-2 font-medium ${pane === p ? "border-b-2 border-teal-700 text-teal-800" : "text-slate-500"}`}
          >
            {p === "channels" ? "Team" : p === "chat" ? "Chat" : "Task"}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className={`${pane === "channels" ? "flex" : "hidden"} scroll-dark w-full shrink-0 flex-col overflow-y-auto bg-slate-800 text-slate-300 lg:flex lg:w-64`}
        >
          <div className="border-b border-slate-700 px-4 py-3">
            <div className="font-semibold text-white">{s.company.name}</div>
            <div className="text-xs text-slate-400">
              {s.company.industry} · {s.company.city}
            </div>
          </div>

          <SidebarSection title="Channels">
            {allChannels
              .filter((c) => c.kind === "channel")
              .map((c) => (
                <SidebarItem
                  key={c.id}
                  active={active === c.id}
                  unread={incomingCount(c.id) - (lastSeen[c.id] ?? 0)}
                  typing={typing?.channel === c.id}
                  onClick={() => openChannel(c.id)}
                >
                  <span className="text-slate-500">#</span> {c.name}
                </SidebarItem>
              ))}
          </SidebarSection>

          <SidebarSection title="Direct messages">
            {s.personas.map((p) => {
              const id = `dm:${p.id}`;
              return (
                <SidebarItem
                  key={p.id}
                  active={active === id}
                  unread={incomingCount(id) - (lastSeen[id] ?? 0)}
                  typing={typing?.channel === id}
                  onClick={() => openChannel(id)}
                >
                  <Avatar scenario={s} id={p.id} size={20} status ring="ring-slate-800" />
                  <span className="min-w-0 flex-1 truncate">
                    {p.name}
                    <span className="ml-1 text-[11px] text-slate-500">{p.isExternal ? "ext." : levelLabel(p).toLowerCase()}</span>
                  </span>
                </SidebarItem>
              );
            })}
          </SidebarSection>

          <div className="mt-auto border-t border-slate-700 p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">Team intel discovered</span>
              <span className="font-mono tabular-nums text-teal-300">
                {found.length}/{totalFacts}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-teal-400 transition-all duration-700"
                style={{ width: `${totalFacts ? (found.length / totalFacts) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              Each teammate knows something you need. Ask the right person.
            </p>
          </div>
        </aside>

        {/* Chat */}
        <section className={`${pane === "chat" ? "flex" : "hidden"} min-w-0 flex-1 flex-col lg:flex`}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5">
            {dmPersona ? (
              <>
                <Avatar scenario={s} id={dmPersona.id} size={32} status />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{dmPersona.name}</div>
                  <div className="truncate text-xs text-slate-500">
                    {dmPersona.title} · {levelLabel(dmPersona)} · {availabilityLabel(dmPersona)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900"># {info?.name}</div>
                  <div className="truncate text-xs text-slate-500">{info?.description}</div>
                </div>
                <div className="ml-auto flex -space-x-1.5">
                  {members.map((id) => (
                    <span key={id} className="rounded-lg ring-2 ring-white" title={personaById(s, id)?.name}>
                      <Avatar scenario={s} id={id} size={24} />
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4">
            {channelMessages.length === 0 && (
              <div className="mx-auto mt-10 max-w-sm text-center text-sm text-slate-500">
                {dmPersona ? (
                  <>
                    This is the start of your conversation with <b className="text-slate-700">{dmPersona.name}</b>,{" "}
                    {dmPersona.title}. Be specific about what you need.
                  </>
                ) : (
                  <>No messages in #{info?.name} yet.</>
                )}
              </div>
            )}
            <ul className="space-y-4">
              {channelMessages.map((m) => (
                <MessageRow key={m.id} m={m} session={session} youName={youName} />
              ))}
            </ul>
            {typing?.channel === active && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <span className="flex gap-0.5">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                </span>
                {personaById(s, typing.personaId)?.name} is typing…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {chatError && (
            <div className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <span className="flex-1">{chatError}</span>
              <button type="button" onClick={retry} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          <div className="border-t border-slate-200 px-4 py-3">
            {members.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {members.map((id) => {
                  const p = personaById(s, id);
                  if (!p) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setDraft((d) => `${d}${d && !d.endsWith(" ") ? " " : ""}@${firstName(p.name)} `);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                    >
                      @{firstName(p.name)}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-1.5 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={dmPersona ? `Message ${dmPersona.name}` : `Message #${info?.name}`}
                className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim()}
                className="rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
              >
                Send
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Enter to send · Shift+Enter for a new line
              {sending && <span className="ml-2 text-teal-700">· teammates are replying…</span>}
            </p>
          </div>
        </section>

        {/* Side panel */}
        <aside
          className={`${pane === "side" ? "flex" : "hidden"} w-full shrink-0 flex-col border-l border-slate-200 bg-slate-50 lg:flex lg:w-[380px]`}
        >
          <div className="grid grid-cols-4 border-b border-slate-200 bg-white text-xs font-medium">
            {(
              [
                ["task", "Task"],
                ["org", "Org chart"],
                ["intel", `Intel ${found.length}/${totalFacts}`],
                ["submit", "Submit"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-1 py-2.5 ${tab === id ? "border-b-2 border-teal-700 text-teal-800" : "text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="scroll-thin flex-1 overflow-y-auto p-4">
            {tab === "task" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">Your task</div>
                  <h2 className="mt-1 font-semibold text-slate-900">{s.task.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.task.brief}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Deliverable</dt>
                      <dd className="text-slate-700">{s.task.deliverable}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Deadline</dt>
                      <dd className="text-slate-700">
                        {s.task.deadline}
                        {session.firedCurveballIds.length > 0 && (
                          <span className="ml-1 text-amber-700">(things changed, check your messages)</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
                {s.attachments.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Files</div>
                    {s.attachments.map((a) => (
                      <AttachmentView key={a.id} a={a} />
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">About the company</div>
                  <p className="mt-1 leading-relaxed text-slate-700">{s.company.about}</p>
                </div>
              </div>
            )}

            {tab === "org" && <OrgChart scenario={s} youName={youName} onOpenDm={(id) => openChannel(`dm:${id}`)} />}

            {tab === "intel" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Important things your teammates told you. Each person holds information that isn&apos;t written anywhere.
                </p>
                {found.map((f) => (
                  <div key={f.id} className="rounded-xl border border-teal-200 bg-white p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                      <Avatar scenario={s} id={f.holder.id} size={18} /> from {f.holder.name}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">
                      {session.factQuotes?.[f.id] ? `“${session.factQuotes[f.id]}”` : f.fact}
                    </p>
                  </div>
                ))}
                {Array.from({ length: totalFacts - found.length }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-400"
                  >
                    <span aria-hidden>🔒</span> Someone on the team knows something important.
                  </div>
                ))}
              </div>
            )}

            {tab === "submit" && (
              <div className="flex h-full flex-col">
                <label htmlFor="deliverable" className="text-sm font-semibold text-slate-900">
                  Your deliverable
                </label>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.task.deliverable}</p>
                <textarea
                  id="deliverable"
                  value={session.deliverable}
                  onChange={(e) => {
                    const v = e.target.value;
                    update((x) => ({ ...x, deliverable: v }));
                  }}
                  placeholder="Write your work here. It's saved automatically."
                  className="mt-3 min-h-64 flex-1 resize-none rounded-xl border border-slate-300 bg-white p-3 text-[15px] leading-relaxed text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{countWords(session.deliverable)} words</span>
                  <span>Aim for 150–300</span>
                </div>
                {submitError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">{submitError}</div>
                )}
                <button
                  type="button"
                  onClick={submit}
                  disabled={sending}
                  className="mt-3 rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
                >
                  Submit and end my shift
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  An AI reviewer reads your whole shift and this deliverable.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {toast && (
        <div className="msg-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          🔎 {toast}
        </div>
      )}
    </div>
  );
}

function MessageRow({ m, session, youName }: { m: ChatMessage; session: Session; youName: string }) {
  const s = session.scenario;
  const isYou = m.from === YOU;
  const p = personaById(s, m.from);
  const name = isYou ? `${session.profile.name}` : p?.name ?? "System";

  const box =
    m.kind === "curveball"
      ? "rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2"
      : m.kind === "orgEvent"
        ? "rounded-lg border-l-4 border-violet-400 bg-violet-50 px-3 py-2"
        : "";

  return (
    <li className="msg-in flex gap-3">
      <Avatar scenario={s} id={m.from} youName={youName} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-slate-900">{name}</span>
          <span className="text-xs text-slate-500">{isYou ? s.graduateTitle : p?.title}</span>
          {p && (
            <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">{levelLabel(p)}</span>
          )}
          <span className="text-[11px] text-slate-400">
            {new Date(m.at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className={`mt-0.5 ${box}`}>
          {m.kind === "curveball" && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">⚡ Update</div>}
          {m.kind === "orgEvent" && (
            <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">👀 Your manager noticed</div>
          )}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">{withMentions(m.text)}</p>
        </div>
      </div>
    </li>
  );
}

function withMentions(text: string) {
  return text.split(/(@[A-Za-z][\w.]*)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded bg-teal-50 px-0.5 font-medium text-teal-800">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 pt-4">
      <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function SidebarItem({
  active,
  unread,
  typing,
  onClick,
  children,
}: {
  active: boolean;
  unread: number;
  typing: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const hasUnread = !active && unread > 0;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
          active ? "bg-teal-700 text-white" : hasUnread ? "font-semibold text-white hover:bg-slate-700" : "hover:bg-slate-700"
        }`}
      >
        {children}
        {typing && !active && <span className="ml-auto text-[11px] italic text-slate-400">typing…</span>}
        {hasUnread && !typing && (
          <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">{unread}</span>
        )}
      </button>
    </li>
  );
}

function HeaderButton({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 ${className}`}
    >
      {children}
    </button>
  );
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
