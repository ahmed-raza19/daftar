import { errorResponse, generateJson } from "@/lib/ai";
import { channelInfo, personaById } from "@/lib/org";
import {
  CHAT_SCHEMA,
  CHAT_SYSTEM,
  chatPrompt,
  type ChatTurnInput,
  type ChatTurnOutput,
  type ChatTurnResult,
  type RevealedFact,
} from "@/lib/prompts/chat";

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ChatTurnInput;
    const { scenario, channel, event } = input;
    const info = channelInfo(scenario, channel);
    if (!info) {
      return Response.json({ error: "Unknown channel", code: "BAD_REQUEST" }, { status: 400 });
    }

    const { data } = await generateJson<ChatTurnOutput>({
      system: CHAT_SYSTEM,
      prompt: chatPrompt(input),
      schema: CHAT_SCHEMA,
      effort: "low",
    });

    // Enforce the org rules in code, whatever the model returned:
    // only channel members may speak, a DM gets exactly one reply,
    // an event makes only its persona speak, and at most 2 people reply.
    const allowed = event ? [event.personaId] : info.members;
    let replies = (data.replies ?? []).filter((r) => allowed.includes(r.personaId) && r.text?.trim());
    if (info.kind === "dm" || event) replies = replies.slice(0, 1);
    replies = replies.slice(0, 2);

    // A fact only counts as revealed if (a) the speaker actually holds it and
    // (b) the quote the model gives really appears in what the speaker said.
    const revealed: RevealedFact[] = [];
    for (const r of replies) {
      const own = new Set(personaById(scenario, r.personaId)?.privateFacts.map((f) => f.id) ?? []);
      const said = normalize(r.text);
      for (const v of r.revealed ?? []) {
        const quote = normalize(v.quote ?? "");
        if (own.has(v.factId) && quote.length >= 12 && said.includes(quote)) {
          revealed.push({ factId: v.factId, personaId: r.personaId, quote: v.quote.trim() });
        }
      }
    }

    const result: ChatTurnResult = {
      replies: replies.map((r) => ({ personaId: r.personaId, text: r.text.trim() })),
      revealed,
    };
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[“”"'‘’`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:!?-]+|[\s.,;:!?-]+$/g, "")
    .trim();
}
