// Worlds for the choruses, the first instrumental, and verse 2.
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba, mulberry } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';
import { fill, vgrad, mistField, halftoneBands, speed, cloudField, flameField } from './layers.js';

// Chorus line ids and per-chorus colour plans.
export const CH = [
  { v: 1, a: 'L017', ae: 'L018', b: 'L019', be: 'L020', c: 'L021', ce: 'L022', d: 'L023', de: 'L024', start: 73.78, end: 98.3 },
  { v: 2, a: 'L041', ae: 'L042', b: 'L043', be: 'L044', c: 'L045', ce: 'L046', d: 'L047', de: 'L048', start: 158.5, end: 182.2 },
  { v: 3, a: 'L065', ae: 'L066', b: 'L067', be: 'L068', c: 'L069', ce: 'L070', d: 'L071', de: 'L072', start: 218.2, end: 242.3 },
];
// phase -> [background, primary ink (kana), secondary ink (english)]
export const CHP = {
  1: { A: [P.red, P.paperLight, P.ink], B: [P.red, P.paperLight, P.ink], C: [P.ink, P.red, P.paper], D: [P.red, P.paperLight, P.ink] },
  2: { A: [P.ink, P.red, P.paper], B: [P.paper, P.ink, P.red], C: [P.red, P.paperLight, P.ink], D: [P.ink, P.red, P.paper] },
  3: { A: [P.red, P.paperLight, P.ink], B: [P.ink, P.paper, P.red], C: [P.paper, P.red, P.ink], D: [P.red, P.paperLight, P.ink] },
};
export function chorusAt(t) {
  for (const c of CH) if (t >= c.start && t < c.end) return c;
  return null;
}
export function chorusPhase(S, c) {
  const L = S.TL.byId;
  const t = S.t;
  if (t < L[c.b].start - 0.25) return 'A';
  if (t < L[c.c].start) return 'B';
  if (t < L[c.d].start) return 'C';
  return 'D';
}

// ------------------------------------------------------------------ birds
export function flock(ctx, S, lt, o = {}) {
  const { W, H, t } = S;
  const { count = 48, colors = [P.paperDark, P.ink, P.paperLight], accent = P.ink, seed = 5, alpha = 1, angle = -0.32, scale = 1 } = o;
  const tau = lt + 0.55 * lt * lt; // accelerating
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const Lp = W + 900;
  const spd = 1 + 1.1 * lt;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const depth = rnd(seed, i * 9, 0.35, 1);
    const vf = rnd(seed, i * 9 + 1, 0.7, 1.3) * (0.5 + depth * 0.7);
    const p = mod(h2(seed, i * 9 + 2) * Lp + tau * 520 * vf, Lp) - 450;
    const y0 = rnd(seed, i * 9 + 3, -0.1, 1.35) * H;
    const x = p, y = y0 + p * dy / dx * 0.9;
    if (y < -150 || y > H + 150) continue;
    const s = rnd(seed, i * 9 + 4, 70, 170) * depth * scale;
    const style = ['stone', 'steel', 'steam'][i % 3];
    const flap = Math.sin(t * (9 + vf * 5) + i * 1.7);
    // speed streak
    const sl = Math.min(600, 60 * spd * spd * depth);
    ctx.fillStyle = rgba(style === 'steel' ? colors[1] : colors[0], 0.25 * depth);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillRect(-sl - s * 0.4, -1.5, sl, 3);
    ctx.restore();
    if (style === 'steam') {
      ctx.fillStyle = rgba(colors[2], 0.35);
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath();
        ctx.arc(x - dx * s * 0.8 * k, y - dy * s * 0.8 * k + Math.sin(t * 3 + k + i) * 4, s * (0.28 - k * 0.04), 0, TAU);
        ctx.fill();
      }
      M.bird(ctx, x, y, s, flap, angle, { color: colors[2], style: 'outline', lw: Math.max(1.5, s * 0.05) });
    } else if (style === 'steel') {
      M.bird(ctx, x, y, s, flap, angle, { color: colors[1], style: 'steel', accent: colors[2] });
    } else {
      M.bird(ctx, x, y, s, flap, angle, { color: colors[0], style: 'stone', accent, seed: i });
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ chorus world
function chorusWorld(ctx, S) {
  const c = chorusAt(S.t);
  if (!c) return;
  const ph = chorusPhase(S, c);
  const [bg, ink, en] = CHP[c.v][ph];
  const L = S.TL.byId;
  const t = S.t;
  fill(ctx, S, bg);
  const fg = bg === P.paper ? P.ink : bg === P.ink ? P.paper : P.ink;
  if (ph === 'A') {
    // wallpaper of outlined じゆう columns rising behind everything
    const wall = bg === P.red ? P.redDeep : bg === P.ink ? P.char : P.paperDark;
    ctx.save();
    ctx.strokeStyle = wall;
    ctx.lineWidth = 3;
    ctx.font = '170px "DS Gothic"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [0.08, 0.22, 0.78, 0.92].forEach((fx, k) => {
      const off = mod(S.D * (0.8 + k * 0.15) + k * 300, 170 * 4);
      for (let j = -1; j < 9; j++) {
        const ch = 'じゆう　'[mod(j, 4)];
        ctx.strokeText(ch, fx * S.W, j * 170 - off + 85);
      }
    });
    ctx.restore();
  }
  if (ph === 'A' && c.v === 3) {
    const k = ew(t, 221.0, 222.0);
    if (k > 0) {
      M.focusLines(ctx, S.W, S.H, S.W / 2, S.H / 2, { count: 130, inner: 380, innerVar: 280, color: P.redDeep, frame: Math.floor(t * 12), alpha: k });
      frameTunnel(ctx, S, { color: P.ink, alpha: k, lwK: 1.3 });
    }
  }
  if (ph === 'A' || ph === 'C') {
    halftoneBands(ctx, S, { color: bg === P.red ? P.redDeep : bg === P.ink ? P.char : P.paperDark, cell: 20, alpha: 0.6, gap: 900 });
    speed(ctx, S, fg, Math.floor(40 + 120 * S.E), { alpha: 0.45, maxW: 4, red: bg === P.red ? P.paperLight : P.red, redEvery: 9 });
  }
  if (ph === 'B') {
    const lt = t - L[c.b].start;
    halftoneBands(ctx, S, { color: bg === P.red ? P.redDeep : bg === P.ink ? P.char : P.paperDark, cell: 18, alpha: 0.5, gap: 1000 });
    speed(ctx, S, fg, 60, { alpha: 0.35 });
    const cols = bg === P.red ? [P.paperDark, P.ink, P.paperLight] : bg === P.ink ? [P.sand, P.red, P.paper] : [P.sand, P.ink, P.red];
    flock(ctx, S, lt, { colors: cols, accent: fg, seed: 5 + c.v, count: 26 + c.v * 8, scale: 1 + (c.v - 1) * 0.12 });
  }
  if (ph === 'D') {
    const lt = t - L[c.d].start;
    const lineC = bg === P.ink ? P.red : P.ink;
    cloudField(ctx, S, { par: 0.7, gap: 520, fillC: bg === P.ink ? P.char : P.redDeep, line: null, lw: 0, seed: 70 + c.v, scale: 1.3 });
    flameField(ctx, S, { par: 1.2, gap: 380, colors: bg === P.ink ? [P.red, P.redDeep] : [P.redHot, P.ink], seed: 90 + c.v, scale: 1.1 });
    cloudField(ctx, S, { par: 1.8, gap: 460, fillC: P.paperLight, line: lineC, lw: 6, seed: 80 + c.v, scale: 1.2 });
    speed(ctx, S, fg, 90, { alpha: 0.5, maxW: 4 });
  }
}

// ------------------------------------------------------------------ instrumental 1: frame tunnel
export function frameTunnel(ctx, S, o = {}) {
  const { W, H, t, TL } = S;
  const { color = P.red, every = 1, alpha = 1, lwK = 1, ticks = true } = o;
  const b = TL.beatIndexAt(t);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (let i = b - 1; i < b + 6; i++) {
    if (mod(i, every) !== 0) continue;
    const ti = TL.beatTime(i);
    const z = ti - t;
    if (z > 3.2) continue;
    const sc = 1 / (1 + Math.max(z, 0) * 3.4);
    const hw = W * 0.47 * sc, hh = H * 0.45 * sc;
    const rot = noise1(i * 0.7, 3) * 0.12 * (1 - sc);
    const a = alpha * clamp((3.2 - z) / 1.2);
    ctx.globalAlpha = a;
    if (z >= 0) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(rot);
      ctx.lineWidth = Math.max(1.5, 16 * sc * lwK);
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
      if (ticks) {
        const L = 40 * sc;
        for (const [x, y] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
          ctx.fillRect(x - L * 0.1, y - L, L * 0.2, L * 2);
          ctx.fillRect(x - L, y - L * 0.1, L * 2, L * 0.2);
        }
      }
      ctx.restore();
    } else {
      // passed through: the four sides fly out
      const k = ease.outCubic(clamp(-z / 0.5));
      ctx.globalAlpha = a * (1 - k);
      ctx.lineWidth = 16 * lwK;
      const hw1 = W * 0.47, hh1 = H * 0.45;
      const sides = [[-hw1, -hh1, hw1, -hh1, 0, -1], [hw1, -hh1, hw1, hh1, 1, 0], [hw1, hh1, -hw1, hh1, 0, 1], [-hw1, hh1, -hw1, -hh1, -1, 0]];
      sides.forEach(([x0, y0, x1, y1, nx, ny], s) => {
        ctx.save();
        ctx.translate(W / 2 + nx * k * 400, H / 2 + ny * k * 300);
        ctx.rotate(rnd(i, s, -0.5, 0.5) * k);
        ctx.beginPath();
        ctx.moveTo(x0 * (1 + k * 0.4), y0 * (1 + k * 0.4));
        ctx.lineTo(x1 * (1 + k * 0.4), y1 * (1 + k * 0.4));
        ctx.stroke();
        ctx.restore();
      });
    }
  }
  ctx.restore();
}

function inst1(ctx, S) {
  const { t, W, H } = S;
  fill(ctx, S, P.ink);
  halftoneBands(ctx, S, { color: P.char, cell: 18, alpha: 1, gap: 800 });
  speed(ctx, S, P.paper, Math.floor(60 + 140 * S.E), { alpha: 0.55, red: P.red, redEvery: 5, maxW: 4 });
  const late = ew(t, 104.2, 105.2);
  if (late > 0) M.focusLines(ctx, W, H, W / 2, H / 2, { count: 140, inner: 360, innerVar: 260, color: P.char, frame: Math.floor(t * 12), alpha: late * (0.6 + 0.4 * S.bp) });
  frameTunnel(ctx, S, { color: P.red, lwK: 1.7 });
  // tumbling figure
  const u = t - 98.3;
  const pose = M.mixPose(M.POSES.spread, M.POSES.tuck, 0.5 + 0.5 * Math.sin(u * 1.4));
  M.diver(ctx, W / 2 + Math.sin(u * 0.9) * 60, H * 0.5 + Math.cos(u * 0.7) * 30, lerp(46, 80, late), pose, u * 2.2, P.paper, { wings: late * 0.8 });
}

// ------------------------------------------------------------------ verse 2 worlds
function night(ctx, S) {
  const { t, W, H } = S;
  vgrad(ctx, S, P.ink, mix(P.ink, P.char, 0.8));
  const fast = env(t, 113.0, 117.4, 0.4, 0.6);
  M.stars(ctx, W, H, { D: S.D * 0.6, speed: S.speed, count: 260, color: P.paper, seed: 11, alpha: 0.9, t, stretch: 0.02 + fast * 0.12 });
  M.stars(ctx, W, H, { D: S.D * 1.3, speed: S.speed * 1.5, count: 60, color: P.red, seed: 12, alpha: 0.9, t, stretch: 0.03 + fast * 0.16 });
}

function dawn(ctx, S) {
  const { t, W, H } = S;
  const p = ew(t, 124.8, 133.2, 'inOutCubic');
  fill(ctx, S, P.ink);
  const cols = [P.redDeep, P.red, P.redHot, P.sand, P.paperDark, P.paper];
  M.stars(ctx, W, H, { D: S.D * 0.6, speed: S.speed, count: 200, color: P.paper, seed: 11, alpha: 0.9 * (1 - p), t, stretch: 0.02 });
  cols.forEach((c, k) => {
    const y = H * (1.08 - p * 2.05 + k * 0.17);
    // slight wave on each stratum
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-60, H + 60);
    for (let x = -60; x <= W + 60; x += 60) ctx.lineTo(x, y + Math.sin(x * 0.004 + t * 0.8 + k) * 10);
    ctx.lineTo(W + 60, H + 60);
    ctx.closePath();
    ctx.fill();
  });
  // a pale sun disc rising behind the strata (ink ring, not a flag)
  const sy = H * (1.2 - p * 0.9);
  ctx.strokeStyle = rgba(P.paperLight, 0.5 * (1 - p * 0.5));
  ctx.lineWidth = 3;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    ctx.arc(W * 0.5, sy, 160 + r * 40, 0, TAU);
    ctx.stroke();
  }
  speed(ctx, S, mix(P.paper, P.ink, p), 50, { alpha: 0.35 });
}

// tree of trajectories: inverted, growing downward from the top
function buildTree(seed) {
  const rand = mulberry(seed);
  const segs = [];
  const grow = (x, y, a, len, d, order) => {
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    segs.push({ x0: x, y0: y, x1, y1, d, order, leaf: d >= 6, a });
    if (d >= 6) return;
    const n = d < 2 ? 2 : rand() < 0.3 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const spread = 0.28 + rand() * 0.38;
      const na = a + (n === 2 ? (k ? spread : -spread) : (k - 1) * spread) + (rand() - 0.5) * 0.2;
      grow(x1, y1, na, len * (0.68 + rand() * 0.14), d + 1, order * 3 + k);
    }
  };
  grow(0, -60, Math.PI / 2, 230, 0, 1);
  return segs;
}

export function tree(ctx, S, cx, oy, g, o = {}) {
  let segs = S.cache.get('tree');
  if (!segs) { segs = buildTree(7); S.cache.set('tree', segs); }
  const { color = P.ink, blossom = 0, petalColor = P.red, t = S.t, sway = 0 } = o;
  ctx.save();
  ctx.translate(cx, oy);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (const s of segs) {
    const u = clamp(g * 7.2 - s.d);
    if (u <= 0) continue;
    const sw = Math.sin(t * 0.8 + s.d) * sway * s.d * 0.01;
    ctx.lineWidth = Math.max(1.2, 16 * Math.pow(0.66, s.d));
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    // slight curve per branch so it reads as trajectories, not a diagram
    const mx = (s.x0 + s.x1) / 2 + Math.sin(s.order) * 12, my = (s.y0 + s.y1) / 2;
    const ex = lerp(s.x0, s.x1, u) + sw * 40, ey = lerp(s.y0, s.y1, u);
    ctx.quadraticCurveTo(lerp(s.x0, mx, u), lerp(s.y0, my, u), ex, ey);
    ctx.stroke();
  }
  // blossoms that bloom "backwards": petals fly UP from below onto the tips
  if (blossom > 0) {
    let i = 0;
    for (const s of segs) {
      if (!s.leaf) continue;
      i++;
      const delay = h2(31, i) * 0.5;
      const u = clamp((blossom - delay) / 0.5);
      if (u <= 0) continue;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * TAU + i;
        const k = ease.outCubic(u);
        // start far below, spiralling in reverse
        const sx = s.x1 + Math.cos(pa + (1 - k) * 4) * (1 - k) * 260;
        const sy = s.y1 + (1 - k) * (500 + p * 60);
        const r = 12 + 6 * k;
        ctx.fillStyle = petalColor;
        ctx.save();
        ctx.translate(sx + Math.cos(pa) * r * 0.9 * k, sy + Math.sin(pa) * r * 0.9 * k);
        ctx.rotate(pa);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      if (u > 0.9) {
        ctx.fillStyle = P.ink;
        ctx.beginPath();
        ctx.arc(s.x1, s.y1, 4, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function fearTree(ctx, S) {
  const { t, W, H } = S;
  fill(ctx, S, P.paper);
  mistField(ctx, S, { alpha: 0.7 });
  speed(ctx, S, P.ink, 40, { alpha: 0.35 });
  const g = ew(t, 136.6, 140.8, 'outCubic');
  const blossom = seg(t, 139.2, 144.5);
  // after the English line we fall past the tree: it slides up
  const lift = ew(t, 145.8, 148.8, 'inCubic') * H * 1.6;
  if (t > 136.4) tree(ctx, S, W * lerp(0.5, 0.66, ew(t, 140.6, 142.2, 'inOutCubic')), -lift, g, { blossom, sway: 1 });
}

// Crown of whispers: shared position/spin for ring geometry and ring text.
export function crownState(t, W, H) {
  const u = t - 149;
  return {
    cx: W / 2, cy: H * 0.52 + ew(t, 156.8, 158.7, 'inCubic') * H * 0.95,
    rx: 640 * ew(t, 148.7, 149.5, 'outBack'), ry: 150,
    spin: 0.55 * u + 0.09 * u * u,
  };
}
function crownWorld(ctx, S) {
  const { t, W, H } = S;
  fill(ctx, S, P.paper);
  halftoneBands(ctx, S, { color: P.paperDark, cell: 16, alpha: 1 });
  speed(ctx, S, P.ink, 60, { alpha: 0.4 });
  // whispers: faint fragments drifting upward
  ctx.save();
  ctx.fillStyle = rgba(P.ink, 0.12);
  ctx.font = '36px "DS Mincho"';
  ctx.textAlign = 'center';
  for (let k = 0; k < 40; k++) {
    const y = mod(h2(41, k) * H * 1.4 - S.D * rnd(41, k + 1, 0.2, 0.7), H * 1.4) - H * 0.2;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + k);
    ctx.fillText('囁', h2(41, k + 2) * W, y);
  }
  ctx.restore();
  // the crown: two rings and spikes, back half dimmer
  const c = crownState(t, W, H);
  if (c.rx < 2) return;
  const spikes = 11;
  const items = [];
  for (let i = 0; i < spikes; i++) {
    const a = -c.spin + (i / spikes) * TAU + 0.15;
    items.push({ a, z: Math.sin(a) });
  }
  items.sort((p, q) => p.z - q.z);
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = P.ink;
  for (const dy of [70, -70]) {
    ctx.beginPath();
    ctx.ellipse(c.cx, c.cy + dy, c.rx * 1.02, c.ry, 0, 0, TAU);
    ctx.stroke();
  }
  for (const it of items) {
    const x = c.cx + Math.cos(it.a) * c.rx * 1.02, y = c.cy - 70 + Math.sin(it.a) * c.ry;
    const d = (it.z + 1) / 2;
    const hgt = lerp(110, 190, d), wd = lerp(18, 46, d) * Math.abs(Math.cos(it.a) * 0.5 + 0.5 * (1 - Math.abs(Math.cos(it.a))) + 0.3);
    ctx.globalAlpha = lerp(0.3, 1, d);
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.moveTo(x - wd, y);
    ctx.lineTo(x, y - hgt);
    ctx.lineTo(x + wd, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.arc(x, y - hgt - 12, lerp(6, 14, d), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export const BLOCKS2 = [
  [73.78, 98.3, chorusWorld],
  [98.3, 110.0, inst1],
  [110.0, 125.0, night],
  [124.8, 134.2, dawn],
  [134.2, 149.0, fearTree],
  [149.0, 158.6, crownWorld],
  [158.5, 182.2, chorusWorld],
  [218.2, 242.3, chorusWorld],
];
