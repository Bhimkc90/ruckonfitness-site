import type { Metadata } from "next";
import LibraryBrowser from "@/components/library/LibraryBrowser";
import { LegendNote, SourceList } from "@/components/library/LibraryBits";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";

export const metadata: Metadata = {
  title: "Military workout library",
  description:
    "Army drills and exercises (Preparation, Four for the Core, Military Movement 1, Conditioning 1 and 2, Recovery, and free-weight lifts) with official instructions, cadence, and sources.",
};

// The library holds reusable exercise instructions and official drill sequences only.
// Suggested workouts, schedules, and progression live in Training Plans.
export default function WorkoutLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Military workout library"
        description="Exercises and official drills from the Army's current H2F drill manual, with step-by-step instructions, official cadence, and page-level sources. Free to use, no account needed."
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
            each exercise, so no videos are shown here. Modified drill versions and the other drills in the ATP are not
            included yet.
          </p>
        </Card>
      </div>
    </div>
  );
}
