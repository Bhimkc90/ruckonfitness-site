"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  CircleDot,
  Clock,
  ClipboardPlus,
  Info,
  Link2,
  Lock,
  Minus,
  Moon,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Square,
  Timer,
} from "lucide-react";
import { aftEventInfo } from "@/lib/aft/scoring";
import { describeCategory, formatInstantDate, formatRaw, formatSignedPoints, formatTestDate } from "@/lib/aft/format";
import { categoryOf } from "@/lib/aft/progress";
import { useAftResults, useHydrated, type SavedAftResult } from "@/lib/storage/aftResults";
import {
  activePlan,
  commitTrainingData,
  endPlan,
  linkReassessment,
  rescheduleSession,
  undoCompletion,
  undoCompletionBlock,
  unlinkReassessment,
  updateTrainingData,
  useTrainingData,
  type TrainingData,
} from "@/lib/storage/trainingPlans";
import {
  savePainReport,
  savePauseWorkoutClock,
  saveResumeWorkoutClock,
  saveStartOrResumeWorkout,
  saveTrackedCompletion,
  saveUndoWorkoutSet,
  saveWorkoutHeartbeat,
  saveWorkoutSet,
} from "@/lib/storage/workouts";
import { weekWindow, weekdayLabels, weekdayOf } from "@/lib/training/engine";
import { PAIN_PAUSE_MESSAGE, compareWithBaseline, reassessmentCandidates } from "@/lib/training/progress";
import { planDashboard, sessionActions, statusLabels, workoutView, type DayEntry, type PlanDashboard, type SessionProgress } from "@/lib/training/planDashboard";
import type { SessionStatus } from "@/lib/training/sessionStatus";
import { PLAN_WEEKS } from "@/lib/training/templates";
import type { SessionCompletion, StoredPlan } from "@/lib/training/types";
import { Card, PageHeader } from "@/components/ui/Card";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Chip, PassFailBadge } from "@/components/ui/StatusBadge";
import { PlanDisclaimer, useNow, useToday } from "./PlanParts";
import { FocusCard, NotesCard } from "./PlanPreview";
import { inputClass } from "@/components/ui/form";
import WorkoutSession, { PainReportForm, ProgressBar, difficultyLabels, type ActionResult, type WorkoutActions } from "./WorkoutSession";
import type { ClockActions } from "./WorkoutTimers";

export default function PlanView() {
  const hydrated = useHydrated();
  const today = useToday();
  const now = useNow();
  const data = useTrainingData();
  const results = useAftResults();
  const plan = activePlan(data);

  if (!hydrated || !today || !now) return <div className="h-40 rounded-xl border border-card-line bg-surface shadow-sm" aria-busy="true" aria-label="Loading plan" />;

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
      <ActivePlan plan={plan} data={data} now={now} results={results} />
      <EarlierPlans plans={data.plans.filter((p) => p.status === "ended")} completions={data.completions} />
    </div>
  );
}

// Everything below reads the session status engine through planDashboard and workoutView; no eligibility rule
// is decided here. Every change goes through the storage save functions, which read the device clock themselves.

const toResult = (r: { ok: boolean; error?: string }): ActionResult => (r.ok ? { ok: true } : { ok: false, error: r.error ?? "Not saved." });

const statusIcons: Record<SessionStatus, typeof Lock> = {
  upcoming: Clock,
  available: PlayCircle,
  "in-progress": Timer,
  completed: CheckCircle2,
  locked: Lock,
  overdue: AlertTriangle,
  paused: PauseCircle,
  ended: Square,
  blocked: Ban,
};

const statusTone: Record<SessionStatus, string> = {
  upcoming: "bg-surface-2 text-ink-2",
  available: "bg-accent text-black",
  "in-progress": "bg-accent/30 text-ink",
  completed: "bg-good/10 text-good",
  locked: "bg-surface-2 text-ink-2",
  overdue: "border border-warn bg-accent/10 text-ink",
  paused: "bg-bad/10 text-bad",
  ended: "bg-surface-2 text-ink-2",
  blocked: "bg-bad/10 text-bad",
};

// Status always shows an icon and a word, never color alone.
function StatusBadge({ status }: { status: SessionStatus }) {
  const Icon = statusIcons[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[status]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {statusLabels[status]}
    </span>
  );
}

function progressText(p: SessionProgress): string | null {
  if (p.kind === "tracked") return `${p.completed} of ${p.total} done${p.percent === null ? "" : ` · ${p.percent}%`}`;
  if (p.kind === "untracked") return "Recorded without set tracking";
  return null;
}

const dayLabel = (date: string) => `${weekdayLabels[weekdayOf(date)]} ${formatTestDate(date, "short")}`;

// Exported for rendering tests.
export function ActivePlan({ plan, data, now, results }: { plan: StoredPlan; data: TrainingData; now: string; results: SavedAftResult[] }) {
  const view = planDashboard(plan, data, now);
  const { pause, next } = view;
  const aftDate = plan.preferences.nextAftDate;
  // Pain can be reported at any time; it is filed against the session in hand (or the last one when all are done).
  const painSession = next?.sessionId ?? view.state.sessions.at(-1)!.sessionId;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Training plan"
        description={`Four-week starter plan from ${formatTestDate(plan.startDate)} · ${
          pause.paused ? "paused after a pain report" : view.week <= PLAN_WEEKS ? `week ${view.week} of ${PLAN_WEEKS}` : "finished"
        }`}
        actions={
          <>
            {!pause.paused && (
              <ButtonLink href="/training-plan/new" variant="secondary">
                New plan
              </ButtonLink>
            )}
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => {
                if (window.confirm("End this plan? Its workouts and history stay in this browser.")) updateTrainingData((d) => endPlan(d, plan.id));
              }}
            >
              End plan
            </button>
          </>
        }
      />

      <PlanDisclaimer />

      {pause.paused && (
        <div role="alert" className="flex gap-2 rounded-lg border-2 border-bad bg-bad/5 p-4 text-sm text-ink">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" aria-hidden />
          <div>
            <p className="text-base font-semibold">Plan paused{pause.since ? ` since ${formatInstantDate(pause.since)}` : ""}</p>
            <p className="mt-0.5">{PAIN_PAUSE_MESSAGE}</p>
            <p className="mt-1 text-ink-2">No workout can be started, continued, completed, or moved. Your workouts and recorded sets stay below for reference.</p>
          </div>
        </div>
      )}

      <PlanOverview plan={plan} view={view} painSession={painSession} />

      {view.week > PLAN_WEEKS && !plan.reassessmentLink && (
        <p role="status" className="flex gap-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm text-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          The four weeks are over. Record a practice AFT, then link it below to compare it with your baseline.
        </p>
      )}

      {view.weeks.map((w) => (
        <section key={w.week} aria-labelledby={`week-${w.week}`} className="rounded-xl border border-card-line bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`week-${w.week}`} className="text-base font-semibold text-ink">
              Week {w.week}{" "}
              <span className="font-normal text-ink-2">· {w.phase === "foundation" ? "Foundation" : w.phase === "held" ? "Holding at the foundation level" : "Build"}</span>
            </h2>
            <span className="text-xs text-ink-2">
              {formatTestDate(w.from, "short")} – {formatTestDate(w.to, "short")}
            </span>
          </div>
          <div className="mt-2 max-w-sm">
            <ProgressBar percent={w.percent} label={`${w.completed} of ${w.total} workouts completed`} />
          </div>
          {w.phase === "held" && (
            <p className="mt-2 flex gap-1.5 text-xs text-ink-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              An earlier session was rated too hard or painful, so this week repeats the week 1–2 workload.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {w.days.map((day) =>
              day.kind === "rest" ? (
                <li key={day.date} className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-2">
                  <Moon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    {dayLabel(day.date)} · Rest day{day.date === view.today ? " (today)" : ""}
                  </span>
                </li>
              ) : (
                <SessionRow
                  key={day.state.sessionId}
                  plan={plan}
                  data={data}
                  now={now}
                  entry={day}
                  isNext={next?.sessionId === day.state.sessionId}
                  isToday={day.date === view.today}
                  afterAft={!!aftDate && day.date > aftDate}
                  onAftDay={aftDate === day.date}
                />
              )
            )}
          </ul>
        </section>
      ))}

      <ReassessmentCard plan={plan} results={results} />

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <FocusCard plan={plan} />
        <NotesCard plan={plan} />
      </div>
    </div>
  );
}

function PlanOverview({ plan, view, painSession }: { plan: StoredPlan; view: PlanDashboard; painSession: string }) {
  const { next, overall, pause } = view;
  const thisWeek = view.weeks.find((w) => w.week === view.week);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
      <Card>
        <p className="text-sm text-ink-2">Today · {dayLabel(view.today)}</p>
        <p className="mt-1 text-xl font-semibold text-ink">{view.week <= PLAN_WEEKS ? `Week ${view.week} of ${PLAN_WEEKS}` : "Plan weeks finished"}</p>
        {view.todaySessions.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {view.todaySessions.map((s) => (
              <li key={s.sessionId} className="flex flex-wrap items-center gap-2">
                <span className="text-ink">Workout day: {s.session.title}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            <Moon className="h-4 w-4" aria-hidden />
            No workout scheduled today.
          </p>
        )}
      </Card>
      <Card>
        <p className="text-sm text-ink-2">Plan progress</p>
        <p className="mt-1 text-xl font-semibold text-ink">
          {overall.completed} <span className="text-base font-normal text-ink-2">completed · {overall.remaining} remaining</span>
        </p>
        <div className="mt-2">
          <ProgressBar percent={overall.percent} label={`${overall.completed} of ${overall.total} workouts`} />
        </div>
      </Card>
      <Card>
        <p className="text-sm text-ink-2">Weekly progress</p>
        <ul className="mt-2 space-y-1 text-sm tabular-nums">
          {view.weeks.map((w) => (
            <li key={w.week} className="flex justify-between gap-2">
              <span className={w.week === thisWeek?.week ? "font-semibold text-ink" : "text-ink-2"}>Week {w.week}</span>
              <span className="text-ink">
                {w.completed} / {w.total} · {w.percent}%
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <p className="text-sm text-ink-2">{pause.paused ? "Plan status" : "Next workout"}</p>
        {pause.paused ? (
          <p className="mt-1 flex items-center gap-1.5 font-semibold text-ink">
            <PauseCircle className="h-4 w-4 text-bad" aria-hidden />
            Paused. No workout is suggested.
          </p>
        ) : next ? (
          <>
            <p className="mt-1 font-semibold text-ink">{next.session.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
              {next.date === view.today ? "Today" : formatTestDate(next.date)} · about {next.session.estimatedMinutes} min <StatusBadge status={next.status} />
            </p>
            {next.reasons.map((r) => (
              <p key={r} className="mt-1 text-xs text-ink-2">
                {r}
              </p>
            ))}
            <a href={`#session-${next.sessionId}`} className="mt-2 inline-block text-sm font-medium text-accent-ink hover:underline">
              Go to workout
            </a>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink">Every workout is completed. {plan.reassessment}</p>
        )}
        <div className="mt-3">
          <PainReportForm compact onReport={(notes) => toResult(savePainReport(plan.id, painSession, { notes }))} />
        </div>
      </Card>
    </div>
  );
}

function SessionRow({
  plan,
  data,
  now,
  entry,
  isNext,
  isToday,
  afterAft,
  onAftDay,
}: {
  plan: StoredPlan;
  data: TrainingData;
  now: string;
  entry: Extract<DayEntry, { kind: "session" }>;
  isNext: boolean;
  isToday: boolean;
  afterAft: boolean;
  onAftDay: boolean;
}) {
  const { state, progress } = entry;
  const sessionId = state.sessionId;
  const view = workoutView(plan, data, state, now);
  const allowed = sessionActions(state, view);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "warning"; text: string } | null>(null);
  const [moveTo, setMoveTo] = useState(state.date);
  const range = weekWindow(plan.startDate, state.session.week);
  const progressLabel = progressText(progress);

  const begin = () => {
    const result = saveStartOrResumeWorkout(plan.id, sessionId);
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    // Coming back to a workout restarts its clock if it was paused (or left and auto-paused).
    if (result.resumed) {
      const clockResult = saveResumeWorkoutClock(plan.id, sessionId);
      if (!clockResult.ok) return setMessage({ tone: "error", text: clockResult.error });
    }
    setMessage(null);
    setNotice(result.notice ?? "");
    setOpen(true);
  };

  const clock: ClockActions = {
    pause: () => toResult(savePauseWorkoutClock(plan.id, sessionId)),
    resume: () => toResult(saveResumeWorkoutClock(plan.id, sessionId)),
    heartbeat: () => {
      const r = saveWorkoutHeartbeat(plan.id, sessionId);
      return r.ok ? { ok: true, autoPaused: r.autoPaused } : { ok: false, error: r.error };
    },
  };

  const actions: WorkoutActions = {
    recordSet: (setId, actual) => toResult(saveWorkoutSet(plan.id, sessionId, { setId, ...(actual ? { actual } : {}) })),
    undoSet: (setId) => toResult(saveUndoWorkoutSet(plan.id, sessionId, setId)),
    complete: (feedback) => toResult(saveTrackedCompletion(plan.id, sessionId, { ...feedback, pain: false })),
    reportPain: (e) => toResult(savePainReport(plan.id, sessionId, { notes: e.notes, ...(e.setId ? { setId: e.setId } : {}) })),
  };

  const move = () => {
    let warning: string | undefined;
    const result = commitTrainingData<object>((d) => {
      const moved = rescheduleSession(d, plan.id, sessionId, moveTo);
      warning = moved.warning;
      return moved.error ? { ok: false as const, error: moved.error } : { ok: true as const, data: moved.data };
    });
    setMessage(!result.ok ? { tone: "error", text: result.error } : warning ? { tone: "warning", text: warning } : null);
  };

  const undoBlock = view.mode === "history" || view.mode === "untracked" ? undoCompletionBlock(data, plan.id, sessionId) : null;
  const undo = () => {
    const result = commitTrainingData<object>((d) => {
      const block = undoCompletionBlock(d, plan.id, sessionId);
      return block ? { ok: false as const, error: block } : { ok: true as const, data: undoCompletion(d, plan.id, sessionId) };
    });
    setMessage(result.ok ? null : { tone: "error", text: result.error });
  };

  const muted = state.status === "locked" || state.status === "upcoming" || state.status === "ended";

  return (
    <li id={`session-${sessionId}`} className={`scroll-mt-28 rounded-lg border p-3 lg:scroll-mt-6 ${isNext ? "border-ink" : "border-line"} ${muted ? "bg-surface-2/60" : "bg-canvas/40"}`}>
      <details open={isNext && (state.eligible || state.status === "in-progress")}>
        <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">
            <span className={`text-sm font-medium ${muted ? "text-ink-2" : "text-ink"}`}>
              {dayLabel(state.date)}
              {isToday ? " (today)" : ""} · {state.session.title}
            </span>
            <span className="block text-xs text-ink-2">
              about {state.session.estimatedMinutes} min{progressLabel ? ` · ${progressLabel}` : ""}
              {isNext && " · next workout"}
              {afterAft ? " · after your AFT date" : ""}
              {onAftDay && <span className="font-semibold text-warn"> · on your AFT day</span>}
            </span>
          </span>
          <StatusBadge status={state.status} />
        </summary>

        <div className="mt-3 space-y-3">
          {state.reasons.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-line bg-surface p-2.5 text-sm text-ink">
              {state.reasons.map((r) => (
                <li key={r} className="flex gap-1.5">
                  {state.status === "locked" || state.status === "upcoming" ? (
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                  )}
                  {r}
                </li>
              ))}
            </ul>
          )}
          {state.warnings.map((w) => (
            <p key={w} className="flex gap-1.5 rounded-lg border border-warn/60 bg-accent/10 p-2.5 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {w}
            </p>
          ))}
          <p className="text-sm text-ink-2">{state.session.purpose}</p>

          {(allowed.start || allowed.resume) && !(open && view.mode === "active") && (
            <button type="button" onClick={begin} className={buttonClass("primary", "min-h-11")}>
              <PlayCircle className="h-4 w-4" aria-hidden />
              {allowed.resume ? "Resume workout" : "Start workout"}
            </button>
          )}

          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm font-medium ${message.tone === "error" ? "text-bad" : "text-warn"}`}>
              {message.text}
            </p>
          )}

          {view.mode === "active" && open && <WorkoutSession view={view} actions={actions} clock={clock} notice={notice} />}
          {view.mode === "stored" && <WorkoutSession view={view} reasons={state.reasons} />}
          {view.mode === "history" && <WorkoutSession view={view} />}
          {view.mode === "untracked" && (
            <div className="rounded-lg border border-line p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-ink">
                <CheckCircle2 className="h-4 w-4 text-good" aria-hidden />
                Recorded {formatInstantDate(view.completion.completedAt)} · {difficultyLabels[view.completion.difficulty]}
                {view.completion.pain ? " · pain reported" : ""}
              </p>
              <p className="mt-1 text-xs text-ink-2">Recorded before workouts were tracked set by set, so there are no set records.</p>
              {view.completion.notes && <p className="mt-1 text-ink-2">{view.completion.notes}</p>}
            </div>
          )}
          {view.mode === "preview" && (
            // Rendered only once opened, so twelve full previews don't sit hidden in the page.
            <details className="rounded-lg border border-line p-3" onToggle={(e) => setPreviewOpen(e.currentTarget.open)}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-medium text-ink">
                <CircleDot className="h-4 w-4" aria-hidden />
                Preview exercises
              </summary>
              {previewOpen && (
                <div className="mt-3">
                  <WorkoutSession view={view} reasons={state.reasons} onStart={allowed.start ? begin : undefined} />
                </div>
              )}
            </details>
          )}

          {(view.mode === "history" || view.mode === "untracked") &&
            (undoBlock ? (
              <p className="text-xs text-ink-2">Can&apos;t undo: {undoBlock}</p>
            ) : (
              <button type="button" onClick={undo} className={buttonClass("ghost", "px-2 py-1")}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {view.mode === "history" ? "Undo completion and reopen workout" : "Undo completion"}
              </button>
            ))}

          {allowed.reschedule && (
            <div className="flex flex-wrap items-end gap-2 text-sm">
              <label className="block">
                <span className="text-xs text-ink-2">Move within week {state.session.week}</span>
                <input
                  type="date"
                  value={moveTo}
                  min={range.from}
                  max={range.to}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="mt-1 block rounded-lg border border-line-strong bg-canvas px-3 py-1.5 text-sm text-ink"
                />
              </label>
              <button type="button" onClick={move} disabled={moveTo === state.date} className={buttonClass("secondary", "min-h-11 py-1.5")}>
                Reschedule
              </button>
              <Chip>Workouts stay in order</Chip>
            </div>
          )}
        </div>
      </details>
    </li>
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
