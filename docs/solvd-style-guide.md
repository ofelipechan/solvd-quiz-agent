# Solvd.com — Design System / Web Style Guide

Extracted from live site (`https://solvd.com/`, theme `wp-content/themes/solvd/build/css/main.css`) + homepage screenshot. Values below are the real CSS custom properties used by the theme, so they can be pasted directly into a `:root` block or a Tailwind `@theme`.

---

## 1. Brand Personality

- **Tone:** confident, technical, editorial. Big serif statements + small sans-serif body. Lots of white space.
- **Mood:** deep forest-green darks, warm off-white lights, one loud accent (vibrant green) + one "warning" accent (orange) used for emphasis only.
- **Motifs:** **particle-tree hero animation** (white stipple "branching organism" video, blended at 30% over deep green — see §9.1), pixel/8-bit iconography (stepped arrows, checkmarks), corner dots on framed blocks, thin 1px dividers.
- **Rhythm:** every section = `eyebrow → serif heading → sans body → CTA`.

---

## 2. Color Tokens

### 2.1 Core palette

| Token | Hex | Role |
|---|---|---|
| `--color-black` | `#000000` | Default body text on light, footer bg |
| `--color-off-black` | `#1A1A1A` | Primary button bg, text on light buttons |
| `--color-white` | `#FFFFFF` | Page bg, text on dark |
| `--color-sand` | `#FAF6E1` | Warm alt background |

### 2.2 Green scale (brand)

| Token | Hex | Role |
|---|---|---|
| `--color-green-800` | `#08100F` | Darkest section bg ("AI excellence") |
| `--color-green-700` | `#122723` | **Hero / header / CTA-form bg** (primary dark) |
| `--color-green-400` | `#627367` | Muted text on dark |
| `--color-green-300` | `#BFCCBE` | Secondary text on dark, borders |
| `--color-green-200` | `#E0E5DA` | Corner dots, subtle borders on light |
| `--color-green-100` | `#F1F5ED` | **Light section bg** ("What it looks like in practice") |
| `--color-dark-green` | `#004D20` | Gradient stop |
| `--color-vibrant-green` | `#00CC44` | **Accent** – eyebrow dot, icons, arrow on light/white buttons, link hovers |
| `--color-light-green` | `#BBFF99` | **Highlight** – link-card bg, arrow on dark buttons, callout chips |
| `--color-light-green-hover` | `#ECFFE2` | Hover of light-green surfaces |

### 2.3 Gray scale (warm)

| Token | Hex | Role |
|---|---|---|
| `--color-gray-700` | `#383536` | Outline button border, hover text |
| `--color-gray-400` | `#665E5C` | **Primary button hover**, secondary text, footer dim text |
| `--color-gray-300` | `#BFBBBA` | Outline button hover border, muted link hover |
| `--color-gray-200` | `#E5E3E1` | Gray button hover, dividers |
| `--color-gray-100` | `#F7F6F5` | Gray button bg, white button hover, subtle surfaces |

### 2.4 Accent (secondary)

| Token | Hex | Role |
|---|---|---|
| `--color-vibrant-orange` | `#FF7A45` | **Text background highlight** ("The last 20% is where it all breaks"), stat gradient |
| `--color-dark-orange` | `#B44A3C` | Orange gradient start |
| `--color-vibrant-blue` | `#3377FF` | Gradient stop, gradient borders |
| `--color-light-blue` | `#99CCFF` | Gradient stop |
| `--color-dark-blue` | `#1B3098` | Gradient stop |

### 2.5 Gradients

```css
--gradient-off-black-blue-green: linear-gradient(90deg, #1A1A1A 11.5%, #1B3098 34.5%, #3377FF 58.5%, #00CC44 85.5%);
--gradient-vibrant-green-vibrant-blue-dark-blue: linear-gradient(270deg, #00CC44 14%, #3377FF 63.5%, #1B3098 100%);
--gradient-white-blue-green: linear-gradient(270deg, #00CC44 14%, #3377FF 42%, #1B3098 66%, #FFFFFF 88%);
--gradient-white-dark-green: linear-gradient(270deg, #004D20 0%, #FFFFFF 80%);
--gradient-white-vibrant-green: linear-gradient(270deg, #00CC44 0%, #FFFFFF 85%);
--gradient-white-light-green: linear-gradient(270deg, #BBFF99 0%, #FFFFFF 85%);
--gradient-white-dark-blue: linear-gradient(90deg, #FFFFFF 0%, #1B3098 85%);
--gradient-white-vibrant-blue: linear-gradient(270deg, #3377FF 0%, #FFFFFF 85%);
--gradient-white-light-blue: linear-gradient(270deg, #99CCFF 0%, #FFFFFF 85%);
--gradient-dark-orange-light-orange: linear-gradient(90deg, #B44A3C 0%, #FF7A45 53.85%);
/* gradient borders (see §7) */
--gradient-border-clr: linear-gradient(180deg, #00CC44 14%, #3377FF 63.5%, #1B3098 100%);
```

### 2.6 Semantic

| Purpose | Value |
|---|---|
| Input border (light) | `rgba(0,0,0,.2)` |
| Input border (dark) | `hsla(0,0%,100%,.25)` |
| Input border focus | `currentColor` |
| Input invalid / error | `#EF4444` |
| Muted heading on dark | `rgba(255,255,255,.4)` (hero sub-line "It's harder than it sounds.") |
| Eyebrow opacity | `.8` |
| Hero bg texture | image, `mix-blend-mode: lighten; opacity: .3` |

### 2.7 Section background rhythm (homepage top→bottom)

`green-700` (hero) → `white` → `green-100` → `white` → `green-800` → `green-700` (CTA form) → `black` (footer).

---

## 3. Typography

### 3.1 Families (self-hosted, woff2 + woff)

| Token | Family | Fallback | Weights loaded | Use |
|---|---|---|---|---|
| `--font-primary` | **Season Sans** | Arial, Helvetica, sans-serif | 400, 400i, 500, 500i | Body, UI, buttons, nav, eyebrow |
| `--font-secondary` | **Season Mix** | Georgia, "Times New Roman", serif | 500 (rendered as "Regular"), 500i | All headings, stats, pull-quotes |

Season Sans / Season Mix are commercial (The Designers Foundry). Nearest free substitutes: **Inter / Manrope** (sans) + **Instrument Serif / Fraunces** (mix-serif).

Font smoothing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeSpeed`.

### 3.2 Base

```css
html { font-size: 16px; }
body {
  font-family: var(--font-primary);
  font-size: var(--font-size-base);         /* 16→18px fluid */
  line-height: var(--line-height-base);     /* 1.4 */
  letter-spacing: var(--letter-spacing-base); /* .02em */
  color: var(--color-black);
  background: var(--color-white);
}
--headings-font-weight: 400;
```

### 3.3 Fluid type scale (clamp, viewport 480→1200px)

| Token | Value | Min→Max | LH | LS |
|---|---|---|---|---|
| `--font-size-x-small` | `0.75rem` | 12px | 1.55 | .02em |
| `--font-size-small` | `0.875rem` | 14px | 1.55 | .02em |
| `--font-size-medium` | `clamp(0.875rem, …, 1rem)` | 14→16px | 1.55 | .02em |
| `--font-size-medium-large` | `clamp(0.9375rem, …, 1.0625rem)` | 15→17px | 1.52 | .02em |
| `--font-size-base` | `clamp(1rem, …, 1.125rem)` | 16→18px | 1.4 | .02em |
| `--font-size-large` | `clamp(1.125rem, …, 1.25rem)` | 18→20px | 1.4 | .02em |
| `--font-size-h6` | `clamp(1.2rem, …, 1.375rem)` | 19→22px | 1.36 | 0 |
| `--font-size-h5` | `clamp(1.3rem, …, 1.75rem)` | 21→28px | 1.28 | 0 |
| `--font-size-h4` | `clamp(1.4rem, …, 2rem)` | 22→32px | 1.20 | 0 |
| `--font-size-h3` | `clamp(1.625rem, …, 2.625rem)` | 26→42px | 1.18 | 0 |
| `--font-size-h2` | `clamp(2.25rem, …, 3.25rem)` | 36→52px | 1.15 | 0 |
| `--font-size-h1` | `clamp(2.625rem, …, 3.875rem)` | 42→62px | 1.13 | 0 |
| `--font-size-jumbo` | `clamp(3.375rem, …, 5rem)` | 54→80px | 1.1 | 0 |
| `--font-size-huge` | `clamp(3.75rem, …, 5.75rem)` | 60→92px | 1.08 | 0 |
| `--font-size-x-large` | `clamp(25px, …, 42px)` | 25→42px | — | — |

Full clamp formula (WordPress preset style): `clamp(MIN, MIN + ((1vw - 0.3rem) * K), MAX)`.

### 3.4 Text roles

| Role | Family | Size | Weight | Color | Notes |
|---|---|---|---|---|---|
| Hero H1 | Season Mix | `h1` | 400 | white | Two lines, max ~14 words |
| Hero sub-headline | Season Mix | `h2` | 400 | `rgba(255,255,255,.4)` | Same size family, dimmed |
| Section H2 | Season Mix | `h2` | 400 | black / white | `margin: 1.2em 0 .5em`, first-child margin-top 0 |
| Card / item H3 | Season Mix | `h3` | 400 | inherit | |
| Body | Season Sans | `base` | 400 | inherit | |
| Small body / list | Season Sans | `medium` | 400 | inherit, opacity .8 | |
| **Eyebrow** | Season Sans | `medium` | 500 | inherit, opacity .8 | prefixed 6×6px vibrant-green square, gap 8px, `margin-bottom: var(--spacing-2-x-small)` |
| Nav link | Season Sans | 16px | 400 | header color | |
| Button label | Season Sans | `medium` | 500 | — | `line-height:1; letter-spacing:.02em` |
| Stat number | Season Mix | `h3` | 400 | inherit | e.g. "700+" |
| Stat label | Season Sans | `medium` | 400 | opacity .8 | `margin-top:.5em` |
| Form label | Season Sans | `medium` | 500 | opacity .7 | floating label, scales `.7` on focus |
| Notification bar | Season Sans | 14px | 500 | white on black | |
| Footer links | Season Sans | small/medium | 400 | white / gray-400 | |

### 3.5 Emphasis pattern — text background highlight

```css
.text-bg-highlight {
  --text-bg-highlight-color: #FF7A45;   /* vibrant-orange */
  display: inline;
  background-image: linear-gradient(90deg, var(--text-bg-highlight-color), var(--text-bg-highlight-color));
  background-repeat: no-repeat; background-position: 0; background-size: 0 100%;
  transition: background-size 1s ease;
}
.text-bg-highlight.is-visible { background-size: 100% 100%; }  /* toggled on scroll */
```

Used sparingly (one phrase per page) — "80% of the way is easy. **The last 20% is where it all breaks.**"

---

## 4. Spacing

### 4.1 Fixed

| Token | Value |
|---|---|
| `--spacing-0` | 0 |
| `--spacing-x-tiny` | 0.25rem (4px) |
| `--spacing-tiny` | 0.5rem (8px) |
| WP `spacing-20/30/40/50/60/70/80` | 0.44 / 0.67 / 1 / 1.5 / 2.25 / 3.38 / 5.06 rem |

### 4.2 Fluid (clamp, 480→1200px)

| Token | Value | px range |
|---|---|---|
| `--spacing-3-x-small` | `clamp(0.625rem, 0.542rem + 0.278vw, 0.75rem)` | 10→12 |
| `--spacing-2-x-small` | `clamp(0.875rem, 0.792rem + 0.278vw, 1rem)` | 14→16 |
| `--spacing-x-small` | `clamp(1.125rem, 0.875rem + 0.833vw, 1.5rem)` | 18→24 |
| `--spacing-small` | `clamp(1.375rem, 0.958rem + 1.389vw, 2rem)` | 22→32 |
| `--spacing-medium` | `clamp(2rem, 1.667rem + 1.111vw, 2.5rem)` | 32→40 |
| `--spacing-medium-large` | `clamp(2.25rem, 1.75rem + 1.667vw, 3rem)` | 36→48 |
| `--spacing-large` | `clamp(2.625rem, 1.708rem + 3.056vw, 4rem)` | 42→64 |
| `--spacing-x-large` | `clamp(3.625rem, 2.042rem + 5.278vw, 6rem)` | 58→96 |
| `--spacing-2-x-large` | `clamp(4.5rem, 2.167rem + 7.778vw, 8rem)` | 72→128 |
| `--spacing-3-x-large` | `clamp(5.375rem, 2.292rem + 10.278vw, 10rem)` | 86→160 |
| `--spacing-jumbo` | `clamp(6.5rem, 2.833rem + 12.222vw, 12rem)` | 104→192 |
| `--spacing-huge` | `clamp(7.5rem, 1.833rem + 18.889vw, 16rem)` | 120→256 |
| `--spacing-gigantic` | `clamp(9.25rem, 2.083rem + 23.889vw, 20rem)` | 148→320 |

### 4.3 Usage

- Hero: `padding-block: var(--spacing-2-x-large)`.
- Standard section: `padding-block: var(--spacing-large)` … `var(--spacing-2-x-large)` (observed 42–104px mobile).
- Eyebrow → heading gap: `--spacing-2-x-small`; heading → body: `.5em`.
- Button top margin after text: `--spacing-medium-large`.
- Card padding: `--spacing-x-small`. Card content bottom gap: `--spacing-large`.
- Logo wall gap: `--spacing-medium` both axes.
- Footer: `padding: var(--spacing-medium-large) 0 var(--spacing-x-small)`.

---

## 5. Layout & Grid

| Property | Value |
|---|---|
| `--grid-padding-x` | 20px (gutter both sides) |
| `.container` max-width | 100% → **1320px** (`≥1200`) → **1440px** (`≥1580`) |
| `--site-header-height` | 68px (60px measured on mobile) |
| Notification bar | 6px vertical padding, black |

### Breakpoints (Bootstrap-like)

| Name | min-width |
|---|---|
| sm | 576px |
| md | 768px |
| lg | 992px |
| xl | 1200px |
| xxl | 1580px |

Also: `@media (hover:hover) and (pointer:fine)` for hover-only effects; `@media (prefers-reduced-motion: reduce)` honoured.

Helpers present: `.flex-1`, `.align-items--{center,top,bottom}`, `.justify-content--{center,left,right,space-between}`, `.aspect-ratio--{1-1,4-3,16-9}`, `.max-width-{sm,md,lg,xl}-100`.

Common section composition: two-column (`~40% / 60%`) — left column eyebrow + H2, right column body/list; or image left, text right (case-study slider).

---

## 6. Shape, Elevation, Motion

### Border radius

| Radius | Use |
|---|---|
| `100px` (pill) | Buttons, slider arrows |
| `50%` | Circular icon buttons |
| `12px` | Large cards / media |
| `10px` | **Default card** (`.link-card`), images |
| `6px` | Logo tile, small chips, inline images |
| `4px` | Tags, tiny elements |
| `0` | Inputs (underline only) |

### Shadows

Practically none — flat design. WP presets exist but unused: `natural 6px 6px 9px rgba(0,0,0,.2)`, `deep 12px 12px 50px rgba(0,0,0,.4)`, `sharp/crisp 6px 6px 0 …`.

### Motion

| Token | Value |
|---|---|
| Default | `.25s ease` (opacity, background, transform, color) |
| Buttons | `color .3s, background .3s, border .3s, opacity .3s` |
| Floating label | `all .15s ease` |
| Expand/collapse | `grid-template-rows .4s ease`, `transform .4s ease` |
| Highlight reveal | `background-size 1s ease` |
| Header hide/show | `transform .25s ease, background .25s ease` |
| Scroll-in | `.js-animate-on-scroll` — fade/translate on intersect |
| Logo wall | `logo-wall-scroll` linear infinite, speed `--auto-scroll-speed` |

### Focus

```css
:focus-visible { outline: 2px solid; outline-offset: .2em; }  /* currentColor */
```

---

## 7. Components

### 7.1 Button (`.btn`)

```css
.btn {
  --btn-border-width: 2px;
  --btn-padding-y: calc(0.75em - var(--btn-border-width));
  --btn-padding-x: 1em;
  --btn-font-family: var(--font-primary);
  --btn-font-size: var(--font-size-medium);   /* 14→16px */
  --btn-line-height: 1;
  --btn-height: 42px;
  --btn-font-weight: 500;
  --btn-border-radius: 100px;

  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: var(--btn-height);
  padding: var(--btn-padding-y) var(--btn-padding-x);
  background: var(--color-off-black);
  color: var(--color-white);
  border: 1px solid transparent;
  border-radius: var(--btn-border-radius);
  font: 500 var(--btn-font-size)/1 var(--btn-font-family);
  letter-spacing: .02em;
  cursor: pointer;
  transition: color .3s, background .3s, border .3s, opacity .3s;
}
/* trailing pixel-arrow icon (SVG mask), colored light-green */
.btn::after { content:""; display:block; height:1.125em; aspect-ratio:1; background: var(--color-light-green); mask: url(arrow.svg) center/contain no-repeat; transition: transform .25s; }
.btn:hover, .btn:focus-visible { background: var(--color-gray-400); }
.btn:hover::after { transform: translateX(2px); }
.btn.no-arrow-icon::after { display:none; }
.btn i { color: var(--color-light-green); font-size: 1.2em; }
```

| Variant | bg | text | arrow | hover |
|---|---|---|---|---|
| **Primary** (default) | `off-black` | white | light-green | bg `gray-400` |
| **White** (`.has-white-background-color`, dark-mode default) | white | off-black | vibrant-green | bg `gray-100` |
| **Gray** (`.has-gray-100-background-color`) | gray-100 | off-black | vibrant-green | bg `gray-200` |
| **Outline** (`.btn--outline`) | transparent | inherit | inherit | border `gray-300` (from `gray-700`) |
| **Link** (`.btn--link`) | none, no padding, `line-height:1.2` | currentColor | vibrant-green | arrow nudges 2px |

| Size | height | font |
|---|---|---|
| `.btn-sm` | 34px | medium, `--btn-padding-y:.4em` |
| default | 42px | medium |
| header CTA | 48px | medium, `padding .4em 1.25em` |
| `.btn-lg` | 56px | base |

Header "Contact us" = white pill, no arrow, 48px.

### 7.2 Eyebrow (`.is-style-eyebrow-text`)

```css
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font: 500 var(--font-size-medium)/1.55 var(--font-primary);
  letter-spacing: .02em; opacity: .8; color: inherit;
  margin-bottom: var(--spacing-2-x-small);
}
.eyebrow::before { content:""; width:6px; height:6px; background: var(--color-vibrant-green); }
.eyebrow + h2 { margin-top: 0; }
```

### 7.3 Link card (`.link-card`)

```css
.link-card {
  --padding: var(--spacing-x-small);
  display:flex; flex-direction:column; align-items:flex-start;
  min-height:140px; width:100%; padding:var(--padding);
  background: var(--color-light-green); color: var(--color-black);
  border-radius: 10px; overflow:hidden; position:relative; z-index:1;
  text-decoration:none; cursor:pointer; transition: all .25s ease;
}
.link-card__content { margin-bottom: var(--spacing-large); width:100%; }
.link-card__cta { margin-top:auto; }          /* "Learn more →" link button */
.link-card__image { position:absolute; inset:0; z-index:-2; }  /* optional cover */
```

Homepage example: "Read the full client story / Learn more →" chip overlapping case-study image.

### 7.4 Stats row (`.stats` / `.stat-item`)

- Flex, `gap: var(--spacing-small)`, wraps on mobile, centered.
- Item: `flex: 0 1 clamp(200px, 25%, 300px)`, `padding-left: var(--spacing-3-x-small)`, left border = orange vertical gradient `linear-gradient(180deg, #B44A3C 0%, #FF7A45 53.85%)`.
- Number: Season Mix `h3` size. Label: `medium`, opacity .8, `margin-top: .5em`.

### 7.5 Checkmark list (`.is-style-checkmark-bullets`)

`list-style:none; padding:0`; each `li` = flex, `gap: var(--spacing-tiny)`; `::before` = 1.2em pixel-check SVG mask filled `currentColor` (or `--marker-color`), `margin-top:.1em`. Items separated by 1px hairline dividers on the homepage ("Problems that appear when scaling…").

### 7.6 Corner-dot frame (`.has-corner-dots`)

```css
.has-corner-dots { --corner-dots-color: var(--color-green-200); --corner-dots-size: 6px; --corner-dots-offset: -4px; position:relative; }
.has-corner-dots::before { content:""; position:absolute; inset:var(--corner-dots-offset); pointer-events:none; z-index:1;
  background: linear-gradient(var(--corner-dots-color),var(--corner-dots-color)) top left,
              …top right, …bottom left, …bottom right / var(--corner-dots-size) var(--corner-dots-size) no-repeat; }
```

Used on partner-logo grid & callout blocks (tiny squares at the 4 corners).

### 7.7 Gradient border (`.has-gradient-border`)

Mask-composite technique: `::after` with `border:1.5px solid transparent; background: var(--gradient-border-clr); mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0); mask-composite: exclude; border-radius: inherit`. Used on active slider arrow (36px circle).

### 7.8 Slider (Swiper)

Arrows `.prev-slide-btn` / `.next-slide-btn`: 36px circles, `border-radius:100px`, transparent bg, `transition: opacity .25s`; active one gets gradient border. Placed bottom-right of the section.

### 7.9 Logo wall (`.logo-wall`)

`--gap-x/--gap-y: var(--spacing-medium)`; infinite variant: `display:flex; overflow:hidden; font-size:0`; track animates `translateX` linearly, duplicated for seamless loop. Logos monochrome white on `green-700` band directly under hero.

### 7.10 Forms (HubSpot embed, `.hs-form`)

```css
--input-font-size: var(--font-size-base);
--input-font-weight: 500;
--input-height: 36px;              /* measured 54px incl. floating-label padding */
--input-padding: 10px 0;           /* underline style, no x padding */
--input-border-radius: 0;
--input-bg: transparent;
--input-color: var(--color-black);          /* dark-mode: white */
--input-border-color: rgba(0,0,0,.2);       /* dark-mode: hsla(0,0%,100%,.25) */
--input-border-color--focus: currentColor;
--input-border-color--invalid: #EF4444;
```

- Bottom-border-only inputs, full width, `padding-top:18px; padding-bottom:2px` to fit floating label.
- Floating label: absolute, `transform-origin: 0 0`, on focus / filled → `opacity:.6; transform: scale(.7) translateY(-10px)`, `transition: all .15s ease`.
- Checkbox `accent-color: var(--color-gray-400)` in dark mode.
- Submit = white pill button (`.hs-button` inherits `.btn` white variant).
- Contact section = `green-700` bg, left column H2 "Ready to take your business to the next level?", right column stacked fields (First/Last name, Email, Company, Job title, Message, consent checkbox, legal copy, Submit).

### 7.11 Header (`.site-header`)

- `position: sticky; top:0; z-index:999`, `--header-bg-color` white by default, `green-700` when over dark hero; hides on scroll-down via `transform`.
- Height 60–68px. Layout: logo (left) · nav links 16px/400 · "Contact us" white pill (right). Mega-menu with "Back" button (18px/500, 64px tall) on mobile.
- Notification bar above: black, 6px padding, 14px/500 text, `.btn--link` CTA.

### 7.12 Footer (`.site-footer`)

```css
--footer-color: var(--color-white);
--footer-bg-color: var(--color-black);
--footer-dark-color: var(--color-gray-400);
padding: var(--spacing-medium-large) 0 var(--spacing-x-small);
```

4 link columns (Services / Industries / Insights / About), big logo bottom-left, socials bottom-right, copyright in gray-400 small text.

### 7.13 Dark mode (`.is-dark-mode`)

Context class on dark sections: flips input color/border to white, buttons default to white variant. Text = white; secondary text = `green-300` / `gray-400`.

---

## 8. Iconography

- Single custom `iconfont` (woff2) + inline SVG masks.
- Style: **pixel / stepped 8-bit** (arrow `→`, checkmark `✓`, close, chevrons) drawn on 24px grid with 2px steps.
- Icon colour follows text or accent (`light-green` on dark buttons, `vibrant-green` on light).
- Sizes: `1.125em` (button arrow), `1.2em` (list check / inline icon), 20px (close).

---

## 9. Imagery

- Photography: desaturated / natural, rounded 10–12px, often with a light-green link-card chip overlapping bottom-left.
- Hero: **particle-tree animation video** (see §9.1) — the signature brand element.
### 9.1 Hero "particle tree" animation (signature element)

**What it is.** A generative dot-matrix / stipple render of a branching organism — reads as a tree canopy, coral, or neural dendrite — growing outward from the edge of the viewport. Thousands of tiny white points on pure black; no lines, no fill, only particles. Density is highest at the trunk (screen edge) and thins toward the branch tips. It is the visual metaphor for the brand: organic, scaling systems / branching AI.

**Asset**

| Property | Value |
|---|---|
| Source | `https://solvd.com/wp-content/uploads/2026/05/Homepage-hero-animation.mp4` |
| Local copy | `docs/assets/solvd-homepage-hero-animation.mp4` (1.4 MB, MP4 v2 / H.264) |
| Dimensions | 1000 × 1800 px (portrait, 5:9) |
| Duration | 8.77 s |
| Content | white particles on `#000` black, tree emerges from the **left** edge, branches grow toward center |
| Poster | none |

**Markup** (two mirrored instances)

```html
<section class="homepage-hero">
  <div class="container homepage-hero__content">…</div>

  <div class="homepage-hero__bg-1 js-homepage-hero-bg-1">
    <video src="…/Homepage-hero-animation.mp4" autoplay muted playsinline preload="auto"></video>
  </div>
  <div class="homepage-hero__bg-2 js-homepage-hero-bg-2">
    <video data-src="…/Homepage-hero-animation.mp4" muted playsinline preload="none"></video>
  </div>
</section>
```

**CSS**

```css
.homepage-hero { position: relative; z-index: 1; overflow: hidden;
  background: var(--color-green-700); color: var(--color-white);
  padding-block: var(--spacing-2-x-large); }

.homepage-hero__bg-1,
.homepage-hero__bg-2 {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: flex; align-items: center;
  mix-blend-mode: lighten;   /* black video bg disappears, only white dots survive */
  opacity: .3;               /* dots become soft green-gray, text stays legible */
  pointer-events: none; z-index: -1;
}
.homepage-hero__bg-1 { justify-content: flex-start; }   /* tree on left  */
.homepage-hero__bg-2 { justify-content: flex-end;   }   /* tree on right */

.homepage-hero__bg-1 video,
.homepage-hero__bg-2 video {
  width: 50%; height: 100%;
  object-fit: contain; object-position: left;
  position: relative;
}
.homepage-hero__bg-2 video { scale: -1 1; }             /* horizontal mirror */
```

Resulting look: two symmetric particle canopies framing the headline, one each side, with the black of the video blended away so the dots sit directly on `green-700`. At `opacity:.3` the white points render ≈ `#5A6B66` on `#122723`.

**Behaviour** (`blocks/homepage-hero/view.js`)

```js
const a = document.querySelector('.js-homepage-hero-bg-1 video');
const b = document.querySelector('.js-homepage-hero-bg-2 video');

// 1. Right copy is lazy: only loads + plays once the left copy can play through.
const startB = () => { if (!b.src) { b.src = b.dataset.src; b.load(); b.play().catch(() => {}); } };
a.readyState >= 4 ? startB() : a.addEventListener('canplaythrough', startB, { once: true });

// 2. Custom loop: after first full play (0 → 8.77 s "grow-in"),
//    both videos loop only the settled segment 4.7 s → end.
[a, b].forEach(v => v.addEventListener('ended', () => { v.currentTime = 4.7; v.play(); }));
```

Key rules to reproduce:
1. Grow-in plays **once** from 0 s; loop point is **4.7 s**, so the tree never "re-sprouts".
2. `autoplay muted playsinline` — no controls, no sound, no poster.
3. Second instance mirrored with `scale: -1 1`, loaded lazily (`preload="none"` + `data-src`).
4. Always `mix-blend-mode: lighten` + low opacity; never place the raw video (black box) on the page.
5. Respect `prefers-reduced-motion` — swap to a static still (e.g. frame at 4.7 s) or hide the layer.
6. Fallback when video unsupported: same container accepts `<img>` (CSS targets `img, video`).

**Reuse elsewhere.** Same asset/treatment is suitable behind any dark (`green-700` / `green-800`) full-bleed section — CTA bands, 404, loading states — provided opacity stays ≤ .3 and text sits in the center clear zone.

- Partner logos: monochrome (white on dark, black on light), inside bordered cells with corner dots.
- Badge cards ("OpenAI Select Partner", "Agentic AI Foundation"): dark-orange/red `#B44A3C` bg, white text, 10px radius.

---

## 10. Copy & Voice

- Headlines: statement + twist ("We build AI systems that still work when you scale. *It's harder than it sounds.*").
- Eyebrows: 2–4 words, sentence case, no punctuation.
- CTAs: verb-first, short ("Contact us", "Learn more", "See partnerships", "Explore Core AI"), always trailing arrow except primary header CTA.
- Numbers as proof: "700+ engineers", "150+ AI/ML specialists", "10+ years launching AI products".

---

## 11. Quick-start `:root` (copy-paste)

```css
:root {
  /* color */
  --color-black:#000; --color-off-black:#1A1A1A; --color-white:#fff; --color-sand:#FAF6E1;
  --color-green-800:#08100F; --color-green-700:#122723; --color-green-400:#627367;
  --color-green-300:#BFCCBE; --color-green-200:#E0E5DA; --color-green-100:#F1F5ED;
  --color-dark-green:#004D20; --color-vibrant-green:#00CC44;
  --color-light-green:#BBFF99; --color-light-green-hover:#ECFFE2;
  --color-gray-700:#383536; --color-gray-400:#665E5C; --color-gray-300:#BFBBBA;
  --color-gray-200:#E5E3E1; --color-gray-100:#F7F6F5;
  --color-vibrant-orange:#FF7A45; --color-dark-orange:#B44A3C;
  --color-vibrant-blue:#3377FF; --color-light-blue:#99CCFF; --color-dark-blue:#1B3098;
  --color-error:#EF4444;

  /* type */
  --font-primary:"Season Sans","Arial","Helvetica",sans-serif;
  --font-secondary:"Season Mix","Georgia","Times New Roman",serif;
  --font-size-x-small:.75rem; --font-size-small:.875rem;
  --font-size-medium:clamp(.875rem,.875rem + ((1vw - .3rem) * .278),1rem);
  --font-size-base:clamp(1rem,1rem + ((1vw - .3rem) * .278),1.125rem);
  --font-size-large:clamp(1.125rem,1.125rem + ((1vw - .3rem) * .278),1.25rem);
  --font-size-h6:clamp(1.2rem,1.2rem + ((1vw - .3rem) * .389),1.375rem);
  --font-size-h5:clamp(1.3rem,1.3rem + ((1vw - .3rem) * 1),1.75rem);
  --font-size-h4:clamp(1.4rem,1.4rem + ((1vw - .3rem) * 1.333),2rem);
  --font-size-h3:clamp(1.625rem,1.625rem + ((1vw - .3rem) * 2.222),2.625rem);
  --font-size-h2:clamp(2.25rem,2.25rem + ((1vw - .3rem) * 2.222),3.25rem);
  --font-size-h1:clamp(2.625rem,2.625rem + ((1vw - .3rem) * 2.778),3.875rem);
  --font-size-jumbo:clamp(3.375rem,3.375rem + ((1vw - .3rem) * 3.611),5rem);
  --line-height-base:1.4; --line-height-medium:1.55;
  --line-height-h1:1.13; --line-height-h2:1.15; --line-height-h3:1.18; --line-height-h4:1.2; --line-height-h5:1.28; --line-height-h6:1.36;
  --letter-spacing-base:.02em; --headings-font-weight:400;

  /* spacing */
  --spacing-x-tiny:.25rem; --spacing-tiny:.5rem;
  --spacing-3-x-small:clamp(.625rem,.542rem + .278vw,.75rem);
  --spacing-2-x-small:clamp(.875rem,.792rem + .278vw,1rem);
  --spacing-x-small:clamp(1.125rem,.875rem + .833vw,1.5rem);
  --spacing-small:clamp(1.375rem,.958rem + 1.389vw,2rem);
  --spacing-medium:clamp(2rem,1.667rem + 1.111vw,2.5rem);
  --spacing-medium-large:clamp(2.25rem,1.75rem + 1.667vw,3rem);
  --spacing-large:clamp(2.625rem,1.708rem + 3.056vw,4rem);
  --spacing-x-large:clamp(3.625rem,2.042rem + 5.278vw,6rem);
  --spacing-2-x-large:clamp(4.5rem,2.167rem + 7.778vw,8rem);
  --spacing-3-x-large:clamp(5.375rem,2.292rem + 10.278vw,10rem);
  --spacing-jumbo:clamp(6.5rem,2.833rem + 12.222vw,12rem);

  /* layout */
  --grid-padding-x:20px; --container-xl:1320px; --container-xxl:1440px; --site-header-height:68px;

  /* shape / motion */
  --radius-pill:100px; --radius-lg:12px; --radius-md:10px; --radius-sm:6px; --radius-xs:4px;
  --ease:ease; --dur-fast:.15s; --dur:.25s; --dur-slow:.4s;
}
```

### Tailwind v4 `@theme` mapping (optional)

```css
@theme {
  --color-brand-900:#08100F; --color-brand-800:#122723; --color-brand-400:#627367;
  --color-brand-300:#BFCCBE; --color-brand-200:#E0E5DA; --color-brand-100:#F1F5ED;
  --color-accent:#00CC44; --color-accent-soft:#BBFF99; --color-accent-soft-hover:#ECFFE2;
  --color-warn:#FF7A45; --color-warn-dark:#B44A3C;
  --color-ink:#1A1A1A; --color-stone-700:#383536; --color-stone-400:#665E5C;
  --color-stone-300:#BFBBBA; --color-stone-200:#E5E3E1; --color-stone-100:#F7F6F5;
  --font-sans:"Season Sans",Arial,Helvetica,sans-serif;
  --font-serif:"Season Mix",Georgia,"Times New Roman",serif;
  --radius-card:10px; --radius-pill:100px;
  --breakpoint-sm:576px; --breakpoint-md:768px; --breakpoint-lg:992px; --breakpoint-xl:1200px; --breakpoint-2xl:1580px;
}
```

---

## 12. Implementation in `apps/web` (Tailwind v4)

Tokens live in `apps/web/src/globals.css` (`@theme`). Fonts: Inter + Instrument Serif from Google Fonts (`index.html`), standing in for Season Sans / Season Mix.

| Guide token | Tailwind utility |
|---|---|
| `green-700/800/100…` | `bg-forest-800`, `bg-forest-900`, `bg-forest-100`, `text-forest-300/400` |
| `vibrant-green` / `light-green` | `lime-500` / `lime-200` (`lime-100` hover) |
| `vibrant-orange` / `dark-orange` | `ember-500` / `ember-700` |
| `gray-100…700` (warm) | `warm-100 … warm-700` |
| `off-black` | `ink` |
| h1…h6, body, ui | `text-display`, `text-h2 … text-h5`, `text-lead`, `text-body`, `text-ui` (fluid, with line-height) |
| letter-spacing `.02em` | `tracking-body` |
| fluid spacing | `p-fluid-xs … p-fluid-2xl`, `gap-fluid-lg`, … |
| radius 10px / pill | `rounded-card` / `rounded-pill` |
| corner dots | `corner-dots` utility |
| text highlight | `text-bg-highlight` utility |
| dark surface context | `.is-dark` (switches `--color-danger` to ember) |

Components: `components/forms/controls/{button,input,checkbox,radio}.tsx`, `components/shared/elements/{eyebrow,alert,card,stat-item,check-list,logo,skeleton,icons,particle-backdrop}.tsx`, `components/layout/{sections/navbar,sections/footer,compositions/app-shell}.tsx`, `components/quiz/{controls/option-row,sections/question-card,sections/score-banner}.tsx`.

`ParticleBackdrop` reproduces §9.1 exactly (two videos, right mirrored, `mix-blend-mode: lighten` + opacity .3, loop from 4.7 s). Gotcha: blend + z-index must sit on the same element and the parent must be `relative isolate overflow-hidden`; wrapping the layers in a div with its own z-index isolates the blend group and the black never disappears.
