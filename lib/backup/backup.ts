import type { AftEventCode, AftInput } from "@/lib/aft/types";
import { MIN_AFT_AGE, scoreAft } from "@/lib/aft/scoring";
import { aftScoringFile } from "@/lib/aft/scoringFile";
import { RAW_LIMITS, isWithin as inRange } from "@/lib/aft/limits";
import { AFT_RESULTS_SCHEMA_VERSION, findDuplicate, isSavedResult, type SavedAftResult } from "@/lib/storage/aftResults";
import { LEGACY_TRAINING_SCHEMA_VERSIONS, TRAINING_SCHEMA_VERSION, parseTrainingData, type TrainingData } from "@/lib/storage/trainingPlans";
import { checkWorkoutData } from "@/lib/storage/workoutRecords";
import { workoutSetIds } from "@/lib/training/workout";
import { parseProfile, type SoldierProfile } from "@/lib/profile/profile";
import { parseSettingsValue, type AppSettings } from "@/lib/settings/settings";
import type { SessionCompletion, SetCompletion, StoredPlan, StoredWorkout, WorkoutPainReport } from "@/lib/training/types";

// Versioned backup of everything RuckOn stores in this browser. Each section keeps its own storage schema,
// so a backup restores exactly what was saved: scoring snapshots, plan baselines, and completion records.

export const BACKUP_FORMAT = "ruckon-fitness-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export type LocalData = {
  aftResults: SavedAftResult[];
  training: TrainingData;
  profile: SoldierProfile | null;
  settings: AppSettings | null;
};

export type Backup = {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  appVersion: string;
  data: {
    aftResults: { schemaVersion: number; results: SavedAftResult[] };
    trainingPlans: TrainingData;
    profile: SoldierProfile | null;
    settings: AppSettings | null;
  };
};

export function createBackup(data: LocalData, meta: { exportedAt: string; appVersion: string }): Backup {
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    exportedAt: meta.exportedAt,
    appVersion: meta.appVersion,
    data: {
      aftResults: { schemaVersion: AFT_RESULTS_SCHEMA_VERSION, results: data.aftResults },
      trainingPlans: data.training,
      profile: data.profile,
      settings: data.settings,
    },
  };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// JSON with object keys sorted, so two values can be compared regardless of key order.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v
  );
}

const EVENTS: AftEventCode[] = ["MDL", "HRP", "SDC", "PLK", "2MR"];
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTimestamp = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v));

function validInput(input: unknown): input is AftInput {
  if (!isObject(input) || !isObject(input.raw)) return false;
  const raw = input.raw;
  return (
    inRange(input.age, MIN_AFT_AGE, 99) &&
    (input.standard === "general" || input.standard === "combat") &&
    (input.gender === "M" || input.gender === "F" || (input.gender === null && input.standard === "combat")) &&
    EVENTS.every((e) => inRange(raw[e], RAW_LIMITS[e].min, RAW_LIMITS[e].max))
  );
}

function validResult(result: unknown): boolean {
  if (!isObject(result) || typeof result.total !== "number" || typeof result.passed !== "boolean" || !Array.isArray(result.events)) return false;
  return EVENTS.every((e) => (result.events as unknown[]).some((x) => isObject(x) && x.event === e && typeof x.points === "number" && typeof x.raw === "number"));
}

// A result saved with the current score tables must match what the calculator gives for its entries, so an edited
// backup can't show points, a total, or a pass that the entries didn't earn. Results from other table versions are
// kept as saved, since they can't be re-scored here.
function scoresMatch(input: AftInput, result: Record<string, unknown>): boolean {
  const fresh = scoreAft(input);
  const events = result.events as { event: AftEventCode; raw: number; points: number }[];
  return (
    result.ageGroup === fresh.ageGroup &&
    result.column === fresh.column &&
    result.standard === fresh.standard &&
    result.total === fresh.total &&
    result.passed === fresh.passed &&
    events.length === fresh.events.length &&
    fresh.events.every((f) => events.some((e) => e.event === f.event && e.raw === f.raw && e.points === f.points))
  );
}

function consistent(scoringVersion: unknown, input: AftInput, result: Record<string, unknown>): boolean {
  return scoringVersion !== aftScoringFile.fileName || scoresMatch(input, result);
}

function validSavedResult(item: unknown): item is SavedAftResult {
  return (
    isSavedResult(item) &&
    isDate(item.testDate) &&
    isTimestamp(item.savedAt) &&
    validInput(item.input) &&
    validResult(item.result) &&
    consistent(item.scoringVersion, item.input, item.result as unknown as Record<string, unknown>)
  );
}

// Shown in the import preview, so only a plain version number is accepted.
const safeAppVersion = (v: unknown) => (typeof v === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}(-[0-9A-Za-z.-]{1,32})?$/.test(v) ? v : "unknown");

function validPlan(plan: StoredPlan): boolean {
  const b = plan.baseline;
  return (
    isObject(b) &&
    typeof b.resultId === "string" &&
    isDate(b.testDate) &&
    validInput(b.input) &&
    validResult(b.result) &&
    isDate(plan.startDate) &&
    isTimestamp(plan.createdAt) &&
    (plan.status === "active" || plan.status === "ended") &&
    (plan.reassessmentLink === undefined ||
      (isObject(plan.reassessmentLink) &&
        typeof plan.reassessmentLink.resultId === "string" &&
        isDate(plan.reassessmentLink.testDate) &&
        isTimestamp(plan.reassessmentLink.linkedAt) &&
        validInput(plan.reassessmentLink.input) &&
        validResult(plan.reassessmentLink.result))) &&
    isObject(plan.preferences) &&
    isObject(plan.reschedules) &&
    plan.sessions.every((s) => isObject(s) && typeof s.id === "string")
  );
}

const DIFFICULTIES = ["easy", "about-right", "hard", "too-hard"];
function validCompletion(c: SessionCompletion): boolean {
  return isTimestamp(c.completedAt) && DIFFICULTIES.includes(c.difficulty) && typeof c.pain === "boolean" && typeof c.notes === "string" && c.notes.length <= 500;
}

export type BackupValidation = { ok: true; backup: Backup; data: LocalData } | { ok: false; error: string };

// Rejects anything that isn't a complete, supported RuckOn backup. Nothing is partially accepted.
export function validateBackup(text: string): BackupValidation {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: "This file is larger than 5 MB, which is too big to be a RuckOn backup." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (!isObject(parsed) || parsed.format !== BACKUP_FORMAT) return { ok: false, error: "This file isn't a RuckOn Fitness backup." };
  if (typeof parsed.backupVersion !== "number") return { ok: false, error: "The backup version is missing." };
  if (parsed.backupVersion > BACKUP_VERSION) {
    return { ok: false, error: `This backup was made by a newer version of RuckOn (backup version ${parsed.backupVersion}). This version supports version ${BACKUP_VERSION} only.` };
  }
  if (parsed.backupVersion !== BACKUP_VERSION) return { ok: false, error: `Backup version ${parsed.backupVersion} is not supported.` };
  if (!isTimestamp(parsed.exportedAt)) return { ok: false, error: "The backup's export date is missing or invalid." };
  const data = parsed.data;
  if (!isObject(data) || !("aftResults" in data) || !("trainingPlans" in data) || !("profile" in data) || !("settings" in data)) {
    return { ok: false, error: "The backup is missing one or more sections." };
  }

  // AFT results
  const aft = data.aftResults;
  if (!isObject(aft) || aft.schemaVersion !== AFT_RESULTS_SCHEMA_VERSION || !Array.isArray(aft.results)) {
    return { ok: false, error: "The AFT history section uses an unsupported format." };
  }
  const badResult = aft.results.findIndex((r) => !validSavedResult(r));
  if (badResult >= 0) return { ok: false, error: `AFT result ${badResult + 1} is incomplete or invalid.` };
  const results = aft.results as SavedAftResult[];
  if (new Set(results.map((r) => r.id)).size !== results.length) return { ok: false, error: "The AFT history contains repeated record IDs." };

  // Training plans and completions. Schema 1 backups (before tracked workouts) are upgraded with no workout
  // records; schema 2 must carry all three workout lists.
  const tp = data.trainingPlans;
  const legacy = isObject(tp) && (LEGACY_TRAINING_SCHEMA_VERSIONS as readonly unknown[]).includes(tp.schemaVersion);
  if (!isObject(tp) || !(legacy || tp.schemaVersion === TRAINING_SCHEMA_VERSION) || !Array.isArray(tp.plans) || !Array.isArray(tp.completions)) {
    return { ok: false, error: "The training-plan section uses an unsupported format." };
  }
  const workoutLists = legacy ? { workouts: [], setRecords: [], painReports: [] } : { workouts: tp.workouts, setRecords: tp.setRecords, painReports: tp.painReports };
  if (!Array.isArray(workoutLists.workouts) || !Array.isArray(workoutLists.setRecords) || !Array.isArray(workoutLists.painReports)) {
    return { ok: false, error: "The training-plan section is missing its workout records." };
  }
  const training = parseTrainingData(JSON.stringify(tp));
  if (training.plans.length !== tp.plans.length || training.completions.length !== tp.completions.length || !training.plans.every(validPlan)) {
    return { ok: false, error: "The training-plan section contains incomplete or invalid records." };
  }
  if (!training.completions.every(validCompletion)) return { ok: false, error: "The training-plan section contains incomplete or invalid records." };
  if (new Set(training.plans.map((p) => p.id)).size !== training.plans.length) return { ok: false, error: "The training plans contain repeated plan IDs." };
  if (training.plans.filter((p) => p.status === "active").length > 1) return { ok: false, error: "The backup has more than one active training plan." };
  const keys = new Set<string>();
  for (const c of training.completions) {
    const plan = training.plans.find((p) => p.id === c.planId);
    if (!plan || !plan.sessions.some((s) => s.id === c.sessionId)) {
      return { ok: false, error: "A completion record refers to a plan or session that isn't in the backup." };
    }
    const key = `${c.planId}/${c.sessionId}`;
    if (keys.has(key)) return { ok: false, error: "A workout is recorded as completed more than once." };
    keys.add(key);
  }
  const workoutProblem = checkWorkoutData(workoutLists as { workouts: unknown[]; setRecords: unknown[]; painReports: unknown[] }, training.plans, training.completions);
  if (workoutProblem) return { ok: false, error: workoutProblem };
  const restoredTraining: TrainingData = {
    ...training,
    workouts: workoutLists.workouts as StoredWorkout[],
    setRecords: workoutLists.setRecords as SetCompletion[],
    painReports: workoutLists.painReports as WorkoutPainReport[],
  };

  // Profile and settings: must survive strict parsing unchanged.
  let profile: SoldierProfile | null = null;
  if (data.profile !== null) {
    profile = parseProfile(JSON.stringify(data.profile));
    if (!profile || canonical(profile) !== canonical(data.profile)) return { ok: false, error: "The profile section is invalid or uses an unsupported format." };
  }
  let settings: AppSettings | null = null;
  if (data.settings !== null) {
    settings = parseSettingsValue(data.settings);
    if (!settings || canonical(settings) !== canonical(data.settings)) return { ok: false, error: "The app-preferences section is invalid or uses an unsupported format." };
  }

  const local: LocalData = { aftResults: results, training: restoredTraining, profile, settings };
  return {
    ok: true,
    backup: createBackup(local, { exportedAt: parsed.exportedAt as string, appVersion: safeAppVersion(parsed.appVersion) }),
    data: local,
  };
}

// ---------------------------------------------------------------------------
// Import plan: what merge or replace would change
// ---------------------------------------------------------------------------

export type ImportMode = "merge" | "replace";

export type SectionChange = {
  section: "aftResults" | "plans" | "completions" | "workouts" | "setRecords" | "painReports" | "profile" | "settings";
  label: string;
  before: number;
  after: number;
  added: number;
  removed: number;
  duplicates: number; // already here, identical
  conflicts: number; // same record, different content: this browser's copy kept
  notes: string[];
};

export type ImportPlan = { next: LocalData; changes: SectionChange[]; newerLocal: number; changed: boolean };

// Records in this browser saved after the backup was exported. Replacing would remove them.
export function countNewerLocal(local: LocalData, exportedAt: string): number {
  const after = (t: string | undefined) => !!t && t > exportedAt;
  return (
    local.aftResults.filter((r) => after(r.savedAt)).length +
    local.training.plans.filter((p) => after(p.createdAt)).length +
    local.training.completions.filter((c) => after(c.completedAt)).length +
    local.training.workouts.filter((w) => after(w.startedAt) || after(w.completedAt)).length +
    local.training.setRecords.filter((r) => after(r.completedAt)).length +
    local.training.painReports.filter((r) => after(r.reportedAt)).length +
    (after(local.profile?.updatedAt) ? 1 : 0) +
    (after(local.settings?.updatedAt) ? 1 : 0)
  );
}

const change = (section: SectionChange["section"], label: string, before: number, rest: Partial<SectionChange> & { after: number }): SectionChange => ({
  section,
  label,
  before,
  added: 0,
  removed: 0,
  duplicates: 0,
  conflicts: 0,
  notes: [],
  ...rest,
});

// Merge rules (documented in Settings > Help):
// - Nothing in this browser is overwritten. A record with the same ID but different content is a conflict,
//   and this browser's copy is kept.
// - AFT results: same ID, or same test date and entries, count as duplicates.
// - Plans: matched by ID. An imported active plan is added as ended if this browser already has an active plan.
// - Completions: matched by plan and session. They are imported only for plans that were imported or that are
//   identical in both, so every completion still points at its own plan and baseline.
// - Profile and app preferences: kept from this browser if present, otherwise taken from the backup.
// Replace: every section is replaced with the backup's contents (including empty sections), except that pain
// recorded in this browser for a plan the backup also has is kept as a pain report.
const LABELS = { workouts: "Started workouts", setRecords: "Recorded sets", painReports: "Pain reports" } as const;
const same = (a: { planId: string; sessionId: string }, b: { planId: string; sessionId: string }) => a.planId === b.planId && a.sessionId === b.sessionId;

// Pain recorded in this browser for a plan the backup also has. Replacing keeps it as a pain report, so an older
// backup of the same plan can't lift a pause. A set reference is kept only if the backup's workout has that set.
function carriedPain(local: LocalData, incoming: LocalData): WorkoutPainReport[] {
  const t = incoming.training;
  const sources: WorkoutPainReport[] = [
    ...local.training.painReports,
    ...local.training.completions
      .filter((c) => c.pain && !t.completions.some((x) => canonical(x) === canonical(c)))
      .map((c) => ({ planId: c.planId, sessionId: c.sessionId, reportedAt: c.completedAt, notes: c.notes })),
  ];
  const carried: WorkoutPainReport[] = [];
  for (const r of sources) {
    const plan = t.plans.find((p) => p.id === r.planId);
    if (!plan || !plan.sessions.some((s) => s.id === r.sessionId)) continue;
    const workout = t.workouts.find((w) => w.planId === r.planId && w.sessionId === r.sessionId);
    let report = r;
    if (r.setId !== undefined && !(workout && workoutSetIds(workout.snapshot).includes(r.setId))) {
      const { setId: _set, ...rest } = r;
      void _set;
      report = rest;
    }
    if (![...t.painReports, ...carried].some((x) => canonical(x) === canonical(report))) carried.push(report);
  }
  return carried;
}

// Replace can still remove pain for a plan the backup doesn't have at all, so it says so for each such plan.
function replacedPauses(local: LocalData, next: LocalData): string[] {
  const paused = (data: LocalData) =>
    new Set([...data.training.painReports.map((r) => r.planId), ...data.training.completions.filter((c) => c.pain).map((c) => c.planId)]);
  const before = paused(local);
  const after = paused(next);
  return [...before]
    .filter((id) => !after.has(id))
    .map((id) => {
      const plan = local.training.plans.find((p) => p.id === id);
      return `Replacing removes the plan from ${plan ? plan.baseline.testDate : "this browser"} and the pain reported for it. Talk to a medical provider or your unit's H2F team before training.`;
    });
}

export function planImport(local: LocalData, incoming: LocalData, mode: ImportMode, exportedAt: string): ImportPlan {
  const newerLocal = countNewerLocal(local, exportedAt);

  // Replace: every section is the backup's, except that pain recorded here for a plan the backup also has is kept.
  if (mode === "replace") {
    const carried = carriedPain(local, incoming);
    const next: LocalData = carried.length ? { ...incoming, training: { ...incoming.training, painReports: [...incoming.training.painReports, ...carried] } } : incoming;
    const changes = [
      change("aftResults", "AFT results", local.aftResults.length, { after: next.aftResults.length, removed: local.aftResults.length, added: next.aftResults.length }),
      change("plans", "Training plans", local.training.plans.length, { after: next.training.plans.length, removed: local.training.plans.length, added: next.training.plans.length }),
      change("completions", "Completed workouts", local.training.completions.length, {
        after: next.training.completions.length,
        removed: local.training.completions.length,
        added: next.training.completions.length,
      }),
      ...(["workouts", "setRecords"] as const).map((section) =>
        change(section, LABELS[section], local.training[section].length, { after: next.training[section].length, removed: local.training[section].length, added: next.training[section].length })
      ),
      change("painReports", LABELS.painReports, local.training.painReports.length, {
        after: next.training.painReports.length,
        removed: local.training.painReports.length,
        added: next.training.painReports.length,
        notes: [
          ...(carried.length
            ? [`${carried.length} pain ${carried.length === 1 ? "report" : "reports"} from this browser ${carried.length === 1 ? "is" : "are"} kept, because the backup has the same plan. Restoring a backup can't lift a pain pause.`]
            : []),
          ...replacedPauses(local, next),
        ],
      }),
      change("profile", "Profile", local.profile ? 1 : 0, { after: next.profile ? 1 : 0, removed: local.profile ? 1 : 0, added: next.profile ? 1 : 0 }),
      change("settings", "App preferences", local.settings ? 1 : 0, { after: next.settings ? 1 : 0, removed: local.settings ? 1 : 0, added: next.settings ? 1 : 0 }),
    ];
    return { next, changes, newerLocal, changed: canonical(next) !== canonical(local) };
  }

  // AFT results
  const results = [...local.aftResults];
  const aft = change("aftResults", "AFT results", local.aftResults.length, { after: 0 });
  for (const r of incoming.aftResults) {
    const sameId = results.find((x) => x.id === r.id);
    if (sameId) {
      if (canonical(sameId) === canonical(r)) aft.duplicates++;
      else aft.conflicts++;
    } else if (findDuplicate(results, r)) aft.duplicates++;
    else {
      results.push(r);
      aft.added++;
    }
  }
  aft.after = results.length;

  // Plans
  const plans = [...local.training.plans];
  const plansChange = change("plans", "Training plans", local.training.plans.length, { after: 0 });
  const importedIds = new Set<string>(); // plans whose completions may be imported
  for (const p of incoming.training.plans) {
    const existing = plans.find((x) => x.id === p.id);
    if (existing) {
      if (canonical(existing) === canonical(p)) {
        plansChange.duplicates++;
        importedIds.add(p.id);
      } else plansChange.conflicts++;
      continue;
    }
    if (p.status === "active" && plans.some((x) => x.status === "active")) {
      plans.push({ ...p, status: "ended" });
      plansChange.notes.push(`The backup's active plan from ${p.baseline.testDate} is added as ended because this browser already has an active plan.`);
    } else plans.push(p);
    plansChange.added++;
    importedIds.add(p.id);
  }
  plansChange.after = plans.length;

  // Pain reports are collected first so a pain record that can't be imported as-is still pauses its plan.
  const painReports = [...local.training.painReports];
  const pain = change("painReports", LABELS.painReports, painReports.length, { after: 0 });
  const keepPain = (report: WorkoutPainReport, how: string) => {
    if (painReports.some((x) => canonical(x) === canonical(report))) {
      pain.duplicates++;
      return;
    }
    painReports.push(report);
    pain.added++;
    if (how) pain.notes.push(how);
  };

  // Completions
  const completions = [...local.training.completions];
  const done = change("completions", "Completed workouts", completions.length, { after: 0 });
  const localWorkout = (c: { planId: string; sessionId: string }) => local.training.workouts.find((w) => same(w, c));
  for (const c of incoming.training.completions) {
    const existing = completions.find((x) => same(x, c));
    const tracked = localWorkout(c);
    if (existing && canonical(existing) === canonical(c)) done.duplicates++;
    else if (existing || !importedIds.has(c.planId) || (tracked && tracked.status !== "completed")) {
      done.conflicts++;
      // The record isn't imported, but its pain is: the plan it names stays paused.
      if (c.pain && plans.some((p) => p.id === c.planId && p.sessions.some((s) => s.id === c.sessionId))) {
        keepPain({ planId: c.planId, sessionId: c.sessionId, reportedAt: c.completedAt, notes: c.notes }, `A session record with pain (${c.sessionId}) conflicts with this browser's records, so its pain is added as a pain report.`);
      }
    } else {
      completions.push(c);
      done.added++;
    }
  }
  done.after = completions.length;

  // Started workouts: matched by plan and session, imported only for imported or identical plans. A different
  // snapshot for the same session is a conflict: this browser's workout and its recorded sets are kept.
  const workouts = [...local.training.workouts];
  const started = change("workouts", LABELS.workouts, workouts.length, { after: 0 });
  const sameSnapshot = new Set<string>(); // sessions whose incoming set records match the kept snapshot
  for (const w of incoming.training.workouts) {
    const existing = workouts.find((x) => same(x, w));
    const k = `${w.planId}/${w.sessionId}`;
    if (existing) {
      if (canonical(existing) === canonical(w)) started.duplicates++;
      else {
        started.conflicts++;
        started.notes.push(
          canonical(existing.snapshot) === canonical(w.snapshot)
            ? `Workout ${w.sessionId}: this browser's status is kept; recorded sets from both are combined.`
            : `Workout ${w.sessionId} was started separately in the backup with a different prescription. This browser's workout is kept and the backup's recorded sets for it are not imported.`
        );
      }
      if (canonical(existing.snapshot) === canonical(w.snapshot)) sameSnapshot.add(k);
      continue;
    }
    const legacyRecord = completions.find((c) => same(c, w));
    const ownRecord = incoming.training.completions.find((c) => same(c, w));
    const consistent = w.status === "completed" ? !!legacyRecord && !!ownRecord && canonical(legacyRecord) === canonical(ownRecord) : !legacyRecord;
    if (!importedIds.has(w.planId) || !consistent) {
      started.conflicts++;
      started.notes.push(`Workout ${w.sessionId} conflicts with this browser's session record, so it is not imported.`);
      continue;
    }
    workouts.push(w);
    sameSnapshot.add(k);
    started.added++;
  }
  started.after = workouts.length;

  // Recorded sets: only for workouts whose kept snapshot is the backup's. Each set counts once; a completed local
  // workout already has every set, so nothing is added to it.
  const setRecords = [...local.training.setRecords];
  const sets = change("setRecords", LABELS.setRecords, setRecords.length, { after: 0 });
  for (const r of incoming.training.setRecords) {
    const existing = setRecords.find((x) => same(x, r) && x.setId === r.setId);
    if (existing) {
      if (canonical(existing) === canonical(r)) sets.duplicates++;
      else sets.conflicts++;
    } else if (!sameSnapshot.has(`${r.planId}/${r.sessionId}`)) sets.conflicts++;
    else {
      setRecords.push(r);
      sets.added++;
    }
  }
  sets.after = setRecords.length;

  // Pain reports: every one is kept. A set reference that doesn't match the kept workout is dropped from the report,
  // never the report itself, unless its session doesn't exist in the kept plan.
  for (const r of incoming.training.painReports) {
    const plan = plans.find((p) => p.id === r.planId);
    if (!plan || !plan.sessions.some((s) => s.id === r.sessionId)) {
      pain.conflicts++;
      pain.notes.push(`A pain report for session ${r.sessionId} refers to a session this browser's plan doesn't have, so it can't be attached. Talk to a medical provider or your unit's H2F team before training.`);
      continue;
    }
    if (r.setId !== undefined && !sameSnapshot.has(`${r.planId}/${r.sessionId}`)) {
      const { setId: _set, ...rest } = r;
      void _set;
      keepPain(rest, `A pain report for ${r.sessionId} is added without its set, because this browser's workout for that session differs.`);
    } else keepPain(r, "");
  }
  pain.after = painReports.length;

  // Profile and settings
  const single = <T>(section: "profile" | "settings", label: string, mine: T | null, theirs: T | null) => {
    const c = change(section, label, mine ? 1 : 0, { after: mine || theirs ? 1 : 0 });
    if (!theirs) return { value: mine, c };
    if (!mine) {
      c.added = 1;
      return { value: theirs, c };
    }
    if (canonical(mine) === canonical(theirs)) c.duplicates = 1;
    else {
      c.conflicts = 1;
      c.notes.push(`This browser's ${label.toLowerCase()} is kept. Use Replace to take the backup's instead.`);
    }
    return { value: mine, c };
  };
  const profile = single("profile", "Profile", local.profile, incoming.profile);
  const settings = single("settings", "App preferences", local.settings, incoming.settings);

  const next: LocalData = {
    aftResults: results,
    training: { ...local.training, plans, completions, workouts, setRecords, painReports },
    profile: profile.value,
    settings: settings.value,
  };
  return { next, changes: [aft, plansChange, done, started, sets, pain, profile.c, settings.c], newerLocal, changed: canonical(next) !== canonical(local) };
}
