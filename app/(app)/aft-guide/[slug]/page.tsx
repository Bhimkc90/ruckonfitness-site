import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { aftEvents, aftGuideHref, getAftEvent } from "@/lib/aft/events";
import { ButtonLink } from "@/components/ui/Button";
import EventGuide, { EventSectionNav } from "@/components/aft-guide/EventGuide";

export const dynamicParams = false;

export function generateStaticParams() {
  return aftEvents.map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = getAftEvent(slug);
  return event ? { title: `${event.name} guide`, description: event.description } : {};
}

// Direct, bookmarkable URL for one event. The AFT Guide page shows the same content with an event selector.
export default async function AftEventGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getAftEvent(slug);
  if (!event) notFound();

  const index = aftEvents.indexOf(event);
  const previous = aftEvents[index - 1];
  const next = aftEvents[index + 1];
  const navLink = "inline-flex min-w-0 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 py-2 font-semibold text-ink hover:border-ink";

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <Link href="/aft-guide" className="hover:text-ink">
          AFT Guide
        </Link>{" "}
        / <span className="text-ink">{event.name}</span>
      </nav>

      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Event {event.order} of 5</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{event.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{event.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/aft-calculator">Score it in the calculator</ButtonLink>
          <ButtonLink href={`/aft-guide?event=${event.slug}`} variant="secondary">
            All events
          </ButtonLink>
          <ButtonLink href="/aft-guide/field-setup" variant="secondary">
            Field setup
          </ButtonLink>
        </div>
      </header>

      <EventSectionNav />

      <EventGuide event={event} />

      <nav aria-label="Other events" className="flex flex-wrap justify-between gap-3 text-sm">
        {previous ? (
          <Link href={aftGuideHref(previous.slug)} className={navLink}>
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Previous: {previous.name}</span>
          </Link>
        ) : (
          <Link href="/aft-guide" className={navLink}>
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            AFT Guide
          </Link>
        )}
        {next ? (
          <Link href={aftGuideHref(next.slug)} className={navLink}>
            <span className="truncate">Next: {next.name}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        ) : (
          <Link href="/aft-guide/field-setup" className={navLink}>
            Field setup
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
