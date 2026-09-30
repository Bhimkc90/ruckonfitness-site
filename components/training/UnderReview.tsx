import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

// Shown while the training-plan release flag is off.
export default function UnderReview() {
  return (
    <div>
      <PageHeader title="Training plan" />
      <Card className="max-w-2xl">
        <p className="text-sm text-ink">
          Suggested training plans are built but are waiting for review by a qualified professional before they are released. Until then, the{" "}
          workout library has the Army drills with official instructions.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/workouts">Open the workout library</ButtonLink>
          <ButtonLink href="/dashboard" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
