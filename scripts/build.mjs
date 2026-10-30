#!/usr/bin/env node
/**
 * Builds the SVG artwork for the profile README.
 *
 *   node scripts/build.mjs static        hero, section titles, project cards, footer -> assets/
 *   node scripts/build.mjs stats [dir]   stats card from live GitHub data           -> <dir>/stats.svg (default: dist)
 *
 * All text comes from profile.config.json. No npm dependencies (Node 18+).
 * Fonts (Inter Tight, Instrument Serif, JetBrains Mono; SIL Open Font License 1.1) are
 * subset from Google Fonts at build time and embedded, so the cards look the same on
 * every OS. If Google Fonts can't be reached, the SVGs fall back to system fonts.
 * With GITHUB_TOKEN set (automatic in Actions) stats come from the GraphQL API;
 * without it they come from the public REST API and the public contribution calendar.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(await readFile(join(ROOT, 'profile.config.json'), 'utf8'));

/* ---------------- palette + helpers ---------------- */
const C = {
  bg: '#08070e', ink: '#f4f2ff', muted: '#bdb6d6', faint: '#8a83a6', line: '#ffffff',
  cyan: '#22d3ee', violet: '#a855f7', pink: '#f472b6', amber: '#fbbf24', mint: '#34d399', indigo: '#818cf8',
};
const ACCENTS = { cyan: C.cyan, violet: C.violet, pink: C.pink, amber: C.amber, mint: C.mint, indigo: C.indigo };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = n => Math.round(n * 100) / 100;
const fmt = n => Number(n).toLocaleString('en-US');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = iso => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };

/* ---------------- fonts: subset + embed ---------------- */
const FONTS = {
  display: { family: 'Inter Tight', ital: 0, wght: 800, fallback: "'Segoe UI',Helvetica,Arial,sans-serif" },
  body: { family: 'Inter Tight', ital: 0, wght: 500, fallback: "'Segoe UI',Helvetica,Arial,sans-serif" },
  serif: { family: 'Instrument Serif', ital: 1, wght: 400, fallback: "Georgia,'Times New Roman',serif" },
  mono: { family: 'JetBrains Mono', ital: 0, wght: 500, fallback: 'Consolas,Menlo,monospace' },
};
const MONO_ADVANCE = 0.6; // JetBrains Mono advance width, in em
const EM = { display: 0.45, serif: 0.35 }; // average advance (em) of Inter Tight 800 / Instrument Serif italic, used to place gradients
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const fontCache = new Map();

async function subsetFont(role, chars) {
  const key = `${role}|${chars}`;
  if (!fontCache.has(key)) {
    fontCache.set(key, (async () => {
      const f = FONTS[role];
      const family = `${f.family.replace(/ /g, '+')}:ital,wght@${f.ital},${f.wght}`;
      const res = await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(chars)}`, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`fonts.googleapis.com answered ${res.status}`);
      const url = (await res.text()).match(/url\((https:[^)]+)\)\s*format\('woff2'\)/)?.[1];
      if (!url) throw new Error('no woff2 in the Google Fonts response');
      const bin = await fetch(url);
      if (!bin.ok) throw new Error(`font download answered ${bin.status}`);
      return Buffer.from(await bin.arrayBuffer()).toString('base64');
    })());
  }
  return fontCache.get(key);
}

/** Collects the characters each font role needs, so every SVG embeds only its own glyphs. */
class Doc {
  constructor() { this.used = Object.fromEntries(Object.keys(FONTS).map(k => [k, new Set()])); }
  t(role, s) { for (const ch of String(s)) this.used[role].add(ch); return esc(s); }
  async css() {
    let out = '';
    for (const [role, set] of Object.entries(this.used)) {
      const f = FONTS[role], style = f.ital ? 'italic' : 'normal';
      if (set.size) {
        try {
          const b64 = await subsetFont(role, [...set].sort().join(''));
          out += `@font-face{font-family:'p-${role}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${f.wght};font-style:${style}}`;
        } catch (e) { console.warn(`  ! ${role} font not embedded (${e.message}); falling back to system fonts`); }
      }
      out += `.${role}{font-family:'p-${role}',${f.fallback};font-weight:${f.wght};font-style:${style}}`;
    }
    return out;
  }
}

async function svgFile(doc, { w, h, title, desc, defs = '', css = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(desc)}</desc>
<defs>${defs}</defs>
<style>${await doc.css()}${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
${body}
</svg>
`;
}

/** Dark rounded card with drifting aura blobs, optional dot grid and film grain. */
function auraCard(p, w, h, blobs, { rx = 28, grain = 0.06, dots = false } = {}) {
  let defs = `<clipPath id="${p}-clip"><rect width="${w}" height="${h}" rx="${rx}"/></clipPath>`;
  let css = '';
  let body = `<g clip-path="url(#${p}-clip)"><rect width="${w}" height="${h}" fill="${C.bg}"/>`;
  blobs.forEach((b, i) => {
    defs += `<radialGradient id="${p}-g${i}"><stop offset="0" stop-color="${b.c}" stop-opacity="${b.o ?? 0.5}"/><stop offset="1" stop-color="${b.c}" stop-opacity="0"/></radialGradient>`;
    body += `<circle class="${p}-b${i}" cx="${b.x}" cy="${b.y}" r="${b.r}" fill="url(#${p}-g${i})" style="mix-blend-mode:screen"/>`;
    if (b.dx || b.dy) css += `.${p}-b${i}{animation:${p}-d${i} ${b.t ?? 18}s ease-in-out infinite alternate}@keyframes ${p}-d${i}{to{transform:translate(${b.dx ?? 0}px,${b.dy ?? 0}px)}}`;
  });
  if (dots) {
    defs += `<pattern id="${p}-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#fff"/></pattern>`
      + `<radialGradient id="${p}-dm" cx=".74" cy=".42" r=".55"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
      + `<mask id="${p}-dmask"><rect width="${w}" height="${h}" fill="url(#${p}-dm)"/></mask>`;
    body += `<rect width="${w}" height="${h}" fill="url(#${p}-dots)" opacity=".09" mask="url(#${p}-dmask)"/>`;
  }
  if (grain) {
    defs += `<filter id="${p}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .7 0"/></filter>`;
    body += `<rect width="${w}" height="${h}" filter="url(#${p}-grain)" opacity="${grain}"/>`;
  }
  body += `</g><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${rx - 0.5}" stroke="#fff" stroke-opacity=".1"/>`;
  return { defs, css, body };
}

/** Mono label with letter-spacing; returns the markup and its rendered width. */
function monoText(doc, s, { x, y, size, ls = 0, fill = C.muted, anchor = 'start', cls = '' }) {
  const width = s.length * (size * MONO_ADVANCE + ls) - ls;
  const markup = `<text class="mono ${cls}" x="${r1(x)}" y="${r1(y)}" font-size="${size}" letter-spacing="${ls}" fill="${fill}" text-anchor="${anchor}">${doc.t('mono', s)}</text>`;
  return { markup, width };
}

function pill(doc, s, { x, y, h = 34, size = 13, ls = 1.6, pad = 14, fill = C.muted, lead = 0, bg = '#ffffff', bgo = 0.04, stroke = 0.13 }) {
  const t = monoText(doc, s, { x: x + pad + lead, y: y + h / 2 + size * 0.36, size, ls, fill });
  const w = t.width + pad * 2 + lead;
  return { w, markup: `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${h}" rx="${h / 2}" fill="${bg}" fill-opacity="${bgo}" stroke="#fff" stroke-opacity="${stroke}"/>${t.markup}` };
}

/* ---------------- the ghost mascot (from the Riorize site), drawn in a 200x214 box ---------------- */
const GHOST_PATH = 'M100 36C147 36 173 70 173 114C173 142 176 162 177 176C177 188 168.75 198 157.75 198C146.75 198 143 185 138.5 185C134 185 130.25 198 119.25 198C108.25 198 104.5 185 100 185C95.5 185 91.75 198 80.75 198C69.75 198 66 185 61.5 185C57 185 53.25 198 42.25 198C31.25 198 23 188 23 176C24 162 27 142 27 114C27 70 53 36 100 36Z';
const SPARKLE = 'M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10z';
const NOTE_1 = '<ellipse cx="7" cy="21" rx="6.2" ry="4.6" transform="rotate(-22 7 21)"/><rect x="11.3" y="2" width="2.6" height="19.5" rx="1.3"/><path d="M13.9 2c1.2 4.4 7.6 5.6 7.9 12-2.6-3.9-5.2-4.6-7.9-4.9z"/>';
const NOTE_2 = '<ellipse cx="6" cy="23" rx="5.6" ry="4.2" transform="rotate(-22 6 23)"/><ellipse cx="22" cy="19.5" rx="5.6" ry="4.2" transform="rotate(-22 22 19.5)"/><rect x="9.6" y="4" width="2.4" height="19" rx="1.2"/><rect x="25.6" y=".6" width="2.4" height="19" rx="1.2"/><path d="M9.6 4 28 .4v4.8L9.6 8.8z"/>';

function ghost(p, { phones = true, wave = false } = {}) {
  const defs = `<path id="${p}-path" d="${GHOST_PATH}"/>
<linearGradient id="${p}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f8f5ff"/><stop offset="1" stop-color="#e6defe"/></linearGradient>
<radialGradient id="${p}-shade" cx=".38" cy=".3" r=".82"><stop offset=".55" stop-color="#a855f7" stop-opacity="0"/><stop offset="1" stop-color="#a855f7" stop-opacity=".42"/></radialGradient>
<linearGradient id="${p}-arm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f0ff"/><stop offset="1" stop-color="#d5c9fb"/></linearGradient>
<linearGradient id="${p}-eye" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140b2c"/><stop offset=".55" stop-color="#1e1244"/><stop offset="1" stop-color="#a855f7"/></linearGradient>
<radialGradient id="${p}-blush"><stop offset="0" stop-color="#ff6fae" stop-opacity=".95"/><stop offset=".55" stop-color="#ff86c0" stop-opacity=".6"/><stop offset="1" stop-color="#ff8fc7" stop-opacity="0"/></radialGradient>
<clipPath id="${p}-mouth"><path d="M89 131h22q0 15-11 15t-11-15z"/></clipPath>
<linearGradient id="${p}-cup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#5b21b6"/></linearGradient>`;
  const phonesSvg = !phones ? '' : `<path d="M28 112C24 0 176 0 172 112" stroke="#2e1065" stroke-width="10" stroke-linecap="round"/>
<path d="M28 112C24 0 176 0 172 112" stroke="#8b5cf6" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>
<g class="g-cup"><rect x="10" y="88" width="28" height="48" rx="13" fill="url(#${p}-cup)"/><rect x="16" y="95" width="9" height="32" rx="4.5" fill="#fff" opacity=".3"/></g>
<g class="g-cup"><rect x="162" y="88" width="28" height="48" rx="13" fill="url(#${p}-cup)"/><rect x="175" y="95" width="9" height="32" rx="4.5" fill="#fff" opacity=".3"/></g>`;
  const body = `<g class="g-bob">
<g class="g-arm-l"><ellipse cx="26" cy="146" rx="15" ry="10.5" transform="rotate(-32 26 146)" fill="url(#${p}-arm)"/></g>
<g class="${wave ? 'g-wave' : 'g-arm-r'}"><ellipse cx="174" cy="146" rx="15" ry="10.5" transform="rotate(32 174 146)" fill="url(#${p}-arm)"/></g>
<use href="#${p}-path" fill="url(#${p}-body)"/>
<use href="#${p}-path" fill="url(#${p}-shade)"/>
<ellipse cx="48" cy="140" rx="15" ry="8.5" fill="url(#${p}-blush)"/>
<ellipse cx="152" cy="140" rx="15" ry="8.5" fill="url(#${p}-blush)"/>
<g class="g-open">
<g class="g-eye"><ellipse cx="70" cy="116" rx="12.5" ry="14.5" fill="url(#${p}-eye)"/><circle cx="74.5" cy="110" r="5" fill="#fff"/><circle cx="65.5" cy="122.5" r="2.2" fill="#fff" opacity=".9"/></g>
<g class="g-eye"><ellipse cx="130" cy="116" rx="12.5" ry="14.5" fill="url(#${p}-eye)"/><circle cx="134.5" cy="110" r="5" fill="#fff"/><circle cx="125.5" cy="122.5" r="2.2" fill="#fff" opacity=".9"/></g>
<path d="M91 131.5q4.5 6.5 9 0 4.5 6.5 9 0" stroke="#1a1033" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<g class="g-happy">
<path d="M58 121q12-17 24 0M118 121q12-17 24 0" stroke="#1a1033" stroke-width="4.6" stroke-linecap="round"/>
<path d="M89 131h22q0 15-11 15t-11-15z" fill="#1a1033"/>
<ellipse cx="100" cy="147" rx="7.5" ry="5.5" fill="#ff7a9f" clip-path="url(#${p}-mouth)"/>
</g>
${phonesSvg}
</g>`;
  // transform-origins below are in the ghost's own 200x214 viewBox (it is drawn inside a nested <svg>)
  const css = `.g-float{animation:g-float 5s ease-in-out infinite}
@keyframes g-float{0%,100%{transform:translateY(-7px)}50%{transform:translateY(7px)}}
.g-shadow{transform-box:fill-box;transform-origin:center;animation:g-shadow 5s ease-in-out infinite}
@keyframes g-shadow{0%,100%{transform:scaleX(.82);opacity:.55}50%{transform:scaleX(1.04);opacity:.9}}
.g-bob{transform-origin:100px 198px;animation:g-bob 1.2s ease-in-out infinite}
@keyframes g-bob{0%,100%{transform:rotate(-3.5deg)}25%,75%{transform:scale(1.025,.975)}50%{transform:rotate(3.5deg)}}
.g-arm-l{transform-origin:40px 140px;animation:g-arm-l 1.2s ease-in-out infinite}
.g-arm-r{transform-origin:160px 140px;animation:g-arm-r 1.2s ease-in-out infinite}
@keyframes g-arm-l{0%,100%{transform:rotate(12deg)}50%{transform:rotate(-6deg)}}
@keyframes g-arm-r{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-12deg)}}
.g-wave{transform-origin:160px 140px;animation:g-wave 2.6s ease-in-out infinite}
@keyframes g-wave{0%,62%,100%{transform:none}10%,34%{transform:translate(8px,-5px) rotate(-72deg)}22%,46%{transform:translate(10px,-6px) rotate(-46deg)}}
.g-eye{transform-box:fill-box;transform-origin:center;animation:g-blink 5.5s infinite}
@keyframes g-blink{0%,45%,49%,100%{transform:none}47%{transform:scaleY(.1)}}
.g-open{animation:g-open 9s infinite}
.g-happy{opacity:0;animation:g-happy 9s infinite}
@keyframes g-open{0%,63%,79%,100%{opacity:1}65%,77%{opacity:0}}
@keyframes g-happy{0%,63%,79%,100%{opacity:0}65%,77%{opacity:1}}
.g-cup{transform-box:fill-box;transform-origin:center;animation:g-cup .6s ease-in-out infinite}
@keyframes g-cup{0%,100%{transform:none}50%{transform:scale(1.07)}}
.spark{transform-box:fill-box;transform-origin:center;animation:spark 3.2s ease-in-out infinite backwards}
@keyframes spark{0%,100%{transform:scale(.25) rotate(0);opacity:.35}50%{transform:scale(1) rotate(90deg);opacity:1}}`;
  return { defs, body, css };
}

const sparkle = (x, y, s, delay, fill = '#fff') => `<g transform="translate(${x} ${y}) scale(${s / 20})"><path class="spark" d="${SPARKLE}" fill="${fill}" style="animation-delay:${delay}s"/></g>`;

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#663399', Java: '#b07219',
  Kotlin: '#A97BFF', Shell: '#89e051', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Dockerfile: '#384d54', Vue: '#41b883', Svelte: '#ff3e00', Lua: '#000080', PHP: '#4F5D95', Ruby: '#701516', Dart: '#00B4AB',
  Swift: '#F05138', 'Jupyter Notebook': '#DA5B0B', SCSS: '#c6538c', MDX: '#fcb32c', Batchfile: '#C1F12E', PowerShell: '#012456',
};
const RISE = '.rise{animation:rise 1s cubic-bezier(.2,.8,.2,1) backwards}@keyframes rise{from{opacity:0;transform:translateY(14px)}}';

/* ---------------- hero banner ---------------- */
async function buildHero() {
  const d = new Doc(), W = 1200, H = 440, p = 'h', X = 72;
  const bg = auraCard(p, W, H, [
    { x: 930, y: 170, r: 380, c: '#7c3aed', o: 0.62, dx: -70, dy: 40, t: 14 },
    { x: 1140, y: 430, r: 300, c: C.cyan, o: 0.36, dx: -90, dy: -50, t: 17 },
    { x: 620, y: 480, r: 320, c: C.pink, o: 0.26, dx: 90, dy: -30, t: 19 },
    { x: 140, y: -60, r: 360, c: '#4f46e5', o: 0.34, dx: 60, dy: 50, t: 21 },
  ], { dots: true });
  const gh = ghost('hg');
  let defs = bg.defs + gh.defs, css = bg.css + gh.css + RISE, body = bg.body;

  // eyebrow pill with a live dot
  const eb = pill(d, cfg.eyebrow, { x: X, y: 58, h: 36, size: 14, ls: 2.6, lead: 20, pad: 15 });
  body += `<g class="rise">${eb.markup}<circle cx="${X + 21}" cy="76" r="4.5" fill="#4ade80"/><circle class="ping" cx="${X + 21}" cy="76" r="4.5" fill="#4ade80"/></g>`;
  css += '.ping{transform-box:fill-box;transform-origin:center;animation:ping 2s cubic-bezier(0,0,.2,1) infinite}@keyframes ping{0%{transform:scale(1);opacity:.8}75%,100%{transform:scale(3);opacity:0}}';

  // name: sans first name + gradient serif-italic surname
  const [first, last] = cfg.name;
  // the gradient spans the surname; widths are estimated from average glyph advances
  const lastStart = X + first.length * 112 * EM.display + 24;
  defs += `<linearGradient id="${p}-name" gradientUnits="userSpaceOnUse" x1="${r1(lastStart)}" y1="0" x2="${r1(lastStart + last.length * 128 * EM.serif)}" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient>`;
  body += `<text x="${X - 5}" y="208" class="rise" style="animation-delay:.08s"><tspan class="display" font-size="112" letter-spacing="-5" fill="${C.ink}">${d.t('display', first)}</tspan><tspan class="serif" font-size="128" letter-spacing="-2" dx="24" fill="url(#${p}-name)">${d.t('serif', last)}</tspan></text>`;
  body += `<text x="${X}" y="260" class="body rise" font-size="26" fill="${C.muted}" style="animation-delay:.16s">${d.t('body', cfg.tagline)}</text>`;

  // terminal line that types each entry of cfg.typing, then deletes it
  const FS = 20, CW = FS * MONO_ADVANCE, TX = X + 48, TY = 324, lines = cfg.typing, SLOT = 5, TOTAL = SLOT * lines.length;
  const termW = Math.max(560, TX - X + Math.max(...lines.map(s => s.length)) * CW + 44);
  const pct = t => `${r1((t / TOTAL) * 100)}%`;
  let term = `<rect x="${X}" y="288" width="${r1(termW)}" height="56" rx="16" fill="#0c0a18" fill-opacity=".78" stroke="#fff" stroke-opacity=".11"/>`
    + `<path d="M${X + 22} ${TY - 13}l8 7-8 7" stroke="${C.cyan}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  let caretKf = '';
  lines.forEach((s, i) => {
    const n = s.length, w = r1(n * CW);
    const a = i * SLOT, b = a + Math.min(n * 0.055, SLOT * 0.5), dl = Math.min(n * 0.018, 0.75), c = a + SLOT - dl - 0.3, e = c + dl;
    defs += `<clipPath id="${p}-ty${i}"><rect class="${p}-ty${i}" y="-30" width="${w}" height="44"/></clipPath>`;
    term += `<g transform="translate(${TX} ${TY})"><g clip-path="url(#${p}-ty${i})"><text class="mono" font-size="${FS}" fill="#ece9ff">${d.t('mono', s)}</text></g></g>`;
    css += `.${p}-ty${i}{transform-origin:0 0;transform:${i ? 'scaleX(0)' : 'none'};animation:${p}-ty${i} ${TOTAL}s linear infinite}`
      + `@keyframes ${p}-ty${i}{${a ? `0%{transform:scaleX(0)}` : ''}${pct(a)}{transform:scaleX(0);animation-timing-function:steps(${n},end)}${pct(b)}{transform:scaleX(1);animation-timing-function:linear}${pct(c)}{transform:scaleX(1);animation-timing-function:steps(${n},end)}${pct(e)},100%{transform:scaleX(0)}}`;
    caretKf += `${pct(a)}{transform:translateX(0);animation-timing-function:steps(${n},end)}${pct(b)}{transform:translateX(${w}px);animation-timing-function:linear}${pct(c)}{transform:translateX(${w}px);animation-timing-function:steps(${n},end)}${pct(e)}{transform:translateX(0);animation-timing-function:linear}`;
  });
  term += `<g class="${p}-caret"><rect class="${p}-blink" x="${TX + 1}" y="${TY - 17}" width="11" height="22" rx="2" fill="${C.cyan}"/></g>`;
  css += `.${p}-caret{transform:translateX(${r1(lines[0].length * CW)}px);animation:${p}-caret ${TOTAL}s linear infinite}@keyframes ${p}-caret{${caretKf}100%{transform:translateX(0)}}`
    + `.${p}-blink{animation:${p}-blink 1s steps(1) infinite}@keyframes ${p}-blink{50%{opacity:0}}`;
  body += `<g class="rise" style="animation-delay:.24s">${term}</g>`;

  // focus chips
  let cx = X;
  cfg.chips.forEach((s, i) => {
    const c = pill(d, s.toUpperCase(), { x: cx, y: 364, h: 34, size: 13, ls: 1.6 });
    body += `<g class="rise" style="animation-delay:${r1(0.32 + i * 0.06)}s">${c.markup}</g>`;
    cx += c.w + 10;
  });

  // the ghost, vibing with headphones
  const GX = 852, GY = 46, GW = 250, GH = GW * 214 / 200, MID = GX + GW / 2;
  defs += `<radialGradient id="${p}-glow"><stop offset="0" stop-color="#a855f7" stop-opacity=".55"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${p}-shadow"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  body += `<circle cx="${MID}" cy="${GY + GH * 0.52}" r="190" fill="url(#${p}-glow)"/>`
    + `<ellipse class="g-shadow" cx="${MID}" cy="${r1(GY + GH + 22)}" rx="78" ry="10" fill="url(#${p}-shadow)"/>`
    + `<g class="g-float"><svg x="${GX}" y="${GY}" width="${GW}" height="${r1(GH)}" viewBox="0 0 200 214" overflow="visible">${gh.body}</svg></g>`;
  [[1064, 158, NOTE_1, C.cyan, 0], [1078, 182, NOTE_2, C.pink, 1.2], [1056, 176, NOTE_1, '#c4b5fd', 2.4]].forEach(([x, y, shape, fill, delay]) => {
    body += `<g transform="translate(${x} ${y})"><g class="note" fill="${fill}" style="animation-delay:${delay}s">${shape}</g></g>`;
  });
  css += '.note{opacity:0;transform-box:fill-box;transform-origin:center;animation:note 3.6s ease-out infinite backwards}@keyframes note{0%{opacity:0;transform:translate(0,0) scale(.5) rotate(-12deg)}18%{opacity:1}75%{opacity:.85}100%{opacity:0;transform:translate(56px,-104px) scale(1.1) rotate(14deg)}}';
  body += sparkle(826, 112, 16, 0) + sparkle(1150, 84, 11, 1.1) + sparkle(1170, 250, 18, 2) + sparkle(836, 296, 10, 0.6, '#c4b5fd') + sparkle(1124, 322, 9, 1.6, C.cyan);

  // "now playing" pill with an equalizer
  const np = cfg.nowPlaying.toUpperCase(), npT = monoText(d, np, { x: 0, y: 0, size: 12.5, ls: 1.5 });
  const npW = 16 + 32 + 12 + npT.width + 18, npX = MID - npW / 2, npY = 364;
  body += `<rect x="${r1(npX)}" y="${npY}" width="${r1(npW)}" height="34" rx="17" fill="#0c0a18" fill-opacity=".7" stroke="#fff" stroke-opacity=".12"/>`;
  [C.cyan, C.violet, C.pink, C.violet, C.cyan].forEach((fill, i) => {
    body += `<rect class="eq" x="${r1(npX + 16 + i * 7)}" y="${npY + 9}" width="4" height="16" rx="2" fill="${fill}" style="animation-duration:${[0.9, 0.7, 1.1, 0.8, 1][i]}s;animation-delay:-${r1(i * 0.17)}s"/>`;
  });
  css += '.eq{transform-box:fill-box;transform-origin:50% 100%;animation:eq 1s ease-in-out infinite alternate}@keyframes eq{0%{transform:scaleY(.3)}100%{transform:scaleY(1)}}';
  body += monoText(d, np, { x: npX + 60, y: npY + 21.5, size: 12.5, ls: 1.5 }).markup;

  return svgFile(d, { w: W, h: H, title: `${first} ${last}`, desc: `${cfg.tagline}. ${lines.join('. ')}.`, defs, css, body });
}

/* ---------------- section titles (light + dark, transparent background) ---------------- */
async function buildTitle(key, theme) {
  const s = cfg.sections[key], d = new Doc(), W = 1200, H = 136, dark = theme === 'dark';
  const ink = dark ? C.ink : '#140f24', kick = dark ? C.cyan : '#0e7490';
  const g = dark ? [C.cyan, C.violet, C.pink] : ['#0891b2', '#7c3aed', '#db2777'];
  const FS = 58, AFS = 66;
  let x = 0, accA = 0, accB = 0;
  const spans = s.title.map(seg => {
    const w = seg.t.length * (seg.accent ? AFS * EM.serif : FS * EM.display);
    if (seg.accent) { accA = x; accB = x + w; }
    x += w;
    return seg.accent
      ? `<tspan class="serif" font-size="${AFS}" letter-spacing="-1" fill="url(#acc)">${d.t('serif', seg.t)}</tspan>`
      : `<tspan class="display" font-size="${FS}" letter-spacing="-2.4" fill="${ink}">${d.t('display', seg.t)}</tspan>`;
  });
  const defs = `<linearGradient id="acc" gradientUnits="userSpaceOnUse" x1="${r1(accA)}" y1="0" x2="${r1(accB)}" y2="0"><stop offset="0" stop-color="${g[0]}"/><stop offset=".5" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient>`;
  const body = `<rect y="33.5" width="30" height="1.5" fill="${kick}"/>`
    + monoText(d, s.kicker, { x: 44, y: 39, size: 13.5, ls: 2.7, fill: kick }).markup
    + `<text x="-3" y="112" xml:space="preserve">${spans.join('')}</text>`;
  const title = s.title.map(seg => seg.t).join('');
  return svgFile(d, { w: W, h: H, title, desc: `${s.kicker}: ${title}`, defs, body });
}

/* ---------------- featured project cards ---------------- */
async function buildCard(pr) {
  const d = new Doc(), W = 600, H = 232, p = 'c', acc = ACCENTS[pr.accent] ?? C.violet;
  const bg = auraCard(p, W, H, [
    { x: 560, y: -10, r: 290, c: acc, o: 0.42, dx: -50, dy: 30, t: 11 },
    { x: 30, y: 260, r: 230, c: '#6366f1', o: 0.16 },
  ], { rx: 22, grain: 0.05 });
  let body = bg.body;
  body += monoText(d, pr.category.toUpperCase(), { x: 32, y: 48, size: 12.5, ls: 2.2, fill: acc }).markup;
  body += `<g transform="translate(${W - 58} 24)"><rect width="34" height="34" rx="17" fill="#fff" fill-opacity=".06" stroke="#fff" stroke-opacity=".14"/><path d="M12.5 21.5l9-9M14 12.5h7.5V20" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  body += `<text x="30" y="98" class="display" font-size="36" letter-spacing="-1.4" fill="${C.ink}">${d.t('display', pr.title)}</text>`;
  pr.desc.forEach((ln, i) => { body += `<text x="32" y="${134 + i * 25}" class="body" font-size="17" fill="${C.muted}">${d.t('body', ln)}</text>`; });
  body += `<rect x="32" y="176" width="${W - 64}" height="1" fill="#fff" fill-opacity=".08"/>`;
  body += `<circle cx="38" cy="200" r="5.5" fill="${LANG_COLORS[pr.lang] ?? acc}"/>`;
  body += `<text x="52" y="204.5" class="mono" font-size="13" xml:space="preserve"><tspan fill="${C.ink}">${d.t('mono', pr.lang)}</tspan><tspan fill="${C.faint}">${d.t('mono', pr.tags.map(t => ` · ${t}`).join(''))}</tspan></text>`;
  body += `<text x="${W - 32}" y="204.5" class="mono" font-size="13" fill="${C.faint}" text-anchor="end">${d.t('mono', `${cfg.user}/${pr.repo}`)}</text>`;
  return svgFile(d, { w: W, h: H, title: pr.title, desc: `${pr.category}. ${pr.desc.join(' ')}`, defs: bg.defs, css: bg.css, body });
}

/* ---------------- footer ---------------- */
async function buildFooter() {
  const d = new Doc(), W = 1200, H = 250, p = 'f';
  const bg = auraCard(p, W, H, [
    { x: 250, y: 110, r: 300, c: '#7c3aed', o: 0.5, dx: 60, dy: -20, t: 15 },
    { x: 1010, y: 270, r: 320, c: C.cyan, o: 0.26, dx: -70, dy: -20, t: 18 },
    { x: 660, y: -60, r: 280, c: C.pink, o: 0.2, dx: 40, dy: 30, t: 20 },
  ]);
  const gh = ghost('fg', { wave: true });
  let defs = bg.defs + gh.defs, css = bg.css + gh.css, body = bg.body;

  // looping waves along the bottom edge
  const wave = (y, a) => { let s = `M0 ${y}q100 ${-a} 200 0`; for (let x = 200; x < 2400; x += 200) s += 't200 0'; return `${s}V${H}H0z`; };
  body += `<g clip-path="url(#${p}-clip)">`
    + `<path class="wv wv1" d="${wave(214, 11)}" fill="#7c3aed" fill-opacity=".28"/>`
    + `<path class="wv wv2" d="${wave(223, 9)}" fill="${C.cyan}" fill-opacity=".16"/>`
    + `<path class="wv wv3" d="${wave(232, 7)}" fill="${C.pink}" fill-opacity=".16"/></g>`;
  css += '.wv{animation:wv 9s linear infinite}.wv2{animation-duration:13s;animation-direction:reverse}.wv3{animation-duration:17s}@keyframes wv{to{transform:translateX(-400px)}}';

  // waving ghost + speech bubble
  const GX = 112, GY = 34, GW = 142, GH = GW * 214 / 200;
  body += `<g class="g-float"><svg x="${GX}" y="${GY}" width="${GW}" height="${r1(GH)}" viewBox="0 0 200 214" overflow="visible">${gh.body}</svg></g>`;
  body += `<g class="rise" style="animation-delay:.5s"><rect x="236" y="30" width="104" height="36" rx="12" fill="#fff"/><path d="M246 62l-12 12 22-8z" fill="#fff"/><text x="288" y="53.5" class="body" font-size="16" fill="#140f24" text-anchor="middle">${d.t('body', 'bye bye!')}</text></g>`;

  const [lead, accent] = ['Thanks for ', 'stopping by.'], accX = 372 + lead.length * 52 * EM.display;
  defs += `<linearGradient id="${p}-acc" gradientUnits="userSpaceOnUse" x1="${r1(accX)}" y1="0" x2="${r1(accX + accent.length * 60 * EM.serif)}" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient>`;
  body += `<text x="372" y="128" xml:space="preserve" class="rise"><tspan class="display" font-size="52" letter-spacing="-2" fill="${C.ink}">${d.t('display', lead)}</tspan><tspan class="serif" font-size="60" fill="url(#${p}-acc)">${d.t('serif', accent)}</tspan></text>`;
  body += monoText(d, `SEE YOU IN THE COMMITS · @${cfg.user.toUpperCase()}`, { x: 374, y: 166, size: 13.5, ls: 2.4, cls: 'rise' }).markup;
  body += sparkle(1080, 70, 14, 0.4) + sparkle(1130, 130, 9, 1.4, C.cyan) + sparkle(330, 150, 10, 2.1, '#c4b5fd');
  css += RISE;
  return svgFile(d, { w: W, h: H, title: 'Thanks for stopping by', desc: `A ghost waves goodbye. See you in the commits, @${cfg.user}.`, defs, css, body });
}

/* ---------------- stats: data sources ---------------- */
const API = 'https://api.github.com';

async function rest(path) {
  const res = await fetch(API + path, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'profile-stats' } });
  if (!res.ok) throw new Error(`GET ${path} answered ${res.status}`);
  return res.json();
}

async function fromGraphQL(login, token) {
  const query = `query($login:String!,$after:String){user(login:$login){login name followers{totalCount}
    repositories(first:100,after:$after,ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC){pageInfo{hasNextPage endCursor}
      nodes{stargazerCount languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}
    contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  let after = null, user;
  const repos = [];
  do {
    const res = await fetch(`${API}/graphql`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'profile-stats' },
      body: JSON.stringify({ query, variables: { login, after } }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? res.status));
    user = json.data.user;
    repos.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);
  const langs = new Map();
  for (const r of repos) for (const e of r.languages.edges) {
    const l = langs.get(e.node.name) ?? { name: e.node.name, color: e.node.color, bytes: 0, repos: 0 };
    l.bytes += e.size; l.repos += 1; langs.set(l.name, l);
  }
  return {
    source: 'GraphQL', login: user.login, followers: user.followers.totalCount,
    repos: repos.length, stars: repos.reduce((n, r) => n + r.stargazerCount, 0),
    // rank by sqrt(bytes) * sqrt(repo count) so one huge repo can't drown out everything else
    languages: [...langs.values()].map(l => ({ name: l.name, color: l.color, score: Math.sqrt(l.bytes * l.repos) })),
    days: user.contributionsCollection.contributionCalendar.weeks.flatMap(w => w.contributionDays).map(x => ({ date: x.date, count: x.contributionCount })),
  };
}

/** No token: public REST API (2 calls) + the public contribution calendar page. */
async function fromPublic(login) {
  const user = await rest(`/users/${login}`);
  const repos = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await rest(`/users/${login}/repos?per_page=100&type=owner&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const own = repos.filter(r => !r.fork), langs = new Map();
  for (const r of own) if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);
  const res = await fetch(`https://github.com/users/${login}/contributions`, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`contribution calendar answered ${res.status}`);
  const html = await res.text(), ids = new Map(), days = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*>/g)) {
    const date = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1], id = tag.match(/\bid="([^"]+)"/)?.[1];
    if (date && id) ids.set(id, date);
  }
  for (const [, id, text] of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const date = ids.get(id);
    if (date) days.push({ date, count: /^\s*No contributions/i.test(text) ? 0 : parseInt(text.replace(/,/g, ''), 10) || 0 });
  }
  if (!days.length) throw new Error('could not read the contribution calendar');
  days.sort((a, b) => a.date.localeCompare(b.date));
  return {
    source: 'public', login: user.login, followers: user.followers,
    repos: own.length, stars: own.reduce((n, r) => n + r.stargazers_count, 0),
    languages: [...langs].map(([name, count]) => ({ name, color: LANG_COLORS[name], score: count })),
    days,
  };
}

function summarize(data) {
  const days = data.days;
  let longest = 0, run = 0, best = { count: 0, date: days.at(-1).date };
  for (const day of days) {
    if (day.count > 0) run++; else run = 0;
    longest = Math.max(longest, run);
    if (day.count > best.count) best = day;
  }
  let i = days.length - 1, current = 0;
  if (days[i].count === 0) i--; // today isn't over yet, so it can't break the streak
  while (i >= 0 && days[i].count > 0) { current++; i--; }
  const t0 = Date.parse(`${days[0].date}T00:00:00Z`), weeks = [];
  for (const day of days) {
    const w = Math.floor((Date.parse(`${day.date}T00:00:00Z`) - t0) / 6048e5);
    (weeks[w] ??= { start: day.date, count: 0 }).count += day.count;
  }
  // chart from the first active week (newer accounts would otherwise show months of flat line)
  let from = Math.max(0, weeks.findIndex(w => w.count > 0) - 1);
  if (weeks.length - from < 12) from = Math.max(0, weeks.length - 12);
  const since = from > 0 ? weeks[from].start : null, windowDays = days.filter(day => !since || day.date >= since);
  const ranked = data.languages.filter(l => l.score > 0).sort((a, b) => b.score - a.score);
  const sum = ranked.reduce((n, l) => n + l.score, 0) || 1;
  const top = ranked.slice(0, 6).map(l => ({ name: l.name, color: l.color || LANG_COLORS[l.name] || '#8a83a6', share: l.score / sum }));
  const other = 1 - top.reduce((n, l) => n + l.share, 0);
  if (other > 0.004) top.push({ name: 'Other', color: '#5b5575', share: other });
  return {
    ...data, top, longest, current, best, weeks: weeks.slice(from), since,
    active: windowDays.filter(day => day.count > 0).length, windowDays: windowDays.length,
    last30: days.slice(-30).reduce((n, day) => n + day.count, 0),
    total: days.reduce((n, day) => n + day.count, 0), langCount: ranked.length,
  };
}

/** Monotone cubic (Fritsch-Carlson) through the points, so the curve never dips below zero. */
function smoothPath(pts) {
  const n = pts.length;
  if (n === 1) return `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  const dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${r1(pts[i][0] + h)} ${r1(pts[i][1] + t[i] * h)} ${r1(pts[i + 1][0] - h)} ${r1(pts[i + 1][1] - t[i + 1] * h)} ${r1(pts[i + 1][0])} ${r1(pts[i + 1][1])}`;
  }
  return d;
}

/* ---------------- stats card ---------------- */
async function buildStats(s) {
  const d = new Doc(), W = 1200, H = 610, p = 's';
  const bg = auraCard(p, W, H, [
    { x: 1080, y: 40, r: 360, c: '#7c3aed', o: 0.45, dx: -60, dy: 40, t: 16 },
    { x: 120, y: 640, r: 360, c: C.cyan, o: 0.2, dx: 80, dy: -40, t: 19 },
    { x: 640, y: 320, r: 320, c: C.pink, o: 0.09 },
  ]);
  let defs = bg.defs, body = bg.body;
  let css = bg.css + RISE + '.ping{transform-box:fill-box;transform-origin:center;animation:ping 2s cubic-bezier(0,0,.2,1) infinite}@keyframes ping{0%{transform:scale(1);opacity:.8}75%,100%{transform:scale(3);opacity:0}}';
  const now = new Date(), updated = `${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`.toUpperCase();
  const panel = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fff" fill-opacity=".035" stroke="#fff" stroke-opacity=".08"/>`;
  const label = (s2, x, y, o = {}) => monoText(d, s2, { x, y, size: 12, ls: 1.9, fill: C.faint, ...o }).markup;

  body += `<circle cx="56" cy="54" r="4.5" fill="#4ade80"/><circle class="ping" cx="56" cy="54" r="4.5" fill="#4ade80"/>`
    + monoText(d, `AURA STATS · @${s.login.toUpperCase()}`, { x: 72, y: 58.5, size: 13, ls: 2.4 }).markup
    + monoText(d, `UPDATED ${updated}`, { x: W - 48, y: 58.5, size: 13, ls: 2.4, fill: C.faint, anchor: 'end' }).markup;

  // six tiles
  const plural = (n, one, many) => (n === 1 ? one : many);
  const sinceLabel = s.since ? `${MONTHS[Number(s.since.slice(5, 7)) - 1]} ${s.since.slice(0, 4)}` : null;
  const tiles = [
    ['CONTRIBUTIONS', s.total, 'in the last 12 months'],
    s.current >= 2 ? ['CURRENT STREAK', s.current, 'days in a row'] : ['LAST 30 DAYS', s.last30, plural(s.last30, 'contribution', 'contributions')],
    ['LONGEST STREAK', s.longest, `${plural(s.longest, 'day', 'days')} in a row`],
    ['ACTIVE DAYS', s.active, sinceLabel ? `out of ${s.windowDays} since ${sinceLabel}` : `out of the last ${s.windowDays}`],
    ['BEST DAY', s.best.count, s.best.count ? `contributions on ${dayLabel(s.best.date)}` : 'still loading the aura'],
    ['PUBLIC REPOS', s.repos, `across ${s.langCount} languages`],
  ];
  const TW = 224, TH = 122, TG = 16, X0 = 48, Y0 = 88;
  tiles.forEach(([name, value, caption], i) => {
    const x = X0 + (i % 3) * (TW + TG), y = Y0 + Math.floor(i / 3) * (TH + TG);
    body += `<g class="rise" style="animation-delay:${r1(0.08 + i * 0.07)}s">${panel(x, y, TW, TH)}${label(name, x + 20, y + 31)}`
      + `<text x="${x + 18}" y="${y + 80}" class="display" font-size="46" letter-spacing="-1.6" fill="${C.ink}">${d.t('display', fmt(value))}</text>`
      + `<text x="${x + 20}" y="${y + 104}" class="body" font-size="14.5" fill="${C.muted}">${d.t('body', caption)}</text></g>`;
  });

  // languages
  const LX = X0 + 3 * TW + 2 * TG + 24, LY = Y0, LW = W - 48 - LX, LH = TH * 2 + TG;
  const BX = LX + 22, BW = LW - 44, BY = LY + 50;
  defs += `<clipPath id="${p}-bar"><rect x="${BX}" y="${BY}" width="${BW}" height="12" rx="6"/></clipPath>`;
  let bx = BX, segs = '', legend = '';
  s.top.forEach((l, i) => {
    const w = l.share * BW, y = LY + 98 + i * 23;
    segs += `<rect class="seg" x="${r1(bx)}" y="${BY}" width="${r1(w + 0.6)}" height="12" fill="${l.color}" style="animation-delay:${r1(0.35 + i * 0.08)}s"/>`;
    bx += w;
    legend += `<circle cx="${BX + 5}" cy="${y - 5}" r="5" fill="${l.color}"/><text x="${BX + 20}" y="${y}" class="body" font-size="15.5" fill="${C.ink}">${d.t('body', l.name)}</text>`
      + monoText(d, `${(l.share * 100).toFixed(1)}%`, { x: BX + BW, y, size: 13, fill: C.muted, anchor: 'end' }).markup;
  });
  css += '.seg{transform-box:fill-box;transform-origin:0 50%;animation:seg .9s cubic-bezier(.2,.8,.2,1) backwards}@keyframes seg{from{transform:scaleX(0)}}';
  body += `<g class="rise" style="animation-delay:.2s">${panel(LX, LY, LW, LH)}${label('TOP LANGUAGES', LX + 22, LY + 31)}`
    + `<rect x="${BX}" y="${BY}" width="${BW}" height="12" rx="6" fill="#fff" fill-opacity=".06"/><g clip-path="url(#${p}-bar)">${segs}</g>${legend}</g>`;

  // weekly contributions chart
  const CX = X0, CY = LY + LH + 16, CW = W - 96, CH = H - 48 - CY;
  const PX = CX + 26, PW = CW - 52, PY = CY + 58, PH = CH - 58 - 40;
  const peak = s.weeks.reduce((a, w) => (w.count > a.count ? w : a), s.weeks[0]), max = Math.max(1, peak.count), n = s.weeks.length;
  const pts = s.weeks.map((w, i) => [PX + (n === 1 ? PW / 2 : (i / (n - 1)) * PW), PY + PH - (w.count / max) * PH]);
  const line = smoothPath(pts);
  defs += `<linearGradient id="${p}-line" gradientUnits="userSpaceOnUse" x1="${PX}" y1="0" x2="${PX + PW}" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".55" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient>`
    + `<linearGradient id="${p}-area" gradientUnits="userSpaceOnUse" x1="0" y1="${PY}" x2="0" y2="${PY + PH}"><stop offset="0" stop-color="${C.violet}" stop-opacity=".42"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></linearGradient>`
    + `<filter id="${p}-glow" x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>`;
  let chart = panel(CX, CY, CW, CH) + label(`CONTRIBUTIONS PER WEEK · ${sinceLabel ? `SINCE ${sinceLabel.toUpperCase()}` : 'LAST 12 MONTHS'}`, CX + 24, CY + 32)
    + monoText(d, `PEAK ${fmt(peak.count)} · WEEK OF ${dayLabel(peak.start).toUpperCase()}`, { x: CX + CW - 24, y: CY + 32, size: 12, ls: 1.9, fill: C.muted, anchor: 'end' }).markup;
  for (let k = 1; k <= 3; k++) {
    const y = r1(PY + PH - (k / 3) * PH);
    chart += `<line x1="${PX}" x2="${PX + PW}" y1="${y}" y2="${y}" stroke="#fff" stroke-opacity=".07" stroke-dasharray="3 6"/>`;
  }
  chart += `<line x1="${PX}" x2="${PX + PW}" y1="${PY + PH}" y2="${PY + PH}" stroke="#fff" stroke-opacity=".14"/>`
    + `<path class="area" d="${line}L${r1(PX + PW)} ${PY + PH}L${PX} ${PY + PH}Z" fill="url(#${p}-area)"/>`
    + `<path class="ln" d="${line}" pathLength="1" stroke="url(#${p}-line)" stroke-width="8" stroke-linecap="round" opacity=".5" filter="url(#${p}-glow)"/>`
    + `<path class="ln" d="${line}" pathLength="1" stroke="url(#${p}-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (peak.count) {
    const [mx, my] = pts[s.weeks.indexOf(peak)];
    chart += `<circle class="ping" cx="${r1(mx)}" cy="${r1(my)}" r="5" fill="${C.pink}"/><circle cx="${r1(mx)}" cy="${r1(my)}" r="5.5" fill="#fff" stroke="${C.pink}" stroke-width="3"/>`;
  }
  let lastMonth = -1, lastX = -1e9;
  s.weeks.forEach((w, i) => {
    const month = Number(w.start.slice(5, 7)) - 1, x = pts[i][0];
    if (month !== lastMonth && x - lastX > 44 && x < PX + PW - 20) {
      chart += monoText(d, MONTHS[month].toUpperCase(), { x, y: PY + PH + 26, size: 11.5, ls: 1.4, fill: C.faint }).markup;
      lastX = x;
    }
    lastMonth = month;
  });
  css += '.ln{stroke-dasharray:1;stroke-dashoffset:0;animation:ln 2.4s cubic-bezier(.4,0,.2,1) .4s backwards}@keyframes ln{from{stroke-dashoffset:1}}.area{animation:fade 1.4s ease 1s backwards}@keyframes fade{from{opacity:0}}';
  body += `<g class="rise" style="animation-delay:.3s">${chart}</g>`;

  const desc = `${fmt(s.total)} contributions in the last 12 months (${fmt(s.last30)} in the last 30 days); longest streak ${s.longest} days; ${s.repos} public repositories. Top languages: ${s.top.map(l => `${l.name} ${(l.share * 100).toFixed(0)}%`).join(', ')}.`;
  return svgFile(d, { w: W, h: H, title: `GitHub stats for @${s.login}`, desc, defs, css, body });
}

/* ---------------- cli ---------------- */
async function write(rel, content) {
  const path = resolve(ROOT, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  console.log(`  wrote ${rel} (${(Buffer.byteLength(content) / 1024).toFixed(1)} KB)`);
}

const [cmd = 'static', outDir = 'dist'] = process.argv.slice(2);
if (cmd === 'static') {
  await write('assets/hero.svg', await buildHero());
  for (const key of Object.keys(cfg.sections)) for (const theme of ['dark', 'light']) await write(`assets/title-${key}-${theme}.svg`, await buildTitle(key, theme));
  for (const pr of cfg.projects) await write(`assets/card-${pr.id}.svg`, await buildCard(pr));
  await write('assets/footer.svg', await buildFooter());
} else if (cmd === 'stats') {
  const login = process.env.PROFILE_USER || cfg.user, token = process.env.GITHUB_TOKEN;
  let data;
  if (token) {
    try { data = await fromGraphQL(login, token); } catch (e) { console.warn(`  ! GraphQL failed (${e.message}); using public data instead`); }
  }
  data ??= await fromPublic(login);
  const s = summarize(data);
  console.log(`  ${s.source}: ${s.total} contributions, streak ${s.current} (best ${s.longest}), ${s.repos} repos, ${s.top.map(l => l.name).join(' / ')}`);
  await write(join(outDir, 'stats.svg'), await buildStats(s));
} else {
  console.error('usage: node scripts/build.mjs static | stats [outDir]');
  process.exit(1);
}
