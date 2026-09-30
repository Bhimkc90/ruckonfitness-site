import { describe, expect, it } from "vitest";
import { aftEvents, aftGuideHref, getAftEvent, getAftEventByCode } from "./events";
import { aftEventOrder } from "./scoring";
import { guideSources } from "./guideSources";
import {
  closeoutChecklist,
  equipmentSpecs,
  equipmentTable,
  fieldDiscrepancies,
  fieldLayout,
  personnelDependencies,
  roles,
  runCourse,
  safety,
  sequence,
  setupChecklist,
  timingRules,
  uniformRules,
  warmupRecovery,
} from "./fieldSetup";
import { emptyFilters, filterExercises } from "@/lib/library";

describe("AFT event guides", () => {
  it("covers the five events in official order with unique slugs", () => {
    expect(aftEvents.map((e) => e.code)).toEqual(aftEventOrder);
    expect(aftEvents.map((e) => e.order)).toEqual([1, 2, 3, 4, 5]);
    const slugs = aftEvents.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(5);
    expect(slugs).not.toContain("field-setup");
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("resolves every guide link", () => {
    for (const event of aftEvents) {
      expect(getAftEvent(aftGuideHref(event.slug).split("/").pop()!)).toBe(event);
      expect(getAftEventByCode(event.code)).toBe(event);
    }
  });

  it("gives every event the required sections", () => {
    for (const event of aftEvents) {
      expect(event.description.length, event.code).toBeGreaterThan(10);
      expect(event.purpose.length, event.code).toBeGreaterThan(10);
      expect(event.equipment.length, event.code).toBeGreaterThan(0);
      expect(event.setup.length, event.code).toBeGreaterThan(0);
      expect(event.commands.length, event.code).toBeGreaterThan(0);
      expect(event.startingPosition, event.code).toBeTruthy();
      expect(event.execution.length, event.code).toBeGreaterThan(0);
      expect(event.completion?.length, event.code).toBeGreaterThan(0);
      expect(event.grading?.procedure.length, event.code).toBeGreaterThan(0);
      expect(event.rules.safetyTips.length, event.code).toBeGreaterThan(0);
      expect(event.performance.fitnessComponents.length, event.code).toBeGreaterThan(0);
      expect(event.sources.some((s) => s.type === "Army"), event.code).toBe(true);
      expect(event.sources.some((s) => s.type === "RuckOn"), `${event.code} labels RuckOn anatomy`).toBe(true);
    }
  });

  it("cites ATP 7-22.01 (March 2026) with a page for every cited section", () => {
    const required = ["measures", "equipment", "setup", "commands", "startingPosition", "execution", "completion", "grading", "safety"] as const;
    for (const event of aftEvents) {
      for (const section of required) {
        const ref = event.refs?.[section];
        expect(ref, `${event.code} ${section}`).toMatch(/^ATP 7-22\.01 \(12 Mar 2026\), para\. .+, p\. .+/);
      }
    }
  });

  it("states that the source gives no breathing guidance rather than inventing it", () => {
    for (const event of aftEvents) expect(event.breathing).toBeNull();
  });

  it("encodes key verified standards", () => {
    const mdl = getAftEventByCode("MDL");
    expect(mdl.completion?.join(" ")).toMatch(/3 continuous repetitions/);
    expect(mdl.completion?.join(" ")).toMatch(/two attempts/);
    const hrp = getAftEventByCode("HRP");
    expect(hrp.rawScoreLabel).toMatch(/2 minutes/);
    expect(hrp.execution).toHaveLength(4);
    const sdc = getAftEventByCode("SDC");
    expect(sdc.execution.map((p) => p.title)).toEqual([
      "Shuttle 1: sprint",
      "Shuttle 2: drag",
      "Shuttle 3: lateral",
      "Shuttle 4: carry",
      "Shuttle 5: sprint",
    ]);
    expect(sdc.rules.termination).toEqual([]);
    const plank = getAftEventByCode("PLK");
    expect(plank.rules.faults.join(" ")).toMatch(/one verbal warning/);
    const run = getAftEventByCode("2MR");
    expect(run.rules.termination.join(" ")).toMatch(/Leaving the running course/);
  });

  it("links only to official Army video sources and labels them", () => {
    for (const event of aftEvents) {
      expect(event.video?.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
      expect(event.video?.channel).toMatch(/U\.S\. Army Holistic Health and Fitness/);
      expect(event.video?.note).toMatch(/ATP 7-22\.01/);
      expect(event.media.image).toBeUndefined();
    }
  });

  it("finds library exercises through the existing AFT mapping", () => {
    expect(filterExercises({ ...emptyFilters, aftEvent: "MDL" }).length).toBeGreaterThan(0);
    expect(filterExercises({ ...emptyFilters, aftEvent: "HRP" }).length).toBeGreaterThan(0);
  });
});

describe("field setup", () => {
  it("cites every field setup item", () => {
    const cited = [
      ...personnelDependencies,
      ...fieldLayout,
      ...runCourse,
      ...timingRules,
      ...warmupRecovery,
      ...safety,
      ...uniformRules,
      ...fieldDiscrepancies,
      ...sequence,
      ...equipmentTable,
      ...equipmentSpecs,
      ...roles,
    ];
    for (const item of cited) expect(item.ref).toMatch(/ATP 7-22\.01|Army Directive 2026-07/);
  });

  it("marks non-ATP checklist items as RuckOn suggestions", () => {
    for (const item of [...setupChecklist, ...closeoutChecklist]) {
      if (item.origin === "ruckon") expect(item.ref).toMatch(/RuckOn suggestion/);
      else expect(item.ref).toMatch(/ATP 7-22\.01/);
    }
  });

  it("keeps verified dimensions and ratios", () => {
    const layout = fieldLayout.map((i) => i.text).join(" ");
    expect(layout).toMatch(/25 meters long and 2\.5 to 3\.0 meters wide/);
    expect(layout).toMatch(/approximately 4\.0 meters/);
    expect(layout).toMatch(/approximately 8\.0 meters/);
    expect(personnelDependencies.map((i) => i.text).join(" ")).toMatch(/one grader for every four Soldiers/);
    expect(timingRules[0].text).toMatch(/120 minutes/);
    expect(runCourse.map((i) => i.text).join(" ")).toMatch(/3-percent uphill grade/);
  });

  it("records official source URLs on armypubs or army.mil", () => {
    for (const source of Object.values(guideSources)) expect(source.url).toMatch(/^https:\/\/(armypubs\.army\.mil|www\.army\.mil)\//);
  });
});
