# 2. Architecture and data flow

## Architecture

- Next.js 16.3.8 App Router. Every route is prerendered static HTML plus client-side JavaScript.
- There are no server actions, middleware, databases, accounts, or authentication. One API route,
  `POST /api/explain` (AI explanations), exists but is **off in production** and returns 404 until released
  (`docs/ai-explanations.md`).
- Hosting: Vercel (project `ruckonfitness-site`, production branch `main`, custom domain `ruckonfitness.com`).
- Source: public GitHub repository. Images, fonts and the score-table PDF are served from the same origin.

## What the user enters and where it is stored

All of it is stored only in the browser's `localStorage` for the site's origin.

| Key | Contents |
|---|---|
| `ruckon.aftResults` | Saved AFT results: test date, age, standard, sex column, raw results, and calculated points |
| `ruckon.profile` | Optional display name, date of birth, standard, sex column, next AFT date, target score, training preferences |
| `ruckon.trainingPlans` | Training plans and completed workouts with difficulty, pain flag and free-text notes. Only used when the gated feature is on |
| `ruckon.settings` | Start page, theme and chart preferences |

**Local storage is not encrypted.** Anyone with access to the device and browser profile can read it, and
browser extensions with site access can read it too. Clearing site data deletes it. It is suitable only for
an individual's own practice data on their own device. **It is not safe or appropriate for unit records,
other Soldiers' data, or official results.**

Backups are JSON files that the user downloads and chooses where to keep. They are not encrypted either.

## What reaches a server or third party

| Flow | What is sent | Verified how |
|---|---|---|
| Page and asset requests to Vercel | Standard HTTP request data (IP address, user agent, URL, referrer) as with any website; Vercel keeps platform logs | Inherent to hosting |
| AFT entries, profile, plans, notes | **Nothing** while AI explanations are off (the production default) | Code search; CSP |
| AI explanations (when released) | Only after consent: scoring category with age band, and raw event results of one test and its previous comparable test. Sent to RuckOn's endpoint, then to an AI model through Vercel AI Gateway. Hashed IP for rate limits. No names, ages, dates, IDs, notes or profile | `lib/explain/request.ts`; tests |
| Analytics | **None loaded.** Vercel Web Analytics and Speed Insights are switched on in the project settings, but no analytics package is installed, no script appears in the live HTML, and `/_vercel/insights/script.js` returns 404 | `curl` of live pages on 3 Oct 2026 |
| Outbound links | Opened only when the user clicks: army.mil, armypubs.army.mil, YouTube (official AFT videos), bhimbkc.com. Videos are links, not embeds | Code search |
| URLs | No personal data is put in URLs or query strings | Code search |

## Trust boundaries

1. User ↔ browser: the only place data exists.
2. Browser ↔ Vercel: static files only, over HTTPS (HSTS is set by Vercel).
3. Backup file ↔ app: an untrusted input. Import checks size, structure, ranges and scores before anything is saved, and the user confirms a preview first.

## Requirements before any accounts, cloud storage or unit grading

None of this exists today, and the current hosting has **not** been assessed or authorized for official records.
Before RuckOn could hold data for more than one person, or any data a unit relies on, it would need at least:

1. **Authorization path first.** A government sponsor's decision on whether the data is an official record,
   which hosting is permitted (for example a FedRAMP or DoD-authorized environment at the right impact
   level), and the required cyber authorization (RMF/ATO), privacy documentation (PTA/PIA, possibly a SORN),
   and acquisition route.
2. **Authentication** through a government-approved identity provider (for example CAC/PIV or the sponsor's
   choice), with MFA, session expiry, and no app-managed passwords.
3. **Server-side authorization** checked on every request: a Soldier sees only their own records; a grader or
   leader sees only their assigned unit; administrative roles are separate and minimal.
4. **Unit isolation** in the data model and queries, with tests that one unit can never read another's data.
5. **Audit logs** for every read and change of scores, kept tamper-evident and reviewed.
6. **Data minimization and retention**: collect only what scoring needs, with a written retention period and
   automatic deletion.
7. **Deletion and correction** processes for individuals, and records handling rules for official data.
8. **Encryption** in transit and at rest with managed keys, and **backups** that are encrypted, tested and
   restorable.
9. **Independent security testing** (penetration test and code review) before launch and after major changes,
   plus vulnerability management and incident response contacts.
10. **Integrity of official scores**: graders record results; Soldiers cannot edit them; corrections are logged.
