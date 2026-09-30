import type { Metadata } from "next";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import PlanView from "@/components/training/PlanView";
import UnderReview from "@/components/training/UnderReview";

export const metadata: Metadata = {
  title: "Training plans",
  description: "Preview examples of AFT-based starter training plans, built from synthetic results while professional review is pending.",
};

export default function TrainingPlanPage() {
  return TRAINING_PLANS_ENABLED ? <PlanView /> : <UnderReview />;
}
