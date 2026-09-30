import type { Metadata } from "next";
import ScoreHistory from "@/components/aft/ScoreHistory";

export const metadata: Metadata = { title: "Score History" };

export default function ScoreHistoryPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase text-yellow-400">Score History</h1>
        <p className="mt-2 text-zinc-400">Your saved AFT results, newest first, compared with the test before.</p>
      </div>
      <ScoreHistory />
    </div>
  );
}
