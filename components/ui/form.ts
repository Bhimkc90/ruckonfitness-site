// Shared form-control styles. White fields with a visible border; focus darkens the border and adds a yellow ring,
// so focus never relies on yellow alone.
export const fieldFocus = "focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent";

// Full width within its grid column, but never wider than 32rem on large screens.
export const inputClass = `mt-1.5 block w-full max-w-lg rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-2/70 ${fieldFocus}`;
