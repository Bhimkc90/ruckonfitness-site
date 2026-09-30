import type { Metadata } from "next";
import Link from "next/link";
import LibraryBrowser from "@/components/library/LibraryBrowser";
import { LegendNote, SourceList } from "@/components/library/LibraryBits";
import { Card, PageHeader } from "@/components/ui/Card";
import { drillHref, getDrill, phaseLabels, workoutTemplates } from "@/lib/library";
import { formatSourceRef } from "@/lib/library";

export const metadata: Metadata = {
  title: "Military workout library",
  description:
    "Army Preparation, Conditioning 1 and 2, and Recovery Drill exercises with official instructions, cadence, and sources.",
};

export default function WorkoutLibraryPage() {
  const template = workoutTemplates[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Military workout library"
        description="Exercises and drills from the Army's current H2F drill manual, with step-by-step instructions, official cadence, and page-level sources. Free to use, no account needed."
      />

      <LegendNote />

      <LibraryBrowser />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={template.name}
          description={
            <>
              <span className="font-medium text-ink">RuckOn suggestion, not an Army-prescribed session.</span>{" "}
              {template.description}
            </>
          }
        >
          <ol className="space-y-2 text-sm">
            {template.blocks.flatMap((block) =>
              block.items.map((item) => {
                if (item.kind !== "drill") return null;
                const drill = getDrill(item.drillId)!;
                return (
                  <li key={`${block.phase}-${drill.id}`} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <span className="text-ink-2">{phaseLabels[block.phase]}: </span>
                      <Link href={drillHref(drill.id)} className="font-medium text-accent hover:underline">
                        {drill.name}
                      </Link>
                    </span>
                    <span className="text-xs text-ink-2">{item.prescription}</span>
                  </li>
                );
              })
            )}
          </ol>
          <ul className="mt-4 space-y-1 text-xs text-ink-2">
            {template.basis.map((basis) => (
              <li key={basis.text}>
                Based on: {basis.text} ({formatSourceRef(basis.source)})
              </li>
            ))}
          </ul>
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
