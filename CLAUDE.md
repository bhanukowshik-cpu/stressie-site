# CLAUDE.md: the Stressie website

This repo is the live marketing site at https://www.stressieapp.com. It is plain HTML, CSS and JavaScript with no build step, served by GitHub Pages from the `main` branch. **Anything pushed to `main` is live within a minute or two**, so check before you push.

Read `DESIGN.md` before changing how anything looks.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page, for companies (the main audience) |
| `partners.html` | For wellness partners (studios, cafes, gyms) |
| `impact.html` + `impact.css` | Te Vemos impact page, short on purpose |
| `waitlist.html` | Beta waitlist: "For myself" / "For my team" toggle |
| `contact.html` | Book a demo / contact; `contact.html#partner`, `#impact`, `#healthcare` etc. preselect a topic |
| `manifesto.html`, `privacy.html`, `terms.html`, `credits.html` | Inner pages |
| `business.html`, `get.html` | Redirects only (to home and to the waitlist) |
| `site.css` | All styles; tokens at the top |
| `site.js` | All behaviour. Each part checks for its own markup, so one file serves every page |
| `img/` | Images (webp) and `mark.svg` |
| `CNAME` | The custom domain. **Never delete or edit it**, or the site drops off stressieapp.com |
| `.nojekyll` | Tells GitHub Pages to serve files as they are. Keep it |
| `tools/check_links.py` | Link checker. Run before every push |

## How to make a change

1. Pull first: `git pull`.
2. Edit the files. Header and footer are copied into every page, so a nav or footer change means editing all 9 full pages the same way (every HTML file except the two redirects).
3. Preview: open the page in a browser, or run `python -m http.server 8000` in the repo and visit http://localhost:8000. Check phone width too.
4. Run `python tools/check_links.py` and fix anything it reports. LinkedIn and Instagram show as WARN because they block bots; that's fine.
5. Commit with a short plain message and `git push`. Then check the live page.

## Rules

- Keep the `CNAME` file and `.nojekyll`. Don't add `noindex`; the site is public and indexed.
- No em dashes in any copy. Short, plain sentences.
- Only real app features. Flag anything unconfirmed (partner names, points rules, numbers) instead of inventing it.
- The app is in beta: there are no App Store or Google Play links. Every "get the app" action goes to the waitlist, with the line "Currently in beta. Coming soon to iOS and Android."
- One main (white) button per screen. Use the existing classes in `DESIGN.md` before writing new CSS.
- New colours go in both the dark `:root` block and the `html[data-theme="light"]` block.
- Keep animations behind `prefers-reduced-motion` and the pause button.
- Third-party scripts only from the CDNs already in use (unpkg, cdnjs), with pinned versions.

## Things wired to outside services (don't change without asking Bhanu)

- **Waitlist form** posts to a Google Apps Script web app (the `/exec` URL in `site.js`, owned by bhanu@stressieapp.com). It writes to the "Waitlist form Stressie" Google Sheet (individuals on "Employee waitlist", teams on "Employer waitlist") and emails info@stressieapp.com. If the form fields change, the Apps Script must change too.
- **Contact form** has no backend: it opens the visitor's own email with the answers filled in.
- **Hero map** uses MapLibre with OpenFreeMap tiles.
- **Domain and DNS** are in Wix (Domains, then Manage DNS records). The `stressieapp.com` A records and the `www` CNAME point to GitHub Pages. Leave all other records alone: they run email and the app.
