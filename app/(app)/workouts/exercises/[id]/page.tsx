import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LegendNote, SourceList, Tag } from "@/components/library/LibraryBits";
import { DemonstrationNote, ExecutionDetails, FormGuidance, Substitutions, hasFormGuidance } from "@/components/library/ExerciseDetail";
import FigureGallery from "@/components/library/FigureGallery";
import { figuresFor } from "@/lib/library/images";
import {
  aftEventLabels,
  drillHref,
  drillMemberships,
  equipmentLabels,
  exerciseHref,
  exercisePhases,
  exercises,
  getDrill,
  getExercise,
  impactLabels,
  movementLabels,
  phaseLabels,
  purposeLabels,
} from "@/lib/library";

export const dynamicParams = false;

export function generateStaticParams() {
  return exercises.map((exercise) => ({ id: exercise.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const exercise = getExercise(id);
  return exercise ? { title: exercise.name, description: exercise.summary } : {};
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();

  const memberships = drillMemberships(exercise.id);
  const sourceIds = Array.from(new Set(exercise.executions.map((x) => x.source.sourceId)));

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/workouts" className="hover:text-ink">
          Library
        </Link>{" "}
        / <span className="text-ink">{exercise.name}</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{exercise.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{exercise.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {memberships.map(({ drill, order }) => (
            <Link key={drill.id} href={drillHref(drill.id)} className="rounded-full hover:opacity-80">
              <Tag tone="official">
                {drill.name}, exercise {order} of {drill.sequence.length}
              </Tag>
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <FigureGallery exercise={exercise} />

          {exercise.executions.map((execution) => {
            const drill = execution.drillId ? getDrill(execution.drillId) : undefined;
            const index = drill ? drill.sequence.indexOf(exercise.id) : -1;
            const previous = drill && index > 0 ? getExercise(drill.sequence[index - 1]) : undefined;
            const next = drill && index < drill.sequence.length - 1 ? getExercise(drill.sequence[index + 1]) : undefined;
            const contextName = drill ? drill.name : (execution.context ?? "");

            return (
              <Card
                key={execution.drillId ?? execution.context}
                title={exercise.executions.length > 1 ? (drill ? `In the ${drill.name}` : `In ${contextName}`) : "How to perform it"}
                description={drill ? `${drill.name}, exercise ${index + 1} of ${drill.sequence.length}` : contextName}
              >
                <ExecutionDetails execution={execution} />

                {drill && (
                <nav aria-label={`${drill.name} sequence`} className="mt-4 flex justify-between gap-2 border-t border-line pt-3 text-sm">
                  {previous ? (
                    <Link href={exerciseHref(previous.id)} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      {previous.name}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Link href={exerciseHref(next.id)} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                      {next.name}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  ) : (
                    <Link href={drillHref(drill.id)} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                      Back to {drill.abbreviation}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  )}
                </nav>
                )}
              </Card>
            );
          })}

          <Card title="What it develops">
            <p className="text-sm text-ink">{exercise.officialPurpose}</p>
            <p className="mt-2 text-xs text-ink-2">Focus: {exercise.focus.join(", ")}</p>
          </Card>

          {hasFormGuidance(exercise) && (
            <Card title="Form" description="Drawn from the cited instructions.">
              <FormGuidance exercise={exercise} />
            </Card>
          )}

          {exercise.substitutions?.length ? (
            <Card title="Substitutions" description="Alternatives described in the cited publication, and how they differ.">
              <Substitutions exercise={exercise} heading={false} />
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card title="Classification">
            <h3 className="text-xs font-semibold text-ink-2">Army</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {memberships.map(({ drill }) => (
                <Tag key={drill.id} tone="official">
                  {drill.officialCategory}
                </Tag>
              ))}
              {exercise.executions
                .filter((execution) => !execution.drillId && execution.context)
                .map((execution) => (
                  <Tag key={execution.context} tone="official">
                    {execution.context}
                  </Tag>
                ))}
            </div>
            <h3 className="mt-4 text-xs font-semibold text-ink-2">RuckOn tags</h3>
            <dl className="mt-1.5 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-ink-2">Purpose</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {exercise.tags.purposes.map((p) => (
                    <Tag key={p}>{purposeLabels[p]}</Tag>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">Session phase</dt>
                <dd className="text-ink">{exercisePhases(exercise).map((p) => phaseLabels[p]).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">Equipment</dt>
                <dd className="text-ink">{exercise.tags.equipment.map((e) => equipmentLabels[e]).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">Impact</dt>
                <dd className="text-ink">{impactLabels[exercise.tags.impact]}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">Movement</dt>
                <dd className="text-ink">{exercise.tags.movementPatterns.map((m) => movementLabels[m]).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">Location</dt>
                <dd className="text-ink">Open ground, indoors or outdoors</dd>
              </div>
            </dl>
          </Card>

          <Card title="AFT relevance">
            {exercise.aft ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.aft.events.map((event) => (
                    <Tag key={event}>{aftEventLabels[event]}</Tag>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-2">{exercise.aft.note}</p>
                <p className="mt-2 text-xs text-ink-2">
                  {exercise.aft.basis === "app"
                    ? "This is a RuckOn mapping, not an Army designation."
                    : "Based on a statement in the source, mapped to a specific event by RuckOn."}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-2">No AFT event mapping for this exercise.</p>
            )}
          </Card>

          <Card title="Sources">
            <SourceList ids={sourceIds} />
            <div className="mt-3">
              <DemonstrationNote exercise={exercise} hasPhotos={figuresFor(exercise.id).length > 0} />
            </div>
          </Card>

          <LegendNote />
        </aside>
      </div>
    </div>
  );
}
