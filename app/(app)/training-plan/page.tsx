import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Training plan" };

export default function TrainingPlanPage() {
  return (
    <div>
      <PageHeader title="Training plan" />
      <Card>
        <p className="text-sm text-ink-2">Training plans are currently in development.</p>
        <ButtonLink href="/dashboard" variant="secondary" className="mt-4">
          Back to dashboard
        </ButtonLink>
      </Card>
    </div>
  );
}
