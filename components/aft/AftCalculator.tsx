"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, Info } from "lucide-react";
import type { AftEventCode, AftStandard } from "@/lib/aft/types";
import { scoreAft } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import {
  emptyAftForm,
  localToday,
  validateAftForm,
  type AftFormField,
  type AftFormValues,
} from "@/lib/aft/validation";
import { saveAftResult } from "@/lib/storage/aftResults";
import { Card } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import AftResultSummary from "./AftResultSummary";

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saved"; id: string }
  | { kind: "duplicate"; id: string }
  | { kind: "error"; message: string };

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-2/60 focus:border-accent focus:outline-none";

export default function AftCalculator() {
  const [values, setValues] = useState<AftFormValues>(emptyAftForm);
  const [saveErrors, setSaveErrors] = useState<Partial<Record<AftFormField, string>>>({});
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const validation = validateAftForm(values);
  const result = validation.ok ? scoreAft(validation.input) : null;
  const errors = { ...(validation.ok ? {} : validation.errors), ...saveErrors };

  const update = (field: keyof AftFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setSaveErrors({});
    setStatus({ kind: "idle" });
  };

  // Show an error once the user has typed in that field; blank fields are simply "not done yet".
  const errorFor = (field: AftFormField, ...inputs: (keyof AftFormValues)[]) =>
    inputs.some((input) => values[input].trim() !== "") || saveErrors[field] ? errors[field] : undefined;

  const pointsFor = (event: AftEventCode) => result?.events.find((e) => e.event === event)?.points;

  const handleSave = () => {
    const today = localToday();
    const checked = validateAftForm(values, today);
    if (!checked.ok) {
      setSaveErrors(checked.errors);
      setStatus({ kind: "error", message: "Fix the highlighted fields before saving." });
      return;
    }
    const saved = saveAftResult({
      testDate: checked.testDate ?? today,
      input: checked.input,
      result: scoreAft(checked.input),
    });
    if (saved.ok) setStatus({ kind: "saved", id: saved.record.id });
    else if (saved.duplicate) setStatus({ kind: "duplicate", id: saved.duplicate.id });
    else setStatus({ kind: "error", message: saved.error });
  };

  const reset = () => {
    setValues(emptyAftForm);
    setSaveErrors({});
    setStatus({ kind: "idle" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()} noValidate>
        <Card title="Soldier details" description="Used to choose the score table.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Age on test date" error={errorFor("age", "age")}>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 25"
                value={values.age}
                onChange={(e) => update("age", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Standard" error={errors.standard}>
              <select
                value={values.standard}
                onChange={(e) => update("standard", e.target.value as AftStandard)}
                className={inputClass}
              >
                <option value="general">General</option>
                <option value="combat">Combat</option>
              </select>
            </Field>

            {values.standard === "general" ? (
              <Field label="Sex (score table)" error={errorFor("gender", "gender")}>
                <select
                  value={values.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </Field>
            ) : (
              <div className="text-sm">
                <p className="text-ink-2">Score table</p>
                <p className="mt-2.5 text-ink">Male | Combat (sex-neutral)</p>
              </div>
            )}

            <Field label="Test date" hint="Optional, defaults to today" error={errorFor("testDate", "testDate")}>
              <input
                type="date"
                value={values.testDate}
                onChange={(e) => update("testDate", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-ink-2">
            {aftStandardRules[values.standard].label}: {aftStandardRules[values.standard].description}
          </p>
        </Card>

        <Card title="Event results" description="Enter the raw result for each of the five events.">
          <div className="grid gap-4 sm:grid-cols-2">
            <EventCard name="3-rep max deadlift" hint="Heaviest weight lifted for 3 reps" points={pointsFor("MDL")}>
              <UnitInput
                label="Deadlift weight in pounds"
                unit="lb"
                placeholder="e.g. 200"
                value={values.deadlift}
                onChange={(v) => update("deadlift", v)}
              />
              <FieldError message={errorFor("deadlift", "deadlift")} />
            </EventCard>

            <EventCard name="Hand-release push-up" hint="Correct repetitions in 2 minutes" points={pointsFor("HRP")}>
              <UnitInput
                label="Hand-release push-up repetitions"
                unit="reps"
                placeholder="e.g. 35"
                value={values.pushups}
                onChange={(v) => update("pushups", v)}
              />
              <FieldError message={errorFor("pushups", "pushups")} />
            </EventCard>

            <EventCard name="Sprint-drag-carry" hint="Total time, lower is better" points={pointsFor("SDC")}>
              <TimeInput
                label="Sprint-drag-carry"
                minutes={values.sdcMinutes}
                seconds={values.sdcSeconds}
                onMinutes={(v) => update("sdcMinutes", v)}
                onSeconds={(v) => update("sdcSeconds", v)}
                example={["2", "05"]}
              />
              <FieldError message={errorFor("sdc", "sdcMinutes", "sdcSeconds")} />
            </EventCard>

            <EventCard name="Plank" hint="Time held, longer is better" points={pointsFor("PLK")}>
              <TimeInput
                label="Plank"
                minutes={values.plankMinutes}
                seconds={values.plankSeconds}
                onMinutes={(v) => update("plankMinutes", v)}
                onSeconds={(v) => update("plankSeconds", v)}
                example={["3", "00"]}
              />
              <FieldError message={errorFor("plank", "plankMinutes", "plankSeconds")} />
            </EventCard>

            <EventCard name="2-mile run" hint="Total time, lower is better" points={pointsFor("2MR")}>
              <TimeInput
                label="2-mile run"
                minutes={values.runMinutes}
                seconds={values.runSeconds}
                onMinutes={(v) => update("runMinutes", v)}
                onSeconds={(v) => update("runSeconds", v)}
                example={["17", "30"]}
              />
              <FieldError message={errorFor("run", "runMinutes", "runSeconds")} />
            </EventCard>
          </div>
        </Card>
      </form>

      <aside className="lg:sticky lg:top-6" aria-live="polite">
        <Card>
          {!result && (
            <div>
              <h2 className="text-base font-semibold text-ink">Result</h2>
              <p className="mt-2 text-sm text-ink-2">
                Your score appears here as soon as all Soldier details and five events are filled in.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-ink">
                  {status.kind === "saved" ? "Saved result" : "Result preview"}
                </h2>
                {status.kind === "saved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-good/10 px-2 py-0.5 text-xs font-semibold text-good">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Saved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-xs text-ink-2">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Not saved
                  </span>
                )}
              </div>

              <AftResultSummary result={result} />

              <div className="mt-5 border-t border-line pt-4">
                {status.kind === "saved" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-ink">Saved to your history in this browser.</p>
                    <div className="flex flex-wrap gap-2">
                      <ButtonLink href="/dashboard">View dashboard</ButtonLink>
                      <button type="button" onClick={reset} className={buttonClass("secondary")}>
                        Record another
                      </button>
                    </div>
                  </div>
                ) : status.kind === "duplicate" ? (
                  <p className="flex gap-2 text-sm text-ink">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <span>
                      This exact test is already saved.{" "}
                      <Link href={`/score-history#result-${status.id}`} className="text-accent underline">
                        View it in history
                      </Link>
                    </span>
                  </p>
                ) : (
                  <div className="space-y-2">
                    <button type="button" onClick={handleSave} className={buttonClass("primary", "w-full")}>
                      Save to history
                    </button>
                    <p className="text-xs text-ink-2">Saving stores this result in this browser only.</p>
                    {status.kind === "error" && (
                      <p role="alert" className="text-sm text-bad">
                        {status.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-2">{hint}</span>}
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-bad">{message}</span>;
}

function EventCard({
  name,
  hint,
  points,
  children,
}: {
  name: string;
  hint: string;
  points?: number;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-line bg-surface-2/40 p-4">
      <legend className="sr-only">{name}</legend>
      <div className="flex items-start justify-between gap-2">
        <p aria-hidden className="text-sm font-semibold text-ink">
          {name}
        </p>
        {points !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              points < 60 ? "bg-bad/10 text-bad" : "bg-accent/10 text-accent"
            }`}
          >
            {points} pts
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-2">{hint}</p>
      {children}
    </fieldset>
  );
}

function UnitInput({
  label,
  unit,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mt-3">
      <input
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} mt-0 pr-12`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-2">
        {unit}
      </span>
    </div>
  );
}

function TimeInput({
  label,
  minutes,
  seconds,
  onMinutes,
  onSeconds,
  example,
}: {
  label: string;
  minutes: string;
  seconds: string;
  onMinutes: (value: string) => void;
  onSeconds: (value: string) => void;
  example: [string, string];
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="relative flex-1">
        <input
          aria-label={`${label} minutes`}
          inputMode="numeric"
          autoComplete="off"
          placeholder={example[0]}
          value={minutes}
          onChange={(e) => onMinutes(e.target.value)}
          className={`${inputClass} mt-0 pr-10`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-2">min</span>
      </div>
      <span className="font-semibold text-ink-2" aria-hidden>
        :
      </span>
      <div className="relative flex-1">
        <input
          aria-label={`${label} seconds`}
          inputMode="numeric"
          autoComplete="off"
          placeholder={example[1]}
          value={seconds}
          onChange={(e) => onSeconds(e.target.value)}
          className={`${inputClass} mt-0 pr-10`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-2">sec</span>
      </div>
    </div>
  );
}
