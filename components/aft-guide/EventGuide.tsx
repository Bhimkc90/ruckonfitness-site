import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import type { AftEvent } from "@/lib/aft/eventTypes";
import { GUIDE_VERIFIED_ON, guideSources } from "@/lib/aft/guideSources";
import { AFT_FIGURE_CREDIT, figuresAt, figuresForEvent, isWide, type AftGuideFigure } from "@/lib/aft/guideFigures";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { drillHref, emptyFilters, exerciseHref, filterExercises, getDrill } from "@/lib/library";
import { ButtonLink } from "@/components/ui/Button";
import { Bullets, EndorsementNote, ExternalLinkText, GuideSection, GuideSourceList, MoreDetails, Note, Ref } from "./GuideBits";
import { DeadliftPositionDiagram, HandReleasePositionDiagram, PlankPositionDiagram, SdcLaneDiagram, SdcSequenceDiagram } from "./Diagrams";

// The full instructions for one AFT event. Rendered on the event's own page and inside the AFT Guide's event
// selector, so both show the same content. `idPrefix` keeps section anchors unique when several events share a
// page; `level` is the heading level of the section titles.

const SECTIONS = [
  ["purpose", "Purpose"],
  ["setup", "Equipment and setup"],
  ["execution", "How to perform it"],
  ["errors", "Mistakes and invalid reps"],
  ["rules", "Completion, attempts, and rest"],
  ["grading", "Grader instructions"],
  ["safety", "Safety"],
  ["scoring", "Scoring and training"],
  ["sources", "Sources"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

const positionDiagram: Record<string, React.ReactNode> = {
  MDL: <DeadliftPositionDiagram />,
  HRP: <HandReleasePositionDiagram />,
  PLK: <PlankPositionDiagram />,
};

// Combine section citations, dropping blanks and repeats.
function joinRefs(...refs: (string | undefined)[]) {
  return Array.from(new Set(refs.filter((ref): ref is string => Boolean(ref)))).join("; ");
}

export function AftFigure({ figure }: { figure: AftGuideFigure }) {
  const atp = guideSources.atp72201;
  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-lg border border-card-line bg-white">
        <Image
          src={figure.src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          sizes={isWide(figure) ? "(min-width: 1024px) 760px, 100vw" : "(min-width: 1024px) 420px, 100vw"}
          loading="lazy"
          className="h-auto w-full"
        />
      </div>
      <figcaption className="mt-1.5 text-xs text-ink-2">
        <span className="font-semibold text-ink">
          Figure {figure.figure}. {figure.caption}
        </span>{" "}
        · ATP 7-22.01, p. {figure.page}{" "}
        <a href={atp.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
          (PDF)
          <span className="sr-only"> opens the official publication in a new tab</span>
        </a>
      </figcaption>
    </figure>
  );
}

function FigureStack({ figures }: { figures: AftGuideFigure[] }) {
  if (figures.length === 0) return null;
  return (
    <div className="space-y-4">
      {figures.map((figure) => (
        <AftFigure key={figure.figure} figure={figure} />
      ))}
    </div>
  );
}

// Text with its figures beside it on wide screens (below it on phones). Wide photo strips go full width.
function WithFigures({ figures, children }: { figures: AftGuideFigure[]; children: React.ReactNode }) {
  const side = figures.filter((f) => !isWide(f));
  const wide = figures.filter(isWide);
  return (
    <div className="space-y-4">
      <div className={side.length ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start" : ""}>
        <div className="min-w-0">{children}</div>
        <FigureStack figures={side} />
      </div>
      <FigureStack figures={wide} />
    </div>
  );
}

export function EventSectionNav({ idPrefix = "" }: { idPrefix?: string }) {
  return (
    <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
      {SECTIONS.map(([id, label]) => (
        <a key={id} href={`#${idPrefix}${id}`} className="font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink">
          {label}
        </a>
      ))}
    </nav>
  );
}

export default function EventGuide({ event, idPrefix = "", level = 2 }: { event: AftEvent; idPrefix?: string; level?: 2 | 3 }) {
  const refs = event.refs ?? {};
  const id = (section: SectionId) => `${idPrefix}${section}`;
  const Sub = level === 2 ? "h3" : "h4";
  const relatedExercises = filterExercises({ ...emptyFilters, aftEvent: event.code });
  const preparationDrill = getDrill("preparation-drill")!;
  const recoveryDrill = getDrill("recovery-drill")!;
  const direction = event.scoring.higherIsBetter ? "Higher is better." : "Lower (faster) is better.";
  const faultsTitle = event.code === "MDL" ? "Safety stops" : event.code === "SDC" ? "Call-backs" : "Repetitions or positions that don't count";
  const hasFigures = figuresForEvent(event.code).length > 0;

  return (
    <div className="space-y-5">
      <GuideSection id={id("purpose")} level={level} title="What it measures and why" refText={refs.measures}>
        <p>{event.description}</p>
        <p className="mt-2">{event.purpose}</p>
        <p className="mt-3 text-xs text-ink-2">Army-named fitness components: {event.performance.fitnessComponents.join(", ")}.</p>
      </GuideSection>

      <GuideSection id={id("setup")} level={level} title="Equipment and station setup" refText={joinRefs(refs.equipment, refs.setup)}>
        <Sub className="font-semibold">Equipment per lane</Sub>
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
        <Sub className="mt-4 font-semibold">Station setup</Sub>
        <div className="mt-2">
          <Bullets items={event.setup} />
        </div>
        {event.code === "SDC" && (
          <div className="mt-4">
            <SdcLaneDiagram />
          </div>
        )}
      </GuideSection>

      <GuideSection id={id("execution")} level={level} title="How to perform it" refText={joinRefs(refs.startingPosition, refs.execution)}>
        <WithFigures figures={figuresAt(event.code, { kind: "start" })}>
          <Sub className="font-semibold">Starting position</Sub>
          <p className="mt-1">{event.startingPosition}</p>
          {positionDiagram[event.code] && <div className="mt-4">{positionDiagram[event.code]}</div>}
        </WithFigures>

        <Sub className="mt-6 font-semibold">Steps</Sub>
        <ol className="mt-3 space-y-5">
          {event.execution.map((phase, phaseIndex) => (
            <li key={phase.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
              <WithFigures figures={figuresAt(event.code, { kind: "step", stepId: phase.id })}>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-canvas" aria-hidden>
                    {phaseIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <span className="sr-only">Step {phaseIndex + 1}: </span>
                      {phase.title}
                      {phase.command && (
                        <span className="ml-2 inline-block rounded border border-accent bg-accent/25 px-1.5 py-0.5 text-xs font-semibold text-ink">
                          &ldquo;{phase.command}&rdquo;
                        </span>
                      )}
                    </p>
                    <ul className="mt-1.5 space-y-1.5 text-ink">
                      {phase.instructions.map((instruction) => (
                        <li key={instruction}>{instruction}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </WithFigures>
            </li>
          ))}
        </ol>
        {event.code === "SDC" && (
          <div className="mt-5">
            <SdcSequenceDiagram />
          </div>
        )}

        <Sub className="mt-6 flex items-center gap-1.5 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-good" aria-hidden />
          Proper form and what&apos;s allowed
        </Sub>
        <div className="mt-2">
          <Bullets items={[...event.rules.considerations, ...event.rules.allowed]} />
        </div>
        <p className="mt-3 text-ink-2">
          Breathing: {event.breathing ?? "ATP 7-22.01 gives no breathing guidance for this event, so none is given here."}
        </p>
      </GuideSection>

      <GuideSection id={id("errors")} level={level} title="Common mistakes and invalid repetitions" refText={joinRefs(refs.faults, refs.termination)}>
        <WithFigures figures={figuresAt(event.code, { kind: "faults" })}>
          <Sub className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4 text-warn" aria-hidden />
            {faultsTitle}
          </Sub>
          <div className="mt-2">
            <Bullets items={event.rules.faults} />
          </div>
          <Sub className="mt-4 flex items-center gap-1.5 font-semibold">
            <XCircle className="h-4 w-4 text-bad" aria-hidden />
            Termination
          </Sub>
          <div className="mt-2">
            {event.rules.termination.length > 0 ? (
              <Bullets items={event.rules.termination} />
            ) : (
              <p className="text-ink-2">The ATP lists no termination criteria for this event.</p>
            )}
          </div>
        </WithFigures>
      </GuideSection>

      <GuideSection id={id("rules")} level={level} title="Completion, attempts, timing, and rest" refText={refs.completion}>
        <Bullets items={event.completion ?? []} />
      </GuideSection>

      <GuideSection id={id("grading")} level={level} title="Grader instructions" refText={joinRefs(refs.grading, refs.commands)}>
        <Bullets items={event.grading?.procedure ?? []} />
        <MoreDetails summary="Commands and grader responsibilities">
          <div className="overflow-x-auto">
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
                    <td className="py-2 pr-3 font-semibold">{command.command}</td>
                    <td className="py-2 text-ink-2">{command.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Sub className="mt-4 font-semibold">Grader responsibilities</Sub>
          <div className="mt-2">
            <Bullets items={event.grading?.responsibilities ?? []} tone="muted" />
          </div>
        </MoreDetails>
      </GuideSection>

      <GuideSection id={id("safety")} level={level} title="Safety" refText={refs.safety}>
        <Bullets items={event.rules.safetyTips} />
      </GuideSection>

      <GuideSection id={id("scoring")} level={level} title="Scoring and training" refText="ATP 7-22.01 (12 Mar 2026), para. 2-30, p. 23; AFT Scoring Scales effective 1 June 2025">
        <p>
          Raw score: {event.rawScoreLabel}. {direction} Points run from {event.scoring.minimumPoints} to {event.scoring.maximumPoints} using the June 2025
          score tables, by age group and, for the general standard, sex.
        </p>
        <p className="mt-2">Both the general and combat standards require at least 60 points on this event; the combat standard also requires a total of at least 350.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ButtonLink href="/aft-calculator">Open the calculator</ButtonLink>
          <a href={aftScoringFile.path} className="text-sm font-semibold text-accent-ink underline-offset-2 hover:underline">
            View the official score tables (PDF)
          </a>
        </div>

        <Sub className="mt-5 font-semibold">Prepare with the workout library</Sub>
        <p className="mt-1 text-ink-2">
          The ATP starts every AFT with the{" "}
          <Link href={drillHref(preparationDrill.id)} className="font-medium text-accent-ink underline-offset-2 hover:underline">
            {preparationDrill.name}
          </Link>{" "}
          and ends with the{" "}
          <Link href={drillHref(recoveryDrill.id)} className="font-medium text-accent-ink underline-offset-2 hover:underline">
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
                  <Link href={exerciseHref(exercise.id)} className="inline-block rounded-full border border-line-strong bg-surface px-3 py-1 text-sm font-medium hover:border-ink">
                    {exercise.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-ink-2">No library exercises are mapped to this event yet.</p>
        )}

        <MoreDetails summary="Muscles and movement (RuckOn explanation)">
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
        </MoreDetails>
      </GuideSection>

      <GuideSection id={id("sources")} level={level} title="Demonstration and sources">
        {event.video && (
          <div className="flex gap-3">
            <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" aria-hidden />
            <div>
              <ExternalLinkText href={event.video.url}>{event.video.title}</ExternalLinkText>
              <p className="mt-0.5 text-xs text-ink-2">{event.video.channel}</p>
              <p className="mt-1 text-xs text-ink-2">{event.video.note}</p>
            </div>
          </div>
        )}
        {hasFigures && <p className="mt-3 text-xs text-ink-2">{AFT_FIGURE_CREDIT}</p>}

        {event.discrepancies && event.discrepancies.length > 0 && (
          <MoreDetails summary="Source notes">
            <p className="text-ink-2">Where the official text is inconsistent, it is reported here rather than resolved:</p>
            <div className="mt-2">
              <Bullets items={event.discrepancies} tone="muted" />
            </div>
          </MoreDetails>
        )}

        <div className="mt-4">
          <GuideSourceList ids={["atp72201", "scoringScales", "armyAftSite", "ad202607"]} />
        </div>
        <Ref>Content checked against the publications on {GUIDE_VERIFIED_ON}.</Ref>
        <div className="mt-3">
          <EndorsementNote />
        </div>
      </GuideSection>
    </div>
  );
}
