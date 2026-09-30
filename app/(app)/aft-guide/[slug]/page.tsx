import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { aftEvents, aftGuideHref, getAftEvent } from "@/lib/aft/events";
import { GUIDE_VERIFIED_ON, guideSources } from "@/lib/aft/guideSources";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { drillHref, emptyFilters, exerciseHref, filterExercises, getDrill } from "@/lib/library";
import { ButtonLink } from "@/components/ui/Button";
import { Bullets, EndorsementNote, ExternalLinkText, GuideSection, GuideSourceList, Note, Ref } from "@/components/aft-guide/GuideBits";
import {
  DeadliftPositionDiagram,
  HandReleasePositionDiagram,
  PlankPositionDiagram,
  SdcLaneDiagram,
  SdcSequenceDiagram,
} from "@/components/aft-guide/Diagrams";

export const dynamicParams = false;

export function generateStaticParams() {
  return aftEvents.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = getAftEvent(slug);
  return event ? { title: `${event.name} guide`, description: event.description } : {};
}

// Combine section citations, dropping blanks and repeats.
function joinRefs(...refs: (string | undefined)[]) {
  return Array.from(new Set(refs.filter((ref): ref is string => Boolean(ref)))).join("; ");
}

const positionDiagram: Record<string, React.ReactNode> = {
  MDL: <DeadliftPositionDiagram />,
  HRP: <HandReleasePositionDiagram />,
  PLK: <PlankPositionDiagram />,
};

export default async function AftEventGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getAftEvent(slug);
  if (!event) notFound();

  const index = aftEvents.indexOf(event);
  const previous = aftEvents[index - 1];
  const next = aftEvents[index + 1];
  const refs = event.refs ?? {};
  const relatedExercises = filterExercises({ ...emptyFilters, aftEvent: event.code });
  const preparationDrill = getDrill("preparation-drill")!;
  const recoveryDrill = getDrill("recovery-drill")!;
  const direction = event.scoring.higherIsBetter ? "Higher is better." : "Lower (faster) is better.";

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/aft-guide" className="hover:text-ink">
          AFT Guide
        </Link>{" "}
        / <span className="text-ink">{event.name}</span>
      </nav>

      <header>
        <p className="text-sm font-medium text-accent">Event {event.order} of 5</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{event.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{event.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/aft-calculator">Score it in the calculator</ButtonLink>
          <ButtonLink href="/aft-guide/field-setup" variant="secondary">
            Field setup
          </ButtonLink>
        </div>
      </header>

      <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {[
          ["purpose", "Purpose"],
          ["setup", "Equipment and setup"],
          ["execution", "How to perform it"],
          ["rules", "Rules and errors"],
          ["grading", "Grading"],
          ["scoring", "Scoring"],
          ["prepare", "Prepare"],
          ["sources", "Sources"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink">
            {label}
          </a>
        ))}
      </nav>

      <GuideSection id="purpose" title="What it measures and why" refText={refs.measures}>
        <p>{event.description}</p>
        <p className="mt-2">{event.purpose}</p>
        <p className="mt-3 text-xs text-ink-2">
          Army-named fitness components: {event.performance.fitnessComponents.join(", ")}.
        </p>
      </GuideSection>

      <GuideSection id="setup" title="Equipment and station setup" refText={joinRefs(refs.equipment, refs.setup)}>
        <h3 className="font-semibold">Equipment per lane</h3>
        <ul className="mt-2 space-y-1.5">
          {event.equipment.map((item) => (
            <li key={item.name}>
              <span className="font-medium">
                {item.quantity ? `${item.quantity} × ` : ""}
                {item.name}
              </span>
              {item.description && <span className="text-ink-2"> — {item.description}</span>}
            </li>
          ))}
        </ul>
        <h3 className="mt-4 font-semibold">Station setup</h3>
        <div className="mt-2">
          <Bullets items={event.setup} />
        </div>
        {event.code === "SDC" && (
          <div className="mt-4">
            <SdcLaneDiagram />
          </div>
        )}
      </GuideSection>

      <GuideSection id="execution" title="How to perform it" refText={joinRefs(refs.startingPosition, refs.execution)}>
        <h3 className="font-semibold">Starting position</h3>
        <p className="mt-1">{event.startingPosition}</p>
        {positionDiagram[event.code] && <div className="mt-4">{positionDiagram[event.code]}</div>}

        <h3 className="mt-5 font-semibold">Steps</h3>
        <ol className="mt-2 space-y-3">
          {event.execution.map((phase, phaseIndex) => (
            <li key={phase.id} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                {phaseIndex + 1}
              </span>
              <div>
                <p className="font-medium">
                  {phase.title}
                  {phase.command && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2">&ldquo;{phase.command}&rdquo;</span>}
                </p>
                <ul className="mt-1 space-y-1 text-ink-2">
                  {phase.instructions.map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        {event.code === "SDC" && (
          <div className="mt-4">
            <SdcSequenceDiagram />
          </div>
        )}

        <h3 className="mt-5 font-semibold">Form and what&apos;s allowed</h3>
        <div className="mt-2">
          <Bullets items={[...event.rules.considerations, ...event.rules.allowed]} />
        </div>
        <p className="mt-3 text-sm text-ink-2">
          Breathing: {event.breathing ?? "ATP 7-22.01 gives no breathing guidance for this event, so none is given here."}
        </p>
      </GuideSection>

      <GuideSection id="rules" title="Completion, errors, and termination" refText={joinRefs(refs.completion, refs.faults, refs.termination)}>
        <h3 className="font-semibold">Completion, attempts, and rest</h3>
        <div className="mt-2">
          <Bullets items={event.completion ?? []} />
        </div>
        <h3 className="mt-4 font-semibold">{event.code === "MDL" ? "Safety stops" : event.code === "SDC" ? "Call-backs" : "Errors that don't count"}</h3>
        <div className="mt-2">
          <Bullets items={event.rules.faults} />
        </div>
        <h3 className="mt-4 font-semibold">Termination</h3>
        <div className="mt-2">
          {event.rules.termination.length > 0 ? (
            <Bullets items={event.rules.termination} />
          ) : (
            <p className="text-ink-2">The ATP lists no termination criteria for this event.</p>
          )}
        </div>
      </GuideSection>

      <GuideSection id="grading" title="Grading" refText={joinRefs(refs.grading, refs.commands)}>
        <Bullets items={event.grading?.procedure ?? []} />
        <details className="mt-4 rounded-lg border border-line bg-surface-2/40 p-3">
          <summary className="cursor-pointer font-medium text-ink">Commands and grader responsibilities</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs text-ink-2">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Command</th>
                  <th className="py-1.5 font-medium">Who and what happens</th>
                </tr>
              </thead>
              <tbody>
                {event.commands.map((command) => (
                  <tr key={command.command} className="border-t border-line">
                    <td className="py-2 pr-3 font-medium">{command.command}</td>
                    <td className="py-2 text-ink-2">{command.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-4 font-semibold">Grader responsibilities</h3>
          <div className="mt-2">
            <Bullets items={event.grading?.responsibilities ?? []} tone="muted" />
          </div>
        </details>
      </GuideSection>

      <GuideSection title="Safety" refText={refs.safety}>
        <Bullets items={event.rules.safetyTips} />
      </GuideSection>

      <GuideSection title="Muscles and movement">
        <Note>RuckOn anatomical explanation for training purposes. The Army&apos;s own description is in &ldquo;What it measures and why.&rdquo;</Note>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-2">Primary</dt>
            <dd>{event.performance.primaryMuscles.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Secondary</dt>
            <dd>{event.performance.secondaryMuscles.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Movement patterns</dt>
            <dd>{event.performance.trainingFocus.join(", ")}</dd>
          </div>
        </dl>
      </GuideSection>

      <GuideSection id="scoring" title="Scoring" refText="ATP 7-22.01 (12 Mar 2026), para. 2-30, p. 23; AFT Scoring Scales effective 1 June 2025">
        <p>
          Raw score: {event.rawScoreLabel}. {direction} Points run from {event.scoring.minimumPoints} to {event.scoring.maximumPoints} using the
          June 2025 score tables, by age group and, for the general standard, sex.
        </p>
        <p className="mt-2">
          Both the general and combat standards require at least 60 points on this event; the combat standard also requires a total of at least 350.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <ButtonLink href="/aft-calculator">Open the calculator</ButtonLink>
          <a href={aftScoringFile.path} className="self-center text-sm font-medium text-accent hover:underline">
            View the official score tables (PDF)
          </a>
        </div>
      </GuideSection>

      <GuideSection id="prepare" title="Prepare with the workout library">
        <p className="text-ink-2">
          The ATP starts every AFT with the{" "}
          <Link href={drillHref(preparationDrill.id)} className="text-accent hover:underline">
            {preparationDrill.name}
          </Link>{" "}
          and ends with the{" "}
          <Link href={drillHref(recoveryDrill.id)} className="text-accent hover:underline">
            {recoveryDrill.name}
          </Link>
          .
        </p>
        {relatedExercises.length > 0 ? (
          <>
            <p className="mt-3 text-xs text-ink-2">Exercises RuckOn maps to this event (an app mapping, not an Army designation):</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {relatedExercises.map((exercise) => (
                <li key={exercise.id}>
                  <Link href={exerciseHref(exercise.id)} className="inline-block rounded-full border border-line-strong px-3 py-1 text-sm hover:border-accent">
                    {exercise.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-ink-2">No library exercises are mapped to this event yet.</p>
        )}
      </GuideSection>

      <GuideSection title="Official demonstration and figures">
        {event.video && (
          <div className="flex gap-3">
            <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div>
              <ExternalLinkText href={event.video.url}>{event.video.title}</ExternalLinkText>
              <p className="mt-0.5 text-xs text-ink-2">{event.video.channel}</p>
              <p className="mt-1 text-xs text-ink-2">{event.video.note}</p>
            </div>
          </div>
        )}
        {event.officialFigures && (
          <div className="mt-4">
            <p className="text-ink-2">Official photos and figures are in the ATP (not reproduced here):</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
              {event.officialFigures.map((figure) => (
                <li key={figure.figure}>
                  {figure.figure}, {figure.title}, p. {figure.page}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              <ExternalLinkText href={guideSources.atp72201.url}>Open ATP 7-22.01 (PDF)</ExternalLinkText>
            </p>
          </div>
        )}
      </GuideSection>

      {event.discrepancies && event.discrepancies.length > 0 && (
        <GuideSection title="Source notes">
          <p className="text-ink-2">Where the official text is inconsistent, it is reported here rather than resolved:</p>
          <div className="mt-2">
            <Bullets items={event.discrepancies} tone="muted" />
          </div>
        </GuideSection>
      )}

      <GuideSection id="sources" title="Sources">
        <GuideSourceList ids={["atp72201", "scoringScales", "armyAftSite", "ad202607"]} />
        <Ref>Content checked against the publications on {GUIDE_VERIFIED_ON}.</Ref>
        <div className="mt-3">
          <EndorsementNote />
        </div>
      </GuideSection>

      <nav aria-label="Other events" className="flex justify-between gap-3 text-sm">
        {previous ? (
          <Link href={aftGuideHref(previous.slug)} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {previous.name}
          </Link>
        ) : (
          <Link href="/aft-guide" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            AFT Guide
          </Link>
        )}
        {next ? (
          <Link href={aftGuideHref(next.slug)} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            {next.name}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link href="/aft-guide/field-setup" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            Field setup
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
