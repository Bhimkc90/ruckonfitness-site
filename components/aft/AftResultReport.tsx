"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Info, Minus, XCircle } from "lucide-react";
import type { AftInput, AftResult } from "@/lib/aft/types";
import { aftStandardRules } from "@/lib/aft/rules";
import { buildProgress, type TestProgress } from "@/lib/aft/progress";
import { columnLabel, describeCategory, describeRawChange, formatRaw, formatSignedPoints, formatTestDate } from "@/lib/aft/format";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { useAftResults, type SavedAftResult } from "@/lib/storage/aftResults";
import { PassFailBadge } from "@/components/ui/StatusBadge";
import type { CalculatorEvent } from "./AftCalculator";

const UNSAVED_ID = "__unsaved__";

// Where this result sits among saved tests, using the same rules as History and the dashboard: points are
// compared with the previous test in the same scoring category; raw results with the previous test of any kind.
function useProgressFor(entry: { testDate: string; input: AftInput; result: AftResult }, savedId: string | null): TestProgress | null {
  const saved = useAftResults();
  const records: SavedAftResult[] = savedId
    ? saved
    : [
        ...saved,
        // Not saved yet: placed after any saved test on the same date, as it would be if saved now.
        { id: UNSAVED_ID, savedAt: "\uffff", scoringVersion: aftScoringFile.fileName, ...entry },
      ];
  return buildProgress(records).find((p) => p.record.id === (savedId ?? UNSAVED_ID)) ?? null;
}

function Change({ value, suffix = "" }: { value: number; suffix?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const tone = value > 0 ? "text-good" : value < 0 ? "text-bad" : "text-ink-2";
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {formatSignedPoints(value)}
      {suffix}
    </span>
  );
}

export default function AftResultReport({
  events,
  result,
  input,
  testDate,
  savedId,
}: {
  events: CalculatorEvent[];
  result: AftResult;
  input: AftInput;
  testDate: string;
  savedId: string | null;
}) {
  const rule = aftStandardRules[result.standard];
  const progress = useProgressFor({ testDate, input, result }, savedId);
  const comparable = progress?.previousComparable ?? null;
  const previous = progress?.previous ?? null;
  const notComparable = previous && progress && progress.categoryChanges.length > 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Total score</p>
          <p className="mt-0.5 flex items-baseline gap-1 tabular-nums">
            <span className="text-5xl font-bold tracking-tight text-ink">{result.total}</span>
            <span className="text-base font-medium text-ink-2">/ 500</span>
          </p>
          <div className="mt-2">
            <PassFailBadge passed={result.passed} size="lg" />
          </div>
        </div>

        <div className="space-y-3">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-2">Scoring category</dt>
              <dd className="font-semibold text-ink">
                {rule.label} standard · {columnLabel(result.column)} table
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">Age group</dt>
              <dd className="font-semibold text-ink">{result.ageGroup}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-2">To pass</dt>
              <dd className="text-ink">
                At least {rule.minEventPoints} points on every event and {rule.minTotalPoints} in total
              </dd>
            </div>
          </dl>

          {result.failReasons.length > 0 ? (
            <div className="rounded-lg border border-bad/40 bg-bad/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-bad">
                <XCircle className="h-4 w-4" aria-hidden />
                Why this does not pass
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {result.failReasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 rounded-lg border border-good/40 bg-good/5 p-3 text-sm font-medium text-ink">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-good" aria-hidden />
              Every event meets {rule.minEventPoints} points and the total meets {rule.minTotalPoints}.
            </p>
          )}
        </div>
      </div>

      {/* Comparison */}
      <div className="rounded-lg border border-card-line bg-surface-2/50 p-3 text-sm">
        {comparable ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
            <span>
              Compared with your test on <span className="font-semibold">{formatTestDate(comparable.testDate)}</span> (same category):
            </span>
            <span className="tabular-nums">
              total {comparable.result.total} → {result.total} <Change value={result.total - comparable.result.total} />
            </span>
          </p>
        ) : (
          <p className="flex gap-2 text-ink-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {previous
              ? "No earlier saved test uses the same scoring category, so points are not compared."
              : savedId
                ? "No earlier saved test to compare with. Later tests will be compared with this one."
                : "No earlier saved test to compare with. Save this result to track changes."}
          </p>
        )}
        {notComparable && (
          <p className="mt-2 flex gap-2 text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
            <span>
              Your previous test ({formatTestDate(previous.testDate)}) was scored as {describeCategory(previous.result)}. {progress.categoryChanges.join("; ")}
              . Points from different categories are not compared; raw results still are.
            </span>
          </p>
        )}
      </div>

      {/* Event breakdown */}
      <div>
        <h3 className="text-base font-bold text-ink">Event breakdown</h3>
        <ol className="mt-2 divide-y divide-line">
          {result.events.map((item) => {
            const meta = events.find((e) => e.code === item.event)!;
            const meets = item.points >= rule.minEventPoints;
            const eventProgress = progress?.events.find((e) => e.event === item.event);
            const raw = eventProgress?.rawChange != null ? describeRawChange(item.event, eventProgress.rawChange) : null;
            return (
              <li key={item.event} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {meta.name} <span className="font-normal text-ink-2">({meta.abbreviation})</span>
                    </p>
                    <p className="text-sm text-ink-2">
                      Result: <span className="font-medium text-ink tabular-nums">{formatRaw(item.event, item.raw)}</span>
                    </p>
                  </div>
                  <p className="shrink-0 text-right tabular-nums">
                    <span className="text-xl font-bold text-ink">{item.points}</span>
                    <span className="text-sm text-ink-2"> / 100</span>
                  </p>
                </div>

                <div
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.points}
                  aria-label={`${meta.name} points`}
                  aria-valuetext={`${item.points} of 100 points, ${meets ? "meets" : "below"} the ${rule.minEventPoints}-point minimum`}
                  className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line"
                >
                  <div className={`h-full rounded-full ${meets ? "bg-good" : "bg-bad"}`} style={{ width: `${item.points}%` }} />
                  {/* Minimum marker */}
                  <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${rule.minEventPoints}%` }} aria-hidden />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                  <span className={`inline-flex items-center gap-1 font-semibold ${meets ? "text-good" : "text-bad"}`}>
                    {meets ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <XCircle className="h-3.5 w-3.5" aria-hidden />}
                    {meets ? `Meets the ${rule.minEventPoints}-point minimum` : `Below the ${rule.minEventPoints}-point minimum`}
                  </span>
                  {(eventProgress?.pointsChange != null || raw) && (
                    <span className="inline-flex flex-wrap items-center gap-x-2 text-ink-2">
                      {eventProgress?.pointsChange != null && (
                        <span>
                          Points <Change value={eventProgress.pointsChange} />
                        </span>
                      )}
                      {raw && previous && (
                        <span>
                          vs {formatTestDate(previous.testDate, "short")}:{" "}
                          <span className={raw.improved === true ? "font-semibold text-good" : raw.improved === false ? "font-semibold text-bad" : ""}>{raw.text}</span>
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-1 text-xs text-ink-2">
          Bars show points out of 100; the black mark is the {rule.minEventPoints}-point event minimum. Scored with the{" "}
          <a href={aftScoringFile.path} className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            {aftScoringFile.title}
          </a>{" "}
          (effective {aftScoringFile.effectiveDate}).
        </p>
      </div>
    </div>
  );
}
