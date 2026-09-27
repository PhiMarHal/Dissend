// Reusable drawn motifs. All deterministic: (params, t) -> pixels.
import { TAU, clamp, lerp, mod, h2, h3, rnd, noise1, ease, rgba, fract } from './util.js';

// ------------------------------------------------------------------ speed
// Vertical streaks rushing upward past the camera (we are falling).
export function speedLines(ctx, W, H, o) {
  const { D, speed, count = 60, color, alpha = 1, seed = 1, minW = 1, maxW = 3, red = null, redEvery = 0, xMin = 0, xMax = W } = o;
  const span = H * 2.2;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const par = rnd(seed, i * 5 + 1, 0.35, 1.6);
    const len = clamp(speed * par * rnd(seed, i * 5 + 2, 0.05, 0.16), 6, H * 1.6);
    const x = lerp(xMin, xMax, h2(seed, i * 5 + 3));
    const y = mod(h2(seed, i * 5 + 4) * span - D * par, span) - len - H * 0.3;
    const w = lerp(minW, maxW, h2(seed, i * 5 + 5) ** 2);
    const useRed = red && redEvery && i % redEvery === 0;
    ctx.globalAlpha = alpha * clamp(par * 0.9);
    ctx.fillStyle = useRed ? red : color;
    ctx.fillRect(x - w / 2, y, w, len);
  }
  ctx.restore();
}

// Manga concentration lines (集中線) converging on (cx, cy).
export function focusLines(ctx, W, H, cx, cy, o) {
  const { count = 140, inner = 300, innerVar = 200, color, alpha = 1, seed = 3, width = 0.012, frame = 0 } = o;
  const R = Math.hypot(W, H);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const s = seed + frame * 7919;
    const a = (i / count) * TAU + rnd(s, i * 3, -0.5, 0.5) * (TAU / count);
    const r0 = inner + rnd(s, i * 3 + 1, 0, 1) ** 2 * innerVar;
    const hw = width * rnd(s, i * 3 + 2, 0.3, 1.4);
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - hw) * R, cy + Math.sin(a - hw) * R);
    ctx.lineTo(cx + Math.cos(a + hw) * R, cy + Math.sin(a + hw) * R);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

// Halftone dot field; fn(x, y) -> 0..1 dot size.
export function halftone(ctx, x0, y0, w, h, cell, color, fn, angle = Math.PI / 4) {
  ctx.save();
  ctx.fillStyle = color;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const R = Math.hypot(w, h) / 2 + cell;
  for (let v = -R; v <= R; v += cell) {
    for (let u = -R; u <= R; u += cell) {
      const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
      if (x < x0 - cell || x > x0 + w + cell || y < y0 - cell || y > y0 + h + cell) continue;
      const s = fn(x, y);
      if (s <= 0.02) continue;
      const r = (cell * 0.72) * Math.sqrt(Math.min(1.25, s));
      // one small path per dot: a single path with thousands of sub-paths is
      // pathologically slow to rasterise in Skia
      if (r < 1.2) { ctx.fillRect(x - r, y - r, r * 2, r * 2); continue; }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Ukiyo-e mist band (suyari-gasumi): a long stadium, optionally stepped.
export function mistBand(ctx, x, y, w, h, color, o = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  if (o.line) {
    ctx.strokeStyle = o.line;
    ctx.lineWidth = o.lw || 2;
    ctx.stroke();
  }
  ctx.restore();
}

// Flat stylised cumulus with a scalloped top and flat base.
export function cloud(ctx, x, y, s, fill, seed, o = {}) {
  const n = 5 + Math.floor(h2(seed, 1) * 4);
  const bumps = [];
  let span = 0;
  for (let i = 0; i < n; i++) {
    const r = s * rnd(seed, i + 10, 0.35, 0.8) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.9);
    bumps.push(r);
    span += r * 1.35;
  }
  const draw = (grow, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    let cx = x - span / 2;
    for (let i = 0; i < n; i++) {
      const r = bumps[i];
      cx += r * 0.675;
      ctx.moveTo(cx + r + grow, y);
      ctx.arc(cx, y - r * 0.2, r + grow, 0, TAU);
      cx += r * 0.675;
    }
    ctx.rect(x - span / 2 - grow, y - s * 0.12 - grow, span + grow * 2, s * 0.32 + grow * 2);
    ctx.fill();
  };
  ctx.save();
  if (o.outline) draw(o.lw || 5, o.outline);
  draw(0, fill);
  if (o.shade) {
    // a lower shadow band clipped to the cloud
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = o.shade;
    ctx.fillRect(x - span, y + s * 0.02, span * 2, s);
  }
  ctx.restore();
  return span;
}

// Flat flame tongues. u = 0..1 phase, s = height.
export function flame(ctx, x, y, s, t, color, seed, o = {}) {
  const tongues = o.tongues || 3;
  ctx.save();
  ctx.fillStyle = color;
  for (let k = 0; k < tongues; k++) {
    const off = (k - (tongues - 1) / 2) * s * 0.28;
    const hk = s * (1 - Math.abs(k - (tongues - 1) / 2) * 0.28) * (0.85 + 0.15 * noise1(t * 3 + k * 5, seed));
    const wk = s * 0.22;
    const sway = noise1(t * 2.4 + k * 3.1, seed + 7) * s * 0.18;
    const bx = x + off, by = y;
    ctx.beginPath();
    ctx.moveTo(bx - wk, by);
    ctx.bezierCurveTo(bx - wk * 1.1, by - hk * 0.45, bx - wk * 0.2 + sway * 0.4, by - hk * 0.65, bx + sway, by - hk);
    ctx.bezierCurveTo(bx + wk * 0.5 + sway * 0.4, by - hk * 0.6, bx + wk * 1.15, by - hk * 0.4, bx + wk, by);
    ctx.quadraticCurveTo(bx, by + wk * 0.5, bx - wk, by);
    ctx.fill();
  }
  ctx.restore();
}

// Four-point sparkle
export function sparkle(ctx, x, y, r, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  const k = r * 0.16;
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(k, -k, r, 0);
  ctx.quadraticCurveTo(k, k, 0, r);
  ctx.quadraticCurveTo(-k, k, -r, 0);
  ctx.quadraticCurveTo(-k, -k, 0, -r);
  ctx.fill();
  ctx.restore();
}

// Star field rising past the camera
export function stars(ctx, W, H, o) {
  const { D, speed = 0, count = 200, color, seed = 11, alpha = 1, stretch = 0.03 } = o;
  const span = H * 1.3;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const par = rnd(seed, i * 4, 0.15, 1.3);
    const x = h2(seed, i * 4 + 1) * W;
    const y = mod(h2(seed, i * 4 + 2) * span - D * par, span) - H * 0.15;
    const r = rnd(seed, i * 4 + 3, 0.6, 2.6) * (0.5 + par * 0.6);
    const tw = 0.55 + 0.45 * Math.sin(i * 12.9 + (o.t || 0) * (2 + (i % 5)));
    ctx.globalAlpha = alpha * tw;
    const len = Math.max(r * 2, speed * par * stretch);
    ctx.fillRect(x - r / 2, y, r, len);
    if (i % 23 === 0) sparkle(ctx, x, y, r * 5, color, 0);
  }
  ctx.restore();
}

// Light beams fanning down from (ox, oy)
export function rays(ctx, ox, oy, o) {
  const { count = 7, len = 1600, spread = 1.1, color, alpha = 0.5, t = 0, seed = 5, center = Math.PI / 2, widthK = 1 } = o;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = center + (i / (count - 1) - 0.5) * spread + noise1(t * 0.3 + i * 4, seed) * 0.05;
    const w = rnd(seed, i, 0.015, 0.05) * widthK;
    ctx.globalAlpha = alpha * (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1)));
    ctx.beginPath();
    ctx.moveTo(ox + Math.cos(a) * 8, oy + Math.sin(a) * 8);
    ctx.lineTo(ox + Math.cos(a - w) * len, oy + Math.sin(a - w) * len);
    ctx.lineTo(ox + Math.cos(a + w) * len, oy + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function ripple(ctx, cx, cy, t, o) {
  const { count = 6, maxR = 900, color, lw = 3, period = 0.9, alpha = 1 } = o;
  ctx.save();
  ctx.strokeStyle = color;
  for (let k = 0; k < count; k++) {
    const u = fract(t / period + k / count);
    ctx.globalAlpha = alpha * (1 - u) ** 1.5;
    ctx.lineWidth = lw * (1 - u * 0.6);
    ctx.beginPath();
    ctx.arc(cx, cy, 10 + u * maxR, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ figure
// Otl-Aicher-style pictogram diver. Angles relative to the torso axis.
export const POSES = {
  stand: { lA: 0.18, lE: 0.1, rA: -0.18, rE: -0.1, lL: 0.1, lK: 0, rL: -0.1, rK: 0 },
  crouch: { lA: 0.9, lE: 1.3, rA: -0.9, rE: -1.3, lL: 0.7, lK: -1.5, rL: -0.7, rK: 1.5 },
  leap: { lA: 2.75, lE: 0.15, rA: -2.75, rE: -0.15, lL: 0.35, lK: -0.9, rL: -0.2, rK: 0.25 },
  spread: { lA: 2.1, lE: -0.35, rA: -2.1, rE: 0.35, lL: 0.55, lK: -0.45, rL: -0.55, rK: 0.45 },
  wing: { lA: 1.62, lE: -0.08, rA: -1.62, rE: 0.08, lL: 0.2, lK: -0.1, rL: -0.2, rK: 0.1 },
  dive: { lA: 2.95, lE: 0.05, rA: -2.95, rE: -0.05, lL: 0.06, lK: 0, rL: -0.06, rK: 0 },
  tuck: { lA: 0.7, lE: 2.2, rA: -0.7, rE: -2.2, lL: 1.2, lK: -2.3, rL: -1.2, rK: 2.3 },
  soar: { lA: 1.9, lE: -0.5, rA: -1.9, rE: 0.5, lL: 0.12, lK: 0, rL: -0.12, rK: 0 },
};
export function mixPose(a, b, u) {
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k], u);
  return o;
}
export function diver(ctx, x, y, s, pose, rot, color, o = {}) {
  const lw = s * (o.weight || 0.24);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  // torso from hip (0, 0.5s) up to neck (0, -0.5s)
  const hip = [0, 0.48 * s], neck = [0, -0.46 * s];
  const limb = (base, a0, a1, l0, l1, down) => {
    // angle 0 = pointing along -torso (down) for arms, i.e. hanging
    const d0 = down ? Math.PI / 2 : Math.PI / 2; // screen-down
    const A = d0 - a0;
    const j = [base[0] + Math.cos(A) * l0 * s, base[1] + Math.sin(A) * l0 * s];
    const B = A - a1;
    const e = [j[0] + Math.cos(B) * l1 * s, j[1] + Math.sin(B) * l1 * s];
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.lineTo(j[0], j[1]);
    ctx.lineTo(e[0], e[1]);
    ctx.stroke();
    return e;
  };
  ctx.beginPath();
  ctx.moveTo(hip[0], hip[1]);
  ctx.lineTo(neck[0], neck[1]);
  ctx.stroke();
  const sh = [0, -0.36 * s];
  const hands = [limb(sh, pose.lA, pose.lE, 0.56, 0.52), limb(sh, pose.rA, pose.rE, 0.56, 0.52)];
  limb(hip, pose.lL, pose.lK, 0.66, 0.64, true);
  limb(hip, pose.rL, pose.rK, 0.66, 0.64, true);
  ctx.beginPath();
  ctx.arc(0, -0.86 * s, 0.2 * s, 0, TAU);
  ctx.fill();
  if (o.wings) {
    // arm-wings: a membrane from shoulder to hand with a scalloped trailing edge
    const W = o.wings;
    for (const hnd of hands) {
      const dx = hnd[0] - sh[0], dy = hnd[1] - sh[1];
      const len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len, ny = dx / len;
      if (ny < 0) { nx = -nx; ny = -ny; } // trailing edge hangs below the arm
      ctx.beginPath();
      ctx.moveTo(sh[0], sh[1]);
      ctx.lineTo(hnd[0], hnd[1]);
      const n = 6;
      for (let f = n; f >= 0; f--) {
        const u = f / n;
        const bx = sh[0] + dx * u, by = sh[1] + dy * u;
        const L = s * W * (0.35 + 0.55 * Math.sin(Math.PI * (0.25 + u * 0.7)));
        const tx = bx + nx * L - (dx / len) * s * 0.12, ty = by + ny * L - (dy / len) * s * 0.12;
        ctx.quadraticCurveTo(bx + nx * L * 0.3, by + ny * L * 0.3, tx, ty);
      }
      ctx.lineTo(0, 0.1 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ cage
// Birdcage centred at (cx, cy) with half-width r; open = 0..1 bottom broken.
export function cage(ctx, cx, cy, r, o) {
  const { color, bars = 13, lw = 4, t = 0, spin = 0, bottom = 1, alpha = 1 } = o;
  const h = r * 1.9;
  const top = cy - h * 0.55, base = cy + h * 0.45;
  const ell = r * 0.18;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  // bars: from base ellipse up, curving into dome
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * TAU + spin;
    const sx = Math.cos(a);
    const front = Math.sin(a) > 0;
    ctx.globalAlpha = alpha * (front ? 1 : 0.35);
    const bx = cx + sx * r, by = base + Math.sin(a) * ell;
    const sy = top + h * 0.28 + Math.sin(a) * ell * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, sy);
    ctx.bezierCurveTo(bx, sy - h * 0.25, cx + sx * r * 0.2, top + h * 0.02, cx, top);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  // rings
  for (const [yy, rr, w] of [[base, 1, 1.8], [base - h * 0.2, 1, 0.8], [top + h * 0.28, 1, 1.2]]) {
    if (yy === base && bottom < 1) {
      ctx.lineWidth = lw * w;
      ctx.beginPath();
      ctx.ellipse(cx, yy, r * rr, ell, 0, 0.2 + (1 - bottom) * 3, Math.PI * 2 - 0.2 - (1 - bottom) * 3);
      ctx.stroke();
      continue;
    }
    ctx.lineWidth = lw * w;
    ctx.beginPath();
    ctx.ellipse(cx, yy, r * rr, ell, 0, 0, TAU);
    ctx.stroke();
  }
  // hook
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.arc(cx, top - r * 0.16, r * 0.12, Math.PI * 0.5, Math.PI * 2.3);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ eye
// Almond eye with feathered "wings". open 0..1, wing 0..1.
export function wingedEye(ctx, cx, cy, w, o) {
  const { open = 1, wing = 1, color, iris, lw = 8, t = 0, look = 0, glint = 1, paper } = o;
  const hh = w * 0.3 * open;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // wings: sweeping feather strokes from each outer corner
  if (wing > 0) {
    ctx.strokeStyle = color;
    for (const side of [-1, 1]) {
      const ox = cx + side * w * 0.5, oy = cy;
      for (let f = 0; f < 9; f++) {
        const u = f / 8;
        const a = -Math.PI / 2 + side * lerp(0.35, 1.45, u) + Math.sin(t * 2 + f) * 0.02;
        const L = w * lerp(0.95, 0.42, u) * ease.outCubic(clamp(wing * 1.3 - u * 0.3));
        if (L <= 1) continue;
        ctx.lineWidth = lw * lerp(1.1, 0.6, u);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        const ex = ox + Math.cos(a) * L, ey = oy + Math.sin(a) * L;
        ctx.quadraticCurveTo(ox + side * L * 0.55, oy - L * 0.05, ex, ey);
        ctx.stroke();
      }
    }
  }
  // almond
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.quadraticCurveTo(cx, cy - hh * 2, cx + w / 2, cy);
  ctx.quadraticCurveTo(cx, cy + hh * 2, cx - w / 2, cy);
  ctx.closePath();
  if (paper) { ctx.fillStyle = paper; ctx.fill(); }
  ctx.save();
  ctx.clip();
  if (open > 0.02) {
    const ir = w * 0.2;
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(cx + look * w * 0.15, cy, ir, 0, TAU);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + look * w * 0.15, cy, ir * 0.42, 0, TAU);
    ctx.fill();
    if (glint > 0) {
      ctx.fillStyle = paper || '#fff';
      ctx.beginPath();
      ctx.arc(cx + look * w * 0.15 - ir * 0.35, cy - ir * 0.35, ir * 0.16 * glint, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
  // upper lid crease
  ctx.lineWidth = lw * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, cy - hh * 0.55);
  ctx.quadraticCurveTo(cx, cy - hh * 2.6 - w * 0.03, cx + w * 0.42, cy - hh * 0.55);
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ barrier
// Horizontal ruled line with ticks that shatters at tHit.
export function barrier(ctx, W, t, tHit, o) {
  const { color, y = 540, thick = 10, seed = 1, approach = 0.5, pieces = 9, tick = 34, H = 1080, style = 'rule' } = o;
  const dt = t - tHit;
  if (dt < -approach || dt > 1.4) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (dt < 0) {
    const u = ease.inQuad(1 + dt / approach);
    const yy = lerp(H + 60, y, u);
    drawRule(ctx, 0, W, yy, thick, tick, style);
  } else {
    // fragments fly outward and up (we keep falling)
    const k = ease.outCubic(clamp(dt / 1.2));
    for (let p = 0; p < pieces; p++) {
      const x0 = (p / pieces) * W, x1 = ((p + 1) / pieces) * W;
      const mx = (x0 + x1) / 2;
      const dir = (mx - W / 2) / (W / 2);
      const vx = dir * rnd(seed, p, 300, 900) + rnd(seed, p + 50, -120, 120);
      const vy = -rnd(seed, p + 100, 500, 1400);
      const rot = rnd(seed, p + 200, -2.4, 2.4) * k;
      const px = mx + vx * k, py = y + vy * k + 300 * dt * dt;
      ctx.save();
      ctx.globalAlpha = 1 - clamp((dt - 0.5) / 0.9);
      ctx.translate(px, py);
      ctx.rotate(rot);
      drawRule(ctx, x0 - mx + 4, x1 - mx - 4, 0, thick, tick, style);
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawRule(ctx, x0, x1, y, thick, tick, style) {
  ctx.fillRect(x0, y - thick / 2, x1 - x0, thick);
  if (style === 'rule') {
    const start = Math.ceil(x0 / tick) * tick;
    for (let x = start; x < x1; x += tick) {
      const big = Math.round(x / tick) % 5 === 0;
      ctx.fillRect(x - 1.5, y - thick / 2 - (big ? 26 : 12), 3, big ? 26 : 12);
    }
  } else if (style === 'bars') {
    for (let x = Math.ceil(x0 / tick) * tick; x < x1; x += tick) ctx.fillRect(x - 3, y - 160, 6, 320);
  }
}

// ------------------------------------------------------------------ birds
// A swift-like bird seen from above, heading +x. flap in [-1, 1] beats the
// wings (foreshortening their span). style: 'solid' | 'outline' | 'steel' | 'stone'
export function bird(ctx, x, y, s, flap, rot, o) {
  const { color, style = 'solid', lw = 3, accent = null, seed = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const span = s * (0.3 + 0.42 * (0.5 + 0.5 * flap));
  const sweep = s * (0.22 + 0.1 * (0.5 - 0.5 * flap));
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(s * 0.36, 0); // beak
    ctx.quadraticCurveTo(s * 0.3, -s * 0.07, s * 0.12, -s * 0.06);
    // upper wing
    ctx.quadraticCurveTo(s * 0.1, -span * 0.75, -sweep, -span);
    ctx.quadraticCurveTo(-s * 0.02, -span * 0.4, -s * 0.12, -s * 0.05);
    // forked tail
    ctx.lineTo(-s * 0.3, -s * 0.04);
    ctx.lineTo(-s * 0.5, -s * 0.13);
    ctx.lineTo(-s * 0.38, 0);
    ctx.lineTo(-s * 0.5, s * 0.13);
    ctx.lineTo(-s * 0.3, s * 0.04);
    ctx.lineTo(-s * 0.12, s * 0.05);
    // lower wing
    ctx.quadraticCurveTo(-s * 0.02, span * 0.4, -sweep, span);
    ctx.quadraticCurveTo(s * 0.1, span * 0.75, s * 0.12, s * 0.06);
    ctx.quadraticCurveTo(s * 0.3, s * 0.07, s * 0.36, 0);
    ctx.closePath();
  };
  path();
  if (style === 'outline') {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    if (style === 'steel' && accent) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.2, s * 0.025);
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.08);
      ctx.quadraticCurveTo(s * 0.06, -span * 0.7, -sweep * 0.85, -span * 0.9);
      ctx.moveTo(s * 0.3, -s * 0.02);
      ctx.lineTo(-s * 0.28, -s * 0.02);
      ctx.stroke();
    } else if (style === 'stone' && accent) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = accent;
      for (let k = 0; k < 18; k++) {
        const px = rnd(seed, k, -0.45, 0.35) * s, py = rnd(seed, k + 40, -0.6, 0.6) * s;
        const r = s * rnd(seed, k + 80, 0.015, 0.04);
        ctx.fillRect(px, py, r, r);
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

// Soaring eagle silhouette, wings spread, primaries fingered. flap -1..1
export function eagle(ctx, x, y, s, flap, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  const lift = flap * 0.22;
  for (const side of [-1, 1]) {
    const tipX = side * s * 1.02, tipY = -s * (0.12 + lift * 1.8);
    ctx.beginPath();
    ctx.moveTo(side * s * 0.05, -s * 0.12);
    ctx.bezierCurveTo(side * s * 0.3, -s * (0.26 + lift), side * s * 0.62, -s * (0.26 + lift * 1.5), tipX, tipY);
    ctx.lineTo(side * s * 0.98, tipY + s * 0.2);
    ctx.bezierCurveTo(side * s * 0.62, -s * (0.0 + lift), side * s * 0.34, s * 0.12, side * s * 0.05, s * 0.12);
    ctx.closePath();
    ctx.fill();
    // five primaries splayed at the tip
    for (let f = 0; f < 5; f++) {
      const bx = side * s * (0.9 - f * 0.035), by = tipY + s * (0.02 + f * 0.045);
      const a = side > 0 ? -0.35 + f * 0.17 - lift : Math.PI + 0.35 - f * 0.17 + lift;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(s * 0.13, 0, s * 0.16, s * 0.028, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // body, head with beak, fanned tail
  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, s * 0.085, s * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.28, s * 0.07, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, -s * 0.33);
  ctx.lineTo(0, -s * 0.42);
  ctx.lineTo(s * 0.03, -s * 0.33);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.07, s * 0.24);
  ctx.quadraticCurveTo(-s * 0.2, s * 0.5, -s * 0.12, s * 0.56);
  ctx.quadraticCurveTo(0, s * 0.6, s * 0.12, s * 0.56);
  ctx.quadraticCurveTo(s * 0.2, s * 0.5, s * 0.07, s * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A single feather: quill + barbs. Along +y from (x,y), length L.
export function feather(ctx, x, y, L, rot, color, o = {}) {
  const { barbs = 26, width = 0.18, lw = 2, grow = 1, seed = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = lw * 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, L * grow);
  ctx.stroke();
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i < barbs; i++) {
    const u = (i + 1) / (barbs + 1);
    if (u > grow) break;
    const yy = u * L;
    const wv = Math.sin(Math.PI * Math.pow(u, 0.7)) * L * width;
    for (const side of [-1, 1]) {
      const gap = h2(seed, i * 2 + (side > 0 ? 1 : 0)) > 0.9 ? 0.4 : 1;
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(side * wv * 0.5, yy - L * 0.02, side * wv * gap, yy - L * 0.08);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Hanko-style seal: red rounded square with characters.
export function seal(ctx, x, y, s, text, fontKey, color, paper, glyphFn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.08);
  ctx.fill();
  ctx.strokeStyle = paper;
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.roundRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84, s * 0.05);
  ctx.stroke();
  glyphFn(ctx, text, s, paper);
  ctx.restore();
}
