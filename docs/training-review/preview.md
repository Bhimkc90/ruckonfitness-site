# Training plans: reviewer Preview

A protected Vercel Preview with personalized training plans turned on, so a qualified reviewer can use the flow
that `review-package.md` describes. **Production is unchanged: personalized plans and AI explanations stay off
there**, and this Preview is not approval to release them.

| | |
|---|---|
| Preview URL | https://ruckonfitness-site-dzxeg7tex-ruckonfitness.vercel.app |
| Deployment | `dpl_5Nu27WnNCzG8joDkVM4cJ7theYTK`, Vercel target `preview` |
| Commit | `9b96783d46568b7e0c9f1e45691f1e47ca8b6fbb` (`main`, the same application code Production serves) |
| Template version | `starter-4wk-v3-draft (2026-10-20, not professionally reviewed)`. Same prescriptions as the 2026-10-05 text; the rule wording now says what maintenance does |
| Created | 20 Oct 2026 |

Earlier Previews from the same day (`…-2te0lxmvx-…`, `…-hnstkdk4w-…`, `…-73oapygjc-…`, and `…-2mp8powxp-…`) are
superseded. They remain protected, but they lack some of the fixes below. Send reviewers only the URL above.

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

### Fixed for review (commit `9b96783`)

1. **Review-path instructions.** The message no longer refers to "the checkboxes above". It now says: go back to
   the health check, clear the text box, then select the movements under "Movements you must avoid" on the
   Preferences step. Back on that screen now goes to the health check, where the text box is. `21`
2. **Progression explanations.** Each block now ends with a line generated from its own weeks 1–2 and weeks 3–4
   prescriptions, for example:
   - "Weeks 3–4: Hand-release push-up practice: 3 sets → 4 sets; 8-Count T Push-Up: 5 reps → up to 10 reps;
     Supine Chest Press: 2 rounds → 3 rounds, unless an earlier session was rated too hard or painful."
   - "Weeks 3–4: no change." on maintenance blocks.

   The plan notes also list "What changes in weeks 3–4" and "Stays the same in all four weeks". The rule text
   for hinge, kettlebell, push-up, press, plank, interval, and progression-gate assumptions now says maintenance
   stays the same. The prescriptions are unchanged. A test checks that no maintenance block is described as
   progressing across a matrix of baselines, equipment, and restrictions. `22`
3. **Pause after a pain report.** The plan page shows "Plan paused" with the existing guidance ("Stop training
   and talk to a medical provider or your unit's H2F team…"), and the header reads "paused after a pain report".
   - The "Next workout / Open workout" card becomes "Plan status: Paused" with the report date.
   - "New plan", and the dashboard's "Suggest training plan", aren't shown.
   - Sessions not yet recorded say they can't be recorded or moved while paused.
   - Every session and recorded workout stays visible with its record. Recorded sessions keep "Undo completion".
   - The dashboard card shows "Paused" and the same guidance.
   - No return-to-training rule was added. `23`–`25`

Verified in Chrome on the Preview built from the working tree (`…-2mp8powxp-…`), then again on the Preview built
from the commit above, with synthetic AFT-0003. Regression tests (1,977), type-check, lint, and the production
build pass. `review-package.md` was regenerated by its generator, not edited by hand.

### Still open

- After a pain report, starting a new plan is still possible by ending the plan, recording a new AFT, and
  starting a plan from the result page. Each of those routes goes through the health check's pain question.
- Reassessment timing isn't enforced (see decision 4).
- **Not tested:** screen readers (VoiceOver, NVDA), Safari and Firefox, and real phones.

## Decisions for the reviewer

These are RuckOn's current rules. None has professional approval. Each shows what the app does today, with
examples from AFT-0003 (382, Pass), and the decision needed. The full decision table is in `review-package.md` §1.

### 1. Progression when ratings are missing (`progressionGate`)

**Now:** only recorded ratings can hold progression. If no session in weeks 1–2 is recorded, weeks 3–4 still
"Build". For example, push-up practice goes from 3 to 4 sets for someone who logged nothing.

**Decide:** should missing records hold progression, allow it, or require a minimum number of recorded sessions?

### 2. "Hard" versus "Too hard" (`progressionGate`)

**Now:** "Hard" never holds progression, even if every session is rated Hard. One "Too hard" rating holds every
later week for the rest of the plan. For example, if week 1's strength session is rated Too hard and week 2's is
Easy, weeks 3 and 4 both stay at the weeks 1–2 level. Pain does the same and also pauses the plan. Undoing the
rating removes the hold.

**Decide:** is a single "Too hard" the right trigger? Should repeated "Hard" ratings count? Should a hold ever
end within the plan?

### 3. Scheduling after manual rescheduling (`scheduling`)

**Now:** the generated plan never puts hard sessions on consecutive days, but a user can move any session within
its plan week. In the 4-day example (Tue easy run, Thu speed and SDC skills, Sat easy run, Mon strength):
- moving the speed session to Sun Oct 25, next to Mon strength, is **allowed with a warning**;
- moving it onto Sat Oct 24, where a run already is, is **refused**;
- moving it outside week 1 is **refused**;
- moving a session onto the AFT date is allowed with a warning.

**Decide:** should back-to-back hard days after a move be blocked, allowed with a warning (current), or turn one
session into recovery?

### 4. Reassessment timing and taper (`reassessment`, `timeline`)

**Now:** any saved test dated on or after the plan's start can be linked. In testing, a second test on the same
day was accepted (+10 total). The app advises a practice AFT after week 4 but doesn't require it. There is no
taper: with an AFT date inside the plan, sessions before it are unchanged, a session on the AFT day is flagged
"skip it or move it", and sessions after it stay scheduled. The plan cites ATP 7-22.02 para 1-24 and refers the
user to their H2F team.

**Decide:** should linking be limited (for example, to tests after week 4)? Should a reviewed taper or test-week
rule exist, or other plan lengths?

### 5. Exercise substitutions for restrictions (`screening`, `pushAccessory`, §5)

**Now:**

| Restriction | What changes |
|---|---|
| Running | Runs become brisk walks; no 30:60 intervals or Shuttle Sprint |
| Jumping | Jumping exercises such as High Jumper are skipped and named |
| Lifting weights | No kettlebell, dumbbell, or barbell work; hinge practice uses Squat Bender and Back Bridge |
| Weight on hands | Push-Up and Extend and Flex are skipped; a Supine Chest Press (kettlebells) or Bench Press replaces push-up practice, and the plan says it doesn't train the event. With push-ups as the only focus and no press possible (no equipment, or lifting restricted), no plan is made |
| All four | No plan is made |

**Decide:** approve each substitution and mapping. For example, is Extend and Flex "weight on the hands"? Is a
lying press acceptable instead of push-ups? Are body-weight hinges enough when lifting is restricted?

### 6. After a pain report (`screening`)

**Now:** the plan pauses as described above. RuckOn sets no rule for resuming. The ways out are "Undo
completion" on the session where pain was recorded (meant for mistaken entries), or ending the plan and starting
a new one, which asks the pain question again.

**Decide:** is the pause wording adequate? Should undoing a pain record be allowed, or should the plan stay
paused? Should anything else be required before a new plan?

### Also in `review-package.md`

Loads and volumes (`loadedHinge`, `kettlebellCircuit`, `hrpPractice`, `plankPractice`, `intervals`), running caps
(`runningCap`, `maintenanceRun`), session mix (`focus`, `sessionMix`; for example, AFT-0003 on 3 days gets no SDC
session), time estimates (`durations`), and the disclaimers.

Record decisions with the template in `docs/evaluation/05-training-content-review.md`, against the commit above.
