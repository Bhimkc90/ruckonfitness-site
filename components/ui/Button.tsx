import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "border border-accent bg-accent text-black hover:border-accent-hover hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

// Segmented toggle (aria-pressed buttons in a bordered group). The selected option is yellow with black text.
export const segmentGroupClass = "flex flex-wrap gap-1 rounded-lg border border-line-strong bg-surface p-0.5";

export function segmentClass(selected: boolean) {
  return `rounded-md px-3 py-1.5 text-sm transition-colors ${
    selected ? "bg-accent font-semibold text-black" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
  }`;
}
