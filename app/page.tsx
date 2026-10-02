import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Dumbbell, LineChart, Target, UserRound } from "lucide-react";
import { scoreAft, aftEventInfo } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { columnLabel, formatRaw } from "@/lib/aft/format";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import type { AftInput } from "@/lib/aft/types";
import { ButtonLink } from "@/components/ui/Button";
import { PassFailBadge } from "@/components/ui/StatusBadge";
import PublicHeader from "@/components/home/PublicHeader";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: { absolute: "RuckOn Fitness: Army Fitness Test calculator, progress, and exercise guides" },
  description:
    "Score your Army Fitness Test with the official June 2025 tables, track your saved results, and learn the events and drills from the Army's own manuals.",
};

// Made-up entries for the product preview, scored with the real tables so the numbers are accurate.
const EXAMPLE_INPUT: AftInput = {
  age: 24,
  standard: "general",
  gender: "M",
  raw: { MDL: 260, HRP: 38, SDC: 118, PLK: 185, "2MR": 960 },
};

const features = [
  {
    icon: ClipboardCheck,
    title: "Assess your performance",
    text: "Enter your five raw results to get event points, your total out of 500, and pass or fail under the general or combat standard, using the official score tables effective 1 June 2025.",
    links: [{ href: "/aft-calculator", label: "Record an AFT" }],
  },
  {
    icon: LineChart,
    title: "Track your progress",
    text: "Saved tests build a dashboard and history: your latest total, change since your last comparable test, strongest and weakest events, and trends for each event in points or raw results.",
    links: [{ href: "/dashboard", label: "Open the dashboard" }],
  },
  {
    icon: BookOpen,
    title: "Learn proper technique",
    text: "Event guides follow ATP 7-22.01 with its official photos, and the exercise library covers the H2F drills from ATP 7-22.02 with step-by-step instructions and page references.",
    links: [
      { href: "/aft-guide", label: "AFT Guide" },
      { href: "/workouts", label: "Exercise Library" },
    ],
  },
];

const steps = [
  { icon: UserRound, title: "Set up your profile", text: "Optional. Your date of birth and standard fill in the calculator for you.", href: "/profile", action: "Set up profile" },
  { icon: Target, title: "Record an AFT", text: "Enter your raw results, calculate your score, and save it if you want to track it.", href: "/aft-calculator", action: "Record AFT" },
  { icon: LineChart, title: "Review your progress", text: "See your latest score, changes over time, and which events need the most work.", href: "/dashboard", action: "View dashboard" },
];

export default function HomePage() {
  const example = scoreAft(EXAMPLE_INPUT);
  const rule = aftStandardRules[example.standard];

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <PublicHeader />

      <main className="readable flex-1">
        {/* Hero and product preview */}
        <section className="mx-auto grid max-w-content gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:px-8 lg:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Army Fitness Test companion</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink sm:text-5xl">Know your score. Build your readiness.</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">
              RuckOn Fitness scores your AFT with the official tables, keeps your results so you can see how you&apos;re
              trending, and teaches each event and military exercise from the Army&apos;s own manuals.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/aft-calculator" className="px-5 py-3 text-base">
                Calculate my AFT
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/workouts" variant="secondary" className="px-5 py-3 text-base">
                Explore exercises
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-2">Free, no account. Results stay in your browser.</p>
          </div>

          <figure aria-labelledby="preview-caption" className="rounded-2xl border-2 border-ink bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">Result preview</p>
              <span className="rounded-full border border-warn bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-ink">Example data</span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
              <p className="flex items-baseline gap-1 tabular-nums">
                <span className="text-5xl font-bold tracking-tight">{example.total}</span>
                <span className="text-ink-2">/ 500</span>
              </p>
              <div className="pb-1.5">
                <PassFailBadge passed={example.passed} size="lg" />
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-2">
              {rule.label} standard · {columnLabel(example.column)} table · age group {example.ageGroup}
            </p>
            <ul className="mt-4 space-y-2.5">
              {example.events.map((item) => (
                <li key={item.event}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{aftEventInfo[item.event].name}</span>
                    <span className="tabular-nums text-ink-2">
                      {formatRaw(item.event, item.raw)} · <span className="font-semibold text-ink">{item.points}</span>
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line" aria-hidden>
                    <div className={`h-full rounded-full ${item.points >= rule.minEventPoints ? "bg-good" : "bg-bad"}`} style={{ width: `${item.points}%` }} />
                    <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${rule.minEventPoints}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <figcaption id="preview-caption" className="mt-4 text-xs text-ink-2">
              Made-up results for illustration, scored with the official June 2025 tables. Not a real Soldier&apos;s
              test.
            </figcaption>
          </figure>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
            <h2 id="features-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              What you can do
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, text, links }) => (
                <article key={title} className="flex flex-col rounded-xl border border-card-line bg-canvas p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-black">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{text}</p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                    {links.map((link) => (
                      <Link key={link.href} href={link.href} className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:decoration-ink">
                        {link.label}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Getting started */}
        <section aria-labelledby="start-heading" className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
          <h2 id="start-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Getting started
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text, href, action }, index) => (
              <li key={title} className="relative rounded-xl border border-card-line bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-canvas" aria-hidden>
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-ink-2" aria-hidden />
                </div>
                <h3 className="mt-3 text-lg font-bold">
                  <span className="sr-only">Step {index + 1}: </span>
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p>
                <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:decoration-ink">
                  {action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Training plans */}
        <section aria-labelledby="plans-heading" className="mx-auto max-w-content px-4 pb-14 sm:px-6 lg:px-8">
          <div className="grid gap-5 rounded-2xl border border-card-line bg-surface p-6 shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-accent">
              <Dumbbell className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 id="plans-heading" className="flex flex-wrap items-center gap-2 text-xl font-bold">
                Training plans
                {!TRAINING_PLANS_ENABLED && <span className="rounded bg-accent/25 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink">Preview</span>}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                {TRAINING_PLANS_ENABLED
                  ? "Build a four-week starter plan from a saved AFT result, using exercises from the library, and log the sessions you complete."
                  : "Personalized plans built from your AFT results are not available yet: they are waiting for review by a qualified professional. You can look through example plans now to see how they will work."}
              </p>
            </div>
            <ButtonLink href="/training-plan" variant="secondary">
              {TRAINING_PLANS_ENABLED ? "Open training plans" : "See example plans"}
            </ButtonLink>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
