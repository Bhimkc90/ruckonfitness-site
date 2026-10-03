import { describe, expect, it } from "vitest";
import { scoreAft } from "@/lib/aft/scoring";
import type { AftInput, AftRawScores } from "@/lib/aft/types";
import { exercises } from "@/lib/library";
import { validScoringCases } from "@/lib/aft/fixtures";
import { buildExplainRequest, fingerprint, parseExplainRequest, type ExplainRequest } from "./request";
import { buildFacts } from "./facts";
import { REFERENCES, getReference } from "./references";
import { standardExplanation, validateAiOutput, checkText, READINESS_NOTE } from "./explanation";
import { INSTRUCTIONS, promptData } from "./prompt";

const RAW: AftRawScores = { MDL: 250, HRP: 40, SDC: 110, PLK: 150, "2MR": 990 };
const input = (raw: Partial<AftRawScores> = {}, extra: Partial<AftInput> = {}): AftInput => ({ age: 25, standard: "general", gender: "M", raw: { ...RAW, ...raw }, ...extra });
const req = (raw: Partial<AftRawScores> = {}, previous: Partial<AftRawScores> | null = null, extra: Partial<AftInput> = {}): ExplainRequest =>
  buildExplainRequest(scoreAft(input(raw, extra)), previous ? scoreAft(input(previous, extra)) : null);

describe("request: minimal payload", () => {
  it("contains only the scoring category and raw results", () => {
    const r = req({}, { MDL: 240 });
    expect(Object.keys(r).sort()).toEqual(["ageGroup", "column", "previousRaw", "raw", "standard", "v"]);
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/"age"|testDate|savedAt|"id"|name|birth|notes|points|total/i);
    expect(r.ageGroup).toBe("22-26");
    expect(text.length).toBeLessThan(300);
  });

  it("changes fingerprint when an entry, the category, or the comparable test changes", () => {
    const base = fingerprint(req());
    expect(fingerprint(req())).toBe(base);
    expect(fingerprint(req({ HRP: 41 }))).not.toBe(base);
    expect(fingerprint(req({}, null, { standard: "combat" }))).not.toBe(base);
    expect(fingerprint(req({}, { HRP: 30 }))).not.toBe(base);
  });

  it("round-trips through the strict parser", () => {
    const r = req({}, { MDL: 200 });
    expect(parseExplainRequest(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });

  it("rejects malformed and out-of-range requests", () => {
    const good = JSON.parse(JSON.stringify(req()));
    const bad: unknown[] = [
      null,
      [],
      "x",
      {},
      { ...good, v: 2 },
      { ...good, extra: 1 },
      { ...good, points: 500 },
      { ...good, standard: "elite" },
      { ...good, ageGroup: "18-20" },
      { ...good, column: "X" },
      { ...good, standard: "combat", column: "F" },
      { ...good, raw: { ...good.raw, MDL: -1 } },
      { ...good, raw: { ...good.raw, MDL: 1001 } },
      { ...good, raw: { ...good.raw, HRP: 2.5 } },
      { ...good, raw: { ...good.raw, SDC: 0 } },
      { ...good, raw: { ...good.raw, "2MR": "990" } },
      { ...good, raw: { ...good.raw, extra: 1 } },
      { ...good, raw: { MDL: 1 } },
      { ...good, previousRaw: { ...good.raw, PLK: 99999 } },
      { ...good, previousRaw: "none" },
      JSON.parse(`{"__proto__":{"x":1},${JSON.stringify(good).slice(1)}`),
    ];
    for (const b of bad) expect(parseExplainRequest(b), JSON.stringify(b)).toBeNull();
  });
});

describe("facts are recomputed with the scoring engine", () => {
  it("match scoreAft for every synthetic full-test case", () => {
    for (const c of validScoringCases) {
      const result = scoreAft({ age: c.age, standard: c.standard, gender: c.sex, raw: c.raw });
      const facts = buildFacts(buildExplainRequest(result, null));
      expect(facts.total).toBe(c.expected.total);
      expect(facts.passed).toBe(c.expected.passed);
      expect(Object.fromEntries(facts.events.map((e) => [e.event, e.points]))).toEqual(c.expected.points);
    }
  });

  const factsFor = (c: (typeof validScoringCases)[number]) =>
    buildFacts(buildExplainRequest(scoreAft({ age: c.age, standard: c.standard, gender: c.sex, raw: c.raw }), null));

  it("reports tied highest and lowest events", () => {
    const all = validScoringCases.map(factsFor).filter((f) => !f.allEqual);
    const highTie = all.find((f) => f.highest.events.length > 1);
    const lowTie = all.find((f) => f.lowest.events.length > 1);
    expect(highTie && lowTie).toBeDefined();
    for (const f of [highTie!, lowTie!]) {
      const max = Math.max(...f.events.map((e) => e.points));
      const min = Math.min(...f.events.map((e) => e.points));
      expect(f.highest.events).toEqual(f.events.filter((e) => e.points === max).map((e) => e.event));
      expect(f.lowest.events).toEqual(f.events.filter((e) => e.points === min).map((e) => e.event));
    }
    expect(standardExplanation(highTie!).eventNotes.map((n) => n.text).join(" ")).toMatch(/Highest-scoring events \(tied\)/);
    expect(standardExplanation(lowTie!).eventNotes.map((n) => n.text).join(" ")).toMatch(/Lowest-scoring events \(tied\)/);
  });

  it("handles every event scoring the same", () => {
    const facts = factsFor(validScoringCases.find((c) => c.scenario === "S2-all-maximum")!);
    expect(facts.allEqual).toBe(true);
    expect(facts.highest.events).toHaveLength(5);
    expect(facts.lowest.events).toHaveLength(5);
    expect(standardExplanation(facts).eventNotes[0].text).toMatch(/All five events scored the same, 100 points/);
  });

  it("lists failed events and focuses on them", () => {
    const facts = buildFacts(req({ HRP: 1, "2MR": 3000 }));
    expect(facts.passed).toBe(false);
    expect(facts.failedEvents.sort()).toEqual(["2MR", "HRP"]);
    expect(facts.focusEvents.sort()).toEqual(["2MR", "HRP"]);
    expect(facts.allowedReferences.every((id) => ["2MR", "HRP"].includes(getReference(id)!.event))).toBe(true);
  });

  it("flags a combat total below 350 even when every event passes", () => {
    const facts = buildFacts(req({}, null, { standard: "combat" }));
    if (facts.failedEvents.length === 0) expect(facts.passed).toBe(facts.total >= 350);
  });

  it("compares only with the comparable test supplied", () => {
    expect(buildFacts(req()).comparison).toBeNull();
    const facts = buildFacts(req({ HRP: 50 }, { HRP: 40 }));
    const hrp = facts.comparison!.events.find((e) => e.event === "HRP")!;
    expect(hrp.rawChange).toBe(10);
    expect(hrp.improved).toBe(true);
    const before = scoreAft(input({ HRP: 40 })).total;
    expect(facts.comparison!.totalChange).toBe(facts.total - before);
  });
});

describe("references", () => {
  it("are internal links to existing guides and library exercises mapped to the event", () => {
    for (const ref of REFERENCES) {
      expect(ref.href).toMatch(/^\/(aft-guide|workouts\/exercises)\/[a-z0-9-]+$/);
      if (ref.kind === "exercise") {
        const ex = exercises.find((e) => `exercise:${e.id}` === ref.id);
        expect(ex?.aft?.events, ref.id).toContain(ref.event);
      }
    }
    expect(REFERENCES.filter((r) => r.kind === "guide")).toHaveLength(5);
  });
});

describe("standard explanation", () => {
  it("states pass/fail reasons, ties, and the comparison", () => {
    const facts = buildFacts(req({ HRP: 1 }, { HRP: 5 }));
    const e = standardExplanation(facts);
    expect(e.source).toBe("standard");
    expect(e.summary).toMatch(/does not pass/);
    expect(e.summary).toMatch(/Hand-Release Push-Up is below the 60-point/);
    expect(e.eventNotes.some((n) => /Lowest-scoring/.test(n.text))).toBe(true);
    expect(e.comparison).toMatch(/same scoring category/);
    expect(e.references.length).toBeGreaterThan(0);
    for (const r of e.references) expect(facts.allowedReferences).toContain(r.id);
  });

  it("says when no comparable test exists", () => {
    expect(standardExplanation(buildFacts(req())).comparison).toMatch(/no earlier saved test in the same scoring category/);
  });

  it("names every tied event", () => {
    const facts = buildFacts(req());
    const e = standardExplanation(facts);
    const lowestNote = e.eventNotes.find((n) => /Lowest|same/.test(n.text))!;
    for (const ev of facts.lowest.events) expect(lowestNote.text).toContain(facts.events.find((x) => x.event === ev)!.name);
  });

  it("the readiness note says points do not establish overall fitness", () => {
    expect(READINESS_NOTE).toMatch(/don't measure overall fitness, health, or readiness/);
  });
});

describe("AI output validation", () => {
  const facts = buildFacts(req({ HRP: 1 }, { HRP: 5 }));
  const passing = buildFacts(req());
  const good = {
    summary: "This test does not pass because the Hand-Release Push-Up is below the event minimum. Your other events met the minimum.",
    eventNotes: [{ event: "HRP", text: "The Hand-Release Push-Up is your lowest-scoring event and is below the minimum." }],
    comparison: "Compared with your previous test in the same category, push-up points went down.",
    references: [{ id: "guide:HRP", reason: "Covers the event standard and common faults." }],
  };

  it("accepts a valid output, including event names that contain digits", () => {
    const ok = validateAiOutput({ ...good, summary: good.summary + " Your 2-Mile Run and 3-Rep Max Deadlift met the minimum." }, facts);
    expect(ok.ok).toBe(true);
  });

  const rejects = (patch: Record<string, unknown>, f = facts) => {
    const r = validateAiOutput({ ...good, ...patch }, f);
    expect(r.ok, JSON.stringify(patch)).toBe(false);
    return r.ok ? "" : r.reason;
  };

  it("rejects invented numbers", () => {
    expect(rejects({ summary: "You scored 412 points." })).toBe("text-number");
    expect(rejects({ summary: "You were forty points short." })).toBe("text-number");
    expect(rejects({ eventNotes: [{ event: "HRP", text: "You did 12 push-ups." }] })).toBe("text-number");
  });

  it("rejects links, markup, and unknown or disallowed references", () => {
    expect(rejects({ summary: "See https://example.com for more." })).toBe("text-link");
    expect(rejects({ summary: "See [the guide](/aft-guide/plank)." })).toMatch(/text-/);
    expect(rejects({ summary: "Visit army.mil today." })).toBe("text-link");
    expect(rejects({ summary: "<b>Good job</b>" })).toMatch(/text-(markup|link)/);
    expect(rejects({ summary: "Good job <script>" })).toBe("text-markup");
    expect(rejects({ references: [{ id: "exercise:made-up", reason: "Helpful." }] })).toBe("reference-id");
    expect(rejects({ references: [{ id: "guide:MDL", reason: "Not a focus event." }] })).toBe("reference-id");
    expect(rejects({ references: [{ id: "https://evil.example", reason: "x" }] })).toBe("reference-id");
  });

  it("rejects workout prescriptions, medical advice, promises, and dates", () => {
    expect(rejects({ summary: "Do push-ups three times a week." })).toMatch(/text-(number|prescription)/);
    expect(rejects({ summary: "Add more sets of push-ups to your routine." })).toBe("text-prescription");
    expect(rejects({ summary: "Follow a weekly plan for the run." })).toBe("text-prescription");
    expect(rejects({ summary: "Ice your shoulder and see physical therapy for rehab." })).toBe("text-medical");
    expect(rejects({ summary: "This will improve your score." })).toBe("text-promise");
    expect(rejects({ summary: "You are guaranteed to pass next time." })).toBe("text-promise");
    expect(rejects({ summary: "Retest in December." })).toBe("text-date");
  });

  it("rejects text that contradicts the verified pass/fail outcome", () => {
    expect(rejects({ summary: "You passed the test." })).toBe("text-contradiction");
    const p = { ...good, summary: "You did not pass.", eventNotes: [], references: [], comparison: "" };
    expect(validateAiOutput(p, passing).ok).toBe(false);
  });

  it("rejects comparison text when there is no comparable test", () => {
    expect(rejects({ references: [], eventNotes: [], summary: "This test passes the standard.", comparison: "Points went up." }, passing)).toBe("comparison-without-history");
  });

  it("rejects malformed structure", () => {
    for (const bad of [null, "text", [], {}, { ...good, extra: 1 }, { ...good, summary: "" }, { ...good, summary: "x".repeat(701) }]) {
      expect(validateAiOutput(bad, facts).ok).toBe(false);
    }
    expect(rejects({ eventNotes: [{ event: "XYZ", text: "Nice." }] })).toBe("eventNotes");
    expect(rejects({ eventNotes: [{ event: "HRP", text: "One." }, { event: "HRP", text: "Again." }] })).toBe("eventNotes");
    expect(rejects({ eventNotes: Array(6).fill({ event: "HRP", text: "x" }) })).toBe("eventNotes");
    expect(rejects({ references: Array(5).fill({ id: "guide:HRP", reason: "x" }) })).toBe("references");
  });

  it("checkText strips only approved names", () => {
    expect(checkText("Your 2-Mile Run met the minimum.", { passed: true })).toBeNull();
    expect(checkText("Run 2 miles.", { passed: true })).toBe("number");
  });
});

describe("prompt", () => {
  it("sends only scoring facts and approved reference IDs", () => {
    const data = promptData(buildFacts(req({}, { HRP: 30 })));
    const text = JSON.stringify(data);
    expect(Object.keys(data).sort()).toEqual(
      ["allEventsEqual", "comparison", "events", "highestScoring", "lowestScoring", "outcome", "passRule", "references", "scoringCategory", "total"].sort()
    );
    expect(text).not.toMatch(/https?:|\/aft-guide|\/workouts|birth|testDate|savedAt/);
    expect(text.length).toBeLessThan(2500);
  });

  it("tells the model to treat data as data and not to prescribe", () => {
    expect(INSTRUCTIONS).toMatch(/not instructions/);
    expect(INSTRUCTIONS).toMatch(/Do not give training advice/);
    expect(INSTRUCTIONS).toMatch(/Do not write any numbers/);
  });
});
