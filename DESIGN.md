# Stressie web design system

The site looks like the app: dark, warm and quiet, with one orange for anything that matters. All tokens live at the top of `site.css` under `:root`. Use the variables, never raw hex, so the light theme keeps working.

## Colour

| Token | Dark (default) | Use |
|---|---|---|
| `--bg` | `#1C1B17` | Page background (the app's background) |
| `--bg-2` | `#22211D` | Alternate band |
| `--card` / `--card-2` / `--card-3` | `#2B2A26` / `#34322E` / `#403D38` | Panels, chips, hover steps |
| `--text` | `#FFFFFF` | Headings, main text |
| `--text-2` | `#E8E5DF` | Nav links, secondary text |
| `--muted` | `#A7A29A` | Leads, captions |
| `--faint` | `#78736B` | Fine print |
| `--line` | white 8% | Dividers |
| `--accent` | `#F3683E` | The app's orange: `<em>` in headings, eyebrows, icons, active states |
| `--red` / `--red-deep` | `#D3451D` / `#B93A17` | The S mark, the vermilion icon pattern, `.btn-red` |
| `--ok` | `#8CCB86` | Success states |

Light theme is opt-in (`html[data-theme="light"]`, toggled by `.theme-btn` and remembered in localStorage). It swaps the same tokens for a warm white page; app close-ups stay dark like the real app. Any new colour must be added to both blocks.

## Type

- Face: the system font (SF Pro on Apple, Inter elsewhere) via `--sans` and `--display`. Caveat is only for the handwritten `.signature`.
- `.h1` 44 to 92px, `.h2` 34 to 64px, `.h3` 22 to 28px, all bold with tight negative tracking. Wrap one key phrase in `<em>` to colour it orange: `Give your shift teams wellness, <em>all around them.</em>`
- `.lead` for the paragraph under a heading (muted, max 600px). `.eyebrow` (orange, with a Phosphor icon) above a heading.

## Layout

- `.wrap` centres content at max 1200px with a 20px gutter (40px from 800px wide).
- Each section is `<section class="sec" id="...">`, usually starting with `.sec-head` (add `.center` to centre it).
- Pages must work at phone width with no sideways scroll. The nav collapses into the `.burger` sheet below 1180px.

## Components

- **Buttons:** `.btn` plus one of `.btn-light` (the single main action per screen), `.btn-dark`, `.btn-red`; `.btn-sm` in the nav. Keep white buttons rare: one main action per screen.
- **Links with an arrow:** `.link` with `<i class="ph ph-arrow-right">`.
- **Chips:** `.chip`; **"coming soon" pill:** `.soon`.
- **Brand:** `.brand` with the inline `<svg class="mark"><use href="#mark"/></svg>` (the S mark is defined once per page). The file is `img/mark.svg`.
- **Vermilion pattern:** any element with `data-pattern` gets the brand-board icon pattern drawn by `site.js` (`data-ps` size, `data-gap`, `data-po` opacity).
- **Header:** the "For companies | For partners" switch (`.aud`, current page has `aria-current="page"`), a few section links, one button that fits the page (Book a demo, or Join as a partner). Change the header and footer on every page together; they are copied, not included.
- **Footer:** `.site-foot` with the pattern card, brand blurb, socials and link columns.

## Icons

Phosphor Icons 2.1.1 from unpkg (regular and fill). Use `<i class="ph ph-name" aria-hidden="true"></i>`. Browse names at phosphoricons.com.

## Motion

- Add `class="reveal"` to a block so it rises in as it scrolls into view. Blocks on the first screen are visible at rest.
- Easing tokens: `--ease-out` (most things), `--ease-io`, `--spring` (small pops).
- The hand-played app close-ups (Home, Discover, Wallet, Partners, Business scenes) and the pinned steps are scripted in `site.js`. Each scene draws on a 520px artboard that scales to fit.
- Everything respects `prefers-reduced-motion` and the pause button. Keep it that way for anything new.

## Images

`img/` holds webp photos (industries, sleep, faces, offers). Export new photos as webp, around 1600px wide at most, and always set `alt` text and `width`/`height`.

## Voice

- Short, plain and warm. Talk about "their shift" and "their night" for employees; the reader of the home page is an employer.
- No em dashes anywhere in copy.
- Only describe real app features. Don't invent partner names, points rules, prices or stats.
- Steps read as 1, 2, 3. No "See how it works" buttons.
