import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Citation, LegendNote, SourceList, SourceNote, Tag } from "@/components/library/LibraryBits";
import {
  cadenceLabels,
  drills,
  exerciseHref,
  getDrill,
  getExercise,
  phaseLabels,
  positions,
  purposeLabels,
} from "@/lib/library";

export const dynamicParams = false;

export function generateStaticParams() {
  return drills.map((drill) => ({ id: drill.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const drill = getDrill(id);
  return drill ? { title: drill.name, description: drill.summary } : {};
}

export default async function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drill = getDrill(id);
  if (!drill) notFound();

  const sourceIds = Array.from(new Set(drill.sources.map((s) => s.sourceId)));

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/workouts" className="hover:text-ink">
          Library
        </Link>{" "}
        / <span className="text-ink">{drill.name}</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {drill.name} <span className="font-normal text-ink-2">({drill.abbreviation})</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{drill.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag tone="official">{drill.officialCategory}</Tag>
          <Tag tone="official">Physical component: {drill.officialComponent}</Tag>
          <Tag>{phaseLabels[drill.tags.phase]}</Tag>
          {drill.tags.purposes.map((p) => (
            <Tag key={p}>{purposeLabels[p]}</Tag>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <Card title="Exercises in official order" description={`${drill.sequence.length} exercises. Select one for full instructions.`}>
            <ol className="divide-y divide-line">
              {drill.sequence.map((exerciseId, index) => {
                const exercise = getExercise(exerciseId)!;
                const execution = exercise.executions.find((x) => x.drillId === drill.id)!;
                return (
                  <li key={exerciseId}>
                    <Link
                      href={exerciseHref(exerciseId)}
                      className="flex items-start gap-3 rounded-lg px-1 py-3 hover:bg-surface-2/60"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent-ink">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium text-ink">{exercise.name}</span>
                        <span className="mt-0.5 block text-xs text-ink-2">
                          {cadenceLabels[execution.cadence]}
                          {execution.officialPrescription ? ` · ${execution.officialPrescription}` : ""}
                          {execution.position && ` · Start: ${positions[execution.position].name}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card title="Official guidance">
            <ul className="space-y-3 text-sm">
              {drill.officialGuidance.map((item) => (
                <li key={item.text}>
                  <p className="text-ink">{item.text}</p>
                  <Citation source={item.source} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="Official prescription">
            <p className="text-sm text-ink">{drill.officialPrescription.text}</p>
            <p className="mt-2">
              <Citation source={drill.officialPrescription.source} />
            </p>
          </Card>

          {drill.modifiedVersionNote && <SourceNote>{drill.modifiedVersionNote}</SourceNote>}

          <Card title="Sources">
            <ul className="mb-3 space-y-1">
              {drill.sources.map((source) => (
                <li key={`${source.sourceId}-${source.paragraphs}`}>
                  <Citation source={source} />
                </li>
              ))}
            </ul>
            <SourceList ids={sourceIds} />
          </Card>

          <LegendNote />
        </aside>
      </div>
    </div>
  );
}
