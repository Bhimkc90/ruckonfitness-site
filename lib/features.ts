// Release flags. Values are inlined at build time (NEXT_PUBLIC_*), so production builds that do not
// set the variable ship with the feature off.

// Training plans stay off in production until the assumptions in docs/training-plan-review.md are
// reviewed by a qualified professional. Enable locally with NEXT_PUBLIC_TRAINING_PLANS=enabled.
export const TRAINING_PLANS_ENABLED = process.env.NEXT_PUBLIC_TRAINING_PLANS === "enabled";
