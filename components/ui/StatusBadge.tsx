import { CheckCircle2, XCircle } from "lucide-react";

// Pass/fail always pairs color with an icon and a word.
export function PassFailBadge({ passed, size = "sm" }: { passed: boolean; size?: "sm" | "lg" }) {
  const Icon = passed ? CheckCircle2 : XCircle;
  const sizing = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizing} ${
        passed ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
      }`}
    >
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
      {passed ? "Pass" : "Fail"}
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
      {children}
    </span>
  );
}
