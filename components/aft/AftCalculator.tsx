"use client";

import { useState } from "react";
import Link from "next/link";
import type { AftStandard } from "@/lib/aft/types";
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
import AftResultSummary from "./AftResultSummary";

type SaveStatus = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

const inputClass =
  "mt-2 w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white focus:border-yellow-400 focus:outline-none";

export default function AftCalculator() {
  const [values, setValues] = useState<AftFormValues>(emptyAftForm);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  const validation = validateAftForm(values);
  const result = validation.ok ? scoreAft(validation.input) : null;
  const errors = validation.ok ? {} : validation.errors;

  const update = (field: keyof AftFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setStatus({ kind: "idle" });
  };

  // Blank required fields only show an error after a save attempt.
  const errorFor = (field: AftFormField, ...inputs: (keyof AftFormValues)[]) => {
    const touched = inputs.some((input) => values[input].trim() !== "");
    return showAllErrors || touched ? errors[field] : undefined;
  };

  const handleSave = () => {
    const today = localToday();
    const checked = validateAftForm(values, today);
    if (!checked.ok) {
      setShowAllErrors(true);
      setStatus({ kind: "error", message: "Fix the highlighted fields before saving." });
      return;
    }
    const saved = saveAftResult({
      testDate: checked.testDate ?? today,
      input: checked.input,
      result: scoreAft(checked.input),
    });
    setStatus(saved.ok ? { kind: "saved" } : { kind: "error", message: saved.error });
  };

  return (
    <div className="space-y-6">
      <form
        className="rounded-2xl border border-yellow-500/20 bg-zinc-950 p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        noValidate
      >
        <fieldset className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <legend className="mb-4 text-lg font-black uppercase text-yellow-400">Soldier</legend>

          <Field label="Age on test date" error={errorFor("age", "age")}>
            <input
              inputMode="numeric"
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
              <option value="general">General (combat-enabling MOS)</option>
              <option value="combat">Combat (combat MOS)</option>
            </select>
          </Field>

          {values.standard === "general" ? (
            <Field label="Sex (for scoring table)" error={errorFor("gender", "gender")}>
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
            <p className="self-end pb-3 text-sm text-zinc-400">
              The combat standard is sex-neutral and uses the Male | Combat column.
            </p>
          )}

          <Field label="Test date (optional)" error={errorFor("testDate", "testDate")}>
            <input
              type="date"
              value={values.testDate}
              onChange={(e) => update("testDate", e.target.value)}
              className={inputClass}
            />
          </Field>
        </fieldset>

        <p className="mt-3 text-sm text-zinc-500">{aftStandardRules[values.standard].description}</p>

        <fieldset className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <legend className="mb-4 text-lg font-black uppercase text-yellow-400">Events</legend>

          <Field label="Deadlift (lb)" error={errorFor("deadlift", "deadlift")}>
            <input
              inputMode="numeric"
              value={values.deadlift}
              onChange={(e) => update("deadlift", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Hand-release push-ups" error={errorFor("pushups", "pushups")}>
            <input
              inputMode="numeric"
              value={values.pushups}
              onChange={(e) => update("pushups", e.target.value)}
              className={inputClass}
            />
          </Field>

          <TimeField
            label="Sprint-drag-carry"
            minutes={values.sdcMinutes}
            seconds={values.sdcSeconds}
            onMinutes={(v) => update("sdcMinutes", v)}
            onSeconds={(v) => update("sdcSeconds", v)}
            error={errorFor("sdc", "sdcMinutes", "sdcSeconds")}
          />

          <TimeField
            label="Plank"
            minutes={values.plankMinutes}
            seconds={values.plankSeconds}
            onMinutes={(v) => update("plankMinutes", v)}
            onSeconds={(v) => update("plankSeconds", v)}
            error={errorFor("plank", "plankMinutes", "plankSeconds")}
          />

          <TimeField
            label="2-mile run"
            minutes={values.runMinutes}
            seconds={values.runSeconds}
            onMinutes={(v) => update("runMinutes", v)}
            onSeconds={(v) => update("runSeconds", v)}
            error={errorFor("run", "runMinutes", "runSeconds")}
          />
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={status.kind === "saved"}
            className="rounded-xl bg-yellow-400 px-6 py-3 font-black uppercase text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save result
          </button>
          <button
            type="button"
            onClick={() => {
              setValues(emptyAftForm);
              setShowAllErrors(false);
              setStatus({ kind: "idle" });
            }}
            className="rounded-xl border border-zinc-700 px-6 py-3 font-bold uppercase text-zinc-300 hover:border-yellow-400 hover:text-yellow-400"
          >
            Clear
          </button>
          <p role="status" className="text-sm">
            {status.kind === "saved" && (
              <span className="text-green-400">
                Saved on this device.{" "}
                <Link href="/score-history" className="underline">
                  View score history
                </Link>
              </span>
            )}
            {status.kind === "error" && <span className="text-red-400">{status.message}</span>}
          </p>
        </div>
      </form>

      {result ? (
        <AftResultSummary result={result} />
      ) : (
        <p className="rounded-2xl border border-zinc-800 p-6 text-zinc-400">
          Enter your age, standard, and all five event results to see your score.
        </p>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase text-zinc-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  );
}

function TimeField({
  label,
  minutes,
  seconds,
  onMinutes,
  onSeconds,
  error,
}: {
  label: string;
  minutes: string;
  seconds: string;
  onMinutes: (value: string) => void;
  onSeconds: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold uppercase text-zinc-400">{label} (mm:ss)</legend>
      <div className="flex items-center gap-2">
        <input
          aria-label={`${label} minutes`}
          inputMode="numeric"
          placeholder="min"
          value={minutes}
          onChange={(e) => onMinutes(e.target.value)}
          className={inputClass}
        />
        <span className="mt-2 font-black text-zinc-500">:</span>
        <input
          aria-label={`${label} seconds`}
          inputMode="numeric"
          placeholder="sec"
          value={seconds}
          onChange={(e) => onSeconds(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </fieldset>
  );
}
