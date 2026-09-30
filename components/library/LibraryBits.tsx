import { BookOpen, Info } from "lucide-react";
import type { SourceRef } from "@/lib/library/types";
import { formatSourceRef, sources } from "@/lib/library";

export function Citation({ source }: { source: SourceRef }) {
  const publication = sources[source.sourceId];
  return (
    <a
      href={publication.url}
      className="inline-flex items-center gap-1 text-xs text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
      target="_blank"
      rel="noreferrer"
    >
      <BookOpen className="h-3 w-3" aria-hidden />
      {formatSourceRef(source)}
      <span className="sr-only"> (opens the official PDF)</span>
    </a>
  );
}

export function Tag({ children, tone = "app" }: { children: React.ReactNode; tone?: "app" | "official" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
        tone === "official"
          ? "border border-accent/40 bg-accent/10 text-accent"
          : "border border-line bg-surface-2 text-ink-2"
      }`}
    >
      {children}
    </span>
  );
}

export function SourceNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-xs text-ink-2">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function SourceList({ ids }: { ids: (keyof typeof sources)[] }) {
  return (
    <ul className="space-y-3 text-sm">
      {ids.map((id) => {
        const source = sources[id];
        return (
          <li key={id}>
            <a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
              {source.number}, {source.title}
            </a>
            <p className="mt-0.5 text-xs text-ink-2">
              {source.edition}. {source.changeDate}. {source.distribution}. Checked against the publication on{" "}
              {source.verifiedOn}.
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function LegendNote() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
      <Tag tone="official">Army</Tag> official classification from the cited publication
      <Tag>RuckOn</Tag> app tag, not Army terminology
    </p>
  );
}
