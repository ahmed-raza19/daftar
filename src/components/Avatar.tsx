import { availability, avatarColor, initials, personaById } from "@/lib/org";
import type { Scenario } from "@/lib/types";
import { YOU } from "@/lib/types";

interface Props {
  scenario: Scenario;
  id: string; // persona id or YOU
  youName?: string;
  size?: number;
  status?: boolean;
  ring?: string; // ring colour class for the status dot border
}

export default function Avatar({ scenario, id, youName = "You", size = 36, status = false, ring = "ring-white" }: Props) {
  const p = personaById(scenario, id);
  const label = id === YOU ? youName : p?.name ?? "?";
  const a = p ? availability(p) : "online";
  const dot = a === "busy" ? "bg-amber-400" : a === "external" ? "bg-sky-400" : "bg-emerald-500";

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex h-full w-full items-center justify-center rounded-lg font-semibold text-white"
        style={{ backgroundColor: avatarColor(scenario, id), fontSize: Math.round(size * 0.38) }}
        aria-hidden
      >
        {initials(label)}
      </span>
      {status && id !== YOU && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ${ring} ${dot}`} />
      )}
    </span>
  );
}
