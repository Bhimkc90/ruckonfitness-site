# "Explain my results" (AI explanations): setup and release

**Status: off in production.** Both flags are unset in Vercel, so the button is hidden and `POST /api/explain`
returns 404. No real provider call has been verified yet (see "Remaining steps").

## What it does

An "Explain my results" action on calculator results, each History entry, and the Dashboard's latest test. The
explanation summarizes the verified result, its pass/fail reasons, the highest- and lowest-scoring events
(with ties), and the change against the previous test **in the same scoring category** only. It links to
curated AFT guide pages and library exercises, and always shows a fixed note that event points don't measure
overall fitness or readiness.

It never gives workout prescriptions, schedules, rehabilitation or medical advice, or promises about scores.
Training plans remain the job of the gated, unreviewed plan engine (`docs/training-plan-review.md`).

## How it is built

| Part | File |
|---|---|
| Minimal request, strict parser, fingerprint | `lib/explain/request.ts` |
| Facts recomputed with the scoring engine (server and browser) | `lib/explain/facts.ts` |
| Curated links (5 guide pages, 12 library exercises), by ID only | `lib/explain/references.ts` |
| Standard (rule-based) explanation and AI-output validator | `lib/explain/explanation.ts` |
| Model instructions, data, and output schema | `lib/explain/prompt.ts` |
| Usage limits (Upstash Redis via REST; in-memory for `next dev` only) | `lib/explain/rateLimit.ts` |
| Endpoint logic | `lib/explain/server.ts`, `app/api/explain/route.ts` |
| Consent (this browser) | `lib/explain/consent.ts` |
| UI | `components/explain/ExplainPanel.tsx` |

- **Provider:** AI SDK 7 (`ai`) through Vercel AI Gateway. No provider-specific package is used. The model is set by
  `AI_EXPLAIN_MODEL` (default `anthropic/claude-haiku-4.5`). The gateway is asked to route only to providers
  that don't train on prompts (`disallowPromptTraining`). `AI_EXPLAIN_ZDR=required` also requires zero data
  retention, which needs Vercel Pro or Enterprise.
- **Numbers are never AI text.** The AI must write no digits or number words. Scores, totals, pass/fail and
  changes are rendered from facts the app computes. The output is rejected if it contains:
  - numbers;
  - links or markup;
  - reference IDs outside the approved list for that result;
  - training, medical, promise or date language;
  - text that contradicts the verified pass/fail outcome;
  - comparison text when no comparable test exists.

  The server and the browser both check it. A rejected output falls back to the standard explanation.
- **Invalidation.** The explanation is tied to a fingerprint of the exact request. It resets when an entry, the
  scoring category, or the comparable test changes. On the calculator, editing entries replaces it with
  "Recalculate to explain".

## Data sent (after explicit consent in the panel)

```json
{"v":1,"standard":"general","ageGroup":"22-26","column":"M",
 "raw":{"MDL":250,"HRP":8,"SDC":115,"PLK":150,"2MR":1010},
 "previousRaw":{"MDL":230,"HRP":30,"SDC":125,"PLK":130,"2MR":1080}}
```

That is the whole request: the scoring category (with the age **band**, not the age) and the raw results of
this test and the previous comparable one. It never includes:
- name, exact age or date of birth;
- test dates, record IDs or unit;
- profile, notes, restrictions or other saved tests.

The server rejects any extra field. The client IP is used only as a salted SHA-256 hash, rotated daily, for
rate limiting.

RuckOn doesn't store requests or explanations. Logs record only an error category (for example
`[explain] provider-timeout`), never request data or generated text. Choosing "Use the standard explanation"
sends nothing.

## Usage controls (server-side)

| Control | Value |
|---|---|
| Release flags | `NEXT_PUBLIC_AI_EXPLAIN=enabled` (UI) and `AI_EXPLAIN=enabled` (endpoint); both off in production |
| Same-origin only | `Origin` must match; `Sec-Fetch-Site` must be `same-origin` when sent |
| Payload | `application/json`, at most 2 KB (checked on the actual body), strict schema |
| Per client | 5 per 10 minutes, 20 per day (hashed IP) |
| Whole site | 200 per day by default (`AI_EXPLAIN_DAILY_LIMIT`) |
| Store | Upstash Redis, atomic `MULTI/EXEC`. In production the endpoint **fails closed** (503) without the store and a salt of 16+ characters, or if the store errors |
| Provider call | 15 s timeout (enforced even if the provider ignores it), at most 900 output tokens, 1 retry; function `maxDuration` 30 s |
| Errors | Timeout, quota (402/429), provider error and invalid output show the standard explanation with a notice; retry where it makes sense |

Rough cost ceiling: about 1.5k input and 0.9k output tokens per request. On `claude-haiku-4.5` that is under
1 cent per request, so about $1–2 a day at the default site-wide cap. Check current gateway pricing before
raising the cap.

## Tests

- `lib/explain/explain.test.ts`:
  - minimal payload and fingerprints;
  - malformed requests;
  - facts against all 560 synthetic scoring cases;
  - ties, all-equal, failed events, comparable versus no comparable test;
  - references;
  - the standard explanation;
  - AI-output rejection (invented numbers, links, unknown IDs, prescriptions, medical advice, promises, dates, contradictions, malformed output);
  - prompt contents.
- `lib/explain/server.test.ts`:
  - flag, origin, content-type, size and schema checks;
  - production fail-closed;
  - per-client and global limits with `Retry-After`;
  - store failure;
  - timeout, quota, provider, auth and invalid-output fallbacks;
  - logs that carry categories only;
  - the Upstash client, IP hashing, and the browser client.

## Remaining steps for public activation

1. **Provision the rate-limit store.** Add Upstash Redis from the Vercel Marketplace to the
   `ruckonfitness-site` project (`vercel integration add upstash`, or Dashboard → Storage). This sets
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` (`UPSTASH_REDIS_REST_URL`/`_TOKEN` also work).
2. **Enable AI Gateway** for the Vercel team, and add credits or a payment method. On Vercel the function
   authenticates with the project's OIDC token, so no API key is needed in production.
3. **Set Production environment variables** (Dashboard → Settings → Environment Variables, or `vercel env add`):
   - `AI_RATE_LIMIT_SALT`: a random secret. Generate it on your machine with `openssl rand -hex 32` and
     paste it into Vercel only, never into chat or git.
   - `AI_EXPLAIN=enabled`
   - Optional: `AI_EXPLAIN_MODEL`, `AI_EXPLAIN_DAILY_LIMIT`, `AI_EXPLAIN_ZDR=required`
4. **Verify on a Preview deployment first.** Set the same variables plus `NEXT_PUBLIC_AI_EXPLAIN=enabled` for
   Preview only. Then:
   - run the explanation on the synthetic results in `docs/testing/aft-calculator-cases.csv`;
   - confirm a real `status: "ai"` response;
   - read several outputs for accuracy and tone;
   - confirm limits return 429.
5. **Review** the wording, references and readiness note with an H2F/AFT reviewer (see
   `docs/evaluation/05-training-content-review.md`). Update the privacy text in
   `docs/evaluation/02-architecture-data-flow.md` if the provider or model changes.
6. **Release** by setting `NEXT_PUBLIC_AI_EXPLAIN=enabled` for Production and redeploying (the flag is inlined at
   build time). Turn it off the same way.

To try it locally with a real provider, put an AI Gateway key in `.env.local` as `AI_GATEWAY_API_KEY` (or run
`vercel env pull` for a fresh OIDC token), then run:

```bash
NEXT_PUBLIC_AI_EXPLAIN=enabled AI_EXPLAIN=enabled npm run dev
```

Local Node is 20. AI SDK 7 declares Node 22+ (Vercel uses 24); the endpoint ran under `next dev` on Node 20,
but use Node 22+ locally to match.
