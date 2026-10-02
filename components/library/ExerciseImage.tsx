import Image from "next/image";
import { Dumbbell, Footprints, PersonStanding, StretchHorizontal } from "lucide-react";
import type { Exercise } from "@/lib/library/types";
import { thumbnailFor } from "@/lib/library/images";

function ExerciseIcon({ exercise, className }: { exercise: Exercise; className: string }) {
  const patterns = exercise.tags.movementPatterns;
  if (exercise.tags.equipment.some((e) => e !== "none")) return <Dumbbell className={className} aria-hidden />;
  if (patterns.includes("run") || patterns.includes("locomotion")) return <Footprints className={className} aria-hidden />;
  if (patterns.includes("stretch")) return <StretchHorizontal className={className} aria-hidden />;
  return <PersonStanding className={className} aria-hidden />;
}

// Small list-row thumbnail. Decorative: the row already names the exercise, and the full figures with
// captions and alt text appear in the expanded instructions.
export function ExerciseThumbSmall({ exercise, drillAbbreviation }: { exercise: Exercise; drillAbbreviation?: string }) {
  const figure = thumbnailFor(exercise.id, drillAbbreviation);
  const box = "relative flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-card-line sm:h-20 sm:w-28";
  if (figure) {
    return (
      <span className={`${box} bg-white`}>
        <Image src={figure.src} alt="" fill sizes="112px" loading="lazy" className="object-contain p-1" />
      </span>
    );
  }
  return (
    <span className={`${box} bg-surface-2 text-ink-2`}>
      <ExerciseIcon exercise={exercise} className="h-7 w-7" />
    </span>
  );
}
