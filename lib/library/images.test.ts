import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exercises, getExercise } from "./index";
import { exerciseFigures, figuresFor, thumbnailFor } from "./images";

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

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

describe("exercise figures", () => {
  it("points every figure at an existing file with the recorded dimensions", () => {
    for (const figure of exerciseFigures) {
      const size = jpegSize(join(publicDir, figure.src));
      expect(size, figure.src).toEqual({ width: figure.width, height: figure.height });
    }
  });

  it("uses every image file in the folder, once", () => {
    const files = readdirSync(join(publicDir, "images", "exercises")).map((f) => `/images/exercises/${f}`).sort();
    expect(exerciseFigures.map((f) => f.src).sort()).toEqual(files);
  });

  it("attaches figures only to real exercises, with unique figure numbers", () => {
    for (const figure of exerciseFigures) expect(getExercise(figure.exerciseId), figure.exerciseId).toBeDefined();
    expect(new Set(exerciseFigures.map((f) => f.figure)).size).toBe(exerciseFigures.length);
  });

  it("matches each official caption to the exercise it is attached to", () => {
    for (const figure of exerciseFigures) {
      expect(norm(figure.caption), `${figure.figure} → ${figure.exerciseId}`).toContain(norm(getExercise(figure.exerciseId)!.name));
    }
  });

  it("uses a drill's own figure for a shared exercise", () => {
    expect(thumbnailFor("rear-lunge", "RD")?.figure).toBe("16-2");
    expect(thumbnailFor("rear-lunge", "PD")?.figure).toBe("3-3");
    expect(thumbnailFor("push-up", "PD")?.figure).toBe("3-13");
    expect(thumbnailFor("side-bridge", "4C")?.figure).toBe("4-13");
  });

  it("gives every library exercise a thumbnail from its own figures", () => {
    for (const exercise of exercises) {
      const thumb = thumbnailFor(exercise.id);
      expect(thumb, exercise.id).toBeDefined();
      expect(figuresFor(exercise.id)).toContain(thumb);
    }
  });
});
