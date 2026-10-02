import { AlertTriangle } from "lucide-react";
import type { DrillExecution, Exercise } from "@/lib/library/types";
import { cadenceLabels, positions } from "@/lib/library";
import { Citation, SourceNote, Tag } from "./LibraryBits";

// Instruction blocks shared by the standalone exercise page and the library's inline instructions, so each
// exercise's verified content is rendered from one place. `level` sets the heading level for the context.
export type HeadingLevel = 3 | 4 | 5;

function Heading({ level, className, children }: { level: HeadingLevel; className: string; children: React.ReactNode }) {
  const H = (["h3", "h4", "h5"] as const)[level - 3];
  return <H className={className}>{children}</H>;
}

export function stepsHeading(execution: DrillExecution): string {
  if (execution.cadence === "hold") return "Commands and movement";
  return execution.cadence === "slow" || execution.cadence === "moderate" ? "Counts" : "Movement";
}

// Cadence and prescription, starting position, numbered steps, gaps in the source, and the citation.
export function ExecutionDetails({ execution, level = 3 }: { execution: DrillExecution; level?: HeadingLevel }) {
  const position = positions[execution.position];
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-1.5">
        <Tag tone="official">{cadenceLabels[execution.cadence]}</Tag>
        {execution.officialPrescription && <Tag tone="official">{execution.officialPrescription}</Tag>}
      </div>

      <Heading level={level} className="mt-4 text-sm font-semibold text-ink">
        Starting position
      </Heading>
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

      <Heading level={level} className="mt-4 text-sm font-semibold text-ink">
        {stepsHeading(execution)}
      </Heading>
      <ol className="mt-2 space-y-2">
        {execution.steps.map((step, stepIndex) => (
          <li key={stepIndex} className="flex gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
              {stepIndex + 1}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-ink">{step.label}.</span> <span className="text-ink-2">{step.text}</span>
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
    </div>
  );
}

export function hasFormGuidance(exercise: Exercise): boolean {
  return exercise.cues.length > 0 || exercise.commonMistakes.length > 0 || exercise.cautions.length > 0;
}

// Cues, common mistakes, and cautions, each only when the source supports them.
export function FormGuidance({ exercise, level = 3 }: { exercise: Exercise; level?: HeadingLevel }) {
  return (
    <div className="space-y-4">
      {exercise.cues.length > 0 && (
        <div>
          <Heading level={level} className="text-sm font-semibold text-ink">
            Cues
          </Heading>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
            {exercise.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </div>
      )}
      {exercise.commonMistakes.length > 0 && (
        <div>
          <Heading level={level} className="text-sm font-semibold text-ink">
            Common mistakes
          </Heading>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
            {exercise.commonMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </div>
      )}
      {exercise.cautions.length > 0 && (
        <div>
          <Heading level={level} className="text-sm font-semibold text-ink">
            Cautions
          </Heading>
          <ul className="mt-1 space-y-1 text-sm text-ink-2">
            {exercise.cautions.map((caution) => (
              <li key={caution} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden />
                {caution}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Official demonstration link and a note on what is shown. The ATP names video libraries (the Central Army
// Registry and army.mil/aft) but links no video to individual exercises, so a link appears only when an exercise
// has a verified demonstrationUrl.
export function DemonstrationNote({ exercise, hasPhotos }: { exercise: Exercise; hasPhotos: boolean }) {
  const photos = hasPhotos ? "Photos are the ATP's own figures. " : "";
  if (exercise.demonstrationUrl) {
    return (
      <p className="text-xs text-ink-2">
        {photos}
        <a href={exercise.demonstrationUrl} target="_blank" rel="noreferrer" className="font-medium text-accent-ink underline underline-offset-2">
          Official demonstration video
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    );
  }
  return (
    <p className="text-xs text-ink-2">
      {photos}No demonstration video is linked: the ATP points to the Central Army Registry and army.mil/aft rather than a video for
      this exercise.
    </p>
  );
}
