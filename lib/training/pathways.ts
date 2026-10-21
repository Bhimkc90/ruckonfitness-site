import type { AftEventCode, AftResult } from "@/lib/aft/types";
import { aftEventInfo, aftEventOrder, failedEvents, meetsTotalMinimum } from "@/lib/aft/scoring";

// Which AFT failure pattern a baseline shows, and how far the draft templates cover it. Failures come from the
// scoring engine's pass rules (lib/aft/scoring.ts), never from thresholds repeated here. Nothing in this file is
// professionally reviewed: "draft" means the pathway is built only from the existing draft templates, not that
// it is approved.

export type PathwayKind = "none-failed" | "single" | "pair" | "multiple" | "total-only";

// draft: a full plan from the existing templates. partial: a plan, but part of the pathway's emphasis can't be
// delivered (listed in the plan's limits). pending-review: the structure is shown but the plan can't be started
// until the named review decision is made.
export type PathwayStatus = "draft" | "partial" | "pending-review";

export type PathwayDecisionId =
  | "focus-order"
  | "mdl-early-weeks"
  | "strength-allocation"
  | "sdc-drag-carry"
  | "sdc-step-up"
  | "run-progression"
  | "no-running-base"
  | "total-only"
  | "pair-overlap"
  | "multiple-workload"
  | "uncovered-event"
  | "experience";

export type PlanPathway = {
  id: string; // "single-MDL", "pair-HRP-2MR", "multiple-3", "total-only", "none-failed"
  kind: PathwayKind;
  label: string;
  failedEvents: AftEventCode[];
  totalBelowMinimum: boolean;
  focusEvents: AftEventCode[]; // development priority order
  maintainedEvents: AftEventCode[];
  emphasis: string[];
  status: PathwayStatus;
  statusReasons: string[];
  decisions: PathwayDecisionId[];
};

// Tentative emphasis for each failed event. It describes the existing templates; it is not a new prescription.
export const EVENT_EMPHASIS: Record<AftEventCode, string> = {
  MDL: "Deadlift: lifting technique and strength (loaded hinge or kettlebell hinge and squat stations; body-weight hinge practice without equipment).",
  HRP: "Hand-release push-up: pushing endurance and technique (sub-maximal sets to the AFT standard, 8-Count T Push-Up, and a loaded press when equipment allows).",
  SDC: "Sprint-drag-carry: movement skills, speed, and conditioning (Military Movement Drill 1, 30:60 intervals, Conditioning Drills), with leg strength from the Step-Up station when kettlebells are available. No drag or carry practice yet.",
  PLK: "Plank: positioning and trunk endurance (holds in the AFT position and Four for the Core).",
  "2MR": "2-mile run: more easy running sessions, within the running you reported.",
};

export const PATHWAY_DECISIONS: Record<PathwayDecisionId, { title: string; now: string; decide: string }> = {
  "focus-order": {
    title: "Order of failed events",
    now: "Failed events are developed lowest points first. Points compare a result with the Army's tables, not events with each other.",
    decide: "Is ordering by points acceptable when more than one event fails, or should the order come from the size of the raw gap, the event, or a coach?",
  },
  "mdl-early-weeks": {
    title: "Deadlift development in weeks 1–2",
    now: "Deadlift development uses the same weeks 1–2 dose as maintenance (2 sets or 2 rounds); only weeks 3–4 add a set or round. Technique comes from the exercise instructions, not from extra practice.",
    decide: "Should development differ from maintenance in weeks 1–2, and is technique practice (for example warm-up sets) needed?",
  },
  "strength-allocation": {
    title: "Strength-event allocation",
    now: "Deadlift, push-up, and plank failures share the same session types (strength sessions). They differ in the development blocks inside those sessions, not in the number of sessions.",
    decide: "Should a single strength-event failure get a different session mix or a dedicated session?",
  },
  "sdc-drag-carry": {
    title: "Drag and carry practice for the SDC",
    now: "The exercise library has no sourced drag or carry exercise, so sprint-drag-carry development has no drag or carry work.",
    decide: "Should drag and carry practice be added, with what equipment, dose, and progression?",
  },
  "sdc-step-up": {
    title: "Step-Up station for SDC leg strength",
    now: "With kettlebells, SDC development adds the Step-Up (Strength Training Circuit station 4) to speed and conditioning sessions at the existing station dose. The ATP does not link it to the AFT, and it needs a 12–18 inch step.",
    decide: "Is the Step-Up appropriate for SDC development, at this dose, in the same session as sprinting?",
  },
  "run-progression": {
    title: "Running development",
    now: "A 2-mile run failure gets more easy runs, each up to the cap for the reported recent running, but running time never increases during the 4 weeks.",
    decide: "Should running volume or intensity progress for a 2-mile run failure, and from which recent-running answers?",
  },
  "no-running-base": {
    title: "No running base or place to run",
    now: "With no recent running, no place to run, or a running restriction, 2-mile run and SDC development use walks and non-sprint drills.",
    decide: "What return-to-running steps, if any, should the plan include?",
  },
  "total-only": {
    title: "Total below the minimum, every event passed",
    now: "The two lowest-scoring events are developed and the others are maintained, the same rule as a passing result. Maintained events keep their usual maintenance work, even when they are just above the minimum.",
    decide: "Which events should be targeted for points, and should events just above the minimum get more than maintenance?",
  },
  "pair-overlap": {
    title: "Two failed events: overlapping fatigue",
    now: "Both events get development blocks. Overlap is handled only by the existing rules: no back-to-back hard days, the session time limit, and the weekly running cap (SDC sprints count toward it).",
    decide: "Are these rules enough for pairs that load the same tissues, such as deadlift and SDC, or SDC and the 2-mile run?",
  },
  "multiple-workload": {
    title: "Three or more failed events: workload",
    now: "Every failed event gets the single-event development blocks, limited only by session length. Workload does not change with experience or with how far below the minimum each event is.",
    decide: "How should total workload and the number of developed events scale with experience and the size of the gaps? Until decided, RuckOn shows the structure but won't start the plan.",
  },
  "uncovered-event": {
    title: "Failed event without a session",
    now: "With the chosen days, at least one failed event has no session that trains it.",
    decide: "Should RuckOn ask for more days, refuse the plan, or rotate the event in on alternate weeks?",
  },
  experience: {
    title: "Effect of training experience",
    now: "Experience changes only the number of sprint repeats. Strength work is effort-based (RPE), so it doesn't change with experience.",
    decide: "Should experience change the starting volume of strength, push-up, or plank work?",
  },
};

const list = (codes: AftEventCode[]) => codes.map((c) => aftEventInfo[c].shortName).join(" + ");

export function classifyPattern(result: Pick<AftResult, "events" | "standard" | "total">): {
  id: string;
  kind: PathwayKind;
  label: string;
  failedEvents: AftEventCode[];
  totalBelowMinimum: boolean;
} {
  const failed = failedEvents(result);
  const totalBelowMinimum = !meetsTotalMinimum(result.total, result.standard);
  if (failed.length === 0) {
    return totalBelowMinimum
      ? { id: "total-only", kind: "total-only", label: "Every event passed; total below the minimum", failedEvents: [], totalBelowMinimum }
      : { id: "none-failed", kind: "none-failed", label: "Every event and the total passed", failedEvents: [], totalBelowMinimum };
  }
  if (failed.length === 1) {
    return { id: `single-${failed[0]}`, kind: "single", label: `${aftEventInfo[failed[0]].name} only failed`, failedEvents: failed, totalBelowMinimum };
  }
  if (failed.length === 2) {
    return { id: `pair-${failed.join("-")}`, kind: "pair", label: `${list(failed)} failed`, failedEvents: failed, totalBelowMinimum };
  }
  return { id: `multiple-${failed.length}`, kind: "multiple", label: `${failed.length} events failed (${list(failed)})`, failedEvents: failed, totalBelowMinimum };
}

const STRENGTH: AftEventCode[] = ["MDL", "HRP", "PLK"];

// The facts about the generated plan that decide a pathway's status.
export type PathwayFacts = {
  focusEvents: AftEventCode[];
  uncoveredFailed: AftEventCode[];
  loadedHinge: boolean; // a loaded deadlift block is in the plan
  hrpPressOnly: boolean; // a press replaces push-up practice
  speedPossible: boolean;
  runAllowed: boolean;
  stepUp: boolean;
};

export function describePathway(result: Pick<AftResult, "events" | "standard" | "total">, facts: PathwayFacts): PlanPathway {
  const pattern = classifyPattern(result);
  const failed = pattern.failedEvents;
  const decisions = new Set<PathwayDecisionId>();
  const partial: string[] = [];
  let status: PathwayStatus = "draft";
  const statusReasons: string[] = [];

  if (failed.length > 1) decisions.add("focus-order");
  if (failed.includes("MDL") && facts.loadedHinge) decisions.add("mdl-early-weeks");
  if (pattern.kind === "single" && STRENGTH.includes(failed[0])) decisions.add("strength-allocation");
  if (failed.includes("SDC")) {
    decisions.add("sdc-drag-carry");
    partial.push("The library has no drag or carry exercise, so the sprint-drag-carry gets no drag or carry practice.");
    if (facts.stepUp) decisions.add("sdc-step-up");
  }
  if (failed.includes("2MR")) decisions.add("run-progression");
  if ((failed.includes("2MR") || failed.includes("SDC")) && !facts.speedPossible) {
    decisions.add("no-running-base");
    partial.push(facts.runAllowed ? "Without recent running, running events get walks and non-sprint drills only." : "Running isn't possible, so running events get walks and conditioning drills only.");
  }
  if (failed.includes("MDL") && !facts.loadedHinge) partial.push("The deadlift gets body-weight hinge practice only; nothing loads the lift.");
  if (failed.includes("HRP") && facts.hrpPressOnly) partial.push("A lying press replaces push-up practice; it doesn't train the event itself.");
  if (pattern.kind === "total-only") decisions.add("total-only");
  if (pattern.kind === "pair") decisions.add("pair-overlap");
  if (facts.uncoveredFailed.length) {
    decisions.add("uncovered-event");
    partial.push(`${list(facts.uncoveredFailed)} failed but ${facts.uncoveredFailed.length > 1 ? "have" : "has"} no session with the chosen days.`);
  }
  if (pattern.kind === "multiple") {
    decisions.add("multiple-workload");
    decisions.add("experience");
    status = "pending-review";
    statusReasons.push(
      `${failed.length} events failed. RuckOn has no reviewed rule for how much to develop at once or how to adjust it for experience and the size of each gap, so this plan's structure is shown but it can't be started.`
    );
  }
  if (status !== "pending-review" && partial.length) status = "partial";
  statusReasons.push(...partial);
  if (status === "draft") statusReasons.push("Built entirely from the existing draft templates. Like every plan, it has not been professionally reviewed.");

  const focusEvents = facts.focusEvents;
  return {
    ...pattern,
    focusEvents,
    maintainedEvents: aftEventOrder.filter((e) => !focusEvents.includes(e)),
    emphasis: failed.length ? focusEvents.filter((e) => failed.includes(e)).map((e) => EVENT_EMPHASIS[e]) : focusEvents.map((e) => EVENT_EMPHASIS[e]),
    status,
    statusReasons,
    decisions: [...decisions],
  };
}

export const pathwayStatusLabels: Record<PathwayStatus, string> = {
  draft: "Draft available",
  partial: "Partial",
  "pending-review": "Pending review: can't be started",
};

// A plan whose pathway is pending review can be shown but not started. Plans saved before v4 have no pathway.
export function canStartPlan(plan: { pathway?: PlanPathway }): boolean {
  return plan.pathway?.status !== "pending-review";
}
