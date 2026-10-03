# 3. Security findings

Focused audit on 3 October 2026 of the source code, dependencies, local production build, live response headers
and visible repository and hosting settings. Active testing was limited to a local production server
(`localhost`) and read-only requests to our own site. No Army or third-party systems were tested. Secret values
and personal records were not read.

This is a self-assessment by the developer with AI assistance. It is **not** an independent penetration test
or a security certification.

## Findings

| ID | Severity | Finding | Evidence | Fix | Verification | Status |
|---|---|---|---|---|---|---|
| F1 | Critical | Next.js 16.2.x had published critical and high advisories, including remote code execution in the App Router (fixed in 16.3.3+) | `npm audit` before the change | Upgraded to `next@16.3.8` and `eslint-config-next@16.3.8`, pinned exactly; no other dependency changes | `npm audit --omit=dev`: 0 vulnerabilities; 1,899 tests, `tsc`, lint and build pass | Fixed |
| F2 | Medium | No Content-Security-Policy or other security headers in production (only Vercel's HSTS) | `curl -I https://ruckonfitness.com` | `next.config.ts` now sends CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy` | Headers present on local production build; external image load blocked by CSP in browser; pages, fonts, figures, charts, export and import work with no CSP violations | Fixed (live check after deploy) |
| F3 | Medium | Imported backups were trusted for scores: an edited file could show any points, total or pass result | Code review of `validateBackup` | Results saved with the current score tables are re-scored on import; any mismatch rejects the whole file | Unit tests for edited points, totals, pass flag, age group, column, standard, extra events; browser test with a tampered file | Fixed |
| F4 | Low | Imported entries were not range-checked (any number accepted for age or raw results) | Code review | Same limits as the calculator form: whole-number age 17–99, deadlift 0–1000, push-ups 0–300, times 0:01–99:59; general standard requires a sex column | Unit tests with negative, fractional, huge and string values | Fixed |
| F5 | Low | The import preview showed the backup's `appVersion` text as provided | Code review | Only a plain version number is shown; anything else becomes "unknown". React already escapes text, so this was a spoofing risk, not script injection | Unit tests; browser test with an HTML string | Fixed |
| F6 | Low | Import read the whole file into memory before the 5 MB size check | `SettingsPanel.tsx` | `file.size` checked before reading | Browser test with a 5 MB+ file | Fixed |
| F7 | Low | Dev-only tooling: 5 high advisories in the `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` chain | `npm audit` | Not changed: the only offered fix is a breaking downgrade (`npm audit fix --force`). These packages are not in the production bundle | `npm audit --omit=dev`: 0 | Open (accepted, dev only) |
| F8 | Medium | Repository: `main` has no branch protection; Dependabot alerts and security updates are off; one admin | GitHub API (settings read only) | **Not changed** (needs the owner's decision) | — | Open: recommend protection rule requiring passing checks, and turning on Dependabot alerts and security updates |
| F9 | Info | Vercel Web Analytics and Speed Insights are enabled in project settings but not installed, so nothing is collected | Live HTML and `/_vercel/insights/script.js` 404 | None needed | — | Recommend switching them off, or documenting them before installing |

## Checked with no issue found

- **Secrets:** no secrets in the 26 commits of history; the only local secret file is git-ignored and was never committed; GitHub secret scanning and push protection are on; no Vercel environment variables.
- **XSS:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or dynamic script loading; all user text is rendered by React as text.
- **Open redirect:** the start-page setting is an allowlist (`lib/settings/settings.ts`); an imported `https://` value is rejected (tested).
- **Prototype pollution:** imported `__proto__` and `constructor` keys do not reach application objects (tested).
- **Malformed input:** empty, non-JSON, wrong type and deeply nested files are rejected without errors (tested).
- **Links:** every new-tab link has `rel="noopener noreferrer"` or `noreferrer`.
- **URLs and logs:** no personal data in URLs; the app writes no logs.
- **Server attack surface:** no API routes, server actions, uploads to a server, or authentication.

## Not verified

- Vercel account security (owner MFA, team members, audit log) and GitHub account MFA: not visible to the audit.
- Vercel deployment protection is on for previews only; production is public by design.
- Browser-extension and shared-device risk: outside the app's control. Local data is not encrypted.
- No independent penetration test has been done.

## CSP note

The policy allows `'unsafe-inline'` for scripts and styles because Next.js uses inline scripts without nonces on
static pages. A nonce-based policy would require dynamic rendering of every page. With no third-party script
sources, the remaining risk is low, but this is the main hardening step left if the app ever handles shared data.
