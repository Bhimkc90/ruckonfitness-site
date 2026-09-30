import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { generatePlan, weekdayLabels } from "./engine";
import type { BaselineSnapshot, PlanDraft, Preferences } from "./types";

// Preview examples shown while personalized plans are waiting for professional review.
// The AFT results are synthetic (made up, not from any user) and run through the same scoring and plan
// engine as a real plan, so the samples show exactly what the engine would produce.

export type SamplePlan = {
  id: string;
  label: string;
  profile: string;
  preferences: string[];
  plan: PlanDraft;
};

// A Monday, so week 1 starts on the first scheduled day. Dates are not shown for samples.
const SAMPLE_START = "2026-10-05";

const t = (m: number, s: number) => m * 60 + s;

// A 25-year-old on the general standard who passes every event except the one each sample changes.
function syntheticBaseline(id: string, raw: Partial<AftInput["raw"]>): BaselineSnapshot {
  const input: AftInput = {
    age: 25,
    standard: "general",
    gender: "M",
    raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw },
  };
  return { resultId: `sample-${id}`, testDate: SAMPLE_START, input, result: scoreAft(input) };
}

const equipmentLabels: Record<Preferences["equipment"][number], string> = {
  kettlebell: "kettlebells",
  dumbbell: "dumbbells",
  "barbell-or-hex-bar": "barbell or hex bar",
};

const experienceLabels: Record<Preferences["experience"], string> = {
  new: "new or returning to training",
  some: "some (1–2 times a week)",
  regular: "regular (3+ times a week)",
};

const runningLabels: Record<Preferences["recentRunning"], string> = {
  none: "none",
  "up-to-30": "up to 30 minutes a week",
  "31-60": "31–60 minutes a week",
  "61-120": "61–120 minutes a week",
  "over-120": "more than 120 minutes a week",
};

export function describePreferences(p: Preferences): string[] {
  return [
    `${p.daysPerWeek} days a week (${p.weekdays.map((d) => weekdayLabels[d]).join(", ")}), about ${p.sessionMinutes} minutes each`,
    `Equipment: ${p.equipment.length ? p.equipment.map((e) => equipmentLabels[e]).join(", ") : "none (bodyweight only)"}`,
    `Place to run: ${p.runningAccess ? "yes" : "no"}`,
    `Training experience: ${experienceLabels[p.experience]}`,
    `Running in the last 4 weeks: ${runningLabels[p.recentRunning]}`,
    `Movement restrictions: ${p.restrictions.length ? p.restrictions.join(", ") : "none"}`,
  ];
}

const shared: Preferences = {
  daysPerWeek: 4,
  weekdays: ["mon", "tue", "thu", "sat"],
  sessionMinutes: 45,
  equipment: ["kettlebell"],
  runningAccess: true,
  experience: "some",
  recentRunning: "61-120",
  restrictions: [],
};

const definitions: { id: string; label: string; profile: string; raw: Partial<AftInput["raw"]>; prefs: Preferences }[] = [
  {
    id: "run",
    label: "Slow 2-mile run",
    profile: "Passes every event except the 2-mile run (24:00).",
    raw: { "2MR": t(24, 0) },
    prefs: shared,
  },
  {
    id: "deadlift",
    label: "Low deadlift",
    profile: "Passes every event except the deadlift (120 lb). Same schedule and equipment as the 2-mile run sample.",
    raw: { MDL: 120 },
    prefs: shared,
  },
  {
    id: "sdc",
    label: "Slow SDC, short sessions",
    profile: "Passes every event except the sprint-drag-carry (3:00), with fewer, shorter sessions, no equipment, and little recent running.",
    raw: { SDC: t(3, 0) },
    prefs: {
      daysPerWeek: 3,
      weekdays: ["mon", "wed", "fri"],
      sessionMinutes: 30,
      equipment: [],
      runningAccess: true,
      experience: "new",
      recentRunning: "up-to-30",
      restrictions: [],
    },
  },
];

export function buildSamplePlans(): SamplePlan[] {
  return definitions.map((d) => {
    const outcome = generatePlan({
      baseline: syntheticBaseline(d.id, d.raw),
      prefs: d.prefs,
      screening: { currentPain: false, otherInstructions: "" },
      startDate: SAMPLE_START,
    });
    if (outcome.status !== "ready") throw new Error(`Sample plan ${d.id} did not generate: ${outcome.status}`);
    return { id: d.id, label: d.label, profile: d.profile, preferences: describePreferences(d.prefs), plan: outcome.plan };
  });
}
