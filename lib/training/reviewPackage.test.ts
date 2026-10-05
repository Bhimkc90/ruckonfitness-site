import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildReviewPackage } from "./reviewPackage";
import { ASSUMPTIONS } from "./templates";

const PATH = "docs/training-review/review-package.md";

describe("training-plan review package", () => {
  const generated = buildReviewPackage();

  it("is up to date with the engine", () => {
    if (process.env.UPDATE_REVIEW_PACKAGE) writeFileSync(PATH, generated + "\n");
    expect(existsSync(PATH)).toBe(true);
    expect(readFileSync(PATH, "utf8")).toBe(generated + "\n");
  });

  it("lists every assumption for sign-off and claims no approval", () => {
    for (const id of Object.keys(ASSUMPTIONS)) expect(generated).toContain(`| \`${id}\` |`);
    expect(generated).toMatch(/not professionally reviewed/);
    expect(generated).not.toMatch(/\bapproved by\b|\bendorsed\b/i);
  });
});
