import { AlertTriangle } from "lucide-react";
import type { AftResult } from "@/lib/aft/types";
import { aftEventInfo } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { columnLabel, formatRaw } from "@/lib/aft/format";
import { PassFailBadge, EventPoints } from "@/components/ui/StatusBadge";

export default function AftResultSummary({ result }: { result: AftResult }) {
  const rule = aftStandardRules[result.standard];

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tight text-ink">{result.total}</span>
          <span className="text-sm text-ink-2">/ 500</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PassFailBadge passed={result.passed} size="lg" />
          <span className="text-xs text-ink-2">
            {rule.label}: {rule.minEventPoints}+ per event, {rule.minTotalPoints}+ total
          </span>
        </div>
      </div>

      {result.failReasons.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm text-ink">
          {result.failReasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-ink-2">Strongest</dt>
          <dd className="font-medium text-ink">
            {result.strongest.map((e) => aftEventInfo[e.event].shortName).join(", ")} ·{" "}
            {result.strongest[0].points}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-2">Weakest</dt>
          <dd className="font-medium text-ink">
            {result.weakest.map((e) => aftEventInfo[e.event].shortName).join(", ")} · {result.weakest[0].points}
          </dd>
        </div>
      </dl>

      <table className="w-full text-sm">
        <caption className="sr-only">Event breakdown</caption>
        <thead className="text-xs text-ink-2">
          <tr>
            <th className="py-1.5 text-left font-medium">Event</th>
            <th className="py-1.5 text-right font-medium">Result</th>
            <th className="py-1.5 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {result.events.map((item) => {
            return (
              <tr key={item.event} className="border-t border-line">
                <td className="py-2 text-ink">{aftEventInfo[item.event].name}</td>
                <td className="py-2 text-right text-ink-2">{formatRaw(item.event, item.raw)}</td>
                <td className="py-2 text-right font-semibold">
                  <EventPoints points={item.points} minimum={rule.minEventPoints} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-xs text-ink-2">
        Scored with age group {result.ageGroup}, {columnLabel(result.column)} column.
      </p>
    </div>
  );
}
