import { describe, expect, it } from "vitest";
import { emptyAftForm, formatSeconds, validateAftForm, type AftFormValues } from "./validation";

const today = "2026-09-29";

const valid: AftFormValues = {
  ...emptyAftForm,
  testDate: "2026-09-20",
  age: "34",
  standard: "general",
  gender: "F",
  deadlift: "180",
  pushups: "30",
  sdcMinutes: "2",
  sdcSeconds: "15",
  plankMinutes: "3",
  plankSeconds: "05",
  runMinutes: "19",
  runSeconds: "30",
};

describe("validateAftForm", () => {
  it("accepts a complete form and converts times to seconds", () => {
    const result = validateAftForm(valid, today);
    expect(result).toEqual({
      ok: true,
      testDate: "2026-09-20",
      input: {
        age: 34,
        standard: "general",
        gender: "F",
        raw: { MDL: 180, HRP: 30, SDC: 135, PLK: 185, "2MR": 1170 },
      },
    });
  });

  it("requires every field instead of treating blanks as zero", () => {
    const result = validateAftForm(emptyAftForm, today);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["age", "deadlift", "gender", "plank", "pushups", "run", "sdc"].sort()
      );
    }
  });

  it("rejects out-of-range and non-whole values", () => {
    const result = validateAftForm(
      { ...valid, age: "16", deadlift: "-5", pushups: "12.5", sdcSeconds: "60", testDate: "2026-10-01" },
      today
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.age).toBeDefined();
      expect(result.errors.deadlift).toBeDefined();
      expect(result.errors.pushups).toBeDefined();
      expect(result.errors.sdc).toBeDefined();
      expect(result.errors.testDate).toBeDefined();
    }
  });

  it("does not require sex for the sex-neutral combat standard", () => {
    const result = validateAftForm({ ...valid, standard: "combat", gender: "" }, today);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.gender).toBeNull();
  });

  it("allows a blank test date", () => {
    const result = validateAftForm({ ...valid, testDate: "" }, today);
    expect(result.ok && result.testDate).toBeNull();
  });
});

describe("formatSeconds", () => {
  it("formats minutes and seconds", () => {
    expect(formatSeconds(135)).toBe("2:15");
    expect(formatSeconds(1170)).toBe("19:30");
    expect(formatSeconds(45)).toBe("0:45");
  });
});
