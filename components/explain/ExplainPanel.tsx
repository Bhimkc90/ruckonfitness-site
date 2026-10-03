"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Info, Loader2, MessageSquareText, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import type { AftResult } from "@/lib/aft/types";
import { aftEventInfo } from "@/lib/aft/scoring";
import { formatSignedPoints } from "@/lib/aft/format";
import { buildExplainRequest, fingerprint } from "@/lib/explain/request";
import { buildFacts, type Facts } from "@/lib/explain/facts";
import { READINESS_NOTE, standardExplanation, type Explanation } from "@/lib/explain/explanation";
import { getReference } from "@/lib/explain/references";
import { requestExplanation } from "@/lib/explain/client";
import { setAiConsent, useAiConsent } from "@/lib/explain/consent";
import { buttonClass } from "@/components/ui/Button";
import { EventPoints, PassFailBadge } from "@/components/ui/StatusBadge";

type View =
  | { kind: "idle" }
  | { kind: "consent" }
  | { kind: "loading" }
  | { kind: "shown"; explanation: Explanation; notice: string | null; canRetry: boolean };

type State = { fp: string; view: View };

const NOTICES: Record<string, string> = {
  "invalid-output": "The AI explanation didn't pass RuckOn's checks, so the standard explanation is shown instead.",
  "provider-error": "The AI service had a problem, so the standard explanation is shown instead.",
  network: "Couldn't reach RuckOn's server, so the standard explanation is shown instead.",
  timeout: "The AI service took too long, so the standard explanation is shown instead.",
  "provider-quota": "AI explanations have reached their usage limit for now, so the standard explanation is shown instead.",
};

function minutes(seconds: number) {
  const m = Math.ceil(seconds / 60);
  return m >= 120 ? `${Math.round(m / 60)} hours` : m === 1 ? "1 minute" : `${m} minutes`;
}

// "Explain my results" for one AFT result. Scores, pass/fail, and changes on this panel are always rendered from
// facts computed by the app; only the wording may come from AI. The explanation belongs to one exact result: when
// the result or its comparable test changes, the panel resets.
export default function ExplainPanel({
  result,
  previousComparable,
  disabledReason,
}: {
  result: AftResult;
  previousComparable: AftResult | null;
  disabledReason?: string;
}) {
  const request = useMemo(() => buildExplainRequest(result, previousComparable), [result, previousComparable]);
  const fp = fingerprint(request);
  const facts = useMemo(() => buildFacts(request), [request]);
  const consented = useAiConsent();
  const [state, setState] = useState<State>({ fp, view: { kind: "idle" } });
  const abort = useRef<AbortController | null>(null);
  const view: View = state.fp === fp ? state.view : { kind: "idle" };

  // A changed result cancels any request still running for the old one.
  useEffect(() => () => abort.current?.abort(), [fp]);

  const show = (explanation: Explanation, notice: string | null = null, canRetry = false) =>
    setState({ fp, view: { kind: "shown", explanation, notice, canRetry } });

  const run = async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ fp, view: { kind: "loading" } });
    let outcome;
    try {
      outcome = await requestExplanation(request, facts, controller.signal);
    } catch {
      return; // cancelled
    }
    if (controller.signal.aborted) return;
    const fallback = standardExplanation(facts);
    switch (outcome.kind) {
      case "ai":
        return show(outcome.explanation);
      case "fallback":
        return show(fallback, NOTICES[outcome.reason] ?? NOTICES["provider-error"], outcome.retry);
      case "limited":
        return show(
          fallback,
          outcome.scope === "global"
            ? `AI explanations have reached today's limit for RuckOn. Try again in about ${minutes(outcome.retryAfterSeconds)}. The standard explanation is shown instead.`
            : `You've reached the limit for AI explanations. Try again in about ${minutes(outcome.retryAfterSeconds)}. The standard explanation is shown instead.`
        );
      case "unavailable":
        return show(fallback, "AI explanations aren't available right now, so the standard explanation is shown instead.");
      default:
        return show(fallback, NOTICES["provider-error"], true);
    }
  };

  const start = () => (consented ? run() : setState({ fp, view: { kind: "consent" } }));
  const dismiss = () => {
    abort.current?.abort();
    setState({ fp, view: { kind: "idle" } });
  };

  if (view.kind === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={start} disabled={!!disabledReason} className={buttonClass("secondary")}>
          <MessageSquareText className="h-4 w-4" aria-hidden />
          Explain my results
        </button>
        {disabledReason && <p className="text-xs text-ink-2">{disabledReason}</p>}
      </div>
    );
  }

  return (
    <section aria-label="Explanation of your results" className="rounded-xl border border-card-line bg-surface p-4 shadow-sm sm:p-5">
      {view.kind === "consent" && (
        <Consent
          onAgree={() => {
            setAiConsent(true);
            run();
          }}
          onStandard={() => show(standardExplanation(facts))}
          onCancel={dismiss}
        />
      )}

      {view.kind === "loading" && (
        <div className="flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Writing your explanation…
          </p>
          <button type="button" onClick={dismiss} className={buttonClass("ghost", "px-2 py-1")}>
            Cancel
          </button>
        </div>
      )}

      {view.kind === "shown" && (
        <Shown
          explanation={view.explanation}
          facts={facts}
          notice={view.notice}
          onRetry={view.canRetry ? run : undefined}
          onTryAi={view.explanation.source === "standard" && !view.notice ? start : undefined}
          onTurnOffAi={consented ? () => { setAiConsent(false); dismiss(); } : undefined}
          onDismiss={dismiss}
        />
      )}
    </section>
  );
}

function Consent({ onAgree, onStandard, onCancel }: { onAgree: () => void; onStandard: () => void; onCancel: () => void }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-base font-bold text-ink">
        <ShieldCheck className="h-5 w-5 text-accent-ink" aria-hidden />
        Before you use AI explanations
      </h3>
      <p className="text-sm text-ink">
        To write the explanation, RuckOn sends this test&apos;s scores to an AI model through Vercel AI Gateway. Only this
        is sent:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
        <li>The scoring category: standard, age group (for example 22–26), and score column.</li>
        <li>Your five event results (deadlift weight, push-ups, and times).</li>
        <li>If you have one, the event results of your previous test in the same scoring category.</li>
      </ul>
      <p className="text-sm text-ink">
        Not sent: your name, exact age or date of birth, test dates, unit, profile, notes, or other saved tests. RuckOn
        doesn&apos;t store the request or the explanation. Your IP address is used, in hashed form, to enforce usage limits.
      </p>
      <p className="text-sm text-ink-2">
        AI can be wrong. Scores and pass or fail always come from the app&apos;s calculation, not the AI. You can turn AI
        explanations off at any time.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onAgree} className={buttonClass("primary")}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Agree and explain
        </button>
        <button type="button" onClick={onStandard} className={buttonClass("secondary")}>
          Use the standard explanation
        </button>
        <button type="button" onClick={onCancel} className={buttonClass("ghost")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Shown({
  explanation,
  facts,
  notice,
  onRetry,
  onTryAi,
  onTurnOffAi,
  onDismiss,
}: {
  explanation: Explanation;
  facts: Facts;
  notice: string | null;
  onRetry?: () => void;
  onTryAi?: () => void;
  onTurnOffAi?: () => void;
  onDismiss: () => void;
}) {
  const ai = explanation.source === "ai";
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 ref={heading} tabIndex={-1} className="text-base font-bold text-ink focus:outline-none">
            Your results explained
          </h3>
          <p className="mt-1">
            {ai ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-xs font-semibold text-ink">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                AI-generated wording · scores from the app
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-2">
                Standard explanation · written by RuckOn rules
              </span>
            )}
          </p>
        </div>
        <button type="button" onClick={onDismiss} className={buttonClass("ghost", "px-2 py-1")}>
          <X className="h-4 w-4" aria-hidden />
          Hide explanation
        </button>
      </div>

      {notice && (
        <p role="status" className="flex gap-2 rounded-lg border border-warn/50 bg-accent/10 p-3 text-sm text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="tabular-nums">
          <span className="text-xl font-bold text-ink">{facts.total}</span>
          <span className="text-ink-2"> / 500</span>
        </span>
        <PassFailBadge passed={facts.passed} />
        <span className="text-ink-2">
          {facts.standardLabel} standard · {facts.ageGroup} · {facts.columnLabel}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-ink">{explanation.summary}</p>

      {explanation.eventNotes.length > 0 && (
        <ul className="space-y-2">
          {explanation.eventNotes.map((note, i) => {
            const fact = facts.events.find((e) => e.event === note.event)!;
            return (
              <li key={`${note.event}-${i}`} className="rounded-lg border border-line bg-surface-2/50 p-3 text-sm">
                {ai && (
                  <p className="flex flex-wrap items-baseline justify-between gap-2 font-semibold text-ink">
                    {aftEventInfo[note.event].name}
                    <span className="text-xs font-medium text-ink-2 tabular-nums">
                      {fact.rawDisplay} · <EventPoints points={fact.points} minimum={facts.minEventPoints} /> points
                    </span>
                  </p>
                )}
                <p className={ai ? "mt-1 text-ink" : "text-ink"}>{note.text}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-line p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Compared with your last comparable test</p>
        {facts.comparison ? (
          <>
            <p className="mt-1 font-semibold tabular-nums text-ink">Total {formatSignedPoints(facts.comparison.totalChange)} points</p>
            {explanation.comparison && <p className="mt-1 text-ink">{explanation.comparison}</p>}
          </>
        ) : (
          <p className="mt-1 text-ink">
            {ai ? "There is no earlier saved test in the same scoring category, so points are not compared." : explanation.comparison}
          </p>
        )}
      </div>

      {explanation.references.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">Learn more</p>
          <ul className="mt-1 space-y-1.5 text-sm">
            {explanation.references.map((r) => {
              const ref = getReference(r.id);
              if (!ref) return null;
              return (
                <li key={r.id} className="flex gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                  <span>
                    <Link href={ref.href} className="font-semibold text-accent-ink underline underline-offset-2">
                      {ref.label}
                    </Link>
                    <span className="text-ink-2"> — {r.reason}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="flex gap-2 rounded-lg bg-surface-2/60 p-3 text-xs text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {READINESS_NOTE}
      </p>

      {(onRetry || onTryAi || onTurnOffAi) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {onRetry && (
            <button type="button" onClick={onRetry} className={buttonClass("secondary", "px-3 py-1.5")}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Try AI again
            </button>
          )}
          {onTryAi && (
            <button type="button" onClick={onTryAi} className={buttonClass("secondary", "px-3 py-1.5")}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Use an AI explanation
            </button>
          )}
          {onTurnOffAi && (
            <button type="button" onClick={onTurnOffAi} className="ml-auto text-xs font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
              Turn off AI explanations
            </button>
          )}
        </div>
      )}
    </div>
  );
}
