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
│   └── workflows/
│       ├── snake.yml             ← 🐍 contribution snake  → branch `output`
│       └── metrics.yml           ← 📊 lowlighter/metrics  → branch `metrics`
└── docs/
    └── STRUCTURE.md              ← this file
```

Generated artifacts live on **separate branches** so `main` never gets noisy bot commits:

| Branch    | Written by     | Files                              |
|-----------|----------------|------------------------------------|
| `output`  | `snake.yml`    | `snake.svg`, `snake-dark.svg`, `snake.gif` |
| `metrics` | `metrics.yml`  | `metrics/overview.svg`, `metrics/habits.svg` |

---

## 🚀 First-time setup (do once after pushing)

1. **Push `main`.** Both workflows also trigger on push, so they start immediately.
2. **Snake** — needs nothing. Check *Actions → 🐍 Contribution Snake*. When green, the
   `output` branch exists and the snake shows on the profile.
3. **Metrics** — needs a token:
   1. <https://github.com/settings/tokens/new> → classic token, scopes
      `public_repo`, `read:user`, `repo:status`, `read:org`.
   2. Repo → *Settings → Secrets and variables → Actions → New repository secret*
      `METRICS_TOKEN` = the token.
   3. *Actions → 📊 Metrics → Run workflow*.
4. Until each workflow's first successful run, its image shows as broken on the
   profile — that is expected and clears itself.

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
| Stats layout / plugins | `.github/workflows/metrics.yml` — plugin docs: <https://github.com/lowlighter/metrics> |
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

### Why no `github-readme-stats` cards?

The public `github-readme-stats.vercel.app` instance is heavily rate-limited (returns 503
most of the time), and `github-readme-activity-graph` / `github-profile-trophy` currently
return 402 (their hosting is paused). Self-generating stats with `lowlighter/metrics` and
using `streak-stats.demolab.com` + `github-profile-summary-cards` avoids broken images.

---

## 🔄 Daily git workflow

```bash
git pull            # bots only write to `output` / `metrics`, so main stays conflict-free
# edit README.md / assets
git add -A
git commit -m "feat(profile): ..."
git push
```
