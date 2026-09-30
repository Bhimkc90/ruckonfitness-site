import type { AftEventCode, AftInput, AftResult } from "@/lib/aft/types";
import type { DrillId } from "@/lib/library/types";

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

export type PlanDraft = {
  templateVersion: string;
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

export type StoredPlan = PlanDraft & {
  id: string;
  createdAt: string;
  startDate: string; // YYYY-MM-DD
  status: "active" | "ended";
  // Session id -> YYYY-MM-DD; overrides the default date for rescheduled sessions.
  reschedules: Record<string, string>;
};
