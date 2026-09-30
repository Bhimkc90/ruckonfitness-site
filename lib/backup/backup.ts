import type { AftEventCode } from "@/lib/aft/types";
import { AFT_RESULTS_SCHEMA_VERSION, findDuplicate, isSavedResult, type SavedAftResult } from "@/lib/storage/aftResults";
import { TRAINING_SCHEMA_VERSION, parseTrainingData, type TrainingData } from "@/lib/storage/trainingPlans";
import { parseProfile, type SoldierProfile } from "@/lib/profile/profile";
import { parseSettingsValue, type AppSettings } from "@/lib/settings/settings";
import type { StoredPlan } from "@/lib/training/types";

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

function validInput(input: unknown): boolean {
  if (!isObject(input) || !isObject(input.raw)) return false;
  const raw = input.raw;
  return (
    typeof input.age === "number" &&
    (input.standard === "general" || input.standard === "combat") &&
    (input.gender === "M" || input.gender === "F" || input.gender === null) &&
    EVENTS.every((e) => typeof raw[e] === "number" && Number.isFinite(raw[e]))
  );
}

function validResult(result: unknown): boolean {
  if (!isObject(result) || typeof result.total !== "number" || typeof result.passed !== "boolean" || !Array.isArray(result.events)) return false;
  return EVENTS.every((e) => (result.events as unknown[]).some((x) => isObject(x) && x.event === e && typeof x.points === "number" && typeof x.raw === "number"));
}

function validSavedResult(item: unknown): item is SavedAftResult {
  return isSavedResult(item) && isDate(item.testDate) && isTimestamp(item.savedAt) && validInput(item.input) && validResult(item.result);
}

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
    isObject(plan.preferences) &&
    isObject(plan.reschedules) &&
    plan.sessions.every((s) => isObject(s) && typeof s.id === "string")
  );
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

  // Training plans and completions
  const tp = data.trainingPlans;
  if (!isObject(tp) || tp.schemaVersion !== TRAINING_SCHEMA_VERSION || !Array.isArray(tp.plans) || !Array.isArray(tp.completions)) {
    return { ok: false, error: "The training-plan section uses an unsupported format." };
  }
  const training = parseTrainingData(JSON.stringify(tp));
  if (training.plans.length !== tp.plans.length || training.completions.length !== tp.completions.length || !training.plans.every(validPlan)) {
    return { ok: false, error: "The training-plan section contains incomplete or invalid records." };
  }
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

  const local: LocalData = { aftResults: results, training, profile, settings };
  return {
    ok: true,
    backup: createBackup(local, { exportedAt: parsed.exportedAt as string, appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : "unknown" }),
    data: local,
  };
}

// ---------------------------------------------------------------------------
// Import plan: what merge or replace would change
// ---------------------------------------------------------------------------

export type ImportMode = "merge" | "replace";

export type SectionChange = {
  section: "aftResults" | "plans" | "completions" | "profile" | "settings";
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
// Replace: every section is replaced with the backup's contents (including empty sections).
export function planImport(local: LocalData, incoming: LocalData, mode: ImportMode, exportedAt: string): ImportPlan {
  const newerLocal = countNewerLocal(local, exportedAt);

  if (mode === "replace") {
    const next = incoming;
    const changes = [
      change("aftResults", "AFT results", local.aftResults.length, { after: next.aftResults.length, removed: local.aftResults.length, added: next.aftResults.length }),
      change("plans", "Training plans", local.training.plans.length, { after: next.training.plans.length, removed: local.training.plans.length, added: next.training.plans.length }),
      change("completions", "Completed workouts", local.training.completions.length, {
        after: next.training.completions.length,
        removed: local.training.completions.length,
        added: next.training.completions.length,
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

  // Completions
  const completions = [...local.training.completions];
  const done = change("completions", "Completed workouts", completions.length, { after: 0 });
  for (const c of incoming.training.completions) {
    const existing = completions.find((x) => x.planId === c.planId && x.sessionId === c.sessionId);
    if (existing) {
      if (canonical(existing) === canonical(c)) done.duplicates++;
      else done.conflicts++;
    } else if (!importedIds.has(c.planId)) done.conflicts++;
    else {
      completions.push(c);
      done.added++;
    }
  }
  done.after = completions.length;

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
    training: { ...local.training, plans, completions },
    profile: profile.value,
    settings: settings.value,
  };
  return { next, changes: [aft, plansChange, done, profile.c, settings.c], newerLocal, changed: canonical(next) !== canonical(local) };
}
