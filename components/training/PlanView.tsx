"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPlus, Info, RotateCcw } from "lucide-react";
import { formatTestDate } from "@/lib/aft/format";
import { useAftResults, useHydrated } from "@/lib/storage/aftResults";
import {
  activePlan,
  completeSession,
  endPlan,
  rescheduleSession,
  undoCompletion,
  updateTrainingData,
  useTrainingData,
} from "@/lib/storage/trainingPlans";
import { weekWindow, weekdayLabels, weekdayOf } from "@/lib/training/engine";
import { adherence, currentWeek, nextSession, painReported, planCompletions, progressionHeld, sessionsByDate } from "@/lib/training/progress";
import type { Difficulty, PlanSession, SessionCompletion, StoredPlan } from "@/lib/training/types";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/StatusBadge";
import { PlanDisclaimer, useToday } from "./PlanParts";
import { FocusCard, NotesCard, SessionBody } from "./PlanPreview";
import { inputClass } from "@/components/ui/form";

const difficultyLabels: Record<Difficulty, string> = {
  easy: "Easy",
  "about-right": "About right",
  hard: "Hard",
  "too-hard": "Too hard",
};

export default function PlanView() {
  const hydrated = useHydrated();
  const today = useToday();
  const data = useTrainingData();
  const results = useAftResults();
  const plan = activePlan(data);

  if (!hydrated || !today) return <div className="h-40 rounded-xl border border-card-line bg-surface shadow-sm" aria-busy="true" aria-label="Loading plan" />;

  if (!plan) {
    const ended = data.plans.filter((p) => p.status === "ended").length;
    return (
      <div className="space-y-5">
        <PageHeader title="Training plan" />
        <Card className="max-w-2xl">
          <h2 className="text-lg font-semibold text-ink">No active plan</h2>
          <p className="mt-2 text-sm text-ink-2">
            {results.length > 0
              ? "Create a four-week starter plan from one of your saved AFT results, your schedule, and your equipment."
              : "Record and save an AFT result first; plans start from a saved baseline."}
          </p>
          <ButtonLink href={results.length > 0 ? "/training-plan/new" : "/aft-calculator"} className="mt-4">
            <ClipboardPlus className="h-4 w-4" aria-hidden />
            {results.length > 0 ? "Suggest training plan" : "Record AFT"}
          </ButtonLink>
          {ended > 0 && <p className="mt-4 text-xs text-ink-2">{ended} earlier plan{ended > 1 ? "s are" : " is"} kept in this browser.</p>}
        </Card>
      </div>
    );
  }

  return <ActivePlan plan={plan} completions={data.completions} today={today} />;
}

function ActivePlan({ plan, completions, today }: { plan: StoredPlan; completions: SessionCompletion[]; today: string }) {
  const [message, setMessage] = useState("");
  const done = planCompletions(plan, completions);
  const stats = adherence(plan, completions, today);
  const next = nextSession(plan, completions, today);
  const week = currentWeek(plan, today);
  const pain = painReported(plan, completions);
  const dated = sessionsByDate(plan);
  const aftDate = plan.preferences.nextAftDate;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training plan"
        description={`Four-week starter plan from ${formatTestDate(plan.startDate)} · ${week <= 4 ? `week ${week} of 4` : "finished"}`}
        actions={
          <>
            <ButtonLink href="/training-plan/new" variant="secondary">
              New plan
            </ButtonLink>
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => {
                if (window.confirm("End this plan? Its completion history stays in this browser.")) updateTrainingData((d) => endPlan(d, plan.id));
              }}
            >
              End plan
            </button>
          </>
        }
      />

      <PlanDisclaimer />

      {pain && (
        <p role="alert" className="flex gap-2 rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden />
          You reported pain during this plan. Stop training and talk to a medical provider or your unit&apos;s H2F team. RuckOn will not increase
          your workload.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-ink-2">Completed so far</p>
          <p className="mt-1 text-3xl font-semibold text-ink">
            {stats.completedOfScheduled} <span className="text-base font-normal text-ink-2">of {stats.scheduledToDate} scheduled</span>
          </p>
          <p className="mt-1 text-xs text-ink-2">
            {stats.completed} of {stats.total} sessions in the plan recorded
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-2">Weekly adherence</p>
          <ul className="mt-2 space-y-1 text-sm tabular-nums">
            {stats.weeks.map((w) => (
              <li key={w.week} className="flex justify-between">
                <span className={w.week === week ? "font-semibold text-ink" : "text-ink-2"}>Week {w.week}</span>
                <span className="text-ink">
                  {w.completed} / {w.scheduled}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-sm text-ink-2">Next workout</p>
          {next ? (
            <>
              <p className="mt-1 font-semibold text-ink">{next.session.title}</p>
              <p className="text-sm text-ink-2">
                {next.date === today ? "Today" : formatTestDate(next.date)} · about {next.session.estimatedMinutes} min
              </p>
              <a href={`#session-${next.session.id}`} className="mt-2 inline-block text-sm font-medium text-accent-ink hover:underline">
                Open workout
              </a>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink">No upcoming sessions. {plan.reassessment}</p>
          )}
        </Card>
      </div>

      {message && (
        <p role="status" className="text-sm text-bad">
          {message}
        </p>
      )}

      {[1, 2, 3, 4].map((w) => {
        const held = progressionHeld(plan, completions, w);
        const range = weekWindow(plan.startDate, w);
        return (
          <section key={w} aria-labelledby={`week-${w}`} className="rounded-xl border border-card-line bg-surface shadow-sm p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`week-${w}`} className="text-base font-semibold text-ink">
                Week {w} <span className="font-normal text-ink-2">· {w <= 2 ? "Foundation" : held ? "Holding at the foundation level" : "Build"}</span>
              </h2>
              <span className="text-xs text-ink-2">
                {formatTestDate(range.from, "short")} – {formatTestDate(range.to, "short")}
              </span>
            </div>
            {held && (
              <p className="mt-2 flex gap-1.5 text-xs text-ink-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                An earlier session was rated too hard or painful, so this week repeats the week 1–2 workload.
              </p>
            )}
            <ul className="mt-3 space-y-3">
              {dated
                .filter((d) => d.session.week === w)
                .map(({ session, date }) => (
                  <SessionRow
                    key={session.id}
                    plan={plan}
                    session={session}
                    date={date}
                    today={today}
                    completion={done.get(session.id)}
                    useBuild={w >= 3 && !held}
                    afterAft={!!aftDate && date > aftDate}
                    onError={setMessage}
                  />
                ))}
            </ul>
          </section>
        );
      })}

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <FocusCard plan={plan} />
        <NotesCard plan={plan} />
      </div>
    </div>
  );
}

function SessionRow({
  plan,
  session,
  date,
  today,
  completion,
  useBuild,
  afterAft,
  onError,
}: {
  plan: StoredPlan;
  session: PlanSession;
  date: string;
  today: string;
  completion?: SessionCompletion;
  useBuild: boolean;
  afterAft: boolean;
  onError: (message: string) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [pain, setPain] = useState(false);
  const [notes, setNotes] = useState("");
  const [moveTo, setMoveTo] = useState(date);
  const range = weekWindow(plan.startDate, session.week);
  const status = completion ? "Completed" : date < today ? "Not recorded" : date === today ? "Today" : "Upcoming";

  const save = () => {
    if (!difficulty) return;
    const result = updateTrainingData((d) =>
      completeSession(d, { planId: plan.id, sessionId: session.id, completedAt: new Date().toISOString(), difficulty, pain, notes })
    );
    if (!result.ok) onError(result.error);
  };

  const move = () => {
    let error: string | undefined;
    let warning: string | undefined;
    const result = updateTrainingData((d) => {
      const moved = rescheduleSession(d, plan.id, session.id, moveTo);
      error = moved.error;
      warning = moved.warning;
      return moved.data;
    });
    onError(error ?? warning ?? (result.ok ? "" : result.error));
  };

  return (
    <li id={`session-${session.id}`} className="scroll-mt-28 rounded-lg border border-line bg-canvas/40 p-3 lg:scroll-mt-6">
      <details open={date === today && !completion}>
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
          <span>
            <span className="text-sm font-medium text-ink">
              {weekdayLabels[weekdayOf(date)]} {formatTestDate(date, "short")} · {session.title}
            </span>
            <span className="block text-xs text-ink-2">about {session.estimatedMinutes} min{afterAft ? " · after your AFT date" : ""}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              completion ? "bg-good/10 text-good" : status === "Today" ? "bg-accent/15 text-accent-ink" : "bg-surface-2 text-ink-2"
            }`}
          >
            {completion && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
            {status}
          </span>
        </summary>

        <div className="mt-3 space-y-4">
          <SessionBody session={session} useBuild={useBuild} />

          {completion ? (
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="text-ink">
                Recorded {formatTestDate(completion.completedAt.slice(0, 10))} · {difficultyLabels[completion.difficulty]}
                {completion.pain ? " · pain reported" : ""}
              </p>
              {completion.notes && <p className="mt-1 text-ink-2">{completion.notes}</p>}
              <button
                type="button"
                className={buttonClass("ghost", "mt-2 px-2 py-1")}
                onClick={() => updateTrainingData((d) => undoCompletion(d, plan.id, session.id))}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Undo completion
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-line p-3">
              <fieldset className="text-sm">
                <legend className="font-medium text-ink">How hard was this session?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(difficultyLabels) as Difficulty[]).map((d) => (
                    <label key={d} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${difficulty === d ? "border-accent" : "border-line"}`}>
                      <input type="radio" name={`difficulty-${session.id}`} checked={difficulty === d} onChange={() => setDifficulty(d)} className="accent-[var(--color-control)]" />
                      {difficultyLabels[d]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pain} onChange={() => setPain(!pain)} className="accent-[var(--color-control)]" />
                I had pain during or after this session
              </label>
              <label className="mt-3 block text-sm">
                <span className="text-ink-2">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className={inputClass}
                />
              </label>
              <button type="button" onClick={save} disabled={!difficulty} className={buttonClass("primary", "mt-3")}>
                Mark complete
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 text-sm">
            <label className="block">
              <span className="text-xs text-ink-2">Move within week {session.week}</span>
              <input
                type="date"
                value={moveTo}
                min={range.from}
                max={range.to}
                onChange={(e) => setMoveTo(e.target.value)}
                className="mt-1 block rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-sm text-ink"
              />
            </label>
            <button type="button" onClick={move} disabled={moveTo === date} className={buttonClass("secondary", "py-1.5")}>
              Reschedule
            </button>
            <Chip>Completion history is kept</Chip>
          </div>
        </div>
      </details>
    </li>
  );
}
