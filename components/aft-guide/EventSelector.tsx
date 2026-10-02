"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

// Event tabs for the AFT Guide. Every event's instructions are rendered on the server and passed in as panels;
// this only chooses which one is shown, so switching events never leaves the page. The choice is kept in the
// URL (?event=<slug>) so it can be shared, while /aft-guide/<slug> stays the direct link for each event.

export type EventTab = { slug: string; order: number; name: string; shortName: string; scoreLabel: string };

const CHANGE = "aft-guide-event";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

const urlSlug = () => new URLSearchParams(window.location.search).get("event");

function choose(slug: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("event", slug);
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function EventSelector({ events, panels }: { events: EventTab[]; panels: React.ReactNode[] }) {
  const fromUrl = useSyncExternalStore(subscribe, urlSlug, () => null);
  const index = Math.max(0, events.findIndex((e) => e.slug === fromUrl));
  const selected = events[index];
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  // Set by Previous/Next so the new event's heading is brought into view and focused after it renders.
  const pendingFocus = useRef(false);

  // On phones the tabs scroll sideways; keep the selected one in view without moving the page.
  useEffect(() => {
    const tab = tabs.current[index];
    const row = tab?.parentElement;
    if (!tab || !row || row.scrollWidth <= row.clientWidth) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - 16, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [index]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const heading = document.getElementById(`event-${selected.slug}-title`);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selected.slug]);

  const goTo = (target: number) => {
    pendingFocus.current = true;
    choose(events[target].slug);
  };

  const onTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, at: number) => {
    const last = events.length - 1;
    const target =
      event.key === "ArrowRight" ? (at === last ? 0 : at + 1) : event.key === "ArrowLeft" ? (at === 0 ? last : at - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (target === null) return;
    event.preventDefault();
    choose(events[target].slug);
    tabs.current[target]?.focus();
  };

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="AFT events" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0">
        {events.map((event, at) => {
          const active = at === index;
          return (
            <button
              key={event.slug}
              ref={(el) => {
                tabs.current[at] = el;
              }}
              type="button"
              role="tab"
              id={`event-tab-${event.slug}`}
              aria-selected={active}
              aria-controls={`event-panel-${event.slug}`}
              tabIndex={active ? 0 : -1}
              onClick={() => choose(event.slug)}
              onKeyDown={(e) => onTabKey(e, at)}
              className={`flex min-w-[9.5rem] shrink-0 snap-start flex-col rounded-xl border-2 p-3 text-left transition-colors sm:min-w-0 ${
                active ? "border-ink bg-accent text-black shadow-sm" : "border-card-line bg-surface text-ink hover:border-ink"
              }`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${active ? "text-black" : "text-ink-2"}`}>Event {event.order}</span>
              <span className="mt-0.5 font-bold leading-snug">{event.name}</span>
              <span className={`mt-auto pt-2 text-xs ${active ? "text-black/80" : "text-ink-2"}`}>{event.scoreLabel}</span>
            </button>
          );
        })}
      </div>

      {events.map((event, at) => (
        <div
          key={event.slug}
          role="tabpanel"
          id={`event-panel-${event.slug}`}
          aria-labelledby={`event-tab-${event.slug}`}
          hidden={at !== index}
          className="space-y-5"
        >
          {panels[at]}

          <nav aria-label="Move between events" className="grid grid-cols-2 gap-2 border-t-2 border-ink pt-4">
            <button
              type="button"
              disabled={at === 0}
              onClick={() => goTo(at - 1)}
              className={buttonClass("secondary", "min-w-0 justify-start px-3 text-left")}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-ink-2">Previous event</span>
                <span className="block truncate">{at > 0 ? events[at - 1].name : "First event"}</span>
              </span>
            </button>
            <button
              type="button"
              disabled={at === events.length - 1}
              onClick={() => goTo(at + 1)}
              className={buttonClass("primary", "min-w-0 justify-end px-3 text-right")}
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium">Next event</span>
                <span className="block truncate">{at < events.length - 1 ? events[at + 1].name : "Last event"}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </nav>
        </div>
      ))}
    </div>
  );
}
