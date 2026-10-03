# 6. Pilot plan: small voluntary usability pilot

## Purpose and limits

The pilot tests **usability only**: can Soldiers use the calculator, history, guide, library and backup
correctly and without confusion? It does **not** test whether the app improves fitness or AFT scores.

- **Usability evidence** (this pilot): task completion, errors, time on task, ease ratings, comprehension of
  the disclaimers.
- **Training-effectiveness evidence** (not this pilot): would need reviewed training content, an authorized
  study design, a comparison group, enough participants, outcome measures over weeks, and safety monitoring.
  Nothing from this pilot should be described as showing better fitness or scores.

Ground rules:

- Voluntary, individual participation, on personal devices, outside duty requirements unless a sponsor
  authorizes otherwise. No incentives tied to scores.
- **Synthetic data only.** Participants use the provided fictional results, not their own scores, and no names,
  DoD IDs, units or health information are entered.
- Training plans stay off. The app is presented as unofficial, with no Army endorsement or ATO.
- Any pilot run in an official unit setting needs the unit's and a sponsor's approval first (see document 7).
- Feedback is collected without names or identifying details, and stored by the facilitator, not in the app.

## Phase 1: synthetic-data demo (facilitator, about 15 minutes)

Show the calculator, history, dashboard, guide, library and backup using fictional results such as
"Test Soldier 101" from `docs/testing/aft-calculator-cases.csv`. State the limits above out loud.

## Phase 2: usability tasks (participant, about 20 minutes, 5–8 participants)

Give each participant a card with fictional results.

1. Score a full test for a fictional 24-year-old, general standard, male column, and say whether it passes.
2. Score the same raw results under the combat standard and explain the difference.
3. Find why a failing test failed (which event, by how much).
4. Save two results, then find the change between them on the dashboard.
5. Find the standard and common faults for the Hand-Release Push-Up in the AFT guide.
6. Find an exercise for the plank in the library and open its source reference.
7. Export a backup, delete the history, and restore it from the backup.
8. Say where the data is stored and who can see it.

## Feedback questions

1. How easy was each task? (1 = very hard, 5 = very easy)
2. Was anything confusing or wrong? What did you expect instead?
3. Did any score look different from what you expected? Which one?
4. Where is your data stored, and who can see it? (checks comprehension)
5. Is this app official or endorsed by the Army? (checks comprehension)
6. Would you use it to prepare for the AFT? Why or why not?
7. What is missing or unnecessary?
8. System Usability Scale (10 standard items).

## Success criteria

| Measure | Target |
|---|---|
| Task completion without help | ≥ 85% of tasks across participants; tasks 1, 3 and 7 by every participant |
| Scoring discrepancies | 0 confirmed (any reported mismatch is checked against the printed tables) |
| Disclaimer comprehension (questions 4–5) | ≥ 90% correct |
| Mean ease rating | ≥ 4.0 per task |
| System Usability Scale | ≥ 70 average |
| Data or privacy incidents | 0 (no real personal data entered or collected) |
| Critical defects | 0 open at the end of the pilot |

Results are reported as usability findings with the number of participants. Fixes are tracked as issues and
retested.
