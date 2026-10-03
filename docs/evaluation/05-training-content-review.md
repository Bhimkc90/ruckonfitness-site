# 5. Training-content review

## Current state

| Content | Source | Status |
|---|---|---|
| AFT guide (standards, setup, faults, figures) | ATP 7-22.01, cited by paragraph and page | Public; needs AFT SME confirmation |
| Exercise library (drills, exercises, figures) | ATP 7-22.02, cited by paragraph and figure | Public; needs H2F review of wording and selection |
| Official AFT videos | Linked to the Army's YouTube channel, not embedded | Public |
| Personalized training plans | RuckOn rules that combine ATP 7-22.02 and FM 7-22 content | **Off in production.** Only labeled, unreviewed examples are shown |

FM 7-22 (p. 6-8) says program design is done by H2F performance readiness experts and approved by the
unit's command. That is why plans stay gated: the rules that build a plan for a self-selected user are RuckOn's
own assumptions.

## Decisions pending

The full list, with the current rule and the question for each, is in `docs/training-plan-review.md`.
In short:

1. How events are prioritized and how sessions are allocated across the week.
2. Loads, sets, reps, rest and effort (RPE) for hinge, kettlebell, push-up and plank practice.
3. Running caps and whether to progress them; sprint interval dose for self-directed users.
4. Session time estimates.
5. The progression gate (too-hard ratings and pain stop progression).
6. Hard/easy scheduling and reassessment timing.
7. Screening: the pain question, referral wording, and how restrictions filter exercises.
8. Also to confirm: that the figures taken from ATP 7-22.01 and ATP 7-22.02 may be reproduced (distribution
   statement), and that the library selection and wording are accurate.

## Reviewer qualifications

At least one of the following, and ideally both a performance and a clinical reviewer:

- H2F strength and conditioning coach (for example CSCS) or Master Fitness Trainer with H2F experience, for
  programming items 1–6.
- Athletic trainer or physical therapist, for screening, pain and restriction items (7).
- AFT grader or AFT subject-matter expert, for the AFT guide and scoring interpretations in document 4.

The reviewer should not be the developer. Reviews are recorded per template version; any change to templates
or assumptions needs a new review.

## Review record template

Copy one block per review into `docs/training-plan-review.md`.

```text
Review ID:
Date:
Reviewer name:
Role and qualifications:
Organization (if reviewing in an official capacity, and whether they are authorized to):
Content reviewed: (template version, e.g. starter-4wk-v2-draft; AFT guide; library; scoring interpretations)
Commit reviewed:

Item | Decision (approve / change / reject) | Required change | Rationale or source
1    |                                      |                 |
...

Conditions or limits on use:
Items not reviewed:
Changes made after review (commit):
Re-review required? (yes/no, why)
Reviewer sign-off:
```

The training-plan flag may be turned on only after all items are approved or changed as directed, the
template version is updated, and the record is filed (`docs/training-plan-review.md`, "To enable after review").
