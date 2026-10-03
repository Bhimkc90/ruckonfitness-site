import type { AftEventCode } from "@/lib/aft/types";
import { aftEventOrder } from "@/lib/aft/scoring";
import { aftEvents, aftGuideHref } from "@/lib/aft/events";
import { exerciseHref, getExercise } from "@/lib/library";

// The only links an explanation can show. The AI is given reference IDs, never URLs, and links are resolved here,
// so it cannot invent one. Each library exercise below is mapped to the event in the library data
// (lib/library, `aft.events`); lib/explain/references.test.ts checks that.

export type ReferenceId = `guide:${AftEventCode}` | `exercise:${string}`;

export type Reference = { id: ReferenceId; kind: "guide" | "exercise"; event: AftEventCode; label: string; href: string };

const CURATED_EXERCISES: Record<AftEventCode, string[]> = {
  MDL: ["deadlift", "squat-bender", "front-squat"],
  HRP: ["push-up", "supine-chest-press", "eight-count-t-push-up"],
  SDC: ["lateral", "shuttle-sprint", "forward-lunge"],
  PLK: ["side-bridge", "quadraplex", "bent-leg-raise"],
  // No library exercise is mapped to the 2-mile run alone; the event guide is the reference.
  "2MR": [],
};

function build(): Reference[] {
  const refs: Reference[] = [];
  for (const code of aftEventOrder) {
    const event = aftEvents.find((e) => e.code === code)!;
    refs.push({ id: `guide:${code}`, kind: "guide", event: code, label: `AFT guide: ${event.name}`, href: aftGuideHref(event.slug) });
    for (const id of CURATED_EXERCISES[code]) {
      const exercise = getExercise(id);
      if (!exercise) throw new Error(`Unknown curated exercise ${id}`);
      refs.push({ id: `exercise:${id}`, kind: "exercise", event: code, label: exercise.name, href: exerciseHref(id) });
    }
  }
  return refs;
}

export const REFERENCES: Reference[] = build();
const byId = new Map<string, Reference>(REFERENCES.map((r) => [r.id, r]));

export const getReference = (id: string): Reference | undefined => byId.get(id);

export const referencesFor = (events: AftEventCode[]): Reference[] => REFERENCES.filter((r) => events.includes(r.event));
