import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput } from "@/lib/aft/types";
import { getDrill, getExercise } from "@/lib/library";
import { PAIN_MESSAGE, generatePlan } from "./engine";
import { ASSUMPTIONS, MINUTES, PLAN_WEEKS, SUPPORTED_PLAN_WEEKS, TEMPLATE_VERSION, activities, runningLimits, type AssumptionId } from "./templates";
import { buildSamplePlans } from "./samples";
import type { BaselineSnapshot, DaysPerWeek, EquipmentOption, PlanBlock, PlanItem, Preferences, Prescription, Restriction, RunningVolume, SessionMinutes, WeekdayId } from "./types";

// Builds docs/training-review/review-package.md from the engine itself, so the prescriptions a reviewer signs
// off are exactly the ones the code produces. lib/training/reviewPackage.test.ts fails when the committed file is
// out of date; regenerate with `UPDATE_REVIEW_PACKAGE=1 npx vitest run lib/training/reviewPackage.test.ts`.

const t = (m: number, s: number) => m * 60 + s;
const START = "2026-10-05";

function synthetic(raw: Partial<AftInput["raw"]>): BaselineSnapshot {
  const input: AftInput = { age: 25, standard: "general", gender: "M", raw: { MDL: 250, HRP: 40, SDC: t(1, 50), PLK: t(2, 30), "2MR": t(16, 30), ...raw } };
  return { resultId: "review", testDate: START, input, result: scoreAft(input) };
}

const FOCUS: { label: string; raw: Partial<AftInput["raw"]> }[] = [
  { label: "deadlift below minimum", raw: { MDL: 120 } },
  { label: "push-ups below minimum", raw: { HRP: 8 } },
  { label: "SDC below minimum", raw: { SDC: t(3, 30) } },
  { label: "plank below minimum", raw: { PLK: t(0, 50) } },
  { label: "2-mile run below minimum", raw: { "2MR": t(24, 0) } },
  { label: "every event passed", raw: {} },
];
const EQUIPMENT: EquipmentOption[][] = [[], ["kettlebell"], ["dumbbell"], ["barbell-or-hex-bar"]];
const MINUTES_OPTIONS: SessionMinutes[] = [30, 45, 60];
const RESTRICTIONS: Restriction[][] = [[], ["no-running"], ["no-jumping"], ["no-loaded-lifting"], ["no-weight-on-hands"]];
const DAYS: Record<DaysPerWeek, WeekdayId[]> = { 2: ["mon", "thu"], 3: ["mon", "wed", "fri"], 4: ["mon", "tue", "thu", "sat"], 5: ["mon", "tue", "wed", "fri", "sat"] };
const RUNNING: RunningVolume[] = ["none", "up-to-30", "31-60", "61-120", "over-120"];

// Values that depend on the individual baseline or running answer are shown as the rule, not one example.
function normalize(item: PlanItem, p: Prescription): Prescription {
  if (item.kind !== "activity") return p;
  if (item.activityId === "hrp-practice") return { ...p, reps: "about half the baseline repetitions (5–25; half of a baseline under 10)" };
  if (item.activityId === "plank-practice") return { ...p, time: "about half the baseline time (0:20–2:00)" };
  if (item.activityId === "easy-run" || item.activityId === "walk") return { ...p, time: "minutes set by the running and session limits below" };
  return p;
}

const fmt = (p: Prescription) =>
  [p.sets && `sets: ${p.sets}`, p.reps && `reps: ${p.reps}`, p.time && `time: ${p.time}`, p.rest && `rest: ${p.rest}`, p.intensity && `effort: ${p.intensity}`, p.notes]
    .filter(Boolean)
    .join("; ");

function itemName(item: PlanItem) {
  if (item.kind === "drill") return getDrill(item.drillId)!.name;
  if (item.kind === "exercise") return getExercise(item.exerciseId)!.name;
  return activities[item.activityId].name;
}

type Variant = { block: PlanBlock; rows: string[]; firstSeen: string };

function collectBlocks(): Map<string, Variant> {
  const variants = new Map<string, Variant>();
  const base: Preferences = { daysPerWeek: 3, weekdays: DAYS[3], sessionMinutes: 45, equipment: [], runningAccess: true, experience: "some", recentRunning: "31-60", restrictions: [] };
  const scenarios: { label: string; prefs: Preferences; raw: Partial<AftInput["raw"]> }[] = [];
  for (const focus of FOCUS)
    for (const equipment of EQUIPMENT)
      for (const sessionMinutes of MINUTES_OPTIONS)
        for (const restrictions of RESTRICTIONS)
          scenarios.push({
            label: `${focus.label}; equipment: ${equipment.join(", ") || "none"}; ${sessionMinutes} min; restriction: ${restrictions.join(", ") || "none"}`,
            prefs: { ...base, equipment, sessionMinutes, restrictions },
            raw: focus.raw,
          });
  for (const focus of FOCUS) {
    for (const experience of ["new", "regular"] as const) scenarios.push({ label: `${focus.label}; experience: ${experience}`, prefs: { ...base, experience }, raw: focus.raw });
    for (const recentRunning of RUNNING) scenarios.push({ label: `${focus.label}; recent running: ${recentRunning}`, prefs: { ...base, recentRunning }, raw: focus.raw });
    for (const d of [2, 4, 5] as DaysPerWeek[]) scenarios.push({ label: `${focus.label}; ${d} days`, prefs: { ...base, daysPerWeek: d, weekdays: DAYS[d] }, raw: focus.raw });
  }
  for (const s of scenarios) {
    const out = generatePlan({ baseline: synthetic(s.raw), prefs: s.prefs, screening: { currentPain: false, otherInstructions: "" }, startDate: START });
    if (out.status !== "ready") continue;
    for (const session of out.plan.sessions) {
      for (const block of [...session.warmUp, ...session.main, ...session.recovery]) {
        const rows = block.items.map((item) => {
          const f = fmt(normalize(item, item.prescription.foundation));
          const b = fmt(normalize(item, item.prescription.build));
          const omit = item.kind === "drill" && item.omit?.length ? ` (omitted: ${item.omit.map((id) => getExercise(id)?.name ?? id).join(", ")})` : "";
          return `| ${itemName(item)}${omit} | ${f} | ${b === f ? "same" : b} |`;
        });
        const key = `${block.id}|${block.title}|${rows.join("")}`;
        if (!variants.has(key)) variants.set(key, { block, rows, firstSeen: s.label });
      }
    }
  }
  return variants;
}

export function buildReviewPackage(): string {
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(
    "# Training plans: review package",
    "",
    "<!-- Generated by lib/training/reviewPackage.ts. Do not edit by hand. -->",
    "",
    `Template version: \`${TEMPLATE_VERSION}\``,
    "",
    "**Status: not professionally reviewed. Personalized plans stay off in production** (`NEXT_PUBLIC_TRAINING_PLANS`).",
    "Source citations, passing tests, and AI review are not professional approval. This package lists exactly what",
    "the engine prescribes so a qualified reviewer can approve, change, or reject each rule.",
    "",
    "Reviewer qualifications and the review record template are in `docs/evaluation/05-training-content-review.md`.",
    "",
    "## 1. Decisions requiring sign-off",
    "",
    "Each rule is a RuckOn assumption (not stated by an Army source) and is shown to users with every plan.",
    "",
    "| ID | Current rule | Decision | Required change |",
    "|---|---|---|---|"
  );
  for (const [id, text] of Object.entries(ASSUMPTIONS) as [AssumptionId, string][]) push(`| \`${id}\` | ${text} | ☐ approve ☐ change ☐ reject | |`);

  push(
    "",
    "Also requiring sign-off:",
    "",
    "- **Plan length.** Supported lengths: " + SUPPORTED_PLAN_WEEKS.map((w) => `${w} weeks`).join(", ") + ". Should other lengths exist (each would need its own reviewed template)?",
    "- **Taper.** The engine applies no taper. ATP 7-22.02 para 1-24 schedules testing after recovery or a taper; what, if anything, should the plan change before a scheduled AFT?",
    "- **Screening wording** (section 6) and the restriction-to-exercise mapping (section 5).",
    "- **Library content used by plans:** exercise selection, cues, and substitutions shown with each exercise, and permission to reproduce the ATP figures.",
    "",
    "## 2. Progression rules",
    "",
    `- Plans run ${PLAN_WEEKS} weeks. Weeks 1–2 use the *foundation* prescription; weeks 3–4 use the *build* prescription.`,
    "- Build applies only if no earlier session was rated *too hard* and no pain was reported; otherwise weeks 3–4 repeat the foundation level.",
    "- Any pain report shows a stop-and-consult message; workload never increases automatically after that.",
    "- Loads are effort-based (RPE and reps in reserve). The engine never prescribes a weight, a percentage, or a maximum, and never infers loads or running readiness from AFT scores.",
    "- Running time never increases during the plan.",
    "",
    "### Running limits (from the self-reported last 4 weeks)",
    "",
    "| Recent running | Longest run (min) | Weekly running (min) |",
    "|---|---|---|"
  );
  for (const [k, v] of Object.entries(runningLimits)) push(`| ${k} | ${v.perRun} | ${v.perWeek} |`);
  push(
    "",
    "Maintenance runs (2-mile run not a focus) are capped at 20 minutes. Speed sessions count about 5 minutes of running.",
    "",
    "### Block time estimates (minutes)",
    "",
    "| Block | Minutes |",
    "|---|---|"
  );
  for (const [k, v] of Object.entries(MINUTES)) push(`| ${k} | ${v} |`);

  push(
    "",
    "## 3. Exact prescriptions",
    "",
    "Every distinct block the engine produced across a scenario matrix: six baselines (each event below the minimum, or all passing),",
    "four equipment sets, three session lengths, five restriction settings, two other experience levels, five running answers, and 2–5 days.",
    "Values that depend on the person's baseline or answers are shown as the rule.",
    ""
  );
  const variants = [...collectBlocks().values()].sort((a, b) => a.block.id.localeCompare(b.block.id) || a.block.title.localeCompare(b.block.title));
  for (const v of variants) {
    push(
      `### ${v.block.title} (\`${v.block.id}\`, about ${v.block.minutes} min)`,
      "",
      `First seen: ${v.firstSeen}.`,
      "",
      "| Item | Weeks 1–2 | Weeks 3–4 |",
      "|---|---|---|",
      ...v.rows,
      "",
      "Sources: " + v.block.sources.join("; ") + ".",
      ""
    );
  }

  push(
    "## 4. Scheduling, timeline, and reassessment",
    "",
    `- ${ASSUMPTIONS.sessionMix}`,
    `- ${ASSUMPTIONS.scheduling}`,
    "- Sessions can be moved only within their plan week. Two sessions can't share a date; moving a hard session next to another, or onto the AFT day, shows a warning. Completion records are kept.",
    "- A session can be recorded on or after its date, with difficulty (easy, about right, hard, too hard), a pain checkbox, and optional notes.",
    `- ${ASSUMPTIONS.timeline}`,
    `- ${ASSUMPTIONS.reassessment}`,
    "",
    "## 5. Restrictions",
    "",
    "| Restriction | Exercises removed |",
    "|---|---|",
    "| Running | Exercises tagged with the run movement pattern; running activities become walks |",
    "| Jumping | Exercises tagged as jumping |",
    "| Lifting weights | Any exercise that needs equipment |",
    "| Weight on hands | Bodyweight pushing exercises and exercises from the Front Leaning Rest or Six-Point Stance (loaded presses stay available) |",
    "",
    "## 6. Screening",
    "",
    `- Current pain or told not to train: ${PAIN_MESSAGE}`,
    "- Any written instruction or profile detail: no plan; the user is directed to their provider or unit H2F team.",
    "- All four restrictions together, or a push-up-only focus with no weight on the hands and no press available: no plan, with an explanation.",
    "",
    "## 7. Example plans (week 1, synthetic baselines)",
    ""
  );
  for (const sample of buildSamplePlans()) {
    push(`### ${sample.label}`, "", sample.profile, "", ...sample.preferences.map((p) => `- ${p}`), "");
    for (const s of sample.plan.sessions.filter((x) => x.week === 1)) {
      push(`- **${s.title}** (about ${s.estimatedMinutes} min): ` + [...s.warmUp, ...s.main, ...s.recovery].map((b) => b.title).join(" → "));
    }
    push("");
  }
  return out.join("\n");
}
