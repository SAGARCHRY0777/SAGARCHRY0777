#!/usr/bin/env node
/**
 * Self-hosted GitHub stat cards.
 *
 * Queries the GitHub GraphQL API with the workflow's built-in GITHUB_TOKEN
 * (no personal access token needed — every field below is public data) and
 * renders SVG cards that match the profile's hero design.
 *
 *   node generate-stats.mjs            # live data  (needs GITHUB_TOKEN + GH_USER)
 *   node generate-stats.mjs --mock     # fixture data, for local visual checks
 *
 * Output → dist/stats.svg, dist/languages.svg, dist/calendar.svg
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MOCK = process.argv.includes("--mock");
const USER = process.env.GH_USER || "SAGARCHRY0777";
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist");

/* ── palette (kept in sync with assets/hero.svg) ─────────────────────────── */
const C = {
  bg: "#0b1020",
  bgDeep: "#05070f",
  panel: "#0f172a",
  stroke: "#1e293b",
  cyan: "#22d3ee",
  indigo: "#818cf8",
  violet: "#a78bfa",
  pink: "#f472b6",
  green: "#34d399",
  text: "#e2e8f0",
  dim: "#9fb3c8",
  faint: "#64748b",
};
const SERIES = [C.cyan, C.indigo, C.violet, C.pink, "#34d399", "#fbbf24", "#fb7185", "#38bdf8"];
const FONT_UI = `"Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif`;
const FONT_MONO = `"JetBrains Mono","Fira Code",Consolas,"Courier New",monospace`;

/* ── helpers ─────────────────────────────────────────────────────────────── */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

const compact = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const fmtDate = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* ── data ────────────────────────────────────────────────────────────────── */
const QUERY = `
query ($login: String!, $from: DateTime!) {
  user(login: $login) {
    name
    createdAt
    followers { totalCount }
    following { totalCount }
    # Every public repo, forks included — matches the count shown on the profile page.
    allRepositories: repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
    # Own work only: forks would badly skew the language breakdown.
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes {
        name
        stargazerCount
        forkCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection(from: $from) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoryContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": `${USER}-profile-stats`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`);
  return json.data;
}

/** GitHub only returns one year of contributions per query, so walk year by year. */
async function fetchAll() {
  const first = await gql(QUERY, { login: USER, from: new Date(Date.now() - 364 * 864e5).toISOString() });
  const user = first.user;
  const createdYear = new Date(user.createdAt).getUTCFullYear();
  const thisYear = new Date().getUTCFullYear();

  const days = new Map();
  const addDays = (collection) => {
    for (const w of collection.contributionCalendar.weeks)
      for (const d of w.contributionDays) days.set(d.date, d.contributionCount);
  };
  addDays(user.contributionsCollection);

  let totals = {
    commits: user.contributionsCollection.totalCommitContributions,
    prs: user.contributionsCollection.totalPullRequestContributions,
    issues: user.contributionsCollection.totalIssueContributions,
  };

  for (let y = createdYear; y < thisYear; y++) {
    try {
      const past = await gql(QUERY, { login: USER, from: `${y}-01-01T00:00:00Z` });
      addDays(past.user.contributionsCollection);
      totals.commits += past.user.contributionsCollection.totalCommitContributions;
      totals.prs += past.user.contributionsCollection.totalPullRequestContributions;
      totals.issues += past.user.contributionsCollection.totalIssueContributions;
    } catch (e) {
      console.warn(`  ! skipped ${y}: ${e.message}`);
    }
  }
  return { user, days, totals };
}

function mockData() {
  const days = new Map();
  const today = new Date();
  for (let i = 400; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 864e5).toISOString().slice(0, 10);
    const burst = i % 37 < 4 ? 1 : 0;
    days.set(d, Math.random() < 0.14 + burst * 0.4 ? Math.ceil(Math.random() * (burst ? 9 : 4)) : 0);
  }
  days.set(today.toISOString().slice(0, 10), 3);
  return {
    user: {
      name: "Sagar Chaudhary",
      createdAt: "2023-12-18T09:56:55Z",
      followers: { totalCount: 2 },
      following: { totalCount: 5 },
      allRepositories: { totalCount: 46 },
      repositories: {
        totalCount: 29,
        nodes: [
          { stargazerCount: 3, forkCount: 1, languages: { edges: [{ size: 480000, node: { name: "Python", color: "#3572A5" } }] } },
          { stargazerCount: 1, forkCount: 0, languages: { edges: [{ size: 210000, node: { name: "Jupyter Notebook", color: "#DA5B0B" } }] } },
          { stargazerCount: 0, forkCount: 0, languages: { edges: [{ size: 96000, node: { name: "TypeScript", color: "#3178c6" } }] } },
          { stargazerCount: 0, forkCount: 0, languages: { edges: [{ size: 54000, node: { name: "JavaScript", color: "#f1e05a" } }] } },
          { stargazerCount: 0, forkCount: 0, languages: { edges: [{ size: 21000, node: { name: "C++", color: "#f34b7d" } }] } },
          { stargazerCount: 0, forkCount: 0, languages: { edges: [{ size: 9000, node: { name: "Shell", color: "#89e051" } }] } },
        ],
      },
    },
    days,
    totals: { commits: 143, prs: 11, issues: 8 },
  };
}

/* ── derived stats ───────────────────────────────────────────────────────── */
function streaks(days) {
  const sorted = [...days.keys()].sort();
  const today = new Date().toISOString().slice(0, 10);
  let longest = 0, longestEnd = null, run = 0, runStart = null, longestStart = null;

  for (const date of sorted) {
    if (days.get(date) > 0) {
      if (run === 0) runStart = date;
      run++;
      if (run > longest) { longest = run; longestEnd = date; longestStart = runStart; }
    } else if (date < today || days.get(date) === 0) {
      run = 0;
    }
  }

  // current streak: walk backwards from today (today not yet counted is fine)
  let current = 0, cursor = new Date(`${today}T00:00:00Z`), currentStart = null;
  if ((days.get(today) ?? 0) === 0) cursor = new Date(cursor.getTime() - 864e5);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if ((days.get(key) ?? 0) > 0) { current++; currentStart = key; cursor = new Date(cursor.getTime() - 864e5); }
    else break;
  }
  return { current, currentStart, longest, longestStart, longestEnd };
}

function languages(nodes) {
  const totals = new Map();
  for (const repo of nodes)
    for (const { size, node } of repo.languages.edges)
      totals.set(node.name, { size: (totals.get(node.name)?.size ?? 0) + size, color: node.color });

  const ranked = [...totals.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.size - a.size);
  const grand = ranked.reduce((s, l) => s + l.size, 0) || 1;
  const top = ranked.slice(0, 6);
  const rest = ranked.slice(6).reduce((s, l) => s + l.size, 0);
  if (rest > 0) top.push({ name: "Other", size: rest, color: C.faint });
  return top.map((l, i) => ({ ...l, pct: (l.size / grand) * 100, color: l.color || SERIES[i % SERIES.length] }));
}

/* ── shared SVG bits ─────────────────────────────────────────────────────── */
const defs = (id) => `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.bgDeep}"/><stop offset="60%" stop-color="${C.bg}"/><stop offset="100%" stop-color="#140b2e"/>
    </linearGradient>
    <linearGradient id="${id}-accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.cyan}"/><stop offset="50%" stop-color="${C.indigo}"/><stop offset="100%" stop-color="${C.pink}"/>
    </linearGradient>
    <pattern id="${id}-grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="#38bdf8" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
    <filter id="${id}-glow" x="-30%" y="-60%" width="160%" height="220%">
      <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

const baseCss = `
  .h  { font: 700 15px ${FONT_UI}; fill: ${C.text}; letter-spacing: 1px; }
  .lbl{ font: 500 11px ${FONT_MONO}; fill: ${C.faint}; letter-spacing: 2px; }
  .num{ font: 800 34px ${FONT_UI}; fill: ${C.text}; }
  .sm { font: 500 12px ${FONT_UI}; fill: ${C.dim}; }
  .in { animation: rise .8s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes rise { from { opacity:0; transform: translateY(12px) } to { opacity:1; transform: translateY(0) } }
  .pulse { animation: pulse 3s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:.45 } 50% { opacity:1 } }`;

const frame = (id, w, h, title) => `
  <rect width="${w}" height="${h}" rx="20" fill="url(#${id}-bg)"/>
  <rect width="${w}" height="${h}" rx="20" fill="url(#${id}-grid)"/>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="19" fill="none" stroke="${C.stroke}" stroke-width="2"/>
  <rect x="24" y="26" width="4" height="16" rx="2" fill="url(#${id}-accent)"/>
  <text class="h" x="40" y="40">${esc(title)}</text>
  <circle class="pulse" cx="${w - 30}" cy="34" r="4" fill="${C.green}"/>
  <text class="lbl" x="${w - 44}" y="38" text-anchor="end">LIVE</text>`;

/* ── card 1 · headline stats ─────────────────────────────────────────────── */
function statsCard(d) {
  const W = 860, H = 260, id = "s";
  const repos = d.user.repositories;
  const stars = repos.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  const forks = repos.nodes.reduce((s, r) => s + r.forkCount, 0);
  const total = [...d.days.values()].reduce((s, n) => s + n, 0);
  const st = streaks(d.days);

  const tiles = [
    { label: "CONTRIBUTIONS", value: compact(total), sub: `since ${fmtDate(d.user.createdAt.slice(0, 10))}`, color: C.cyan },
    { label: "CURRENT STREAK", value: `${st.current}`, sub: st.current ? `${st.current === 1 ? "day" : "days"} · ${st.currentStart ? fmtDate(st.currentStart) : ""}` : "start one today", color: C.pink },
    { label: "LONGEST STREAK", value: `${st.longest}`, sub: st.longestStart ? `${fmtDate(st.longestStart)} →` : "—", color: C.violet },
    {
      label: "REPOSITORIES",
      value: compact(d.user.allRepositories?.totalCount ?? repos.totalCount),
      sub: `${compact(repos.totalCount)} original${stars ? ` · ${compact(stars)} star${stars === 1 ? "" : "s"}` : ""}${forks ? ` · ${compact(forks)} fork${forks === 1 ? "" : "s"}` : ""}`,
      color: C.indigo,
    },
  ];

  const cols = tiles.map((t, i) => {
    const x = 30 + i * 202, y = 74;
    return `
    <g class="in" style="animation-delay:${0.1 + i * 0.12}s">
      <rect x="${x}" y="${y}" width="186" height="150" rx="14" fill="${C.panel}" fill-opacity=".75" stroke="${t.color}" stroke-opacity=".35"/>
      <rect x="${x}" y="${y}" width="186" height="3" rx="1.5" fill="${t.color}"/>
      <text class="lbl" x="${x + 16}" y="${y + 30}" style="fill:${t.color}">${esc(t.label)}</text>
      <text class="num" x="${x + 16}" y="${y + 78}" filter="url(#${id}-glow)">${esc(t.value)}</text>
      <text class="sm" x="${x + 16}" y="${y + 108}">${esc(t.sub)}</text>
    </g>`;
  }).join("");

  const footer = `commits ${compact(d.totals.commits)}  ·  pull requests ${compact(d.totals.prs)}  ·  issues ${compact(d.totals.issues)}  ·  followers ${compact(d.user.followers.totalCount)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub statistics for ${esc(USER)}">
${defs(id)}
  <style>${baseCss}</style>
  ${frame(id, W, H, "GITHUB · MISSION CONTROL")}
  ${cols}
  <text class="lbl" x="${W / 2}" y="${H - 16}" text-anchor="middle">${esc(footer)}</text>
</svg>`;
}

/* ── card 2 · languages ──────────────────────────────────────────────────── */
function languagesCard(d) {
  const W = 420, H = 260, id = "l";
  const langs = languages(d.user.repositories.nodes);
  const barX = 26, barY = 70, barW = W - 52, barH = 16;

  let cursor = 0;
  const segments = langs.map((l, i) => {
    const w = Math.max((l.pct / 100) * barW, 2);
    const seg = `<rect x="${(barX + cursor).toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" fill="${l.color}">
        <animate attributeName="width" from="0" to="${w.toFixed(1)}" dur=".9s" begin="${(i * 0.09).toFixed(2)}s" fill="freeze"/>
      </rect>`;
    cursor += w;
    return seg;
  }).join("");

  const legend = langs.map((l, i) => {
    const x = 26 + (i % 2) * 196, y = 118 + Math.floor(i / 2) * 34;
    return `
    <g class="in" style="animation-delay:${0.3 + i * 0.07}s">
      <rect x="${x}" y="${y}" width="10" height="10" rx="3" fill="${l.color}"/>
      <text class="sm" x="${x + 18}" y="${y + 9}">${esc(l.name)}</text>
      <text class="lbl" x="${x + 176}" y="${y + 9}" text-anchor="end">${l.pct.toFixed(1)}%</text>
    </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Most used languages">
${defs(id)}
  <style>${baseCss}</style>
  ${frame(id, W, H, "LANGUAGE DISTRIBUTION")}
  <clipPath id="${id}-clip"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="8"/></clipPath>
  <g clip-path="url(#${id}-clip)">
    <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${C.panel}"/>
    ${segments}
  </g>
  ${legend}
</svg>`;
}

/* ── card 3 · contribution calendar ──────────────────────────────────────── */
function calendarCard(d) {
  const CELL = 11, GAP = 3, WEEKS = 53;
  const gridW = WEEKS * (CELL + GAP);
  const W = gridW + 78, H = 200, id = "c";
  const originX = 44, originY = 74;

  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * 864e5);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // align to Sunday

  const max = Math.max(1, ...d.days.values());
  const shade = (n) => {
    if (!n) return { fill: C.panel, op: 0.85 };
    const t = Math.min(1, Math.log1p(n) / Math.log1p(max));
    const stops = ["#0e7490", "#0891b2", "#22d3ee", "#67e8f9"];
    return { fill: stops[Math.min(stops.length - 1, Math.floor(t * stops.length))], op: 1 };
  };

  // One <g> per week carrying the fade delay, instead of an <animate> per cell:
  // ~53 animated nodes instead of ~370, and no dead <title> tooltips (they never
  // surface when the SVG is embedded via <img>). Keeps the card small and fast.
  const columns = [];
  const monthTicks = [];
  let seenMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const rects = [];
    for (let dow = 0; dow < 7; dow++) {
      const date = new Date(start.getTime() + (w * 7 + dow) * 864e5);
      if (date > end) continue;
      const key = date.toISOString().slice(0, 10);
      const n = d.days.get(key) ?? 0;
      const { fill, op } = shade(n);
      const x = originX + w * (CELL + GAP), y = originY + dow * (CELL + GAP);
      rects.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}"${op === 1 ? "" : ` opacity="${op}"`}/>`);
      if (dow === 0 && date.getUTCMonth() !== seenMonth) {
        seenMonth = date.getUTCMonth();
        monthTicks.push(
          `<text class="lbl" x="${x}" y="${originY - 10}">${date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase()}</text>`
        );
      }
    }
    if (rects.length) columns.push(`<g class="wk" style="animation-delay:${(w * 0.012).toFixed(3)}s">${rects.join("")}</g>`);
  }

  const dayLabels = ["MON", "WED", "FRI"].map((l, i) => `<text class="lbl" x="${originX - 10}" y="${originY + (1 + i * 2) * (CELL + GAP) + 9}" text-anchor="end" style="font-size:9px">${l}</text>`).join("");

  const legendX = W - 168;
  const legendCells = [C.panel, "#0e7490", "#0891b2", "#22d3ee", "#67e8f9"]
    .map((c, i) => `<rect x="${legendX + 34 + i * 15}" y="${H - 30}" width="${CELL}" height="${CELL}" rx="2.5" fill="${c}"/>`)
    .join("");

  const yearTotal = [...d.days.entries()].filter(([k]) => k >= start.toISOString().slice(0, 10)).reduce((s, [, n]) => s + n, 0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contribution calendar">
${defs(id)}
  <style>${baseCss}
  .wk { opacity: 0; animation: fade .5s ease-out forwards; }
  @keyframes fade { to { opacity: 1 } }</style>
  ${frame(id, W, H, "CONTRIBUTION ACTIVITY · 12 MONTHS")}
  ${monthTicks.join("")}
  ${dayLabels}
  ${columns.join("")}
  <text class="sm" x="26" y="${H - 21}">${compact(yearTotal)} contributions in the last year</text>
  <text class="lbl" x="${legendX}" y="${H - 21}">LESS</text>
  ${legendCells}
  <text class="lbl" x="${W - 26}" y="${H - 21}" text-anchor="end">MORE</text>
</svg>`;
}

/* ── card 4 · weekly rhythm ──────────────────────────────────────────────── */
function rhythmCard(d) {
  const W = 420, H = 260, id = "r";
  const NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const byDow = new Array(7).fill(0);
  for (const [date, n] of d.days) byDow[new Date(`${date}T00:00:00Z`).getUTCDay()] += n;

  const max = Math.max(1, ...byDow);
  const total = byDow.reduce((s, n) => s + n, 0) || 1;
  const best = byDow.indexOf(max);

  const baseY = 196, maxH = 104, colW = 30, gap = 22;
  const startX = (W - (7 * colW + 6 * gap)) / 2;

  const bars = byDow.map((n, i) => {
    const h = Math.max(3, (n / max) * maxH);
    const x = startX + i * (colW + gap);
    const y = baseY - h;
    const color = i === best ? C.pink : i === 0 || i === 6 ? C.violet : C.cyan;
    return `
    <g>
      <rect x="${x}" y="${(baseY - maxH).toFixed(1)}" width="${colW}" height="${maxH}" rx="7" fill="${C.panel}" fill-opacity=".6"/>
      <rect x="${x}" y="${y.toFixed(1)}" width="${colW}" height="${h.toFixed(1)}" rx="7" fill="${color}" opacity=".9">
        <animate attributeName="height" from="0" to="${h.toFixed(1)}" dur=".8s" begin="${(i * 0.07).toFixed(2)}s" fill="freeze"/>
        <animate attributeName="y" from="${baseY}" to="${y.toFixed(1)}" dur=".8s" begin="${(i * 0.07).toFixed(2)}s" fill="freeze"/>
      </rect>
      <text class="lbl" x="${x + colW / 2}" y="${baseY + 18}" text-anchor="middle"${i === best ? ` style="fill:${C.pink}"` : ""}>${NAMES[i]}</text>
      <text class="lbl" x="${x + colW / 2}" y="${(y - 8).toFixed(1)}" text-anchor="middle" style="font-size:10px;fill:${C.dim}">${n || ""}</text>
    </g>`;
  }).join("");

  const pct = ((max / total) * 100).toFixed(0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contributions by day of week">
${defs(id)}
  <style>${baseCss}</style>
  ${frame(id, W, H, "WEEKLY RHYTHM")}
  <text class="sm" x="26" y="64">Busiest day: <tspan style="fill:${C.pink};font-weight:700">${NAMES[best]}</tspan> — ${pct}% of all contributions</text>
  ${bars}
</svg>`;
}

/* ── main ────────────────────────────────────────────────────────────────── */
async function main() {
  if (!MOCK && !TOKEN) {
    console.error("GITHUB_TOKEN is not set. Run with --mock for a local preview.");
    process.exit(1);
  }
  console.log(MOCK ? "→ rendering with mock data" : `→ fetching live data for ${USER}`);
  const data = MOCK ? mockData() : await fetchAll();

  mkdirSync(OUT, { recursive: true });
  const cards = {
    "stats.svg": statsCard(data),
    "languages.svg": languagesCard(data),
    "calendar.svg": calendarCard(data),
    "rhythm.svg": rhythmCard(data),
  };
  for (const [name, svg] of Object.entries(cards)) {
    writeFileSync(resolve(OUT, name), svg, "utf8");
    console.log(`  ✓ ${name} (${(svg.length / 1024).toFixed(1)} KB)`);
  }
  const st = streaks(data.days);
  console.log(`  streaks → current ${st.current}, longest ${st.longest}`);
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
