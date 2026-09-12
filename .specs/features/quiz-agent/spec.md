# Quiz Agent Specification

## Problem Statement

Interview task requires an agent system that turns any Markdown doc (via URL) into a scored 5-8 question quiz, exposed via REST API + web UI, persisted to a database. Goal: production-shaped app, not a notebook PoC.

## Goals

- [ ] Generate a valid 5-8 question quiz from an arbitrary public Markdown URL in one API call
- [ ] Score submitted answers per spec rules (4/0/partial) and compute weighted-average final score
- [ ] Persist quiz, questions, answers, and score to Postgres
- [ ] Demonstrate working on 2+ different README.md sources
- [ ] Ship a Next.js UI that logs in and runs a full quiz end to end

## Out of Scope

| Feature | Reason |
|---|---|
| Multi-user roles / registration flow | Single seeded admin user is sufficient per user decision |
| Quiz pause/resume, retry history browsing | User confirmed single-pass, submit-once flow |
| Multiple question-generation strategies (A/B) | User confirmed one strategy for MVP; interface left pluggable (P3) |
| LLM observability (Langfuse etc.) | Explicitly "nice to have" in requirements; not committed for MVP |
| Non-Markdown / private-auth-gated sources | User confirmed public URLs only |
| Rate limiting, multi-tenant quotas | No multi-tenant requirement; single admin user |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| LLM provider | OpenRouter TS SDK + Zod structured output | User decision | y |
| Database | Postgres (Supabase-compatible schema), local via Docker | User decision | y |
| Backend framework | Fastify + TypeScript | User decision | y |
| Frontend framework | Next.js | User decision | y |
| Auth | JWT in HTTP-only cookie, seeded admin (`admin@solvd.com` / `solvdAdmin`) via seed script | User decision | y |
| Multi-answer scoring formula | `score = 4 * (correctSelected / totalCorrectOptions)`, no penalty for wrong picks, min 0 max 4 | User decision | y |
| Single vs multi-answer question type | LLM decides per question; stored as `question_type` enum (`single`/`multiple`) | User decision | y |
| Markdown fetch constraints | Public URL only; size cap 200KB; non-2xx/oversized/non-text response fails fast with clear error | User decision | y |
| Final score formula | Weighted average: `sum(score_i * weight_i) / sum(weight_i)`, `weight_i = 1.1^(i-1)` for question index i=1..n, result on 0-4 scale | User decision (agent recommendation) | y |
| Quiz session lifecycle | Single-pass: all questions answered client-side, one submit, then review screen showing per-question correctness + final score. No resume of abandoned quiz. | User decision | y |
| Generation strategy scope | One strategy for MVP; generation implemented behind an interface (`QuestionGenerationStrategy`) so alternates are addable later (P3, not built) | User decision | y |
| GitHub blob URLs (e.g. `github.com/.../blob/main/README.md`) | Backend SHALL auto-convert `github.com/.../blob/...` to `raw.githubusercontent.com/...` before fetch | Requirements example uses a blob URL, which 404s as raw markdown otherwise; must work out of the box | y |
| JWT lifetime | 24h expiry, cookie `httpOnly, sameSite=lax, secure in prod` | Standard short-lived session default for a single-admin app | y |
| Retry on LLM failure | One retry on malformed/schema-invalid LLM output, then fail the generation request with 502 | Bounds latency/cost while tolerating one transient bad generation | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Login ⭐ MVP

**User Story**: As the admin user, I want to log in with email/password so that the quiz app is not publicly writable.

**Why P1**: Auth gates every other endpoint; required by user decision.

**Acceptance Criteria**:

1. WHEN a client POSTs valid credentials to `/api/auth/login` THEN the system SHALL set an HTTP-only JWT cookie and return 200.
2. IF credentials are invalid THEN the system SHALL return 401 and SHALL NOT set a cookie.
3. IF a request to any protected endpoint carries no valid JWT cookie THEN the system SHALL return 401.
4. The system SHALL seed exactly one user (`admin@solvd.com` / `solvdAdmin`, password hashed) via a seed script, never in plaintext in the DB.
5. WHEN a client POSTs to `/api/auth/logout` THEN the system SHALL clear the auth cookie and return 200.

**Independent Test**: Log in via UI/curl, confirm cookie set, hit protected endpoint, confirm 200; log out, confirm 401 on retry.

---

### P1: Generate Quiz from Markdown URL ⭐ MVP

**User Story**: As the admin, I want to submit a Markdown URL and topic constraints so the agent generates a 5-8 question closed-answer quiz.

**Why P1**: Core value proposition of the task.

**Acceptance Criteria**:

1. WHEN an authenticated client POSTs a `sourceUrl` to `/api/quizzes` THEN the system SHALL fetch the Markdown, generate 5 to 8 questions each with exactly 4 answer options, and persist the quiz, questions, and options before responding.
2. The system SHALL tag each generated question with `question_type` of `single` or `multiple`, decided by the LLM from question content.
3. IF the fetched content exceeds 200KB THEN the system SHALL reject the request with 422 and SHALL NOT call the LLM.
4. IF the source URL returns non-2xx or a non-text content type THEN the system SHALL return 422 with a message naming the failure.
5. WHEN `sourceUrl` matches `github.com/*/blob/*` THEN the system SHALL rewrite it to the equivalent `raw.githubusercontent.com` URL before fetching.
6. IF the LLM response fails schema validation THEN the system SHALL retry generation exactly once; IF the retry also fails THEN the system SHALL return 502 and SHALL NOT persist a partial quiz.
7. WHEN quiz generation succeeds THEN the system SHALL return the quiz id and full question/option set (without marking which options are correct) as 201.
8. The system SHALL run successfully against at least 2 distinct Markdown README URLs (verified in Execute, not just unit-tested).

**Independent Test**: POST a real README URL, assert 5-8 questions with 4 options each are persisted and returned; repeat with a second, different README URL.

---

### P1: Submit Quiz Answers and Score ⭐ MVP

**User Story**: As the admin, I want to submit my selected answers for a quiz and receive a scored result so I know how I did.

**Why P1**: Second half of the core requirement (run quiz, collect answers, calculate score).

**Acceptance Criteria**:

1. WHEN an authenticated client POSTs one answer-set per question to `/api/quizzes/{id}/submit` THEN the system SHALL score each question per rule: 4 points if the single/all correct option(s) selected exactly match ground truth on a `single` question; for a `multiple` question, `4 * (correctSelected / totalCorrectOptions)` with no penalty, floored at 0 and capped at 4.
2. The system SHALL compute the final score as `sum(score_i * weight_i) / sum(weight_i)` where `weight_i = 1.1^(i-1)` for the i-th question in generation order (i starting at 1), returned on a 0-4 scale.
3. WHEN scoring completes THEN the system SHALL persist each per-question answer, its score, and the final weighted score, and SHALL return per-question correctness plus the final score as 200.
4. IF the submission is missing an answer for any question THEN the system SHALL treat that question as 0 points (no selected options) rather than rejecting the request.
5. IF the quiz id does not exist or does not belong to an authenticated context THEN the system SHALL return 404.
6. IF a quiz has already been submitted once THEN a second submit SHALL return 409 (single-pass, no resubmission).

**Independent Test**: Submit a full valid answer set, verify persisted scores and returned payload match the manual expected calculation for at least one multi-answer and one single-answer question.

---

### P1: Web UI to Run a Quiz ⭐ MVP

**User Story**: As the admin, I want a web UI to log in, request a quiz from a URL, answer it, and see my score.

**Why P1**: Explicit requirement ("should include a web UI").

**Acceptance Criteria**:

1. WHEN the admin submits the login form with correct credentials THEN the UI SHALL redirect to the quiz-creation screen.
2. IF login fails THEN the UI SHALL show an inline error and SHALL NOT redirect.
3. WHEN the admin submits a source URL THEN the UI SHALL show a loading state until the quiz is generated, then render all questions with radio buttons (single) or checkboxes (multiple) per `question_type`.
4. WHEN the admin submits answers THEN the UI SHALL show per-question correct/incorrect and the final weighted score.
5. IF quiz generation or submission fails THEN the UI SHALL show the server's error message and allow retry without losing the entered URL.

**Independent Test**: Full browser walkthrough — login, generate quiz from a real URL, answer, submit, see score.

---

### P2: Quiz History List

**User Story**: As the admin, I want to see past quizzes and their scores so I can compare runs across sources.

**Why P2**: Useful for demoing the "at least 2 README files" requirement but not required for a single run to work.

**Acceptance Criteria**:

1. WHEN the admin opens the history view THEN the system SHALL list past quizzes with source URL, created date, and final score (if submitted).

**Independent Test**: Generate 2 quizzes from different URLs, submit one, confirm both appear with correct state in the list.

---

### P3: Pluggable Generation Strategy Interface

**User Story**: As a developer, I want question generation behind an interface so a second strategy can be added later without touching the API layer.

**Why P3**: Nice-to-have per requirements; only the seam is built now, not a second strategy.

**Acceptance Criteria**:

1. The system SHALL define generation behind a `QuestionGenerationStrategy` interface with a single default implementation registered.

---

## Edge Cases

- IF the Markdown source has too little content to derive 5 questions THEN the system SHALL return 422 with a message indicating insufficient source content.
- IF the OpenRouter API call times out (>30s) THEN the system SHALL abort and return 504.
- IF a submit payload selects an option id that doesn't belong to the referenced question THEN the system SHALL return 400.
- WHEN the JWT cookie is expired THEN the system SHALL return 401, and the UI SHALL redirect to login.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| AUTH-01 | P1: Login | Design | Pending |
| AUTH-02 | P1: Login | Design | Pending |
| GEN-01 | P1: Generate Quiz | Design | Pending |
| GEN-02 | P1: Generate Quiz | Design | Pending |
| GEN-03 | P1: Generate Quiz | Design | Pending |
| SCORE-01 | P1: Submit & Score | Design | Pending |
| SCORE-02 | P1: Submit & Score | Design | Pending |
| SCORE-03 | P1: Submit & Score | Design | Pending |
| UI-01 | P1: Web UI | Design | Pending |
| UI-02 | P1: Web UI | Design | Pending |
| HIST-01 | P2: Quiz History | Design | Pending |
| STRAT-01 | P3: Pluggable Strategy | Design | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️ (mapped during Tasks phase)

---

## Success Criteria

- [ ] Quiz generated + scored end-to-end via REST API against 2 distinct real README URLs
- [ ] UI supports full login → generate → answer → score flow
- [ ] All data (questions, options, answers, scores) durably in Postgres, verifiable by query after process restart
- [ ] `docker compose up` brings up DB + app with a single seed command for the admin user
