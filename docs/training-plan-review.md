# Training plans: review required before public release

Suggested training plans are built and tested but **off in production**. The flag is
`NEXT_PUBLIC_TRAINING_PLANS` in `lib/features.ts`, inlined at build time. Production builds don't set it.

To preview locally:

```bash
NEXT_PUBLIC_TRAINING_PLANS=enabled npm run dev
```

## Why the feature is gated

FM 7-22 (October 2020, incl. C2), p. 6-8, states that program design is completed by H2F performance
readiness experts and approved by the unit's command, driven by individual assessment. The exercise
instructions and many prescriptions are sourced from ATP 7-22.02 and FM 7-22. The rules that combine them
into a plan for any self-selected user are RuckOn assumptions. They need review by a qualified
professional, such as an H2F strength and conditioning coach or athletic trainer, with physical therapy
input for the screening items.

Template version: `starter-4wk-v1-draft` (`lib/training/templates.ts`, `TEMPLATE_VERSION`).

## Items to review

Each item is in `ASSUMPTIONS` in `lib/training/templates.ts` and is shown to users with every plan.

| # | Area | Current rule | Question for the reviewer |
|---|------|--------------|---------------------------|
| 1 | Focus | Failed events are developed; otherwise the two lowest-scoring events (ties included, balanced when more than three tie or all score 100). | Is ordering emphasis by points appropriate, and is two the right number? |
| 2 | Loaded hinge (barbell, hex bar, dumbbells) | 2 sets (weeks 1–2), then 3 sets (weeks 3–4) × 8–10 reps (10–12 with dumbbells) at RPE 6–7 (3–4 reps in reserve), 90 s rest. No maximum or percentage loads. | Are the volume, effort, and rest suitable for untrained and trained users with no coaching? |
| 3 | Kettlebell stations | Strength Training Circuit stations 1–2 (Sumo Squat, Straight-Leg Deadlift): 2 rounds, then 3 rounds of 1 minute, 60 s between rounds. | Is the progression suitable? The ATP lets Soldiers adjust the weight but gives no starting load. |
| 4 | HRP practice | 3 sets (weeks 1–2), then 4 sets of about half the baseline reps (clamped to 5–25; half of any baseline under 10), 60–90 s rest, RPE 6–7. | Is submaximal practice at half the baseline safe and useful? |
| 5 | Plank practice | 2 holds, then 3 holds of half the baseline time (clamped 20 s – 2:00), 60 s rest. | Same question for plank holds. |
| 6 | Running volume | Per-run cap from self-reported recent running: 10 / 20 / 25 / 30 min; weekly total never above the top of the reported range (30 / 60 / 120 / 120); no increase during the 4 weeks; no running without a reported base. | Are the caps conservative enough, and should the plan include any progression? |
| 7 | Sprint intervals | 30:60s: 4 repeats (3 if new) in weeks 1–2, 6 (4 if new) in weeks 3–4 at RPE 7; only with a running base, a place to run, and no running restriction. The ATP describes 30:60s as moderate to maximum speed; FM 7-22 Table 14-20 uses 60:120 × 10 at RPE 8 for unit Soldiers. | Is this dose suitable for self-directed users? |
| 8 | Time estimates | PD 10 min (condensed 5), RD 8, Four for the Core 7, MMD1 5, one round of CD1 + CD2 8. | Are the estimates realistic, so sessions fit the chosen length? |
| 9 | Progression gate | Weeks 3–4 use the build level only if no earlier session was rated too hard and no pain was reported; otherwise weeks 1–2 repeat. Pain shows a stop-and-consult banner. | Is this gate sufficient? |
| 10 | Scheduling | Strength, speed, and conditioning are hard; no two hard sessions on consecutive days; a hard session becomes recovery when the chosen days make that impossible. | Is the hard/easy classification right, especially for the easy run next to a hard day? |
| 11 | Reassessment | Practice AFT in week 5, or keep 1–2 days before a scheduled AFT light (ATP 7-22.02 para 1-24 schedules tests after recovery or a taper). | Is the guidance appropriate? |
| 12 | Screening | Current pain → no plan and a referral message. Any free-text instruction or profile detail → review path, no plan. Four movement restrictions (running, jumping, lifting weights, weight on hands) filter exercises by library tags. | Wording of the pain question and referral, and whether the restriction mapping (e.g. Vertical counted as jumping, Quadraplex and Extend and Flex as weight on hands) is correct. |

## Sourced elements

These come directly from Army publications and are cited in the app:

- Preparation Drill at 10 repetitions and the condensed-time version (ATP 7-22.02 Table 1-1, p. 1-7).
- Recovery Drill holds of 20–30 s (ATP 7-22.02 ch. 16).
- Four for the Core holds (ATP 7-22.02 paras 4-14 – 4-18).
- Military Movement Drill 1 over a 25 m course (ATP 7-22.02 ch. 8).
- Conditioning Drills at 5–10 reps, building to 10 (ATP 7-22.02 paras 5-19 – 5-24, 1-21).
- Session order: preparation, activity, recovery (FM 7-22 paras 6-22 – 6-26).
- Load, repetition, and rest ranges (FM 7-22 Table 6-4) and the RPE scale (Table 6-3).
- Weekly features such as alternating strength and endurance days and weekly speed running (ATP 7-22.02 para 1-24).
- Remote Soldier schedule features and equipment (FM 7-22 para 14-59 – 14-60, Table 14-20).

## Not included

- Adaptive coaching, automatic load increases, and any rehabilitation or profile interpretation.
- Accounts or cloud sync: plans and completions are stored in the browser (`ruckon.trainingPlans`), separate from AFT history (`ruckon.aftResults`).

## To enable after review

1. Update the templates and assumptions as the reviewer directs.
2. Change `TEMPLATE_VERSION` and record the reviewer, date, and scope here.
3. Set `NEXT_PUBLIC_TRAINING_PLANS=enabled` for the Vercel Production environment and redeploy.
