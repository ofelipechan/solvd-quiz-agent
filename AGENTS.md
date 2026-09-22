## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

---

## Dependencies

- Do not add or install dependencies without approval (justify: security, maintenance, performance, license); keep lockfiles accurate; prefer exact versions.

---

## Design Principles (MANDATORY)

Not optional guidance.

- **Single Responsibility**: one module/class/function = one job. If describing it needs "and", split it. Functions stay small and focused.
- **Separation of Concerns**: layers stay distinct — `repositories/` (data access), `services/` (business logic), `clients/`/`adapters` (external I/O), `mappers/` (shape conversion), `validators/` (input schemas), `lib/helpers` + `utils/` (pure reusable functions). Never call the DB or external APIs from UI components or route handlers directly — go through services.
- **DRY**: before writing a helper, search `apps/web/src/lib/{helpers,utils,mappers,validators}` and reuse. Extract logic repeated ≥2 times into a shared function.
- **KISS**: simplest solution that works. Plain functions + stdlib before classes, frameworks, or new abstractions.
- **YAGNI**: no code for hypothetical needs. Add an abstraction only when a second concrete case exists.
- **Dependency Inversion**: services depend on interfaces/abstract types (`<name>.abstract.ts` contracts, e.g. `apps/web/src/lib/services/calendars/calendar.abstract.ts`); concrete implementations injected, not imported directly.
- **Pure functions**: helpers deterministic and side-effect-free wherever possible.
- **Fail fast**: validate at boundaries (zod schemas on API input / form input); trust typed data past that point.
- **BDD**: behaviour first. Feature file → approval → tests → code → run. Full workflow: `/bdd` skill, `docs/TESTING_PHILOSOPHY.md` § 6.

---

## Workflow Development

- MANDATORY BDD WORKFLOW for any new feature, function, or business rule: run `/bdd` (bug fixes: `/bdd-regression`). Order is strict: **feature file → approval → tests → code → run**. Each step is a gate; after writing the `.feature` file, share it and **stop** until approved.
- Rules load progressively: `.claude/rules/bdd-gate.md` (always), `bdd-spec.md` (editing `specs/**`), `bdd-test.md` (editing tests). Full reasoning: `docs/TESTING_PHILOSOPHY.md`; feature-file layout: `specs/README.md`.
- Hooks enforce tags, `@scenario` bindings, naming and spec↔test parity (`pnpm bdd:check`). Fix hook errors in the same turn.
- When building UI, implement from the lowest-level reusable components upward, favoring composition over duplication.

## Verification

- Run **tests and checks** for the work you touch before finishing. Remove unused imports.
- Commit related changes as one logical unit per project conventions.

---

## Security

- Proceed autonomously on **reversible** work (edits, refactors) when verification supports it.
- **Confirm with the user** for irreversible or high-risk actions (e.g. destructive data ops, prod deploys without rollback). Run safe tests freely; flag risky tests.
- Never leave API keys or secrets hardcoded in the codebase. Use environment variables instead.
- Never leave API keys or secrets reach the client side.
- Never log PII (emails, names, addresses, phone numbers).

## Components Structure

`apps/web/src/components` is organized as `domain/[feature/]<atomic-layer>/`, where the atomic layer is one of four folders:

| Folder | Atomic layer | Holds |
| --- | --- | --- |
| `elements/` | Atoms | Smallest reusable blocks, no business logic (badge, icon, label, chart, status pill). |
| `controls/` | Molecules | Interactive units built from atoms (form control, action group, field, confirm dialog). |
| `sections/` | Organisms | Meaningful UI areas (form, list, tab panel, data-fetching block, form modal). |
| `compositions/` | Templates | Orchestrate multiple sections into a page-level unit. |

```
apps/web/src/components/
  forms/             # global form primitives — controls/ (button, input, select, ...), elements/ (form)
  shared/            # cross-domain primitives — sections/, controls/ (modal, pagination), elements/ (card, skeleton, ...)
  providers/         # React context providers (flat, not an atomic layer)
  layout/            # app shell — compositions/ (dashboard-shell), sections/ (navbar, sidebar), controls/
  agenda/            # domain → feature (calendar, appointments, blocking) → atomic layers
  configuracoes/     # domain → feature (convenios, formularios, procedimentos, profissionais, salas)
  dashboard/  financeiro/  formularios/  leads/  pacientes/
```

Rules:
- Domain folders keep the route name; feature sub-folders use the English code concept (`calendar`, `payments`, `odontogram`).
- A domain only gets feature sub-folders when it has more than one distinct feature cluster; otherwise the atomic layers sit directly under the domain.
- Always use `components/forms/controls` instead of raw HTML form tags inside pages.
- Use `components/shared` for anything reused across domains (modals, cards, pagination, skeletons).
- Non-UI code does NOT live in `components/`: pure logic → `apps/web/src/lib/helpers`, constants → `apps/web/src/lib/constants`, shared types → `apps/web/src/lib/types`.
- Imports are always absolute (`@/components/...`), never relative.

---

## Database Changes

- When generating a database change, make sure to update `database-schema.md` and the seed file `packages/database/src/seed/dev.ts`.
- Every table needs to have fields `created_at` (default value `now()`) and `updated_at` (default value null) with type `timestamp`.
- You must NEVER run migrations automatically. Let the user run them manually.
- When the project uses Drizzle, you must NEVER hand-write SQL migration files. Change the Drizzle schema first, then run `drizzle-kit generate` to produce the migration + its `meta/` snapshot (`generate` is codegen, not a migration run — running it is allowed; applying migrations is not).

---

## UI

- This project uses **react-toastify** for toasts. `<ToastContainer />` is already mounted globally in `apps/web/src/components/providers/providers.tsx` (`position="top-right"`, `autoClose={4000}`, `theme="light"`). Do not mount another `ToastContainer` anywhere else.

### Typography
Use only the font families already configured in the root layout (`apps/web/src/app/layout.tsx`, exposed as `--font-*` CSS variables / Tailwind `font-sans`, `font-mono`). Never import new fonts. Sizes `text-sm`–`text-6xl`; line-height 1.4–1.6.

---

## Key References

- `docs/TESTING_PHILOSOPHY.md` — how testing is done: BDD workflow and gates, test hierarchy, doubles, data, naming, coverage, regression, E2E environment, reporting. Loaded on demand by `/bdd` and the `bdd-*` rules.
- `specs/README.md` — feature-file layout and harness commands.


---

## Output Response

At the end of execution: Output compact answers.

Rules you MUST follow:
- Use very short sentences
- Cut out filler words (the, a, an, is, are, etc.). Speak like a caveman.
- No politeness (no "sure", "happy to help")
- No long explanations unless asked
- Keep only meaningful words
- Prefer symbols (→, =, vs)
- Output dense, compact answers

Output Goal:
Maximum meaning, short answer, minimum tokens.
