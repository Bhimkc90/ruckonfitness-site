import { aftEventInfo } from "@/lib/aft/scoring";
import { PATHWAY_DECISIONS, pathwayStatusLabels, type PlanPathway } from "@/lib/training/pathways";
import { Card } from "@/components/ui/Card";

const statusClass: Record<PlanPathway["status"], string> = {
  draft: "bg-surface-2 text-ink",
  partial: "bg-accent/15 text-accent-ink",
  "pending-review": "bg-bad/10 text-bad",
};

const names = (codes: PlanPathway["focusEvents"]) => codes.map((c) => aftEventInfo[c].name).join(", ") || "none";

// The failure pattern the plan was built for, what the templates can and can't cover, and the review decisions
// still open for it. `openDecisions` expands the decisions (used on the reviewer scenario page).
export default function PathwayCard({ pathway, openDecisions = false }: { pathway: PlanPathway; openDecisions?: boolean }) {
  return (
    <Card title="Failure pattern and pathway" description="Read from the verified scores. Draft templates, not professionally reviewed.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">{pathway.label}</span>
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusClass[pathway.status]}`}>{pathway.status === "pending-review" ? "⚠ " : ""}{pathwayStatusLabels[pathway.status]}</span>
        <code className="text-xs text-ink-2">{pathway.id}</code>
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-2">Failed events</dt>
        <dd className="text-ink">{names(pathway.failedEvents)}</dd>
        <dt className="text-ink-2">Total</dt>
        <dd className="text-ink">{pathway.totalBelowMinimum ? "Below the minimum" : "Meets the minimum"}</dd>
        <dt className="text-ink-2">Focus (priority order)</dt>
        <dd className="text-ink">{names(pathway.focusEvents)}</dd>
        <dt className="text-ink-2">Maintained</dt>
        <dd className="text-ink">{names(pathway.maintainedEvents)}</dd>
      </dl>
      {pathway.emphasis.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-ink">Emphasis</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
            {pathway.emphasis.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
      <h3 className="mt-4 text-sm font-semibold text-ink">Status</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
        {pathway.statusReasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {pathway.decisions.length > 0 && (
        <details open={openDecisions} className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-ink">Review decisions open for this pathway ({pathway.decisions.length})</summary>
          <ul className="mt-2 space-y-2">
            {pathway.decisions.map((id) => {
              const d = PATHWAY_DECISIONS[id];
              return (
                <li key={id} className="rounded-lg border border-line p-2.5">
                  <p className="font-medium text-ink">
                    {d.title} <code className="text-xs font-normal text-ink-2">{id}</code>
                  </p>
                  <p className="mt-0.5 text-ink-2">
                    <span className="font-semibold text-ink">Now:</span> {d.now}
                  </p>
                  <p className="mt-0.5 text-ink-2">
                    <span className="font-semibold text-ink">Decide:</span> {d.decide}
                  </p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </Card>
  );
}
