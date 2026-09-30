import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import { emptyAftForm, validateAftForm } from "@/lib/aft/validation";
import type { AftInput } from "@/lib/aft/types";
import { generatePlan } from "@/lib/training/engine";
import type { PreferenceAnswers } from "@/lib/training/types";
import { EMPTY_TRAINING, parseTrainingData, startPlan } from "@/lib/storage/trainingPlans";
import {
  ageOn,
  applyCalculatorDefaults,
  calculatorDefaults,
  emptyProfileForm,
  exportProfile,
  missingProfileInfo,
  parseProfile,
  planPrefill,
  profileToForm,
  validateProfileForm,
  type ProfileFormValues,
  type SoldierProfile,
} from "./profile";

const TODAY = "2026-09-30";
const NOW = "2026-09-30T12:00:00.000Z";

const form = (overrides: Partial<ProfileFormValues> = {}): ProfileFormValues => ({ ...emptyProfileForm, ...overrides });

function valid(overrides: Partial<ProfileFormValues> = {}): SoldierProfile {
  const result = validateProfileForm(form(overrides), TODAY, NOW);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.profile;
}

const complete = (): SoldierProfile =>
  valid({
    displayName: "Rivera",
    dateOfBirth: "2000-10-15",
    standard: "general",
    gender: "F",
    nextAftDate: "2026-12-01",
    targetScore: "420",
    weekdays: ["mon", "wed", "fri"],
    sessionMinutes: 45,
    equipment: ["kettlebell"],
    runningAccess: true,
    experience: "some",
    recentRunning: "31-60",
    restrictions: ["no-jumping"],
  });

describe("age from date of birth", () => {
  it("counts whole years and changes on the birthday", () => {
    expect(ageOn("2000-10-15", "2026-10-14")).toBe(25);
    expect(ageOn("2000-10-15", "2026-10-15")).toBe(26);
    expect(ageOn("2004-02-29", "2025-02-28")).toBe(20);
    expect(ageOn("2004-02-29", "2025-03-01")).toBe(21);
  });
});

describe("profile validation", () => {
  it("accepts an empty profile because every field is optional", () => {
    const profile = valid();
    expect(profile).toEqual({ schemaVersion: 1, updatedAt: NOW, training: {} });
  });

  it("rejects invalid inputs with field-level errors", () => {
    const result = validateProfileForm(
      form({
        displayName: "x".repeat(41),
        dateOfBirth: "2027-01-01",
        nextAftDate: "2026-01-01",
        targetScore: "600",
        weekdays: ["mon"],
      }),
      TODAY,
      NOW
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["dateOfBirth", "displayName", "nextAftDate", "targetScore", "weekdays"]);
  });

  it("rejects impossible dates, ages outside scoring, non-numeric targets, and more than 5 days", () => {
    const errors = (o: Partial<ProfileFormValues>) => {
      const r = validateProfileForm(form(o), TODAY, NOW);
      return r.ok ? {} : r.errors;
    };
    expect(errors({ dateOfBirth: "2001-02-30" }).dateOfBirth).toMatch(/valid date/);
    expect(errors({ dateOfBirth: "2012-01-01" }).dateOfBirth).toMatch(/17 to 99/);
    expect(errors({ targetScore: "4x0" }).targetScore).toMatch(/whole number/);
    expect(errors({ targetScore: "-5" }).targetScore).toBeDefined();
    expect(errors({ weekdays: ["mon", "tue", "wed", "thu", "fri", "sat"] }).weekdays).toBeDefined();
  });

  it("trims the display name and keeps weekdays in calendar order", () => {
    const profile = valid({ displayName: "  Sgt   Rivera ", weekdays: ["fri", "mon", "wed"] });
    expect(profile.displayName).toBe("Sgt Rivera");
    expect(profile.training.weekdays).toEqual(["mon", "wed", "fri"]);
  });

  it("stores 'no equipment' as an answer, distinct from not answered", () => {
    expect(valid({ equipment: [] }).training.equipment).toEqual([]);
    expect(valid().training.equipment).toBeUndefined();
  });
});

describe("profile persistence format", () => {
  it("round-trips through storage and back into the form", () => {
    const profile = complete();
    const restored = parseProfile(JSON.stringify(profile));
    expect(restored).toEqual(profile);
    expect(validateProfileForm(profileToForm(restored), TODAY, NOW)).toEqual({ ok: true, profile });
  });

  it("rejects unknown schema versions and corrupt data", () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile("not json")).toBeNull();
    expect(parseProfile(JSON.stringify({ ...complete(), schemaVersion: 2 }))).toBeNull();
  });

  it("drops invalid stored fields instead of guessing", () => {
    const parsed = parseProfile(
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: NOW,
        dateOfBirth: "not-a-date",
        standard: "elite",
        gender: "X",
        targetScore: 9000,
        serviceNumber: "123",
        training: { weekdays: ["mon"], sessionMinutes: 50, equipment: ["kettlebell", "rower"], experience: "pro", restrictions: ["no-running", "knee"] },
      })
    )!;
    expect(parsed).toEqual({ schemaVersion: 1, updatedAt: NOW, training: { equipment: ["kettlebell"], restrictions: ["no-running"] } });
  });

  it("exports only profile fields", () => {
    const exported = JSON.parse(exportProfile(complete()));
    expect(Object.keys(exported).sort()).toEqual(
      ["app", "exportedFrom", "schemaVersion", "updatedAt", "displayName", "dateOfBirth", "standard", "gender", "nextAftDate", "targetScore", "training"].sort()
    );
  });
});

describe("calculator prefill and overrides", () => {
  const profile = complete(); // born 2000-10-15, general, F

  it("computes the age for the test date, including backdated tests across a birthday", () => {
    expect(calculatorDefaults(profile, "2026-09-30")).toEqual({ age: "25", standard: "general", gender: "F" });
    expect(calculatorDefaults(profile, "2026-10-15").age).toBe("26");
    expect(calculatorDefaults(profile, "2017-01-01").age).toBeUndefined(); // 16: outside the scoring range
    expect(calculatorDefaults(null, "2026-09-30")).toEqual({});
  });

  it("fills untouched fields from the profile and keeps typed overrides for this test only", () => {
    const defaults = calculatorDefaults(profile, TODAY);
    const prefilled = applyCalculatorDefaults(emptyAftForm, defaults, []);
    expect(prefilled.values).toMatchObject({ age: "25", standard: "general", gender: "F" });
    expect(prefilled.fromProfile).toEqual(["age", "standard", "gender"]);

    const overridden = applyCalculatorDefaults({ ...emptyAftForm, standard: "combat" as const }, defaults, ["standard"]);
    expect(overridden.values).toMatchObject({ age: "25", standard: "combat", gender: "F" });
    expect(overridden.fromProfile).toEqual(["age", "gender"]);

    // An override can clear a prefilled value.
    expect(applyCalculatorDefaults({ ...emptyAftForm, age: "" }, defaults, ["age"]).values.age).toBe("");
    // The profile itself is not changed.
    expect(profile.standard).toBe("general");
  });

  it("scores with the prefilled demographics", () => {
    const { values } = applyCalculatorDefaults(
      { ...emptyAftForm, deadlift: "200", pushups: "30", sdcMinutes: "2", sdcSeconds: "30", plankMinutes: "2", plankSeconds: "0", runMinutes: "19", runSeconds: "0" },
      calculatorDefaults(profile, TODAY),
      []
    );
    const checked = validateAftForm(values);
    expect(checked.ok && checked.input).toMatchObject({ age: 25, standard: "general", gender: "F" });
  });
});

describe("training-preference prefill", () => {
  it("maps profile preferences to wizard answers and leaves missing ones unanswered", () => {
    const partial = valid({ weekdays: ["tue", "thu"], sessionMinutes: 30 });
    const { answers, fields } = planPrefill(partial);
    expect(answers).toEqual({ weekdays: ["tue", "thu"], daysPerWeek: 2, sessionMinutes: 30 });
    expect(fields).toBe(2);
    expect(planPrefill(null)).toEqual({ answers: {}, fields: 0 });
  });

  it("still requires the answers an AFT score can't establish", () => {
    const base: PreferenceAnswers = {
      daysPerWeek: 3,
      weekdays: ["mon", "wed", "fri"],
      sessionMinutes: 45,
      equipment: null,
      runningAccess: null,
      experience: null,
      recentRunning: null,
      restrictions: [],
    };
    const input: AftInput = { age: 25, standard: "general", gender: "F", raw: { MDL: 200, HRP: 30, SDC: 150, PLK: 120, "2MR": 1140 } };
    const baseline = { resultId: "r1", testDate: "2026-09-01", input, result: scoreAft(input) };
    const screening = { currentPain: false, otherInstructions: "" };
    const incomplete = generatePlan({ baseline, prefs: { ...base, ...planPrefill(valid({ sessionMinutes: 30 })).answers }, screening, startDate: "2026-10-05" });
    expect(incomplete.status).toBe("invalid");
    const full = planPrefill(complete());
    const ready = generatePlan({ baseline, prefs: { ...base, ...full.answers, nextAftDate: full.nextAftDate, targetScore: full.targetScore }, screening, startDate: "2026-10-05" });
    expect(ready.status).toBe("ready");
  });
});

describe("missing information", () => {
  it("lists scoring and training gaps, and none for a complete profile", () => {
    expect(missingProfileInfo(null)).toHaveLength(9);
    expect(missingProfileInfo(complete())).toEqual([]);
    const combat = valid({ standard: "combat", dateOfBirth: "2000-01-01" });
    expect(missingProfileInfo(combat).filter((m) => m.area === "scoring")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Storage boundaries, with an in-memory localStorage
// ---------------------------------------------------------------------------

describe("profile storage boundaries", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };

  beforeEach(() => {
    store.clear();
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
  afterEach(() => {
    delete g.window;
  });

  it("saving, editing, and deleting the profile leaves AFT history and plans byte-for-byte unchanged", async () => {
    const { saveProfile, deleteProfile, PROFILE_KEY } = await import("@/lib/storage/profile");
    const input: AftInput = { age: 25, standard: "general", gender: "F", raw: { MDL: 200, HRP: 30, SDC: 150, PLK: 120, "2MR": 1140 } };
    const history = JSON.stringify({
      schemaVersion: 1,
      results: [{ id: "a1", savedAt: NOW, testDate: "2026-09-01", scoringVersion: "v", input, result: scoreAft(input) }],
    });
    store.set("ruckon.aftResults", history);

    const profile = complete();
    const baseline = { resultId: "a1", testDate: "2026-09-01", input, result: scoreAft(input) };
    const prefill = planPrefill(profile);
    const outcome = generatePlan({
      baseline,
      prefs: { daysPerWeek: 3, weekdays: ["mon"], sessionMinutes: 45, equipment: null, runningAccess: null, experience: null, recentRunning: null, restrictions: [], ...prefill.answers },
      screening: { currentPain: false, otherInstructions: "" },
      startDate: "2026-10-05",
    });
    if (outcome.status !== "ready") throw new Error(outcome.status);
    const plans = JSON.stringify(startPlan(EMPTY_TRAINING, outcome.plan, { id: "p1", createdAt: NOW, startDate: "2026-10-05" }));
    store.set("ruckon.trainingPlans", plans);

    expect(saveProfile(profile).ok).toBe(true);
    // A later profile change (different standard, age, schedule) doesn't rescore history or alter the active plan.
    expect(saveProfile({ ...profile, standard: "combat", dateOfBirth: "1980-01-01", training: { ...profile.training, weekdays: ["tue", "thu"], sessionMinutes: 60 } }).ok).toBe(true);
    expect(parseProfile(store.get(PROFILE_KEY)!)?.standard).toBe("combat");
    expect(store.get("ruckon.aftResults")).toBe(history);
    expect(store.get("ruckon.trainingPlans")).toBe(plans);
    const plan = parseTrainingData(store.get("ruckon.trainingPlans")!).plans[0];
    expect(plan.preferences.weekdays).toEqual(["mon", "wed", "fri"]);
    expect(plan.preferences.sessionMinutes).toBe(45);

    expect(deleteProfile().ok).toBe(true);
    expect(store.has(PROFILE_KEY)).toBe(false);
    expect(store.get("ruckon.aftResults")).toBe(history);
    expect(store.get("ruckon.trainingPlans")).toBe(plans);
  });

  it("reports a storage failure instead of throwing", async () => {
    const { saveProfile } = await import("@/lib/storage/profile");
    (g.window as { localStorage: { setItem: () => void } }).localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(saveProfile(complete())).toEqual({ ok: false, error: expect.stringMatching(/Could not save/) });
  });
});
