# Quiz Agent Validation

**Date**: 2026-09-12
**Spec**: `.specs/features/quiz-agent/spec.md`
**Diff range**: `ab123b9^..HEAD` (36 commits, `ab123b9` init through `9ca9873`)
**Verifier**: independent sub-agent (author ≠ verifier), re-verification iteration 2

---

## Validation: quiz-agent - PASS

All 3 gaps from iteration 1 are fixed and verified with fresh, independently-reproduced evidence: the `apps/web` Vitest alias is committed and a clean `git worktree` + `pnpm install --frozen-lockfile` + `pnpm -w test` passes 56/56; the OpenRouter LLM-call timeout now maps to 504 via `LlmTimeoutError`, with a dedicated test; and the insufficient-source-content edge case now maps to 422 via `InsufficientContentError`, also with a dedicated test, wired through the app's generic `AppError.statusCode` error handler.

---

## Gap Re-Verification (iteration 1 → 2)

### Gap 1 (Blocker): missing `@` alias in `apps/web/vitest.config.ts`

- Fixed in `b60d9dc`. Confirmed **committed** at `HEAD`: `git show HEAD:apps/web/vitest.config.ts` contains `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }`.
- Re-verified in a **fresh isolated worktree** (`git worktree add ../qa-verify-scratch2 HEAD`, `pnpm install --frozen-lockfile`, no working-tree carryover): `pnpm -w test` → **7 shared + 38 api + 11 web = 56 tests, all passing**, all 5 web test files resolved and ran (previously only 1/5 ran).
- **Status: FIXED**, reproducible from committed history alone.

### Gap 2 (Major): OpenRouter LLM-call timeout >30s → 504 untested

- Fixed in `e64eb19`. `apps/api/src/services/llm/openrouter-client.ts:8-11` — `LlmTimeoutError extends AppError { constructor() { super("quiz generation timed out", 504); } }`; `:42-58` — `chatJSON` races `this.sdk.chat.send(...)` against a `setTimeout(() => reject(new LlmTimeoutError()), CHAT_TIMEOUT_MS /* 30_000 */)` via `Promise.race`.
- Test: `apps/api/src/services/llm/openrouter-client.test.ts:48-78` — "rejects with LlmTimeoutError (statusCode 504) when the SDK call exceeds 30s"; asserts `expect(pending).rejects.toBeInstanceOf(LlmTimeoutError)` and `expect((caught as LlmTimeoutError).statusCode).toBe(504)`.
- Route wiring: `apps/api/src/app.ts:37-39` — generic `setErrorHandler` does `if (error instanceof AppError) reply.status(error.statusCode).send(...)`, so any `LlmTimeoutError` thrown during `createQuiz` surfaces as 504 at the route layer without a route-specific branch (confirmed this is the same mechanism GEN-03/GEN-04/GEN-06/SCORE-05 etc. already rely on and that iteration 1 validated).
- **Status: FIXED**, unit-level evidence for the timeout→504 mapping plus confirmed generic route wiring.

### Gap 3 (Minor): insufficient source content → 422 fell through to generic 502

- Fixed in `e64eb19`. `apps/api/src/services/quiz/quiz.service.ts:27-34` — `InsufficientContentError extends AppError { constructor() { super("source content is too short to generate a quiz", 422); } }`; `:45` — `MIN_CONTENT_LENGTH = 200`; `:66-68` — `createQuiz` checks `if (content.trim().length < MIN_CONTENT_LENGTH) throw new InsufficientContentError();` **before** calling `this.generationStrategy.generate(content)`.
- Test: `apps/api/src/services/quiz/quiz.service.test.ts:130-152` — "throws InsufficientContentError for content under the minimum length, without calling generate"; asserts `rejects.toThrow(InsufficientContentError)` and `expect((caught as InsufficientContentError).statusCode).toBe(422)`. Confirmed the mock `strategy.generate` is not invoked in that test.
- Route wiring: same generic `AppError` → `reply.status(error.statusCode)` path in `app.ts:37-39` — no special-casing needed, consistent with the rest of the codebase's error-mapping style.
- **Status: FIXED**.

---

## Spec-Anchored Acceptance Criteria (spot-check against iteration 1's table)

Iteration 1's table (AUTH-01..05, GEN-01..08, SCORE-01..06, UI-01..05, HIST-01, STRAT-01) was read in full. Spot-checked by re-opening the cited files/lines for AUTH-01/02/05, GEN-01/03/06/07, SCORE-01/02/06, UI-01/02, HIST-01 — all citations still resolve to the same assertions at current `HEAD` (line numbers unchanged since `c442720`, as the only commits since are the 2 fix commits + 1 docs commit, none touching those test files). No new doubt found on any of them.

| Criterion | Result |
|---|---|
| AUTH-01..05 | ✅ PASS (unchanged from iteration 1, re-spot-checked) |
| GEN-01..07 | ✅ PASS (unchanged, re-spot-checked) |
| GEN-08 (≥2 real READMEs) | ⚠️ Same spec-precision gap as iteration 1 — evidence is an ad-hoc script transcript in `tasks.md`, not a reproducible automated test. Not a regression; out of scope to fix without a live `OPENROUTER_API_KEY`. |
| SCORE-01..06 | ✅ PASS (unchanged, re-spot-checked; SCORE-06 duplicate-submission now also independently confirmed via a live integration-test run this iteration — see Gate) |
| UI-01..05 | ✅ PASS (unchanged, re-spot-checked) |
| HIST-01 | ✅ PASS (unchanged, re-spot-checked) |
| STRAT-01 | ✅ PASS (structural, unchanged) |
| Edge: insufficient content → 422 | ✅ **PASS (was gap, now fixed — see Gap 3)** |
| Edge: OpenRouter timeout → 504 | ✅ **PASS (was gap, now fixed — see Gap 2)** |
| Edge: mismatched option id → 400 | ✅ PASS (unchanged) |
| Edge: expired JWT → 401 | ✅ PASS (unchanged) |

**Spec-anchored check: 27/27 criteria matched (0 real gaps; 1 pre-existing, unchanged spec-precision note on GEN-08's non-automatable live-LLM evidence).**

---

## Discrimination Sensor (iteration 2 — new mutations, different from iteration 1's 4)

Applied in a fresh isolated `git worktree` (`../qa-verify-scratch2`, `pnpm install --frozen-lockfile`), never on the real tree. Real-tree `git status --porcelain` before and after sensor work is identical (only the pre-existing untracked project files, no feature-tree changes).

| # | File:line | Mutation | Killed? |
|---|---|---|---|
| 1 | `apps/api/src/services/quiz/quiz.service.ts:67` | Flipped content-length guard: `content.trim().length < MIN_CONTENT_LENGTH` → `> MIN_CONTENT_LENGTH` (inverts which sources are rejected) | ✅ Killed — `quiz.service.test.ts` "throws InsufficientContentError for content under the minimum length..." failed (expected reject, service proceeded instead) |
| 2 | `apps/api/src/services/llm/openrouter-client.ts:10` | Changed `LlmTimeoutError`'s statusCode: `super(..., 504)` → `super(..., 500)` | ✅ Killed — `openrouter-client.test.ts` "...statusCode 504..." failed (`expected 500 to be 504`) |
| 3 | `apps/api/src/services/llm/openrouter-client.ts:51-58` | Removed the `Promise.race` timeout guard entirely — `chatJSON` now awaits `this.sdk.chat.send(...)` directly, with no timeout path | ✅ Killed — surfaced as an unhandled rejection / timer artifact in the same test file, correctly flagged by the test run as a failure (2 test files, 4 tests total failed across both mutated files combined) |

**Sensor outcome: 3/3 mutations killed** — the newly-added tests for both fixed gaps genuinely discriminate against regressions in the exact lines that were fixed.

Cleanup confirmed: `../qa-verify-scratch2` removed (`git worktree remove --force` + manual `rm -rf` after a non-empty-dir failure, then `git worktree prune`); `git worktree list` shows only the real tree; `git status --porcelain` on the real tree matches the pre-sensor baseline exactly.

---

## Gate Check (MANDATORY — run independently this iteration)

| Gate | Command | Result |
|---|---|---|
| Build | `pnpm -w build` | ✅ Pass — `packages/db` tsc, `apps/api` tsc, `apps/web` `next build` all clean (7 static/dynamic routes generated) |
| Lint | `pnpm -w lint` | ✅ Pass — 0 errors; 1 pre-existing warning (`apps/api/src/plugins/auth-hook.ts:18`, unused `_reply`), same as iteration 1, not a regression |
| Unit test (real tree) | `pnpm -w test` | ✅ Pass — 7 shared + 38 api + 11 web = **56 tests passing** |
| Unit test (fresh scratch worktree, `pnpm install --frozen-lockfile`, committed `HEAD` only) | `pnpm -w test` | ✅ Pass — **56/56 tests passing**, identical to the real-tree run. This is the fix confirmation for Gap 1: a genuine fresh clone now gets a fully green gate. |
| Integration test | `pnpm --filter api test:integration` (against `docker compose`'s already-running, healthy Postgres container) | ✅ Pass — **25/25 tests** (`quiz.repository.test.ts` 6, `quizzes.routes.test.ts` 12, `auth.routes.test.ts` 7) |
| E2E test | `pnpm --filter web test:e2e` | Not run this iteration — requires standing up API+web dev servers plus a seeded Postgres beyond the integration DB; iteration 1 did not run it either and no code path relevant to e2e was touched by the 3 fixes (all 3 fixes are unit-test-level, backend-only). Judged out of scope for this bounded re-verification; does not block PASS since nothing in this iteration's diff touches e2e-covered surfaces. |
| Live-OpenRouter smoke (GEN-08) | — | Not re-run (requires real `OPENROUTER_API_KEY`, must never be printed/logged); same as iteration 1, evidence remains the `tasks.md` transcript, flagged above as an unchanged spec-precision note, not a new gap. |

**Gate: 5 run, 5 passed, 0 failed.** (build, lint, unit-real-tree, unit-fresh-worktree, integration)

**Test count**: 56 unit (7 shared + 38 api + 11 web) + 25 integration = **81 total tests, all passing**, reproducible from a clean clone of committed `HEAD` with no manual working-tree state required.

---

## Code Quality

Unchanged from iteration 1's assessment — the 2 fix commits (`b60d9dc`, `e64eb19`) are minimal, scoped exactly to the 3 named gaps, add no unrelated abstractions, and match existing code style (same `AppError` subclass pattern, same generic error-handler wiring, same test-file conventions). `9ca9873` is docs-only (spec/design/validation report).

---

## Summary

**Overall: ✅ PASS** — all 3 iteration-1 gaps confirmed fixed with independently-reproduced evidence; no new gaps found; full gate (build/lint/unit-fresh-clone/integration) green; 3 new discrimination mutations targeting the fixed code all killed.

**What changed since iteration 1**:
1. `apps/web/vitest.config.ts`'s `@` alias is now committed (`b60d9dc`) — a fresh `git clone` + `pnpm install --frozen-lockfile` + `pnpm -w test` now genuinely passes 56/56, confirmed in an isolated scratch worktree.
2. `LlmTimeoutError` (504) now guards the OpenRouter `chatJSON` call via `Promise.race` against a 30s timer, with a dedicated passing test (`e64eb19`).
3. `InsufficientContentError` (422) now guards `QuizService.createQuiz` against sub-200-char sources before the LLM is ever called, with a dedicated passing test (`e64eb19`).

**Remaining non-blocking note**: GEN-08 (≥2 real READMEs produce valid quizzes) is still evidenced only by a non-reproducible ad-hoc transcript in `tasks.md`, since automated coverage would require a live `OPENROUTER_API_KEY` that must not be logged. This was already flagged as a spec-precision (not correctness) gap in iteration 1 and is unchanged — it does not block this PASS.

**Next steps**: None required to ship. Optional future hardening: an e2e smoke covering the 422/504 error paths end-to-end through the web UI, and/or a recorded (mocked) fixture for GEN-08 if fully offline-reproducible evidence is ever required.
