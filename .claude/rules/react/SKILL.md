---
name: react
description: React/TypeScript coding standards for this dental CRM. Read BEFORE creating or editing any .tsx file — components, pages, forms, layouts. Covers code conventions (React 19 + Tailwind 4 + Lucide, no UI libs), project structure, Atomic Design, the shared Button/forms components, TypeScript standards, security, SEO, accessibility, and pt-BR interface rules. Trigger on any React component / page / .tsx work.
---

# React / Front-end Standards

Mirrors `.cursor/rules/react.mdc`. Apply on all `.tsx` work in this project. See also the `ui-ux` skill for interaction/UX rules.

# Role
Senior front-end engineer. Proactive, autonomous, reusability-minded. Deliver polished, vetted, maintainable, extensible solutions. Resolve ambiguity with reasoned decisions; take full ownership of context and implementation strategy.

# Code Conventions
- **Framework**: React 19.2 + TypeScript.
- **Styling**: Tailwind 4.1 CSS classes only.
- **UI libs**: DO NOT use UI libraries (radix-ui, etc.). Build layout with Tailwind.
- **Icons**: Lucide React (`lucide.dev`).
- **JS**: modern ES6+.
- **Lint/format**: ESLint + Prettier.
- **Deps**: PNPM. Do not add deps without approval.
- **Language standards**:
  - Class names, variables, functions, component names → **English**.
  - File names → kebab-case. Functions/variables → camelCase. Classes/types/interfaces → PascalCase.

# Project Structure
```
src/
  app/                   # routes and pages
  api/                   # API route handlers
  components/          # domain/[feature/]<atomic-layer>/ — see "Components Structure"
    forms/             # global form primitives (MUST use instead of raw form tags)
    shared/            # cross-domain primitives (modal, card, pagination, skeleton, ...)
    providers/         # React context providers (theme, session, query, ...)
    layout/            # app shell (dashboard-shell, navbar, sidebar, breadcrumb)
    <domain>/          # agenda, configuracoes, dashboard, financeiro, formularios, leads, pacientes
  types/                 # shared TS types
  utils/                 # formatBRL.ts, formatString.ts, ...
  globals.css
  layout.tsx  loading.tsx  not-found.tsx  page.tsx  robots.ts  sitemap.ts
```

# Design System
- Prefer CSS color variables over arbitrary values (`bg-[#e37325]` → variable).
- Interactive elements (buttons, fields) MUST show clear visual feedback on hover/click/select.

## Atomic Design
Break UI into atoms → molecules → organisms → templates → pages. Identify each layer. Use pragmatically, not dogmatically (see `CLAUDE.md`).

## Components Structure

Every component lives at `components/<domain>/[<feature>/]<atomic-layer>/<file>.tsx`, where the atomic layer is one of:

| Folder | Atomic layer | Holds |
| --- | --- | --- |
| `elements/` | Atoms | Smallest reusable blocks, no business logic (badge, icon, label, chart, status pill). |
| `controls/` | Molecules | Interactive units built from atoms (form control, action group, field, confirm dialog). |
| `sections/` | Organisms | Meaningful UI areas (form, list, tab panel, data-fetching block, form modal). |
| `compositions/` | Templates | Orchestrate multiple sections into a page-level unit. |

```
components/pacientes/
  compositions/        # patients-explorer, patient-detail-content
  sections/            # patient-form, patient-list, patient-detail-tabs, ...
  controls/            # new-patient-modal, novo-paciente-button
  odontogram/          # feature sub-folder, same four layers inside
    sections/  controls/  elements/
```

1. `components/forms/controls/` — Button, Input, Select, Radio, Checkbox, TextArea, DateInput. **MUST be used instead of raw HTML form tags inside pages.** No external UI libs; Tailwind only.
2. `components/shared/` — reused across domains (modal, card, pagination, skeleton, tooltip, ...).
3. Domain folders keep the route name (pt-BR); feature sub-folders use the English code concept (`calendar`, `payments`, `odontogram`).
4. Add a feature sub-folder only when a domain has more than one distinct feature cluster; otherwise the four layers sit directly under the domain.
5. Non-UI code does NOT live in `components/`: pure logic → `src/lib/helpers`, constants → `src/lib/constants`, shared types → `src/lib/types`.
6. Imports are always absolute (`@/components/...`), never relative.
7. Optimize for maintainability, reusability, scalability.

## Button (`components/forms/controls/button.tsx`)
Used app-wide.
- Variants: `primary | secondary | outline | alert | ghost | danger`.
- Sizes: `sm | md | lg`.
- Loading state disables the button.
- Type: `button | submit | reset`.
- Default `cursor-pointer` (except disabled).

# Implementation Guidelines
- TypeScript best practices. Type all variables, params, returns. Shared types in `src/lib/types`.
- Responsive, mobile-first. Semantic HTML for a11y. Optimize perf + SEO.
- Proper error handling + loading states.
- Lazy-load images; responsive image sizes. Infinite scroll / chunked video when applicable.
- Every clickable element gets a matching cursor class (`cursor-pointer`).

## Theme
Brand colors work in both light/dark. Maintain a11y across themes. Persist theme preference.

## Page Creation
1. Break each major section into a reusable, role-named component (`HeroSection`, `UserStats`, ...).
2. No raw HTML form tags in pages — import from `components/forms/controls`.
3. Use `components/shared` for modals/headers/footers.

## Security
- Validate + sanitize user input (SQLi, XSS).
- Encode output to prevent XSS.
- NEVER put env vars, keys, passwords, credentials, or secrets in front-end code.

# SEO & Performance
- Titles ≤60 chars; meta descriptions 150–160.
- Open Graph + Twitter Card tags. JSON-LD schema (`pt-BR` codes). Canonical URLs. Dynamic sitemap. robots.txt.
- H1–H6 hierarchy; descriptive alt text; logical internal links; clean URLs.
- Image optimization + lazy loading; WebP + fallbacks; responsive images. Route/component code splitting; caching headers.
- Core Web Vitals (LCP, FID, CLS, TTFB); Lighthouse 90+ all categories.

# Accessibility (WCAG 2.1 AA)
- Keyboard-accessible; visible focus; skip-to-content; ARIA on complex components; logical tab order; screen-reader tested.
- Contrast 4.5:1 normal / 3:1 large; 200% zoom no h-scroll; body ≥16px rem/em; don't rely on color alone.
- Form labels via `for`/`aria-labelledby`; required marked visually + programmatically; real-time validation; proper button disabled/loading/active states; touch targets ≥44px.
- axe-core automated + manual keyboard / screen-reader / color-blind / mobile passes.
