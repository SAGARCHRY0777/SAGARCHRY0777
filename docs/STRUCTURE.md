# 🗂️ Profile repo — structure & maintenance guide

This repository is the GitHub **profile README** for `SAGARCHRY0777`.
Everything visible on <https://github.com/SAGARCHRY0777> comes from here.

```
SAGARCHRY0777/
├── README.md                     ← the profile page (edit this for content)
├── assets/                       ← hand-made animated SVGs (no external deps, fast)
│   ├── hero.svg                  ← animated hero banner (name, chips, orbs, HUD)
│   ├── neural.svg                ← animated neural-net illustration (About section)
│   └── divider.svg               ← animated gradient section divider
├── .github/
│   ├── scripts/
│   │   └── generate-stats.mjs    ← renders the stat cards (no npm dependencies)
│   └── workflows/
│       ├── snake.yml             ← 🐍 contribution snake → branch `output`
│       └── stats.yml             ← 📊 stat cards         → branch `metrics`
└── docs/
    └── STRUCTURE.md              ← this file
```

Generated artifacts live on **separate branches** so `main` never gets noisy bot commits:

| Branch    | Written by   | Files                                        |
|-----------|--------------|----------------------------------------------|
| `output`  | `snake.yml`  | `snake.svg`, `snake-dark.svg`, `snake.gif`   |
| `metrics` | `stats.yml`  | `stats.svg`, `calendar.svg`, `languages.svg`, `rhythm.svg` |

---

## 🚀 First-time setup (do once after pushing)

1. **Push `main`.** Both workflows also trigger on push, so they start immediately.
2. **Snake** — needs nothing. Check *Actions → 🐍 Contribution Snake*. When green, the
   `output` branch exists and the snake shows on the profile.
3. **Stat cards** — needs nothing either. `generate-stats.mjs` uses the built-in
   `GITHUB_TOKEN`, which can read all the public data the cards show. **No personal
   access token is required.**
4. Until each workflow's first successful run, its image shows as broken on the
   profile — that is expected and clears itself.

### Previewing the stat cards locally

The generator has a mock mode, so you can iterate on the design without a token:

```bash
node .github/scripts/generate-stats.mjs --mock   # writes dist/*.svg with fixture data
```

Open `dist/*.svg` in a browser to see them exactly as GitHub will render them.
`dist/` is gitignored — only the workflow publishes it, to the `metrics` branch.

> Workflows need *Settings → Actions → General → Workflow permissions* set to
> **Read and write permissions** (the default for personal repos).

---

## ✏️ Editing guide

| Want to change… | Edit |
|---|---|
| Name / tagline / chips in the banner | `assets/hero.svg` — text lives near the bottom under `<!-- headline -->` and `<!-- chips -->` |
| Typing lines under the banner | `README.md` → the `readme-typing-svg` URL, `lines=` param (`;` separates lines, `+` = space) |
| About-me bullets | `README.md` → **About Me** table, left cell |
| Skill icons | `README.md` → **Tech Arsenal**; icon IDs → <https://skillicons.dev> |
| Extra badges | shields.io: `https://img.shields.io/badge/<label>-<hex>?style=flat-square&logo=<simple-icons-slug>` |
| Featured projects | `README.md` → **Featured Projects** table (6 cards, 2 per row) |
| Roadmap | `README.md` → **2026 Roadmap** table |
| Social links | `README.md` → **Let's Connect** |
| Stat-card design, colours, which numbers show | `.github/scripts/generate-stats.mjs` — palette in the `C` object, one function per card (`statsCard`, `languagesCard`, `calendarCard`) |
| How often stats refresh | `.github/workflows/stats.yml` — the `cron` line |
| Snake colours | `.github/workflows/snake.yml` — `color_snake`, `color_dots` |

### Palette (keep it consistent)

| Token   | Hex       | Used for                       |
|---------|-----------|--------------------------------|
| cyan    | `#22d3ee` | primary accent, links, rings   |
| indigo  | `#818cf8` | gradient mid, secondary badges |
| violet  | `#a78bfa` | orbs, chip borders             |
| pink    | `#f472b6` | gradient end, highlights       |
| ink     | `#0b1020` | dark backgrounds, badge labels |
| slate   | `#9fb3c8` | body text on dark              |

### Previewing locally

* SVGs: open `assets/*.svg` directly in a browser (animations run there exactly as on GitHub).
* README: use the VS Code Markdown preview, or push to a branch and view it on GitHub —
  GitHub's sanitizer strips `<style>` in Markdown, so only inline HTML attributes
  (`align`, `width`, `valign`) and `<picture>` dark/light switching are relied on.

### Why these stat services and not the popular ones?

Measured 2026-08-26 — GitHub proxies every README image through **camo**, which gives up
after a few seconds, so a slow service renders as a broken image even when it eventually
returns 200:

| Service | Result | Verdict |
|---|---|---|
| `github-readme-stats.vercel.app` | `503` | rate-limited — avoid |
| `github-readme-activity-graph.vercel.app` | `402` | hosting paused — avoid |
| `github-profile-trophy.vercel.app` | `402` | hosting paused — avoid |
| `github-readme-streak-stats.herokuapp.com` | dead | Heroku free tier gone — avoid |
| `streak-stats.demolab.com` | 200 but **17–25 s** | too slow for camo — avoid |
| `lowlighter/metrics` action | fails on `GITHUB_TOKEN` | needs a PAT — replaced |
| `github-profile-summary-cards.vercel.app` | 200 in 0.1–1.2 s | fine, but off-theme — replaced |
| `skillicons.dev`, `img.shields.io`, `komarev.com`, `readme-typing-svg` | 200, fast | ✅ used |

**Every stat card is self-generated** by `generate-stats.mjs` into the `metrics` branch and
served from `raw.githubusercontent.com`: no rate limits, no third party that can go
402/503, and the design matches `assets/hero.svg` exactly. Specifically:

* `stats.svg` — replaces `github-readme-stats` **and** the streak card (current + longest
  streak are tiles on it).
* `calendar.svg` — replaces the dead `github-readme-activity-graph`.
* `languages.svg` — replaces the `top-langs` card.
* `rhythm.svg` — replaces the `productive-time` card, computed from the same calendar data.

If you re-add any external card, time it first:

```bash
curl -s -o /dev/null -w "%{http_code} in %{time_total}s\n" "<url>"
```

---

## 🔄 Daily git workflow

```bash
git pull            # bots only write to `output` / `metrics`, so main stays conflict-free
# edit README.md / assets
git add -A
git commit -m "feat(profile): ..."
git push
```
