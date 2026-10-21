import type { Metadata } from "next";
import Link from "next/link";
import { TRAINING_PLANS_ENABLED, TRAINING_SCENARIOS_ENABLED } from "@/lib/features";
import PlanView from "@/components/training/PlanView";
import UnderReview from "@/components/training/UnderReview";

export const metadata: Metadata = {
  title: "Training plans",
  description: "Preview examples of AFT-based starter training plans, built from synthetic results while professional review is pending.",
};

export default function TrainingPlanPage() {
  if (!TRAINING_PLANS_ENABLED) return <UnderReview />;
  return (
    <>
      <PlanView />
      {TRAINING_SCENARIOS_ENABLED && (
        <p className="mt-6 text-sm text-ink-2">
          Reviewing the templates?{" "}
          <Link href="/training-plan/scenarios" className="font-medium text-accent-ink underline underline-offset-2">
            Open the synthetic failure-pattern scenarios
          </Link>{" "}
          (Preview only; nothing is saved).
        </p>
      )}
    </>
  );
}
