// Release flags. Values are inlined at build time (NEXT_PUBLIC_*), so production builds that do not
// set the variable ship with the feature off.

// Training plans stay off in production until the assumptions in docs/training-plan-review.md are
// reviewed by a qualified professional. Enable locally with NEXT_PUBLIC_TRAINING_PLANS=enabled.
export const TRAINING_PLANS_ENABLED = process.env.NEXT_PUBLIC_TRAINING_PLANS === "enabled";

// "Explain my results" (AI explanations) stays off in production until the AI provider, usage limits, and
// release checks in docs/ai-explanations.md are complete. It needs both flags: NEXT_PUBLIC_AI_EXPLAIN=enabled
// shows the feature, and the server-only AI_EXPLAIN=enabled opens /api/explain.
export const AI_EXPLAIN_ENABLED = process.env.NEXT_PUBLIC_AI_EXPLAIN === "enabled";

// The reviewer scenario page (/training-plan/scenarios): synthetic baselines for every failure pattern. Server-only:
// it needs the training-plan flag and a non-Production Vercel environment, so it stays off in Production even after
// plans are released. VERCEL_ENV isn't set locally, where it follows the training-plan flag.
export const TRAINING_SCENARIOS_ENABLED = TRAINING_PLANS_ENABLED && process.env.VERCEL_ENV !== "production";
