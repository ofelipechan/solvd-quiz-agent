---
name: ui-ux
description: UI/UX standards for this dental CRM. Read BEFORE creating or updating any UI element — pages, forms, tables, modals, buttons, empty/error/loading states, toasts, navigation. Covers interaction feedback, perceived performance, forms, accessibility (WCAG 2.1 AA), responsive patterns, and project visual language. Trigger on any front-end / component / styling / UX work.
---

# UI/UX Standards

Mirrors `.cursor/rules/ui-ux.mdc`. Apply on all UI work in this project.

## Core Principle

UX is not "adding animations" — it is **removing uncertainty**. At every moment the user must be able to answer:

> What can I do? · Did my action register? · What is the system doing? · Did it succeed? · If it failed, what now? · Where am I? · What happens if I click this?

**Every action needs feedback.** Mental model:

```
USER ACTION → SYSTEM ACKNOWLEDGEMENT → SYSTEM RESULT → NEXT POSSIBLE ACTION
```

- Save: `Click "Salvar" → "Salvando..." (disabled) → API → toast "Paciente atualizado com sucesso"`
- Delete fail: `Click "Excluir" → confirm modal → "Excluindo..." → API fails → toast "Não foi possível excluir o paciente" → [tentar novamente]`

This separates a functional website from an app that feels **well-designed**.

## Priority When Improving Existing UI

Do not apply improvements randomly.

- **Tier 1 (high impact / low effort):** hover states · pointer cursor · loading states · success/error toasts · inline form validation · prevent double submission · preserve form data on errors · good empty states · good error states + retry · enable/disable actions appropriately.
- **Tier 2 (high impact):** skeleton loaders · optimistic UI · smart defaults · autosave · undo · search suggestions · persistent filters · keyboard nav · unsaved-change protection · responsive interaction patterns.
- **Tier 3 (premium feel):** microanimations · button state transitions · smooth page transitions · contextual tooltips · command palette · keyboard shortcuts · advanced table customization · progressive onboarding · contextual hints · perceived-performance tuning.

## 1. Interaction Feedback
Pointer cursor on all clickables · hover states · active/pressed states · visible focus (never remove outline without replacing) · loading states (prevent re-click) · button loading state (spinner/disable) · success toast · error toast (say what to do / can retry) · inline validation near field · optimistic UI when success likely.

## 2. Perceived Speed
Skeleton loaders (not blank/spinner) · spinner thresholds: `<300ms` nothing, `300ms–1s` subtle, `>1s` feedback, `>3s` explain · progress indicators ("Enviando... 67%") · preserve content while refreshing (don't blank page) · instant navigation feedback (Next.js).

## 3. Intelligent Buttons & Actions
Disable when impossible (or allow + explain why) · prevent double submission (payments, forms, records, messages, appointments, uploads) · confirm destructive actions with consequence via `Modal` (`apps/web/src/components/shared/controls/modal.tsx`) · undo for low-risk deletes · contextual actions inside rows.

## 4. Forms
Keep labels visible (not placeholder-only) · never erase input on error, highlight + scroll to error · validate on blur/submit, not while typing · errors next to field · explain how to fix ("CPF deve conter 11 dígitos, ex: 123.456.789-00") · auto-format CPF/CNPJ/telefone/CEP/moeda/data/cartão · auto-focus first field · smart keyboard nav (Tab/Enter/arrows) · don't re-ask known info.

## 5. Empty States
Meaningful empty states: what happened + why empty + CTA (not "Sem dados") · differentiate empty vs error · first-use onboarding-flavored UX.

## 6. Error Handling
No generic "algo deu errado" · always provide recovery + `[Tentar novamente]` · auto-retry transient network failures once/twice · never show technical errors (`500`, `ECONNREFUSED`, `PrismaClientKnownRequestError`) — translate, log separately, **never log PII**.

## 7. Toasts
react-toastify, mounted globally (see `AGENTS.md`). Use for saved/deleted/copied/updated/sent · duration by importance · non-blocking · stack intelligently. Toast vs Alert vs Modal rules in `AGENTS.md`.

## 8. Microinteractions
Smooth transitions (dropdowns/modals/sidebar/cards) · animate state changes (♡→♥) · skeleton shimmer · button success animation (`Salvar`→`⟳ Salvando...`→`✓ Salvo`) · smooth expand/collapse.

## 9. Navigation
Breadcrumbs for hierarchy · highlight current section · preserve nav state on back · remember preferences (columns, sort, filters, sidebar, theme, page size) — view state MUST live in the URL (`?sort=`, `?filter=`, `?page=`, `?pageSize=`, `?columns=`, sidebar) via `useSearchParams` + `router.replace`, so it survives refresh/back and is shareable; only theme stays client-side, not in the URL · keyboard shortcuts (N, `/`, ⌘K, Esc).

## 10. Search
Search-as-you-type when safe · debounce ~200–300ms · suggestions · recent searches · highlight matches.

## 11. Tables & Dashboards
Sortable columns · filtering (status, date range) · pagination preferred for business apps · sticky headers · row hover · clickable rows communicated via hover · column customization.

## 12. Modals & Overlays
Don't overuse · `Esc` closes non-destructive dialogs · click-outside closes dropdowns/popovers but NOT important forms · preserve modal state on accidental close.

## 13. Clipboard
`[ Copiar ]` → `[ ✓ Copiado ]` feedback · copy buttons for identifiers (UUID, código de pagamento, ID da consulta, número da nota).

## 14. Responsive UX
Don't just shrink desktop (row actions → `⋮` menu) · touch targets ≥44px · sticky mobile action bar · avoid horizontal scrolling.

## 15. Accessibility (WCAG 2.1 AA)
Keyboard-accessible + logical tab order + skip-to-content · visible focus · contrast 4.5:1 (3:1 large), 200% zoom no h-scroll · don't rely on color alone ("⚠ Erro" not just red) · screen-reader labels on icon-only controls · form labels via `for`/`aria-labelledby`, required marked visually + programmatically · body ≥16px rem/em · axe-core + manual keyboard/color-blind passes.

## 16. Smart Defaults
Pre-populate likely values (60min appointment) · remember previous selections · default to most likely action (auto-associate patient from context).

## 17. Long Operations
Explain what's happening ("Gerando PDF...") · allow cancellation · warn before leaving with unsaved changes.

## 18. Onboarding
Progressive (not 15 tooltips upfront) · tooltips for unfamiliar icons · contextual hints when relevant · always skippable.

## 19. Perceived Polish
Consistency > "cool" interactions. Consistent border radius (`rounded-xl`/`rounded-2xl`) · consistent spacing scale · consistent typography (fonts from root layout only — see react rules; `text-sm`–`text-6xl`, line-height 1.4–1.6) · one icon set · consistent interaction patterns.

## Visual Language
Gradient backgrounds + glassmorphism (`backdrop-blur`) · rounded corners · brand-tinted shadows · smooth transitions (`duration-300/500/700`) + scale-on-hover · high contrast + readability.
