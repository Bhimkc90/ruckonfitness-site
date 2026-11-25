import { WORKOUT_SCHEMA_VERSION, trackableSetIds, validateActual, workoutSetIds } from "@/lib/training/workout";
import type {
  PlanBlock,
  PlanItem,
  SessionCompletion,
  SetCompletion,
  StoredPlan,
  StoredWorkout,
  WorkoutExercise,
  WorkoutPainReport,
  WorkoutSection,
  WorkoutSnapshot,
  WorkoutTarget,
} from "@/lib/training/types";

// Validation for stored workouts, set records, and pain reports. Used strictly for backups (anything invalid
// rejects the file) and leniently when reading this browser's storage (invalid records are dropped, except that
// a damaged pain report still pauses its plan).

export const WORKOUT_LIMITS = {
  sections: 20,
  exercisesPerSection: 60,
  setsPerExercise: 20,
  listItems: 60,
  text: 2000,
  id: 300,
  notes: 500,
  setRecords: 20_000,
  painReports: 1000,
} as const;

type Workouts = { plans: StoredPlan[]; completions: SessionCompletion[]; workouts: StoredWorkout[]; setRecords: SetCompletion[]; painReports: WorkoutPainReport[] };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isText = (v: unknown, max: number = WORKOUT_LIMITS.text): v is string => typeof v === "string" && v.length <= max;
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= WORKOUT_LIMITS.id;
export const isTimestamp = (v: unknown): v is string => typeof v === "string" && v.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));
const isCount = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const textList = (v: unknown) => Array.isArray(v) && v.length <= WORKOUT_LIMITS.listItems && v.every((x) => isText(x));
const optional = (v: unknown, check: (x: unknown) => boolean) => v === undefined || check(v);
const keysWithin = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));

// JSON with object keys sorted, so stored and expected values compare regardless of key order.
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v
  );
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

const SECONDS = 6 * 3600;

function validTarget(t: unknown): t is WorkoutTarget {
  if (!isObject(t)) return false;
  switch (t.kind) {
    case "reps":
      return keysWithin(t, ["kind", "reps", "upTo", "secondsEach"]) && isCount(t.reps, 1, 1000) && optional(t.upTo, (x) => x === true) && optional(t.secondsEach, (x) => isCount(x, 1, 600));
    case "rep-range":
      return keysWithin(t, ["kind", "min", "max"]) && isCount(t.min, 1, 1000) && isCount(t.max, 1, 1000) && (t.min as number) < (t.max as number);
    case "hold":
      return keysWithin(t, ["kind", "seconds", "upTo"]) && isCount(t.seconds, 1, SECONDS) && optional(t.upTo, (x) => x === true);
    case "hold-range":
      return keysWithin(t, ["kind", "minSeconds", "maxSeconds"]) && isCount(t.minSeconds, 1, SECONDS) && isCount(t.maxSeconds, 1, SECONDS) && (t.minSeconds as number) < (t.maxSeconds as number);
    case "duration":
      return keysWithin(t, ["kind", "seconds"]) && isCount(t.seconds, 1, SECONDS);
    case "interval":
      return keysWithin(t, ["kind", "workSeconds", "recoverySeconds", "work", "recovery"]) && isCount(t.workSeconds, 1, 3600) && isCount(t.recoverySeconds, 0, 3600) && isText(t.work, 100) && isText(t.recovery, 100);
    case "distance":
      return keysWithin(t, ["kind", "meters", "description"]) && isCount(t.meters, 1, 100_000) && isText(t.description);
    case "as-prescribed":
      return keysWithin(t, ["kind", "text"]) && isText(t.text);
    default:
      return false;
  }
}

const PRESCRIPTION_KEYS = ["sets", "reps", "time", "rest", "intensity", "notes"];
const validPrescription = (p: unknown) => isObject(p) && keysWithin(p, PRESCRIPTION_KEYS) && Object.values(p).every((v) => isText(v));

function itemMatches(item: PlanItem, e: WorkoutExercise): boolean {
  const s = e.source;
  if (s.kind === "drill") return item.kind === "drill" && item.drillId === s.drillId;
  if (s.kind === "exercise") return item.kind === "exercise" && item.exerciseId === s.exerciseId;
  return item.kind === "activity" && item.activityId === s.activityId;
}

function validSource(s: unknown): boolean {
  if (!isObject(s)) return false;
  if (s.kind === "drill") return keysWithin(s, ["kind", "drillId", "exerciseId", "order"]) && isId(s.drillId) && isId(s.exerciseId) && isCount(s.order, 1, 100);
  if (s.kind === "exercise") return keysWithin(s, ["kind", "exerciseId"]) && isId(s.exerciseId);
  if (s.kind === "activity") return keysWithin(s, ["kind", "activityId"]) && isId(s.activityId);
  return false;
}

function validExercise(e: unknown, sectionId: string, block: PlanBlock, phase: "foundation" | "build"): e is WorkoutExercise {
  if (!isObject(e) || !isId(e.id) || !e.id.startsWith(`${sectionId}/`) || !validSource(e.source) || !isText(e.name, 200)) return false;
  if (!optional(e.drillName, (x) => isText(x, 200)) || !["set", "round", "hold", "repeat"].includes(e.unit as string) || typeof e.supported !== "boolean") return false;
  if (!validPrescription(e.prescription) || !optional(e.intensity, (x) => isText(x)) || !optional(e.cadence, (x) => isText(x, 200)) || !textList(e.safety)) return false;
  if (e.rest !== undefined) {
    const r = e.rest;
    if (!isObject(r) || !isText(r.text, 200) || !isCount(r.minSeconds, 0, 3600) || !isCount(r.maxSeconds, 0, 3600) || (r.minSeconds as number) > (r.maxSeconds as number) || !["sets", "rounds"].includes(r.between as string)) return false;
  }
  if (!Array.isArray(e.sets) || e.sets.length < 1 || e.sets.length > WORKOUT_LIMITS.setsPerExercise) return false;
  const setsOk = e.sets.every((set, i) => isObject(set) && set.id === `${e.id}/${i + 1}` && set.number === i + 1 && validTarget(set.target) && optional(set.instruction, (x) => isText(x)));
  if (!setsOk) return false;
  const exercise = e as WorkoutExercise;
  // Unsupported exercises have exactly one "as written" set; supported ones have none.
  const written = exercise.sets.filter((s) => s.target.kind === "as-prescribed").length;
  if (exercise.supported ? written !== 0 : written !== exercise.sets.length || exercise.sets.length !== 1) return false;
  // The workload text must be the plan's own prescription for this phase, so a snapshot can't carry an invented one.
  return block.items.some((item) => itemMatches(item, exercise) && canonical(item.prescription[phase]) === canonical(exercise.prescription));
}

const EXCLUDED_REASONS = ["plan", "restriction", "equipment", "unknown"];

// A snapshot is valid only for its own plan and session: same IDs and template version, one section per plan
// block in order, and every exercise's prescription taken from that block for the snapshot's phase.
export function validSnapshot(s: unknown, plan: StoredPlan): s is WorkoutSnapshot {
  if (!isObject(s) || s.schemaVersion !== WORKOUT_SCHEMA_VERSION || s.planId !== plan.id || s.templateVersion !== plan.templateVersion) return false;
  const session = plan.sessions.find((x) => x.id === s.sessionId);
  if (!session || s.week !== session.week || s.kind !== session.kind || !isText(s.title, 300) || !isCount(s.estimatedMinutes, 0, 600)) return false;
  if (s.phase !== "foundation" && s.phase !== "build") return false;
  if (s.phase === "build" && session.week < 3) return false;
  if (typeof s.progressionHeld !== "boolean" || (s.progressionHeld && s.phase !== "foundation") || !isTimestamp(s.createdAt) || !textList(s.safety)) return false;
  const blocks: [WorkoutSection["phase"], PlanBlock][] = [
    ...session.warmUp.map((b) => ["warm-up", b] as [WorkoutSection["phase"], PlanBlock]),
    ...session.main.map((b) => ["main", b] as [WorkoutSection["phase"], PlanBlock]),
    ...session.recovery.map((b) => ["recovery", b] as [WorkoutSection["phase"], PlanBlock]),
  ];
  if (!Array.isArray(s.sections) || s.sections.length !== blocks.length || s.sections.length > WORKOUT_LIMITS.sections) return false;
  const phase = s.phase;
  const sectionsOk = s.sections.every((section, i) => {
    const [part, block] = blocks[i];
    if (!isObject(section) || !isId(section.id) || !section.id.startsWith(`${session.id}/${part}/${block.id}`) || section.phase !== part || section.blockId !== block.id) return false;
    if (!isText(section.title, 300) || !isCount(section.minutes, 0, 600) || !textList(section.sources) || !textList(section.assumptions)) return false;
    if (!Array.isArray(section.excluded) || section.excluded.length > WORKOUT_LIMITS.listItems) return false;
    if (!section.excluded.every((x) => isObject(x) && isId(x.exerciseId) && isText(x.name, 300) && EXCLUDED_REASONS.includes(x.reason as string))) return false;
    if (!Array.isArray(section.exercises) || section.exercises.length > WORKOUT_LIMITS.exercisesPerSection) return false;
    return section.exercises.every((e) => validExercise(e, section.id as string, block, phase));
  });
  if (!sectionsOk) return false;
  if (!Array.isArray(s.unsupported) || s.unsupported.length > WORKOUT_LIMITS.listItems) return false;
  if (!s.unsupported.every((u) => isObject(u) && isId(u.id) && isText(u.name, 300) && isText(u.text))) return false;
  const snapshot = s as WorkoutSnapshot;
  const ids = [...snapshot.sections.map((x) => x.id), ...snapshot.sections.flatMap((x) => x.exercises.map((e) => e.id)), ...workoutSetIds(snapshot)];
  return new Set(ids).size === ids.length;
}

export function validStoredWorkout(w: unknown, plan: StoredPlan): w is StoredWorkout {
  if (!isObject(w) || !keysWithin(w, ["planId", "sessionId", "status", "startedAt", "completedAt", "snapshot"])) return false;
  if (w.planId !== plan.id || !isId(w.sessionId) || !isTimestamp(w.startedAt)) return false;
  if (w.status === "completed" ? !isTimestamp(w.completedAt) || (w.completedAt as string) < (w.startedAt as string) : w.status !== "in-progress" || w.completedAt !== undefined) return false;
  return validSnapshot(w.snapshot, plan) && w.snapshot.sessionId === w.sessionId && w.snapshot.createdAt === w.startedAt;
}

export function validSetRecord(r: unknown, workout: StoredWorkout): r is SetCompletion {
  if (!isObject(r) || !keysWithin(r, ["planId", "sessionId", "setId", "completedAt", "actual"])) return false;
  if (r.planId !== workout.planId || r.sessionId !== workout.sessionId || !isId(r.setId) || !isTimestamp(r.completedAt)) return false;
  if (r.actual !== undefined && (!isObject(r.actual) || validateActual(r.actual).length > 0)) return false;
  return trackableSetIds(workout.snapshot).includes(r.setId);
}

export function validPainReport(r: unknown, plans: StoredPlan[], workouts: StoredWorkout[]): r is WorkoutPainReport {
  if (!isObject(r) || !keysWithin(r, ["planId", "sessionId", "reportedAt", "setId", "notes"])) return false;
  const plan = plans.find((p) => p.id === r.planId);
  if (!plan || !plan.sessions.some((s) => s.id === r.sessionId) || !isTimestamp(r.reportedAt) || !isText(r.notes, WORKOUT_LIMITS.notes)) return false;
  if (r.setId === undefined) return true;
  const workout = workouts.find((w) => w.planId === r.planId && w.sessionId === r.sessionId);
  return !!workout && isId(r.setId) && workoutSetIds(workout.snapshot).includes(r.setId);
}

const key = (x: { planId: string; sessionId: string }) => `${x.planId}/${x.sessionId}`;

// ---------------------------------------------------------------------------
// Whole-section checks
// ---------------------------------------------------------------------------

// Strict check for backups. Returns the first problem, or null when every record is valid and consistent.
export function checkWorkoutData(raw: { workouts: unknown[]; setRecords: unknown[]; painReports: unknown[] }, plans: StoredPlan[], completions: SessionCompletion[]): string | null {
  const totalSessions = plans.reduce((n, p) => n + p.sessions.length, 0);
  if (raw.workouts.length > totalSessions || raw.setRecords.length > WORKOUT_LIMITS.setRecords || raw.painReports.length > WORKOUT_LIMITS.painReports) {
    return "The workout records are larger than RuckOn allows.";
  }
  const workouts: StoredWorkout[] = [];
  for (const w of raw.workouts) {
    const plan = isObject(w) ? plans.find((p) => p.id === w.planId) : undefined;
    if (!plan) return "A started workout refers to a plan that isn't in the backup.";
    if (!validStoredWorkout(w, plan)) return "A started workout is incomplete, invalid, or doesn't match its plan.";
    if (workouts.some((x) => key(x) === key(w))) return "A workout is started more than once.";
    workouts.push(w);
  }
  const records = new Set<string>();
  for (const r of raw.setRecords) {
    const workout = isObject(r) ? workouts.find((w) => w.planId === r.planId && w.sessionId === r.sessionId) : undefined;
    if (!workout) return "A recorded set refers to a workout that isn't in the backup.";
    if (!validSetRecord(r, workout)) return "A recorded set is invalid or isn't part of its workout.";
    const id = `${key(r)}/${r.setId}`;
    if (records.has(id)) return "A set is recorded more than once.";
    records.add(id);
  }
  if (!raw.painReports.every((r) => validPainReport(r, plans, workouts))) return "A pain report is incomplete or refers to a plan, session, or set that isn't in the backup.";
  for (const w of workouts) {
    const completion = completions.find((c) => key(c) === key(w));
    if (w.status === "completed") {
      if (!completion) return "A completed workout has no session record.";
      const recorded = trackableSetIds(w.snapshot).filter((id) => records.has(`${key(w)}/${id}`)).length;
      if (w.snapshot.unsupported.length > 0 || recorded !== trackableSetIds(w.snapshot).length || recorded === 0) return "A workout is marked complete without every set recorded.";
    } else if (completion) return "A session is recorded as completed while its workout is still in progress.";
  }
  return null;
}

// Lenient read of this browser's storage: keeps valid records, drops invalid ones, and keeps the newest record
// per set. A pain report is kept whenever it names a plan, because dropping it would silently lift a pause.
export function sanitizeWorkoutData(raw: Record<string, unknown>, plans: StoredPlan[]): Pick<Workouts, "workouts" | "setRecords" | "painReports"> {
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const workouts: StoredWorkout[] = [];
  for (const w of list(raw.workouts)) {
    const plan = isObject(w) ? plans.find((p) => p.id === w.planId) : undefined;
    if (plan && validStoredWorkout(w, plan) && !workouts.some((x) => key(x) === key(w))) workouts.push(w);
  }
  const latest = new Map<string, SetCompletion>();
  for (const r of list(raw.setRecords).slice(0, WORKOUT_LIMITS.setRecords)) {
    const workout = isObject(r) ? workouts.find((w) => w.planId === r.planId && w.sessionId === r.sessionId) : undefined;
    if (!workout || !validSetRecord(r, workout)) continue;
    const id = `${key(r)}/${r.setId}`;
    const prev = latest.get(id);
    if (!prev || r.completedAt > prev.completedAt) latest.set(id, r);
  }
  const painReports: WorkoutPainReport[] = [];
  for (const r of list(raw.painReports)) {
    if (!isObject(r) || !isId(r.planId)) continue;
    painReports.push({
      planId: r.planId,
      sessionId: isId(r.sessionId) ? r.sessionId : "",
      reportedAt: typeof r.reportedAt === "string" ? r.reportedAt.slice(0, 40) : "",
      ...(isId(r.setId) ? { setId: r.setId } : {}),
      notes: typeof r.notes === "string" ? r.notes.slice(0, WORKOUT_LIMITS.notes) : "",
    });
  }
  return { workouts, setRecords: [...latest.values()], painReports };
}
