import type { AftEventCode, AftResult, EventScoreResult } from "@/lib/aft/types";
import { aftEventInfo } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { formatSeconds } from "@/lib/aft/validation";

export function formatRaw(event: AftEventCode, raw: number): string {
  const unit = aftEventInfo[event].unit;
  if (unit === "seconds") return formatSeconds(raw);
  if (unit === "pounds") return `${raw} lb`;
  return `${raw} reps`;
}

function eventNames(events: EventScoreResult[]) {
  return events.map((item) => aftEventInfo[item.event].shortName).join(", ");
}

export default function AftResultSummary({ result }: { result: AftResult }) {
  const rule = aftStandardRules[result.standard];
  const columnLabel = result.column === "M" ? "Male | Combat" : "Female";

  return (
    <section aria-label="AFT result" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryBox label="Total Score" value={`${result.total}`} note="Out of 500" />
        <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
          <p className="text-sm font-bold uppercase text-zinc-400">Result</p>
          <p className={`mt-2 text-4xl font-black ${result.passed ? "text-green-500" : "text-red-500"}`}>
            {result.passed ? "PASS" : "FAIL"}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {rule.label} standard: {rule.minEventPoints}+ per event, {rule.minTotalPoints}+ total
          </p>
        </div>
        <SummaryBox
          label="Strongest"
          value={eventNames(result.strongest)}
          note={`${result.strongest[0].points} points`}
        />
        <SummaryBox
          label="Weakest"
          value={eventNames(result.weakest)}
          note={`${result.weakest[0].points} points`}
        />
      </div>

      {result.failReasons.length > 0 && (
        <ul className="list-disc rounded-2xl border border-red-500/40 bg-red-950/30 p-4 pl-8 text-red-200">
          {result.failReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {result.events.map((item) => {
          const belowMinimum = item.points < rule.minEventPoints;
          return (
            <div
              key={item.event}
              className={`rounded-xl border bg-black p-4 ${belowMinimum ? "border-red-500/60" : "border-yellow-500/30"}`}
            >
              <p className="text-sm font-bold uppercase text-zinc-400">{aftEventInfo[item.event].name}</p>
              <p className={`mt-2 text-3xl font-black ${belowMinimum ? "text-red-400" : "text-yellow-400"}`}>
                {item.points}
              </p>
              <p className="text-sm text-zinc-400">{formatRaw(item.event, item.raw)}</p>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-zinc-500">
        Scored with age group {result.ageGroup}, {columnLabel} column.
      </p>
    </section>
  );
}

function SummaryBox({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-6">
      <p className="text-sm font-bold uppercase text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-yellow-400">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{note}</p>
    </div>
  );
}
