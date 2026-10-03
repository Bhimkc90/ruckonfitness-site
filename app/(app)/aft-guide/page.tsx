import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, Link2, Ruler } from "lucide-react";
import { aftEvents, aftGuideHref } from "@/lib/aft/events";
import { GUIDE_VERIFIED_ON } from "@/lib/aft/guideSources";
import { sequence, standards, testOverview } from "@/lib/aft/fieldSetup";
import { drillHref } from "@/lib/library";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { CitedList, EndorsementNote, GuideSection, GuideSourceList, Ref } from "@/components/aft-guide/GuideBits";
import { FieldOverviewDiagram } from "@/components/aft-guide/Diagrams";
import EventGuide, { EventSectionNav } from "@/components/aft-guide/EventGuide";
import EventSelector from "@/components/aft-guide/EventSelector";

export const metadata: Metadata = {
  title: "AFT Guide",
  description: "Event-by-event Army Fitness Test standards, grading rules, and field setup from ATP 7-22.01 (March 2026).",
};

export default function AftGuidePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="AFT Guide"
        description="How each Army Fitness Test event is set up, performed, and graded, based on ATP 7-22.01 (12 March 2026) with page references."
        actions={
          <>
            <ButtonLink href="/aft-calculator">Record AFT</ButtonLink>
            <ButtonLink href="/workouts" variant="secondary">
              Exercise library
            </ButtonLink>
          </>
        }
      />

      <section aria-labelledby="events-heading" className="space-y-3">
        <h2 id="events-heading" className="text-lg font-bold text-ink">
          Choose an event
        </h2>
        <EventSelector
          events={aftEvents.map((e) => ({ slug: e.slug, order: e.order ?? 0, name: e.name, shortName: e.shortName, scoreLabel: e.rawScoreLabel }))}
          panels={aftEvents.map((event) => (
            <div key={event.slug} className="space-y-5">
              <header className="rounded-xl border-2 border-ink bg-surface p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">Event {event.order} of 5</p>
                <h2 id={`event-${event.slug}-title`} tabIndex={-1} className="mt-1 scroll-mt-32 text-2xl font-bold tracking-tight text-ink lg:scroll-mt-6">
                  {event.name}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-ink-2">{event.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ButtonLink href="/aft-calculator">Score it in the calculator</ButtonLink>
                  <Link href={aftGuideHref(event.slug)} className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                    <Link2 className="h-4 w-4" aria-hidden />
                    Direct link to this event
                  </Link>
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <EventSectionNav idPrefix={`${event.slug}-`} />
                </div>
              </header>
              <EventGuide event={event} idPrefix={`${event.slug}-`} level={3} />
            </div>
          ))}
        />
      </section>

      <section
        aria-labelledby="field-setup-heading"
        className="grid gap-5 rounded-xl border border-card-line bg-surface p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center"
      >
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-ink">
            <Ruler className="h-3.5 w-3.5" aria-hidden />
            For OICs, NCOICs, and graders
          </p>
          <h2 id="field-setup-heading" className="mt-1 text-lg font-semibold text-ink">
            Field setup
          </h2>
          <p className="mt-2 text-sm text-ink-2">
            Equipment checklist and specifications, lane and field dimensions, the SDC lane and sequence, 2-mile course
            requirements, timing and rest rules, grader roles, safety, and setup and close-out checklists.
          </p>
          <ButtonLink href="/aft-guide/field-setup" className="mt-4">
            Open field setup
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
        <FieldOverviewDiagram />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <GuideSection title="About the test">
          <CitedList items={testOverview} />
        </GuideSection>
        <GuideSection title="Standards">
          <CitedList items={standards} />
          <p className="mt-4 text-sm">
            <Link href="/aft-calculator" className="font-medium text-accent-ink hover:underline">
              Score a test in the calculator
            </Link>
          </p>
        </GuideSection>
      </div>

      <GuideSection title="Test day at a glance">
        <ol className="space-y-2">
          {sequence.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-ink-2">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <Ref>ATP 7-22.01 (12 Mar 2026), paras 2-26 – 2-40, 2-75, pp. 22–25, 36</Ref>
        <p className="mt-3 text-sm text-ink-2">
          Practice the{" "}
          <Link href={drillHref("preparation-drill")} className="text-accent-ink hover:underline">
            Preparation Drill
          </Link>{" "}
          and{" "}
          <Link href={drillHref("recovery-drill")} className="text-accent-ink hover:underline">
            Recovery Drill
          </Link>{" "}
          in the exercise library.
        </p>
      </GuideSection>

      <GuideSection title="Sources and currency">
        <p className="text-ink-2">
          Checked on {GUIDE_VERIFIED_ON}. ATP 7-22.01 (12 March 2026) supersedes the October 2020 edition. Army Directive
          2026-07 supersedes Army Directive 2025-06 in part. The June 2025 score tables were still listed as current on
          army.mil/aft.
        </p>
        <div className="mt-3">
          <GuideSourceList ids={["atp72201", "ad202607", "scoringScales", "armyAftSite"]} />
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-2">
          <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Alternate aerobic events for Soldiers on permanent profiles are not covered in this guide.
        </p>
        <div className="mt-3">
          <EndorsementNote />
        </div>
      </GuideSection>
    </div>
  );
}
