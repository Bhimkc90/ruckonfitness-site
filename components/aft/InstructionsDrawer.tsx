"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import type { AftEventCode } from "@/lib/aft/types";
import type { CalculatorEvent } from "./AftCalculator";

// The verified event guide in a modal drawer. It sits beside the calculator form and never unmounts it, so
// entered scores are kept. A native <dialog> provides the focus trap, Escape to close, and focus return.
export default function InstructionsDrawer({
  events,
  guides,
  openEvent,
  onClose,
}: {
  events: CalculatorEvent[];
  guides: Record<AftEventCode, React.ReactNode>;
  openEvent: AftEventCode | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const event = events.find((e) => e.code === openEvent);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (openEvent && !el.open) {
      el.showModal();
      body.current?.scrollTo({ top: 0 });
    } else if (!openEvent && el.open) {
      el.close();
    }
  }, [openEvent]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="instructions-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-0 ml-auto h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 sm:w-[min(48rem,100%)]"
    >
      <div className="flex h-full flex-col border-l border-card-line bg-canvas text-ink shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-card-line bg-surface px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">
              {event ? `Event ${event.order} · ${event.abbreviation}` : "Instructions"}
            </p>
            <h2 id="instructions-title" className="text-lg font-bold leading-snug">
              {event ? `${event.name} instructions` : "Instructions"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-2">Your entered scores stay in the form while this is open.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink hover:border-ink"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close instructions</span>
          </button>
        </header>

        <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {events.map((e) => (
            <div key={e.code} hidden={e.code !== openEvent}>
              {guides[e.code]}
            </div>
          ))}
        </div>

        {event && (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-card-line bg-surface px-4 py-3 sm:px-5">
            <a
              href={`/aft-guide/${event.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              Open the full guide page
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <button type="button" onClick={onClose} className="rounded-lg border border-ink bg-ink px-4 py-2 text-sm font-semibold text-canvas hover:bg-ink/85">
              Back to my scores
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}
