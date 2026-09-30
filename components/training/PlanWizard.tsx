"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { aftStandardRules } from "@/lib/aft/rules";
import { describeCategory, formatTestDate } from "@/lib/aft/format";
import { categoryOf, sortByTestDate } from "@/lib/aft/progress";
import { useAftResults, useHydrated } from "@/lib/storage/aftResults";
import { useProfile } from "@/lib/storage/profile";
import { planPrefill } from "@/lib/profile/profile";
import { activePlan, startPlan, updateTrainingData, useTrainingData } from "@/lib/storage/trainingPlans";
import { WEEKDAYS, generatePlan, weekdayLabels } from "@/lib/training/engine";
import type {
  DaysPerWeek,
  PlanOutcome,
  PreferenceAnswers,
  RunningVolume,
  Screening,
  SessionMinutes,
  WeekdayId,
} from "@/lib/training/types";
import { Card } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { PassFailBadge } from "@/components/ui/StatusBadge";
import { PlanDisclaimer, useToday } from "./PlanParts";
import PlanPreview from "./PlanPreview";
import { equipmentOptions, experienceOptions, restrictionOptions, runningOptions } from "@/lib/training/options";

type Step = "baseline" | "screening" | "preferences" | "review";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

// Answers the AFT score cannot establish start unanswered so the user has to choose them.
const initialPrefs: PreferenceAnswers = {
  daysPerWeek: 3,
  weekdays: ["mon", "wed", "fri"],
  sessionMinutes: 45,
  equipment: null,
  runningAccess: null,
  experience: null,
  recentRunning: null,
  restrictions: [],
};

export default function PlanWizard() {
  const hydrated = useHydrated();
  const results = useAftResults();
  const training = useTrainingData();
  const profile = useProfile();
  const today = useToday();
  const router = useRouter();
  const params = useSearchParams();

  const saved = [...sortByTestDate(results)].reverse();
  const requested = params.get("baseline");
  const [step, setStep] = useState<Step>("baseline");
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [screening, setScreening] = useState<Screening>({ currentPain: null, otherInstructions: "" });
  // Null until the user changes something; until then the answers come from the profile.
  const [editedPrefs, setPrefs] = useState<PreferenceAnswers | null>(null);
  const [editedAftDate, setAftDate] = useState<string | null>(null);
  const [editedTarget, setTarget] = useState<string | null>(null);
  const [prefsConfirmed, setPrefsConfirmed] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!hydrated || !today) return <div className="h-40 rounded-xl border border-line bg-surface" aria-busy="true" aria-label="Loading" />;

  if (saved.length === 0) {
    return (
      <Card className="max-w-2xl">
        <p className="text-sm text-ink">A training plan starts from a saved AFT result, and this browser has none yet.</p>
        <ButtonLink href="/aft-calculator" className="mt-4">
          Record AFT
        </ButtonLink>
      </Card>
    );
  }

  const prefill = planPrefill(profile);
  const prefs: PreferenceAnswers = editedPrefs ?? { ...initialPrefs, ...prefill.answers };
  const aftDate = editedAftDate ?? prefill.nextAftDate ?? "";
  const target = editedTarget ?? (prefill.targetScore !== undefined ? String(prefill.targetScore) : "");
  const needsConfirmation = prefill.fields > 0 && !prefsConfirmed;

  const selectedId = baselineId ?? (saved.some((r) => r.id === requested) ? requested! : saved[0].id);
  const selected = saved.find((r) => r.id === selectedId) ?? saved[0];
  const start = startDate || today;
  const fullPrefs: PreferenceAnswers = {
    ...prefs,
    ...(aftDate ? { nextAftDate: aftDate } : {}),
    ...(target.trim() !== "" ? { targetScore: Number(target) } : {}),
  };
  const outcome: PlanOutcome = generatePlan({
    baseline: { resultId: selected.id, testDate: selected.testDate, input: selected.input, result: selected.result },
    prefs: fullPrefs,
    screening,
    startDate: start,
  });
  const existing = activePlan(training);

  const set = <K extends keyof PreferenceAnswers>(key: K, value: PreferenceAnswers[K]) => setPrefs((p) => ({ ...(p ?? prefs), [key]: value }));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const handleStart = () => {
    if (outcome.status !== "ready") return;
    const result = updateTrainingData((data) =>
      startPlan(data, outcome.plan, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), startDate: start })
    );
    if (result.ok) router.push("/training-plan");
    else setSaveError(result.error);
  };

  const steps: { id: Step; label: string }[] = [
    { id: "baseline", label: "Baseline" },
    { id: "screening", label: "Health check" },
    { id: "preferences", label: "Preferences" },
    { id: "review", label: "Review" },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);
  const back = stepIndex > 0 ? () => setStep(steps[stepIndex - 1].id) : undefined;

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Steps">
        {steps.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.id === step ? "step" : undefined}
            className={`rounded-full px-3 py-1 ${s.id === step ? "bg-accent font-semibold text-black" : i < stepIndex ? "bg-surface-2 text-ink" : "bg-surface text-ink-2"}`}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {step === "baseline" && (
        <Card title="Choose your baseline test" description="The plan keeps a copy of this result, so later tests won't change it.">
          <fieldset>
            <legend className="sr-only">Saved AFT results</legend>
            <ul className="space-y-2">
              {saved.map((r) => (
                <li key={r.id}>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${r.id === selectedId ? "border-accent" : "border-line"}`}>
                    <input type="radio" name="baseline" value={r.id} checked={r.id === selectedId} onChange={() => setBaselineId(r.id)} className="accent-[var(--color-accent)]" />
                    <span className="flex-1">
                      <span className="font-medium text-ink">{formatTestDate(r.testDate)}</span>
                      <span className="block text-xs text-ink-2">{describeCategory(categoryOf(r.result))}</span>
                    </span>
                    <span className="font-semibold text-ink">{r.result.total}</span>
                    <PassFailBadge passed={r.result.passed} />
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-4 flex justify-end">
            <button type="button" className={buttonClass()} onClick={() => setStep("screening")}>
              Continue
            </button>
          </div>
        </Card>
      )}

      {step === "screening" && (
        <Card title="Health check" description="RuckOn does not ask for diagnoses and does not interpret medical profiles.">
          <fieldset>
            <legend className="text-sm text-ink">Do you currently have pain that limits exercise, or have you been told not to train?</legend>
            <div className="mt-2 flex gap-4 text-sm">
              {[
                ["no", false],
                ["yes", true],
              ].map(([label, value]) => (
                <label key={String(label)} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pain"
                    checked={screening.currentPain === value}
                    onChange={() => setScreening((s) => ({ ...s, currentPain: value as boolean }))}
                    className="accent-[var(--color-accent)]"
                  />
                  {label === "no" ? "No" : "Yes"}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm">
            <span className="text-ink">Other restrictions or profile instructions you must follow (optional)</span>
            <span className="mt-0.5 block text-xs text-ink-2">
              RuckOn can&apos;t interpret written instructions. If you enter anything here, you&apos;ll be pointed to a review instead of a plan.
              Movements to avoid can be selected on the next step.
            </span>
            <textarea
              value={screening.otherInstructions}
              onChange={(e) => setScreening((s) => ({ ...s, otherInstructions: e.target.value }))}
              rows={3}
              maxLength={500}
              className={inputClass}
            />
          </label>
          {screening.currentPain === true && (
            <p role="alert" className="mt-4 flex gap-2 rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
              RuckOn won&apos;t create a plan while you have pain that limits exercise. Talk to a medical provider or your unit&apos;s H2F team before
              training.
            </p>
          )}
          <StepButtons back={back} next={() => setStep("preferences")} disabled={screening.currentPain !== false} />
        </Card>
      )}

      {step === "preferences" && (
        <Card title="Preferences" description="Only what the plan needs.">
          {prefill.fields > 0 && (
            <p className="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-ink">
              {prefill.fields} {prefill.fields === 1 ? "answer was" : "answers were"} prefilled from your{" "}
              <Link href="/profile" className="underline">
                profile
              </Link>
              . Check each one before continuing. Changes here apply to this plan only and don&apos;t change your profile.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-2">Training days per week</span>
              <select
                value={prefs.daysPerWeek}
                onChange={(e) => set("daysPerWeek", Number(e.target.value) as DaysPerWeek)}
                className={inputClass}
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-sm">
              <legend className="text-ink-2">Session length</legend>
              <div className="mt-2 flex gap-4">
                {([30, 45, 60] as SessionMinutes[]).map((m) => (
                  <label key={m} className="flex items-center gap-2">
                    <input type="radio" name="minutes" checked={prefs.sessionMinutes === m} onChange={() => set("sessionMinutes", m)} className="accent-[var(--color-accent)]" />
                    {m} min
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="text-sm md:col-span-2">
              <legend className="text-ink-2">
                Preferred weekdays ({prefs.weekdays.length} of {prefs.daysPerWeek} chosen)
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <label key={d} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${prefs.weekdays.includes(d) ? "border-accent" : "border-line"}`}>
                    <input
                      type="checkbox"
                      checked={prefs.weekdays.includes(d)}
                      onChange={() => set("weekdays", toggle<WeekdayId>(prefs.weekdays, d))}
                      className="accent-[var(--color-accent)]"
                    />
                    {weekdayLabels[d].slice(0, 3)}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="text-sm">
              <legend className="text-ink-2">
                Equipment you can use <Required show={prefs.equipment === null} />
              </legend>
              <div className="mt-2 space-y-1.5">
                {equipmentOptions.map((o) => (
                  <label key={o.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!prefs.equipment?.includes(o.value)}
                      onChange={() => set("equipment", toggle(prefs.equipment ?? [], o.value))}
                      className="accent-[var(--color-accent)]"
                    />
                    {o.label}
                  </label>
                ))}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefs.equipment !== null && prefs.equipment.length === 0}
                    onChange={() => set("equipment", prefs.equipment !== null && prefs.equipment.length === 0 ? null : [])}
                    className="accent-[var(--color-accent)]"
                  />
                  No equipment
                </label>
              </div>
            </fieldset>
            <fieldset className="text-sm">
              <legend className="text-ink-2">
                Do you have a safe place to run (track or measured route)? <Required show={prefs.runningAccess === null} />
              </legend>
              <div className="mt-2 flex gap-4">
                {[
                  ["Yes", true],
                  ["No", false],
                ].map(([label, value]) => (
                  <label key={String(label)} className="flex items-center gap-2">
                    <input type="radio" name="running-access" checked={prefs.runningAccess === value} onChange={() => set("runningAccess", value as boolean)} className="accent-[var(--color-accent)]" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="text-sm">
              <legend className="text-ink-2">
                Current training experience <Required show={prefs.experience === null} />
              </legend>
              <div className="mt-2 space-y-1.5">
                {experienceOptions.map((o) => (
                  <label key={o.value} className="flex items-start gap-2">
                    <input type="radio" name="experience" checked={prefs.experience === o.value} onChange={() => set("experience", o.value)} className="mt-1 accent-[var(--color-accent)]" />
                    <span>
                      {o.label}
                      <span className="block text-xs text-ink-2">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              <span className="text-ink-2">
                Running in the last 4 weeks, on average <Required show={prefs.recentRunning === null} />
              </span>
              <select
                value={prefs.recentRunning ?? ""}
                onChange={(e) => set("recentRunning", e.target.value ? (e.target.value as RunningVolume) : null)}
                className={inputClass}
              >
                <option value="">Choose</option>
                {runningOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-sm">
              <legend className="text-ink-2">Movements you must avoid, or have been told to avoid</legend>
              <div className="mt-2 space-y-1.5">
                {restrictionOptions.map((o) => (
                  <label key={o.value} className="flex items-start gap-2">
                    <input type="checkbox" checked={prefs.restrictions.includes(o.value)} onChange={() => set("restrictions", toggle(prefs.restrictions, o.value))} className="mt-1 accent-[var(--color-accent)]" />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">
              <span className="text-ink-2">Next AFT date (optional)</span>
              <input type="date" value={aftDate} onChange={(e) => setAftDate(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Target total score (optional)</span>
              <input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 400" className={inputClass} />
            </label>
          </div>
          {prefill.fields > 0 && (
            <label className="mt-5 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={prefsConfirmed} onChange={() => setPrefsConfirmed(!prefsConfirmed)} className="mt-1 accent-[var(--color-accent)]" />
              I&apos;ve checked these preferences and they are current.
            </label>
          )}
          <StepButtons back={back} next={() => setStep("review")} nextLabel="Review suggested plan" disabled={needsConfirmation} />
        </Card>
      )}

      {step === "review" && (
        <div className="space-y-5">
          {outcome.status === "invalid" && (
            <Card title="A few details are missing">
              <ul className="list-disc space-y-1 pl-5 text-sm text-bad">
                {outcome.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <StepButtons back={back} />
            </Card>
          )}
          {outcome.status === "paused" && (
            <Card title="Plan paused">
              <p className="text-sm text-ink">{outcome.message}</p>
              <StepButtons back={() => setStep("screening")} />
            </Card>
          )}
          {(outcome.status === "needs-review" || outcome.status === "not-possible") && (
            <Card title={outcome.status === "needs-review" ? "Review needed before a plan" : "RuckOn can't build a safe plan for these constraints"}>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
                {outcome.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <StepButtons back={back} />
            </Card>
          )}
          {outcome.status === "ready" && (
            <>
              <PlanDisclaimer />
              <PlanPreview plan={outcome.plan} startDate={start} />
              <Card title="Start the plan">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-ink-2">Start date</span>
                    <input type="date" value={start} min={today} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </label>
                  {existing && (
                    <p className="self-end text-xs text-ink-2">
                      Starting this plan ends your current plan from {formatTestDate(existing.baseline.testDate)}. Its completion history is kept.
                    </p>
                  )}
                </div>
                <label className="mt-4 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={acknowledged} onChange={() => setAcknowledged(!acknowledged)} className="mt-1 accent-[var(--color-accent)]" />
                  I understand this is a general suggestion that has not been professionally reviewed, and that I should stop and seek advice if I have pain.
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {back && (
                    <button type="button" onClick={back} className={buttonClass("secondary")}>
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      Back
                    </button>
                  )}
                  <button type="button" onClick={handleStart} disabled={!acknowledged || start < today} className={buttonClass()}>
                    Start plan
                  </button>
                  {saveError && (
                    <p role="alert" className="text-sm text-bad">
                      {saveError}
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-ink-2">
        {aftStandardRules[selected.result.standard].label} standard baseline from {formatTestDate(selected.testDate)}.{" "}
        <Link href="/score-history" className="underline">
          View history
        </Link>
      </p>
    </div>
  );
}

function Required({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-1 text-xs font-medium text-accent">Required</span>;
}

function StepButtons({ back, next, disabled, nextLabel = "Continue" }: { back?: () => void; next?: () => void; disabled?: boolean; nextLabel?: string }) {
  return (
    <div className="mt-5 flex flex-wrap justify-between gap-3">
      {back ? (
        <button type="button" onClick={back} className={buttonClass("secondary")}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" onClick={next} disabled={disabled} className={buttonClass()}>
          {nextLabel}
        </button>
      )}
    </div>
  );
}
