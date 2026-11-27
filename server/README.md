# Study partner API (OPENBRAIN-96 / Bothy OPENBRAIN-49)

A separate Node 20 TypeScript/Hono service. The static reader keeps its existing `serve dist` service. No API key is bundled into the reader. The service uses `@anthropic-ai/sdk` 1.14.0 and `claude-opus-5-5`.

## Railway handoff — coordinator only

1. Apply `supabase/migrations/20261124079600_reader_events.sql` through the normal reviewed migration process. It is additive and may precede the reader deploy. The code tolerates a missing events table during rollout; no existing content is rewritten.
2. Create a **separate** service from this repository, root directory `/server`, Railway config file `/server/railway.json`, Dockerfile `Dockerfile` relative to that root. Build command: Dockerfile default. Start command: `node dist/index.js`. Health check: `/healthz`. One replica, restart on failure (max 3); Railway supplies `PORT`. Do not enable serverless sleep while relying on the in-process limiter/cache.
3. Set service variables:
   - `ANTHROPIC_API_KEY`: the Railway-held key, server only.
   - `SUPABASE_URL`: the existing Supabase project URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the existing publishable key, **never** a service-role key.
   - `ALLOWED_ORIGINS`: `https://theopenbrainorg-production.up.railway.app,http://localhost:5296,http://127.0.0.1:5296` (comma-separated exact origins, no trailing slash).
   - `NODE_ENV=production`.
4. Generate the API service's public HTTPS domain. Set **the static app's build variable** `VITE_STUDY_PARTNER_URL=https://<study-partner-service-domain>` and rebuild/deploy that app only after service/auth and live-eval acceptance. Vite adds exactly this origin to `connect-src`; no wildcard API origin is opened. Unset URL hides the reader entry/panel.
5. Verify authenticated opening, streamed messages, RLS persistence, cross-chapter source navigation, telemetry and refusal behavior on the deployed service. Run the live eval and obtain Stuart's adversarial acceptance before enabling for readers.

No service, variables, deployment or production writes were performed by this implementation task.

## API and trust boundary

- `GET /healthz` is public. Every `/study-partner/*` request calls Supabase `/auth/v1/user` with the bearer token before reading data or generating anything.
- `GET /study-partner/opening` gives a personalised greeting and the four mode chips; it consumes the same generation quota as messages.
- `POST /study-partner/messages` accepts only `{message, conversationId?}` (4,000 characters, 18KB body cap), emits SSE `conversation`, `status`, `text`, `tool`, `done` or `error`. It does not accept student context, history, a model or system text.
- `GET /study-partner/conversations` lists the user's latest 20 Study partner conversations; `GET /study-partner/conversations/:id` checks ownership and returns at most 80 messages.
- Reads and persistence use the student's own token through REST. Published corpus reads use the public key and additionally constrain status and the two approved slugs. Every paginated corpus query has a stable order; the cache lives for ten minutes. `retrieve(query, scope)` is the future vector-search seam.
- First name only; recent 40 highlights and attached notes, 20 separate notes, last reading positions, quiz results, saved-card summaries and 40 recent reader events. A last position proves a visit, **not** completion of preceding sections. Plays mean started, not watched to completion. Student fields and stored messages remain untrusted data in the final user turn, including stored `system` roles.
- Existing `ai_conversations`/`ai_messages` ownership policies fit persistence. Assistant text/tools/citations are JSON in `content`. Existing flashcards are publicly readable with no student insert policy: generated cards stay in the private conversation. `quiz_attempts` requires an authored `quizzes` row; practice quiz answers are revealed in the UI, with questions/answer keys retained in the conversation, and are not passed off as graded course attempts. Answer selection itself is local UI state.
- 30 generations/hour, 200/day, one active message generation per user, 40 user turns/conversation. Limiter/locks are **process-local**: keep one replica; restarts reset quotas. A shared durable quota store is required before horizontal scaling. User-controlled conversation deletion does not reset the per-user generation quota within the running process.

## Model and output validation

The SDK streams from Anthropic, then the service checks final `stop_reason` before reading/releasing content. `refusal`, truncation and unexpected stop reasons use a friendly fallback. Only then does SSE deliver validated text chunks and tools; this intentionally increases time to first displayed text to prevent partial refusals or malformed tool data escaping. Heartbeats and Cancel keep the panel responsive. This is **validated delivery**, not token-by-token display before the final safety checks.

Adaptive thinking, explicit low effort for greetings and medium for answers, auto tool choice, strict tools, `additionalProperties:false`, and server-side fallback beta are set. Each stable chapter system block uses a one-hour cache breakpoint; dynamic student data follows the cached prefix. Usage includes `cache_read_input_tokens`; tests exercise it through the real SDK with a mocked SSE transport. No chain of thought is forwarded.

AJV validates every tool. Unknown paragraph citations are removed, unknown or unread-source quiz/card items are dropped, and an incomplete exercise is rejected. Links are constructed from server corpus metadata. Existing source IDs prove location, **not semantic correctness**: the live Opus judge and author evaluation are essential acceptance gates. There is no claim that prompt rules alone guarantee perfect containment. Model fallback can change the serving model and price; Opus cost estimates assume Opus actually served the response.

Official references checked: [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript), [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming), [refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback), [Opus 5.5 behavior/pricing](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5).

## Local verification

```sh
npm ci --prefix server
npm run build --prefix server
npm test --prefix server
node --import ./server/node_modules/tsx/dist/loader.mjs scripts/study-partner-eval.mjs
# Paid calls ONLY with --live and an explicitly supplied environment key:
node --env-file=.env --import ./server/node_modules/tsx/dist/loader.mjs scripts/study-partner-eval.mjs --live
```

The 64 cases include travel, biology class, other subjects, jailbreaks, prompt leakage, claimed authority, false premises, unpublished chapters, medical/harmful requests and a malicious note included in every student context. Live mode uses Opus as both assistant and independent rubric judge, checks raw citation IDs deterministically, counts usage and prints estimated USD. Targets: 100% containment, ≥95% false-premise correction, zero uncited factual responses/unknown citations. A missing or refused judge fails. Reports are `test/fixtures/eval-{recorded,live}.json`. The recorded fake judge is a plumbing fixture and its numerical rates **are not model-quality evidence**.

Local end-to-end (no API key or production writes):

```sh
node --import ./server/node_modules/tsx/dist/loader.mjs server/test/local.ts
VITE_STUDY_PARTNER_URL=http://127.0.0.1:4296 npm run watch:local -- --host 127.0.0.1 --port 5296
node scripts/study-partner-browser.mjs
```

The fake service binds localhost and lives under `test/`, which the production Dockerfile never copies. Browser proof stubs every student request and forwards only public GETs with the publishable key. It captures 1331×992 and 375×704 opening/cards/quiz states. Unit tests cover the client SSE parser and auth reset, server trust boundaries, tools, rate limits, ownership, draft exclusion, injected notes, and the actual SDK request shape. `readerEvents.sql.test.js` runs the migration twice in PGlite and asserts anon denial and owner-only insert/select, with update/delete and draft/foreign inserts denied.

## Cost estimate (USD)

The read-only published corpus measured on 26 Nov: History 108,766 characters; Retina 93,117 characters; 281 paragraphs including available figure captions. At 4 characters/token that is **~50,472 cached tokens**; this is an estimate, not an API tokenizer count.

Opus 5.5 standard pricing: input $4/M, output $20/M, one-hour cache writes $8/M, cache hits $0.20/M. A greeting plus ten replies, assuming 3,000 average uncached input tokens/request, 150 greeting output tokens and 800 output tokens/reply (including billed thinking), costs **about $0.80 with a cold prefix or $0.41 with the prefix already warm**. Formula: cold `50,472×8/M + 10×50,472×0.20/M + 33,000×4/M + 8,150×20/M`. Longer history/thinking, fallback model pricing and larger exercises change this; inspect returned usage rather than treating it as a fixed charge. No live tokens were spent during implementation.
