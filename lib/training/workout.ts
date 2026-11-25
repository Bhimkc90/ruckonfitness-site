import { cadenceLabels, getDrill, getExercise } from "@/lib/library";
import type { Drill, DrillExecution } from "@/lib/library/types";
import { exerciseAllowed } from "./engine";
import { PAIN_PAUSE_MESSAGE, painReported, progressionHeld } from "./progress";
import { activities } from "./templates";
import type {
  ActivityId,
  ActualPerformance,
  ExcludedExercise,
  PlanBlock,
  PlanItem,
  PlanSession,
  Preferences,
  Prescription,
  ProgressionPhase,
  SessionCompletion,
  SetCompletion,
  StoredPlan,
  WorkoutExercise,
  WorkoutExerciseSource,
  WorkoutRest,
  WorkoutSection,
  WorkoutSetUnit,
  WorkoutSnapshot,
  WorkoutTarget,
} from "./types";

// Turns a stored plan session into individually trackable exercises and sets, and measures completion from set
// records. It reads the plan's own prescriptions and the library; it never changes or adds to the workload.

export const WORKOUT_SCHEMA_VERSION = 1;

// Same wording as the plan disclaimer; shown with every tracked workout.
export const WORKOUT_SAFETY = ["Stop and seek advice if you have pain."];

// Each Military Movement Drill 1 exercise over the 25-meter course (ATP 7-22.02 paras 8-3 – 8-5). The library's
// printed prescription is kept as the description; workout.test.ts checks the two agree.
export const MMD1_COURSE: Record<string, number> = { vertical: 50, lateral: 50, "shuttle-sprint": 75 };

// ---------------------------------------------------------------------------
// Progression phase
// ---------------------------------------------------------------------------

// The same rule the plan view uses: weeks 3–4 use the build prescription unless an earlier session was too hard
// or painful.
export function workoutPhase(plan: StoredPlan, completions: SessionCompletion[], session: PlanSession): { phase: ProgressionPhase; progressionHeld: boolean } {
  if (session.week < 3) return { phase: "foundation", progressionHeld: false };
  const held = progressionHeld(plan, completions, session.week);
  return { phase: held ? "foundation" : "build", progressionHeld: held };
}

// ---------------------------------------------------------------------------
// Prescription parsing. Each pattern is one the templates produce; anything else returns null.
// ---------------------------------------------------------------------------

const DASH = "[–-]";

export function parseSeconds(text: string): number | null {
  let m = /^(\d+) minutes?$/.exec(text);
  if (m) return Number(m[1]) * 60;
  m = /^(\d+) seconds?$/.exec(text);
  if (m) return Number(m[1]);
  m = /^(\d+):([0-5]\d)$/.exec(text);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}

export function parseCount(sets: string | undefined): { count: number; unit: WorkoutSetUnit } | null {
  if (sets === undefined) return { count: 1, unit: "set" };
  const m = /^(\d+)(?: (sets?|rounds?|holds?))?$/.exec(sets);
  if (!m || Number(m[1]) < 1) return null;
  const unit: WorkoutSetUnit = m[2]?.startsWith("round") ? "round" : m[2]?.startsWith("hold") ? "hold" : "set";
  return { count: Number(m[1]), unit };
}

export function parseReps(reps: string): WorkoutTarget | null {
  let m = /^(\d+)$/.exec(reps);
  if (m && Number(m[1]) > 0) return { kind: "reps", reps: Number(m[1]) };
  m = new RegExp(`^(\\d+)${DASH}(\\d+)$`).exec(reps);
  if (m && Number(m[1]) > 0 && Number(m[1]) < Number(m[2])) return { kind: "rep-range", min: Number(m[1]), max: Number(m[2]) };
  m = /^up to (\d+)$/.exec(reps);
  if (m && Number(m[1]) > 0) return { kind: "reps", reps: Number(m[1]), upTo: true };
  m = /^(\d+) repetitions \((\d+) seconds each, switching legs\)$/.exec(reps);
  if (m && Number(m[1]) > 0) return { kind: "reps", reps: Number(m[1]), secondsEach: Number(m[2]) };
  return null;
}

export function parseRest(rest: string): WorkoutRest | null {
  const m = new RegExp(`^(\\d+)(?:${DASH}(\\d+))? seconds( between rounds)?$`).exec(rest);
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  if (max < min) return null;
  return { text: rest, minSeconds: min, maxSeconds: max, between: m[3] ? "rounds" : "sets" };
}

type Parsed = { count: number; unit: WorkoutSetUnit; target: WorkoutTarget };

// A single exercise or activity prescription.
export function parsePrescription(p: Prescription): Parsed | null {
  const interval = p.time ? /^(\d+) seconds fast, (\d+) seconds walking$/.exec(p.time) : null;
  if (interval) {
    const repeats = p.reps ? /^(\d+) repeats?$/.exec(p.reps) : null;
    if (!repeats || p.sets !== undefined || Number(repeats[1]) < 1) return null;
    return {
      count: Number(repeats[1]),
      unit: "repeat",
      target: { kind: "interval", workSeconds: Number(interval[1]), recoverySeconds: Number(interval[2]), work: "fast", recovery: "walking" },
    };
  }
  const count = parseCount(p.sets);
  if (!count || (p.reps !== undefined) === (p.time !== undefined)) return null;
  if (p.reps !== undefined) {
    const target = parseReps(p.reps);
    return target && { ...count, target };
  }
  const seconds = parseSeconds(p.time!.replace(/ per exercise$/, ""));
  if (seconds === null || seconds <= 0) return null;
  return { ...count, target: count.unit === "hold" ? { kind: "hold", seconds } : { kind: "duration", seconds } };
}

// "Push-Up 5, High Jumper 10, …": the condensed Preparation Drill's exercises in the stored order, with repetitions.
export function parseCondensedReps(reps: string, drill: Drill): { exerciseId: string; reps: number }[] | null {
  const parts = reps.split(", ").map((part) => /^(.+) (\d+)$/.exec(part));
  if (parts.some((m) => !m)) return null;
  const out = parts.map((m) => ({ exerciseId: drill.sequence.find((id) => getExercise(id)?.name === m![1]), reps: Number(m![2]) }));
  if (out.some((x) => !x.exerciseId || x.reps < 1) || new Set(out.map((x) => x.exerciseId)).size !== out.length) return null;
  return out as { exerciseId: string; reps: number }[];
}

const holdSteps = (execution: DrillExecution) => execution.steps.filter((s) => /READY, (STRETCH|EXERCISE)$/.test(s.label));

// One drill exercise under the drill's shared prescription. Instructions come from the library's own steps.
function parseDrillMember(drill: Drill, exerciseId: string, execution: DrillExecution | undefined, p: Prescription): { count: number; unit: WorkoutSetUnit; targets: { target: WorkoutTarget; instruction?: string }[] } | null {
  const repeat = (parsed: Parsed) => ({ count: parsed.count, unit: parsed.unit, targets: Array.from({ length: parsed.count }, () => ({ target: parsed.target })) });

  const each = p.reps ? /^(up to )?(\d+) repetitions of each exercise$/.exec(p.reps) : null;
  if (each && p.time === undefined) {
    const count = parseCount(p.sets);
    if (!count || Number(each[2]) < 1) return null;
    return repeat({ ...count, target: { kind: "reps", reps: Number(each[2]), ...(each[1] ? { upTo: true } : {}) } });
  }

  if (p.reps === "Each exercise over the 25-meter course" && p.sets === undefined && p.time === undefined) {
    const meters = MMD1_COURSE[exerciseId];
    if (drill.id !== "military-movement-drill-1" || !meters || !execution?.officialPrescription) return null;
    return repeat({ count: 1, unit: "set", target: { kind: "distance", meters, description: execution.officialPrescription } });
  }

  const hold = p.time ? new RegExp(`^Hold each (?:exercise|stretch) (up to )?(\\d+)(?:${DASH}(\\d+))? seconds`).exec(p.time) : null;
  if (hold && p.sets === undefined && p.reps === undefined && execution) {
    if (exerciseId === "back-bridge") {
      const bridge = /Back Bridge: (\d+) × (\d+) seconds/.exec(p.time!);
      if (!bridge) return null;
      return repeat({ count: 1, unit: "set", target: { kind: "reps", reps: Number(bridge[1]), secondsEach: Number(bridge[2]) } });
    }
    const steps = holdSteps(execution);
    if (steps.length === 0) return null;
    const target: WorkoutTarget = hold[3]
      ? { kind: "hold-range", minSeconds: Number(hold[2]), maxSeconds: Number(hold[3]) }
      : { kind: "hold", seconds: Number(hold[2]), ...(hold[1] ? { upTo: true } : {}) };
    return { count: steps.length, unit: "hold", targets: steps.map((s) => ({ target, ...(steps.length > 1 ? { instruction: s.text } : {}) })) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

const RUNNING_ACTIVITIES = new Set<ActivityId>(["easy-run", "intervals-30-60"]);

// The plan already applied restrictions; this re-checks against the stored preferences so tracking can never
// prompt an exercise the person said they must avoid.
function exclusionReason(exerciseId: string, prefs: Preferences): ExcludedExercise["reason"] | null {
  const exercise = getExercise(exerciseId);
  if (!exercise) return "unknown";
  if (!exerciseAllowed(exerciseId, new Set(prefs.restrictions))) return "restriction";
  const equipment = exercise.tags.equipment;
  if (!equipment.includes("none") && !equipment.some((e) => (prefs.equipment as string[]).includes(e))) return "equipment";
  return null;
}

function activityExcluded(activityId: ActivityId, prefs: Preferences): boolean {
  const restrictions = new Set(prefs.restrictions);
  if (RUNNING_ACTIVITIES.has(activityId) && (restrictions.has("no-running") || !prefs.runningAccess)) return true;
  return activityId === "hrp-practice" && restrictions.has("no-weight-on-hands");
}

export function prescriptionText(p: Prescription): string {
  return [p.sets, p.reps, p.time, p.rest && `rest ${p.rest}`].filter(Boolean).join(" · ") || "No sets, repetitions, or time given";
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}~${n}`;
  used.add(id);
  return id;
}

type Builder = { used: Set<string>; prefs: Preferences; phase: ProgressionPhase; unsupported: WorkoutSnapshot["unsupported"] };

function makeExercise(
  b: Builder,
  sectionId: string,
  key: string,
  base: { source: WorkoutExerciseSource; name: string; drillName?: string; cadence?: string; safety: string[] },
  p: Prescription,
  parsed: { count: number; unit: WorkoutSetUnit; targets: { target: WorkoutTarget; instruction?: string }[] } | null
): WorkoutExercise {
  const id = uniqueId(`${sectionId}/${key}`, b.used);
  const rest = p.rest ? parseRest(p.rest) : undefined;
  const supported = parsed !== null && rest !== null;
  const text = prescriptionText(p);
  if (!supported) b.unsupported.push({ id, name: base.name, text });
  // An unrecognized prescription is tracked as one "as written" set: no counts are invented.
  const sets = supported ? parsed.targets : [{ target: { kind: "as-prescribed", text } as WorkoutTarget }];
  return {
    id,
    ...base,
    unit: supported ? parsed.unit : "set",
    sets: sets.map((s, i) => ({ id: `${id}/${i + 1}`, number: i + 1, ...s })),
    prescription: p,
    ...(rest ? { rest } : {}),
    ...(p.intensity ? { intensity: p.intensity } : {}),
    supported,
  };
}

function drillExercises(b: Builder, sectionId: string, block: PlanBlock, item: Extract<PlanItem, { kind: "drill" }>, excluded: ExcludedExercise[]): WorkoutExercise[] {
  const drill = getDrill(item.drillId);
  const p = item.prescription[b.phase];
  if (!drill) {
    excluded.push({ exerciseId: item.drillId, name: item.drillId, reason: "unknown" });
    b.unsupported.push({ id: `${sectionId}/${item.drillId}`, name: item.drillId, text: "Drill not in the library" });
    return [];
  }
  const omit = new Set(item.omit ?? []);
  // The condensed Preparation Drill keeps its own official order (Table 1-1) and per-exercise repetitions.
  const condensed = block.id === "pd-condensed" && p.reps ? parseCondensedReps(p.reps, drill) : null;
  const members = (condensed ? condensed.map((x) => x.exerciseId) : drill.sequence).filter((id) => !omit.has(id));
  for (const id of drill.sequence) {
    if (!members.includes(id)) excluded.push({ exerciseId: id, name: getExercise(id)?.name ?? id, reason: "plan" });
  }
  const out: WorkoutExercise[] = [];
  for (const exerciseId of members) {
    const reason = exclusionReason(exerciseId, b.prefs);
    const exercise = getExercise(exerciseId);
    if (reason || !exercise) {
      excluded.push({ exerciseId, name: exercise?.name ?? exerciseId, reason: reason ?? "unknown" });
      continue;
    }
    const execution = exercise.executions.find((x) => x.drillId === drill.id);
    const reps = condensed?.find((x) => x.exerciseId === exerciseId)?.reps;
    const parsed =
      reps !== undefined
        ? { count: 1, unit: "set" as const, targets: [{ target: { kind: "reps", reps } as WorkoutTarget }] }
        : parseDrillMember(drill, exerciseId, execution, p);
    out.push(
      makeExercise(
        b,
        sectionId,
        `${drill.id}.${exerciseId}`,
        {
          source: { kind: "drill", drillId: drill.id, exerciseId, order: drill.sequence.indexOf(exerciseId) + 1 },
          name: exercise.name,
          drillName: drill.name,
          ...(execution ? { cadence: cadenceLabels[execution.cadence] } : {}),
          safety: [...exercise.cautions, ...(p.notes ? [p.notes] : [])],
        },
        p,
        parsed
      )
    );
  }
  return out;
}

function itemExercises(b: Builder, sectionId: string, block: PlanBlock, item: PlanItem, excluded: ExcludedExercise[]): WorkoutExercise[] {
  if (item.kind === "drill") return drillExercises(b, sectionId, block, item, excluded);
  const p = item.prescription[b.phase];
  const parsed = parsePrescription(p);
  const sets = parsed && { count: parsed.count, unit: parsed.unit, targets: Array.from({ length: parsed.count }, () => ({ target: parsed.target })) };
  const notes = p.notes ? [p.notes] : [];
  if (item.kind === "activity") {
    const activity = activities[item.activityId];
    if (!activity || activityExcluded(item.activityId, b.prefs)) {
      excluded.push({ exerciseId: item.activityId, name: activity?.name ?? item.activityId, reason: activity ? "restriction" : "unknown" });
      return [];
    }
    return [makeExercise(b, sectionId, item.activityId, { source: { kind: "activity", activityId: item.activityId }, name: activity.name, safety: notes }, p, sets)];
  }
  const exercise = getExercise(item.exerciseId);
  const reason = exclusionReason(item.exerciseId, b.prefs);
  if (reason || !exercise) {
    excluded.push({ exerciseId: item.exerciseId, name: exercise?.name ?? item.exerciseId, reason: reason ?? "unknown" });
    if (!exercise) b.unsupported.push({ id: `${sectionId}/${item.exerciseId}`, name: item.exerciseId, text: "Exercise not in the library" });
    return [];
  }
  return [makeExercise(b, sectionId, item.exerciseId, { source: { kind: "exercise", exerciseId: item.exerciseId }, name: exercise.name, safety: [...exercise.cautions, ...notes] }, p, sets)];
}

// Tracking IDs are built from the session ID (stable across rescheduling), the session part, the block, and the
// exercise, never from dates, so moving a session keeps its records. A repeat within a session gets "~2", "~3".
export function buildWorkout(plan: StoredPlan, session: PlanSession, options: { phase: ProgressionPhase; progressionHeld?: boolean; createdAt: string }): WorkoutSnapshot {
  const b: Builder = { used: new Set(), prefs: plan.preferences, phase: options.phase, unsupported: [] };
  const parts: [WorkoutSection["phase"], PlanBlock[]][] = [
    ["warm-up", session.warmUp],
    ["main", session.main],
    ["recovery", session.recovery],
  ];
  const sections: WorkoutSection[] = parts.flatMap(([phase, blocks]) =>
    blocks.map((block) => {
      const id = uniqueId(`${session.id}/${phase}/${block.id}`, b.used);
      const excluded: ExcludedExercise[] = [];
      const exercises = block.items.flatMap((item) => itemExercises(b, id, block, item, excluded));
      return { id, phase, blockId: block.id, title: block.title, minutes: block.minutes, exercises, excluded, sources: block.sources, assumptions: block.assumptions };
    })
  );
  return {
    schemaVersion: WORKOUT_SCHEMA_VERSION,
    planId: plan.id,
    sessionId: session.id,
    week: session.week,
    kind: session.kind,
    title: session.title,
    templateVersion: plan.templateVersion,
    phase: options.phase,
    progressionHeld: options.progressionHeld ?? false,
    estimatedMinutes: session.estimatedMinutes,
    createdAt: options.createdAt,
    sections,
    unsupported: b.unsupported,
    safety: WORKOUT_SAFETY,
  };
}

export type WorkoutOutcome =
  | { status: "ready"; workout: WorkoutSnapshot }
  | { status: "paused"; message: string }
  | { status: "not-found" };

// A pain report pauses the plan, so no workout is offered (see PAIN_PAUSE_MESSAGE in progress.ts).
export function sessionWorkout(plan: StoredPlan, completions: SessionCompletion[], sessionId: string, createdAt: string): WorkoutOutcome {
  const session = plan.sessions.find((s) => s.id === sessionId);
  if (!session) return { status: "not-found" };
  if (painReported(plan, completions)) return { status: "paused", message: PAIN_PAUSE_MESSAGE };
  return { status: "ready", workout: buildWorkout(plan, session, { ...workoutPhase(plan, completions, session), createdAt }) };
}

export function workoutSetIds(workout: WorkoutSnapshot): string[] {
  return workout.sections.flatMap((s) => s.exercises.flatMap((e) => e.sets.map((set) => set.id)));
}

// ---------------------------------------------------------------------------
// Set records and completion
// ---------------------------------------------------------------------------

const isTimestamp = (value: string) => /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
const nonNegative = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function validateActual(actual: ActualPerformance): string[] {
  const errors: string[] = [];
  if (actual.reps !== undefined && !(nonNegative(actual.reps) && Number.isInteger(actual.reps))) errors.push("Repetitions must be a whole number of 0 or more.");
  if (actual.seconds !== undefined && !nonNegative(actual.seconds)) errors.push("Time must be 0 seconds or more.");
  if (actual.meters !== undefined && !nonNegative(actual.meters)) errors.push("Distance must be 0 meters or more.");
  if (actual.load !== undefined && !(nonNegative(actual.load.value) && (actual.load.unit === "lb" || actual.load.unit === "kg"))) errors.push("Weight must be 0 or more, in lb or kg.");
  return errors;
}

// Records one set. A second record for the same set replaces the first, so a set is never counted twice.
// Session completions are required so a pain report blocks new records the same way it blocks sessions.
export function recordSetCompletion(
  records: SetCompletion[],
  workout: WorkoutSnapshot,
  entry: { setId: string; completedAt: string; actual?: ActualPerformance },
  sessionCompletions: SessionCompletion[]
): { ok: true; records: SetCompletion[] } | { ok: false; errors: string[] } {
  if (sessionCompletions.some((c) => c.planId === workout.planId && c.pain)) return { ok: false, errors: [PAIN_PAUSE_MESSAGE] };
  const errors: string[] = [];
  if (!workoutSetIds(workout).includes(entry.setId)) errors.push("That set is not part of this workout.");
  if (!isTimestamp(entry.completedAt)) errors.push("Completion time must be an ISO timestamp.");
  if (entry.actual) errors.push(...validateActual(entry.actual));
  if (errors.length) return { ok: false, errors };
  const record: SetCompletion = { planId: workout.planId, sessionId: workout.sessionId, setId: entry.setId, completedAt: entry.completedAt, ...(entry.actual ? { actual: entry.actual } : {}) };
  const others = records.filter((r) => !(r.planId === record.planId && r.sessionId === record.sessionId && r.setId === record.setId));
  return { ok: true, records: [...others, record] };
}

export function undoSetCompletion(records: SetCompletion[], planId: string, sessionId: string, setId: string): SetCompletion[] {
  return records.filter((r) => !(r.planId === planId && r.sessionId === sessionId && r.setId === setId));
}

export type CompletionCount = { completed: number; total: number; percent: number | null };

export type WorkoutProgress = {
  overall: CompletionCount & { exercisesCompleted: number; exercisesTotal: number };
  sections: (CompletionCount & { id: string; exercisesCompleted: number; exercisesTotal: number })[];
  exercises: (CompletionCount & { id: string; complete: boolean })[];
  // Records that did not count: repeats of a set already counted, set IDs this workout doesn't have, and
  // records for other plans or sessions.
  ignored: { duplicate: number; unknown: number; otherSession: number };
};

// Rounded down so 100% means every set was recorded. Null when there is nothing to track.
const count = (completed: number, total: number): CompletionCount => ({ completed, total, percent: total ? Math.floor((completed * 100) / total) : null });

// Counts each known set at most once. Only what was recorded counts; a session record does not complete sets.
export function workoutProgress(workout: WorkoutSnapshot, records: SetCompletion[]): WorkoutProgress {
  const known = new Set(workoutSetIds(workout));
  const done = new Set<string>();
  const ignored = { duplicate: 0, unknown: 0, otherSession: 0 };
  for (const r of records) {
    if (r.planId !== workout.planId || r.sessionId !== workout.sessionId) ignored.otherSession++;
    else if (!known.has(r.setId)) ignored.unknown++;
    else if (done.has(r.setId)) ignored.duplicate++;
    else done.add(r.setId);
  }
  const exercises = workout.sections.flatMap((s) =>
    s.exercises.map((e) => {
      const c = count(e.sets.filter((set) => done.has(set.id)).length, e.sets.length);
      return { id: e.id, ...c, complete: c.total > 0 && c.completed === c.total };
    })
  );
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const sections = workout.sections.map((s) => {
    const list = s.exercises.map((e) => byId.get(e.id)!);
    return {
      id: s.id,
      ...count(list.reduce((n, e) => n + e.completed, 0), list.reduce((n, e) => n + e.total, 0)),
      exercisesCompleted: list.filter((e) => e.complete).length,
      exercisesTotal: list.length,
    };
  });
  return {
    overall: {
      ...count(done.size, known.size),
      exercisesCompleted: exercises.filter((e) => e.complete).length,
      exercisesTotal: exercises.length,
    },
    sections,
    exercises,
    ignored,
  };
}

// The newest record for each set, for showing actual performance.
export function latestSetRecords(workout: WorkoutSnapshot, records: SetCompletion[]): Map<string, SetCompletion> {
  const known = new Set(workoutSetIds(workout));
  const latest = new Map<string, SetCompletion>();
  for (const r of records) {
    if (r.planId !== workout.planId || r.sessionId !== workout.sessionId || !known.has(r.setId)) continue;
    const prev = latest.get(r.setId);
    if (!prev || r.completedAt > prev.completedAt) latest.set(r.setId, r);
  }
  return latest;
}
