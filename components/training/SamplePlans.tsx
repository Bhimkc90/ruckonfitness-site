"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { WEEKDAYS, weekdayLabels } from "@/lib/training/engine";
import type { PlanSession } from "@/lib/training/types";
import type { SamplePlan } from "@/lib/training/samples";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink, segmentClass, segmentGroupClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/StatusBadge";
import { FocusCard, NotesCard, SessionBody } from "./PlanPreview";

const byWeekday = (a: PlanSession, b: PlanSession) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday);
const weekOne = (sample: SamplePlan) => sample.plan.sessions.filter((s) => s.week === 1).sort(byWeekday);

function PreviewLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">
      <FlaskConical className="h-3 w-3" aria-hidden />
      Preview example · review pending
    </span>
  );
}

// Shown while the training-plan release flag is off: sample plans built from synthetic AFT results.
export default function SamplePlans({ samples }: { samples: SamplePlan[] }) {
  const [selectedId, setSelectedId] = useState(samples[0].id);
  const sample = samples.find((s) => s.id === selectedId) ?? samples[0];
  const sessions = weekOne(sample);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training plans"
        description="Preview examples of the four-week starter plans RuckOn builds from an AFT result. They use made-up results, not yours."
      />

      <Card className="border-accent/40">
        <div className="flex flex-wrap items-center gap-2">
          <PreviewLabel />
        </div>
        <p className="mt-3 text-sm text-ink">
          The rules that turn an AFT result into a plan are waiting for review by a qualified professional. Until that review is
          complete, these samples show how the plans work. They have <span className="font-semibold">not</span> been reviewed and
          are not a prescription for you.
        </p>
        <h2 className="mt-4 text-sm font-semibold text-ink">Not available yet</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>Plans built from your own saved AFT results and preferences.</li>
          <li>Starting a plan, rescheduling sessions, logging completed workouts, and tracking progress on the dashboard.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/workouts">Open the workout library</ButtonLink>
          <ButtonLink href="/aft-calculator" variant="secondary">
            Score an AFT
          </ButtonLink>
        </div>
      </Card>

      <div role="group" aria-label="Sample profile" className={`${segmentGroupClass} sm:inline-flex`}>
        {samples.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === sample.id}
            onClick={() => setSelectedId(s.id)}
            className={segmentClass(s.id === sample.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <FocusCard plan={sample.plan} sample />
        <Card title="Sample preferences" description={sample.profile}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {sample.preferences.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-2">
            A real plan asks for each of these. Equipment, a place to run, experience, and recent running must be answered because
            an AFT score can&apos;t show them.
          </p>
        </Card>
      </div>

      <Card
        title="Week 1 sample sessions"
        description="Weeks 1–2 use these foundation prescriptions; weeks 3–4 add a little volume only if earlier sessions went well and no pain was reported."
        action={<PreviewLabel />}
      >
        <ul className="space-y-3">
          {sessions.map((session, index) => (
            <li key={session.id} className="rounded-lg border border-line bg-surface p-3">
              <details open={index === 0}>
                <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-ink">
                    {weekdayLabels[session.weekday]} · {session.title}
                  </span>
                  <Chip>about {session.estimatedMinutes} min</Chip>
                </summary>
                <div className="mt-3">
                  <SessionBody session={session} useBuild={false} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="How the samples differ" description="Same engine, different results and preferences. Week 1 of each sample:">
        <div className="grid gap-4 md:grid-cols-3">
          {samples.map((s) => (
            <div key={s.id} className="rounded-lg border border-line p-3">
              <p className="text-sm font-semibold text-ink">{s.label}</p>
              <ol className="mt-2 space-y-1 text-sm text-ink-2">
                {weekOne(s).map((session) => (
                  <li key={session.id}>
                    <span className="text-ink">{weekdayLabels[session.weekday]}:</span> {session.title}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>

      <NotesCard plan={sample.plan} />
    </div>
  );
}
