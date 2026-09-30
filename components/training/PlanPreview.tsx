"use client";

import { Info } from "lucide-react";
import { aftEventInfo } from "@/lib/aft/scoring";
import { formatRaw, formatTestDate } from "@/lib/aft/format";
import { defaultSessionDate, weekdayLabels, SOURCES_FOR_PLAN } from "@/lib/training/engine";
import type { PlanDraft, PlanSession } from "@/lib/training/types";
import { Card } from "@/components/ui/Card";
import { Chip, PassFailBadge } from "@/components/ui/StatusBadge";
import { BlockView } from "./PlanParts";

export function FocusCard({ plan, sample = false }: { plan: PlanDraft; sample?: boolean }) {
  const { baseline } = plan;
  const ordered = [...plan.analysis].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return (
    <Card
      title={sample ? "Sample baseline and what the plan focuses on" : "Your baseline and what the plan focuses on"}
      description={sample ? "A synthetic AFT result, made up for this example and scored with the official scales." : `Baseline test from ${formatTestDate(baseline.testDate)} (a saved copy).`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-semibold text-ink">{baseline.result.total}</span>
        <span className="text-sm text-ink-2">/ 500</span>
        <PassFailBadge passed={baseline.result.passed} />
      </div>
      {plan.standardSummary && <p className="mt-2 text-sm text-ink-2">{plan.standardSummary}</p>}

      <div className="relative mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Baseline event breakdown</caption>
          <thead className="text-xs text-ink-2">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Event</th>
              <th className="py-1.5 pr-3 text-right font-medium">Result</th>
              <th className="py-1.5 pr-3 text-right font-medium">Points</th>
              <th className="py-1.5 pr-3 font-medium">Standard</th>
              <th className="py-1.5 font-medium">Plan</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {ordered.map((a) => (
              <tr key={a.event} className="border-t border-line">
                <td className="py-2 pr-3 text-ink">{aftEventInfo[a.event].name}</td>
                <td className="py-2 pr-3 text-right text-ink-2">{formatRaw(a.event, a.raw)}</td>
                <td className={`py-2 pr-3 text-right font-semibold ${a.passed ? "text-ink" : "text-bad"}`}>{a.points}</td>
                <td className="py-2 pr-3">{a.passed ? "Met" : <span className="text-bad">Below minimum</span>}</td>
                <td className="py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${a.role === "develop" ? "bg-accent/15 text-accent" : "bg-surface-2 text-ink-2"}`}>
                    {a.role === "develop" ? `Focus ${a.priority ?? ""}`.trim() : "Maintain"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-1 text-sm text-ink">
        {plan.focusSummary.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      {plan.rationale?.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-ink">How this shapes your plan</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
            {plan.rationale.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function NotesCard({ plan }: { plan: PlanDraft }) {
  return (
    <Card title="Limits, assumptions, and next assessment">
      {plan.limitations.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-ink">What this plan can&apos;t do</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
            {plan.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )}
      {plan.scheduleNotes.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-ink">Schedule changes</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
            {plan.scheduleNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
      <h3 className="mt-4 text-sm font-semibold text-ink">Reassessment</h3>
      <p className="mt-1 text-sm text-ink">{plan.reassessment}</p>
      <p className="mt-3 text-xs text-ink-2">Planned running: about {plan.weeklyRunningMinutes} minutes a week.</p>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-ink">RuckOn assumptions (not from Army sources)</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          {plan.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-ink">Sources for the plan structure</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          {SOURCES_FOR_PLAN.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
      <p className="mt-3 text-xs text-ink-2">Template version: {plan.templateVersion}</p>
    </Card>
  );
}

export function SessionBody({ session, useBuild }: { session: PlanSession; useBuild: boolean }) {
  const sections: [string, typeof session.warmUp][] = [
    ["Warm-up", session.warmUp],
    ["Main workout", session.main],
    ["Recovery", session.recovery],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">{session.purpose}</p>
      {sections.map(([label, blocks]) => (
        <div key={label}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{label}</h4>
          <ul className="mt-1.5 space-y-2">
            {blocks.map((block) => (
              <BlockView key={block.id} block={block} useBuild={useBuild} condensed={block.id === "pd-condensed"} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function PlanPreview({ plan, startDate }: { plan: PlanDraft; startDate: string }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <FocusCard plan={plan} />
        <NotesCard plan={plan} />
      </div>
      <Card title="Four-week schedule" description="Weeks 1–2 build the foundation; weeks 3–4 add a little volume if the earlier weeks went well.">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((week) => (
            <details key={week} open={week === 1} className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                Week {week} <span className="font-normal text-ink-2">· {week <= 2 ? "Foundation" : "Build"}</span>
              </summary>
              <ul className="mt-3 space-y-3">
                {plan.sessions
                  .filter((s) => s.week === week)
                  .sort((a, b) => defaultSessionDate(startDate, week, a.weekday).localeCompare(defaultSessionDate(startDate, week, b.weekday)))
                  .map((session) => (
                    <li key={session.id} className="rounded-lg border border-line bg-surface p-3">
                      <details>
                        <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-ink">
                            {weekdayLabels[session.weekday]} {formatTestDate(defaultSessionDate(startDate, week, session.weekday), "short")} · {session.title}
                          </span>
                          <Chip>about {session.estimatedMinutes} min</Chip>
                        </summary>
                        <div className="mt-3">
                          <SessionBody session={session} useBuild={week >= 3} />
                        </div>
                      </details>
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </div>
        <p className="mt-3 flex gap-1.5 text-xs text-ink-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Focus events: {plan.analysis.filter((a) => a.role === "develop").map((a) => aftEventInfo[a.event].name).join(", ") || "none (balanced plan)"}.
        </p>
      </Card>
    </div>
  );
}
