// Shared background layers used by several scenes.
import { clamp, lerp, rnd, h2 } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';

export function fill(ctx, S, color) {
  ctx.fillStyle = color;
  ctx.fillRect(-60, -60, S.W + 120, S.H + 120);
}
export function vgrad(ctx, S, top, bottom, y0 = 0, y1 = S.H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(-60, -60, S.W + 120, S.H + 120);
}

// Horizontal mist bands in world space, rising as we fall.
export function mistField(ctx, S, o = {}) {
  const { W, H } = S;
  const D = o.D ?? S.D;
  const { layers = [[0.35, 260, P.paperDark], [0.7, 380, P.paperLight], [1.25, 520, P.sand]], alpha = 1, seed = 21, stepped = true, line = null } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  layers.forEach(([par, gap, color], li) => {
    const off = D * par;
    const k0 = Math.floor((off - 200) / gap), k1 = Math.ceil((off + H + 200) / gap);
    for (let k = k0; k <= k1; k++) {
      const sd = seed + li * 1000;
      const y = k * gap - off + rnd(sd, k * 7, -0.3, 0.3) * gap;
      const w = W * rnd(sd, k * 7 + 1, 0.25, 0.75);
      const x = rnd(sd, k * 7 + 2, -0.2, 1.0) * W - w * 0.2;
      const h = rnd(sd, k * 7 + 3, 14, 44) * (0.6 + par * 0.6);
      M.mistBand(ctx, x, y, w, h, color, { line, lw: 2 });
      if (stepped && h2(sd, k * 7 + 4) > 0.45) {
        const w2 = w * rnd(sd, k * 7 + 5, 0.35, 0.7);
        M.mistBand(ctx, x + w * rnd(sd, k * 7 + 6, 0.1, 0.5), y + h * 0.95, w2, h * 0.85, color, { line, lw: 2 });
      }
    }
  });
  ctx.restore();
}

// Soft halftone bands passing upward
export function halftoneBands(ctx, S, o = {}) {
  const { W, H, D } = S;
  const { par = 1.15, gap = 1400, color = P.ink, cell = 16, alpha = 1, seed = 33, amp = 1 } = o;
  const off = D * par;
  const k0 = Math.floor((off - 600) / gap), k1 = Math.ceil((off + H + 600) / gap);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let k = k0; k <= k1; k++) {
    const cy = k * gap - off + rnd(seed, k, -0.2, 0.2) * gap;
    const hh = rnd(seed, k + 99, 120, 260);
    if (cy + hh * 2 < 0 || cy - hh * 2 > H) continue;
    const cx = rnd(seed, k + 7, 0.1, 0.9) * W;
    M.halftone(ctx, 0, Math.max(0, cy - hh * 2), W, Math.min(H, hh * 4), cell, color, (x, y) => {
      const dy = (y - cy) / hh, dx = (x - cx) / (W * 0.45);
      return amp * Math.exp(-dy * dy * 1.6 - dx * dx * 1.2) * 0.9;
    });
  }
  ctx.restore();
}

export function speed(ctx, S, color, count, o = {}) {
  M.speedLines(ctx, S.W, S.H, { D: S.D, speed: S.speed, count, color, seed: o.seed || 1, alpha: o.alpha ?? 0.8, maxW: o.maxW || 3, red: o.red, redEvery: o.redEvery || 0 });
}

// Clouds rising past in world space (flat, outlined, ukiyo-e flavoured)
export function cloudField(ctx, S, o = {}) {
  const { W, H } = S;
  const { par = 1.4, gap = 420, fillC = P.paperLight, line = P.ink, lw = 5, alpha = 1, seed = 71, scale = 1, shade = null } = o;
  const off = S.D * par;
  const k0 = Math.floor((off - 400) / gap), k1 = Math.ceil((off + H + 400) / gap);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let k = k0; k <= k1; k++) {
    const y = k * gap - off + rnd(seed, k, -0.3, 0.3) * gap + 200;
    const x = rnd(seed, k + 5, -0.05, 1.05) * W;
    const s = rnd(seed, k + 9, 90, 200) * scale;
    M.cloud(ctx, x, y, s, fillC, seed * 13 + k, { outline: line, lw, shade });
  }
  ctx.restore();
}

// Flames rising past
export function flameField(ctx, S, o = {}) {
  const { W, H, t } = S;
  const { par = 1.9, gap = 300, colors = [P.redHot, P.ink], alpha = 1, seed = 91, scale = 1 } = o;
  const off = S.D * par;
  const k0 = Math.floor((off - 400) / gap), k1 = Math.ceil((off + H + 500) / gap);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let k = k0; k <= k1; k++) {
    const y = k * gap - off + rnd(seed, k, -0.3, 0.3) * gap + 300;
    const x = rnd(seed, k + 5, -0.05, 1.05) * W;
    const s = rnd(seed, k + 9, 120, 260) * scale;
    M.flame(ctx, x, y, s, t, colors[0], seed + k, { tongues: 3 });
    M.flame(ctx, x, y + s * 0.02, s * 0.62, t + 3, colors[1], seed + k + 50, { tongues: 2 });
  }
  ctx.restore();
}
