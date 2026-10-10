import Link from "next/link";
import { Logo } from "../Logo";

const REPO = "https://github.com/ahmed-raza19/firstshift";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-ink text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo dark />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            Your first day at the office, before you&apos;re hired. A multi-agent workplace simulation for fresh graduates.
            Companies and people are fictional; the review is practice feedback, not a hiring decision.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#start" className="hover:text-white">Start a shift</Link></li>
            <li><Link href="/how-it-works" className="hover:text-white">How it works</Link></li>
            <li><Link href="/for-employers" className="hover:text-white">For employers</Link></li>
            <li><Link href="/evaluation" className="hover:text-white">How we measured the grader</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Project</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={REPO} target="_blank" rel="noreferrer" className="hover:text-white">Source code on GitHub</a></li>
            <li><a href={`${REPO}#disclosure`} target="_blank" rel="noreferrer" className="hover:text-white">Tools and disclosures</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
          Built by team nexora at AICON&apos;26 Build With AI (EdTech &amp; Workforce), NUST Islamabad.
        </p>
      </div>
    </footer>
  );
}
