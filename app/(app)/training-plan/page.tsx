import type { Metadata } from "next";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import PlanView from "@/components/training/PlanView";
import UnderReview from "@/components/training/UnderReview";

export const metadata: Metadata = { title: "Training plan" };

export default function TrainingPlanPage() {
  return TRAINING_PLANS_ENABLED ? <PlanView /> : <UnderReview />;
}
