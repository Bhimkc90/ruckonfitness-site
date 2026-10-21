# Training plans: AFT failure-pattern coverage

Template version `starter-4wk-v4-draft (2026-10-20, not professionally reviewed)`. **Nothing here is professionally
reviewed.** "Draft available" means a plan is built only from the existing draft templates, which still need the
review in `review-package.md`. Personalized plans and AI stay off in Production.

Failures come from the scoring engine (`meetsEventMinimum`, `meetsTotalMinimum`, and `failedEvents` in
`lib/aft/scoring.ts`, which `scoreAft` uses too). No pass threshold is repeated in the training code. The pathway
for a plan is computed by `lib/training/pathways.ts` and stored with the plan (`PlanDraft.pathway`).

## Coverage

Defaults for the status column: 3 days (Mon, Wed, Fri), 45 minutes, kettlebells, a place to run, some experience,
31–60 minutes of recent running, no restrictions. Other answers can change a status, for example to *Partial*
without equipment or recent running. The scenario page shows each one live.

| # | Pattern | Status | Emphasis delivered | Open decisions |
|---|---|---|---|---|
| 1 | Deadlift only | Draft available | Loaded hinge or kettlebell hinge-and-squat development in both strength sessions; body-weight hinge only without equipment or with a lifting restriction (*Partial*) | `mdl-early-weeks`, `strength-allocation` |
| 2 | Push-ups only | Draft available | HRP practice at half the baseline, 8-Count T Push-Up, loaded press; press-only with the weight-on-hands restriction (*Partial*); no plan without a press option | `strength-allocation` |
| 3 | SDC only | Partial | Speed session (MMD1, 30:60 intervals), Step-Up station with kettlebells; conditioning drills without a running base. No drag or carry work | `sdc-drag-carry`, `sdc-step-up` |
| 4 | Plank only | Draft available | Plank holds at half the baseline plus Four for the Core in both strength sessions | `strength-allocation` |
| 5 | 2-mile run only | Draft available | Two easy runs a week at the full per-run cap for reported running; walks only with no running base or access (*Partial*) | `run-progression` |
| 6 | Total only (combat) | Draft available | The two lowest-scoring events developed; others maintained. Impossible on the general standard (5 × 60 = 300) | `total-only` |
| 7 | Two events (10 pairs) | Draft available, or Partial with the SDC | Both events developed; from 3 days each failed event has a session; at 2 days, SDC + 2-mile run can't both be covered (*Partial*, stated) | `focus-order`, `pair-overlap`, plus each event's own |
| 8 | Three, four, or five events (16 sets) | **Pending review: can't be started** | Structure shown: every failed event developed and covered from 3 days, maintenance for the rest | `multiple-workload`, `experience`, `focus-order`, plus each event's own |
| 9 | High total, one event failed | Same as the single-event pathway | The failed event is focus 1 regardless of the total; tested for each event with totals of 438–453 | as 1–5 |

All 32 five-event pass/fail patterns are represented with valid raw inputs: both far below (0–40 points) and just
below (40–59 points) the minimum.

## What changed (v3 → v4)

1. **Session mix.** Extra days first add any failed event's session type the week doesn't have, then follow
   priority order. Previously a failed SDC got no session at 3 days whenever the plank, the 2-mile run, or another
   lower-scoring event came first (for example SDC + plank gave strength, run, strength). Single-event plans are
   unchanged. With 2 days the second session is the highest-priority non-strength focus (before: only if it was
   the top priority).
2. **Uncovered failed events** are named in the plan's limits. This happens at 2 days with SDC and 2-mile run
   both failed, when a block doesn't fit the session length, or when consecutive weekdays turn a hard session into
   recovery.
3. **SDC leg strength.** With kettlebells, SDC development adds the 8-Count Step-Up (Strength Training Circuit
   station 4, ATP 7-22.02 para 13-6) at the existing kettlebell station dose: 2 rounds, then 3. It's dropped, with a
   stated limit, when it doesn't fit (for example in 30-minute sessions). New assumption `sdcStepUp`.
4. **Pathway record** on each new plan: pattern, status, focus and maintained events, emphasis, and open decisions.
   Plans saved earlier have no pathway and are unchanged; they keep their template version and prescriptions.
5. **Three or more failures can't be started.** The wizard shows the full plan, then "This plan can't be started
   yet" with the open decision. No new dose or workload rule was invented to fill the gap.
6. **Missing ratings.** Weeks 3–4 now say how many earlier sessions were recorded and that unrecorded sessions
   don't show readiness. The rule itself (only too-hard or pain ratings hold progression) is unchanged and
   pending review.
7. **Reviewer scenario page** at `/training-plan/scenarios`; see `preview.md`.

## Templates reused

No new prescriptions: Preparation and Recovery Drills, Four for the Core, MMD1, Conditioning Drills 1–2, loaded
hinge (barbell, hex bar, or dumbbells), kettlebell stations (Sumo Squat, Straight-Leg Deadlift, Supine Chest Press,
and now Step-Up), Bench Press, HRP and plank practice, 30:60 intervals, easy runs, and walks. The Step-Up reuses the
kettlebell station dose. Sources are listed with each block in `review-package.md`.

## Substitutions

Each one is stated in the plan:

- No equipment, or a lifting restriction: body-weight hinge practice (Squat Bender, Back Bridge). It doesn't load
  the deadlift.
- Weight on the hands: a lying press replaces push-ups. It doesn't train the event.
- No running base, access, or permission: walks and non-sprint conditioning drills. They can't fully train the
  2-mile run or SDC.
- Step-Up: not a drag or carry. The library's sourced substitute (Forward Lunge) appears under "How to do it and
  substitutes".

## Not decided by RuckOn

These are listed as review decisions in the plan, on the scenario page, and in `review-package.md` §7:

- order of multiple failures;
- deadlift development in weeks 1–2;
- strength-event allocation;
- drag and carry practice;
- the Step-Up;
- running progression;
- return to running;
- total-only targeting;
- overlapping fatigue in pairs;
- workload for three or more failures;
- uncovered events at 2 days;
- the effect of experience.

## Technical verification versus professional validation

The tests check that the code does what this document says. They don't check that it is suitable.

`lib/training/pathways.test.ts` covers:

- all 32 patterns, far below and just below the minimum;
- total-only failure on the combat standard, and its impossibility on the general standard;
- that high totals never hide a failure;
- distinct content for the 5 single failures and the 10 pairs;
- that schedule, equipment, experience, length, and recent running change the plan;
- coverage of every failed event from 3 days;
- *Partial* and *Pending review* statuses, and the refusal cases;
- that pain and free-text screening run before any pathway;
- that every scenario matches its pattern;
- storage compatibility with plans saved before v4.

`lib/training/matrix.test.ts` checks the documented scheduling, time, running, equipment, and restriction rules for
all 32 patterns and the total-only case. That is 4 schedules × 3 lengths × 4 equipment sets × 5 restriction
settings × 2 running answers.
