// Builds the synthetic AFT calculator test dataset from an independent transcription of the official score tables.
//
// Independence: expected points come from docs/testing/source/AFT_Scoring_Scales_250601.txt (text extracted from
// public/docs/AFT_Scoring_Scales_250601.pdf with scripts/aft-fixtures/extract-pdf-text.swift) and the lookup below.
// Nothing here imports lib/aft/scoring.ts or lib/aft/standards.ts. The lookup also uses a different method from the
// app: it precomputes the points for every possible raw value instead of scanning table rows.
//
// Usage: node scripts/aft-fixtures/generate.mjs
// Writes lib/aft/fixtures/score-tables.reference.json, lib/aft/fixtures/aft-calculator-cases.json,
// docs/testing/aft-calculator-cases.csv, and docs/testing/aft-calculator-coverage.md.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SOURCE = path.join(ROOT, "docs/testing/source/AFT_Scoring_Scales_250601.txt");

// ---------------------------------------------------------------------------
// 1. Transcribe the score tables from the PDF text
// ---------------------------------------------------------------------------

const EVENTS = ["MDL", "HRP", "SDC", "PLK", "2MR"];
const PAGE_EVENT = [
  [/Max Deadlift \(MDL\)/, "MDL"],
  [/Hand-release Push-up \(HRP\)/, "HRP"],
  [/Sprint \/ Drag \/ Carry/, "SDC"],
  [/Plank \(PLK\)/, "PLK"],
  [/Two-Mile Run \(2MR\)/, "2MR"],
];
const HIGHER_IS_BETTER = { MDL: true, HRP: true, SDC: false, PLK: true, "2MR": false };
const UNIT = { MDL: "lb", HRP: "reps", SDC: "time", PLK: "time", "2MR": "time" };

const text = fs.readFileSync(SOURCE, "utf8");
const pages = text.split(/=== PAGE (\d+)\n/).slice(1);
const toValue = (token) => (token === "---" ? null : token.includes(":") ? Number(token.split(":")[0]) * 60 + Number(token.split(":")[1]) : Number(token));

// Column order on every table page, from the header line "17-21 22-26 ... Over 62".
let groupHeaders = null;
const tables = {}; // event -> group -> column -> [[points, value], ...] (value null = "---")
const pageOf = {};
for (let i = 0; i < pages.length; i += 2) {
  const pageNo = Number(pages[i]);
  const body = pages[i + 1];
  const match = PAGE_EVENT.find(([re]) => re.test(body));
  if (!match) continue; // page 9: alternate events (go/no-go), not supported by the calculator
  const event = match[1];
  (pageOf[event] ??= []).push(pageNo);
  const header = body.split("\n").find((l) => /^17-21 22-26 .*Over 62$/.test(l.trim()));
  if (header) groupHeaders ??= header.trim().replace("Over 62", "Over-62").split(/\s+/).map((g) => g.replace("Over-62", "Over 62"));
  for (const line of body.split("\n")) {
    const t = line.trim().split(/\s+/);
    if (t.length !== 22 || !/^\d+$/.test(t[0]) || t[0] !== t[21]) continue;
    const points = Number(t[0]);
    for (let g = 0; g < 10; g++) {
      for (const [k, col] of [[1, "M"], [2, "F"]]) {
        const list = ((tables[event] ??= {})[g] ??= { M: [], F: [] })[col];
        const value = toValue(t[k + g * 2]);
        const existing = list.find(([p]) => p === points);
        // A table split across two pages repeats its boundary row (e.g. SDC 60 points on pp. 3 and 4).
        if (existing) {
          if (existing[1] !== value) throw new Error(`${event} ${points} points printed twice with different values`);
          continue;
        }
        list.push([points, value]);
      }
    }
  }
}
if (!groupHeaders || groupHeaders.length !== 10) throw new Error("Could not read the age-group header");

// Map the PDF's group labels to the app's labels ("Over 62" is shown as "62+"; see the coverage report).
const GROUPS = groupHeaders.map((h) => (h === "Over 62" ? "62+" : h));
const groupRange = groupHeaders.map((h) => (h === "Over 62" ? [62, Infinity] : h.split("-").map(Number)));

// Sanity checks on the transcription: every column runs from 100 to 0 with strictly ordered values.
for (const event of EVENTS) {
  for (let g = 0; g < 10; g++) {
    for (const col of ["M", "F"]) {
      const rows = tables[event][g][col].filter(([, v]) => v !== null).sort((a, b) => b[0] - a[0]);
      if (rows[0][0] !== 100 || rows.at(-1)[0] !== 0) throw new Error(`${event} ${GROUPS[g]} ${col}: missing 100 or 0 row`);
      for (let k = 1; k < rows.length; k++) {
        const ok = HIGHER_IS_BETTER[event] ? rows[k][1] < rows[k - 1][1] : rows[k][1] > rows[k - 1][1];
        if (!ok) throw new Error(`${event} ${GROUPS[g]} ${col}: values out of order at ${rows[k][0]} points`);
      }
    }
  }
}

const reference = {
  source: "Army Fitness Test Score Tables, AFT_Scoring_Scales_250601.pdf (approved 15 May 2025, effective 1 June 2025)",
  transcribedFrom: "docs/testing/source/AFT_Scoring_Scales_250601.txt",
  note: "Values are minimums for MDL, HRP, and PLK and maximums (seconds) for SDC and 2MR. null = '---' in the table.",
  pages: pageOf,
  groups: GROUPS,
  tables: Object.fromEntries(
    EVENTS.map((e) => [e, Object.fromEntries(GROUPS.map((g, gi) => [g, { M: tables[e][gi].M.filter(([, v]) => v !== null), F: tables[e][gi].F.filter(([, v]) => v !== null) }]))])
  ),
};

// ---------------------------------------------------------------------------
// 2. Independent oracle: precomputed points for every raw value
// ---------------------------------------------------------------------------

const MAX_RAW = { MDL: 1000, HRP: 300, SDC: 99 * 60 + 59, PLK: 99 * 60 + 59, "2MR": 99 * 60 + 59 };
const oracleCache = new Map();
function pointsArray(event, group, col) {
  const key = `${event}|${group}|${col}`;
  if (oracleCache.has(key)) return oracleCache.get(key);
  const rows = reference.tables[event][group][col];
  const arr = new Array(MAX_RAW[event] + 1).fill(0);
  if (HIGHER_IS_BETTER[event]) {
    // Walk raw values upward; the score is the highest-points row whose minimum has been reached.
    const asc = [...rows].sort((a, b) => a[1] - b[1]);
    let pts = 0;
    let k = 0;
    for (let raw = 0; raw <= MAX_RAW[event]; raw++) {
      while (k < asc.length && raw >= asc[k][1]) pts = Math.max(pts, asc[k++][0]);
      arr[raw] = pts;
    }
  } else {
    // Walk times downward from the slowest; the score is the highest-points row whose maximum time is met.
    const desc = [...rows].sort((a, b) => b[1] - a[1]);
    let pts = 0;
    let k = 0;
    for (let raw = MAX_RAW[event]; raw >= 0; raw--) {
      while (k < desc.length && raw <= desc[k][1]) pts = Math.max(pts, desc[k++][0]);
      arr[raw] = pts;
    }
  }
  oracleCache.set(key, arr);
  return arr;
}
const oracle = (event, group, col, raw) => pointsArray(event, group, col)[raw];
const rowValue = (event, group, col, pts) => reference.tables[event][group][col].find(([p]) => p === pts)?.[1] ?? null;
const available = (event, group, col) => reference.tables[event][group][col].map(([p]) => p);

const groupForAge = (age) => GROUPS[groupRange.findIndex(([lo, hi]) => age >= lo && age <= hi)];

// ---------------------------------------------------------------------------
// 3. Rules (pass/fail) and sources
// ---------------------------------------------------------------------------

const RULES = {
  general: { minEvent: 60, minTotal: 300, label: "General" },
  combat: { minEvent: 60, minTotal: 350, label: "Combat" },
};
const EVENT_NAME = { MDL: "3-Rep Max Deadlift", HRP: "Hand-Release Push-Up", SDC: "Sprint-Drag-Carry", PLK: "Plank", "2MR": "2-Mile Run" };
const STANDARD_VERSION = "AFT Score Tables approved 15 May 2025, effective 1 June 2025";
const pageRef = (e) => `${e} table p. ${pageOf[e].join("–")}`;
const RULE_SOURCES = {
  general:
    "General standard: at least 60 points per event (ATP 7-22.01, 12 Mar 2026, para. 2-30, p. 23). The app also applies a 300 total from army.mil (21 Apr 2025); with every event at 60 or more the total is always at least 300.",
  combat: "Combat standard: sex-neutral (Male | Combat column), at least 60 points per event and 350 total (ATP 7-22.01, 12 Mar 2026, para. 2-30, p. 23).",
};

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const display = (event, raw) => (UNIT[event] === "time" ? mmss(raw) : `${raw} ${UNIT[event]}`);

let seq = 0;
const cases = [];
function addCase({ scenario, description, age, sex, standard, raw }) {
  const group = groupForAge(age);
  const col = standard === "combat" ? "M" : sex;
  const rule = RULES[standard];
  const points = Object.fromEntries(EVENTS.map((e) => [e, oracle(e, group, col, raw[e])]));
  const total = EVENTS.reduce((s, e) => s + points[e], 0);
  const reasons = [
    ...EVENTS.filter((e) => points[e] < rule.minEvent).map((e) => ({ kind: "event", event: e, points: points[e], text: `${EVENT_NAME[e]} is below ${rule.minEvent} points (${points[e]}).` })),
    ...(total < rule.minTotal ? [{ kind: "total", total, threshold: rule.minTotal, text: `Total is below ${rule.minTotal} points (${total}).` }] : []),
  ];
  seq += 1;
  const id = `AFT-${String(seq).padStart(4, "0")}`;
  cases.push({
    id,
    label: `Test Soldier ${String(seq).padStart(3, "0")}`,
    status: "valid",
    scenario,
    description,
    age,
    ageGroup: group,
    sex,
    standard,
    scoreColumn: col === "M" ? "Male | Combat" : "Female",
    standardVersion: STANDARD_VERSION,
    raw,
    rawDisplay: Object.fromEntries(EVENTS.map((e) => [e, display(e, raw[e])])),
    expected: { points, total, passed: reasons.length === 0, failReasons: reasons },
    sources: [...EVENTS.map(pageRef), `Age group ${group}, ${col === "M" ? "M | C" : "F"} column`, RULE_SOURCES[standard]],
  });
}
function addImpossible({ scenario, description, sex, standard, ageGroup, reason }) {
  seq += 1;
  cases.push({ id: `AFT-${String(seq).padStart(4, "0")}`, label: null, status: "impossible", scenario, description, ageGroup, sex, standard, reason });
}

// Raw value that earns exactly `pts` (the row's own threshold).
const rawAt = (e, g, col, pts) => {
  const v = rowValue(e, g, col, pts);
  if (v === null) throw new Error(`${e} ${g} ${col} has no ${pts}-point row`);
  return v;
};
// Closest listed points to a target, optionally within [min, max].
const nearest = (e, g, col, target, min = 0, max = 100) =>
  available(e, g, col)
    .filter((p) => p >= min && p <= max)
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || b - a)[0];
// Highest listed points below 60 (the table lists 50 for every column).
const belowMin = (e, g, col) => available(e, g, col).filter((p) => p < 60).sort((a, b) => b - a)[0];

// Five event point values, each listed for its column and each >= 60, summing to `sum`, as even as possible.
function findSum(g, col, sum) {
  const opts = EVENTS.map((e) => available(e, g, col).filter((p) => p >= 60).sort((a, b) => a - b));
  const target = sum / 5;
  let best = null;
  const pick = [];
  const dfs = (i, acc) => {
    if (i === 5) {
      if (acc !== sum) return;
      const spread = pick.reduce((s, p) => s + Math.abs(p - target), 0);
      if (!best || spread < best.spread) best = { spread, pts: [...pick] };
      return;
    }
    const remaining = 4 - i;
    for (const p of opts[i]) {
      const next = acc + p;
      if (next + remaining * 60 > sum) break;
      if (next + remaining * 100 < sum) continue;
      pick.push(p);
      dfs(i + 1, next);
      pick.pop();
    }
  };
  dfs(0, 0);
  return best?.pts ?? null;
}

// ---------------------------------------------------------------------------
// 4. Scenarios for every age group x sex x standard
// ---------------------------------------------------------------------------

const COMBOS = [];
for (let gi = 0; gi < GROUPS.length; gi++) {
  for (const standard of ["general", "combat"]) {
    for (const sex of ["M", "F"]) COMBOS.push({ g: GROUPS[gi], age: groupRange[gi][0] + (gi === 9 ? 3 : 2), sex, standard });
  }
}

for (const { g, age, sex, standard } of COMBOS) {
  const col = standard === "combat" ? "M" : sex;
  const threshold = RULES[standard].minTotal;
  const at = (pts) => Object.fromEntries(EVENTS.map((e) => [e, rawAt(e, g, col, pts)]));
  const ctx = `${g}, ${sex === "M" ? "male" : "female"}, ${RULES[standard].label}`;
  const mixed = { MDL: 80, HRP: 72, SDC: 76, PLK: 85, "2MR": 68 };
  const mixedRaw = Object.fromEntries(EVENTS.map((e) => [e, rawAt(e, g, col, nearest(e, g, col, mixed[e], 60))]));
  const strongRaw = (target) => Object.fromEntries(EVENTS.map((e) => [e, rawAt(e, g, col, nearest(e, g, col, target, 60))]));

  addCase({ scenario: "S1-all-minimum", description: `All five events at the 60-point row (${ctx}).`, age, sex, standard, raw: at(60) });
  addCase({ scenario: "S2-all-maximum", description: `All five events at the 100-point row (${ctx}).`, age, sex, standard, raw: at(100) });
  addCase({ scenario: "S3-typical-mixed", description: `Mixed passing performance (${ctx}).`, age, sex, standard, raw: mixedRaw });
  for (const e of EVENTS) {
    const raw = { ...strongRaw(80), [e]: rawAt(e, g, col, belowMin(e, g, col)) };
    addCase({ scenario: `S4-one-fail-${e}`, description: `Only ${EVENT_NAME[e]} below 60 points (${ctx}).`, age, sex, standard, raw });
  }
  addCase({
    scenario: "S5-multiple-fail",
    description: `Deadlift and 2-mile run at 50 points, push-ups at 40, others passing (${ctx}).`,
    age,
    sex,
    standard,
    raw: { ...strongRaw(80), MDL: rawAt("MDL", g, col, 50), "2MR": rawAt("2MR", g, col, 50), HRP: rawAt("HRP", g, col, 40) },
  });
  addCase({ scenario: "S6-all-below-minimum", description: `All five events at the 50-point row (${ctx}).`, age, sex, standard, raw: at(50) });

  const exact = findSum(g, col, threshold);
  if (exact) {
    addCase({
      scenario: "S7-total-at-threshold",
      description: `Every event passes and the total equals the ${threshold}-point threshold (${ctx}).`,
      age,
      sex,
      standard,
      raw: Object.fromEntries(EVENTS.map((e, i) => [e, rawAt(e, g, col, exact[i])])),
    });
  } else {
    addImpossible({ scenario: "S7-total-at-threshold", description: `Total exactly ${threshold} with every event passing (${ctx}).`, sex, standard, ageGroup: g, reason: "No combination of listed points sums to the threshold." });
  }

  if (threshold <= 300) {
    addImpossible({
      scenario: "S8-total-just-below-threshold",
      description: `Total just below ${threshold} with every event passing (${ctx}).`,
      sex,
      standard,
      ageGroup: g,
      reason: "Impossible: five events of at least 60 points always total at least 300.",
    });
  } else {
    let below = null;
    let belowSum = null;
    for (let s = threshold - 1; s >= 300 && !below; s--) {
      below = findSum(g, col, s);
      belowSum = s;
    }
    addCase({
      scenario: "S8-total-just-below-threshold",
      description: `Every event passes but the total is ${belowSum}, ${threshold - belowSum} below the ${threshold} threshold (${ctx}).`,
      age,
      sex,
      standard,
      raw: Object.fromEntries(EVENTS.map((e, i) => [e, rawAt(e, g, col, below[i])])),
    });
  }

  addCase({
    scenario: "S9-total-above-but-event-fails",
    description: `Four events at 100 points and the deadlift at 50: total above ${threshold} but one event fails (${ctx}).`,
    age,
    sex,
    standard,
    raw: { ...at(100), MDL: rawAt("MDL", g, col, 50) },
  });
}

// ---------------------------------------------------------------------------
// 5. Age boundaries: same raw results at ages on each side of every group boundary
// ---------------------------------------------------------------------------

const BOUNDARY_AGES = [17, 21, 22, 26, 27, 31, 32, 36, 37, 41, 42, 46, 47, 51, 52, 56, 57, 61, 62, 99];
// A fixed performance whose points change across age groups.
const AGE_PROBE = { MDL: 200, HRP: 35, SDC: 2 * 60 + 10, PLK: 2 * 60 + 30, "2MR": 18 * 60 + 30 };
for (const age of BOUNDARY_AGES) {
  for (const [standard, sex] of [["general", "M"], ["general", "F"], ["combat", "F"]]) {
    addCase({
      scenario: "B-age-boundary",
      description: `Age ${age}${age === 17 ? " (minimum supported)" : age === 99 ? " (maximum accepted by the calculator)" : ""}: the same results scored in age group ${groupForAge(age)}.`,
      age,
      sex,
      standard,
      raw: AGE_PROBE,
    });
  }
}

// ---------------------------------------------------------------------------
// 6. Single-event boundaries: around 60 and 100 points, deadlift increments, beyond the tables
// ---------------------------------------------------------------------------

const eventCases = [];
let eseq = 0;
function addEventCase(e, g, col, raw, note) {
  eseq += 1;
  eventCases.push({ id: `EVT-${String(eseq).padStart(4, "0")}`, event: e, ageGroup: g, column: col, raw, rawDisplay: display(e, raw), expectedPoints: oracle(e, g, col, raw), note, source: `${pageRef(e)}, age group ${g}, ${col === "M" ? "M | C" : "F"} column` });
}
for (const e of EVENTS) {
  for (const g of GROUPS) {
    for (const col of ["M", "F"]) {
      for (const pts of [60, 100]) {
        const v = rawAt(e, g, col, pts);
        const worse = HIGHER_IS_BETTER[e] ? -1 : 1;
        addEventCase(e, g, col, v + worse, `1 ${UNIT[e] === "time" ? "second" : UNIT[e]} short of the ${pts}-point row`);
        addEventCase(e, g, col, v, `exactly the ${pts}-point row`);
        addEventCase(e, g, col, v - worse, `1 ${UNIT[e] === "time" ? "second" : UNIT[e]} better than the ${pts}-point row`);
        if (e === "MDL") addEventCase(e, g, col, v - 10, `one 10-lb increment below the ${pts}-point row`);
      }
      // Beyond the published limits.
      const best = HIGHER_IS_BETTER[e] ? MAX_RAW[e] : 1;
      const worst = HIGHER_IS_BETTER[e] ? 0 : MAX_RAW[e];
      addEventCase(e, g, col, best, "far better than the 100-point row (beyond the table)");
      addEventCase(e, g, col, worst, HIGHER_IS_BETTER[e] ? "zero, below the 0-point row" : "slowest time the calculator accepts, beyond the 0-point row");
      const zeroRow = rawAt(e, g, col, 0);
      addEventCase(e, g, col, zeroRow, "exactly the 0-point row");
    }
  }
}
// Deadlift weights between 10-lb rows: the table lists 10-lb steps; weights in between earn the highest row met.
for (const w of [150, 151, 155, 159, 160, 161, 335, 339, 340, 345, 350, 360]) addEventCase("MDL", "17-21", "M", w, "deadlift weight between or beyond 10-lb table rows");

// ---------------------------------------------------------------------------
// 7. Time conversion and validation
// ---------------------------------------------------------------------------

const timeCases = [1, 59, 60, 61, 119, 125, 600, 3599, 3600, 5999].map((s) => ({ seconds: s, display: mmss(s), minutes: String(Math.floor(s / 60)), secondsPart: String(s % 60).padStart(2, "0") }));

// Validation expectations come from the calculator's stated requirements: age a whole number 17–99; standard
// general or combat; sex required for the general standard only; deadlift 0–1000 and push-ups 0–300 whole numbers
// (0 is a valid result worth 0 points); times need both minutes (0–99) and seconds (0–59) as whole numbers and must
// be above 0:00; blanks are never treated as zero; test date optional, valid, and not in the future.
const base = {
  testDate: "",
  age: "25",
  standard: "general",
  gender: "M",
  deadlift: "200",
  pushups: "35",
  sdcMinutes: "2",
  sdcSeconds: "05",
  plankMinutes: "3",
  plankSeconds: "00",
  runMinutes: "17",
  runSeconds: "30",
};
const v = (id, description, changes, ok, errorFields = [], extra = {}) => ({ id, description, values: { ...base, ...changes }, today: "2026-10-03", expectedOk: ok, expectedErrorFields: errorFields, ...extra });
const validationCases = [
  v("VAL-001", "Complete valid form", {}, true, [], { expectedRaw: { MDL: 200, HRP: 35, SDC: 125, PLK: 180, "2MR": 1050 } }),
  v("VAL-002", "All fields empty", { age: "", gender: "", deadlift: "", pushups: "", sdcMinutes: "", sdcSeconds: "", plankMinutes: "", plankSeconds: "", runMinutes: "", runSeconds: "" }, false, ["age", "gender", "deadlift", "pushups", "sdc", "plank", "run"]),
  v("VAL-003", "Whitespace-only age and deadlift are treated as empty", { age: "   ", deadlift: "  " }, false, ["age", "deadlift"]),
  v("VAL-004", "Surrounding whitespace is trimmed", { age: " 25 ", deadlift: " 200 " }, true),
  v("VAL-005", "Deadlift 0 is a valid result (0 points)", { deadlift: "0" }, true, [], { expectedRaw: { MDL: 0 } }),
  v("VAL-006", "Push-ups 0 is a valid result (0 points)", { pushups: "0" }, true, [], { expectedRaw: { HRP: 0 } }),
  v("VAL-007", "Negative deadlift", { deadlift: "-5" }, false, ["deadlift"]),
  v("VAL-008", "Decimal push-ups", { pushups: "12.5" }, false, ["pushups"]),
  v("VAL-009", "Nonnumeric deadlift", { deadlift: "abc" }, false, ["deadlift"]),
  v("VAL-010", "Plus sign is not accepted", { pushups: "+35" }, false, ["pushups"]),
  v("VAL-011", "Exponent notation is not accepted", { deadlift: "2e2" }, false, ["deadlift"]),
  v("VAL-012", "Comma thousands separator is not accepted", { deadlift: "1,000" }, false, ["deadlift"]),
  v("VAL-013", "Full-width digits are not accepted", { age: "２５" }, false, ["age"]),
  v("VAL-014", "Leading zeros are accepted", { deadlift: "0200", pushups: "035" }, true, [], { expectedRaw: { MDL: 200, HRP: 35 } }),
  v("VAL-015", "Age 16, below the minimum", { age: "16" }, false, ["age"]),
  v("VAL-016", "Age 17, the minimum", { age: "17" }, true),
  v("VAL-017", "Age 99, the maximum", { age: "99" }, true),
  v("VAL-018", "Age 100, above the maximum", { age: "100" }, false, ["age"]),
  v("VAL-019", "Decimal age", { age: "25.5" }, false, ["age"]),
  v("VAL-020", "Age 0", { age: "0" }, false, ["age"]),
  v("VAL-021", "Missing sex with the general standard", { gender: "" }, false, ["gender"]),
  v("VAL-022", "Missing sex with the combat standard is allowed", { standard: "combat", gender: "" }, true),
  v("VAL-023", "Unsupported standard", { standard: "elite" }, false, ["standard"]),
  v("VAL-024", "Seconds of 60", { sdcSeconds: "60" }, false, ["sdc"]),
  v("VAL-025", "Seconds of 75", { runSeconds: "75" }, false, ["run"]),
  v("VAL-026", "Minutes of 100", { runMinutes: "100" }, false, ["run"]),
  v("VAL-027", "Time of 0:00", { plankMinutes: "0", plankSeconds: "00" }, false, ["plank"]),
  v("VAL-028", "0 minutes and 45 seconds is valid", { plankMinutes: "0", plankSeconds: "45" }, true, [], { expectedRaw: { PLK: 45 } }),
  v("VAL-029", "Seconds without minutes", { sdcMinutes: "", sdcSeconds: "45" }, false, ["sdc"]),
  v("VAL-030", "Minutes without seconds", { runMinutes: "17", runSeconds: "" }, false, ["run"]),
  v("VAL-031", "Single-digit seconds are accepted", { sdcMinutes: "2", sdcSeconds: "5" }, true, [], { expectedRaw: { SDC: 125 } }),
  v("VAL-032", "Negative seconds", { sdcSeconds: "-5" }, false, ["sdc"]),
  v("VAL-033", "Decimal seconds", { plankSeconds: "30.5" }, false, ["plank"]),
  v("VAL-034", "Colon time typed into the minutes box", { runMinutes: "17:30", runSeconds: "00" }, false, ["run"]),
  v("VAL-035", "Deadlift 1000, the maximum", { deadlift: "1000" }, true),
  v("VAL-036", "Deadlift 1001, above the maximum", { deadlift: "1001" }, false, ["deadlift"]),
  v("VAL-037", "Push-ups 300, the maximum", { pushups: "300" }, true),
  v("VAL-038", "Push-ups 301, above the maximum", { pushups: "301" }, false, ["pushups"]),
  v("VAL-039", "Extremely large number", { deadlift: "99999999999999999999" }, false, ["deadlift"]),
  v("VAL-040", "Invalid calendar date", { testDate: "2026-02-30" }, false, ["testDate"]),
  v("VAL-041", "Future test date", { testDate: "2026-10-04" }, false, ["testDate"]),
  v("VAL-042", "Today's test date", { testDate: "2026-10-03" }, true),
  v("VAL-043", "Blank test date is allowed", { testDate: "" }, true),
];

// ---------------------------------------------------------------------------
// 8. Write outputs
// ---------------------------------------------------------------------------

const dataset = {
  generatedBy: "scripts/aft-fixtures/generate.mjs",
  standardVersion: STANDARD_VERSION,
  rules: RULES,
  sources: { tables: reference.source, rules: RULE_SOURCES },
  scoringCases: cases,
  eventCases,
  timeCases,
  validationCases,
};
fs.writeFileSync(path.join(ROOT, "lib/aft/fixtures/score-tables.reference.json"), JSON.stringify(reference) + "\n");
fs.writeFileSync(path.join(ROOT, "lib/aft/fixtures/aft-calculator-cases.json"), JSON.stringify(dataset) + "\n");

const csvEscape = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
const csvRows = [
  ["id", "label", "scenario", "age", "sex", "standard", "MDL (lb)", "HRP (reps)", "SDC (m:ss)", "PLK (m:ss)", "2MR (m:ss)", "MDL pts", "HRP pts", "SDC pts", "PLK pts", "2MR pts", "total", "result", "reasons", "description"],
];
for (const c of cases.filter((c) => c.status === "valid")) {
  csvRows.push([
    c.id, c.label, c.scenario, c.age, c.sex, c.standard,
    c.raw.MDL, c.raw.HRP, c.rawDisplay.SDC, c.rawDisplay.PLK, c.rawDisplay["2MR"],
    ...EVENTS.map((e) => c.expected.points[e]), c.expected.total, c.expected.passed ? "Pass" : "Fail",
    c.expected.failReasons.map((r) => r.text).join(" "), c.description,
  ]);
}
fs.writeFileSync(path.join(ROOT, "docs/testing/aft-calculator-cases.csv"), csvRows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n");

// Coverage report
const valid = cases.filter((c) => c.status === "valid");
const impossible = cases.filter((c) => c.status === "impossible");
const scenarios = [...new Set(cases.map((c) => c.scenario))];
let md = `# AFT calculator test dataset: coverage\n\nGenerated by \`scripts/aft-fixtures/generate.mjs\` from an independent transcription of the official score tables (${reference.source}). Expected values do not use the app's scoring code or tables.\n\n`;
md += `| Set | Cases |\n|---|---|\n| Full-test scoring cases (valid) | ${valid.length} |\n| Scenarios marked impossible | ${impossible.length} |\n| Single-event boundary cases | ${eventCases.length} |\n| Time conversion round trips | ${timeCases.length} |\n| Input validation cases | ${validationCases.length} |\n\n`;
md += `## Scenario coverage by age group, sex, and standard\n\nEach cell is the number of cases for that combination (impossible scenarios shown as "n/a").\n\n`;
md += `| Age group | Sex | Standard | ${scenarios.filter((s) => s.startsWith("S")).join(" | ")} |\n|${"---|".repeat(3 + scenarios.filter((s) => s.startsWith("S")).length)}\n`;
for (const { g, sex, standard } of COMBOS) {
  const row = scenarios.filter((s) => s.startsWith("S")).map((s) => {
    const m = cases.filter((c) => c.ageGroup === g && c.sex === sex && c.standard === standard && c.scenario === s);
    return m.some((c) => c.status === "impossible") ? "n/a" : String(m.length);
  });
  md += `| ${g} | ${sex} | ${standard} | ${row.join(" | ")} |\n`;
}
md += `\nAge-boundary cases: ${cases.filter((c) => c.scenario === "B-age-boundary").length} (ages ${BOUNDARY_AGES.join(", ")}; general male, general female, and combat).\n\n`;
md += `## Impossible or inapplicable scenarios\n\n`;
const impossibleReasons = [...new Set(impossible.map((c) => `${c.scenario}: ${c.reason}`))];
for (const r of impossibleReasons) md += `- ${r} (${impossible.filter((c) => `${c.scenario}: ${c.reason}` === r).length} combinations)\n`;
const below349 = valid.filter((c) => c.scenario === "S8-total-just-below-threshold" && c.expected.total !== 349);
md += below349.length ? `- Combat totals of exactly 349 were not reachable for: ${below349.map((c) => `${c.ageGroup} (${c.expected.total})`).join(", ")}.\n` : `- Combat: a total of exactly 349 with every event passing was reachable for every age group.\n`;
md += `\n## Notes and gaps\n\n- The PDF labels the oldest group "Over 62"; the preceding group ends at 61, so ages 62 and older belong to "Over 62" (shown in the app as "62+").\n- The general standard requires 60 points per event (ATP 7-22.01 para. 2-30). The app also applies a 300 total from army.mil; it cannot change any outcome, so a general-standard total below 300 with every event passing is impossible.\n- Deadlift weights between the 10-lb rows earn the highest row met. The ATP loads the hex bar in 10-lb increments and does not define other weights.\n- Times are whole seconds; the tables and calculator do not use fractions of a second.\n- Not covered: the alternate aerobic events on page 9 (go/no-go), which the calculator does not support.\n`;
fs.writeFileSync(path.join(ROOT, "docs/testing/aft-calculator-coverage.md"), md);

console.log(`scoring cases: ${valid.length} valid, ${impossible.length} impossible; event cases: ${eventCases.length}; time: ${timeCases.length}; validation: ${validationCases.length}`);
