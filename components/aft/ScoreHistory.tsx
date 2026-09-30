"use client";

import { useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus, Trash2 } from "lucide-react";
import { aftEventInfo } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { buildProgress, categoryOf, testLabel, type TestProgress } from "@/lib/aft/progress";
import { describeCategory, describeRawChange, formatRaw, formatSignedPoints, formatTestDate } from "@/lib/aft/format";
import { deleteAftResult, useAftResults, useHydrated } from "@/lib/storage/aftResults";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Chip, PassFailBadge } from "@/components/ui/StatusBadge";

function PointsChange({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-2">—</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const tone = value > 0 ? "text-good" : value < 0 ? "text-bad" : "text-ink-2";
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {formatSignedPoints(value)}
    </span>
  );
}

export default function ScoreHistory() {
  const hydrated = useHydrated();
  const results = useAftResults();
  const progress = buildProgress(results);

  // Entries render after browser storage is read, so scroll to a linked entry once, when they first appear.
  useEffect(() => {
    if (!hydrated || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hydrated]);

  const storageNote = (
    <p className="flex gap-2 text-sm text-ink-2">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      Records are saved only in this browser. They don&apos;t sync between devices, and clearing this site&apos;s data
      removes them.
    </p>
  );

  if (!hydrated) {
    return <div className="h-40 rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading history" />;
  }

  if (progress.length === 0) {
    return (
      <Card className="max-w-2xl">
        <p className="text-sm text-ink">No saved AFT results in this browser yet.</p>
        <ButtonLink href="/aft-calculator" className="mt-4">
          Record AFT
        </ButtonLink>
        <div className="mt-4">{storageNote}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {storageNote}
      {[...progress].reverse().map((item) => (
        <HistoryEntry key={item.record.id} item={item} />
      ))}
    </div>
  );
}

function HistoryEntry({ item }: { item: TestProgress }) {
  const { record } = item;
  const result = record.result;
  const rule = aftStandardRules[result.standard];

  return (
    <article id={`result-${record.id}`} className="scroll-mt-28 rounded-xl border border-line bg-surface p-4 sm:p-5 lg:scroll-mt-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{testLabel(item)}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{describeCategory(categoryOf(result))}</Chip>
            <Chip>Age {record.input.age}</Chip>
          </div>
        </div>
        <div className="text-right">
          <p className="flex items-baseline justify-end gap-1">
            <span className="text-3xl font-semibold tracking-tight text-ink">{result.total}</span>
            <span className="text-xs text-ink-2">/ 500</span>
          </p>
          <div className="mt-1 flex items-center justify-end gap-2 text-sm">
            <PassFailBadge passed={result.passed} />
            {item.previousComparable && (
              <span className="text-ink-2">
                <PointsChange value={item.totalChange} /> vs {formatTestDate(item.previousComparable.testDate)}
              </span>
            )}
          </div>
        </div>
      </header>

      {item.categoryChanges.length > 0 && (
        <p className="mt-3 flex gap-1.5 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-xs text-ink-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {item.categoryChanges.join(". ")} since the previous test. Point changes compare only with tests in the same
            scoring category{item.previousComparable ? "" : ", and there is no earlier one"}.
          </span>
        </p>
      )}

      {result.failReasons.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-bad">
          {result.failReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="relative mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-ink-2">
            <tr>
              <th className="py-2 pr-3 font-medium">Event</th>
              <th className="py-2 pr-3 text-right font-medium">Result</th>
              <th className="py-2 pr-3 font-medium">Change vs previous test</th>
              <th className="py-2 pr-3 text-right font-medium">Points</th>
              <th className="py-2 text-right font-medium">Point change*</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {item.events.map((entry) => {
              const raw = entry.rawChange === null ? null : describeRawChange(entry.event, entry.rawChange);
              const below = entry.points < rule.minEventPoints;
              return (
                <tr key={entry.event} className="border-t border-line">
                  <td className="py-2 pr-3 text-ink">{aftEventInfo[entry.event].name}</td>
                  <td className="py-2 pr-3 text-right text-ink">{formatRaw(entry.event, entry.raw)}</td>
                  <td
                    className={`py-2 pr-3 ${
                      raw?.improved === true ? "text-good" : raw?.improved === false ? "text-bad" : "text-ink-2"
                    }`}
                  >
                    {raw ? raw.text : "—"}
                  </td>
                  <td className={`py-2 pr-3 text-right font-semibold ${below ? "text-bad" : "text-ink"}`}>
                    {entry.points}
                  </td>
                  <td className="py-2 text-right">
                    <PointsChange value={entry.pointsChange} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-2">*Compared with the last test in the same scoring category.</p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete the result from ${testLabel(item)}? This cannot be undone.`)) {
              deleteAftResult(record.id);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-ink-2 hover:bg-bad/10 hover:text-bad"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete<span className="sr-only"> result from {testLabel(item)}</span>
        </button>
      </footer>
    </article>
  );
}
