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
3. **Metrics** — also needs nothing: it falls back to the built-in `GITHUB_TOKEN`.
   *Optional upgrade* — a personal access token adds private-contribution counts,
   organisation data and secret achievements:
   1. <https://github.com/settings/tokens/new> → classic token, scopes
      `public_repo`, `read:user`, `repo:status`, `read:org`.
   2. Repo → *Settings → Secrets and variables → Actions → New repository secret*
      `METRICS_TOKEN` = the token.
   3. *Actions → 📊 Metrics → Run workflow* (then set `plugin_achievements_secrets: yes`).
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
| `github-profile-summary-cards.vercel.app` | 200 in **0.1–1.2 s** | ✅ used |
| `skillicons.dev`, `img.shields.io`, `komarev.com`, `readme-typing-svg` | 200, fast | ✅ used |

Everything else is self-generated by `lowlighter/metrics` into the `metrics` branch, so it
is served from `raw.githubusercontent.com` — no third-party rate limits at all. The
**current + longest streak** you would have got from a streak card is shown inside the
isocalendar on `overview.svg`.

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
