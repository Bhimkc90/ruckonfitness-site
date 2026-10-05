# Training plans: review required before public release

Suggested training plans are built and tested but **off in production**. The flag is
`NEXT_PUBLIC_TRAINING_PLANS` in `lib/features.ts`, inlined at build time. Production builds don't set it.

While the flag is off, `/training-plan` shows three preview examples built by the same engine from synthetic
AFT results (`lib/training/samples.ts`): a slow 2-mile run, a low deadlift, and a slow SDC with short sessions.
They are labeled as unreviewed examples, and personalized plans, starting plans, and tracking stay unavailable.

To preview the full personalized flow locally:

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

Template version: `starter-4wk-v3-draft` (`lib/training/templates.ts`, `TEMPLATE_VERSION`). Plans already saved
keep the version and prescriptions they were created with.

**Exact prescriptions for sign-off:** `docs/training-review/review-package.md`. It is generated from the engine by
`lib/training/reviewPackage.ts`, and a test fails if it is out of date. It lists every block the engine produces
across a scenario matrix, with weeks 1–2 and 3–4 prescriptions, sources, rules, and a decision box for each
assumption.

## Items to review

Each item is in `ASSUMPTIONS` in `lib/training/templates.ts` and is shown to users with every plan.

| # | Area | Current rule | Question for the reviewer |
|---|------|--------------|---------------------------|
| 1 | Focus | Failed events are developed; otherwise the two lowest-scoring events (ties included, balanced when more than three tie or all score 100). | Is ordering emphasis by points appropriate, and is two the right number? |
| 1a | Session mix | Each week keeps one strength and one aerobic session; extra days go to focus events in priority order (deadlift/push-up/plank → strength, 2-mile run → running, SDC → speed, then a non-sprint SDC skills session). With 4+ days a weekly speed session is kept; with 5 days one is recovery. Two-day plans are strength plus running (or speed when the SDC is the top priority). | Is this allocation sensible for each weakness profile, and should any profile get a different mix? |
| 1b | Maintenance running | Runs for a maintained 2-mile run are capped at 20 minutes; a 2-mile run focus uses the full per-run cap for the reported range. | Is 20 minutes an appropriate maintenance ceiling? |
| 2 | Loaded hinge (barbell, hex bar, dumbbells) | 2 sets (weeks 1–2), then 3 sets (weeks 3–4) × 8–10 reps (10–12 with dumbbells) at RPE 6–7 (3–4 reps in reserve), 90 s rest. No maximum or percentage loads. | Are the volume, effort, and rest suitable for untrained and trained users with no coaching? |
| 3 | Kettlebell stations | Strength Training Circuit stations 1–2 (Sumo Squat, Straight-Leg Deadlift): 2 rounds, then 3 rounds of 1 minute, 60 s between rounds. | Is the progression suitable? The ATP lets Soldiers adjust the weight but gives no starting load. |
| 4 | HRP practice | 3 sets (weeks 1–2), then 4 sets of about half the baseline reps (clamped to 5–25; half of any baseline under 10), 60–90 s rest, RPE 6–7. | Is submaximal practice at half the baseline safe and useful? |
| 5 | Plank practice | 2 holds, then 3 holds of half the baseline time (clamped 20 s – 2:00), 60 s rest. | Same question for plank holds. |
| 6 | Running volume | Per-run cap from self-reported recent running: 10 / 20 / 25 / 30 min; weekly total never above the top of the reported range (30 / 60 / 120 / 120); no increase during the 4 weeks; no running without a reported base. | Are the caps conservative enough, and should the plan include any progression? |
| 7 | Sprint intervals | 30:60s: 4 repeats (3 if new) in weeks 1–2, 6 (4 if new) in weeks 3–4 at RPE 7; only with a running base, a place to run, and no running restriction. The ATP describes 30:60s as moderate to maximum speed; FM 7-22 Table 14-20 uses 60:120 × 10 at RPE 8 for unit Soldiers. | Is this dose suitable for self-directed users? |
| 8 | Time estimates | PD 10 min (condensed 5), RD 8, Four for the Core 7, MMD1 5, one round of CD1 + CD2 8. | Are the estimates realistic, so sessions fit the chosen length? |
| 9 | Progression gate | Weeks 3–4 use the build level only if no earlier session was rated too hard and no pain was reported; otherwise weeks 1–2 repeat. Pain shows a stop-and-consult banner. | Is this gate sufficient? |
| 10 | Scheduling | Strength, speed, and conditioning are hard; no two hard sessions on consecutive days; a hard session becomes recovery when the chosen days make that impossible. | Is the hard/easy classification right, especially for the easy run next to a hard day? |
| 11 | Reassessment and taper | After week 4, record a practice AFT and link it to the plan; it is compared with the plan's baseline copy (points only within the same scoring category). No session is changed before a scheduled AFT: ATP 7-22.02 para 1-24 schedules tests after recovery or a taper, but RuckOn's taper rule is unreviewed, so the plan cites the source and refers the user to their H2F team. | Is week-5 reassessment appropriate, and should a reviewed taper rule be added? |
| 12 | Screening | Current pain → no plan and a referral message. Any free-text instruction or profile detail → review path, no plan. Four movement restrictions (running, jumping, lifting weights, weight on hands) filter exercises by library tags. Weight on hands removes bodyweight pushing and Front Leaning Rest or Six-Point Stance exercises; loaded presses stay available. | Wording of the pain question and referral, and whether the restriction mapping (e.g. Vertical counted as jumping, Quadraplex and Extend and Flex as weight on hands, lying presses allowed) is correct. |

| 13 | Push accessory (new in v3) | Push-up development adds a loaded press when equipment allows and lifting isn't restricted: Supine Chest Press station with kettlebells (2, then 3 rounds of 1 minute; ATP 7-22.02 para 13-9) or Bench Press with a barbell or dumbbells (2, then 3 sets of 8–10 at RPE 6–7, 90 s rest, with a spotter; para 14-10, 14-12). With the weight-on-hands restriction the press replaces push-up practice, and the plan says it doesn't train the event. | Is a press appropriate for push-up development, and as a substitute when weight on the hands is restricted? |
| 14 | Plan length and timeline (new in v3) | Only a 4-week template exists. The AFT date shows the time available. If the AFT is sooner than 4 weeks, the plan is not shortened and no workload is added; sessions on or after the AFT date stay scheduled for afterward, and a session on the AFT day is flagged. | Should other reviewed plan lengths exist (for example 2 or 6 weeks), and what should happen when a test is sooner? |

## Status of the flow (5 Oct 2026)

Working in the local preview: choose a baseline → health check → preferences prefilled from Profile, which must
be confirmed → review (focus, rationale, limits, timeline, every session) → start → complete or undo sessions with
difficulty, pain, and notes → reschedule within the week (completions kept) → dashboard next workout and recorded
adherence → link a reassessment → create the next plan from it. Earlier plans keep their baselines, versions,
completions, and reassessments.

The "Explain my results" AI feature is separate and does not explain, generate, or alter plans. If AI explanations
of plans are added after this review, they may only restate verified plan facts and must stay behind this flag.

## Sourced elements

These come directly from Army publications and are cited in the app:

- Supine Chest Press as a Strength Training Circuit station (ATP 7-22.02 para 13-9) and Bench Press with a spotter (paras 14-10, 14-12).
- Preparation Drill at 10 repetitions and the condensed-time version (ATP 7-22.02 Table 1-1, p. 1-7).
- Recovery Drill holds of 20–30 s (ATP 7-22.02 ch. 16).
- Four for the Core holds (ATP 7-22.02 paras 4-14 – 4-18).
- Military Movement Drill 1 over a 25 m course (ATP 7-22.02 ch. 8).
- Conditioning Drills at 5–10 reps, building to 10 (ATP 7-22.02 paras 5-19 – 5-24, 1-21).
- Session order: preparation, activity, recovery (FM 7-22 paras 6-22 – 6-26).
- Load, repetition, and rest ranges (FM 7-22 Table 6-4) and the RPE scale (Table 6-3).
- Weekly features such as alternating strength and endurance days and weekly speed running (ATP 7-22.02 para 1-24).
- Remote Soldier schedule features and equipment (FM 7-22 para 14-59 – 14-60, Table 14-20).

## Personalization inputs

The plan uses the selected AFT result's raw results, points, scoring category, and pass/fail rule, together with the user's days, session length, equipment, experience, recent running, movement restrictions, and optional AFT date and target score. Equipment, a place to run, experience, and recent running must be answered explicitly because AFT scores can't establish them.

## Not included

- Adaptive coaching, automatic load increases, and any rehabilitation or profile interpretation.
- Accounts or cloud sync: plans and completions are stored in the browser (`ruckon.trainingPlans`), separate from AFT history (`ruckon.aftResults`).

## To enable after review

1. Update the templates and assumptions as the reviewer directs.
2. Change `TEMPLATE_VERSION`, regenerate the review package, and record the reviewer, date, and scope here, using
   the record template in `docs/evaluation/05-training-content-review.md`.
3. Set `NEXT_PUBLIC_TRAINING_PLANS=enabled` for the Vercel Production environment and redeploy.
