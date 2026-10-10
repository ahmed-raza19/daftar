export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 font-display text-base font-bold text-white">
        D<span className="text-clip">.</span>
      </div>
      <span className={`font-display text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-ink"}`}>Daftar</span>
    </div>
  );
}
