import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Workouts" };

export default function WorkoutsPage() {
  return (
    <div>
      <PageHeader title="Workouts" />
      <Card>
        <p className="text-sm text-ink-2">Workout library and training features are currently in development.</p>
        <ButtonLink href="/dashboard" variant="secondary" className="mt-4">
          Back to dashboard
        </ButtonLink>
      </Card>
    </div>
  );
}
