// Worlds for the breakdown, verse 3 and the outro.
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba, strSeed } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';
import * as PH from './phoenix.js';
import { fill, vgrad, mistField, halftoneBands, speed, cloudField, flameField } from './layers.js';
import { frameTunnel, tree, flock } from './scenes2.js';
import { glyph } from './type.js';

// ------------------------------------------------------------------ breakdown
function breakdown(ctx, S) {
  const { t, W, H } = S;
  const build = ew(t, 186.5, 193.7, 'inCubic');
  vgrad(ctx, S, mix(P.paper, P.paperDark, 0.3), P.paper);
  mistField(ctx, S, { alpha: 0.9 });
  halftoneBands(ctx, S, { color: P.char, cell: 16, alpha: 0.12 + build * 0.5 });
  speed(ctx, S, P.ink, Math.floor(20 + 160 * build), { alpha: 0.3 + build * 0.5, red: P.red, redEvery: 6 });
  if (build > 0.05) {
    frameTunnel(ctx, S, { color: P.ink, alpha: build, lwK: 0.8 });
    M.focusLines(ctx, W, H, W / 2, H / 2, { count: 160, inner: lerp(700, 260, build), innerVar: 250, color: P.ink, frame: Math.floor(t * 12), alpha: build * 0.9 });
  }
  // the phoenix hangs in the updraft, wings wide, then folds and dives into verse 3
  const u = t - 182.2;
  const C = PH.phoenixColors(P.paper);
  let x = W / 2 + Math.sin(u * 0.45) * 160, y = H * 0.5 + Math.sin(u * 0.9) * 26;
  let rot = Math.sin(u * 0.45 + 1.2) * 0.35, open = 1, beat = Math.sin(u * 1.4) * 0.6;
  if (t > 192.3) {
    const d = ew(t, 192.3, 192.9, 'outCubic');
    y -= d * 90;                       // a last lift...
    open = lerp(1, 0.08, ew(t, 192.9, 193.3, 'inCubic'));
    rot = lerp(rot, 0, ew(t, 192.6, 193.2, 'inOutCubic'));
    y += ew(t, 193.1, 193.76, 'inCubic') * H * 0.95; // ...then everything down
  }
  PH.phoenix(ctx, x, y, 78, rot, { open, beat, flow: Math.cos(u * 0.45) * 0.4, t, colors: C, alpha: ew(t, 182.4, 183.6) });
}

// ------------------------------------------------------------------ verse 3
// background plan: [start, bg]
const V3BG = [
  [193.6, P.red], [195.0, P.ink], [196.3, P.paper], [200.55, P.red], [201.15, P.ink], [202.15, P.ink], [205.0, P.red],
  [207.35, P.ink], [208.15, P.paper], [209.4, P.ink], [210.6, P.red], [211.8, P.paper], [212.9, P.ink], [213.4, P.red],
  [214.15, P.ink], [215.17, P.red], [216.2, P.paper], [217.22, P.ink],
];
export function v3Bg(t) {
  let c = V3BG[0][1];
  for (const [a, col] of V3BG) if (t >= a) c = col;
  return c;
}
const fgOn = (bg) => (bg === P.paper ? P.ink : bg === P.ink ? P.paper : P.ink);

function verse3(ctx, S) {
  const { t, W, H } = S;
  const bg = v3Bg(t);
  const fg = fgOn(bg);
  fill(ctx, S, bg);
  halftoneBands(ctx, S, { color: bg === P.red ? P.redDeep : bg === P.ink ? P.char : P.paperDark, cell: 18, alpha: 0.8, gap: 900 });
  speed(ctx, S, fg, Math.floor(80 + 120 * S.E), { alpha: 0.55, red: bg === P.red ? P.paperLight : P.red, redEvery: 6, maxW: 4 });
  // impact bursts
  for (const [ti, dur] of [[193.76, 1.1], [200.6, 0.5], [206.3, 0.8], [212.9, 0.5], [214.2, 4.0]]) {
    const a = env(t, ti, ti + dur, 0.02, 0.3);
    if (a > 0) M.focusLines(ctx, W, H, W / 2, H / 2, { count: 150, inner: 300, innerVar: 280, color: fg, frame: Math.floor(t * 12), alpha: a * 0.9 });
  }
  // feathers / bindings / skyline / eagle
  if (t >= 208.1 && t < 213.1) {
    const k = clamp(Math.floor((t - 208.2) / 1.2), 0, 3);
    const u = (t - 208.2 - k * 1.2) / 1.2;
    if (k === 0) {
      // a pair of wings unfurling
      for (const side of [-1, 1]) {
        for (let f = 0; f < 11; f++) {
          const a = side > 0 ? -0.2 - f * 0.13 : Math.PI + 0.2 + f * 0.13;
          const grow = ew(u, f * 0.03, 0.55 + f * 0.03, 'outCubic');
          const L = (520 - f * 22) * grow;
          M.feather(ctx, W / 2 + side * 60, H * 0.62, L, a - Math.PI / 2, f % 3 === 0 ? P.red : P.ink, { lw: 2.4, grow: 1, seed: f + (side > 0 ? 40 : 0) });
        }
      }
    } else if (k === 1) {
      // bindings part: straps snap and whip away
      const snap = ew(u, 0.35, 1, 'outCubic');
      ctx.save();
      [[-0.45, 0.35], [0.4, 0.55], [0.05, 0.75], [-0.1, 0.2]].forEach(([rot, yy], i) => {
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(W / 2 + side * snap * 300, H * yy);
          ctx.rotate(rot + side * snap * 0.7 * (i % 2 ? 1 : -1));
          ctx.fillStyle = P.paper;
          const x0 = side < 0 ? -W : 6, x1 = side < 0 ? -6 : W;
          ctx.globalAlpha = 1 - snap * 0.8;
          ctx.fillRect(x0, -18, x1 - x0, 36);
          ctx.fillStyle = P.sand;
          for (let x = x0; x < x1; x += 28) {
            ctx.beginPath();
            ctx.moveTo(x, -18);
            ctx.lineTo(x + 14, -18);
            ctx.lineTo(x + 2, 18);
            ctx.lineTo(x - 12, 18);
            ctx.fill();
          }
          ctx.restore();
        }
      });
      ctx.restore();
    } else if (k === 2) {
      // the skyline bends
      const b = ew(u, 0, 0.9, 'inOutCubic');
      ctx.save();
      ctx.strokeStyle = P.ink;
      for (let j = 0; j < 7; j++) {
        const y = H * 0.66 + j * j * 9;
        const lift = b * (320 - j * 30);
        ctx.lineWidth = j === 0 ? 8 : 2.5;
        ctx.beginPath();
        ctx.moveTo(-60, y + lift * 0.1);
        ctx.quadraticCurveTo(W / 2, y - lift * 1.6, W + 60, y + lift * 0.1);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // the eagle soars through
      const p = ew(u, 0, 1, 'inOutCubic');
      M.eagle(ctx, lerp(W * 0.18, W * 0.86, p), lerp(H * 0.95, H * 0.12, p), lerp(260, 420, Math.sin(p * Math.PI)), Math.sin(t * 7), lerp(0.5, 0.25, p), P.red);
    }
  }
}

// ------------------------------------------------------------------ outro
const GLYPHS = Array.from('落ちる空の指光零れ翼瞼地平線輝形移脱沈鳥籠遠彼方じゆう石鋼蒸気加速雲炎越終疾走星屑速進下夜明軽恐怖軌道樹逆咲囁冠私共廻香影声木霊薄広羽伸縛解撓鷲舞');

function glyphRain(ctx, S, o) {
  const { W, H, t } = S;
  const { count = 90, colors = [P.ink, P.red], alpha = 1, seed = 17 } = o;
  const span = H * 1.8;
  for (let i = 0; i < count; i++) {
    const par = rnd(seed, i * 5, 0.4, 1.8);
    const size = rnd(seed, i * 5 + 1, 30, 150) * (0.4 + par * 0.6);
    const x = h2(seed, i * 5 + 2) * W;
    const y = mod(h2(seed, i * 5 + 3) * span - S.D * par, span) - H * 0.4;
    const ch = GLYPHS[Math.floor(h2(seed, i * 5 + 4) * GLYPHS.length)];
    ctx.globalAlpha = alpha * clamp(par);
    const col = colors[i % colors.length];
    // streak behind glyph
    ctx.fillStyle = rgba(col, 0.25);
    ctx.fillRect(x - size * 0.03, y + size * 0.6, size * 0.06, Math.min(H, S.speed * par * 0.12));
    glyph(ctx, i % 4 === 0 ? 'gothic' : 'mincho', ch, x, y, size, { fill: col });
  }
  ctx.globalAlpha = 1;
}

function outro(ctx, S) {
  const { t, W, H } = S;
  // 242.3–250: the run that never ends — tunnel, red world
  if (t < 250) {
    fill(ctx, S, P.red);
    halftoneBands(ctx, S, { color: P.redDeep, cell: 20, alpha: 1, gap: 800 });
    speed(ctx, S, P.ink, Math.floor(100 + 100 * S.E), { alpha: 0.55, red: P.paperLight, redEvery: 5, maxW: 4 });
    frameTunnel(ctx, S, { color: P.ink, lwK: 1.2 });
    PH.flyingPhoenix(ctx, S, { bg: P.red, s: 74, laneW: W * 0.24, seed: 21 });
    return;
  }
  // 250–258: everything we have passed rises past us once more
  if (t < 258.1) {
    vgrad(ctx, S, P.paperDark, P.paper);
    mistField(ctx, S, { alpha: 0.9 });
    speed(ctx, S, P.ink, 120, { alpha: 0.5, red: P.red, redEvery: 7 });
    const pass = (t0, dur) => {
      const p = (t - t0) / dur;
      return p > -0.05 && p < 1.05 ? lerp(H * 1.5, -H * 0.6, p) : null;
    };
    let y;
    if ((y = pass(249.8, 2.2)) !== null) M.cage(ctx, W * 0.3, y, 260, { color: P.ink, bars: 13, lw: 4, spin: t * 0.3, bottom: 0.4 });
    if ((y = pass(251.0, 2.4)) !== null) M.wingedEye(ctx, W * 0.66, y, 520, { open: 1, wing: 1, color: P.ink, iris: P.red, lw: 8, t, paper: P.paperLight, look: Math.sin(t * 2) * 0.5 });
    if ((y = pass(252.4, 2.6)) !== null) tree(ctx, S, W * 0.35, y - H * 0.3, 1, { blossom: 1, sway: 1 });
    if ((y = pass(253.9, 2.4)) !== null) {
      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 5;
      for (const dy of [-60, 60]) {
        ctx.beginPath();
        ctx.ellipse(W * 0.68, y + dy, 420, 110, 0, 0, TAU);
        ctx.stroke();
      }
      for (let i = 0; i < 11; i++) {
        const a = -t * 1.5 + (i / 11) * TAU;
        const d = (Math.sin(a) + 1) / 2;
        const sx = W * 0.68 + Math.cos(a) * 420, sy = y - 60 + Math.sin(a) * 110;
        const hgt = lerp(90, 160, d);
        ctx.globalAlpha = lerp(0.3, 1, d);
        ctx.fillStyle = P.ink;
        ctx.beginPath();
        ctx.moveTo(sx - 26 * d - 10, sy);
        ctx.lineTo(sx, sy - hgt);
        ctx.lineTo(sx + 26 * d + 10, sy);
        ctx.fill();
        ctx.fillStyle = P.red;
        ctx.beginPath();
        ctx.arc(sx, sy - hgt - 10, 10 * d + 4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if ((y = pass(255.0, 2.4)) !== null) {
      ctx.save();
      ctx.globalAlpha = 1;
      flock(ctx, S, 1.2 + (t - 255) * 0.5, { colors: [P.sand, P.ink, P.red], accent: P.ink, seed: 44, count: 26 });
      ctx.restore();
    }
    if ((y = pass(256.2, 2.2)) !== null) M.eagle(ctx, W * 0.5, y, 380, Math.sin(t * 6), 0, P.red);
    return;
  }
  // 258–268.7: glyph rain, colours flipping on every bar
  if (t < 268.7) {
    const b = S.beat;
    const bgs = [P.paper, P.red, P.ink, P.red];
    const bg = bgs[mod(b.bar, 4)];
    const fg = fgOn(bg);
    fill(ctx, S, bg);
    halftoneBands(ctx, S, { color: bg === P.red ? P.redDeep : bg === P.ink ? P.char : P.paperDark, cell: 18, alpha: 0.9, gap: 900 });
    speed(ctx, S, fg, 160, { alpha: 0.5, maxW: 4 });
    M.focusLines(ctx, W, H, W / 2, H / 2, { count: 130, inner: 380, innerVar: 300, color: fg, frame: Math.floor(t * 12), alpha: 0.5 + 0.4 * S.bp });
    glyphRain(ctx, S, { count: 110, colors: bg === P.red ? [P.ink, P.paperLight] : [fg, P.red] });
    PH.flyingPhoenix(ctx, S, { bg, s: 96, laneW: W * 0.3, seed: 31, amp: 1.2 });
    return;
  }
  // 268.7–end: release. Paper rises from below like a last cloud layer;
  // the figure glides away as the music fades.
  const r = ew(t, 268.7, 269.9, 'inOutCubic');
  fill(ctx, S, P.red);
  glyphRain(ctx, S, { count: 110, colors: [P.ink, P.paperLight], alpha: 1 });
  const edge = lerp(S.H + 80, -120, r);
  ctx.fillStyle = P.paper;
  ctx.beginPath();
  ctx.moveTo(-60, S.H + 60);
  for (let x = -60; x <= S.W + 60; x += 40) ctx.lineTo(x, edge + Math.sin(x * 0.012 + t * 3) * 30 + Math.sin(x * 0.031) * 18);
  ctx.lineTo(S.W + 60, S.H + 60);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(-60, edge + 40, S.W + 120, S.H);
  ctx.clip();
  mistField(ctx, S, { alpha: 0.9 });
  ctx.restore();
  const away = ew(t, 269.0, 271.0, 'inOutCubic');
  const s = lerp(72, 6, away);
  const x = W / 2, y = lerp(H * 0.5, H * 0.46, away);
  if (t < 270.75) {
    ctx.globalAlpha = 1 - ew(t, 270.35, 270.75);
    // wings wide, rising away into the paper sky: the fall has become flight
    PH.phoenix(ctx, x, y, s * 1.1, Math.PI, { open: 1, beat: Math.sin(t * 5) * 0.7, t, colors: PH.phoenixColors(P.paper) });
    ctx.globalAlpha = 1;
  }
  // the thin line from the very first frame returns — and breaks open
  const lineA = ew(t, 269.4, 270.3, 'outCubic');
  const brk = ew(t, 270.6, 271.4, 'outCubic');
  if (lineA > 0) {
    ctx.fillStyle = P.ink;
    const half = (W / 2) * lineA;
    const gap = brk * W * 0.6;
    ctx.fillRect(W / 2 - half - gap, H * 0.62 - 1.5, half, 3);
    ctx.fillRect(W / 2 + gap, H * 0.62 - 1.5, half, 3);
  }
  // the self, a single red point, dropping through the opened line
  if (t >= 270.35) {
    const d = ew(t, 270.7, 271.45, 'inCubic');
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.arc(x, lerp(H * 0.46, H * 1.1, d), 7 + d * 4, 0, TAU);
    ctx.fill();
  }
}

export const BLOCKS3 = [
  [182.2, 193.6, breakdown],
  [193.6, 218.2, verse3],
  [242.3, 272, outro],
];
