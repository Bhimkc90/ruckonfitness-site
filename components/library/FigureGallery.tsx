import Image from "next/image";
import type { Exercise } from "@/lib/library/types";
import { FIGURE_CREDIT, figureAlt, figuresFor } from "@/lib/library/images";
import { sources } from "@/lib/library";
import { Card } from "@/components/ui/Card";

// Official ATP figures for an exercise, full size with their printed captions.
export default function FigureGallery({ exercise }: { exercise: Exercise }) {
  const figures = figuresFor(exercise.id);
  if (figures.length === 0) return null;
  const atp = sources["atp-7-22-02-c1"];
  return (
    <Card title="Demonstration" description="Official photo sequences from the Army's drill manual, read left to right, top to bottom.">
      <div className="space-y-5">
        {figures.map((figure, index) => (
          <figure key={figure.figure}>
            <div className="overflow-hidden rounded-lg border border-card-line bg-white">
              <Image
                src={figure.src}
                alt={figureAlt(exercise.name, figure)}
                width={figure.width}
                height={figure.height}
                sizes="(min-width: 1024px) 680px, 100vw"
                loading={index === 0 ? "eager" : "lazy"}
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
      </div>
      <p className="mt-4 text-xs text-ink-2">{FIGURE_CREDIT}</p>
    </Card>
  );
}
