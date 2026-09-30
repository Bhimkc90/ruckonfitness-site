import type { AftEventCode } from "@/lib/aft/types";
import { aftEventInfo, aftEventOrder } from "@/lib/aft/scoring";
import { aftStandardRules } from "@/lib/aft/rules";
import { formatRaw } from "@/lib/aft/format";
import { formatSeconds } from "@/lib/aft/validation";
import { getDrill, getExercise } from "@/lib/library";
import type { DrillId } from "@/lib/library/types";
import { ASSUMPTIONS, CONDENSED_PD, MINUTES, S, TEMPLATE_VERSION, runningLimits } from "./templates";
import type {
  BaselineSnapshot,
  EventAnalysis,
  PlanBlock,
  PlanDraft,
  PlanItem,
  PlanOutcome,
  PlanSession,
  Preferences,
  Prescription,
  Restriction,
  Screening,
  SessionKind,
  WeekdayId,
} from "./types";

export const WEEKDAYS: WeekdayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const weekdayLabels: Record<WeekdayId, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const HARD: SessionKind[] = ["strength", "speed", "conditioning"];
const HANDS_POSITIONS = new Set(["front-leaning-rest", "six-point-stance"]);

// ---------------------------------------------------------------------------
// Baseline analysis
// ---------------------------------------------------------------------------

export function analyzeBaseline(baseline: BaselineSnapshot): { analysis: EventAnalysis[]; summary: string[] } {
  const { result } = baseline;
  const rule = aftStandardRules[result.standard];
  const events = aftEventOrder.map((event) => {
    const entry = result.events.find((e) => e.event === event)!;
    return { event, points: entry.points, raw: entry.raw, passed: entry.points >= rule.minEventPoints };
  });

  const failed = events.filter((e) => !e.passed);
  let develop: AftEventCode[];
  let basis: "failed" | "lowest" | "balanced";
  if (failed.length > 0) {
    develop = failed.map((e) => e.event);
    basis = "failed";
  } else {
    const sorted = [...events].sort((a, b) => a.points - b.points);
    const cutoff = sorted[1].points;
    const lowest = sorted.filter((e) => e.points <= cutoff);
    if (lowest.length > 3 || sorted[0].points === 100) {
      develop = [];
      basis = "balanced";
    } else {
      develop = lowest.map((e) => e.event);
      basis = "lowest";
    }
  }

  const analysis: EventAnalysis[] = events.map((e) => {
    const name = aftEventInfo[e.event].name;
    const raw = formatRaw(e.event, e.raw);
    const role = develop.includes(e.event) ? "develop" : "maintain";
    let reason: string;
    if (!e.passed) reason = `${name}: ${e.points} points (${raw}) is below the ${rule.minEventPoints}-point minimum, so it is a development focus.`;
    else if (role === "develop") reason = `${name}: ${e.points} points (${raw}) is one of your lowest-scoring events, so it gets extra work.`;
    else reason = `${name}: ${e.points} points (${raw}). Maintained with lighter work.`;
    return { ...e, role, reason };
  });

  const summary: string[] = [];
  if (basis === "failed") summary.push(`Your baseline did not meet the ${rule.label.toLowerCase()} standard on ${failed.length} event${failed.length > 1 ? "s" : ""}; those come first.`);
  if (basis === "lowest") summary.push("You met the minimum on every event, so the plan emphasizes your lowest-scoring events.");
  if (basis === "balanced") summary.push("Your event scores are too even to single out a focus, so the plan keeps a balanced mix.");
  if (!result.passed && failed.length === 0) {
    summary.push(`Your total of ${result.total} is below the ${rule.minTotalPoints}-point ${rule.label.toLowerCase()} standard; the plan emphasizes your lowest-scoring events.`);
  }
  summary.push(
    "Points compare you with the Army's score tables, not events with each other. RuckOn uses them only to order emphasis; they are not a validated way to divide training time."
  );
  return { analysis, summary };
}

// ---------------------------------------------------------------------------
// Restrictions and equipment
// ---------------------------------------------------------------------------

type Ctx = {
  prefs: Preferences;
  restrictions: Set<Restriction>;
  baseline: BaselineSnapshot;
  roles: Record<AftEventCode, "develop" | "maintain">;
  runAllowed: boolean; // no running restriction and a place to run
  hasRunningBase: boolean;
  limitations: Set<string>;
  assumptions: Set<string>;
};

export function exerciseAllowed(exerciseId: string, restrictions: Set<Restriction>): boolean {
  const exercise = getExercise(exerciseId);
  if (!exercise) return false;
  if (restrictions.has("no-running") && exercise.tags.movementPatterns.includes("run")) return false;
  if (restrictions.has("no-jumping") && exercise.tags.impact === "jumping") return false;
  if (restrictions.has("no-loaded-lifting") && !exercise.tags.equipment.includes("none")) return false;
  if (restrictions.has("no-weight-on-hands")) {
    if (exercise.tags.movementPatterns.includes("push")) return false;
    if (exercise.executions.some((x) => HANDS_POSITIONS.has(x.position))) return false;
  }
  return true;
}

function drillOmissions(drillId: DrillId, restrictions: Set<Restriction>): string[] {
  return getDrill(drillId)!.sequence.filter((id) => !exerciseAllowed(id, restrictions));
}

const same = (p: Prescription) => ({ foundation: p, build: p });

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function warmUpBlock(ctx: Ctx): PlanBlock {
  if (ctx.prefs.sessionMinutes === 30) {
    const included = CONDENSED_PD.filter((x) => exerciseAllowed(x.exerciseId, ctx.restrictions));
    const omit = getDrill("preparation-drill")!.sequence.filter((id) => !included.some((x) => x.exerciseId === id));
    const reps = included.map((x) => `${getExercise(x.exerciseId)!.name} ${x.reps}`).join(", ");
    return {
      id: "pd-condensed",
      title: "Preparation Drill (condensed)",
      minutes: MINUTES.pdCondensed,
      items: [{ kind: "drill", drillId: "preparation-drill", omit, prescription: same({ reps, intensity: "Slow or moderate cadence as listed for each exercise" }) }],
      sources: [S.pdCondensed, ...(included.length < CONDENSED_PD.length ? [S.pdModify] : [])],
      assumptions: [ASSUMPTIONS.durations],
    };
  }
  const omit = drillOmissions("preparation-drill", ctx.restrictions);
  return {
    id: "pd",
    title: "Preparation Drill",
    minutes: MINUTES.pdStandard,
    items: [{ kind: "drill", drillId: "preparation-drill", omit, prescription: same({ reps: "10 repetitions of each exercise" }) }],
    sources: [S.pdStandard, ...(omit.length ? [S.pdModify] : [])],
    assumptions: [ASSUMPTIONS.durations],
  };
}

function recoveryBlock(ctx: Ctx): PlanBlock {
  return {
    id: "rd",
    title: "Recovery Drill",
    minutes: MINUTES.rd,
    items: [{ kind: "drill", drillId: "recovery-drill", omit: drillOmissions("recovery-drill", ctx.restrictions), prescription: same({ time: "Hold each stretch 20–30 seconds, each side" }) }],
    sources: [S.rd],
    assumptions: [ASSUMPTIONS.durations],
  };
}

function fourCBlock(ctx: Ctx, id = "4c"): PlanBlock | null {
  const omit = drillOmissions("four-for-the-core", ctx.restrictions);
  if (omit.length === 4) return null;
  return {
    id,
    title: "Four for the Core",
    minutes: MINUTES.fourC,
    items: [{ kind: "drill", drillId: "four-for-the-core", omit, prescription: same({ time: "Hold each exercise up to 60 seconds (Back Bridge: 6 × 5 seconds); rest briefly as the ATP describes" }) }],
    sources: [S.fourC],
    assumptions: [ASSUMPTIONS.durations],
  };
}

const rpeLift = "RPE 6–7: finish each set with 3–4 good repetitions left. Use a weight you can control with a straight spine on every rep; do not test a maximum.";

function mdlBlock(ctx: Ctx): PlanBlock {
  const develop = ctx.roles.MDL === "develop";
  const equipment = new Set(ctx.prefs.equipment);
  const loaded = !ctx.restrictions.has("no-loaded-lifting");
  const sets = (dev: boolean) => ({ foundation: "2", build: dev ? "3" : "2" });

  if (loaded && equipment.has("barbell-or-hex-bar")) {
    const s = sets(develop);
    return {
      id: "mdl-deadlift",
      title: develop ? "Deadlift development" : "Deadlift maintenance",
      minutes: develop ? 12 : 8,
      items: [
        {
          kind: "exercise",
          exerciseId: "deadlift",
          prescription: {
            foundation: { sets: s.foundation, reps: "8–10", rest: "90 seconds", intensity: rpeLift },
            build: { sets: s.build, reps: "8–10", rest: "90 seconds", intensity: rpeLift },
          },
        },
      ],
      sources: [S.fwDeadlift, S.loadTable, S.rpe, S.rest],
      assumptions: [ASSUMPTIONS.loadedHinge],
    };
  }

  if (loaded && (equipment.has("kettlebell") || equipment.has("dumbbell"))) {
    if (equipment.has("kettlebell")) {
      const rounds = { foundation: "2 rounds", build: develop ? "3 rounds" : "2 rounds" };
      const p = (r: string): Prescription => ({
        sets: r,
        time: "1 minute per exercise",
        rest: "60 seconds between rounds",
        intensity: "A kettlebell you can move with control for the whole minute; rest or lighten it if form slips",
      });
      return {
        id: "mdl-kettlebell",
        title: develop ? "Kettlebell hinge and squat development" : "Kettlebell hinge and squat maintenance",
        minutes: develop ? 8 : 6,
        items: ["sumo-squat", "straight-leg-deadlift"].map((exerciseId) => ({
          kind: "exercise" as const,
          exerciseId,
          prescription: { foundation: p(rounds.foundation), build: p(rounds.build) },
        })),
        sources: [S.stc, S.kettlebells],
        assumptions: [ASSUMPTIONS.kettlebellCircuit],
      };
    }
    const s = sets(develop);
    return {
      id: "mdl-dumbbell",
      title: develop ? "Dumbbell hinge development" : "Dumbbell hinge maintenance",
      minutes: develop ? 10 : 7,
      items: ["deadlift", "straight-leg-deadlift"].map((exerciseId) => ({
        kind: "exercise" as const,
        exerciseId,
        prescription: {
          foundation: { sets: s.foundation, reps: "10–12", rest: "90 seconds", intensity: rpeLift },
          build: { sets: s.build, reps: "10–12", rest: "90 seconds", intensity: rpeLift },
        },
      })),
      sources: [S.fwDeadlift, S.loadTable, S.rpe, S.rest],
      assumptions: [ASSUMPTIONS.loadedHinge],
    };
  }

  if (develop) {
    ctx.limitations.add(
      loaded
        ? "Deadlift: without kettlebells, dumbbells, or a barbell, the plan can only practice the hinge pattern with body weight. It cannot load the lift the way the event does."
        : "Deadlift: you asked to avoid lifting weights, so the plan only practices the hinge pattern with body weight. Ask your provider or H2F team when loaded lifting is appropriate."
    );
  }
  return {
    id: "mdl-bodyweight",
    title: "Hinge pattern practice (body weight)",
    minutes: 5,
    items: [
      { kind: "exercise", exerciseId: "squat-bender", prescription: { foundation: { sets: "2", reps: "5–10", intensity: "Slow cadence" }, build: { sets: "2", reps: "10", intensity: "Slow cadence" } } },
      { kind: "exercise", exerciseId: "back-bridge", prescription: same({ reps: "6 repetitions (5 seconds each, switching legs)" }) },
    ],
    sources: ["ATP 7-22.02 para 3-8, p. 3-5: Squat Bender, 5–10 repetitions", S.fourC],
    assumptions: [ASSUMPTIONS.durations],
  };
}

function hrpBlock(ctx: Ctx): PlanBlock | null {
  const develop = ctx.roles.HRP === "develop";
  if (ctx.restrictions.has("no-weight-on-hands")) {
    ctx.limitations.add("Hand-release push-up: you asked to avoid weight on your hands, and the library has no substitute that trains this event.");
    return null;
  }
  const baseline = ctx.baseline.result.events.find((e) => e.event === "HRP")!.raw;
  const items: PlanItem[] = [];
  if (baseline > 0) {
    const perSet = baseline >= 10 ? Math.min(25, Math.max(5, Math.round(baseline / 2))) : Math.max(1, Math.round(baseline / 2));
    const p = (sets: string): Prescription => ({
      sets,
      reps: `${perSet}`,
      rest: "60–90 seconds",
      intensity: "RPE 6–7. End a set early if a repetition breaks the AFT standard",
    });
    items.push({ kind: "activity", activityId: "hrp-practice", prescription: develop ? { foundation: p("3"), build: p("4") } : same(p("2")) });
  } else {
    ctx.limitations.add("Hand-release push-up: your baseline had no correct repetitions, so the plan uses drill push-ups only. A coach can help find a starting point.");
  }
  if (develop || baseline === 0) {
    items.push({
      kind: "exercise",
      exerciseId: "eight-count-t-push-up",
      prescription: { foundation: { sets: "1", reps: "5", intensity: "Moderate cadence" }, build: { sets: "1", reps: "up to 10", intensity: "Moderate cadence" } },
    });
  }
  return {
    id: develop ? "hrp-develop" : "hrp-maintain",
    title: develop ? "Hand-release push-up development" : "Hand-release push-up maintenance",
    minutes: develop ? 9 : 5,
    items,
    sources: [S.remote, S.aftHrp, S.cd],
    assumptions: [ASSUMPTIONS.hrpPractice],
  };
}

function plkBlock(ctx: Ctx, includeFourC: boolean): PlanBlock {
  const develop = ctx.roles.PLK === "develop";
  const baseline = ctx.baseline.result.events.find((e) => e.event === "PLK")!.raw;
  const hold = Math.min(120, Math.max(20, Math.round(baseline / 2)));
  const holds = develop ? { foundation: 2, build: 3 } : { foundation: 2, build: 2 };
  const p = (n: number): Prescription => ({ sets: `${n} holds`, time: formatSeconds(hold), rest: "60 seconds", intensity: "Stop a hold when the straight line from head to heels breaks" });
  const items: PlanItem[] = [{ kind: "activity", activityId: "plank-practice", prescription: { foundation: p(holds.foundation), build: p(holds.build) } }];
  let minutes = Math.ceil((holds.build * hold + (holds.build - 1) * 60) / 60) + 1;
  const sources: string[] = [S.aftPlk];
  if (develop && includeFourC) {
    const fourC = fourCBlock(ctx);
    if (fourC) {
      items.unshift(...fourC.items);
      minutes += MINUTES.fourC;
      sources.push(S.fourC);
    }
  }
  return {
    id: develop ? "plk-develop" : "plk-maintain",
    title: develop ? "Plank development" : "Plank maintenance",
    minutes,
    items,
    sources,
    assumptions: [ASSUMPTIONS.plankPractice],
  };
}

function mmd1Block(ctx: Ctx, sprinting: boolean): PlanBlock | null {
  const omit = drillOmissions("military-movement-drill-1", ctx.restrictions);
  if (!sprinting && !omit.includes("shuttle-sprint")) omit.push("shuttle-sprint");
  if (omit.length === 3) return null;
  return {
    id: "mmd1",
    title: "Military Movement Drill 1",
    minutes: MINUTES.mmd1,
    items: [{ kind: "drill", drillId: "military-movement-drill-1", omit, prescription: same({ reps: "Each exercise over the 25-meter course", intensity: sprinting ? "Build speed gradually" : "Moderate speed" }) }],
    sources: [S.mmd1],
    assumptions: [ASSUMPTIONS.durations],
  };
}

function intervalsBlock(ctx: Ctx): PlanBlock {
  const develop = ctx.roles.SDC === "develop";
  const isNew = ctx.prefs.experience === "new";
  const reps = { foundation: isNew ? 3 : 4, build: develop ? (isNew ? 4 : 6) : isNew ? 3 : 4 };
  const p = (n: number): Prescription => ({ reps: `${n} repeats`, time: "30 seconds fast, 60 seconds walking", intensity: "RPE 7: hard but not all-out. Walk the full 60 seconds." });
  return {
    id: "intervals",
    title: "30:60 sprint intervals",
    minutes: Math.ceil(reps.build * 1.5) + 1,
    items: [{ kind: "activity", activityId: "intervals-30-60", prescription: { foundation: p(reps.foundation), build: p(reps.build) } }],
    sources: [S.intervals, S.week, S.rpe],
    assumptions: [ASSUMPTIONS.intervals],
  };
}

function conditioningBlock(ctx: Ctx): PlanBlock | null {
  const items: PlanItem[] = [];
  for (const drillId of ["conditioning-drill-1", "conditioning-drill-2"] as DrillId[]) {
    const omit = drillOmissions(drillId, ctx.restrictions);
    if (omit.length < getDrill(drillId)!.sequence.length) {
      items.push({
        kind: "drill",
        drillId,
        omit,
        prescription: { foundation: { sets: "1 round", reps: "5 repetitions of each exercise" }, build: { sets: "1 round", reps: "up to 10 repetitions of each exercise" } },
      });
    }
  }
  if (items.length === 0) return null;
  return { id: "cd", title: "Conditioning Drills 1 and 2", minutes: MINUTES.conditioningRound, items, sources: [S.cd], assumptions: [ASSUMPTIONS.durations] };
}

function runBlock(ctx: Ctx, minutes: number): PlanBlock {
  return {
    id: "easy-run",
    title: "Easy continuous run",
    minutes,
    items: [{ kind: "activity", activityId: "easy-run", prescription: same({ time: `${minutes} minutes`, intensity: "RPE 4–5: easy to moderate; you can still speak in sentences" }) }],
    sources: [S.remote, S.rpe, S.zones],
    assumptions: [ASSUMPTIONS.runningCap],
  };
}

function walkBlock(minutes: number, intensity = "RPE 3–4: brisk but easy"): PlanBlock {
  return {
    id: "walk",
    title: "Brisk walk",
    minutes,
    items: [{ kind: "activity", activityId: "walk", prescription: same({ time: `${minutes} minutes`, intensity }) }],
    sources: [S.remote],
    assumptions: [],
  };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

type SessionBody = { title: string; purpose: string; warmUp: PlanBlock[]; main: PlanBlock[]; recovery: PlanBlock[]; skipped: string[] };

function fitBlocks(candidates: PlanBlock[], budget: number, onSkip: (block: PlanBlock) => void): PlanBlock[] {
  const chosen: PlanBlock[] = [];
  let used = 0;
  for (const block of candidates) {
    if (used + block.minutes <= budget) {
      chosen.push(block);
      used += block.minutes;
    } else onSkip(block);
  }
  return chosen;
}

function names(events: AftEventCode[]) {
  return events.map((e) => aftEventInfo[e].shortName).join(", ");
}

function buildSession(kind: SessionKind, ctx: Ctx, runMinutes: number, variant = 0): SessionBody {
  const warmUp = [warmUpBlock(ctx)];
  const recovery = [recoveryBlock(ctx)];
  const budget = ctx.prefs.sessionMinutes - warmUp[0].minutes - recovery[0].minutes;

  if (kind === "strength") {
    const develop = (["MDL", "HRP", "PLK"] as AftEventCode[]).filter((e) => ctx.roles[e] === "develop");
    const blocks = [mdlBlock(ctx), hrpBlock(ctx), plkBlock(ctx, budget >= 30)].filter((b): b is PlanBlock => b !== null);
    const developBlocks = blocks.filter((b) => b.id.includes("develop") || (b.id.startsWith("mdl") && ctx.roles.MDL === "develop"));
    const otherBlocks = blocks.filter((b) => !developBlocks.includes(b));
    // Strength B starts with a different development block so both sessions share the work.
    const shift = developBlocks.length ? variant % developBlocks.length : 0;
    const rotated = [...developBlocks.slice(shift), ...developBlocks.slice(0, shift)];
    const skipped: string[] = [];
    const chosen = fitBlocks([...rotated, ...otherBlocks], budget, (b) => skipped.push(b.title));
    const order = ["mdl", "hrp", "plk"];
    chosen.sort((a, b) => order.findIndex((o) => a.id.startsWith(o)) - order.findIndex((o) => b.id.startsWith(o)));
    return {
      title: "Strength: deadlift, push-ups, plank",
      purpose: develop.length ? `Develops ${names(develop)}; maintains the other strength events. Larger, multi-joint lifts come first.` : "Maintains deadlift, push-up, and plank strength.",
      warmUp,
      main: chosen,
      recovery,
      skipped,
    };
  }

  if (kind === "speed") {
    const main = fitBlocks([mmd1Block(ctx, true), intervalsBlock(ctx)].filter((b): b is PlanBlock => b !== null), budget, () => undefined);
    return {
      title: "Speed and SDC skills",
      purpose: `Movement drills and sprint intervals for the sprint-drag-carry${ctx.roles.SDC === "develop" ? " (a development focus)" : ""}. The Army schedules speed running at least once a week.`,
      warmUp,
      main,
      recovery,
      skipped: [],
    };
  }

  if (kind === "conditioning") {
    const main = fitBlocks([mmd1Block(ctx, false), conditioningBlock(ctx)].filter((b): b is PlanBlock => b !== null), budget, () => undefined);
    return {
      title: "Conditioning drills",
      purpose: "Body-weight conditioning and lateral movement without sprinting.",
      warmUp,
      main,
      recovery,
      skipped: [],
    };
  }

  if (kind === "endurance") {
    if (ctx.runAllowed && ctx.hasRunningBase && runMinutes > 0) {
      return {
        title: "Easy run",
        purpose: `Aerobic base for the 2-mile run${ctx.roles["2MR"] === "develop" ? " (a development focus)" : ""} at an easy, conversational effort.`,
        warmUp,
        main: [runBlock(ctx, Math.min(runMinutes, budget))],
        recovery,
        skipped: [],
      };
    }
    return {
      title: "Brisk walk",
      purpose: "Low-intensity aerobic work while running is not part of the plan.",
      warmUp,
      main: [walkBlock(Math.min(30, budget), "RPE 4: brisk")],
      recovery,
      skipped: [],
    };
  }

  // Recovery session: Four for the Core and an easy walk.
  const fourC = fourCBlock(ctx, "4c-recovery");
  const main = fourC ? [fourC] : [];
  const left = budget - (fourC ? fourC.minutes : 0);
  if (left >= 10) main.push(walkBlock(Math.min(20, left), "RPE 3: easy"));
  return { title: "Recovery and core", purpose: "An easier day between harder sessions: core stability and an easy walk.", warmUp, main, recovery, skipped: [] };
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

function weekIndex(day: WeekdayId) {
  return WEEKDAYS.indexOf(day);
}

function adjacent(a: WeekdayId, b: WeekdayId) {
  const diff = Math.abs(weekIndex(a) - weekIndex(b));
  return diff === 1 || diff === 6;
}

export function hardConflicts(days: WeekdayId[], kinds: SessionKind[]): number {
  let count = 0;
  for (let i = 0; i < days.length; i++) {
    for (let j = i + 1; j < days.length; j++) {
      if (adjacent(days[i], days[j]) && HARD.includes(kinds[i]) && HARD.includes(kinds[j])) count++;
    }
  }
  return count;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  const seen = new Set<string>();
  items.forEach((item, i) => {
    for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) {
      const perm = [item, ...rest];
      const key = JSON.stringify(perm);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(perm);
      }
    }
  });
  return result;
}

export function weeklyKinds(days: number, speedPossible: boolean, emphasis: { run: boolean; sdc: boolean }): SessionKind[] {
  const speed: SessionKind = speedPossible ? "speed" : "conditioning";
  if (days === 2) return ["strength", emphasis.sdc && !emphasis.run ? speed : "endurance"];
  if (days === 3) return ["strength", speed, "endurance"];
  if (days === 4) return ["strength", speed, "strength", "endurance"];
  return ["strength", speed, "recovery", "strength", "endurance"];
}

export function assignKinds(days: WeekdayId[], kinds: SessionKind[]): { kinds: SessionKind[]; notes: string[] } {
  const ordered = [...days].sort((a, b) => weekIndex(a) - weekIndex(b));
  let best = kinds;
  let bestScore = Infinity;
  for (const perm of permutations(kinds)) {
    const score = hardConflicts(ordered, perm);
    if (score < bestScore) {
      best = perm;
      bestScore = score;
    }
  }
  const notes: string[] = [];
  const result = [...best];
  while (hardConflicts(ordered, result) > 0) {
    // Replace the later hard session of the first conflicting pair with a recovery session.
    let replaced = false;
    for (let i = 0; i < ordered.length && !replaced; i++) {
      for (let j = i + 1; j < ordered.length && !replaced; j++) {
        if (adjacent(ordered[i], ordered[j]) && HARD.includes(result[i]) && HARD.includes(result[j])) {
          notes.push(`${weekdayLabels[ordered[j]]} is the day after another hard session, so it is a recovery session instead of ${result[j]}.`);
          result[j] = "recovery";
          replaced = true;
        }
      }
    }
  }
  return { kinds: result, notes };
}

// ---------------------------------------------------------------------------
// Validation and screening
// ---------------------------------------------------------------------------

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function validatePreferences(prefs: Preferences, startDate: string): string[] {
  const errors: string[] = [];
  if (![2, 3, 4, 5].includes(prefs.daysPerWeek)) errors.push("Choose 2 to 5 training days per week.");
  if (new Set(prefs.weekdays).size !== prefs.weekdays.length || prefs.weekdays.some((d) => !WEEKDAYS.includes(d)))
    errors.push("Choose each weekday only once.");
  if (prefs.weekdays.length !== prefs.daysPerWeek) errors.push(`Choose exactly ${prefs.daysPerWeek} weekdays.`);
  if (![30, 45, 60].includes(prefs.sessionMinutes)) errors.push("Choose a session length of 30, 45, or 60 minutes.");
  if (!["new", "some", "regular"].includes(prefs.experience)) errors.push("Choose your current training experience.");
  if (!(prefs.recentRunning in runningLimits)) errors.push("Choose your recent running volume.");
  if (!isDate(startDate)) errors.push("Choose a valid start date.");
  if (prefs.nextAftDate !== undefined) {
    if (!isDate(prefs.nextAftDate)) errors.push("Enter a valid AFT date.");
    else if (isDate(startDate) && prefs.nextAftDate < startDate) errors.push("Your next AFT date is before the plan starts.");
  }
  if (prefs.targetScore !== undefined && (!Number.isInteger(prefs.targetScore) || prefs.targetScore < 0 || prefs.targetScore > 500))
    errors.push("Target score must be a whole number from 0 to 500.");
  return errors;
}

export const PAIN_MESSAGE =
  "Because you reported pain that limits exercise, or that you have been told not to train, RuckOn will not create a plan. Talk to a medical provider or your unit's H2F team before training. RuckOn does not give rehabilitation advice.";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): WeekdayId {
  const js = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return WEEKDAYS[(js + 6) % 7];
}

// Date of a session: the first matching weekday within the session's plan week.
export function defaultSessionDate(startDate: string, week: number, weekday: WeekdayId): string {
  const windowStart = addDays(startDate, (week - 1) * 7);
  for (let i = 0; i < 7; i++) {
    const date = addDays(windowStart, i);
    if (weekdayOf(date) === weekday) return date;
  }
  return windowStart;
}

export function weekWindow(startDate: string, week: number): { from: string; to: string } {
  const from = addDays(startDate, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

export function generatePlan(input: {
  baseline: BaselineSnapshot | null;
  prefs: Preferences;
  screening: Screening;
  startDate: string;
}): PlanOutcome {
  const { baseline, prefs, screening, startDate } = input;
  if (!baseline) return { status: "invalid", errors: ["Choose a saved AFT result to use as your baseline."] };
  if (screening.currentPain === null) return { status: "invalid", errors: ["Answer the question about current pain."] };
  if (screening.currentPain) return { status: "paused", message: PAIN_MESSAGE };
  if (screening.otherInstructions.trim()) {
    return {
      status: "needs-review",
      reasons: [
        "You entered instructions or restrictions that RuckOn cannot interpret. RuckOn does not read medical profiles or written restrictions.",
        "Share your AFT result and your instructions with your provider or unit H2F team. If the checkboxes above fully cover your instructions, select them and clear the text box.",
      ],
    };
  }
  const errors = validatePreferences(prefs, startDate);
  if (errors.length) return { status: "invalid", errors };

  const restrictions = new Set(prefs.restrictions);
  if (restrictions.size === 4) {
    return {
      status: "not-possible",
      reasons: [
        "With running, jumping, loaded lifting, and weight on the hands all excluded, the available templates cannot train most AFT events in a meaningful way. Ask your provider or H2F team for a program that fits your restrictions.",
      ],
    };
  }

  const { analysis, summary } = analyzeBaseline(baseline);
  const roles = Object.fromEntries(analysis.map((a) => [a.event, a.role])) as Record<AftEventCode, "develop" | "maintain">;
  const ctx: Ctx = {
    prefs,
    restrictions,
    baseline,
    roles,
    runAllowed: !restrictions.has("no-running") && prefs.runningAccess,
    hasRunningBase: prefs.recentRunning !== "none",
    limitations: new Set(),
    assumptions: new Set([ASSUMPTIONS.focus, ASSUMPTIONS.scheduling, ASSUMPTIONS.progressionGate, ASSUMPTIONS.durations, ASSUMPTIONS.reassessment, ASSUMPTIONS.screening]),
  };

  const develop = analysis.filter((a) => a.role === "develop").map((a) => a.event);
  if (develop.length > 0 && develop.every((e) => e === "HRP") && restrictions.has("no-weight-on-hands")) {
    return {
      status: "not-possible",
      reasons: ["Your development focus is the hand-release push-up, and you asked to avoid weight on your hands. The library has no substitute; ask your provider or H2F team."],
    };
  }

  // Running and sprint limitations.
  const runLimits = runningLimits[prefs.recentRunning];
  const speedPossible = ctx.runAllowed && ctx.hasRunningBase;
  if (!ctx.runAllowed) {
    const why = restrictions.has("no-running") ? "you asked to avoid running" : "you do not have a place to run";
    if (roles["2MR"] === "develop" || roles.SDC === "develop") ctx.limitations.add(`Running events: ${why}, so the plan uses walking and conditioning drills. They cannot fully train the 2-mile run or the sprint-drag-carry.`);
  } else if (!ctx.hasRunningBase) {
    ctx.limitations.add(
      "Running: you reported no recent running. RuckOn does not start a running progression without that baseline, so the plan uses walking and non-sprint drills. Ask a coach or your H2F team how to return to running."
    );
  }

  const planned = weeklyKinds(prefs.daysPerWeek, speedPossible, { run: roles["2MR"] === "develop", sdc: roles.SDC === "develop" });
  const { kinds, notes } = assignKinds(prefs.weekdays, planned);
  const days = [...prefs.weekdays].sort((a, b) => weekIndex(a) - weekIndex(b));

  // Split the weekly running allowance across endurance sessions.
  const enduranceCount = kinds.filter((k) => k === "endurance").length;
  const speedCount = kinds.filter((k) => k === "speed").length;
  let runMinutes = 0;
  if (speedPossible && enduranceCount > 0) {
    const sprintMinutes = speedCount * (4 + 1); // up to 6 × 30 s of sprinting plus the Shuttle Sprint, rounded up
    const available = Math.max(0, runLimits.perWeek - sprintMinutes);
    runMinutes = Math.min(runLimits.perRun, Math.floor(available / enduranceCount));
    if (runMinutes < runLimits.perRun) ctx.limitations.add(`Running: each run is limited to ${runMinutes} minutes so your weekly running stays within what you reported.`);
  }

  // One body per weekly slot; repeated strength sessions rotate their development blocks.
  const seen: Partial<Record<SessionKind, number>> = {};
  const bodies = kinds.map((kind) => {
    const variant = seen[kind] ?? 0;
    seen[kind] = variant + 1;
    return buildSession(kind, ctx, runMinutes, variant);
  });
  const included = new Set(bodies.flatMap((b) => b.main.map((block) => block.title)));
  for (const title of new Set(bodies.flatMap((b) => b.skipped))) {
    if (!included.has(title)) ctx.limitations.add(`${title} does not fit in a ${prefs.sessionMinutes}-minute session with your other priorities; longer sessions would allow it.`);
  }

  const sessions: PlanSession[] = [];
  for (let week = 1; week <= 4; week++) {
    days.forEach((weekday, i) => {
      const body = bodies[i];
      const all = [...body.warmUp, ...body.main, ...body.recovery];
      const repeat = kinds.slice(0, i).filter((k) => k === kinds[i]).length;
      sessions.push({
        id: `w${week}-s${i + 1}`,
        week,
        weekday,
        kind: kinds[i],
        title: kinds.filter((k) => k === kinds[i]).length > 1 ? `${body.title} (${String.fromCharCode(65 + repeat)})` : body.title,
        purpose: body.purpose,
        estimatedMinutes: all.reduce((sum, b) => sum + b.minutes, 0),
        warmUp: body.warmUp,
        main: body.main,
        recovery: body.recovery,
      });
    });
  }

  for (const session of sessions) {
    for (const block of [...session.warmUp, ...session.main, ...session.recovery]) block.assumptions.forEach((a) => ctx.assumptions.add(a));
  }

  const weeklyRunningMinutes = kinds.reduce((sum, kind) => {
    if (kind === "endurance" && speedPossible) return sum + runMinutes;
    if (kind === "speed") return sum + 5;
    return sum;
  }, 0);

  if (prefs.targetScore !== undefined) {
    const total = baseline.result.total;
    summary.push(
      prefs.targetScore > total
        ? `Your target is ${prefs.targetScore} points, ${prefs.targetScore - total} above your baseline of ${total}. RuckOn does not predict score changes.`
        : `Your baseline of ${total} already meets your target of ${prefs.targetScore}.`
    );
  }

  let reassessment =
    "In week 5, record a practice AFT with a trained grader and create a new plan from that result. Army program design relies on follow-up assessments.";
  if (prefs.nextAftDate) {
    const planEnd = addDays(startDate, 27);
    if (prefs.nextAftDate <= planEnd) {
      const week = Math.floor((Date.parse(prefs.nextAftDate) - Date.parse(startDate)) / (7 * 86400000)) + 1;
      reassessment = `Your AFT on ${prefs.nextAftDate} falls in week ${week}. Keep the one or two days before it light or restful (the Army tests after recovery or a taper), and create a new plan from your new result afterward.`;
    } else {
      reassessment = `The plan ends before your AFT on ${prefs.nextAftDate}. In week 5, record a practice AFT with a trained grader and create a new plan from that result.`;
    }
  }

  const plan: PlanDraft = {
    templateVersion: TEMPLATE_VERSION,
    baseline,
    preferences: prefs,
    analysis,
    focusSummary: summary,
    limitations: Array.from(ctx.limitations),
    scheduleNotes: notes,
    assumptions: Array.from(ctx.assumptions),
    reassessment,
    weeklyRunningMinutes,
    sessions,
  };
  return { status: "ready", plan };
}

export const SOURCES_FOR_PLAN = [S.sessionOrder, S.week, S.progression, S.design, S.strengthOrder];
