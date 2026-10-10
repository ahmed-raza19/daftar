"use client";

// Shared header for the marketing pages: a slim announcement bar and the main nav.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";

export const REPO = "https://github.com/ahmed-raza19/daftar";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-employers", label: "For employers" },
  { href: "/evaluation", label: "Evaluation" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30">
      <div className="bg-ink text-center text-xs text-slate-300">
        <Link href="/#start" className="inline-flex items-center gap-2 px-4 py-2 hover:text-white">
          <span className="rounded-full bg-clip px-1.5 py-px text-[10px] font-bold text-ink">New</span>
          Code Shift: write Python with an AI team while hidden tests run in your browser
          <span aria-hidden className="text-clip">→</span>
        </Link>
      </div>
      <div className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Daftar home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-1.5 transition ${
                  path === n.href ? "bg-brand-50 font-medium text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <a href={REPO} target="_blank" rel="noreferrer" className="hidden text-sm text-slate-600 hover:text-ink sm:inline">
              GitHub
            </a>
            <Link
              href="/#start"
              className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Start a shift
            </Link>
          </div>
        </div>
        {/* Phones: page links under the bar */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 text-sm md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 ${path === n.href ? "bg-brand-50 text-brand-800" : "text-slate-600"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
