import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Citation, LegendNote, SourceList, SourceNote, Tag } from "@/components/library/LibraryBits";
import {
  aftEventLabels,
  cadenceLabels,
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
  positions,
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
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{exercise.name}</h1>
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
          {exercise.executions.map((execution) => {
            const drill = getDrill(execution.drillId)!;
            const index = drill.sequence.indexOf(exercise.id);
            const previous = index > 0 ? getExercise(drill.sequence[index - 1]) : undefined;
            const next = index < drill.sequence.length - 1 ? getExercise(drill.sequence[index + 1]) : undefined;
            const position = positions[execution.position];

            return (
              <Card
                key={execution.drillId}
                title={exercise.executions.length > 1 ? `In the ${drill.name}` : "How to perform it"}
                description={`${drill.name}, exercise ${index + 1} of ${drill.sequence.length}`}
              >
                <div className="flex flex-wrap gap-1.5">
                  <Tag tone="official">{cadenceLabels[execution.cadence]}</Tag>
                  {execution.officialPrescription && <Tag tone="official">{execution.officialPrescription}</Tag>}
                </div>

                <h3 className="mt-4 text-sm font-semibold text-ink">Starting position</h3>
                <p className="mt-1 text-sm text-ink">{execution.startingPosition}</p>
                {position.description && (
                  <p className="mt-1 text-xs text-ink-2">
                    {position.name}: {position.description}
                    {position.source && (
                      <>
                        {" "}
                        <Citation source={position.source} />
                      </>
                    )}
                  </p>
                )}

                <h3 className="mt-4 text-sm font-semibold text-ink">
                  {execution.cadence === "hold" ? "Commands and movement" : "Counts"}
                </h3>
                <ol className="mt-2 space-y-2">
                  {execution.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
                        {stepIndex + 1}
                      </span>
                      <span>
                        <span className="font-medium text-ink">{step.label}.</span>{" "}
                        <span className="text-ink-2">{step.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>

                {execution.sourceNotes?.map((note) => (
                  <div key={note} className="mt-3">
                    <SourceNote>{note} Nothing has been added to fill the gap.</SourceNote>
                  </div>
                ))}

                <p className="mt-4">
                  <Citation source={execution.source} />
                </p>

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
              </Card>
            );
          })}

          <Card title="What it develops">
            <p className="text-sm text-ink">{exercise.officialPurpose}</p>
            <p className="mt-2 text-xs text-ink-2">Focus: {exercise.focus.join(", ")}</p>
          </Card>

          {(exercise.cues.length > 0 || exercise.commonMistakes.length > 0 || exercise.cautions.length > 0) && (
            <Card title="Form" description="Drawn from the cited instructions.">
              {exercise.cues.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-ink">Cues</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                    {exercise.cues.map((cue) => (
                      <li key={cue}>{cue}</li>
                    ))}
                  </ul>
                </>
              )}
              {exercise.commonMistakes.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-ink">Common mistakes</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                    {exercise.commonMistakes.map((mistake) => (
                      <li key={mistake}>{mistake}</li>
                    ))}
                  </ul>
                </>
              )}
              {exercise.cautions.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-ink">Cautions</h3>
                  <ul className="mt-1 space-y-1 text-sm text-ink-2">
                    {exercise.cautions.map((caution) => (
                      <li key={caution} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        {caution}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
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
            <p className="mt-3 text-xs text-ink-2">
              No demonstration video is linked: the ATP points to the Central Army Registry and army.mil/aft rather than a
              video for this exercise.
            </p>
          </Card>

          <LegendNote />
        </aside>
      </div>
    </div>
  );
}
