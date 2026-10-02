"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ClipboardPlus, History, Info, Minus } from "lucide-react";
import type { AftEventCode, AftResult } from "@/lib/aft/types";
import { aftEventInfo, aftEventOrder } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import {
  assignSegments,
  buildProgress,
  categoryOf,
  summarize,
  testLabel,
  type TestProgress,
} from "@/lib/aft/progress";
import {
  describeCategory,
  describeRawChange,
  formatRaw,
  formatRawShort,
  formatSignedPoints,
  rawUnitLabel,
} from "@/lib/aft/format";
import { useAftResults, useHydrated } from "@/lib/storage/aftResults";
import { useSettings } from "@/lib/storage/settings";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink, segmentClass, segmentGroupClass } from "@/components/ui/Button";
import { fieldFocus } from "@/components/ui/form";
import { PassFailBadge } from "@/components/ui/StatusBadge";
import TrendChart, { type TrendPoint } from "./TrendChart";
import DashboardPlanCard from "@/components/training/DashboardPlanCard";
import DashboardProfileCard from "@/components/profile/DashboardProfileCard";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";

type Mode = "points" | "raw";

const directionHint: Record<AftEventCode, string> = {
  MDL: "Heavier lifts are better.",
  HRP: "More repetitions are better.",
  SDC: "Lower times are better.",
  PLK: "Longer holds are better.",
  "2MR": "Lower times are better.",
};

function breakLabel(from: AftResult, to: AftResult): string {
  if (from.standard !== to.standard) return `${aftStandardRules[to.standard].label} standard`;
  if (from.ageGroup !== to.ageGroup) return `Age ${to.ageGroup}`;
  return "New score column";
}

// Round a domain outward to `step`, keeping it inside [min, max].
function niceDomain(values: number[], step: number, min: number, max: number): [number, number] {
  const lo = Math.max(min, Math.floor((Math.min(...values) - step / 2) / step) * step);
  const hi = Math.min(max, Math.ceil((Math.max(...values) + step / 2) / step) * step);
  return [lo, hi];
}

function ticksFor([lo, hi]: [number, number], step: number): number[] {
  const ticks: number[] = [];
  for (let value = lo; value <= hi; value += step) ticks.push(value);
  return ticks;
}

function ChangeValue({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-ink-2">—</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const tone = value > 0 ? "text-good" : value < 0 ? "text-bad" : "text-ink-2";
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
      <Icon className="h-4 w-4" aria-hidden />
      {formatSignedPoints(value)}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  const hydrated = useHydrated();
  const results = useAftResults();
  const settings = useSettings();
  // Chosen on this page; until then the defaults from Settings apply.
  const [chosenEvent, setEvent] = useState<AftEventCode | null>(null);
  const [chosenMode, setMode] = useState<Mode | null>(null);
  const event = chosenEvent ?? settings.trendEvent;
  const mode = chosenMode ?? settings.trendView;

  if (!hydrated) return <DashboardLoading />;

  const progress = buildProgress(results);
  const summary = summarize(progress);

  if (!summary) return <DashboardEmpty />;

  const { latest } = summary;
  const latestResult = latest.record.result;
  const comparable = latest.previousComparable
    ? progress.find((item) => item.record.id === latest.previousComparable!.id)
    : undefined;
  const rule = aftStandardRules[latestResult.standard];
  const segments = assignSegments(progress);
  const breaks = progress.flatMap((item, index) =>
    index > 0 && item.categoryChanges.length > 0 && item.previous
      ? [{ key: item.record.id, label: breakLabel(item.previous.result, item.record.result) }]
      : []
  );
  const singleStandard = progress.every((item) => item.record.result.standard === latestResult.standard);

  const totalPoints: TrendPoint[] = progress.map((item, index) => ({
    key: item.record.id,
    label: testLabel(item),
    shortLabel: testLabel(item, "short"),
    value: item.record.result.total,
    segment: segments[index],
    details: [describeCategory(categoryOf(item.record.result)), item.record.result.passed ? "Pass" : "Fail"],
  }));
  const totalDomain = niceDomain(
    [...totalPoints.map((p) => p.value), ...(singleStandard ? [rule.minTotalPoints] : [])],
    50,
    0,
    500
  );

  const eventPoints: TrendPoint[] = progress.map((item, index) => {
    const entry = item.events.find((e) => e.event === event)!;
    return {
      key: item.record.id,
      label: testLabel(item),
      shortLabel: testLabel(item, "short"),
      value: mode === "points" ? entry.points : entry.raw,
      segment: mode === "points" ? segments[index] : 0,
      details:
        mode === "points"
          ? [formatRaw(event, entry.raw), describeCategory(categoryOf(item.record.result))]
          : [`${entry.points} points`, describeCategory(categoryOf(item.record.result))],
    };
  });

  const recent = [...progress].reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your saved Army Fitness Test results on this device."
        actions={
          <>
            <ButtonLink href="/aft-calculator">
              <ClipboardPlus className="h-4 w-4" aria-hidden />
              Record AFT
            </ButtonLink>
            <ButtonLink href="/score-history" variant="secondary">
              <History className="h-4 w-4" aria-hidden />
              View history
            </ButtonLink>
            {TRAINING_PLANS_ENABLED && (
              <ButtonLink href={`/training-plan/new?baseline=${latest.record.id}`} variant="secondary">
                Suggest training plan
              </ButtonLink>
            )}
          </>
        }
      />

      <DashboardProfileCard latestTotal={latestResult.total} />

      {TRAINING_PLANS_ENABLED && <DashboardPlanCard latestResultId={latest.record.id} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-ink-2">Latest total</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-5xl font-semibold tracking-tight text-ink">{latestResult.total}</span>
            <span className="text-sm text-ink-2">/ 500</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PassFailBadge passed={latestResult.passed} />
            <span className="text-sm text-ink-2">{testLabel(latest)}</span>
          </div>
          <p className="mt-2 text-xs text-ink-2">
            {rule.label} standard: {rule.minEventPoints}+ per event, {rule.minTotalPoints}+ total
          </p>
        </Card>

        <Card>
          <p className="text-sm text-ink-2">Change since last comparable test</p>
          {latest.totalChange !== null && comparable ? (
            <>
              <p className="mt-2 text-3xl">
                <ChangeValue value={latest.totalChange} />
              </p>
              <p className="mt-2 text-sm text-ink-2">
                vs {testLabel(comparable)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink">
              {latest.previous ? "No earlier test in the same scoring category." : "This is your first saved test."}
            </p>
          )}
          {summary.previousNotComparable && (
            <p className="mt-3 flex gap-1.5 text-xs text-ink-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Your previous test used a different scoring category. {latest.categoryChanges.join(". ")}. Its points
                are not compared directly.
              </span>
            </p>
          )}
          {!latest.previous && (
            <p className="mt-2 text-xs text-ink-2">Record another test to track change.</p>
          )}
        </Card>

        <Card>
          <p className="text-sm text-ink-2">Strongest {latestResult.strongest.length > 1 ? "events (tied)" : "event"}</p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {latestResult.strongest.map((e) => aftEventInfo[e.event].name).join(", ")}
          </p>
          <p className="mt-1 text-sm text-ink-2">{latestResult.strongest[0].points} points</p>
        </Card>

        <Card>
          <p className="text-sm text-ink-2">Weakest {latestResult.weakest.length > 1 ? "events (tied)" : "event"}</p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {latestResult.weakest.map((e) => aftEventInfo[e.event].name).join(", ")}
          </p>
          <p className="mt-1 text-sm text-ink-2">{latestResult.weakest[0].points} points</p>
        </Card>
      </div>

      <Card
        title="Total score over time"
        description={
          progress.length === 1
            ? "One test recorded. Record another test to see a trend."
            : "Each point is a saved test. Lines only connect tests scored in the same category."
        }
      >
        <TrendChart
          points={totalPoints}
          formatValue={(v) => String(v)}
          valueLabel="Total"
          domain={totalDomain}
          ticks={ticksFor(totalDomain, 50)}
          reference={
            singleStandard ? { y: rule.minTotalPoints, label: `${rule.label} minimum ${rule.minTotalPoints}` } : undefined
          }
          breaks={breaks}
          ariaLabel={`Total AFT score for ${progress.length} saved tests. Latest ${latestResult.total} of 500.`}
        />
      </Card>

      <Card
        title="Event performance"
        description={
          mode === "points"
            ? "Points out of 100. 60 is the minimum for each event."
            : `Raw ${rawUnitLabel(event)}. ${directionHint[event]}`
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="event-select">
              Event
            </label>
            <select
              id="event-select"
              value={event}
              onChange={(e) => setEvent(e.target.value as AftEventCode)}
              className={`rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink ${fieldFocus}`}
            >
              {aftEventOrder.map((code) => (
                <option key={code} value={code}>
                  {aftEventInfo[code].name}
                </option>
              ))}
            </select>
            <div role="group" aria-label="Measure" className={segmentGroupClass}>
              {(["points", "raw"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={segmentClass(mode === value)}
                >
                  {value === "points" ? "Points" : "Raw"}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <TrendChart
          points={eventPoints}
          formatValue={mode === "points" ? (v) => String(v) : (v) => formatRawShort(event, v)}
          formatTooltipValue={mode === "points" ? (v) => `${v} points` : (v) => formatRaw(event, v)}
          valueLabel={aftEventInfo[event].name}
          domain={mode === "points" ? [0, 100] : undefined}
          ticks={mode === "points" ? [0, 20, 40, 60, 80, 100] : undefined}
          reference={mode === "points" ? { y: 60, label: "Event minimum 60" } : undefined}
          breaks={mode === "points" ? breaks : []}
          ariaLabel={`${aftEventInfo[event].name} ${mode === "points" ? "points" : "raw results"} for ${progress.length} saved tests.`}
        />
        <EventTable progress={progress} event={event} />
      </Card>

      <Card
        title="Recent tests"
        action={
          <Link href="/score-history" className="text-sm font-medium text-accent-ink hover:underline">
            View all history
          </Link>
        }
      >
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Scoring category</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 pr-3 font-medium">Result</th>
                <th className="py-2 pr-3 text-right font-medium">Change</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Link</span>
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {recent.map((item) => (
                <tr key={item.record.id} className="border-t border-line">
                  <td className="py-2.5 pr-3 text-ink">{testLabel(item)}</td>
                  <td className="py-2.5 pr-3 text-ink-2">{describeCategory(categoryOf(item.record.result))}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-ink">{item.record.result.total}</td>
                  <td className="py-2.5 pr-3">
                    <PassFailBadge passed={item.record.result.passed} />
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <ChangeValue value={item.totalChange} />
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/score-history#result-${item.record.id}`}
                      className="font-medium text-accent-ink hover:underline"
                    >
                      View<span className="sr-only"> result from {testLabel(item)}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-2">Change compares totals with the last test in the same scoring category.</p>
      </Card>
    </div>
  );
}

function EventTable({ progress, event }: { progress: TestProgress[]; event: AftEventCode }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-ink-2 hover:text-ink">Show data table</summary>
      <div className="relative mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead className="text-xs text-ink-2">
            <tr>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 text-right font-medium">Raw</th>
              <th className="py-2 pr-3 font-medium">Change vs previous test</th>
              <th className="py-2 pr-3 text-right font-medium">Points</th>
              <th className="py-2 text-right font-medium">Point change*</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {progress.map((item) => {
              const entry = item.events.find((e) => e.event === event)!;
              const raw = entry.rawChange === null ? null : describeRawChange(event, entry.rawChange);
              return (
                <tr key={item.record.id} className="border-t border-line">
                  <td className="py-2 pr-3 text-ink">{testLabel(item)}</td>
                  <td className="py-2 pr-3 text-right text-ink">{formatRaw(event, entry.raw)}</td>
                  <td
                    className={`py-2 pr-3 ${
                      raw?.improved === true ? "text-good" : raw?.improved === false ? "text-bad" : "text-ink-2"
                    }`}
                  >
                    {raw ? raw.text : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right text-ink">{entry.points}</td>
                  <td className="py-2 text-right">
                    <ChangeValue value={entry.pointsChange} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-2">*Compared with the last test in the same scoring category.</p>
      </div>
    </details>
  );
}

function DashboardEmpty() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <DashboardProfileCard />
      <Card className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-ink">
          <ClipboardPlus className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Record your first AFT</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
          Enter your five event results to get your score and pass/fail status under the general or combat standard.
          Once you save tests, this page shows your latest score, changes, and trends for each event.
        </p>
        <ButtonLink href="/aft-calculator" className="mt-5">
          Record AFT
        </ButtonLink>
        <p className="mt-4 text-xs text-ink-2">
          Results are saved only in this browser and don&apos;t sync between devices.
        </p>
      </Card>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-8 w-40 rounded bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-xl border border-card-line bg-surface shadow-sm" />
        ))}
      </div>
      <div className="h-80 rounded-xl border border-card-line bg-surface shadow-sm" />
    </div>
  );
}

