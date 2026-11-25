import type { AftEventCode, AftInput, AftResult } from "@/lib/aft/types";
import type { DrillId } from "@/lib/library/types";
import type { PlanPathway } from "./pathways";

export type WeekdayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type Experience = "new" | "some" | "regular";
// Minutes of running per week, on average, over the last four weeks (self-reported).
export type RunningVolume = "none" | "up-to-30" | "31-60" | "61-120" | "over-120";
export type EquipmentOption = "kettlebell" | "dumbbell" | "barbell-or-hex-bar";
export type Restriction = "no-running" | "no-jumping" | "no-loaded-lifting" | "no-weight-on-hands";
export type SessionMinutes = 30 | 45 | 60;
export type DaysPerWeek = 2 | 3 | 4 | 5;

export type Preferences = {
  daysPerWeek: DaysPerWeek;
  weekdays: WeekdayId[];
  sessionMinutes: SessionMinutes;
  equipment: EquipmentOption[];
  runningAccess: boolean;
  experience: Experience;
  recentRunning: RunningVolume;
  nextAftDate?: string; // YYYY-MM-DD
  targetScore?: number;
  restrictions: Restriction[];
};

// What the wizard collects. Answers AFT scores cannot establish (equipment, a place to run, experience,
// recent running) start unanswered (null) and must be answered before a plan is generated.
export type PreferenceAnswers = Omit<Preferences, "equipment" | "runningAccess" | "experience" | "recentRunning"> & {
  equipment: EquipmentOption[] | null;
  runningAccess: boolean | null;
  experience: Experience | null;
  recentRunning: RunningVolume | null;
};

export type Screening = {
  // Pain that currently limits exercise, or being told not to train.
  currentPain: boolean | null;
  // Any instruction the checkboxes cannot capture. RuckOn does not interpret it.
  otherInstructions: string;
};

export type BaselineSnapshot = {
  resultId: string;
  testDate: string;
  input: AftInput;
  result: AftResult;
};

export type EventRole = "develop" | "maintain";

export type EventAnalysis = {
  event: AftEventCode;
  points: number;
  raw: number;
  passed: boolean;
  role: EventRole;
  // 1 = highest development priority; null for maintained events.
  priority: number | null;
  reason: string;
};

export type Prescription = {
  sets?: string;
  reps?: string;
  time?: string;
  rest?: string;
  intensity?: string;
  notes?: string;
};

export type PhasedPrescription = { foundation: Prescription; build: Prescription };

export type ActivityId = "walk" | "easy-run" | "intervals-30-60" | "hrp-practice" | "plank-practice";

export type PlanItem =
  | { kind: "drill"; drillId: DrillId; omit?: string[]; prescription: PhasedPrescription }
  | { kind: "exercise"; exerciseId: string; prescription: PhasedPrescription }
  | { kind: "activity"; activityId: ActivityId; prescription: PhasedPrescription };

export type PlanBlock = {
  id: string;
  title: string;
  minutes: number;
  items: PlanItem[];
  sources: string[];
  assumptions: string[];
};

export type SessionKind = "strength" | "speed" | "conditioning" | "endurance" | "recovery";

export type PlanSession = {
  id: string; // e.g. "w2-s3", stable across rescheduling
  week: number; // 1–4
  weekday: WeekdayId;
  kind: SessionKind;
  title: string;
  purpose: string;
  estimatedMinutes: number;
  warmUp: PlanBlock[];
  main: PlanBlock[];
  recovery: PlanBlock[];
};

// How the plan fits the time before a scheduled AFT. Computed when the plan is generated and stored with it.
export type Timeline = {
  nextAftDate: string;
  daysUntilAft: number; // from the plan start date
  planWeeks: number;
  planEndDate: string;
  fitsBeforeAft: boolean;
  sessionsBeforeAft: number;
  sessionsOnAftDay: number;
  summary: string[];
};

export type PlanDraft = {
  templateVersion: string;
  // The AFT failure pattern and how far the templates cover it. Absent on plans saved before v4.
  pathway?: PlanPathway;
  baseline: BaselineSnapshot;
  preferences: Preferences;
  analysis: EventAnalysis[];
  // Scoring category and the pass/fail rule that applies to the baseline.
  standardSummary: string;
  focusSummary: string[];
  // How the findings changed the sessions.
  rationale: string[];
  limitations: string[];
  scheduleNotes: string[];
  assumptions: string[];
  reassessment: string;
  timeline?: Timeline;
  weeklyRunningMinutes: number;
  sessions: PlanSession[];
};

export type PlanOutcome =
  | { status: "ready"; plan: PlanDraft }
  | { status: "paused"; message: string }
  | { status: "needs-review"; reasons: string[] }
  | { status: "not-possible"; reasons: string[] }
  | { status: "invalid"; errors: string[] };

export type Difficulty = "easy" | "about-right" | "hard" | "too-hard";

export type SessionCompletion = {
  planId: string;
  sessionId: string;
  completedAt: string; // ISO timestamp
  difficulty: Difficulty;
  pain: boolean;
  notes: string;
};

// A later AFT result linked to the plan as its reassessment. A copy, like the baseline, so it survives edits.
export type ReassessmentLink = BaselineSnapshot & { linkedAt: string };

export type StoredPlan = PlanDraft & {
  id: string;
  createdAt: string;
  startDate: string; // YYYY-MM-DD
  status: "active" | "ended";
  // Session id -> YYYY-MM-DD; overrides the default date for rescheduled sessions.
  reschedules: Record<string, string>;
  reassessmentLink?: ReassessmentLink;
};

// ---------------------------------------------------------------------------
// Workout tracking (lib/training/workout.ts)
// ---------------------------------------------------------------------------

// Which prescription a session uses: weeks 1–2 are foundation; weeks 3–4 are build unless progression is held.
export type ProgressionPhase = keyof PhasedPrescription;

// What one set, round, hold, or repeat asks for, parsed from the plan's prescription text. Nothing is estimated:
// text the parser does not recognize becomes "as-prescribed" and keeps the original wording.
export type WorkoutTarget =
  | { kind: "reps"; reps: number; upTo?: boolean; secondsEach?: number }
  | { kind: "rep-range"; min: number; max: number }
  | { kind: "hold"; seconds: number; upTo?: boolean }
  | { kind: "hold-range"; minSeconds: number; maxSeconds: number }
  | { kind: "duration"; seconds: number }
  | { kind: "interval"; workSeconds: number; recoverySeconds: number; work: string; recovery: string }
  | { kind: "distance"; meters: number; description: string }
  | { kind: "as-prescribed"; text: string };

export type WorkoutSetUnit = "set" | "round" | "hold" | "repeat";

export type WorkoutRest = { text: string; minSeconds: number; maxSeconds: number; between: "sets" | "rounds" };

export type WorkoutSet = {
  id: string; // tracking ID, e.g. "w1-s1/main/mdl-deadlift/deadlift/2"
  number: number; // 1-based
  target: WorkoutTarget;
  instruction?: string; // the library step for this hold, when the drill holds more than one position
};

export type WorkoutExerciseSource =
  | { kind: "drill"; drillId: DrillId; exerciseId: string; order: number } // order: 1-based position in the official sequence
  | { kind: "exercise"; exerciseId: string }
  | { kind: "activity"; activityId: ActivityId };

export type WorkoutExercise = {
  id: string;
  source: WorkoutExerciseSource;
  name: string;
  drillName?: string;
  unit: WorkoutSetUnit;
  sets: WorkoutSet[];
  // The prescription for this phase as the plan stores it, for display and review.
  prescription: Prescription;
  rest?: WorkoutRest;
  intensity?: string;
  cadence?: string;
  // Library cautions and the prescription's own notes (e.g. using a spotter).
  safety: string[];
  // False when any part of the prescription was not recognized; its sets are then "as-prescribed".
  supported: boolean;
};

export type ExcludedExercise = {
  exerciseId: string;
  name: string;
  // "plan": the plan itself omits it (restrictions, condensed drill, no sprinting). "restriction" or "equipment":
  // the plan lists it, but the stored preferences don't allow it, so tracking leaves it out rather than prompt it.
  // "unknown": the ID is not in the library, so RuckOn cannot check it against restrictions.
  reason: "plan" | "restriction" | "equipment" | "unknown";
};

export type WorkoutSection = {
  id: string;
  phase: "warm-up" | "main" | "recovery";
  blockId: string;
  title: string;
  minutes: number;
  exercises: WorkoutExercise[];
  excluded: ExcludedExercise[];
  sources: string[];
  assumptions: string[];
};

export type WorkoutSnapshot = {
  schemaVersion: 1;
  planId: string;
  sessionId: string;
  week: number;
  kind: SessionKind;
  title: string;
  templateVersion: string;
  phase: ProgressionPhase;
  // True when weeks 3–4 repeat the foundation prescription because an earlier session was too hard or painful.
  progressionHeld: boolean;
  estimatedMinutes: number;
  createdAt: string; // ISO timestamp
  sections: WorkoutSection[];
  // Exercises whose prescription was not recognized (by tracking ID), and items left out as unknown.
  unsupported: { id: string; name: string; text: string }[];
  safety: string[];
};

export type ActualPerformance = {
  reps?: number;
  seconds?: number;
  meters?: number;
  load?: { value: number; unit: "lb" | "kg" };
};

// One completed set, round, hold, or repeat. Recorded only by the user; never inferred from a session record.
export type SetCompletion = {
  planId: string;
  sessionId: string;
  setId: string;
  completedAt: string; // ISO timestamp
  actual?: ActualPerformance;
};

// Pain reported while a workout is under way, before the session is recorded. Like a session record with pain,
// it pauses the whole plan. Phase 2 persists it on its own, immediately, so the pause survives a closed tab;
// it is never folded into a session completion, which would mark the session done.
export type WorkoutPainReport = {
  planId: string;
  sessionId: string;
  reportedAt: string; // ISO timestamp
  setId?: string; // the set in progress, if the person chose one
  notes: string;
};

// Every record that can pause a plan or hold its progression. Functions that offer or record training take
// both, so neither source can be forgotten.
export type SafetyRecords = { sessionCompletions: SessionCompletion[]; painReports: WorkoutPainReport[] };

// A started workout as stored. Its snapshot is the frozen prescription; it is never rebuilt from the plan.
// "completed" only through the tracked workflow, together with the session's completion record.
export type StoredWorkout = {
  planId: string;
  sessionId: string;
  status: "in-progress" | "completed";
  startedAt: string; // ISO timestamp, the same as snapshot.createdAt
  completedAt?: string; // ISO timestamp, present only when completed
  snapshot: WorkoutSnapshot;
  // Active workout time. Absent on workouts saved before timing existed.
  timer?: WorkoutTimer;
  // Active time when the workout was completed, in whole seconds. Absent for workouts completed before timing existed.
  durationSeconds?: number;
};

// Accumulated active time plus the segment running now. A running segment counts only up to shortly after the last
// sign of activity (lastSeenAt), so a workout left open or abandoned doesn't count the hours away.
export type WorkoutTimer = {
  elapsedMs: number;
  runningSince?: string; // ISO timestamp; absent while paused
  lastSeenAt?: string; // ISO timestamp of the last heartbeat or action while running
};
