import Image from "next/image";
import type { Exercise } from "@/lib/library/types";
import { FIGURE_CREDIT, figureAlt, figuresFor, type ExerciseFigure } from "@/lib/library/images";
import { sources } from "@/lib/library";
import { Card } from "@/components/ui/Card";

export const FIGURE_READING_NOTE = "Official photo sequences from the Army's drill manual, read left to right, top to bottom.";

// Official ATP figures, full width with their printed captions. Shared by the exercise page and the library's
// inline instructions.
export function FigureList({ exercise, figures, eager = false }: { exercise: Exercise; figures: ExerciseFigure[]; eager?: boolean }) {
  const atp = sources["atp-7-22-02-c1"];
  return (
    <div className="space-y-5">
      {figures.map((figure, index) => (
        <figure key={figure.figure} className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-card-line bg-white">
            <Image
              src={figure.src}
              alt={figureAlt(exercise.name, figure)}
              width={figure.width}
              height={figure.height}
              sizes="(min-width: 1024px) 680px, 100vw"
              loading={eager && index === 0 ? "eager" : "lazy"}
              className="h-auto max-h-[28rem] w-full object-contain"
            />
          </div>
          <figcaption className="mt-2 text-xs text-ink-2">
            <span className="font-medium text-ink">
              Figure {figure.figure}. {figure.caption}
            </span>{" "}
            ·{" "}
            <a href={atp.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
              {atp.number}, p. {figure.page}
              <span className="sr-only"> (opens the official PDF)</span>
            </a>
          </figcaption>
        </figure>
      ))}
      <p className="text-xs text-ink-2">{FIGURE_CREDIT}</p>
    </div>
  );
}

// All official ATP figures for an exercise, in a card.
export default function FigureGallery({ exercise }: { exercise: Exercise }) {
  const figures = figuresFor(exercise.id);
  if (figures.length === 0) return null;
  return (
    <Card title="Demonstration" description={FIGURE_READING_NOTE}>
      <FigureList exercise={exercise} figures={figures} eager />
    </Card>
  );
}
