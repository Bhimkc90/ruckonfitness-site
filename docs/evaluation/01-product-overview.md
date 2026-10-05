# 1. Product overview

RuckOn Fitness (https://ruckonfitness.com) is a free web app that helps an individual Soldier score, record and
prepare for the Army Fitness Test (AFT). It is unofficial and not endorsed by the U.S. Army.

## What it does

- **AFT calculator.** Scores the five events (3-Repetition Maximum Deadlift, Hand-Release Push-Up,
  Sprint-Drag-Carry, Plank, 2-Mile Run) from raw results, using the score tables effective 1 June 2025
  (`AFT_Scoring_Scales_250601.pdf`) and the general (300) and combat (350) standards published on army.mil.
- **History and dashboard.** Saved results, totals and per-event trends, and change since the last comparable test.
- **AFT guide.** Event standards, setup, faults and figures, cited to ATP 7-22.01, with links to official videos.
- **Exercise library.** Drills and exercises from ATP 7-22.02, with figures and paragraph citations.
- **Backup.** Export and import of the user's own data as a JSON file.

## What it does not do

- No accounts, sign-in, server database, or sync. All data stays in the user's browser.
- No unit, leader or roster views. It cannot be used to collect or report other Soldiers' scores.
- It does not record official AFT results and does not replace the official scorecard or any Army system.
- **AI explanations ("Explain my results") are off in production** (`NEXT_PUBLIC_AI_EXPLAIN` and `AI_EXPLAIN`).
  When released, they explain a verified result in plain language. They never set scores, give workouts or
  medical advice, or predict results. See `docs/ai-explanations.md`.
- **Personalized training plans are off in production** (`NEXT_PUBLIC_TRAINING_PLANS` in `lib/features.ts`).
  The public page shows clearly labeled, unreviewed examples only. See document 5.
- No medical, injury or profile advice.

## Approvals obtained

None. There is no Army endorsement, H2F or medical professional approval, security certification, or ATO.
