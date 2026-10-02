import { BookOpen, CheckSquare, ChevronDown, ExternalLink, Info, Square } from "lucide-react";
import { guideSources, type GuideSourceId } from "@/lib/aft/guideSources";

export function Ref({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-2 inline-flex items-start gap-1 text-xs text-ink-2">
      <BookOpen className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function GuideSection({
  id,
  title,
  refText,
  level = 2,
  children,
}: {
  id?: string;
  title: string;
  refText?: string;
  level?: 2 | 3;
  children: React.ReactNode;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="readable scroll-mt-28 rounded-xl border border-card-line bg-surface p-4 shadow-sm sm:p-5 lg:scroll-mt-6">
      <H id={id ? `${id}-heading` : undefined} className="text-lg font-bold text-ink">
        {title}
      </H>
      <div className="mt-3 text-sm leading-relaxed text-ink">{children}</div>
      <Ref>{refText}</Ref>
    </section>
  );
}

// Supplementary detail that starts collapsed (grader procedures, anatomy, source notes).
export function MoreDetails({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group mt-4 rounded-lg border border-card-line bg-surface-2/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2.5 font-semibold text-ink hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-card-line px-3 pb-3 pt-3">{children}</div>
    </details>
  );
}

export function Bullets({ items, tone = "ink" }: { items: string[]; tone?: "ink" | "muted" }) {
  return (
    <ul className={`list-disc space-y-1.5 pl-5 ${tone === "muted" ? "text-ink-2" : "text-ink"}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function CitedList({ items }: { items: { text: string; ref: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.text}>
          <p>{item.text}</p>
          <Ref>{item.ref}</Ref>
        </li>
      ))}
    </ul>
  );
}

export function Checklist({ items }: { items: { text: string; ref: string; origin: "atp" | "ruckon" }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = item.origin === "atp" ? CheckSquare : Square;
        return (
          <li key={item.text} className="flex gap-2.5">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.origin === "atp" ? "text-accent-ink" : "text-ink-2"}`} aria-hidden />
            <div>
              <p>
                {item.text}
                {item.origin === "ruckon" && <span className="ml-1.5 text-xs text-ink-2">(RuckOn suggestion)</span>}
              </p>
              <Ref>{item.ref}</Ref>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-xs text-ink-2">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function ExternalLinkText({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent-ink hover:underline">
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function GuideSourceList({ ids }: { ids: GuideSourceId[] }) {
  return (
    <ul className="space-y-3">
      {ids.map((id) => {
        const source = guideSources[id];
        return (
          <li key={id}>
            <ExternalLinkText href={source.url}>
              {source.number}, {source.title}
            </ExternalLinkText>
            <p className="mt-0.5 text-xs text-ink-2">
              {source.date}. {source.status}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function EndorsementNote() {
  return (
    <Note>
      RuckOn Fitness is not affiliated with or endorsed by the U.S. Army, and this guide is not a grader certification. Test
      administration follows ATP 7-22.01 and your unit&apos;s OIC or NCOIC.
    </Note>
  );
}
