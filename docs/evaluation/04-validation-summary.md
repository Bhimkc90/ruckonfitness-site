# 4. Validation summary

This covers **calculation accuracy only**. It says nothing about whether the app improves fitness or AFT
results (see document 6 on separating usability from training effectiveness).

## Scoring sources

| Rule | Source |
|---|---|
| Event points by age group and sex column | *Army Fitness Test Score Tables*, `AFT_Scoring_Scales_250601.pdf` (approved 15 May 2025, effective 1 June 2025). A copy is served at `/docs/AFT_Scoring_Scales_250601.pdf` |
| 60 points minimum per event | ATP 7-22.01, para. 2-30 |
| General standard 300 total; combat standard 350 total, sex-neutral | army.mil, 21 April 2025 article and https://www.army.mil/aft/ |
| Event standards, faults, setup | ATP 7-22.01, chapter 2 and appendix E |

## Independent check

1. The PDF's text was extracted with a separate script (`scripts/aft-fixtures/extract-pdf-text.swift`, output
   in `docs/testing/source/`).
2. `scripts/aft-fixtures/generate.mjs` parses that text into `lib/aft/fixtures/score-tables.reference.json`
   and computes every expected result itself. It does not import the app's scoring code or tables.
3. `lib/aft/fixtures.test.ts` checks the app against the dataset, and checks that every row of the app's
   tables equals the independent transcription for every event, age group and column.

| Set | Cases |
|---|---|
| Full-test scoring cases (all 10 age groups × 2 standards × 2 sexes × 14 scenarios) | 560 |
| Scenarios recorded as mathematically impossible | 20 |
| Single-event boundary cases (at, just above and just below table rows) | 952 |
| Time conversion round trips | 10 |
| Form validation cases | 43 |
| Age-boundary cases | 60 (inside the full-test set) |

Latest run (3 Oct 2026, Next 16.3.8): **1,899 tests passed** in 11 files; 1,777 of them in `lib/aft`.
Details: `docs/testing/aft-calculator-coverage.md`; data as CSV in `docs/testing/aft-calculator-cases.csv`.

## Gaps and limits

- **Same source document.** The app and the check both come from the same PDF. The check catches transcription
  and logic errors, but not a misreading of the PDF that both share, or a newer table edition. A person
  should compare a sample of results against the printed tables and the official scorecard.
- **Interpretations.** The oldest group is labeled "Over 62" in the PDF and treated as 62 and older; deadlift
  weights between 10-lb rows earn the highest row met; times are whole seconds. These should be confirmed by
  an AFT subject-matter expert.
- **Not covered:** alternate aerobic events (go/no-go), profiles, and any grader procedures. The calculator
  does not support them.
- **Not validated against official records.** No real Soldier scores were used, by design.
- **Future table changes** require updating the tables, the reference transcription, and the version label.
