---
name: react
description: React/TypeScript coding standards for this dental CRM. Read BEFORE creating or editing any .tsx file — components, pages, forms, layouts. Covers code conventions (React 19 + Tailwind 4 + Lucide, no UI libs), project structure, Atomic Design, the shared Button/forms components, TypeScript standards, security, SEO, accessibility, and pt-BR interface rules. Trigger on any React component / page / .tsx work.
---

# React / Front-end Standards

Mirrors `.cursor/rules/react.mdc`. Apply on all `.tsx` work in this project. See also the `ui-ux` skill for interaction/UX rules.

# Code Conventions
- **Framework**: React 19.2 + TypeScript.
- **Styling**: Tailwind 4.1 CSS classes only.
- **Icons**: Lucide React (`lucide.dev`).
- **JS**: modern ES6+.
- **Lint/format**: ESLint + Prettier.
- **Deps**: PNPM. Do not add deps without approval.
- **Language standards**:
  - Class names, variables, functions, component names → **English**.
  - File names → kebab-case. Functions/variables → camelCase. Classes/types/interfaces → PascalCase.

# Project Structure
App root: `apps/web/src` (`app/` routes, `components/`, `lib/`). Component paths below are relative to it.

# Design System
- Prefer CSS color variables over arbitrary values (`bg-[#e37325]` → variable).
- Interactive elements (buttons, fields) MUST show clear visual feedback on hover/click/select.

## Atomic Design
Break UI into atoms → molecules → organisms → templates → pages. Identify each layer. Use pragmatically, not dogmatically (see `AGENTS.md`).

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
5. Non-UI code does NOT live in `components/`: pure logic → `apps/web/src/lib/helpers`, constants → `apps/web/src/lib/constants`, shared types → `apps/web/src/lib/types`.
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
- TypeScript best practices. Type all variables, params, returns. Shared types in `apps/web/src/lib/types`.
- Responsive, mobile-first. Semantic HTML for a11y. Optimize perf + SEO.
- Proper error handling + loading states.
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

# Typography
Use only the font families already configured in the root layout (`apps/web/src/app/layout.tsx`, exposed as `--font-*` CSS variables / Tailwind `font-sans`, `font-mono`). Never import new fonts. Sizes `text-sm`–`text-6xl`; line-height 1.4–1.6.

