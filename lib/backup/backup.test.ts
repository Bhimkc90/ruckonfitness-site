import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import type { SavedAftResult } from "@/lib/storage/aftResults";
import { EMPTY_TRAINING, completeSession, startPlan, type TrainingData } from "@/lib/storage/trainingPlans";
import { generatePlan } from "@/lib/training/engine";
import type { PlanDraft } from "@/lib/training/types";
import { validateProfileForm, emptyProfileForm, type SoldierProfile } from "@/lib/profile/profile";
import { DEFAULT_SETTINGS, parseSettings, parseSettingsValue, type AppSettings } from "@/lib/settings/settings";
import { createBackup, planImport, serializeBackup, validateBackup, type LocalData } from "./backup";

const EXPORTED = "2026-09-30T12:00:00.000Z";

function result(id: string, testDate: string, raw: Partial<AftInput["raw"]> = {}, savedAt = "2026-09-01T10:00:00.000Z"): SavedAftResult {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 250, HRP: 40, SDC: 110, PLK: 150, "2MR": 990, ...raw } };
  return { id, savedAt, testDate, scoringVersion: "AFT_Scoring_Scales_250601.pdf", input, result: scoreAft(input) };
}

function draft(r: SavedAftResult): PlanDraft {
  const outcome = generatePlan({
    baseline: { resultId: r.id, testDate: r.testDate, input: r.input, result: r.result },
    prefs: { daysPerWeek: 3, weekdays: ["mon", "wed", "fri"], sessionMinutes: 45, equipment: [], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [] },
    screening: { currentPain: false, otherInstructions: "" },
    startDate: "2026-10-05",
  });
  if (outcome.status !== "ready") throw new Error(outcome.status);
  return outcome.plan;
}

function training(r: SavedAftResult, planId: string, createdAt = "2026-09-02T10:00:00.000Z"): TrainingData {
  let data = startPlan(EMPTY_TRAINING, draft(r), { id: planId, createdAt, startDate: "2026-10-05" });
  data = completeSession(data, { planId, sessionId: data.plans[0].sessions[0].id, completedAt: "2026-10-05T18:00:00.000Z", difficulty: "about-right", pain: false, notes: "felt fine" });
  return data;
}

const profile = (): SoldierProfile => {
  const v = validateProfileForm({ ...emptyProfileForm, displayName: "Test", dateOfBirth: "2000-01-01", standard: "general", gender: "M" }, "2026-09-30", "2026-09-03T00:00:00.000Z");
  if (!v.ok) throw new Error("profile");
  return v.profile;
};
const settings = (): AppSettings => ({ ...DEFAULT_SETTINGS, updatedAt: "2026-09-04T00:00:00.000Z", landingPage: "/aft-calculator", trendView: "raw", trendEvent: "2MR" });

function sample(): LocalData {
  const a = result("a1", "2026-08-01");
  const b = result("b1", "2026-09-01", { "2MR": 1300 });
  return { aftResults: [a, b], training: training(b, "p1"), profile: profile(), settings: settings() };
}

const text = (data: LocalData, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ ...createBackup(data, { exportedAt: EXPORTED, appVersion: "0.1.0" }), ...overrides });

describe("backup round trip", () => {
  it("restores every section exactly, including scoring snapshots, plan baselines, and completions", () => {
    const data = sample();
    const parsed = validateBackup(serializeBackup(createBackup(data, { exportedAt: EXPORTED, appVersion: "0.1.0" })));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual(data);
    expect(parsed.data.aftResults[1].result).toEqual(data.aftResults[1].result);
    expect(parsed.data.training.plans[0].baseline).toEqual(data.training.plans[0].baseline);
    expect(parsed.data.training.completions[0].planId).toBe("p1");
  });

  it("accepts an empty backup", () => {
    const parsed = validateBackup(text({ aftResults: [], training: EMPTY_TRAINING, profile: null, settings: null }));
    expect(parsed.ok).toBe(true);
  });
});

describe("invalid and unsupported backups", () => {
  const reject = (t: string) => {
    const r = validateBackup(t);
    expect(r.ok).toBe(false);
    return r.ok ? "" : r.error;
  };

  it("rejects non-JSON, other files, and missing sections", () => {
    expect(reject("{not json")).toMatch(/valid JSON/);
    expect(reject(JSON.stringify({ hello: "world" }))).toMatch(/isn't a RuckOn/);
    const b = JSON.parse(text(sample()));
    delete b.data.profile;
    expect(reject(JSON.stringify(b))).toMatch(/missing/);
  });

  it("rejects newer and unknown backup versions and section schema versions", () => {
    expect(reject(text(sample(), { backupVersion: 2 }))).toMatch(/newer version/);
    expect(reject(text(sample(), { backupVersion: 0 }))).toMatch(/not supported/);
    const b = JSON.parse(text(sample()));
    b.data.aftResults.schemaVersion = 2;
    expect(reject(JSON.stringify(b))).toMatch(/unsupported format/);
    const c = JSON.parse(text(sample()));
    c.data.profile.schemaVersion = 9;
    expect(reject(JSON.stringify(c))).toMatch(/profile/);
  });

  it("rejects invalid records instead of dropping them", () => {
    const b = JSON.parse(text(sample()));
    b.data.aftResults.results[0].input.raw.MDL = "heavy";
    expect(reject(JSON.stringify(b))).toMatch(/AFT result 1/);
    const c = JSON.parse(text(sample()));
    c.data.settings.landingPage = "https://example.com";
    expect(reject(JSON.stringify(c))).toMatch(/preferences/);
    const d = JSON.parse(text(sample()));
    d.data.profile.dateOfBirth = "yesterday";
    expect(reject(JSON.stringify(d))).toMatch(/profile/);
  });

  it("rejects broken relationships between plans and completions", () => {
    const b = JSON.parse(text(sample()));
    b.data.trainingPlans.completions[0].planId = "missing";
    expect(reject(JSON.stringify(b))).toMatch(/refers to a plan/);
    const c = JSON.parse(text(sample()));
    c.data.trainingPlans.completions[0].sessionId = "w9-s9";
    expect(reject(JSON.stringify(c))).toMatch(/session/);
    const d = JSON.parse(text(sample()));
    d.data.trainingPlans.plans.push({ ...d.data.trainingPlans.plans[0], id: "p2" });
    expect(reject(JSON.stringify(d))).toMatch(/more than one active/);
    const e = JSON.parse(text(sample()));
    delete e.data.trainingPlans.plans[0].baseline;
    expect(reject(JSON.stringify(e))).toMatch(/training-plan section/);
  });

  it("rejects repeated IDs and oversized files", () => {
    const b = JSON.parse(text(sample()));
    b.data.aftResults.results.push(b.data.aftResults.results[0]);
    expect(reject(JSON.stringify(b))).toMatch(/repeated/);
    expect(reject(" ".repeat(5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
  });
});

describe("merge", () => {
  it("adds new records, skips duplicates, and never overwrites this browser's data", () => {
    const local = sample();
    const incoming = sample();
    incoming.aftResults = [
      local.aftResults[0], // identical: duplicate
      { ...local.aftResults[1], result: { ...local.aftResults[1].result, total: 1 } }, // same ID, different: conflict
      { ...local.aftResults[0], id: "a1-copy" }, // same test, other ID: duplicate
      result("c1", "2026-09-15", { MDL: 300 }), // new
    ];
    const plan = planImport(local, incoming, "merge", EXPORTED);
    const aft = plan.changes.find((c) => c.section === "aftResults")!;
    expect(aft).toMatchObject({ before: 2, after: 3, added: 1, duplicates: 2, conflicts: 1 });
    expect(plan.next.aftResults.find((r) => r.id === "b1")).toEqual(local.aftResults[1]);
    expect(plan.next.profile).toEqual(local.profile);
  });

  it("keeps this browser's profile and preferences when they differ, and uses the backup's when there are none", () => {
    const local = sample();
    const incoming = { ...sample(), profile: { ...profile(), displayName: "Other" } };
    const plan = planImport(local, incoming, "merge", EXPORTED);
    expect(plan.next.profile?.displayName).toBe("Test");
    expect(plan.changes.find((c) => c.section === "profile")!.conflicts).toBe(1);
    const empty = planImport({ ...local, profile: null, settings: null }, incoming, "merge", EXPORTED);
    expect(empty.next.profile?.displayName).toBe("Other");
    expect(empty.next.settings).toEqual(incoming.settings);
  });

  it("adds a second active plan as ended and brings its completions with it", () => {
    const local = sample();
    const other = result("d1", "2026-09-20", { MDL: 150 });
    const incoming: LocalData = { aftResults: [other], training: training(other, "p2"), profile: null, settings: null };
    const plan = planImport(local, incoming, "merge", EXPORTED);
    expect(plan.next.training.plans.map((p) => [p.id, p.status])).toEqual([
      ["p1", "active"],
      ["p2", "ended"],
    ]);
    expect(plan.next.training.completions.map((c) => c.planId).sort()).toEqual(["p1", "p2"]);
    expect(plan.changes.find((c) => c.section === "plans")!.notes[0]).toMatch(/added as ended/);
    // The imported plan keeps its own baseline snapshot.
    expect(plan.next.training.plans[1].baseline.resultId).toBe("d1");
  });

  it("imports completions for an identical plan but not for a conflicting one", () => {
    const local = sample();
    const incoming = sample();
    const extra = { ...incoming.training.completions[0], sessionId: incoming.training.plans[0].sessions[1].id };
    incoming.training = { ...incoming.training, completions: [...incoming.training.completions, extra] };
    const same = planImport(local, incoming, "merge", EXPORTED);
    expect(same.changes.find((c) => c.section === "completions")).toMatchObject({ added: 1, duplicates: 1 });

    const conflicting = sample();
    conflicting.training = { ...conflicting.training, plans: [{ ...conflicting.training.plans[0], startDate: "2026-10-12" }], completions: [extra] };
    const plan = planImport(local, conflicting, "merge", EXPORTED);
    expect(plan.changes.find((c) => c.section === "plans")!.conflicts).toBe(1);
    expect(plan.next.training.completions).toEqual(local.training.completions);
  });

  it("reports no change when importing the same data", () => {
    const local = sample();
    expect(planImport(local, sample(), "merge", EXPORTED).changed).toBe(false);
  });
});

describe("replace", () => {
  it("replaces every section with the backup and warns about newer local records", () => {
    const local = sample();
    local.aftResults.push(result("n1", "2026-09-29", {}, "2026-10-01T00:00:00.000Z")); // saved after the export
    const incoming: LocalData = { aftResults: [result("z1", "2026-07-01")], training: EMPTY_TRAINING, profile: null, settings: null };
    const plan = planImport(local, incoming, "replace", EXPORTED);
    expect(plan.next).toEqual(incoming);
    expect(plan.newerLocal).toBe(2); // the new result and the completion logged on 2026-10-05
    expect(plan.changes.find((c) => c.section === "aftResults")).toMatchObject({ before: 3, after: 1, removed: 3 });
  });
});

describe("settings", () => {
  it("accepts only known destinations and values", () => {
    expect(parseSettings(JSON.stringify(settings()))).toEqual(settings());
    expect(parseSettingsValue({ ...settings(), landingPage: "javascript:alert(1)" })).toBeNull();
    expect(parseSettingsValue({ ...settings(), trendView: "bars" })).toBeNull();
    expect(parseSettingsValue({ ...settings(), schemaVersion: 2 })).toBeNull();
    expect(parseSettings("{")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Browser storage: deletion boundaries, atomic writes, preferences
// ---------------------------------------------------------------------------

describe("local storage boundaries", () => {
  const store = new Map<string, string>();
  const events: string[] = [];
  const g = globalThis as unknown as { window?: unknown };
  let failOn: string | null = null;

  beforeEach(() => {
    store.clear();
    events.length = 0;
    failOn = null;
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          if (k === failOn) throw new Error("QuotaExceededError");
          store.set(k, v);
        },
        removeItem: (k: string) => void store.delete(k),
      },
      dispatchEvent: (e: Event) => (events.push(e.type), true),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
  afterEach(() => {
    delete g.window;
  });

  async function seed() {
    const { writeLocalData } = await import("@/lib/storage/localData");
    store.set("unrelated.key", "keep me");
    store.set("ruckon-other-app", "keep me too");
    expect(writeLocalData(sample()).ok).toBe(true);
  }

  it("each deletion removes only its own key", async () => {
    const { deleteSections, readLocalData, DATA_SECTIONS } = await import("@/lib/storage/localData");
    for (const section of ["aftResults", "training", "profile", "settings"] as const) {
      store.clear();
      await seed();
      const before = new Map(store);
      expect(deleteSections([section]).ok).toBe(true);
      for (const [key, value] of before) {
        if (key === DATA_SECTIONS[section].key) expect(store.has(key)).toBe(false);
        else expect(store.get(key)).toBe(value);
      }
    }
    // Deleting AFT history leaves the plan's baseline snapshot intact.
    store.clear();
    await seed();
    deleteSections(["aftResults"]);
    expect(readLocalData().training.plans[0].baseline.resultId).toBe("b1");
  });

  it("delete all removes RuckOn's keys and nothing else", async () => {
    const { deleteSections } = await import("@/lib/storage/localData");
    await seed();
    deleteSections(["aftResults", "training", "profile", "settings"]);
    expect([...store.keys()].sort()).toEqual(["ruckon-other-app", "unrelated.key"]);
    expect(events).toEqual(expect.arrayContaining(["ruckon:aft-results-changed", "ruckon:training-plans-changed", "ruckon:profile-changed", "ruckon:settings-changed"]));
  });

  it("writes an import atomically and restores everything if a write fails", async () => {
    const { writeLocalData, readLocalData } = await import("@/lib/storage/localData");
    await seed();
    const before = new Map(store);
    failOn = "ruckon.profile"; // fails after AFT history and plans were already written
    const incoming: LocalData = { aftResults: [result("z1", "2026-07-01")], training: EMPTY_TRAINING, profile: { ...profile(), displayName: "New" }, settings: null };
    expect(writeLocalData(incoming).ok).toBe(false);
    expect(new Map(store)).toEqual(before);
    failOn = null;
    expect(writeLocalData(incoming).ok).toBe(true);
    expect(readLocalData()).toEqual(incoming);
  });

  it("export, import, and restore reproduce the stored data byte-for-byte", async () => {
    const { writeLocalData, readLocalData } = await import("@/lib/storage/localData");
    await seed();
    const snapshot = new Map(store);
    const backup = serializeBackup(createBackup(readLocalData(), { exportedAt: EXPORTED, appVersion: "0.1.0" }));
    store.clear();
    const parsed = validateBackup(backup);
    if (!parsed.ok) throw new Error(parsed.error);
    writeLocalData(planImport(readLocalData(), parsed.data, "replace", parsed.backup.exportedAt).next);
    for (const key of ["ruckon.aftResults", "ruckon.trainingPlans", "ruckon.profile", "ruckon.settings"]) expect(store.get(key)).toBe(snapshot.get(key));
  });

  it("saves preferences and keeps unrelated fields", async () => {
    const { saveSettings } = await import("@/lib/storage/settings");
    expect(saveSettings({ landingPage: "/score-history" }).ok).toBe(true);
    expect(saveSettings({ trendView: "raw" }).ok).toBe(true);
    const saved = parseSettings(store.get("ruckon.settings")!)!;
    expect(saved).toMatchObject({ landingPage: "/score-history", trendView: "raw", trendEvent: "MDL" });
    expect(events.filter((e) => e === "ruckon:settings-changed")).toHaveLength(2);
  });
});

describe("malicious and malformed backups", () => {
  const reject = (t: string) => {
    const r = validateBackup(t);
    expect(r.ok).toBe(false);
    return r.ok ? "" : r.error;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests write arbitrary values into parsed JSON
  const withResult = (mutate: (r: Record<string, any>) => void) => {
    const b = JSON.parse(text(sample()));
    mutate(b.data.aftResults.results[0]);
    return JSON.stringify(b);
  };

  it("rejects edited points, totals, pass results, and scoring categories", () => {
    expect(reject(withResult((r) => (r.result.total = 500)))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.result.passed = !r.result.passed)))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.result.events[0].points = 100)))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.result.events[0].raw = 999)))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.result.ageGroup = "62+")))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.result.column = "F")))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.result.standard = "combat")))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => r.result.events.push({ ...r.result.events[0] })))).toMatch(/AFT result 1/);
  });

  it("keeps results scored with other table versions as saved", () => {
    const parsed = validateBackup(withResult((r) => ((r.scoringVersion = "older-tables.pdf"), (r.result.total = 123))));
    expect(parsed.ok).toBe(true);
  });

  it("rejects entries the calculator would not accept", () => {
    for (const age of [16, 100, 25.5, -1, "25", null]) expect(reject(withResult((r) => (r.input.age = age)))).toMatch(/AFT result 1/);
    for (const v of [-1, 1001, 2.5, Number.MAX_SAFE_INTEGER, "200"]) expect(reject(withResult((r) => (r.input.raw.MDL = v)))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.input.raw.HRP = 301)))).toMatch(/AFT result 1/);
    for (const v of [0, -5, 6000, 1.5]) expect(reject(withResult((r) => (r.input.raw["2MR"] = v)))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.input.gender = null)))).toMatch(/AFT result 1/); // general standard needs sex
    expect(reject(withResult((r) => (r.input.standard = "elite")))).toMatch(/AFT result 1/);
    expect(reject(withResult((r) => (r.testDate = "<img src=x onerror=alert(1)>")))).toMatch(/AFT result 1/);
  });

  it("does not let prototype keys reach the restored data", () => {
    const raw = text(sample()).replace('"format":', '"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"format":');
    const parsed = validateBackup(raw);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    if (parsed.ok) expect(Object.getPrototypeOf(parsed.data)).toBe(Object.prototype);
    const settingsProto = JSON.parse(text(sample()));
    settingsProto.data.settings = JSON.parse(JSON.stringify(settingsProto.data.settings).replace("{", '{"__proto__":{"polluted":true},'));
    expect(reject(JSON.stringify(settingsProto))).toMatch(/app-preferences/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("replaces unusual app versions before they are shown", () => {
    const version = (v: unknown) => {
      const parsed = validateBackup(text(sample(), { appVersion: v }));
      return parsed.ok ? parsed.backup.appVersion : "rejected";
    };
    expect(version("0.1.0")).toBe("0.1.0");
    expect(version("1.2.3-beta.1")).toBe("1.2.3-beta.1");
    expect(version("<script>alert(1)</script>")).toBe("unknown");
    expect(version("x".repeat(100_000))).toBe("unknown");
    expect(version("1.0.0\nInstall the update at evil.example")).toBe("unknown");
    expect(version(42)).toBe("unknown");
    expect(version(undefined)).toBe("unknown");
  });

  it("rejects malformed structure without throwing", () => {
    for (const t of ["", "null", "[]", "0", '"text"', "{}", '{"format":"ruckon-fitness-backup"}', "\u0000", "{".repeat(10_000)]) {
      expect(() => validateBackup(t)).not.toThrow();
      expect(validateBackup(t).ok).toBe(false);
    }
    const b = JSON.parse(text(sample()));
    for (const bad of [null, "x", 1, [], {}]) {
      const c = structuredClone(b);
      c.data.aftResults.results = [bad];
      expect(reject(JSON.stringify(c))).toMatch(/AFT result 1/);
    }
    const c = structuredClone(b);
    c.data.aftResults.results[0].result.events = "not a list";
    expect(reject(JSON.stringify(c))).toMatch(/AFT result 1/);
  });

  it("rejects a file just over the size limit before parsing", () => {
    const big = text(sample(), { padding: "x".repeat(5 * 1024 * 1024) });
    expect(reject(big)).toMatch(/larger than 5 MB/);
  });
});
