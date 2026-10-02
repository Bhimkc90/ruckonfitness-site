"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Calculator, CheckCircle2, History, RotateCcw } from "lucide-react";
import type { AftEventCode, AftInput, AftResult, AftStandard } from "@/lib/aft/types";
import { scoreAft } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { emptyAftForm, localToday, validateAftForm, type AftFormField, type AftFormValues } from "@/lib/aft/validation";
import { saveAftResult } from "@/lib/storage/aftResults";
import { useProfile } from "@/lib/storage/profile";
import { applyCalculatorDefaults, calculatorDefaults, type CalculatorProfileField } from "@/lib/profile/profile";
import { useToday } from "@/components/training/PlanParts";
import { Card } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { fieldFocus } from "@/components/ui/form";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import AftResultReport from "./AftResultReport";
import InstructionsDrawer from "./InstructionsDrawer";

// Event names and guide links, passed from the server page so the calculator stays in step with the AFT Guide.
export type CalculatorEvent = { code: AftEventCode; slug: string; order: number; name: string; abbreviation: string };

type TimeFields = { minutes: keyof AftFormValues; seconds: keyof AftFormValues; error: "sdc" | "plank" | "run" };

type Panel = { code: AftEventCode; hint: string } & (
  | { kind: "count"; field: "deadlift" | "pushups"; unit: string; unitLabel: string; placeholder: string }
  | { kind: "time"; fields: TimeFields }
);

const PANELS: Panel[] = [
  { code: "MDL", kind: "count", field: "deadlift", unit: "lb", unitLabel: "Weight (pounds)", placeholder: "e.g. 200", hint: "Heaviest weight lifted for 3 correct repetitions, in whole pounds." },
  { code: "HRP", kind: "count", field: "pushups", unit: "reps", unitLabel: "Repetitions", placeholder: "e.g. 35", hint: "Correct repetitions completed in 2 minutes." },
  { code: "SDC", kind: "time", fields: { minutes: "sdcMinutes", seconds: "sdcSeconds", error: "sdc" }, hint: "Total time; lower is better. Seconds 0–59, e.g. 2 : 05." },
  { code: "PLK", kind: "time", fields: { minutes: "plankMinutes", seconds: "plankSeconds", error: "plank" }, hint: "Time held; longer is better. Use 0 minutes if under a minute." },
  { code: "2MR", kind: "time", fields: { minutes: "runMinutes", seconds: "runSeconds", error: "run" }, hint: "Total time; lower is better. Seconds 0–59, e.g. 17 : 30." },
];

// Each error's field in form order, for moving focus to the first problem after Calculate.
const FOCUS_ORDER: [AftFormField, string][] = [
  ["age", "aft-age"],
  ["gender", "aft-gender"],
  ["testDate", "aft-date"],
  ["deadlift", "aft-deadlift"],
  ["pushups", "aft-pushups"],
  ["sdc", "aft-sdc-min"],
  ["plank", "aft-plank-min"],
  ["run", "aft-run-min"],
];

// The entries a result was calculated from. If the form no longer matches, the result is out of date.
type Calculation = { values: AftFormValues; input: AftInput; result: AftResult; testDate: string };
type SaveState = { kind: "saved" | "duplicate"; id: string } | { kind: "error"; message: string } | null;

const sameValues = (a: AftFormValues, b: AftFormValues) => (Object.keys(a) as (keyof AftFormValues)[]).every((k) => a[k] === b[k]);

const fieldClass = `rounded-lg border bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-2/70 sm:text-sm ${fieldFocus}`;
const borderFor = (error?: string) => (error ? "border-bad" : "border-line-strong");

export default function AftCalculator({ events, guides }: { events: CalculatorEvent[]; guides: Record<AftEventCode, React.ReactNode> }) {
  const profile = useProfile();
  const today = useToday();
  const [entered, setValues] = useState<AftFormValues>(emptyAftForm);
  // Soldier details the user has typed for this test. Untouched ones come from the profile.
  const [overridden, setOverridden] = useState<CalculatorProfileField[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [save, setSave] = useState<SaveState>(null);
  const [instructions, setInstructions] = useState<AftEventCode | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<"results" | "start" | null>(null);

  const defaults = calculatorDefaults(profile, entered.testDate || today || "");
  const { values, fromProfile } = applyCalculatorDefaults(entered, defaults, overridden);
  const prefilled = (field: CalculatorProfileField) => fromProfile.includes(field);

  // Errors show once a field has content, or for every field after Calculate is pressed.
  const validation = validateAftForm(values, today ?? undefined);
  const errors = validation.ok ? {} : validation.errors;
  const errorFor = (field: AftFormField, ...inputs: (keyof AftFormValues)[]) =>
    attempted || inputs.some((input) => values[input].trim() !== "") ? errors[field] : undefined;

  const outdated = calculation !== null && !sameValues(calculation.values, values);
  const savedId = save && save.kind !== "error" ? save.id : null;

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = target === "results" ? resultsHeading.current : document.getElementById("aft-age");
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [calculation]);

  const update = (field: keyof AftFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if ((field === "age" || field === "standard" || field === "gender") && !overridden.includes(field)) {
      setOverridden([...overridden, field]);
    }
    if (save?.kind === "error") setSave(null);
  };

  const calculate = () => {
    const now = localToday();
    const checked = validateAftForm(values, now);
    setAttempted(true);
    if (!checked.ok) {
      const count = Object.keys(checked.errors).length;
      setAnnouncement(`Not calculated. ${count} ${count === 1 ? "field needs" : "fields need"} attention.`);
      const first = FOCUS_ORDER.find(([field]) => checked.errors[field]);
      if (first) document.getElementById(first[1])?.focus();
      return;
    }
    setCalculation({ values, input: checked.input, result: scoreAft(checked.input), testDate: checked.testDate ?? now });
    setSave(null);
    setAnnouncement("Results calculated.");
    pendingFocus.current = "results";
  };

  // Only a current, not-yet-saved calculation can be saved; storage also refuses an identical test.
  const saveResult = () => {
    if (!calculation || outdated || savedId) return;
    const saved = saveAftResult({ testDate: calculation.testDate, input: calculation.input, result: calculation.result });
    if (saved.ok) setSave({ kind: "saved", id: saved.record.id });
    else if (saved.duplicate) setSave({ kind: "duplicate", id: saved.duplicate.id });
    else setSave({ kind: "error", message: saved.error });
  };

  const recordAnother = () => {
    setValues(emptyAftForm);
    setOverridden([]);
    setAttempted(false);
    setCalculation(null);
    setSave(null);
    setAnnouncement("Form cleared for a new test.");
    pendingFocus.current = "start";
  };

  const rule = aftStandardRules[values.standard];

  return (
    <div className="space-y-6">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          calculate();
        }}
        className="space-y-6"
      >
        <Card title="Soldier details" description="Chooses the score table.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="aft-age" label="Age on test date" hint={prefilled("age") ? "From your profile's date of birth" : "Whole years, 17 or older"} error={errorFor("age", "age")}>
              {(describedBy, error) => (
                <input
                  id="aft-age"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 25"
                  value={values.age}
                  onChange={(e) => update("age", e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  className={`${fieldClass} ${borderFor(error)} w-full`}
                />
              )}
            </Field>

            <Field id="aft-standard" label="Standard" hint={prefilled("standard") ? "From your profile" : rule.description} error={errors.standard}>
              {(describedBy) => (
                <select
                  id="aft-standard"
                  value={values.standard}
                  onChange={(e) => update("standard", e.target.value as AftStandard)}
                  aria-describedby={describedBy}
                  className={`${fieldClass} w-full border-line-strong`}
                >
                  <option value="general">General</option>
                  <option value="combat">Combat</option>
                </select>
              )}
            </Field>

            {values.standard === "general" ? (
              <Field id="aft-gender" label="Sex (score table)" hint={prefilled("gender") ? "From your profile" : "Required for the general standard"} error={errorFor("gender", "gender")}>
                {(describedBy, error) => (
                  <select
                    id="aft-gender"
                    value={values.gender}
                    onChange={(e) => update("gender", e.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    className={`${fieldClass} ${borderFor(error)} w-full`}
                  >
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                )}
              </Field>
            ) : (
              <div className="text-sm">
                <p className="font-medium text-ink">Score table</p>
                <p className="mt-1.5 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-ink">Male | Combat (sex-neutral)</p>
              </div>
            )}

            <Field id="aft-date" label="Test date" hint="Optional. Defaults to today." error={errorFor("testDate", "testDate")}>
              {(describedBy, error) => (
                <input
                  id="aft-date"
                  type="date"
                  value={values.testDate}
                  onChange={(e) => update("testDate", e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  className={`${fieldClass} ${borderFor(error)} w-full`}
                />
              )}
            </Field>
          </div>
          <p className="mt-3 text-xs text-ink-2">
            {Object.keys(defaults).length > 0 ? (
              <>
                Details marked &ldquo;From your profile&rdquo; are prefilled. Changing them applies to this test only; your{" "}
                <Link href="/profile" className="font-medium text-accent-ink underline">
                  profile
                </Link>{" "}
                isn&apos;t changed.
              </>
            ) : (
              <>
                Save your date of birth and standard in your{" "}
                <Link href="/profile" className="font-medium text-accent-ink underline">
                  profile
                </Link>{" "}
                to fill these in automatically.
              </>
            )}
          </p>
        </Card>

        <section aria-labelledby="events-title" className="space-y-3">
          <div>
            <h2 id="events-title" className="text-lg font-bold text-ink">
              Event results
            </h2>
            <p className="text-sm text-ink-2">Enter each raw result. Every field is required; a blank is never counted as zero.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PANELS.map((panel) => {
              const event = events.find((e) => e.code === panel.code)!;
              const hintId = `aft-${panel.code}-hint`;
              return (
                <EventPanel key={panel.code} event={event} onInstructions={() => setInstructions(panel.code)}>
                  {panel.kind === "count" ? (
                    <CountInput
                      id={`aft-${panel.field}`}
                      label={panel.unitLabel}
                      unit={panel.unit}
                      placeholder={panel.placeholder}
                      value={values[panel.field]}
                      onChange={(v) => update(panel.field, v)}
                      hint={panel.hint}
                      hintId={hintId}
                      error={errorFor(panel.field, panel.field)}
                    />
                  ) : (
                    <TimeInput
                      idBase={`aft-${panel.fields.error}`}
                      eventName={event.name}
                      minutes={values[panel.fields.minutes]}
                      seconds={values[panel.fields.seconds]}
                      onMinutes={(v) => update(panel.fields.minutes, v)}
                      onSeconds={(v) => update(panel.fields.seconds, v)}
                      hint={panel.hint}
                      hintId={hintId}
                      error={errorFor(panel.fields.error, panel.fields.minutes, panel.fields.seconds)}
                    />
                  )}
                </EventPanel>
              );
            })}

            <div className="flex flex-col justify-center gap-3 rounded-xl border-2 border-ink bg-surface p-4 shadow-sm sm:p-5">
              <button type="submit" className={buttonClass("primary", "w-full py-3 text-base")}>
                <Calculator className="h-5 w-5" aria-hidden />
                {outdated ? "Recalculate results" : "Calculate results"}
              </button>
              <p className="text-xs text-ink-2">
                Scores use the official tables effective 1 June 2025. Nothing is saved until you choose <strong className="text-ink">Save result</strong>.
              </p>
              {attempted && !validation.ok && (
                <p className="flex gap-1.5 text-sm font-medium text-bad">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Fix the highlighted fields to calculate.
                </p>
              )}
            </div>
          </div>
        </section>
      </form>

      <section aria-labelledby="results-title" className="rounded-xl border border-card-line bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="results-title" ref={resultsHeading} tabIndex={-1} className="scroll-mt-32 text-lg font-bold text-ink lg:scroll-mt-6">
            Results
          </h2>
          {calculation && <ResultStatus outdated={outdated} saved={savedId !== null} />}
        </div>

        {!calculation ? (
          <p className="mt-2 text-sm text-ink-2">Your total, pass or fail status, and event breakdown appear here after you calculate.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {outdated && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-warn bg-accent/15 p-3">
                <p className="flex gap-2 text-sm font-medium text-ink">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
                  You changed the entries after calculating. These results are out of date; recalculate before saving.
                </p>
                <button type="button" onClick={calculate} className={buttonClass("primary", "px-3 py-1.5")}>
                  <Calculator className="h-4 w-4" aria-hidden />
                  Recalculate
                </button>
              </div>
            )}

            {/* Out-of-date results keep full contrast; the dashed frame, banner, and badge mark them instead of fading. */}
            <div className={outdated ? "rounded-lg border-2 border-dashed border-warn p-3 sm:p-4" : undefined}>
              <AftResultReport events={events} result={calculation.result} input={calculation.input} testDate={calculation.testDate} savedId={savedId} />
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-start">
              {savedId ? (
                <p role="status" className="flex items-start gap-2 text-sm font-medium text-ink sm:mr-auto">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-hidden />
                  <span>
                    {save?.kind === "duplicate" ? "This exact test was already in your history, so it wasn't saved again." : "Saved to your history in this browser."}{" "}
                    <Link href={`/score-history#result-${savedId}`} className="font-semibold text-accent-ink underline">
                      View in history
                    </Link>
                  </span>
                </p>
              ) : (
                <div className="sm:mr-auto">
                  <button type="button" onClick={saveResult} disabled={outdated} className={buttonClass("dark", "w-full sm:w-auto")}>
                    Save result
                  </button>
                  <p className="mt-1 text-xs text-ink-2">
                    {outdated ? "Recalculate to save the current entries." : "Stores this result in this browser only."}
                  </p>
                </div>
              )}
              {savedId && TRAINING_PLANS_ENABLED && (
                <ButtonLink href={`/training-plan/new?baseline=${savedId}`} variant="secondary">
                  Suggest training plan
                </ButtonLink>
              )}
              <button type="button" onClick={recordAnother} className={buttonClass("secondary")}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Record another test
              </button>
            </div>
            {save?.kind === "error" && (
              <p role="alert" className="flex gap-2 text-sm text-bad">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {save.message}
              </p>
            )}
          </div>
        )}
      </section>

      <InstructionsDrawer events={events} guides={guides} openEvent={instructions} onClose={() => setInstructions(null)} />
    </div>
  );
}

function ResultStatus({ outdated, saved }: { outdated: boolean; saved: boolean }) {
  if (outdated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warn bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-ink">
        <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-hidden />
        Out of date
      </span>
    );
  }
  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-good/10 px-2.5 py-0.5 text-xs font-semibold text-good">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-medium text-ink-2">
      <History className="h-3.5 w-3.5" aria-hidden />
      Not saved yet
    </span>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (describedBy: string | undefined, error?: string) => React.ReactNode;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      <div className="mt-1.5">{children(error ? errorId : hint ? hintId : undefined, error)}</div>
      {error ? (
        <FieldError id={errorId} message={error} />
      ) : (
        hint && (
          <p id={hintId} className="mt-1 text-xs text-ink-2">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1.5 flex gap-1 text-xs font-medium text-bad">
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function EventPanel({ event, onInstructions, children }: { event: CalculatorEvent; onInstructions: () => void; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-xl border border-card-line bg-surface p-4 shadow-sm sm:p-5">
      <legend className="sr-only">
        Event {event.order}: {event.name} ({event.abbreviation})
      </legend>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3" aria-hidden>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-canvas">{event.order}</span>
          <div className="min-w-0">
            <p className="font-bold leading-snug text-ink">{event.name}</p>
            <p className="text-xs font-semibold tracking-wide text-ink-2">{event.abbreviation}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onInstructions}
          aria-haspopup="dialog"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-ink"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Instructions
          <span className="sr-only">for the {event.name}</span>
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

function CountInput({
  id,
  label,
  unit,
  placeholder,
  value,
  onChange,
  hint,
  hintId,
  error,
}: {
  id: string;
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  hintId: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5 w-40">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hintId}
          className={`${fieldClass} ${borderFor(error)} w-full pr-12 tabular-nums`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-ink-2" aria-hidden>
          {unit}
        </span>
      </div>
      {error ? (
        <FieldError id={errorId} message={error} />
      ) : (
        <p id={hintId} className="mt-1.5 text-xs text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}

function TimeInput({
  idBase,
  eventName,
  minutes,
  seconds,
  onMinutes,
  onSeconds,
  hint,
  hintId,
  error,
}: {
  idBase: string;
  eventName: string;
  minutes: string;
  seconds: string;
  onMinutes: (value: string) => void;
  onSeconds: (value: string) => void;
  hint: string;
  hintId: string;
  error?: string;
}) {
  const errorId = `${idBase}-error`;
  const describedBy = error ? errorId : hintId;
  const part = (which: "min" | "sec", label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <div>
      <label htmlFor={`${idBase}-${which}`} className="font-medium text-ink">
        {label}
        <span className="sr-only">, {eventName}</span>
      </label>
      <input
        id={`${idBase}-${which}`}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${fieldClass} ${borderFor(error)} mt-1.5 block w-24 tabular-nums`}
      />
    </div>
  );
  return (
    <div className="text-sm">
      <div className="flex items-end gap-2">
        {part("min", "Minutes", minutes, onMinutes, "mm")}
        <span className="pb-2 text-lg font-bold text-ink-2" aria-hidden>
          :
        </span>
        {part("sec", "Seconds", seconds, onSeconds, "ss")}
      </div>
      {error ? (
        <FieldError id={errorId} message={error} />
      ) : (
        <p id={hintId} className="mt-1.5 text-xs text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}
