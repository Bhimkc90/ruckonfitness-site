"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, HeartPulse, Info, Lock, PlayCircle } from "lucide-react";
import { formatInstantDate } from "@/lib/aft/format";
import { drillHref, exerciseHref, getDrill, getExercise } from "@/lib/library";
import { activities } from "@/lib/training/templates";
import type { WorkoutView } from "@/lib/training/planDashboard";
import type { WorkoutProgress, WorkoutReadiness } from "@/lib/training/workout";
import { actualFields, formatActual, formatRest, formatTarget, parseActualInput, setLabel, type ActualField } from "@/lib/training/workoutFormat";
import type { ActualPerformance, Difficulty, SetCompletion, WorkoutExercise, WorkoutSection, WorkoutSet, WorkoutSnapshot } from "@/lib/training/types";
import { ExerciseThumbSmall } from "@/components/library/ExerciseImage";
import { RestTimer, SetTimer, TimerProvider, WorkoutClock, useTimerSlot, type ClockActions } from "./WorkoutTimers";
import { formatClock } from "@/lib/training/workoutTimer";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/form";

// One workout: its frozen snapshot, set by set. Interactive only in "active" mode, and every change goes through
// the actions passed in (the storage save functions). Recorded sets come from stored data, so a set is shown as
// done only once it is saved. Outside "active" mode nothing looks clickable: a preview or read-only workout shows
// plain set text under a banner that says why it can't be recorded (the Phase 4 preview drew each set with an empty
// circle that looked like a checkbox but did nothing).

export type ActionResult = { ok: true } | { ok: false; error: string };

export type WorkoutActions = {
  recordSet: (setId: string, actual?: ActualPerformance) => ActionResult;
  undoSet: (setId: string) => ActionResult;
  complete: (feedback: { difficulty: Difficulty; notes: string }) => ActionResult;
  reportPain: (entry: { notes: string; setId?: string }) => ActionResult;
};

export const difficultyLabels: Record<Difficulty, string> = { easy: "Easy", "about-right": "About right", hard: "Hard", "too-hard": "Too hard" };

const partLabels: Record<WorkoutSection["phase"], string> = { "warm-up": "Warm-up", main: "Main workout", recovery: "Recovery" };
const reasonLabels = { plan: "left out by the plan", restriction: "left out for your restrictions", equipment: "needs equipment you don't have", unknown: "not in the exercise library" } as const;
const fieldLabels: Record<ActualField, string> = { reps: "Reps done", seconds: "Seconds", meters: "Meters", load: "Weight (lb)" };

export function ProgressBar({ percent, label }: { percent: number | null; label: string }) {
  const value = percent ?? 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs text-ink-2">
        <span>{label}</span>
        <span className="tabular-nums">{percent === null ? "—" : `${value}%`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ExerciseName({ exercise }: { exercise: WorkoutExercise }) {
  const s = exercise.source;
  const href = s.kind === "activity" ? activities[s.activityId]?.link : exerciseHref(s.exerciseId);
  return href ? (
    <Link href={href} className="font-semibold text-accent-ink underline-offset-2 hover:underline">
      {exercise.name}
    </Link>
  ) : (
    <span className="font-semibold text-ink">{exercise.name}</span>
  );
}

type RowMode = "active" | "preview" | "readonly";

function SetRow({ exercise, set, record, actions, mode }: { exercise: WorkoutExercise; set: WorkoutSet; record?: SetCompletion; actions?: WorkoutActions; mode: RowMode }) {
  const id = useId();
  const timers = useTimerSlot();
  const [values, setValues] = useState<Partial<Record<ActualField, string>>>({});
  const [error, setError] = useState("");
  const fields = actualFields(exercise, set.target);
  const done = !!record;
  const label = setLabel(exercise.unit, set.number);

  const run = (result: ActionResult) => setError(result.ok ? "" : result.error);
  const toggle = () => {
    if (!actions) return;
    if (done) return run(actions.undoSet(set.id));
    const parsed = parseActualInput(values);
    if (parsed.error) return setError(parsed.error);
    const result = actions.recordSet(set.id, parsed.actual);
    run(result);
    // Offer the prescribed rest, if there is one. It's optional and never invented.
    if (result.ok && exercise.rest) timers?.offerRest(exercise.id, exercise.rest);
  };
  const update = () => {
    if (!actions) return;
    const parsed = parseActualInput(values);
    if (parsed.error) return setError(parsed.error);
    run(actions.recordSet(set.id, parsed.actual));
  };

  return (
    <li className={`rounded-lg border p-2.5 ${done ? "border-good/40 bg-good/5" : "border-line bg-surface"}`}>
      <div className="flex items-start gap-3">
        {mode === "active" && actions ? (
          // A 44px touch target around the box; the name says which exercise and set it records.
          <label className="-m-2.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
            <input
              id={id}
              type="checkbox"
              checked={done}
              onChange={toggle}
              className="h-6 w-6 cursor-pointer accent-[var(--color-control)]"
              aria-label={`${exercise.name}, ${label}: ${formatTarget(set.target)}, ${done ? "done" : "not done"}`}
            />
          </label>
        ) : done ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" aria-hidden />
        ) : null}
        <div className="min-w-0 flex-1">
          <label htmlFor={actions ? id : undefined} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-ink">{label}</span>
            <span className="text-ink-2">
              {formatTarget(set.target)}
            </span>
            {mode !== "preview" && (
              <span className={`text-xs font-semibold ${done ? "text-good" : "text-ink-2"}`}>{done ? "Done" : mode === "active" ? "Not done" : "Not recorded"}</span>
            )}
          </label>
          {set.instruction && <p className="mt-0.5 text-xs text-ink-2">{set.instruction}</p>}
          {record?.actual && <p className="mt-0.5 text-xs text-ink">Recorded: {formatActual(record.actual)}</p>}
          {mode === "active" && actions && (
            <SetTimer
              timerKey={set.id}
              target={set.target}
              label={`${exercise.name}, ${label}`}
              onUseTime={fields.includes("seconds") ? (seconds) => setValues((v) => ({ ...v, seconds: String(seconds) })) : undefined}
            />
          )}
          {mode === "active" && actions && fields.length > 0 && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              {fields.map((f) => (
                <label key={f} className="text-xs text-ink-2">
                  {fieldLabels[f]} <span className="sr-only">for {exercise.name}, {label}</span>
                  <input
                    inputMode="decimal"
                    value={values[f] ?? ""}
                    onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                    placeholder="optional"
                    className="mt-1 block w-24 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
                  />
                </label>
              ))}
              {done && (
                <button type="button" onClick={update} className={buttonClass("secondary", "py-1.5")}>
                  Update
                </button>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-1 text-xs font-medium text-bad">
              Not saved: {error}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function ExerciseCard({ exercise, records, progress, actions, mode }: { exercise: WorkoutExercise; records: Map<string, SetCompletion>; progress?: WorkoutProgress; actions?: WorkoutActions; mode: RowMode }) {
  const s = exercise.source;
  const library = s.kind === "activity" ? undefined : getExercise(s.exerciseId);
  const drill = s.kind === "drill" ? getDrill(s.drillId) : undefined;
  const own = progress?.exercises.find((e) => e.id === exercise.id);
  return (
    <li className="rounded-lg border border-line bg-canvas/40 p-3">
      <div className="flex gap-3">
        {library && <ExerciseThumbSmall exercise={library} drillAbbreviation={drill?.abbreviation} />}
        <div className="min-w-0 flex-1 text-sm">
          <p>
            <ExerciseName exercise={exercise} />
            {drill && (
              <span className="text-xs text-ink-2">
                {" "}
                · <Link href={drillHref(drill.id)} className="underline-offset-2 hover:underline">{drill.name}</Link>, exercise {s.kind === "drill" ? s.order : ""}
              </span>
            )}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
            {exercise.cadence && <li>{exercise.cadence}</li>}
            {exercise.intensity && <li>{exercise.intensity}</li>}
            {exercise.rest && <li>{formatRest(exercise.rest)}</li>}
            {exercise.safety.map((c) => (
              <li key={c} className="text-ink">
                <span className="font-semibold">Safety:</span> {c}
              </li>
            ))}
          </ul>
          {own && exercise.supported && (
            <p className="mt-1 text-xs font-medium text-ink">
              {own.complete ? "All done" : `${own.completed} of ${own.total} ${exercise.unit}${own.total === 1 ? "" : "s"} done`}
            </p>
          )}
        </div>
      </div>
      {exercise.supported ? (
        <>
          <ul className="mt-2 space-y-2">
            {exercise.sets.map((set) => (
              <SetRow key={set.id} exercise={exercise} set={set} record={records.get(set.id)} actions={actions} mode={mode} />
            ))}
          </ul>
          {mode === "active" && <RestTimer exerciseId={exercise.id} />}
        </>
      ) : (
        <div className="mt-2 rounded-lg border border-warn/60 bg-accent/10 p-2.5 text-sm text-ink">
          <p className="flex gap-1.5 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            As written: {formatTarget(exercise.sets[0].target)}
          </p>
          <p className="mt-1 text-xs text-ink-2">RuckOn couldn&apos;t read this prescription, so it can&apos;t be tracked set by set or counted toward completion.</p>
        </div>
      )}
    </li>
  );
}

function SectionView({ section, records, progress, actions, mode }: { section: WorkoutSection; records: Map<string, SetCompletion>; progress?: WorkoutProgress; actions?: WorkoutActions; mode: RowMode }) {
  const own = progress?.sections.find((s) => s.id === section.id);
  // The condensed Preparation Drill leaves most exercises out by design; only other exclusions are worth listing.
  const left = section.blockId === "pd-condensed" ? section.excluded.filter((x) => x.reason !== "plan") : section.excluded;
  return (
    <li className="rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{section.title}</h4>
        <span className="text-xs text-ink-2">about {section.minutes} min</span>
      </div>
      {own && own.total > 0 && (
        <div className="mt-2">
          <ProgressBar percent={own.percent} label={`${own.completed} of ${own.total} done in ${section.title}`} />
        </div>
      )}
      {left.length > 0 && <p className="mt-2 text-xs text-ink-2">Not included: {left.map((x) => `${x.name} (${reasonLabels[x.reason]})`).join(", ")}.</p>}
      <ul className="mt-2 space-y-2">
        {section.exercises.map((e) => (
          <ExerciseCard key={e.id} exercise={e} records={records} progress={progress} actions={actions} mode={mode} />
        ))}
      </ul>
      <details className="mt-2 text-xs text-ink-2">
        <summary className="cursor-pointer hover:text-ink">Sources and assumptions</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {section.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {section.assumptions.map((a) => (
            <li key={a}>RuckOn assumption: {a}</li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function PainReportForm({ onReport, compact = false }: { onReport: (notes: string) => ActionResult; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", compact ? "py-1.5" : "")}>
        <HeartPulse className="h-4 w-4 text-bad" aria-hidden />
        Report pain
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm">
      <p className="font-semibold text-ink">Report pain</p>
      <p className="mt-1 text-ink-2">
        This saves right away and pauses the whole plan. Sets you recorded are kept; you don&apos;t need to finish the workout.
      </p>
      <label className="mt-2 block">
        <span className="text-ink-2">Where and when (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className={inputClass} />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass("dark")}
          onClick={() => {
            const result = onReport(notes);
            setError(result.ok ? "" : result.error);
          }}
        >
          Report pain and pause plan
        </button>
        <button type="button" className={buttonClass("ghost")} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-medium text-bad">
          Not saved: {error}
        </p>
      )}
    </div>
  );
}

function CompletionForm({ readiness, actions }: { readiness: WorkoutReadiness; actions: WorkoutActions }) {
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [pain, setPain] = useState<"" | "yes" | "no">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const name = useId();
  const ready = readiness.status === "complete";

  const submit = () => {
    if (pain === "yes") {
      const result = actions.reportPain({ notes });
      return setError(result.ok ? "" : result.error);
    }
    if (!difficulty || pain !== "no") return;
    const result = actions.complete({ difficulty, notes });
    setError(result.ok ? "" : result.error);
  };

  return (
    <section aria-labelledby={`${name}-title`} className="rounded-lg border border-line-strong bg-surface p-3 text-sm">
      <h4 id={`${name}-title`} className="font-semibold text-ink">
        Finish workout
      </h4>
      {readiness.status === "incomplete" && <p className="mt-1 text-ink-2">Record every set to finish. {readiness.remaining} left.</p>}
      {readiness.status === "blocked" && (
        <div className="mt-1 text-ink">
          <p className="font-medium">This workout can&apos;t be completed in RuckOn:</p>
          <ul className="mt-1 list-disc pl-5 text-ink-2">
            {readiness.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <fieldset className="mt-3" disabled={!ready}>
        <legend className="font-medium text-ink">How hard was this session?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(difficultyLabels) as Difficulty[]).map((d) => (
            <label key={d} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${difficulty === d ? "border-ink" : "border-line"}`}>
              <input type="radio" name={`${name}-difficulty`} checked={difficulty === d} onChange={() => setDifficulty(d)} className="h-4 w-4 accent-[var(--color-control)]" />
              {difficultyLabels[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3" disabled={!ready}>
        <legend className="font-medium text-ink">Did you have pain during or after this session?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["no", "yes"] as const).map((v) => (
            <label key={v} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 ${pain === v ? "border-ink" : "border-line"}`}>
              <input type="radio" name={`${name}-pain`} checked={pain === v} onChange={() => setPain(v)} className="h-4 w-4 accent-[var(--color-control)]" />
              {v === "yes" ? "Yes" : "No"}
            </label>
          ))}
        </div>
        {pain === "yes" && <p className="mt-2 text-ink">Pain is saved as a pain report and pauses the plan. The workout isn&apos;t marked complete.</p>}
      </fieldset>
      <label className="mt-3 block">
        <span className="text-ink-2">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} disabled={!ready} className={inputClass} />
      </label>
      <button type="button" onClick={submit} disabled={!ready || !pain || (pain === "no" && !difficulty)} className={buttonClass(pain === "yes" ? "dark" : "primary", "mt-3")}>
        {pain === "yes" ? "Report pain and pause plan" : "Complete workout"}
      </button>
      {error && (
        <p role="alert" className="mt-2 font-medium text-bad">
          Not saved: {error}
        </p>
      )}
    </section>
  );
}

function Sections({ snapshot, records, progress, actions, mode }: { snapshot: WorkoutSnapshot; records: Map<string, SetCompletion>; progress?: WorkoutProgress; actions?: WorkoutActions; mode: RowMode }) {
  return (
    <div className="space-y-4">
      {(["warm-up", "main", "recovery"] as const).map((part) => {
        const sections = snapshot.sections.filter((s) => s.phase === part);
        if (!sections.length) return null;
        return (
          <div key={part}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{partLabels[part]}</h3>
            <ul className="mt-1.5 space-y-3">
              {sections.map((section) => (
                <SectionView key={section.id} section={section} records={records} progress={progress} actions={actions} mode={mode} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const phaseText = (s: WorkoutSnapshot) =>
  s.phase === "build" ? "Weeks 3–4 level" : s.progressionHeld ? "Weeks 1–2 level (held after an earlier session was rated too hard or painful)" : "Weeks 1–2 level";

// Why a workout can't be recorded right now, shown above a preview or a read-only workout.
function NotRecordable({ mode, reasons, onStart }: { mode: "preview" | "readonly"; reasons: string[]; onStart?: () => void }) {
  return (
    <div role="note" className="flex gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-2/60 p-3 text-sm text-ink">
      {mode === "preview" ? <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="space-y-1">
        <p className="font-semibold">{mode === "preview" ? "Preview only: sets can't be recorded here." : "Read-only: sets can't be recorded or changed now."}</p>
        {mode === "preview" && onStart && <p>Start the workout to record sets.</p>}
        {reasons.map((r) => (
          <p key={r} className="text-ink-2">
            {r}
          </p>
        ))}
        {onStart && (
          <button type="button" onClick={onStart} className={buttonClass("primary", "mt-1 min-h-11")}>
            <PlayCircle className="h-4 w-4" aria-hidden />
            Start workout
          </button>
        )}
      </div>
    </div>
  );
}

export default function WorkoutSession({
  view,
  actions,
  clock,
  notice,
  reasons = [],
  onStart,
}: {
  view: Exclude<WorkoutView, { mode: "untracked" }>;
  actions?: WorkoutActions;
  clock?: ClockActions;
  notice?: string;
  // From the session status engine: why a preview or a started workout can't be recorded now.
  reasons?: string[];
  onStart?: () => void;
}) {
  const snapshot = view.mode === "preview" ? view.snapshot : view.workout.snapshot;
  const records = view.mode === "preview" ? new Map<string, SetCompletion>() : view.records;
  const progress = view.mode === "preview" ? undefined : view.progress;
  const interactive = view.mode === "active" ? actions : undefined;
  const mode: RowMode = interactive ? "active" : view.mode === "preview" ? "preview" : "readonly";

  const body = (
    <div className="space-y-4">
      <div className="space-y-2">
        {mode === "preview" && <NotRecordable mode="preview" reasons={reasons} onStart={onStart} />}
        {view.mode === "stored" && <NotRecordable mode="readonly" reasons={reasons} />}
        <p className="text-xs text-ink-2">
          {view.mode === "preview"
            ? `The prescription this workout would start with. ${phaseText(snapshot)}.`
            : `Started ${formatInstantDate(view.workout.startedAt)}. The prescription is fixed from then: ${phaseText(snapshot)}.`}
        </p>
        {notice && (
          <p role="status" className="flex gap-1.5 rounded-lg border border-line bg-surface-2 p-2 text-xs text-ink">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {notice}
          </p>
        )}
        {(view.mode === "active" || view.mode === "stored") && (
          <WorkoutClock timer={view.workout.timer} estimatedMinutes={snapshot.estimatedMinutes} actions={interactive ? clock : undefined} />
        )}
        {progress && (
          <ProgressBar
            percent={progress.overall.percent}
            label={`Workout: ${progress.overall.completed} of ${progress.overall.total} done · ${progress.overall.exercisesCompleted} of ${progress.overall.exercisesTotal} exercises`}
          />
        )}
        {snapshot.unsupported.length > 0 && (
          <div role="alert" className="flex gap-2 rounded-lg border border-warn/60 bg-accent/10 p-3 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              {snapshot.unsupported.length === 1 ? "One part" : `${snapshot.unsupported.length} parts`} of this workout couldn&apos;t be read, so it can&apos;t be completed in
              RuckOn and later workouts stay locked. Ask your unit&apos;s H2F team before going on.
            </p>
          </div>
        )}
        <ul className="space-y-0.5 text-xs text-ink">
          {snapshot.safety.map((s) => (
            <li key={s} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
        {interactive && <PainReportForm onReport={(notes) => interactive.reportPain({ notes })} />}
      </div>

      <Sections snapshot={snapshot} records={records} progress={progress} actions={interactive} mode={mode} />

      {view.mode === "active" && interactive && <CompletionForm readiness={view.readiness} actions={interactive} />}
      {view.mode === "history" && (
        <div className="rounded-lg border border-line p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <CheckCircle2 className="h-4 w-4 text-good" aria-hidden />
            Completed {formatInstantDate(view.completion.completedAt)} · {difficultyLabels[view.completion.difficulty]}
            {view.completion.pain ? " · pain reported" : ""}
          </p>
          <p className="mt-1 text-ink-2">
            {view.workout.durationSeconds !== undefined
              ? `Workout time ${formatClock(view.workout.durationSeconds * 1000)} (estimated about ${snapshot.estimatedMinutes} min).`
              : "Workout time wasn't recorded for this workout."}
          </p>
          {view.completion.notes && <p className="mt-1 text-ink-2">{view.completion.notes}</p>}
        </div>
      )}
    </div>
  );
  // Exercise and rest timers share one slot per open workout, so two never run at once.
  return interactive ? <TimerProvider>{body}</TimerProvider> : body;
}
