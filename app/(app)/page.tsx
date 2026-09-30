import Link from "next/link";
import { Gauge, LineChart } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-black uppercase text-yellow-400 sm:text-5xl">RuckOn Fitness</h1>
      <p className="mt-4 text-lg text-zinc-300">
        Score your Army Fitness Test with the official June 2025 tables, see exactly why you passed or
        failed under the general or combat standard, and track your results over time.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/aft-calculator"
          className="rounded-2xl border border-yellow-500/40 bg-zinc-950 p-6 transition hover:border-yellow-400"
        >
          <Gauge className="h-8 w-8 text-yellow-400" />
          <h2 className="mt-3 text-xl font-black uppercase">Score a test</h2>
          <p className="mt-2 text-zinc-400">All five events, every age group, both standards.</p>
        </Link>
        <Link
          href="/score-history"
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-yellow-400"
        >
          <LineChart className="h-8 w-8 text-yellow-400" />
          <h2 className="mt-3 text-xl font-black uppercase">Score history</h2>
          <p className="mt-2 text-zinc-400">Saved results and event-by-event changes since your last test.</p>
        </Link>
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        Results are saved only in this browser for now. Training plans and workouts are coming next.
      </p>
    </div>
  );
}
