# Training plans: reviewer Preview

A protected Vercel Preview with personalized training plans turned on, so a qualified reviewer can use the flow
that `review-package.md` describes. **Production is unchanged: personalized plans and AI explanations stay off
there**, and this Preview is not approval to release them.

| | |
|---|---|
| Preview URL | https://ruckonfitness-site-73oapygjc-ruckonfitness.vercel.app |
| Deployment | `dpl_xXY7P3bfVRQx9QdqMmhh2rQ4thKM`, Vercel target `preview` |
| Commit | `99b96b659f1c0452aec06c80a223ffd2b6cef8e0` (`main`, the same application code Production serves) |
| Template version | `starter-4wk-v3-draft (2026-10-05, not professionally reviewed)` |
| Created | 20 Oct 2026 |

Earlier Previews from the same day (`…-2te0lxmvx-…` and `…-hnstkdk4w-…`) are superseded. They remain protected,
but they don't have the focus fixes below. Send reviewers only the URL above.

## How this Preview is built

The project's Preview environment variables:

| Variable | Preview value | Production |
|---|---|---|
| `NEXT_PUBLIC_TRAINING_PLANS` | `enabled` | unset (off) |
| `NEXT_PUBLIC_AI_EXPLAIN` | `disabled` | unset (off) |
| `AI_EXPLAIN` | `disabled` | unset (off) |
| `AI_RATE_LIMIT_SALT` | kept as it was (secret, not shown) | unset |

Because the AI flags are off in the Preview environment itself, any Preview build hides "Explain my results",
and `/api/explain` returns 404 (`disabled`) instead of the 503 it returned without a rate-limit store. No
per-deployment overrides are needed. To rebuild after a change:

```bash
vercel deploy --target=preview
```

## Access

The project uses Vercel Authentication for every deployment except the custom domains. Anyone without access is
redirected to a Vercel login (anonymous request: `302` to `vercel.com/sso-api`). The Preview is not public.

To give one selected reviewer access without making it public:

1. The reviewer creates or signs in to a free Vercel account and opens the Preview URL.
2. On the "no access" page they choose **Request access**. The project owner gets an email and a Vercel notification.
3. The owner approves it under **Project → Settings → Deployment Protection → Requests**, or from the share dialog on
   the deployment page. Access can be revoked there under **Access** at any time.

On the Hobby plan only **one** external user can be granted access per account. A second reviewer would need a
Pro plan, or the first reviewer's access revoked.

Avoid a Shareable Link for this: it lets anyone holding the URL in without signing in.

The reviewer's data stays in their own browser (local storage). Use made-up results, for example from
`docs/testing/aft-calculator-cases.csv`, and never real Soldier data.

## Technical verification (20 Oct 2026)

This checks that the implementation follows the documented rules in `docs/training-plan-review.md`. It does not
check whether those rules are suitable; that is the professional review.

Synthetic case **AFT-0003** (age 19, male, General: MDL 250 lb, HRP 29, SDC 1:57, PLK 2:51, 2MR 18:54; expected
382, Pass) was used throughout. Screenshots are in `preview-2026-10-20/`.

### Engine, all inputs

`lib/training/matrix.test.ts` generates plans for:

- every weekday combination for 2, 3, 4, and 5 days (112 schedules), with three start weekdays and six baseline
  profiles;
- every subset of the four restrictions, crossed with four equipment answers, five running volumes, running
  access yes/no, the six baselines, and one schedule per day count.

It checks each plan against the documented rules:

- session count and weekdays;
- no hard sessions on consecutive dates, including across week boundaries;
- the 2-day mix, the weekly speed session at 4+ days, and the recovery session at 5 days;
- sessions within the chosen length;
- running caps, per run and per week, the 20-minute maintenance cap, and no running without a base, a place to
  run, and no restriction;
- no restricted exercise and no exercise needing equipment the user lacks;
- plans refused only in the two documented cases.

It also checks four progression-gate and reassessment cases:

- easy, about-right, and hard ratings don't hold progression;
- a week-3 too-hard or pain rating holds week 4 only;
- other plans' ratings are ignored;
- linking a reassessment leaves the stored baseline byte-identical.

**All pass.** A deliberately broken copy of the checks failed as expected, which confirms they can detect violations.

### Browser, on the Preview

| Path | Result | Screenshot |
|---|---|---|
| Enter → calculate → save | 81/72/76/85/68 = **382, Pass**; saved; no "Explain my results" button | `01`–`03` |
| Plan wizard → start | Baseline, health check, preferences, review, start | `04`–`09` |
| Complete a workout | Blocked for a future date; moved within the week, then completed | `10`, `11` |
| Dashboard adherence | 1 / 1 completed of scheduled, 1 / 3 this week, next workout shown | `12`, `13` |
| **Pain = Yes** | Referral shown, Continue disabled, no plan possible | `15` |
| **Free-text instructions** | "Review needed before a plan", no plan | `16` |
| **All four restrictions** | "RuckOn can't build a safe plan for these constraints" | — |
| **No running** | Brisk walks replace runs, no run, sprint, or Shuttle Sprint items, limitation stated | — |
| **No jumping** | High Jumper listed under "Skip for your restrictions" | — |
| **No lifting** | No kettlebell or loaded items; body-weight hinge practice | — |
| **No weight on hands** | Push-Up and Extend and Flex skipped; Supine Chest Press replaces push-up practice | — |
| **2 days** (Tue, Sat) | Strength + easy run; 8 sessions; about 20 min running a week | — |
| **4 days** (Mon, Tue, Thu, Sat) | 2 easy runs, speed and SDC skills, strength; no back-to-back hard days; 16 sessions | — |
| **5 days** (Mon, Tue, Wed, Fri, Sat) | Adds a recovery session; no back-to-back hard days; 20 sessions | — |
| **Weeks 3–4, no ratings** | "Build": push-up practice 3 → 4 sets, press 2 → 3 rounds; plank holds 1:26 (half of 2:51) | — |
| **Week-1 session rated Too hard** | Weeks 3–4 "Holding at the foundation level", week 1–2 values, notice shown | `17` |
| **Rated Hard (undo, re-rate)** | Weeks 3–4 back to "Build" | — |
| **Easy + pain** | Weeks 3–4 held; banner: stop training and talk to a provider or H2F team | `18` |
| **Reassessment** | Second synthetic AFT (HRP 33, 2MR 18:00 = 392) linked; baseline snapshot byte-identical; changes +4 reps, 0:54 faster, total +10 | `19` |
| **Keyboard** | Calculator, save, wizard, and start plan completed by keyboard. Logical tab order, visible focus ring, arrow keys in radio groups, Enter and Space activate controls | — |
| **Phone, 390 × 844** | No horizontal scrolling on calculator, results, all wizard steps, plan, dashboard, and history | `20-mobile-*` |
| Access | Anonymous request returns 302 to Vercel login | — |
| AI | Not shown in the UI; `POST /api/explain` returns 404 `disabled` | — |
| Production | Anonymous: plans show "Preview example · review pending"; `/api/explain` 404; no Production env vars | `14` |

The phone check used headless Chrome at 390 × 844, against a local production build of the same commit with the
same flags. The desktop Chrome window could not be resized to phone width.

### Fixed during verification (commit `99b96b6`)

1. **Focus lost after saving a result.** The Save button was replaced by its confirmation, so focus fell to the
   page body, and the confirmation might not be announced. Focus now moves to the confirmation
   (`components/aft/AftCalculator.tsx`). This also applies to the public calculator.
2. **Focus lost between plan-wizard steps.** Each step replaced the last, with no cue for screen readers. Focus
   now moves to the new step, which is announced as "Step N of 4: name", and scrolls it into view
   (`components/training/PlanWizard.tsx`).

Both were confirmed in Chrome on this Preview after the rebuild.

### Unresolved (reported, not changed)

These involve wording or behavior under professional review, so they were left as they are:

1. **The review-path message says "If the checkboxes above fully cover your instructions…".** There are no
   checkboxes on that screen. Its Back button goes to Preferences, while the text box is on Health check.
2. **After a pain report, the plan still offers "Next workout / Open workout"** next to the "Stop training"
   banner, and sessions can still be completed. The documented rule only requires the banner.
3. **Assumption text vs prescriptions.** The assumption text shown with every plan says kettlebell stations go
   2 → 3 rounds, plank practice 2 → 3 holds, and intervals 4 → 6 repeats. But *maintenance* blocks stay at the
   weeks 1–2 level (kettlebell maintenance 2 rounds, plank maintenance 2 holds, intervals for a maintained SDC
   4 repeats). `review-package.md` §3 shows the exact prescriptions ("same" in weeks 3–4).
4. **Reassessment timing isn't enforced.** Any saved test on or after the plan start can be linked, including
   one from the same day. The app advises recording it after week 4 but doesn't require it.
5. **Not tested:** screen readers (VoiceOver, NVDA), Safari and Firefox, and real phones.

## Questions for the reviewer

The full list with decision boxes is in `review-package.md` §1. These came up in testing:

1. **`focus`, `sessionMix`**: a 382-point pass with no failed events got 2-mile-run and push-up focus, and **no
   SDC session** with 3 days (SDC 76 was maintained through strength sessions only). Is that acceptable?
2. **`runningCap`, `maintenanceRun`**: with 31–60 min/week reported, the plan schedules about 40 minutes of
   running a week (20 with 2 days), with no increase over 4 weeks. Is that right for a 2-mile-run focus?
3. **`durations`**: easy-run sessions are shown as about 38 min, strength as about 43 min, and speed as about
   30 min, against a 45-minute choice. Are the Preparation and Recovery Drill times realistic?
4. **`scheduling`**: users can move a session anywhere within its week. A move that puts two hard sessions on
   back-to-back days is allowed with a warning, not blocked. Should it be blocked?
5. **`progressionGate`**: only "Too hard" or pain holds progression; "Hard" doesn't, and unrecorded sessions
   don't. Is that sufficient?
6. **`kettlebellCircuit`, `plankPractice`, `intervals`**: should maintenance blocks progress in weeks 3–4? If
   not, should the assumption text say they don't (unresolved item 3)?
7. **`screening`**: is the single pain question and its referral wording adequate? After a pain report, should
   the plan stop offering workouts (unresolved item 2)? Should the review-path message be reworded (item 1)? Is
   the restriction mapping in §5 correct (for example, Extend and Flex counts as weight on hands, and lying
   presses are allowed)?
8. **`reassessment`, `timeline`**: should linking be limited to tests after week 4? Is a 4-week template with no
   taper acceptable for release?
9. **Disclaimers**: is the "general suggestion, not an Army-prescribed program" text and the start-plan
   acknowledgement sufficient?

Record decisions with the template in `docs/evaluation/05-training-content-review.md`, against the commit above.
