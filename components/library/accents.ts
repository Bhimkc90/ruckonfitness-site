import type { OfficialDrillCategory } from "@/lib/library/types";

// Category accents for the library. Classes are written out in full so Tailwind generates them.
// Color is decoration only: every use sits next to a text label naming the category.
export type Accent = { text: string; bar: string; border: string; hoverBorder: string; soft: string; label: string };

export const accents: Record<OfficialDrillCategory | "app", Accent> = {
  "Preparation Drill": {
    text: "text-prep",
    bar: "bg-prep",
    border: "border-t-prep/70",
    hoverBorder: "hover:border-prep/60",
    soft: "border-prep/40 bg-prep/10 text-prep",
    label: "Preparation",
  },
  "Activity Drill": {
    text: "text-activity",
    bar: "bg-activity",
    border: "border-t-activity/70",
    hoverBorder: "hover:border-activity/60",
    soft: "border-activity/40 bg-activity/10 text-activity",
    label: "Conditioning",
  },
  "Recovery Drill": {
    text: "text-recovery",
    bar: "bg-recovery",
    border: "border-t-recovery/70",
    hoverBorder: "hover:border-recovery/60",
    soft: "border-recovery/40 bg-recovery/10 text-recovery",
    label: "Recovery",
  },
  app: {
    text: "text-ink-2",
    bar: "bg-ink-2",
    border: "border-t-ink-2/50",
    hoverBorder: "hover:border-ink-2/60",
    soft: "border-line-strong bg-surface-2 text-ink-2",
    label: "App category",
  },
};
