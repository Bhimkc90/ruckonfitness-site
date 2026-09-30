import Image from "next/image";
import { Dumbbell, Footprints, PersonStanding, StretchHorizontal } from "lucide-react";
import type { Exercise } from "@/lib/library/types";
import { figureAlt, thumbnailFor } from "@/lib/library/images";

// Card thumbnail: the official ATP figure on its original white background, scaled to fit (never cropped),
// or an icon panel when no verified image exists.
export function ExerciseThumb({ exercise, sizes, drillAbbreviation }: { exercise: Exercise; sizes: string; drillAbbreviation?: string }) {
  const figure = thumbnailFor(exercise.id, drillAbbreviation);
  if (figure) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-[11px] bg-white">
        <Image
          src={figure.src}
          alt={figureAlt(exercise.name, figure)}
          fill
          sizes={sizes}
          loading="lazy"
          className="object-contain p-2"
        />
      </div>
    );
  }
  const Icon = exercise.tags.equipment.some((e) => e !== "none")
    ? Dumbbell
    : exercise.tags.movementPatterns.includes("run") || exercise.tags.movementPatterns.includes("locomotion")
      ? Footprints
      : exercise.tags.movementPatterns.includes("stretch")
        ? StretchHorizontal
        : PersonStanding;
  return (
    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-t-[11px] border-b border-card-line bg-surface-2 text-ink-2">
      <Icon className="h-10 w-10" aria-hidden />
      <span className="text-xs">No verified image yet</span>
    </div>
  );
}
