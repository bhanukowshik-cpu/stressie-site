# Stressie web design system

The site looks like the app: warm dark, calm, with soft orange light and glass panels. Use the CSS variables, never raw hex.

**How `site.css` is layered:** the first `:root` block at the top sets the base tokens. Further down, the "Calm dark" section (search for `Calm dark`) overrides some of them and adds the gradients and glass; that later block is what the live site looks like. When you change a token, change it in the block that wins (the later one, if the token appears there).

## Colour (as the live site renders)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#16130F` | Page background, warm near-black. The body adds faint orange glows on top |
| `--bg-2` | `#22211D` | Alternate band |
| `--card` / `--card-2` / `--card-3` | `#2B2A26` / `#34322E` / `#403D38` | App cards, tiles, hover steps |
| `--glass` / `--glass-2` | white 5.5% / 9% | Glass surfaces (chips, notes, forms), with `--glass-edge` and a backdrop blur |
| `--text` | `#FFFFFF` | Headings, main text |
| `--text-2` | `#E8E5DF` | Nav links, secondary text |
| `--muted` | `#A7A29A` | Leads, captions |
| `--faint` | `#78736B` | Fine print |
| `--line` | white 8% | Dividers |
| `--accent` | `#F99A45` | Warm Stressie orange: eyebrows, icons, active states |
| `--orange-a` / `--orange-b` | `#F78521` / `#F05F1C` | The orange gradient on main buttons, pins and active steps |
| `--panel` | orange glow on dark brown | Background of the app close-up stages and big feature panels |
| `--red` / `--red-deep` | `#D3451D` / `#B93A17` | The S mark only |
| `--ok` | `#8CCB86` | Success states |

`<em>` inside `.h1` / `.h2` renders as the orange gradient text (`#FBB15E` to `#F26A2A`).

There is an old light theme in the CSS, but it is switched off (`.theme-btn` is hidden). The site is dark only.

## Type

- Face: the system font (SF Pro on Apple, Inter elsewhere) via `--sans` and `--display`. Caveat is only for the handwritten `.signature`.
- `.h1` 44 to 92px, `.h2` 34 to 64px, `.h3` 22 to 28px, all bold with tight negative tracking. Wrap one key phrase in `<em>` to colour it orange: `Give your shift teams wellness, <em>all around them.</em>`
- `.lead` for the paragraph under a heading (muted, max 600px). `.eyebrow` (orange, with a Phosphor icon) above a heading.

## Layout

- `.wrap` centres content at max 1200px with a 20px gutter (40px from 800px wide).
- Each section is `<section class="sec" id="...">`, usually starting with `.sec-head` (add `.center` to centre it).
- Pages must work at phone width with no sideways scroll. The nav collapses into the `.burger` sheet below 1180px.

## Components

- **Buttons:** `.btn` plus one of `.btn-light` (renders as the orange gradient: the single main action per screen), `.btn-dark`, `.btn-red`; `.btn-sm` in the nav. One main action per screen.
- **Links with an arrow:** `.link` with `<i class="ph ph-arrow-right">`.
- **Chips:** `.chip`; **"coming soon" pill:** `.soon`.
- **Brand:** `.brand` with the inline `<svg class="mark"><use href="#mark"/></svg>` (the S mark is defined once per page). The file is `img/mark.svg`.
- **Icon pattern:** any element with `data-pattern` gets the brand-board icon pattern drawn by `site.js` (`data-ps` icon size, `data-gap` spacing, `data-po` opacity). On panels the icons are faint white.
- **App close-ups:** `.stage` (orange-glow panel) holding `.art` (a 520px artboard) holding `.app` (the dark app card with `.app-title`, `.round` buttons, `.moments` / `.mo` tiles). Reuse these to show any app screen.
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

**Share image:** `img/og.png` (1200x630) is the preview LinkedIn, WhatsApp, iMessage and Slack show. Its source is `og-card.html` in the repo root, which uses `site.css` so it always matches the site. Edit that file, then re-render with the command in its top comment. Every page's `og:` and `twitter:` tags point at it. Icons: `img/favicon-96.png`, `img/apple-touch-icon.png`, `img/icon-192.png`, `img/icon-512.png` (all from `img/mark.svg`).

## Voice

- Short, plain and warm. Talk about "their shift" and "their night" for employees; the reader of the home page is an employer.
- No em dashes anywhere in copy.
- Only describe real app features. Don't invent partner names, points rules, prices or stats.
- Steps read as 1, 2, 3. No "See how it works" buttons.
