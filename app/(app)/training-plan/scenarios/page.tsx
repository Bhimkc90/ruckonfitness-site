import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRAINING_SCENARIOS_ENABLED } from "@/lib/features";
import ScenarioExplorer from "@/components/training/ScenarioExplorer";

export const metadata: Metadata = { title: "Training-plan scenarios", robots: { index: false, follow: false } };

// Reviewer page with synthetic baselines. 404 everywhere except protected Preview and local builds.
export default function TrainingScenariosPage() {
  if (!TRAINING_SCENARIOS_ENABLED) notFound();
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-2">
        <Link href="/training-plan" className="hover:text-ink">
          Training plan
        </Link>{" "}
        / <span className="text-ink">Reviewer scenarios</span>
      </nav>
      <Suspense fallback={<div className="h-40 rounded-xl border border-card-line bg-surface shadow-sm" aria-busy="true" aria-label="Loading" />}>
        <ScenarioExplorer />
      </Suspense>
    </div>
  );
}
