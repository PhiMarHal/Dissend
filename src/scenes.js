// The world behind the words: skies, props, camera and impact timing.
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba, smoothstep } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';
import { textH, textV, widthOf } from './type.js';
import { fill, vgrad, mistField, halftoneBands, speed, cloudField, flameField } from './layers.js';
import { BLOCKS2 } from './scenes2.js';
import * as PH from './phoenix.js';
import { BLOCKS3 } from './scenes3.js';

export const SEC = {
  intro: [0, 24.8], v1: [24.8, 73.7], c1: [73.7, 98.3], i1: [98.3, 109.9], v2: [109.9, 158.5],
  c2: [158.5, 182.2], brk: [182.2, 193.6], v3: [193.6, 218.2], c3: [218.2, 242.3], out: [242.3, 272],
};
export const within = (t, a, b) => t >= a && t < b;

// ------------------------------------------------------------------ speed
export function speedAt(t, TL) {
  const I = TL.intensity(t);
  let m = 1;
  if (t < 13.45) m = 0.03;
  else if (t < 17) m = lerp(0.03, 1, ease.inOutCubic(seg(t, 13.45, 17)));
  if (t > 182.2 && t < 194) m *= lerp(1, 0.3, env(t, 182.4, 193.6, 1.6, 4.5));
  if (t > 72.2 && t < 73.8) m *= lerp(1, 0.25, env(t, 72.2, 73.78, 0.8, 0.05));
  if (t > 268.6) m *= lerp(1, 0.08, ease.inOutCubic(seg(t, 268.6, 270.6)));
  return m * (160 + 2600 * Math.pow(I, 1.35));
}

// ------------------------------------------------------------------ impacts
// [time, strength, flash colour]
export const IMPACTS = [
  [13.5, 0.35, P.paperLight], [16.95, 0.3, P.paperLight], [20.05, 0.3, P.paperLight], [23.0, 0.4, P.red], [24.95, 0.3, P.paperLight], [50.0, 1.0, P.red], [57.18, 0.5, P.paperLight],
  [61.28, 0.55, P.paperLight], [73.78, 1.3, P.paperLight], [86.2, 0.8, P.paperLight], [92.2, 0.55, P.ink],
  [98.3, 0.8, P.red], [110.0, 0.8, P.paperLight], [125.0, 0.4, P.red], [134.3, 0.6, P.red],
  [158.6, 1.3, P.paperLight], [170.4, 0.8, P.paperLight], [176.4, 0.55, P.ink], [193.76, 1.3, P.red],
  [202.2, 0.6, P.paperLight], [208.2, 0.6, P.red], [214.2, 0.7, P.paperLight], [218.3, 1.5, P.paperLight],
  [224.4, 0.6, P.ink], [230.3, 1.0, P.paperLight], [236.1, 0.7, P.ink], [242.3, 1.0, P.red],
];

export function frameFx(S) {
  const { t, E } = S;
  const fx = S.fx;
  fx.shake = S.low * E * 5 + S.hit * E * 3;
  fx.zoom = 0.014 * S.bp * E;
  fx.rot = noise1(t * 0.13, 9) * 0.012 * E;
  for (const [ti, s, col] of IMPACTS) {
    const dt = t - ti;
    if (dt < -0.02 || dt > 1.2) continue;
    // hard strobe for two or three frames (fading a flash would tint the
    // palette pink/grey), then the hit lives on in shake, zoom and RGB split
    if (s >= 0.6 && dt >= 0 && dt < 0.045) { fx.flash = 1; fx.flashColor = col; }
    fx.chroma = Math.max(fx.chroma, 22 * s * Math.exp(-Math.max(0, dt) / 0.18));
    fx.shake += 34 * s * Math.exp(-Math.max(0, dt) / 0.25);
    fx.zoom += 0.06 * s * Math.exp(-Math.max(0, dt) / 0.3);
    fx.slice = Math.max(fx.slice, 60 * s * Math.exp(-Math.max(0, dt) / 0.07));
  }
  // continuous gentle chroma on loud passages
  fx.chroma = Math.max(fx.chroma, S.hit * E * E * 5);
  if (t < 6) fx.shake = 0, fx.zoom = 0, fx.rot = 0;
  // the breath before chorus 1
  if (within(t, 72.2, 73.78)) { fx.shake *= 0.2; fx.zoom += ew(t, 72.2, 73.78, 'inCubic') * 0.12; }
}

// ------------------------------------------------------------------ INTRO
function intro(ctx, S) {
  const { t, W, H } = S;
  const leapT = 13.45;
  const off = Math.max(0, S.D - S.Dist(leapT));
  vgrad(ctx, S, mix(P.paperDark, P.paper, 0.4), P.paper);
  // distant mist, very slow before the leap
  mistField(ctx, S, { alpha: ew(t, 5, 9) * 0.9 });
  if (t > 16) halftoneBands(ctx, S, { alpha: 0.12 + 0.12 * S.low, cell: 18, color: P.char });
  if (t > 14.5) speed(ctx, S, P.ink, Math.floor(10 + 60 * S.E), { alpha: 0.55 * ew(t, 14.5, 17) });

  // ledge + hanging title
  const ledgeY = H * 0.5 - off;
  if (ledgeY > -200) {
    const lineW = ew(t, 1.5, 3.4, 'inOutCubic');
    ctx.fillStyle = P.ink;
    // the ledge breaks after the leap: two halves pull apart
    const gap = ew(t, leapT + 0.1, leapT + 1.4, 'outCubic') * W * 0.18;
    const half = (W / 2) * lineW;
    ctx.fillRect(W / 2 - half - gap, ledgeY - 1.5, half - 6, 3);
    ctx.fillRect(W / 2 + 6 + gap, ledgeY - 1.5, half - 6, 3);
    const title = 'DISSEND';
    const size = 132;
    const tr = 0.42;
    textH(ctx, 'wideThin', title, W / 2, ledgeY + 300, size, { fill: P.ink, tracking: tr }, (i, n, g, gx, gy) => {
      const ap = ew(t, 5.6 + i * 0.28, 6.6 + i * 0.28, 'outCubic');
      if (ap <= 0) return false;
      const drop = Math.max(0, t - (leapT + 0.15 + i * 0.11));
      const fallY = 900 * drop * drop + (1 - ap) * -40;
      const swing = Math.sin(t * 1.3 + i * 0.9) * 0.025 * (1 - clamp(drop * 3));
      return { dy: fallY, rot: swing + drop * drop * rnd(3, i, -1.8, 1.8), alpha: ap * (1 - clamp(drop / 1.6)) };
    });
    // hanging threads
    ctx.strokeStyle = rgba(P.ink, 0.35 * ew(t, 6, 8));
    ctx.lineWidth = 1;
    const L = widthOf('wideThin', title, size, tr);
    for (let i = 0; i < title.length; i++) {
      const drop = t - (leapT + 0.15 + i * 0.11);
      if (drop > 0) continue;
      const x = W / 2 - L / 2 + (L / title.length) * (i + 0.45);
      ctx.beginPath();
      ctx.moveTo(x, ledgeY);
      ctx.lineTo(x, ledgeY + 232);
      ctx.stroke();
    }
  }

  // barriers rising to meet us on the bar accents — and breaking
  for (const [tb, seed, style] of [[16.95, 3, 'rule'], [20.05, 5, 'rule'], [23.0, 8, 'bars']]) {
    M.barrier(ctx, W, t, tb, { color: P.ink, y: H * 0.5, thick: style === 'bars' ? 8 : 6, seed, approach: 0.55, pieces: 11, tick: style === 'bars' ? 96 : 30, H, style });
  }
  // the phoenix: perched on the ledge, flares, launches, then owns the fall
  if (t > 5.5 && t < 25) {
    const s = 88;
    const perchY = ledgeY - s * 0.95;
    const C = PH.phoenixColors(P.paper);
    const a = ew(t, 5.5, 7);
    if (t < leapT) {
      const flare = ew(t, 11.8, 13.2, 'outCubic');
      PH.phoenix(ctx, W / 2, perchY - flare * 24, s, Math.PI, {
        open: 0.08 + flare * 0.92 + Math.sin(t * 1.6) * 0.02, beat: Math.sin(t * 10) * 0.5 * flare, t, colors: C, alpha: a,
      });
    } else {
      const u = t - leapT;
      const amp = ew(t, leapT + 0.8, leapT + 3.2, 'inOutCubic');
      const f = PH.flightPose(S, t, { amp, fall: 700 });
      const k = ew(t, leapT, leapT + 1.2, 'inOutCubic');
      // launch: shoot up off the ledge, flip over into the dive
      const launchY = perchY - Math.sin(clamp(u / 1.0) * Math.PI) * 300;
      let x = lerp(W / 2, f.x, k), y = lerp(launchY, f.y, k);
      let rot = lerp(Math.PI, f.rot, ew(t, leapT + 0.3, leapT + 0.85, 'inOutCubic'));
      let open = lerp(1, f.open, ew(t, leapT + 0.5, leapT + 1.3)), beat = lerp(Math.sin(u * 16), f.beat, k);
      if (t > 23.9) {
        const d = ew(t, 23.9, 24.75, 'inCubic');
        y += d * H * 0.85;
        open = lerp(open, 0.08, ew(t, 23.9, 24.15));
        rot = lerp(rot, 0, ew(t, 23.9, 24.15));
      }
      if (t > leapT + 0.5) PH.fireTrail(ctx, S, t, { amp, alpha: ew(t, leapT + 0.5, leapT + 1.5) * (1 - ew(t, 24.1, 24.7)), colors: C.trail });
      PH.phoenix(ctx, x, y, s, rot, { open, beat, flow: f.flow, t, colors: C });
    }
  }

  // the opening lid: black with an almond aperture
  if (t < 6.2) {
    const u = ew(t, 3.0, 6.1, 'inOutCubic');
    const cy = H * 0.5;
    const hh = u * H * 0.95;
    ctx.save();
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.rect(-50, -50, W + 100, H + 100);
    if (hh > 0.5) {
      const ww = W * (0.55 + 0.75 * u);
      ctx.moveTo(W / 2 - ww / 2, cy);
      ctx.quadraticCurveTo(W / 2, cy - hh, W / 2 + ww / 2, cy);
      ctx.quadraticCurveTo(W / 2, cy + hh, W / 2 - ww / 2, cy);
      ctx.closePath();
    }
    ctx.fill('evenodd');
    // hairline before it opens
    const lw = ew(t, 1.5, 3.2, 'inOutCubic');
    if (u < 0.05) {
      ctx.fillStyle = P.paper;
      ctx.fillRect(W / 2 - (W / 2) * lw, cy - 1, W * lw, 2);
    }
    if (hh > 0.5 && u < 0.999) {
      const ww = W * (0.55 + 0.75 * u);
      ctx.strokeStyle = P.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - ww / 2, cy);
      ctx.quadraticCurveTo(W / 2, cy - hh, W / 2 + ww / 2, cy);
      ctx.quadraticCurveTo(W / 2, cy + hh, W / 2 - ww / 2, cy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ VERSE 1
function v1Sky(ctx, S) {
  const { t, W, H } = S;
  // sky darkens where the "fingers" appear, relaxes for the horizon
  const dark = env(t, 27.6, 38.2, 0.9, 0.8);
  vgrad(ctx, S, mix(mix(P.paperDark, P.paper, 0.4), P.sand, dark), mix(P.paper, P.paperDark, dark));
  mistField(ctx, S, { alpha: 0.9 - dark * 0.5 });
  halftoneBands(ctx, S, { alpha: 0.1 + 0.15 * S.low, cell: 16, color: P.char });
  speed(ctx, S, P.ink, Math.floor(20 + 90 * S.E), { alpha: 0.6, red: P.red, redEvery: 11 });
}

// A backlit hand in near first person. Wrist at (0,0), fingers toward -y.
function hand(ctx, x, y, sc, rot, mirror, t, open, C) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(mirror * sc, sc);
  // finger roots across the knuckles, lengths, splay, curl
  const F = [
    { bx: -0.34, by: -1.02, len: 0.78, w: 0.2, a: -0.16 - open * 0.1 },
    { bx: -0.12, by: -1.12, len: 0.98, w: 0.21, a: -0.04 - open * 0.03 },
    { bx: 0.11, by: -1.1, len: 0.92, w: 0.205, a: 0.08 + open * 0.05 },
    { bx: 0.31, by: -1.0, len: 0.72, w: 0.18, a: 0.2 + open * 0.12 },
  ];
  const fingerPath = (f, k) => {
    const wig = Math.sin(t * 0.9 + k * 1.7) * 0.015;
    const a = f.a + wig;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const nx = -dy, ny = dx;
    const tx = f.bx + dx * f.len, ty = f.by + dy * f.len;
    const w0 = f.w / 2, w1 = f.w * 0.4;
    ctx.beginPath();
    ctx.moveTo(f.bx + nx * w0, f.by + ny * w0 + 0.12);
    ctx.quadraticCurveTo(f.bx + dx * f.len * 0.5 + nx * w0 * 1.05, f.by + dy * f.len * 0.5 + ny * w0 * 1.05, tx + nx * w1, ty + ny * w1);
    ctx.arc(tx, ty, w1, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
    ctx.quadraticCurveTo(f.bx + dx * f.len * 0.5 - nx * w0 * 1.05, f.by + dy * f.len * 0.5 - ny * w0 * 1.05, f.bx - nx * w0, f.by - ny * w0 + 0.12);
    ctx.closePath();
    return { dx, dy, nx, ny, tx, ty, w1 };
  };
  // palm + wrist + thumb
  ctx.fillStyle = C.skin;
  ctx.beginPath();
  ctx.moveTo(-0.42, 0.9);
  ctx.bezierCurveTo(-0.5, 0.2, -0.52, -0.6, -0.44, -1.0);
  ctx.quadraticCurveTo(0, -1.2, 0.42, -0.98);
  ctx.bezierCurveTo(0.5, -0.5, 0.46, 0.2, 0.36, 0.9);
  ctx.closePath();
  ctx.fill();
  F.forEach((f, k) => { fingerPath(f, k); ctx.fill(); });
  // rim light on the edges facing the sun, then creases and nails
  ctx.lineCap = 'round';
  F.forEach((f, k) => {
    const g = fingerPath(f, k);
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = C.rim;
    ctx.lineWidth = 0.035;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = C.crease;
    ctx.lineWidth = 0.012;
    for (const u of [0.38, 0.66]) {
      const cx = f.bx + g.dx * f.len * u, cy = f.by + g.dy * f.len * u;
      ctx.beginPath();
      ctx.moveTo(cx - g.nx * f.w * 0.28, cy - g.ny * f.w * 0.28);
      ctx.quadraticCurveTo(cx - g.dy * 0.0 + g.dx * 0.03, cy + g.dy * 0.03, cx + g.nx * f.w * 0.28, cy + g.ny * f.w * 0.28);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(g.tx - g.dx * g.w1 * 0.9, g.ty - g.dy * g.w1 * 0.9, g.w1 * 0.62, g.w1 * 0.95, Math.atan2(g.dy, g.dx) + Math.PI / 2, 0, TAU);
    ctx.stroke();
  });
  // knuckle bumps
  ctx.strokeStyle = C.crease;
  ctx.lineWidth = 0.014;
  F.forEach((f) => { ctx.beginPath(); ctx.arc(f.bx, f.by + 0.16, f.w * 0.32, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); });
  ctx.restore();
}

// Crossed hands held against the sky; they part and the sun breaks through.
function fingers(ctx, S) {
  const { t, W, H } = S;
  const inU = ew(t, 27.6, 29.0, 'outCubic');
  const outU = ew(t, 37.2, 38.3, 'inCubic');
  const vis = inU * (1 - outU);
  if (vis <= 0.001) return;
  const part = ew(t, 29.2, 37.0, 'inOutCubic');
  const burst = ew(t, 30.9, 32.7, 'outCubic');
  const sx = W * 0.5, sy = H * 0.42;
  // sky behind the hands: dusk-dark until the light arrives
  vgrad(ctx, S, mix(P.char, P.sand, burst * 0.7), mix(P.char, P.paperDark, burst));
  // the sun and its rays
  ctx.save();
  ctx.globalAlpha = vis;
  for (let r = 5; r >= 0; r--) {
    ctx.fillStyle = mix(P.paperLight, P.redHot, r / 7);
    ctx.globalAlpha = vis * (r ? 0.18 + 0.12 * burst : 1);
    ctx.beginPath();
    ctx.arc(sx, sy, (60 + r * 70) * (0.8 + 0.5 * burst), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = P.paperLight;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU + t * 0.04 + noise1(i * 3.1 + t * 0.3, 2) * 0.05;
    const w = rnd(12, i, 0.008, 0.03) * (0.6 + burst);
    ctx.globalAlpha = vis * (0.25 + 0.55 * burst) * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.3));
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a - w) * 2600, sy + Math.sin(a - w) * 2600);
    ctx.lineTo(sx + Math.cos(a + w) * 2600, sy + Math.sin(a + w) * 2600);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // two hands, fingers crossed over the sun, drifting apart
  const C = { skin: P.ink, rim: mix(P.redHot, P.paperLight, burst * 0.6), crease: P.char };
  const sc = 560;
  const drift = part * 330, lift = (1 - inU) * 700 + outU * 900;
  const breathe = Math.sin(t * 0.8) * 8;
  hand(ctx, W * 0.33 - drift, H * 1.3 + lift + breathe, sc, 0.62 + part * 0.16, 1, t, part, C);
  hand(ctx, W * 0.67 + drift, H * 1.32 + lift - breathe, sc, -0.62 - part * 0.16, -1, t + 2, part, C);
  // light spilling over the edges of the fingers once the sun is out
  if (burst > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.1 * burst * vis;
    ctx.fillStyle = P.redHot;
    ctx.beginPath();
    ctx.arc(sx, sy, 380 + 60 * S.low, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // motes drifting down through the gap
  ctx.fillStyle = P.paperLight;
  for (let k = 0; k < 70; k++) {
    const life = fract(t * rnd(4, k, 0.15, 0.4) + h2(4, k + 9));
    ctx.globalAlpha = vis * (1 - life) * burst;
    ctx.fillRect(sx + rnd(4, k + 3, -1, 1) * (80 + life * 700), sy + life * H * 0.7, 3, 3 + S.speed * 0.008);
  }
  ctx.globalAlpha = 1;
}

export const horizonY = (t, H) => lerp(H * 0.72, H * 0.56, ew(t, 38.1, 49.5, 'inOutCubic'));
function horizon(ctx, S) {
  const { t, W, H } = S;
  const vis = env(t, 38.1, 50.0, 0.6, 0.06);
  if (vis <= 0) return;
  const hy = horizonY(t, H);
  ctx.save();
  ctx.globalAlpha = vis;
  // ground/sea strata below horizon, rushing lines
  ctx.fillStyle = mix(P.paper, P.paperDark, 0.7);
  ctx.fillRect(-40, hy, W + 80, H - hy + 40);
  ctx.fillStyle = P.sand;
  for (let k = 0; k < 14; k++) {
    const u = fract(k / 14 + t * 0.35);
    const y = hy + Math.pow(u, 2.2) * (H - hy + 40);
    ctx.globalAlpha = vis * u;
    ctx.fillRect(-40, y, W + 80, 1 + u * 5);
  }
  ctx.globalAlpha = vis;
  ctx.fillStyle = P.ink;
  ctx.fillRect(-40, hy - 2.5, W + 80, 5);
  // the winged eye rising at the horizon
  const open = ew(t, 39.9, 41.4, 'outCubic') * (1 - ew(t, 49.3, 49.9, 'inCubic')) * (1 - 0.9 * env(t, 46.6, 47.0, 0.12, 0.2));
  const wing = ew(t, 40.3, 42.3, 'outCubic');
  const rise = ew(t, 39.4, 41.5, 'outCubic');
  const ex = W / 2, ey = hy - 10 - rise * 110;
  const ew_ = 560 + 60 * ew(t, 41, 49.5);
  // horizon halo behind eye: ink rings
  if (rise > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, -40, W + 80, hy - 2.5 + 40);
    ctx.clip();
    ctx.strokeStyle = rgba(P.ink, 0.28);
    for (let r = 0; r < 6; r++) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey, 200 + r * 55 + fract(t * 0.4) * 55, Math.PI, TAU);
      ctx.stroke();
    }
    M.wingedEye(ctx, ex, ey, ew_, { open, wing, color: P.ink, iris: P.red, lw: 9, t, look: Math.sin(t * 0.7) * 0.5, paper: P.paperLight, glint: 1 });
    ctx.restore();
    // reflection
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, hy + 2.5, W + 80, H);
    ctx.clip();
    ctx.globalAlpha = vis * 0.22;
    ctx.translate(0, hy * 2);
    ctx.scale(1, -1);
    M.wingedEye(ctx, ex, ey, ew_, { open, wing, color: P.ink, iris: P.red, lw: 9, t, look: Math.sin(t * 0.7) * 0.5, paper: P.paperLight, glint: 0 });
    ctx.restore();
    // shine (輝く ~43.6)
    const sh = env(t, 43.5, 45.4, 0.08, 1.2);
    if (sh > 0) {
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.42;
        const r = 330 + ew(t, 43.5, 44.6) * 160 + k * 7;
        M.sparkle(ctx, ex + Math.cos(a) * r, ey + Math.sin(a) * r * 0.7, (18 + k * 3) * sh, P.red, 0);
      }
    }
  }
  ctx.restore();
}

function dropScene(ctx, S) {
  const { t, W, H } = S;
  if (within(t, 50.0, 52.4)) {
    fill(ctx, S, P.paper);
    const f = Math.floor(t * 12);
    M.focusLines(ctx, W, H, W / 2, H / 2, { count: 150, inner: 330, innerVar: 260, color: P.ink, frame: f, alpha: env(t, 50.0, 52.4, 0.03, 0.3) });
  }
  if (within(t, 52.3, 56.9)) {
    fill(ctx, S, P.paper);
    halftoneBands(ctx, S, { alpha: 0.25, cell: 14, color: P.char, gap: 900 });
    speed(ctx, S, P.ink, 120, { alpha: 0.7, red: P.red, redEvery: 7 });
    // geometric forms, reacting to the four words (drawn by lyric layer)
    const shapes = ['square', 'circle', 'triangle'];
    ctx.save();
    ctx.lineWidth = 9;
    shapes.forEach((sh, i) => {
      const k = t - 52.4;
      const cx = W * (0.25 + i * 0.25) + Math.sin(k * 0.8 + i) * 40 + ew(t, 53.4, 54.2, 'inOutCubic') * (i - 1) * 160;
      const sink = ew(t, 55.4, 56.9, 'inCubic') * H * 0.9;
      const cy = H * 0.5 + Math.cos(k * 0.7 + i * 2) * 30 + sink;
      const r = 250 + 30 * S.bp;
      const rot = k * 0.3 * (i % 2 ? -1 : 1);
      const shed = ew(t, 54.4, 55.4, 'outCubic');
      for (let c = 0; c < 1 + (shed > 0 ? 3 : 0); c++) {
        ctx.save();
        const d = c * shed * 50;
        ctx.translate(cx + d, cy - d * 0.6);
        ctx.rotate(rot + c * shed * 0.25);
        ctx.strokeStyle = c === 0 ? P.ink : rgba(P.red, 1 - c * 0.28);
        ctx.beginPath();
        if (sh === 'square') ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
        else if (sh === 'circle') ctx.arc(0, 0, r, 0, TAU);
        else { ctx.moveTo(0, -r); ctx.lineTo(r * 0.95, r * 0.7); ctx.lineTo(-r * 0.95, r * 0.7); ctx.closePath(); }
        ctx.stroke();
        ctx.restore();
      }
    });
    ctx.restore();
  }
  if (within(t, 56.9, 59.7)) {
    const k = clamp(Math.floor((t - 57.18) / 0.575), -1, 3);
    const bgs = [P.ink, P.red, P.paper, P.ink];
    fill(ctx, S, k < 0 ? P.paper : bgs[k]);
    speed(ctx, S, k === 2 || k < 0 ? P.ink : P.paper, 90, { alpha: 0.6 });
  }
  if (within(t, 59.7, 61.4)) {
    fill(ctx, S, P.paper);
    mistField(ctx, S, { alpha: 0.9 });
    speed(ctx, S, P.ink, 100, { alpha: 0.7 });
  }
}

// cage size shrinks as we fall away from it
export function cageState(t, H) {
  const z = 1 + Math.pow(Math.max(0, t - 62.6), 1.55) * 0.95;
  const r = 1450 / z;
  const baseY = t < 64.6 ? lerp(H * 1.35, H * 0.5, ew(t, 61.28, 64.6, 'inOutCubic')) : lerp(H * 0.5, H * 0.26, ew(t, 64.6, 71, 'outCubic'));
  return { r, baseY, cy: baseY - 0.855 * r };
}
function cageScene(ctx, S) {
  const { t, W, H } = S;
  if (!within(t, 61.2, 73.9)) return;
  vgrad(ctx, S, mix(P.paperDark, P.paper, 0.2), P.paper);
  mistField(ctx, S, { alpha: 0.8 });
  const u = t - 61.28;
  const { r, baseY, cy } = cageState(t, H);
  const bottom = 1 - ew(t, 64.4, 65.4, 'outCubic');
  speed(ctx, S, P.ink, Math.floor(40 + 60 * S.E), { alpha: 0.5 });
  M.cage(ctx, W / 2, cy, r, { color: P.ink, bars: 15, lw: Math.max(1.6, r * 0.011), spin: u * 0.12, bottom, alpha: 1 });
  // broken bottom ring shards
  if (t > 64.4 && t < 67) {
    const k = ew(t, 64.4, 67, 'outCubic');
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = Math.max(2, r * 0.02);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      const px = W / 2 + Math.cos(a) * r * (1 + k * 1.8), py = baseY + Math.sin(a) * r * 0.18 + k * rnd(9, i, -300, 500);
      ctx.arc(px, py, r * 0.25, a, a + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ placeholders (later sections)
function placeholder(ctx, S) {
  const { t } = S;
  let bg = P.paper, fg = P.ink;
  if (within(t, 73.7, 98.3) || within(t, 158.5, 182.2) || within(t, 218.2, 242.3)) { bg = P.red; fg = P.ink; }
  else if (within(t, 98.3, 125) || within(t, 193.6, 218.2)) { bg = P.ink; fg = P.paper; }
  fill(ctx, S, bg);
  speed(ctx, S, fg, Math.floor(30 + 100 * S.E), { alpha: 0.7 });
}

// ------------------------------------------------------------------ dispatcher
const BLOCKS = [
  [0, 24.9, intro],
  [24.8, 73.9, v1Sky],
  [27.5, 38.4, fingers],
  [38.0, 50.0, horizon],
  [50.0, 61.4, dropScene],
  [61.2, 73.9, cageScene],
  ...BLOCKS2,
  ...BLOCKS3,
];

export function drawWorld(ctx, S) {
  const { t } = S;
  ctx.save();
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, S.W, S.H);
  S.applyCam(ctx);
  for (const [a, b, fn] of BLOCKS) if (t >= a && t < b) fn(ctx, S);
  ctx.restore();
}

// ------------------------------------------------------------------ the frame
// Verse 1 lives inside a printed border — a limit. The first chorus breaks it.
export function drawOverlay(ctx, S) {
  const { t, W, H } = S;
  const BREAK = 73.78;
  if (t < 6.0 || t > BREAK + 1.2) return;
  const m = 46 * ew(t, 6.0, 7.4, 'outCubic');
  const rule = ew(t, 6.6, 8.2, 'inOutCubic');
  const k = ease.outCubic(clamp((t - BREAK) / 0.9));
  const jolt = t > 49.95 && t < 50.4 ? (h2(Math.floor(t * 60), 3) - 0.5) * 14 : 0;
  const pieces = [
    // x, y, w, h, flyX, flyY, rot
    [0, 0, W, m, 0, -1, -0.25],
    [0, H - m, W, m, 0, 1, 0.3],
    [0, m, m, H - 2 * m, -1, 0, 0.35],
    [W - m, m, m, H - 2 * m, 1, 0, -0.3],
  ];
  ctx.save();
  pieces.forEach(([x, y, w, h, fx, fy, rot], i) => {
    ctx.save();
    const cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx + fx * k * 500 + jolt, cy + fy * k * 380 + jolt * 0.5);
    ctx.rotate(rot * k);
    ctx.globalAlpha = 1 - clamp((t - BREAK - 0.5) / 0.7);
    ctx.fillStyle = P.paper;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // inner ink rule, drawn progressively
    ctx.fillStyle = P.ink;
    const L = (i < 2 ? w - 2 * m + 6 : h) * rule;
    if (i === 0) ctx.fillRect(-w / 2 + m - 3, h / 2 - 3, L, 3);
    if (i === 1) ctx.fillRect(w / 2 - m + 3 - L, -h / 2, L, 3);
    if (i === 2) ctx.fillRect(w / 2 - 3, h / 2 - L, 3, L);
    if (i === 3) ctx.fillRect(-w / 2, -h / 2, 3, L);
    ctx.restore();
  });
  // crop marks at the corners
  if (k < 1) {
    ctx.globalAlpha = rule * (1 - k);
    ctx.fillStyle = P.ink;
    const c = 16;
    for (const [x, y] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) {
      const sx = x < W / 2 ? -1 : 1, sy = y < H / 2 ? -1 : 1;
      ctx.fillRect(x + sx * 10 - (sx < 0 ? c : 0), y - 0.75, c, 1.5);
      ctx.fillRect(x - 0.75, y + sy * 10 - (sy < 0 ? c : 0), 1.5, c);
    }
    ctx.fillStyle = P.red;
    ctx.fillRect(m - 30, m - 30, 10, 10);
  }
  ctx.restore();
}
