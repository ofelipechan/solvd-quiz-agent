# Quiz Agent Validation

**Date**: 2026-09-12
**Spec**: `.specs/features/quiz-agent/spec.md`
**Diff range**: `ab123b9^..HEAD` (33 commits, `ab123b9` init through `c442720`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Overall Verdict: ❌ FAIL

The feature's core logic (auth, scoring, generation, repositories, routes) is well-built and well-tested — every risky mutation injected was killed. The FAIL is caused by one gate defect: **`pnpm -w test` does not pass at the committed `HEAD`**. 4 of 5 `apps/web` unit test files fail to resolve the `@/lib/api-client` import because the Vite `@` path alias only exists in an **uncommitted** working-tree change to `apps/web/vitest.config.ts` — it was never committed in any of the 33 feature commits. T29's "final gate sweep" (`54 tests, all passing`) is not reproducible from the actual commit history; it is only reproducible because the author's uncommitted local file was still on disk when they ran it.

---

## Task Completion

| Task | Status | Notes |
|---|---|---|
| T1-T28 | ✅ Done | Verified present in diff/tree |
| T29 | ⚠️ Partial | Claimed "`pnpm -w build && pnpm -w lint && pnpm -w test` all pass with zero failures" — **not reproducible from the committed tree** (see Gate Check). The passing run relied on an uncommitted `apps/web/vitest.config.ts` alias. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
|---|---|---|---|
| AUTH-01: valid login → cookie + 200 | 200, `Set-Cookie` httpOnly | `apps/api/src/routes/auth.routes.test.ts:53-66` — `expect(res.statusCode).toBe(200)`; `cookieStr.toLowerCase()).toContain("httponly")` | ✅ PASS |
| AUTH-02: invalid creds → 401, no cookie | 401, no `Set-Cookie` | `apps/api/src/routes/auth.routes.test.ts:69-78` — `expect(res.statusCode).toBe(401)`; `expect(res.headers["set-cookie"]).toBeUndefined()` | ✅ PASS |
| AUTH-03: no/invalid JWT → 401 on protected route | 401 | `apps/api/src/routes/auth.routes.test.ts:91-94` (no cookie) + `:97-105` (expired) — both `expect(res.statusCode).toBe(401)`; also `quizzes.routes.test.ts:129-147` (`createQuiz` never called) | ✅ PASS |
| AUTH-04: seeded admin exists, bcrypt-hashed, logs in | seed idempotent, hash verifiable, real login 200 | `apps/api/src/routes/auth.routes.test.ts:132-146` — seeds via real `seedAdminUser`, POSTs real creds, `expect(res.statusCode).toBe(200)` against a live Postgres-backed route | ✅ PASS (integration; not independently re-run — see Gate Check) |
| AUTH-05: logout → clears cookie, 200 | 200, cleared cookie | `apps/api/src/routes/auth.routes.test.ts:81-88` — `expect(res.statusCode).toBe(200)`; `cookieStr).toContain(\`${AUTH_COOKIE_NAME}=;\`)` | ✅ PASS |
| GEN-01: 5-8 questions, 4 options each, persisted before responding | schema enforces 5-8 length, 4 options; route returns 201 | `packages/shared/src/schemas/generation.schema.test.ts:113-134` (5-8 bound); `quiz.repository.test.ts:46-56` (`options`.toHaveLength(4)`, atomic persist); `quizzes.routes.test.ts:52-69` (201) | ✅ PASS |
| GEN-02: `question_type` tagged single/multiple by LLM | schema requires the field, correct-count refine per type | `generation.schema.test.ts:66-96` — rejects single/2-correct and multiple/1-correct | ✅ PASS |
| GEN-03: >200KB → 422, no LLM call | 422, no LLM call | `markdown-fetcher.test.ts:42-55` (`too_large`); `quizzes.routes.test.ts:90-107` (422 mapping); `quiz.service.test.ts:98-109` (fetch error ⇒ `strategy.generate` never called) | ✅ PASS |
| GEN-04: non-2xx / non-text → 422 named error | 422 with named kind | `markdown-fetcher.test.ts:14-40` (`unreachable`, `not_text`); `quizzes.routes.test.ts:71-88` (422) | ✅ PASS |
| GEN-05: github blob URL → raw.githubusercontent.com | exact rewritten URL | `markdown-fetcher.test.ts:57-72` — `expect(fetch).toHaveBeenCalledWith("https://raw.githubusercontent.com/x/y/main/README.md", ...)` | ✅ PASS (also mutation-killed, see Sensor) |
| GEN-06: schema-invalid LLM output → 1 retry → 502, no partial persist | exactly 1 retry, then 502; no persisted quiz on failure | `default-generation.strategy.test.ts:39-56` (`chatJSON` called exactly twice, `GenerationFailedError`); `quiz.service.test.ts:111-121` (`createQuizWithQuestions` not called); `quizzes.routes.test.ts:109-126` (502) | ✅ PASS |
| GEN-07: success → 201 with quiz id + questions/options, no `isCorrect` leak | 201, no `isCorrect` key present | `quizzes.routes.test.ts:52-69` — `expect(body.questions[0].options[0]).not.toHaveProperty("isCorrect")` (both options checked) | ✅ PASS |
| GEN-08: works on ≥2 distinct real READMEs | 2 real README URLs each produce a valid 5-8Q/4-option quiz | `tasks.md` T13/T29 narrative log (pipecat-ai/pipecat and facebook/react, "6 questions, all 4-option=true, in-range=true") — **not a test file**, an ad-hoc script's pasted output; not independently re-executed here (requires a live `OPENROUTER_API_KEY`, which the task explicitly says never to print/log) | ⚠️ Spec-precision gap — plausible per the recorded transcript, but no automated, reproducible-on-demand evidence exists in the repo (by design, per T13's own scope: "not part of the test suite"). Accepted as spec-intended but flagged since it is the one AC this Verifier could not independently reproduce. |
| SCORE-01: single exact-match=4/else 0; multiple = 4×correct/total, no penalty, clamp 0-4 | precise scores per formula | `scoring.service.test.ts:26-53` — 4/0/4/2/4(no-penalty)/0 all asserted by exact `toBe()` value | ✅ PASS (mutation-killed, see Sensor) |
| SCORE-02: final = Σ(score_i·weight_i)/Σweight_i, weight_i=1.1^(i-1) | exact weighted value | `scoring.service.test.ts:56-67` — hand-computed weights `[1.0,1.1,1.21]`, `toBeCloseTo(expected,10)` | ✅ PASS (mutation-killed) |
| SCORE-03: persist per-question answer+score+final; return correctness+final as 200 | 200, exact payload shape | `quizzes.routes.test.ts:190-211` — `expect(body.finalScore).toBe(4)`; `expect(body.answers).toEqual([{questionId, correct:true, score:4}])`; persistence via `quiz.repository.test.ts` transaction test | ✅ PASS |
| SCORE-04: missing answer for a question → 0, not rejected | question scores 0, request still succeeds | `quiz.service.test.ts:201-211` — `expect(result.answers).toEqual([...{correct:false, score:0}])` for the omitted question | ✅ PASS |
| SCORE-05: unknown/foreign quiz id → 404 | 404 | `quizzes.routes.test.ts:213-230` — `expect(res.statusCode).toBe(404)`; `quiz.service.test.ts:134-141` (`QuizNotFoundError`) | ✅ PASS |
| SCORE-06: second submit on same quiz → 409 | 409, DB-enforced uniqueness | `quiz.repository.test.ts:76-90` (real Postgres unique-violation ⇒ `DuplicateSubmissionError`); `quizzes.routes.test.ts:251-268` (409 mapping) | ✅ PASS (mutation area reviewed; see Sensor note) |
| UI-01: valid login → redirect to quiz-creation | `push("/quizzes/new")` called | `apps/web/src/app/login/page.test.tsx:27-38` | ✅ PASS |
| UI-02: failed login → inline error, no redirect | error text shown, `push` not called | `apps/web/src/app/login/page.test.tsx:40-52` — `toHaveTextContent(/credenciais inválidas/i)`; `expect(push).not.toHaveBeenCalled()` | ✅ PASS |
| UI-03: loading state → radios(single)/checkboxes(multiple) per type | correct input roles rendered | `apps/web/src/app/quizzes/new/page.test.tsx` (loading→redirect, read but not fully quoted here); `apps/web/src/app/quizzes/[id]/page.test.tsx:64-80` — `findAllByRole("radio")`.toHaveLength(2)`, `findAllByRole("checkbox")`.toHaveLength(3)` | ✅ PASS |
| UI-04: submit → per-question correct/incorrect + final score shown | exact score text rendered | `apps/web/src/app/quizzes/[id]/page.test.tsx:82-98` — `findByText(/correto/i)`; `getByText(/pontuação final: 4\.00/i)` | ✅ PASS |
| UI-05: generation/submit failure → server error shown, URL retained, retry allowed | error shown, input preserved | Referenced by T24's "Done when" (RTL test: API error → message shown, input retained) in `apps/web/src/app/quizzes/new/page.test.tsx` | ✅ PASS (file present; assertion not fully quoted, inspected via task record) |
| HIST-01: history lists source URL/date/score | 2 quizzes, one scored, one not | `quizzes.routes.test.ts:150-172` — `expect(body[0].finalScore).toBe(3.5)`; `expect(body[1].finalScore).toBeNull()`; also `quiz.repository.test.ts:107-128` | ✅ PASS |
| STRAT-01: generation behind `QuestionGenerationStrategy` interface | interface + 1 registered impl | `apps/api/src/services/quiz/generation-strategy.ts` (interface) + `default-generation.strategy.ts` (impl), constructor-injected into `QuizService` per `quiz.service.test.ts` | ✅ PASS (structural; no dedicated test needed for an interface declaration) |
| Edge: source too small for 5 questions → 422 named | 422, "insufficient" message | Not found as a distinct test — `GeneratedQuizSchema`'s min(5) rejection is tested (`generation.schema.test.ts:113-117`), but there is no test asserting the *route* returns 422 specifically for "insufficient source content" as its own case distinct from generic `GenerationFailedError`→502 | ⚠️ Spec-precision gap — the spec calls for 422 ("too little content"), but the implemented path for a too-short LLM response is schema-validation failure → retry → `GenerationFailedError` → **502**, not 422. No test exercises this edge case as spec-worded. |
| Edge: OpenRouter timeout >30s → 504 | 504 | `markdown-fetcher.test.ts:75-92` tests the *markdown fetch* 30s abort (→ 422 `unreachable`, not 504) — this is the wrong integration point. No test found for an OpenRouter *LLM call* timing out and mapping to 504 | ❌ GAP — the design's Error Handling Strategy names "OpenRouter timeout >30s → 504" but `openrouter-client.test.ts` (3 tests) was not found to assert a timeout/abort path or a 504 mapping in `quizzes.routes.test.ts` |
| Edge: option id from wrong question → 400 | 400 | `quiz.service.test.ts:213-220` (`InvalidAnswerError`); `quizzes.routes.test.ts:232-249` (400) | ✅ PASS |
| Edge: expired JWT cookie → 401, UI redirects to login | 401 (API), redirect (UI) | API: `auth.routes.test.ts:96-105`. UI: not verified — `apps/web/src/middleware.test.ts` exists (3 tests) but this Verifier did not open it to confirm it covers *expired-cookie* redirect specifically vs. only *missing*-cookie | ⚠️ Spec-precision gap (API side fully covered; UI side plausible but not directly inspected) |

**Status**: ❌ Gaps present (1 real gap: OpenRouter timeout→504 untested/unconfirmed; several spec-precision gaps noted above) — independent of, and smaller than, the gate failure below.

---

## Payload/Conjunction Check

- **Submit response** (`POST /api/quizzes/:id/submit`): `quizzes.routes.test.ts:191-211` asserts the actual returned JSON body's `finalScore` value (`toBe(4)`) and the full `answers` array shape (`toEqual([{questionId, correct:true, score:4}])`) — not just that the service was called. ✅ Conjunction respected.
- **Generation response** (`POST /api/quizzes`): `quizzes.routes.test.ts:52-69` asserts on the actual response body, checking `isCorrect` is absent from **each** option object returned (`not.toHaveProperty("isCorrect")` on both options) — value-level, not call-level. ✅ Conjunction respected.

---

## Discrimination Sensor

All 4 mutations were applied and reverted in an isolated `git worktree` (`../qa-verify-scratch`, `pnpm install --frozen-lockfile` for a runnable environment), never on the real tree. Baseline `git status --porcelain` on the real tree before sensor work matched the same output after cleanup (both show only the pre-existing uncommitted `apps/web/vitest.config.ts` change and untracked files — no feature-tree files touched).

| # | File:line | Description | Killed? |
|---|---|---|---|
| 1 | `apps/api/src/services/quiz/scoring.service.ts:29` | Flipped single-question ternary: `exactMatch ? MAX_SCORE : MIN_SCORE` → `exactMatch ? MIN_SCORE : MAX_SCORE` | ✅ Killed — `scoring.service.test.ts` 2 failures (wrong-single-answer test expected 0, got 4) |
| 2 | `apps/api/src/services/quiz/scoring.service.ts:13` | Changed weighted-average growth base: `WEIGHT_GROWTH = 1.1` → `1.0` | ✅ Killed — `computeFinalScore` hand-computed-average test failed (expected ≈1.873, got 2) |
| 3 | `apps/api/src/services/auth/auth.service.ts:48` | Removed the expiry-rejection side effect: `verifyToken`'s catch block returns a forged `{ userId: "forged" }` instead of `null` | ✅ Killed — "fails verifyToken for an expired token" failed (expected `null`, got forged object) |
| 4 | `apps/api/src/services/markdown/markdown-fetcher.ts:31` | Swapped GitHub blob→raw URL rewrite argument order: `${owner}/${repo}/${rest}` → `${repo}/${owner}/${rest}` | ✅ Killed — rewrite test failed (`fetch` called with owner/repo transposed) |

**Sensor depth**: lightweight (4 targeted mutations; feature is not a P0/critical-payment path per spec's Out of Scope table, though auth/scoring are high-risk — 4 mutations exceeds the 1-3 default minimum given that risk).
**Result**: 4/4 killed — ✅ PASS (tests in the risky areas actually discriminate against regressions)

**Not sensor-tested** (scope limitation, not a finding): the duplicate-submission DB-unique-constraint path (`quiz.repository.ts` `isUniqueViolation`) requires a live Postgres instance; Docker was available but standing up + migrating a throwaway DB for one more mutation was out of this pass's time budget. The corresponding integration test (`quiz.repository.test.ts:76-90`) was read and its assertion targets the correct instance type (`DuplicateSubmissionError`) on a genuine second `createSubmission` call against real Postgres, which is credible evidence on its own even without an injected-fault run.

---

## Gate Check (MANDATORY — run independently by the Verifier)

Run against the **real working tree** (uncommitted `apps/web/vitest.config.ts` alias present, as any live checkout would have it — see finding below):

| Gate | Command | Result |
|---|---|---|
| Build | `pnpm -w build` | ✅ Pass — api `tsc`, web `next build` both clean |
| Lint | `pnpm -w lint` | ✅ Pass — 0 errors, 1 pre-existing warning (`apps/api/src/plugins/auth-hook.ts:18`, unused `_reply`) |
| Unit test | `pnpm -w test` | ✅ Pass on the **working tree as found** (with the uncommitted alias) — 7 shared + 36 api + 11 web = 54 tests, all passing |

**Then re-run against the actual committed `HEAD` (`c442720`) in an isolated scratch worktree, to test what a fresh clone actually gets:**

| Gate | Command | Result at committed HEAD |
|---|---|---|
| Unit test | `pnpm -w test` (fresh worktree, `pnpm install --frozen-lockfile`, no working-tree modifications) | ❌ **FAIL** — exit code 1. `packages/shared` (7 passed) and `apps/api` (36 passed) are unaffected. `apps/web`: only `src/app/quizzes/page.test.tsx` (1 file, 3 tests) passes; the other 4 web test files (`login/page.test.tsx`, `quizzes/new/page.test.tsx`, `quizzes/[id]/page.test.tsx`, and one more) fail with `Failed to resolve import "@/lib/api-client"` — `vite:import-analysis` cannot resolve the `@` alias, because `apps/web/vitest.config.ts` at `HEAD` has no `resolve.alias` entry for it. **Total: 4 test files failed, 3 of 11 web tests ran (all passed), 8 web tests never ran.** |

**Root cause**: `apps/web/vitest.config.ts` is missing a `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }` block that every affected test file's `@/lib/api-client` import depends on. This block exists only as an **uncommitted** change in the working tree (confirmed via `git diff` and `git show HEAD:apps/web/vitest.config.ts`) — it was never part of any of the 33 feature commits, including T21 (web scaffold), T22/T24/T25/T26 (the pages whose tests fail), or T29 (the task that claims the final gate sweep passed).

**Test Integrity Check**: The task record's claimed counts (7 shared + 36 api + 11 web = 54, all green) are accurate **only** when measured against the author's local working tree state at the time, not against what is actually committed. This is a real regression risk: anyone who clones the repo at `HEAD` and runs the documented `pnpm -w test` gate command gets a failing build.

**Gate verdict**: ❌ FAIL (non-zero exit on `pnpm -w test` at the committed tree) — this alone fails the feature per `validate.md` step 4 ("Non-zero exit code = STOP").

Gates not run in this pass (out of time budget for this Verifier round, both require additional live infrastructure beyond the unit gate that already fails):
- `pnpm --filter api test:integration` (needs Docker Postgres — not attempted; api/shared/db logic already has strong unit+read evidence)
- `pnpm --filter web test:e2e` (needs API+web dev servers + seeded Postgres)
- The T13/T29 live-generation smoke against real OpenRouter was not re-run (would require the real `OPENROUTER_API_KEY`, which per this task's own instruction must never be printed/logged; the task record's transcript is taken as the evidence of record for GEN-08, flagged above as a spec-precision gap since it is not independently reproducible by this Verifier)

---

## Code Quality

| Principle | Status |
|---|---|
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ (except the uncommitted vitest alias, which should have been committed as part of T21/T22) |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ |
| Would senior engineer approve? | ⚠️ Would flag the uncommitted config dependency immediately in review |
| Tests map to acceptance criteria, non-shallow | ✅ — spot-checked scoring, auth, generation, routes; all assert values, not just calls |
| Spec-anchored outcome check | ✅ for 24/27 items; gaps listed above |
| Per-layer coverage (domain 1:1 AC; routes happy+edge+error) | ✅ |
| Every test maps to a spec AC/edge case/Done-when | ✅ — no unclaimed tests found in files reviewed |
| Documented guidelines followed | Test Coverage Matrix in `tasks.md` (project-authored); Vitest + Playwright stack as specified |

---

## Edge Cases

- [x] Source too large (>200KB) → 422: handled and tested
- [x] Non-2xx/non-text source → 422: handled and tested
- [x] GitHub blob URL rewrite: handled and tested (and mutation-killed)
- [ ] Source too little content for 5 questions → 422 "insufficient": **not distinctly implemented/tested** — falls through to generic 502 path instead
- [ ] OpenRouter timeout >30s → 504: **not confirmed** — no test located asserting this mapping
- [x] Mismatched option id → 400: handled and tested
- [x] Expired JWT → 401 (API confirmed); UI-side redirect plausible but not directly inspected

---

## Gate Check Summary

- **Gate command**: `pnpm -w build && pnpm -w lint && pnpm -w test` (per tasks.md's Build gate)
- **Result at working tree (as found)**: all passed (build clean, lint 0 errors/1 warning, 54/54 tests)
- **Result at committed HEAD (fresh scratch worktree)**: build/lint not re-verified there (unit test already fails); `pnpm -w test` → **4 test files failed / 1 passed** in `apps/web`, 8 of 11 web tests never executed
- **Test count before feature**: 0 (greenfield)
- **Test count after feature (claimed)**: 54
- **Test count after feature (actually passing from committed HEAD)**: 46 (7 shared + 36 api + 3 web) — **8 fewer than claimed**
- **Failures**: 4 web test files fail to resolve `@/lib/api-client` at committed HEAD due to a missing, uncommitted Vitest path-alias config

---

## Fix Plans

### Fix 1: Commit the missing Vitest path alias

- **Root cause**: `apps/web/vitest.config.ts` lacks `resolve.alias` for `@` → `./src`, so any test file importing via `@/...` fails to resolve at a fresh checkout. The alias exists only in the author's uncommitted working tree.
- **Fix task**: Add the `resolve: { alias: { "@": path.resolve(__dirname, "./src") } }` block to `apps/web/vitest.config.ts` (the exact change already sitting uncommitted) and commit it as part of the web test infra (belongs with T21/T22, or as a standalone `fix(web): add vitest path alias for @ imports`).
- **Verify**: In a fresh `git worktree`/clone at the new commit, `pnpm --filter web test` passes all 5 files / 11 tests with no import-resolution errors.
- **Priority**: Blocker (breaks the mandatory build gate at HEAD)

### Fix 2: Confirm or add OpenRouter LLM-call timeout → 504 test

- **Root cause**: The design's Error Handling Strategy table names "OpenRouter timeout >30s → 504" as a distinct scenario, but the only 30s-`AbortController` test found covers the *markdown fetch*, not the *LLM call* — no test in `openrouter-client.test.ts` or `quizzes.routes.test.ts` exercises an LLM timeout mapping to 504.
- **Fix task**: Either point to the existing test if one was missed by this review, or add a unit test to `openrouter-client.test.ts`/`default-generation.strategy.test.ts` asserting an aborted/timed-out OpenRouter call surfaces as 504 at the route layer.
- **Priority**: Major (named edge case with no confirmed coverage)

### Fix 3 (minor, spec-precision): "insufficient source content" edge case

- **Root cause**: Spec calls for 422 with a message naming insufficient content when the source is too short to yield 5 questions; the implemented path instead lets the LLM under-generate, fails Zod's `min(5)`, retries once, then returns a generic 502 `GenerationFailedError` — not the spec-worded 422.
- **Fix task**: Either accept 502 as the de facto behavior and update spec.md to match, or add a pre-generation content-length heuristic that fails fast with 422 before calling the LLM.
- **Priority**: Minor (spec-wording mismatch, not a functional break — both paths do reject bad input, just with a different status code than literally specified)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|---|---|---|
| AUTH-01..05 | Implementing | ✅ Verified |
| GEN-01..07 | Implementing | ✅ Verified |
| GEN-08 | Implementing | ⚠️ Verified via non-reproducible transcript only |
| SCORE-01..06 | Implementing | ✅ Verified |
| UI-01..05 | Implementing | ✅ Verified (UI-05/expired-cookie redirect not fully re-inspected) |
| HIST-01 | Implementing | ✅ Verified |
| STRAT-01 | Implementing | ✅ Verified |
| Edge: insufficient content → 422 | Implementing | ❌ Needs Fix (see Fix 3) |
| Edge: OpenRouter timeout → 504 | Implementing | ❌ Needs Fix (see Fix 2) |

---

## Summary

**Overall**: ❌ Not Ready — blocked on Fix 1 (the build gate genuinely fails at `HEAD`)

**Spec-anchored check**: 24/27 criteria cleanly matched; 3 flagged (2 spec-precision gaps, 1 real coverage gap on OpenRouter timeout→504)
**Sensor**: 4/4 mutations killed — the tests that exist are strong and discriminating
**Gate**: 3 passed (build, lint, test-as-found) but the canonical `pnpm -w test` **fails at the actual committed HEAD** — 0 of the 3 "passed" gates is trustworthy as reported by T29 without the uncommitted config

**What works**: Auth, scoring math (including the multi-answer no-penalty formula and weighted final score), markdown fetch/GitHub-rewrite, LLM generation retry-once semantics, quiz/submission persistence and duplicate-submission handling, and all route error-code mappings are implemented correctly and covered by tests that assert real values, not just call presence. The 4 discrimination mutations targeting the riskiest logic (scoring, JWT expiry, GitHub URL rewrite) were all killed.

**Issues found**:
1. Blocker — `apps/web/vitest.config.ts`'s `@` alias was never committed; `pnpm -w test` fails at HEAD (Fix 1).
2. Major — no confirmed test for OpenRouter LLM-call timeout → 504 (Fix 2).
3. Minor — "insufficient source content → 422" edge case falls through to a generic 502 instead (Fix 3).

**Next steps**: Commit Fix 1 immediately (one-line config change, verified in the working tree already), then confirm/add Fix 2's test, then re-run this Verifier. Fix 3 is a spec-wording reconciliation, not urgent.
