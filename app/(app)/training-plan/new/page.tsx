import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import PlanWizard from "@/components/training/PlanWizard";
import UnderReview from "@/components/training/UnderReview";
import { PageHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Suggest training plan" };

export default function NewTrainingPlanPage() {
  if (!TRAINING_PLANS_ENABLED) return <UnderReview />;
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-2">
        <Link href="/training-plan" className="hover:text-ink">
          Training plan
        </Link>{" "}
        / <span className="text-ink">Suggest a plan</span>
      </nav>
      <PageHeader
        title="Suggest a training plan"
        description="A four-week starter plan built by fixed rules from your saved AFT result, schedule, and equipment. It's a general suggestion, not an Army program."
      />
      <Suspense fallback={<div className="h-40 rounded-xl border border-card-line bg-surface shadow-sm" aria-busy="true" aria-label="Loading" />}>
        <PlanWizard />
      </Suspense>
    </div>
  );
}
