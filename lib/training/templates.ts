import type { ActivityId, RunningVolume } from "./types";

// Version stored with every plan so later template changes never silently rewrite an active plan.
export const TEMPLATE_VERSION = "starter-4wk-v3-draft (2026-10-05, not professionally reviewed)";

// Citations used by the templates. Page numbers are the printed page numbers.
export const S = {
  pdStandard: "ATP 7-22.02 (incl. C1) Table 1-1 and para 1-21, p. 1-7: standard Preparation Drill, 10 repetitions of each exercise",
  pdCondensed: "ATP 7-22.02 (incl. C1) Table 1-1 and para 1-20, p. 1-7: condensed-time Preparation Drill",
  pdModify: "ATP 7-22.02 para 1-20, p. 1-7: the Preparation Drill may use fewer exercises or replacements",
  rd: "ATP 7-22.02 paras 16-3 – 16-10, pp. 16-1 – 16-6: hold each stretch 20–30 seconds",
  fourC: "ATP 7-22.02 paras 4-14 – 4-18, pp. 4-8 – 4-11: Four for the Core, holds up to 60 seconds",
  mmd1: "ATP 7-22.02 paras 8-1 – 8-5, pp. 8-1 – 8-2: Military Movement Drill 1, 25-meter course",
  cd: "ATP 7-22.02 paras 5-19 – 5-24, pp. 5-9 – 5-13 and para 1-21, p. 1-7: 5–10 repetitions, building to 10",
  stc: "ATP 7-22.02 paras 13-1 – 13-4, pp. 13-1 – 13-2: one-minute stations, adjusting weight to the required performance",
  kettlebells: "FM 7-22 (incl. C2) para 14-60, p. 14-56: remote Soldiers use 2 × 20–40 lb and 1 × 10–20 lb kettlebells",
  fwDeadlift: "ATP 7-22.02 para 14-8, p. 14-4: Deadlift, repetitions and sets set by the session goal",
  loadTable:
    "FM 7-22 Table 6-4, p. 6-7 (muscular endurance: 12+ reps, 2–3 sets; hypertrophy: 6–12 reps, 30–90 s rest) and para 6-29 (start with an endurance or hypertrophy emphasis)",
  rpe: "FM 7-22 Table 6-3, p. 6-6: rating of perceived exertion and repetitions in reserve",
  rest: "FM 7-22 para 6-30, p. 6-7: heavier loads need longer rest; precision suffers with fatigue",
  zones: "FM 7-22 Table 6-5, p. 6-8: moderate aerobic effort is the largest share of endurance training",
  remote:
    "FM 7-22 para 14-59 and Table 14-20, pp. 14-56 – 14-57: remote Soldier week with one mid-week recovery session, a 30-minute walk at RPE 4, 30-minute runs, sprint intervals, and event practice",
  week: "ATP 7-22.02 para 1-24, p. 1-9: alternate strength and endurance days, speed running at least weekly, test after recovery or a taper",
  sessionOrder: "FM 7-22 paras 6-22 – 6-26, pp. 6-4 – 6-6: preparation, then the main activity, then recovery",
  intervals:
    "ATP 7-22.02 Table 1-2, p. 1-8 (30:60s are timed sprint intervals at moderate to maximum speed) and FM 7-22 Table 14-20 abbreviations (30-second sprint, 60-second walk)",
  strengthOrder: "FM 7-22 para 6-25, p. 6-6: multi-joint and larger-muscle exercises first",
  progression: "FM 7-22 para 7-3, p. 7-1: progression overloads the body without causing overtraining",
  design:
    "FM 7-22 p. 6-8: program design is completed by H2F performance readiness experts; individualization and follow-up assessments drive the training cycle",
  stcChestPress: "ATP 7-22.02 para 13-9, p. 13-7: Supine Chest Press, Strength Training Circuit station 6, one minute",
  fwBench: "ATP 7-22.02 para 14-10, pp. 14-6 – 14-8: Bench Press, a Free Weight Training core exercise",
  pushSubstitute: "ATP 7-22.02 para 13-9, p. 13-7: the Supine Chest Press presses while lying on the back, so the trunk does not hold a plank",
  taper: "ATP 7-22.02 para 1-24, p. 1-9: the Army schedules testing after recovery or a taper",
  aftHrp: "ATP 7-22.01 (12 Mar 2026) paras 2-57 – 2-60, pp. 30–31: HRP standards",
  aftPlk: "ATP 7-22.01 (12 Mar 2026) para 2-73, p. 35: plank standards",
} as const;

// Every rule RuckOn adds beyond the sources. Shown with each plan and listed for professional review.
export const ASSUMPTIONS = {
  focus:
    "Focus: failed events are developed; if none failed, the two lowest-scoring events are developed. Point gaps between events are not a validated way to divide training time.",
  sessionMix:
    "Session mix: every week keeps one strength and one aerobic session for maintenance; extra days go to the focus events in priority order (deadlift, push-up, or plank → strength; 2-mile run → running; sprint-drag-carry → speed, then non-sprint SDC skills). With 4+ days a weekly speed session is kept; with 5 days one is a recovery session.",
  maintenanceRun: "Maintenance runs are capped at 20 minutes; runs for a 2-mile run focus use the full per-run cap.",
  loadedHinge:
    "Loaded hinge: 2 sets (weeks 1–2), then 3 sets (weeks 3–4) of 8–10 reps at RPE 6–7 (3–4 reps in reserve) with 90 seconds' rest. No maximum or percentage-based loads.",
  kettlebellCircuit: "Kettlebell stations: 2 rounds (weeks 1–2), then 3 rounds (weeks 3–4) of 1-minute stations with 60 seconds between rounds.",
  hrpPractice:
    "HRP practice: 3 sets (weeks 1–2), then 4 sets (weeks 3–4) of about half your baseline repetitions (5–25), 60–90 seconds' rest, stopping a set when a rep breaks standard.",
  pushAccessory:
    "Push accessory: with equipment and no lifting restriction, push-up development adds a loaded press: the Supine Chest Press station with kettlebells (2 rounds, then 3, of 1 minute) or the Bench Press with a barbell or dumbbells (2 sets, then 3, of 8–10 reps at RPE 6–7, 90 seconds' rest). If you avoid weight on your hands, the same press replaces push-up practice; it does not train the event itself.",
  plankPractice: "Plank practice: 2 holds (weeks 1–2), then 3 holds (weeks 3–4) of about half your baseline time (20 seconds to 2:00), 60 seconds' rest.",
  runningCap:
    "Running: each run is capped by your reported recent running (10, 20, 25, or 30 minutes) and weekly running never exceeds the top of your reported range. Running time does not increase during the plan.",
  intervals:
    "30:60 intervals: 4 repeats (3 if you are new to training) in weeks 1–2 and 6 (4 if new) in weeks 3–4 at RPE 7, only if you already run regularly.",
  durations:
    "Time estimates: Preparation Drill 10 minutes (condensed 5), Recovery Drill 8, Four for the Core 7, Military Movement Drill 1 5, one round of Conditioning Drills 1 and 2 8.",
  progressionGate:
    "Weeks 3–4 add sets, repeats, or drill repetitions only if no earlier session was rated too hard and no pain was reported; otherwise the weeks 1–2 level repeats.",
  scheduling:
    "Strength, speed, and conditioning sessions count as hard and are never scheduled on back-to-back days; a hard session becomes a recovery session when your chosen days make that impossible.",
  reassessment:
    "Reassessment: record a practice AFT with a trained grader after the plan (week 5) and link it to the plan to compare with the baseline. RuckOn does not change any session for a taper before a scheduled AFT.",
  timeline:
    "Timeline: the only template is 4 weeks. If your AFT is sooner, the plan is not shortened and no workload is added; sessions on or after the AFT date stay scheduled for afterward.",
  screening:
    "Screening: current pain pauses plan creation; written instructions or profile details RuckOn cannot interpret send you to a review path instead of a plan.",
} as const;

export type AssumptionId = keyof typeof ASSUMPTIONS;

export const activities: Record<ActivityId, { name: string; description: string; sources: string[]; link?: string }> = {
  walk: {
    name: "Brisk walk",
    description: "Walk continuously at an easy to moderate effort.",
    sources: [S.remote],
  },
  "easy-run": {
    name: "Easy continuous run",
    description: "Run continuously at an effort where you could still speak in sentences.",
    sources: [S.remote, S.rpe, S.zones],
  },
  "intervals-30-60": {
    name: "30:60 sprint intervals",
    description: "Sprint for 30 seconds, then walk for 60 seconds. That is one repeat.",
    sources: [S.intervals],
  },
  "hrp-practice": {
    name: "Hand-release push-up practice",
    description: "Sets of hand-release push-ups performed to the AFT standard.",
    sources: [S.remote, S.aftHrp],
    link: "/aft-guide/hand-release-push-up",
  },
  "plank-practice": {
    name: "Plank practice",
    description: "Holds in the AFT plank position with a straight line from head to heels.",
    sources: [S.aftPlk],
    link: "/aft-guide/plank",
  },
};

// Plan lengths the templates support, in weeks. Only the 4-week starter template exists; any other length
// needs its own reviewed template rather than a compressed or stretched version of this one.
export const SUPPORTED_PLAN_WEEKS = [4] as const;
export const PLAN_WEEKS = 4;

// Longest single run and most weekly running minutes for each self-reported range.
export const runningLimits: Record<RunningVolume, { perRun: number; perWeek: number }> = {
  none: { perRun: 0, perWeek: 0 },
  "up-to-30": { perRun: 10, perWeek: 30 },
  "31-60": { perRun: 20, perWeek: 60 },
  "61-120": { perRun: 25, perWeek: 120 },
  "over-120": { perRun: 30, perWeek: 120 },
};

// Estimated minutes per block (RuckOn assumptions; see ASSUMPTIONS.durations).
export const MINUTES = {
  pdStandard: 10,
  pdCondensed: 5,
  rd: 8,
  fourC: 7,
  mmd1: 5,
  conditioningRound: 8,
} as const;

// Table 1-1 condensed-time Preparation Drill (ATP 7-22.02 p. 1-7).
export const CONDENSED_PD: { exerciseId: string; reps: number }[] = [
  { exerciseId: "push-up", reps: 5 },
  { exerciseId: "high-jumper", reps: 10 },
  { exerciseId: "rower", reps: 10 },
  { exerciseId: "prone-row", reps: 5 },
  { exerciseId: "rear-lunge", reps: 5 },
  { exerciseId: "bent-leg-body-twist", reps: 5 },
];
