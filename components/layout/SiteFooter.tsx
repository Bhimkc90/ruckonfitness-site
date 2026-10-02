import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { guideSources } from "@/lib/aft/guideSources";
import { sources as librarySources } from "@/lib/library";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import BrandLink from "./BrandLink";
import SiteCredit from "./SiteCredit";

// The one footer for Home and every app page. It sits inside whatever column it is placed in (beside the
// sidebar on app pages) and centers its content to the shared page width. Detailed citations stay on the
// guide pages; this lists the main publications only.

const explore = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/aft-calculator", label: "AFT calculator" },
  { href: "/aft-guide", label: "AFT Guide" },
  { href: "/workouts", label: "Exercise Library" },
  { href: "/training-plan", label: "Training Plans", badge: TRAINING_PLANS_ENABLED ? undefined : "Preview" },
];

const officialSources = [
  { href: aftScoringFile.path, label: "AFT score tables (June 2025)" },
  { href: guideSources.atp72201.url, label: `${guideSources.atp72201.number}, AFT testing` },
  { href: librarySources["atp-7-22-02-c1"].url, label: `${librarySources["atp-7-22-02-c1"].number}, H2F drills` },
  { href: guideSources.armyAftSite.url, label: "army.mil/aft" },
];

const help = [
  { href: "/settings#help", label: "Help" },
  { href: "/settings#data", label: "Your data and backups" },
  { href: "/settings#privacy", label: "Privacy" },
];

const linkClass = "rounded text-ink-2 underline-offset-4 hover:text-ink hover:underline";
const headingClass = "text-xs font-bold uppercase tracking-wider text-ink";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface text-sm">
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 text-center md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:gap-8 md:text-left">
          <section aria-label="RuckOn Fitness" className="flex flex-col items-center gap-3 md:items-start">
            <BrandLink tone="light" className="h-11 w-auto" />
            <p className="max-w-xs text-ink-2">AFT assessment, progress tracking, and military exercise guidance.</p>
          </section>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className={headingClass}>
              Explore
            </h2>
            <ul className="mt-3 space-y-2">
              {explore.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                  {item.badge && (
                    <span className="ml-2 rounded bg-accent/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">{item.badge}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-info">
            <h2 id="footer-info" className={headingClass}>
              Information
            </h2>
            <div className="mt-3 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold text-ink">Official sources</h3>
                <ul className="mt-2 space-y-2">
                  {officialSources.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                        {item.label}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-ink">Your data</h3>
                <p className="mt-2 text-ink-2">Stored only in this browser. No account, and nothing syncs between devices.</p>
                <ul className="mt-2 space-y-2">
                  {help.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className={linkClass}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 space-y-1.5 border-t border-line pt-6 text-center">
          <SiteCredit />
          <p className="text-xs text-ink-2">RuckOn Fitness is an unofficial tool and is not endorsed by the U.S. Army.</p>
        </div>
      </div>
    </footer>
  );
}
