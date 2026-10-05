"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ClipboardPlus, Info, Link2, Minus, RotateCcw } from "lucide-react";
import { aftEventInfo } from "@/lib/aft/scoring";
import { describeCategory, formatInstantDate, formatRaw, formatSignedPoints, formatTestDate } from "@/lib/aft/format";
import { categoryOf } from "@/lib/aft/progress";
import { useAftResults, useHydrated, type SavedAftResult } from "@/lib/storage/aftResults";
import {
  activePlan,
  completeSession,
  endPlan,
  linkReassessment,
  rescheduleSession,
  undoCompletion,
  unlinkReassessment,
  updateTrainingData,
  useTrainingData,
} from "@/lib/storage/trainingPlans";
import { weekWindow, weekdayLabels, weekdayOf } from "@/lib/training/engine";
import {
  adherence,
  compareWithBaseline,
  currentWeek,
  nextSession,
  painReported,
  planCompletions,
  progressionHeld,
  reassessmentCandidates,
  sessionsByDate,
} from "@/lib/training/progress";
import { PLAN_WEEKS } from "@/lib/training/templates";
import type { Difficulty, PlanSession, SessionCompletion, StoredPlan } from "@/lib/training/types";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Chip, PassFailBadge } from "@/components/ui/StatusBadge";
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
        <EarlierPlans plans={data.plans.filter((p) => p.status === "ended")} completions={data.completions} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ActivePlan plan={plan} completions={data.completions} today={today} results={results} />
      <EarlierPlans plans={data.plans.filter((p) => p.status === "ended")} completions={data.completions} />
    </div>
  );
}

function ActivePlan({ plan, completions, today, results }: { plan: StoredPlan; completions: SessionCompletion[]; today: string; results: SavedAftResult[] }) {
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
        description={`Four-week starter plan from ${formatTestDate(plan.startDate)} · ${week <= PLAN_WEEKS ? `week ${week} of ${PLAN_WEEKS}` : "finished"}`}
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

      {week > PLAN_WEEKS && !plan.reassessmentLink && (
        <p role="status" className="flex gap-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm text-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          The four weeks are over. Record a practice AFT, then link it below to compare it with your baseline.
        </p>
      )}

      {Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1).map((w) => {
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
                    onAftDay={aftDate === date}
                    onError={setMessage}
                  />
                ))}
            </ul>
          </section>
        );
      })}

      <ReassessmentCard plan={plan} results={results} />

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <FocusCard plan={plan} />
        <NotesCard plan={plan} />
      </div>
    </div>
  );
}

function ChangeMark({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-2">—</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const tone = value > 0 ? "text-good" : value < 0 ? "text-bad" : "text-ink-2";
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {formatSignedPoints(value)}
    </span>
  );
}

// Links a later AFT result to the plan and compares it with the plan's own baseline copy.
function ReassessmentCard({ plan, results }: { plan: StoredPlan; results: SavedAftResult[] }) {
  const candidates = reassessmentCandidates(plan, results);
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState("");
  const link = plan.reassessmentLink;
  const selected = chosen || candidates[0]?.id || "";

  const doLink = () => {
    const record = candidates.find((r) => r.id === selected);
    if (!record) return;
    let problem: string | undefined;
    const saved = updateTrainingData((d) => {
      const out = linkReassessment(d, plan.id, { resultId: record.id, testDate: record.testDate, input: record.input, result: record.result }, new Date().toISOString());
      problem = out.error;
      return out.data;
    });
    setError(problem ?? (saved.ok ? "" : saved.error));
  };

  return (
    <Card
      title="Reassessment"
      description={`Compared with this plan's baseline from ${formatTestDate(plan.baseline.testDate)}. Changes are what you recorded; RuckOn doesn't attribute them to the plan.`}
    >
      {link ? (
        <ReassessmentComparison plan={plan} />
      ) : candidates.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-ink-2">AFT taken on or after {formatTestDate(plan.startDate)}</span>
            <select value={selected} onChange={(e) => setChosen(e.target.value)} className={inputClass}>
              {candidates.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatTestDate(r.testDate)} · {r.result.total} points · {describeCategory(categoryOf(r.result))}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={doLink} className={buttonClass("secondary")}>
            <Link2 className="h-4 w-4" aria-hidden />
            Link as reassessment
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink">
          No saved AFT taken since the plan started.{" "}
          <Link href="/aft-calculator" className="font-semibold text-accent-ink underline">
            Record your practice AFT
          </Link>{" "}
          after week {PLAN_WEEKS}, then link it here.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}
    </Card>
  );
}

function ReassessmentComparison({ plan, compact = false }: { plan: StoredPlan; compact?: boolean }) {
  const link = plan.reassessmentLink!;
  const cmp = compareWithBaseline(plan.baseline, link);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          Baseline {formatTestDate(plan.baseline.testDate)}: <span className="font-semibold">{plan.baseline.result.total}</span>{" "}
          <PassFailBadge passed={plan.baseline.result.passed} />
        </span>
        <span>
          Reassessment {formatTestDate(link.testDate)}: <span className="font-semibold">{link.result.total}</span> <PassFailBadge passed={link.result.passed} />
        </span>
        {cmp.comparable && (
          <span>
            Total <ChangeMark value={cmp.totalChange} />
          </span>
        )}
      </div>
      {!cmp.comparable && (
        <p className="flex gap-1.5 text-xs text-ink-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {cmp.categoryChanges.join(". ")}. Points aren&apos;t compared across scoring categories; raw results still are.
        </p>
      )}
      {!compact && (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[440px] text-left text-sm">
            <thead className="text-xs text-ink-2">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Event</th>
                <th className="py-1.5 pr-3 text-right font-medium">Baseline</th>
                <th className="py-1.5 pr-3 text-right font-medium">Reassessment</th>
                <th className="py-1.5 pr-3 font-medium">Change</th>
                <th className="py-1.5 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {cmp.events.map((e) => {
                const before = plan.baseline.result.events.find((x) => x.event === e.event)!;
                const after = link.result.events.find((x) => x.event === e.event)!;
                return (
                  <tr key={e.event} className="border-t border-line">
                    <td className="py-2 pr-3 text-ink">{aftEventInfo[e.event].name}</td>
                    <td className="py-2 pr-3 text-right text-ink-2">{formatRaw(e.event, before.raw)}</td>
                    <td className="py-2 pr-3 text-right text-ink">{formatRaw(e.event, after.raw)}</td>
                    <td className={`py-2 pr-3 ${e.improved === true ? "text-good" : e.improved === false ? "text-bad" : "text-ink-2"}`}>{e.rawText}</td>
                    <td className="py-2 text-right">
                      <ChangeMark value={e.pointsChange} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!compact && (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/training-plan/new?baseline=${link.resultId}`} className={buttonClass("primary")}>
            <ClipboardPlus className="h-4 w-4" aria-hidden />
            Create the next plan from this result
          </Link>
          <button type="button" onClick={() => updateTrainingData((d) => unlinkReassessment(d, plan.id))} className={buttonClass("ghost")}>
            Unlink
          </button>
        </div>
      )}
    </div>
  );
}

function EarlierPlans({ plans, completions }: { plans: StoredPlan[]; completions: SessionCompletion[] }) {
  if (plans.length === 0) return null;
  return (
    <Card title="Earlier plans" description="Kept in this browser with their baselines, template versions, completions, and reassessments.">
      <ul className="space-y-3">
        {[...plans].reverse().map((p) => {
          const recorded = completions.filter((c) => c.planId === p.id).length;
          return (
            <li key={p.id} className="rounded-lg border border-line p-3 text-sm">
              <p className="font-medium text-ink">
                Started {formatTestDate(p.startDate)} · baseline {formatTestDate(p.baseline.testDate)} ({p.baseline.result.total})
              </p>
              <p className="text-xs text-ink-2">
                {recorded} of {p.sessions.length} sessions recorded · {p.templateVersion}
              </p>
              <div className="mt-2">
                {p.reassessmentLink ? <ReassessmentComparison plan={p} compact /> : <p className="text-xs text-ink-2">No reassessment linked.</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
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
  onAftDay,
  onError,
}: {
  plan: StoredPlan;
  session: PlanSession;
  date: string;
  today: string;
  completion?: SessionCompletion;
  useBuild: boolean;
  afterAft: boolean;
  onAftDay: boolean;
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
            <span className="block text-xs text-ink-2">
              about {session.estimatedMinutes} min{afterAft ? " · after your AFT date" : ""}
              {onAftDay && <span className="font-semibold text-warn"> · on your AFT day: skip it or move it</span>}
            </span>
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
          <SessionBody session={session} useBuild={useBuild} restrictions={plan.preferences.restrictions} equipment={plan.preferences.equipment} />

          {completion ? (
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="text-ink">
                Recorded {formatInstantDate(completion.completedAt)} · {difficultyLabels[completion.difficulty]}
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={save} disabled={!difficulty || date > today} className={buttonClass("primary")}>
                  Mark complete
                </button>
                {date > today && <span className="text-xs text-ink-2">You can record this on or after {formatTestDate(date, "short")}, or move it to today.</span>}
              </div>
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
