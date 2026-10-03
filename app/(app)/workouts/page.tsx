import type { Metadata } from "next";
import LibraryBrowser from "@/components/library/LibraryBrowser";
import { LegendNote, SourceList } from "@/components/library/LibraryBits";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  title: "Exercise library",
  description:
    "Army drills and exercises with official instructions, cadence, photos, and sources, browsable as Military/PRT drills or as General Fitness groups for AFT preparation.",
};

// The library holds reusable exercise instructions and official drill sequences only.
// Suggested workouts, schedules, and progression live in Training Plans.
export default function WorkoutLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercise library"
        description="Exercises and official drills from the Army's H2F drill manual, with step-by-step instructions, official photos, and page-level sources. Browse the official drills, or the same exercises grouped for AFT preparation."
      />

      <LegendNote />

      <LibraryBrowser />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Suggested workouts">
          <p className="text-sm text-ink-2">
            {TRAINING_PLANS_ENABLED
              ? "Suggested sessions, weekly schedules, and progress tracking built from your AFT results are in Training plans. They link back to these instructions."
              : "Suggested sessions and weekly schedules are in Training plans, which shows preview examples while personalized plans await professional review. The library contains exercise instructions and official drills only."}
          </p>
          <ButtonLink href="/training-plan" variant="secondary" className="mt-4">
            {TRAINING_PLANS_ENABLED ? "Open training plans" : "See preview examples"}
          </ButtonLink>
        </Card>

        <Card
          title="Sources"
          description="Instructions are written in plain language from these official publications and checked page by page."
        >
          <SourceList ids={["atp-7-22-02-c1", "fm-7-22-c2"]} />
          <p className="mt-4 text-xs text-ink-2">
            The ATP lists demonstration videos at the Central Army Registry and army.mil/aft but does not link a video to
            each exercise, so no videos are shown here. Included beyond the six drills: selected Conditioning Drill 3,
            Strength Training Circuit, and Free Weight Training exercises. Other ATP drills and most modified versions
            are not included yet.
          </p>
        </Card>
      </div>
    </div>
  );
}
