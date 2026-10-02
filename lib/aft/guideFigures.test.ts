import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aftEvents } from "./events";
import { aftGuideFigures, figuresAt, figuresForEvent } from "./guideFigures";

const publicDir = join(__dirname, "..", "..", "public");

// Width and height from a baseline or progressive JPEG's SOF marker.
function jpegSize(path: string): { width: number; height: number } {
  const b = readFileSync(path);
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1];
    const length = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + length;
  }
  throw new Error(`no SOF in ${path}`);
}

describe("AFT guide figures", () => {
  it("points every figure at an existing file with the recorded dimensions", () => {
    for (const figure of aftGuideFigures) {
      expect(jpegSize(join(publicDir, figure.src)), figure.src).toEqual({ width: figure.width, height: figure.height });
    }
  });

  it("uses every image in the folder and no figure twice", () => {
    const files = readdirSync(join(publicDir, "images", "aft")).filter((f) => f.endsWith(".jpg")).sort();
    expect(aftGuideFigures.map((f) => f.src.split("/").pop()).sort()).toEqual(files);
    expect(new Set(aftGuideFigures.map((f) => f.figure)).size).toBe(aftGuideFigures.length);
  });

  it("covers figures 2-3 through 2-13 of ATP 7-22.01, each with a caption, page, and descriptive alt text", () => {
    expect(aftGuideFigures.map((f) => f.figure).sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]))).toEqual(
      Array.from({ length: 11 }, (_, i) => `2-${i + 3}`)
    );
    for (const figure of aftGuideFigures) {
      expect(figure.caption.length, figure.figure).toBeGreaterThan(3);
      expect(Number(figure.page), figure.figure).toBeGreaterThanOrEqual(27);
      expect(Number(figure.page), figure.figure).toBeLessThanOrEqual(37);
      expect(figure.alt.length, figure.figure).toBeGreaterThan(60);
    }
  });

  it("gives every event at least one figure, placed at a step that exists", () => {
    for (const event of aftEvents) {
      expect(figuresForEvent(event.code).length, event.code).toBeGreaterThan(0);
      const stepIds = event.execution.map((s) => s.id);
      for (const figure of figuresForEvent(event.code)) {
        if (figure.placement.kind === "step") expect(stepIds, figure.figure).toContain(figure.placement.stepId);
      }
      const placed =
        figuresAt(event.code, { kind: "start" }).length +
        figuresAt(event.code, { kind: "faults" }).length +
        stepIds.reduce((n, stepId) => n + figuresAt(event.code, { kind: "step", stepId }).length, 0);
      expect(placed, event.code).toBe(figuresForEvent(event.code).length);
    }
  });
});
