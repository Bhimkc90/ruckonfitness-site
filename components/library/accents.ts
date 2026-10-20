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

// Tile tones: a pale tint behind dark labels, with the stronger color on the icon, border, and selected state.
// Selection is also shown by a checkmark, so color is never the only signal.
export type ToneName = "teal" | "blue" | "amber" | "violet" | "coral" | "neutral";
export type Tone = { tile: string; hover: string; selected: string; icon: string; badge: string; bar: string };

export const tones: Record<ToneName, Tone> = {
  teal: {
    tile: "border-prep/30 bg-prep/8",
    hover: "hover:border-prep hover:bg-prep/12",
    selected: "border-prep bg-prep/15 ring-1 ring-prep",
    icon: "bg-prep/15 text-prep",
    badge: "bg-prep text-surface",
    bar: "bg-prep",
  },
  blue: {
    tile: "border-tone-blue/30 bg-tone-blue/8",
    hover: "hover:border-tone-blue hover:bg-tone-blue/12",
    selected: "border-tone-blue bg-tone-blue/15 ring-1 ring-tone-blue",
    icon: "bg-tone-blue/15 text-tone-blue",
    badge: "bg-tone-blue text-surface",
    bar: "bg-tone-blue",
  },
  amber: {
    tile: "border-activity/30 bg-activity/8",
    hover: "hover:border-activity hover:bg-activity/12",
    selected: "border-activity bg-activity/15 ring-1 ring-activity",
    icon: "bg-activity/15 text-activity",
    badge: "bg-activity text-surface",
    bar: "bg-activity",
  },
  violet: {
    tile: "border-recovery/30 bg-recovery/8",
    hover: "hover:border-recovery hover:bg-recovery/12",
    selected: "border-recovery bg-recovery/15 ring-1 ring-recovery",
    icon: "bg-recovery/15 text-recovery",
    badge: "bg-recovery text-surface",
    bar: "bg-recovery",
  },
  coral: {
    tile: "border-tone-coral/30 bg-tone-coral/8",
    hover: "hover:border-tone-coral hover:bg-tone-coral/12",
    selected: "border-tone-coral bg-tone-coral/15 ring-1 ring-tone-coral",
    icon: "bg-tone-coral/15 text-tone-coral",
    badge: "bg-tone-coral text-surface",
    bar: "bg-tone-coral",
  },
  neutral: {
    tile: "border-card-line bg-card",
    hover: "hover:border-ink hover:bg-card-hover",
    selected: "border-ink bg-surface-2 ring-1 ring-ink",
    icon: "bg-surface-2 text-ink",
    badge: "bg-ink text-surface",
    bar: "bg-ink-2",
  },
};

export const categoryTone: Record<OfficialDrillCategory, ToneName> = {
  "Preparation Drill": "teal",
  "Activity Drill": "amber",
  "Recovery Drill": "violet",
};
