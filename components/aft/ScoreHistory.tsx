"use client";

import Link from "next/link";
import { aftEventInfo } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import {
  deleteAftResult,
  sortByTestDate,
  useAftResults,
  type SavedAftResult,
} from "@/lib/storage/aftResults";
import { formatRaw } from "./AftResultSummary";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatTestDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-600">—</span>;
  if (value === 0) return <span className="text-zinc-400">0</span>;
  return (
    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

export default function ScoreHistory() {
  const results = useAftResults();
  const oldestFirst = sortByTestDate(results);

  if (oldestFirst.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 p-6 text-zinc-300">
        <p>No saved AFT results on this device yet.</p>
        <Link href="/aft-calculator" className="mt-4 inline-block font-bold text-yellow-400 underline">
          Score a test
        </Link>
      </div>
    );
  }

  const entries = oldestFirst
    .map((item, index) => ({ item, previous: index > 0 ? oldestFirst[index - 1] : null }))
    .reverse();

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Results are saved only in this browser. Clearing site data removes them.
      </p>
      {entries.map(({ item, previous }) => (
        <HistoryCard key={item.id} item={item} previous={previous} />
      ))}
    </div>
  );
}

function HistoryCard({ item, previous }: { item: SavedAftResult; previous: SavedAftResult | null }) {
  const { result } = item;
  const rule = aftStandardRules[result.standard];
  const previousPoints = (event: string) =>
    previous?.result.events.find((e) => e.event === event)?.points ?? null;

  return (
    <article className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{formatTestDate(item.testDate)}</h2>
          <p className="text-sm text-zinc-400">
            {rule.label} standard · age group {result.ageGroup}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-yellow-400">{result.total}</p>
          <p className={`font-black ${result.passed ? "text-green-500" : "text-red-500"}`}>
            {result.passed ? "PASS" : "FAIL"}
          </p>
          <p className="text-sm">
            <Change value={previous ? result.total - previous.result.total : null} />
            {previous && <span className="text-zinc-500"> vs previous</span>}
          </p>
        </div>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="text-zinc-400">
            <tr>
              <th className="py-2 font-bold uppercase">Event</th>
              <th className="py-2 font-bold uppercase">Raw</th>
              <th className="py-2 font-bold uppercase">Points</th>
              <th className="py-2 font-bold uppercase">Change</th>
            </tr>
          </thead>
          <tbody>
            {result.events.map((event) => {
              const before = previousPoints(event.event);
              return (
                <tr key={event.event} className="border-t border-zinc-800">
                  <td className="py-2">{aftEventInfo[event.event].name}</td>
                  <td className="py-2 text-zinc-300">{formatRaw(event.event, event.raw)}</td>
                  <td
                    className={`py-2 font-bold ${event.points < rule.minEventPoints ? "text-red-400" : "text-yellow-400"}`}
                  >
                    {event.points}
                  </td>
                  <td className="py-2">
                    <Change value={before === null ? null : event.points - before} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Delete this saved result? This cannot be undone.")) deleteAftResult(item.id);
        }}
        className="mt-4 text-sm font-bold uppercase text-zinc-400 hover:text-red-400"
      >
        Delete
      </button>
    </article>
  );
}
