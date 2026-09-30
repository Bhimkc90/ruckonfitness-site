import type { AftStandard, Gender } from "@/lib/aft/types";
import { MIN_AFT_AGE } from "@/lib/aft/scoring";
import { WEEKDAYS } from "@/lib/training/engine";
import type {
  DaysPerWeek,
  EquipmentOption,
  Experience,
  PreferenceAnswers,
  Restriction,
  RunningVolume,
  SessionMinutes,
  WeekdayId,
} from "@/lib/training/types";

// The Soldier profile holds defaults only. Saved AFT results keep their own demographics snapshot and
// active training plans keep their own preferences, so editing or deleting the profile never changes them.
// No military identifiers, diagnoses, or medical documents are collected.

export const PROFILE_SCHEMA_VERSION = 1;
export const MAX_NAME_LENGTH = 40;
const MAX_AGE = 99;

export type TrainingProfile = {
  weekdays?: WeekdayId[];
  sessionMinutes?: SessionMinutes;
  equipment?: EquipmentOption[]; // [] = no equipment (answered); undefined = not answered
  runningAccess?: boolean;
  experience?: Experience;
  recentRunning?: RunningVolume;
  restrictions?: Restriction[];
};

export type SoldierProfile = {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  updatedAt: string; // ISO timestamp
  displayName?: string;
  // Date of birth, so the age on each test date is exact, including backdated tests.
  dateOfBirth?: string; // YYYY-MM-DD
  standard?: AftStandard;
  gender?: Gender; // score-table column for the general standard
  nextAftDate?: string; // YYYY-MM-DD
  targetScore?: number;
  training: TrainingProfile;
};

export const EQUIPMENT: EquipmentOption[] = ["kettlebell", "dumbbell", "barbell-or-hex-bar"];
export const RESTRICTIONS: Restriction[] = ["no-running", "no-jumping", "no-loaded-lifting", "no-weight-on-hands"];
export const EXPERIENCE: Experience[] = ["new", "some", "regular"];
export const RUNNING: RunningVolume[] = ["none", "up-to-30", "31-60", "61-120", "over-120"];
export const SESSION_MINUTES: SessionMinutes[] = [30, 45, 60];

// ---------------------------------------------------------------------------
// Dates and age
// ---------------------------------------------------------------------------

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Whole years between a date of birth and a date (both YYYY-MM-DD). A 29 February birthday
// counts as 1 March in non-leap years.
export function ageOn(dateOfBirth: string, date: string): number {
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Form values and validation
// ---------------------------------------------------------------------------

export type ProfileFormValues = {
  displayName: string;
  dateOfBirth: string;
  standard: "" | AftStandard;
  gender: "" | Gender;
  nextAftDate: string;
  targetScore: string;
  weekdays: WeekdayId[];
  sessionMinutes: "" | SessionMinutes;
  equipment: EquipmentOption[] | null;
  runningAccess: boolean | null;
  experience: "" | Experience;
  recentRunning: "" | RunningVolume;
  restrictions: Restriction[];
};

export type ProfileField = keyof ProfileFormValues;

export const emptyProfileForm: ProfileFormValues = {
  displayName: "",
  dateOfBirth: "",
  standard: "",
  gender: "",
  nextAftDate: "",
  targetScore: "",
  weekdays: [],
  sessionMinutes: "",
  equipment: null,
  runningAccess: null,
  experience: "",
  recentRunning: "",
  restrictions: [],
};

export function profileToForm(profile: SoldierProfile | null): ProfileFormValues {
  if (!profile) return emptyProfileForm;
  const t = profile.training;
  return {
    displayName: profile.displayName ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    standard: profile.standard ?? "",
    gender: profile.gender ?? "",
    nextAftDate: profile.nextAftDate ?? "",
    targetScore: profile.targetScore !== undefined ? String(profile.targetScore) : "",
    weekdays: t.weekdays ?? [],
    sessionMinutes: t.sessionMinutes ?? "",
    equipment: t.equipment ?? null,
    runningAccess: t.runningAccess ?? null,
    experience: t.experience ?? "",
    recentRunning: t.recentRunning ?? "",
    restrictions: t.restrictions ?? [],
  };
}

export type ProfileValidation =
  | { ok: true; profile: SoldierProfile }
  | { ok: false; errors: Partial<Record<ProfileField, string>> };

// `today` is the local date (YYYY-MM-DD); `now` is the ISO timestamp recorded as updatedAt.
export function validateProfileForm(values: ProfileFormValues, today: string, now: string): ProfileValidation {
  const errors: Partial<Record<ProfileField, string>> = {};

  const displayName = values.displayName.trim().replace(/\s+/g, " ");
  if (displayName.length > MAX_NAME_LENGTH) errors.displayName = `Use ${MAX_NAME_LENGTH} characters or fewer.`;

  const dob = values.dateOfBirth.trim();
  if (dob) {
    if (!isValidDate(dob)) errors.dateOfBirth = "Enter a valid date.";
    else if (dob > today) errors.dateOfBirth = "Date of birth can't be in the future.";
    else {
      const age = ageOn(dob, today);
      if (age < MIN_AFT_AGE || age > MAX_AGE) errors.dateOfBirth = `Age must be from ${MIN_AFT_AGE} to ${MAX_AGE} for AFT scoring.`;
    }
  }

  if (values.standard && values.standard !== "general" && values.standard !== "combat") errors.standard = "Choose a standard.";
  if (values.gender && values.gender !== "M" && values.gender !== "F") errors.gender = "Choose a score table.";

  const nextAftDate = values.nextAftDate.trim();
  if (nextAftDate) {
    if (!isValidDate(nextAftDate)) errors.nextAftDate = "Enter a valid date.";
    else if (nextAftDate < today) errors.nextAftDate = "Next AFT date can't be in the past.";
  }

  const target = values.targetScore.trim();
  let targetScore: number | undefined;
  if (target) {
    if (!/^\d+$/.test(target) || Number(target) > 500) errors.targetScore = "Enter a whole number from 0 to 500.";
    else targetScore = Number(target);
  }

  const weekdays = WEEKDAYS.filter((d) => values.weekdays.includes(d));
  if (weekdays.length === 1 || weekdays.length > 5) errors.weekdays = "Choose 2 to 5 days, or none.";
  if (values.sessionMinutes && !SESSION_MINUTES.includes(values.sessionMinutes)) errors.sessionMinutes = "Choose 30, 45, or 60 minutes.";
  if (values.equipment && values.equipment.some((e) => !EQUIPMENT.includes(e))) errors.equipment = "Choose from the listed equipment.";
  if (values.experience && !EXPERIENCE.includes(values.experience)) errors.experience = "Choose your training experience.";
  if (values.recentRunning && !RUNNING.includes(values.recentRunning)) errors.recentRunning = "Choose your recent running.";
  if (values.restrictions.some((r) => !RESTRICTIONS.includes(r))) errors.restrictions = "Choose from the listed movements.";

  if (Object.keys(errors).length) return { ok: false, errors };

  const training: TrainingProfile = {
    ...(weekdays.length ? { weekdays } : {}),
    ...(values.sessionMinutes ? { sessionMinutes: values.sessionMinutes } : {}),
    ...(values.equipment ? { equipment: EQUIPMENT.filter((e) => values.equipment!.includes(e)) } : {}),
    ...(values.runningAccess !== null ? { runningAccess: values.runningAccess } : {}),
    ...(values.experience ? { experience: values.experience } : {}),
    ...(values.recentRunning ? { recentRunning: values.recentRunning } : {}),
    ...(values.restrictions.length ? { restrictions: RESTRICTIONS.filter((r) => values.restrictions.includes(r)) } : {}),
  };

  return {
    ok: true,
    profile: {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      updatedAt: now,
      ...(displayName ? { displayName } : {}),
      ...(dob ? { dateOfBirth: dob } : {}),
      ...(values.standard ? { standard: values.standard } : {}),
      ...(values.gender ? { gender: values.gender } : {}),
      ...(nextAftDate ? { nextAftDate } : {}),
      ...(targetScore !== undefined ? { targetScore } : {}),
      training,
    },
  };
}

// ---------------------------------------------------------------------------
// Parsing stored data: unknown or invalid fields are dropped, never guessed.
// ---------------------------------------------------------------------------

const oneOf = <T>(list: readonly T[], value: unknown): T | undefined => (list.includes(value as T) ? (value as T) : undefined);
const subset = <T>(list: readonly T[], value: unknown): T[] | undefined =>
  Array.isArray(value) ? list.filter((item) => value.includes(item)) : undefined;

export function parseProfile(raw: string | null): SoldierProfile | null {
  if (!raw) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || data.schemaVersion !== PROFILE_SCHEMA_VERSION) return null;
  const t = (data.training && typeof data.training === "object" ? data.training : {}) as Record<string, unknown>;
  const weekdays = subset(WEEKDAYS, t.weekdays);
  const training: TrainingProfile = {
    ...(weekdays && weekdays.length >= 2 && weekdays.length <= 5 ? { weekdays } : {}),
    ...(oneOf(SESSION_MINUTES, t.sessionMinutes) ? { sessionMinutes: t.sessionMinutes as SessionMinutes } : {}),
    ...(subset(EQUIPMENT, t.equipment) ? { equipment: subset(EQUIPMENT, t.equipment) } : {}),
    ...(typeof t.runningAccess === "boolean" ? { runningAccess: t.runningAccess } : {}),
    ...(oneOf(EXPERIENCE, t.experience) ? { experience: t.experience as Experience } : {}),
    ...(oneOf(RUNNING, t.recentRunning) ? { recentRunning: t.recentRunning as RunningVolume } : {}),
    ...(subset(RESTRICTIONS, t.restrictions)?.length ? { restrictions: subset(RESTRICTIONS, t.restrictions) } : {}),
  };
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const name = str(data.displayName)?.trim().slice(0, MAX_NAME_LENGTH);
  const dob = str(data.dateOfBirth);
  const next = str(data.nextAftDate);
  const target = data.targetScore;
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    updatedAt: str(data.updatedAt) ?? "",
    ...(name ? { displayName: name } : {}),
    ...(dob && isValidDate(dob) ? { dateOfBirth: dob } : {}),
    ...(oneOf<AftStandard>(["general", "combat"], data.standard) ? { standard: data.standard as AftStandard } : {}),
    ...(oneOf<Gender>(["M", "F"], data.gender) ? { gender: data.gender as Gender } : {}),
    ...(next && isValidDate(next) ? { nextAftDate: next } : {}),
    ...(Number.isInteger(target) && (target as number) >= 0 && (target as number) <= 500 ? { targetScore: target as number } : {}),
    training,
  };
}

// ---------------------------------------------------------------------------
// Using the profile elsewhere
// ---------------------------------------------------------------------------

export type CalculatorDefaults = { age?: string; standard?: AftStandard; gender?: Gender };

// Defaults for a new test in the calculator. The age is worked out for the test date (today if blank),
// and left empty when it falls outside the scoring range.
export function calculatorDefaults(profile: SoldierProfile | null, testDate: string): CalculatorDefaults {
  if (!profile) return {};
  const defaults: CalculatorDefaults = {};
  if (profile.dateOfBirth && isValidDate(testDate) && testDate >= profile.dateOfBirth) {
    const age = ageOn(profile.dateOfBirth, testDate);
    if (age >= MIN_AFT_AGE && age <= MAX_AGE) defaults.age = String(age);
  }
  if (profile.standard) defaults.standard = profile.standard;
  if (profile.gender) defaults.gender = profile.gender;
  return defaults;
}

export type CalculatorProfileField = keyof CalculatorDefaults;
const CALCULATOR_FIELDS: CalculatorProfileField[] = ["age", "standard", "gender"];

// Merges profile defaults into the calculator form. Fields the user changed for this test (`overridden`)
// keep the typed value; the rest come from the profile when it has them.
export function applyCalculatorDefaults<T extends { age: string; standard: AftStandard; gender: "" | Gender }>(
  entered: T,
  defaults: CalculatorDefaults,
  overridden: CalculatorProfileField[]
): { values: T; fromProfile: CalculatorProfileField[] } {
  const fromProfile = CALCULATOR_FIELDS.filter((f) => defaults[f] !== undefined && !overridden.includes(f));
  const values = { ...entered };
  for (const f of fromProfile) (values as Record<string, unknown>)[f] = defaults[f];
  return { values, fromProfile };
}

// Starting answers for the training-plan wizard. Anything the profile doesn't have stays unanswered,
// and the wizard asks the user to confirm the prefilled answers before a plan is generated.
export function planPrefill(profile: SoldierProfile | null): { answers: Partial<PreferenceAnswers>; nextAftDate?: string; targetScore?: number; fields: number } {
  if (!profile) return { answers: {}, fields: 0 };
  const t = profile.training;
  const answers: Partial<PreferenceAnswers> = {
    ...(t.weekdays ? { weekdays: t.weekdays, daysPerWeek: t.weekdays.length as DaysPerWeek } : {}),
    ...(t.sessionMinutes ? { sessionMinutes: t.sessionMinutes } : {}),
    ...(t.equipment ? { equipment: t.equipment } : {}),
    ...(t.runningAccess !== undefined ? { runningAccess: t.runningAccess } : {}),
    ...(t.experience ? { experience: t.experience } : {}),
    ...(t.recentRunning ? { recentRunning: t.recentRunning } : {}),
    ...(t.restrictions ? { restrictions: t.restrictions } : {}),
  };
  return {
    answers,
    ...(profile.nextAftDate ? { nextAftDate: profile.nextAftDate } : {}),
    ...(profile.targetScore !== undefined ? { targetScore: profile.targetScore } : {}),
    fields: Object.keys(answers).filter((k) => k !== "daysPerWeek").length + (profile.nextAftDate ? 1 : 0) + (profile.targetScore !== undefined ? 1 : 0),
  };
}

export type MissingInfo = { area: "scoring" | "training"; label: string };

export function missingProfileInfo(profile: SoldierProfile | null): MissingInfo[] {
  const p = profile;
  const t = p?.training ?? {};
  const missing: MissingInfo[] = [];
  if (!p?.dateOfBirth) missing.push({ area: "scoring", label: "Date of birth" });
  if (!p?.standard) missing.push({ area: "scoring", label: "AFT standard" });
  if (p?.standard !== "combat" && !p?.gender) missing.push({ area: "scoring", label: "Score table (sex)" });
  if (!t.weekdays) missing.push({ area: "training", label: "Training days" });
  if (!t.sessionMinutes) missing.push({ area: "training", label: "Session length" });
  if (!t.equipment) missing.push({ area: "training", label: "Equipment" });
  if (t.runningAccess === undefined) missing.push({ area: "training", label: "Place to run" });
  if (!t.experience) missing.push({ area: "training", label: "Training experience" });
  if (!t.recentRunning) missing.push({ area: "training", label: "Recent running" });
  return missing;
}

// Only fields the profile form collects are exported.
export function exportProfile(profile: SoldierProfile): string {
  return JSON.stringify({ app: "RuckOn Fitness", exportedFrom: "ruckon.profile", ...profile }, null, 2);
}
