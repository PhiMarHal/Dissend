// The protagonist: a phoenix. Drawing + a beat-driven flight controller.
// Local frame: the head points along +y, so rot = 0 is a straight dive.
import { TAU, clamp, lerp, ease, h2, rnd, noise1, fract, rgba, mod } from './util.js';
import { P } from './palette.js';

export const ORANGE = '#EE6A2A';

// colour sets that read on each background
export function phoenixColors(bg) {
  if (bg === P.red || bg === P.redHot) return { body: P.ink, main: P.ink, hot: P.paperLight, warm: '#F29A4A', line: P.paperLight, eye: P.paperLight, trail: [P.paperLight, P.ink] };
  if (bg === P.ink) return { body: P.red, main: P.red, hot: ORANGE, warm: '#F5B35A', line: P.paperLight, eye: P.paperLight, trail: [ORANGE, P.red] };
  return { body: P.red, main: P.red, hot: ORANGE, warm: '#F5A04A', line: P.ink, eye: P.paperLight, trail: [ORANGE, P.red] };
}

function leaf(ctx, x, y, ang, len, wid, bend = 0.25) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const nx = -dy, ny = dx;
  const tx = x + dx * len, ty = y + dy * len;
  ctx.beginPath();
  ctx.moveTo(x + nx * wid * 0.35, y + ny * wid * 0.35);
  ctx.quadraticCurveTo(x + dx * len * 0.45 + nx * wid * (1 + bend), y + dy * len * 0.45 + ny * wid * (1 + bend), tx, ty);
  ctx.quadraticCurveTo(x + dx * len * 0.5 - nx * wid * (1 - bend), y + dy * len * 0.5 - ny * wid * (1 - bend), x - nx * wid * 0.35, y - ny * wid * 0.35);
  ctx.closePath();
  ctx.fill();
}

// one wing (right side); the left is drawn mirrored
function wing(ctx, s, open, beat, C, t) {
  const span = 0.5 + 0.5 * Math.cos(beat * 1.3); // foreshortening of the beat
  const sh = [0.1 * s, 0.18 * s];
  // arm angle: folded = swept back along the body, open = out and slightly forward
  const a = lerp(-1.35, 0.22, open) - (1 - span) * 0.25;
  const L = s * (0.6 + 1.0 * open) * (0.55 + 0.45 * span);
  const dir = [Math.cos(a), Math.sin(a)];
  const pt = (u) => [sh[0] + dir[0] * L * u, sh[1] + dir[1] * L * u + Math.sin(u * Math.PI) * s * 0.26 * open - u * u * s * 0.18 * open];
  const back = a - Math.PI / 2; // trailing direction (toward -y when open)
  // solid wing surface under the feathers so it reads as one shape
  ctx.fillStyle = C.main;
  ctx.beginPath();
  const [sx0, sy0] = pt(0);
  ctx.moveTo(sx0, sy0);
  for (let k = 1; k <= 10; k++) { const [x, y] = pt(k / 10); ctx.lineTo(x, y); }
  for (let k = 10; k >= 0; k--) {
    const u = k / 10;
    const [x, y] = pt(u);
    const len = s * (u > 0.7 ? lerp(0.7, 0.9, (u - 0.7) / 0.3) : lerp(0.55, 0.72, u / 0.7)) * (0.55 + 0.45 * open) * 0.8;
    const fa = back + (u > 0.7 ? lerp(0.25, 1.2, (u - 0.7) / 0.3) : 0.1);
    ctx.lineTo(x + Math.cos(fa) * len, y + Math.sin(fa) * len);
  }
  ctx.closePath();
  ctx.fill();
  // primaries: long flame feathers fanning from the wrist
  for (let i = 6; i >= 0; i--) {
    const u = 0.72 + i * 0.047;
    const [x, y] = pt(u);
    const fa = back + lerp(1.45, 0.25, i / 6) + Math.sin(t * 5 + i) * 0.04;
    const len = s * lerp(0.8, 1.3, i / 6) * (0.6 + 0.4 * open);
    ctx.fillStyle = C.main;
    leaf(ctx, x, y, fa, len, s * 0.11, 0.35);
    ctx.fillStyle = C.hot;
    leaf(ctx, x, y, fa, len * 0.72, s * 0.035, 0.35);
  }
  // secondaries
  for (let i = 0; i < 8; i++) {
    const u = 0.14 + i * 0.075;
    const [x, y] = pt(u);
    const fa = back + 0.05 * i + Math.sin(t * 4 + i * 0.7) * 0.03;
    const len = s * lerp(0.9, 0.78, i / 7) * (0.5 + 0.5 * open);
    ctx.fillStyle = C.main;
    leaf(ctx, x, y, fa, len, s * 0.13, 0.1);
    ctx.fillStyle = C.hot;
    leaf(ctx, x, y, fa, len * 0.55, s * 0.035, 0.1);
  }
  // coverts: a warmer scalloped row over the arm
  for (let i = 0; i < 9; i++) {
    const u = 0.06 + i * 0.1;
    const [x, y] = pt(u);
    ctx.fillStyle = i % 2 ? C.hot : C.warm;
    leaf(ctx, x, y, back + 0.12, s * lerp(0.42, 0.28, i / 8), s * 0.1, 0.2);
  }
  // leading edge
  ctx.strokeStyle = C.line;
  ctx.lineWidth = Math.max(1.2, s * 0.028);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k <= 12; k++) {
    const [x, y] = pt(k / 12 * 1.02);
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

function tail(ctx, s, t, C, flow, open) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const side = i - (n - 1) / 2;
    const Lt = s * (1.9 + (2 - Math.abs(side)) * 0.45) * (0.8 + 0.2 * open);
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      const wave = Math.sin(u * 4.2 - t * 7 - i * 0.9) * s * 0.16 * u + flow * u * u * s * 0.9;
      pts.push([side * s * 0.1 + side * u * s * 0.32 * (0.4 + open) + wave, -0.3 * s - u * Lt]);
    }
    const w = (u) => s * (0.075 * Math.pow(1 - u, 0.5) + 0.012);
    ctx.fillStyle = Math.abs(side) === 2 ? C.hot : C.main;
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const [x, y] = pts[k];
      const [x2, y2] = pts[Math.min(20, k + 1)];
      const [x1, y1] = pts[Math.max(0, k - 1)];
      const tx = x2 - x1, ty = y2 - y1, l = Math.hypot(tx, ty) || 1;
      const ww = w(k / 20);
      const px = x + (-ty / l) * ww, py = y + (tx / l) * ww;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    for (let k = 20; k >= 0; k--) {
      const [x, y] = pts[k];
      const [x2, y2] = pts[Math.min(20, k + 1)];
      const [x1, y1] = pts[Math.max(0, k - 1)];
      const tx = x2 - x1, ty = y2 - y1, l = Math.hypot(tx, ty) || 1;
      const ww = w(k / 20);
      ctx.lineTo(x - (-ty / l) * ww, y - (tx / l) * ww);
    }
    ctx.closePath();
    ctx.fill();
    // eye spot and flame curl at the tip
    const [ex, ey] = pts[17];
    ctx.fillStyle = C.warm;
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.09, s * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.line;
    ctx.beginPath();
    ctx.ellipse(ex, ey, s * 0.04, s * 0.065, 0, 0, TAU);
    ctx.fill();
  }
}

// Draw the phoenix. o: { open 0..1, beat (radians), flow -1..1 (tail sway), colors }
export function phoenix(ctx, x, y, s, rot, o = {}) {
  const { open = 0.6, beat = 0, flow = 0, t = 0, colors = phoenixColors(P.paper), alpha = 1 } = o;
  const C = colors;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  tail(ctx, s, t, C, flow, open);
  for (const side of [1, -1]) {
    ctx.save();
    ctx.scale(side, 1);
    wing(ctx, s, open, beat, C, t);
    ctx.restore();
  }
  // body
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, s * 0.16, s * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.hot;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.12, s * 0.08, s * 0.24, 0, 0, TAU);
  ctx.fill();
  // crest plumes sweeping back from the head
  for (const side of [-1, 0, 1]) {
    ctx.fillStyle = side ? C.hot : C.warm;
    leaf(ctx, side * s * 0.03, s * 0.5, -Math.PI / 2 + side * 0.55 + Math.sin(t * 6 + side) * 0.08, s * (side ? 0.42 : 0.5), s * 0.04, 0.4);
  }
  // head, beak, eye
  ctx.fillStyle = C.body;
  ctx.beginPath();
  ctx.arc(0, s * 0.5, s * 0.12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(-s * 0.055, s * 0.58);
  ctx.quadraticCurveTo(0, s * 0.72, 0, s * 0.8);
  ctx.quadraticCurveTo(s * 0.02, s * 0.68, s * 0.055, s * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.eye;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * s * 0.06, s * 0.52, s * 0.025, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ flight
// Beat-locked choreography: swerve to a new lane each bar; on the third beat
// flick up with wings flared, on the fourth fold and dive hard.
export function flight(S, t, o = {}) {
  const { W, H, TL } = S;
  const { cx = W / 2, cy = H * 0.48, laneW = W * 0.3, amp = 1, seed = 3 } = o;
  const b = TL.beat(t);
  const k = b.inBar, ph = b.phase;
  // alternate sides every bar, with a random reach, so it carves big S-curves
  const lane = (bar) => cx + (mod(bar, 2) ? 1 : -1) * (0.45 + 0.55 * h2(seed, bar)) * laneW * amp;
  const u = (k + ph) / 4;
  // swerve: most of the lateral move happens quickly mid-bar
  const x = lerp(lane(b.bar - 1), lane(b.bar), ease.inOutCubic(clamp((u - 0.1) / 0.6)))
    + Math.sin(t * 2.6 + seed) * 26 * amp; // a restless micro-weave on top
  let dy = 0, open = 0.6;
  if (k === 0) { dy = 55 * (1 - ease.outCubic(ph)); open = lerp(0.12, 0.62, ease.outCubic(ph)); }
  else if (k === 1) { dy = 0; open = 0.62 + 0.08 * Math.sin(ph * Math.PI); }
  else if (k === 2) { dy = -80 * amp * Math.sin(ph * Math.PI) * (ph < 0.5 ? 1 : 1 - (ph - 0.5) * 0.4); open = lerp(0.7, 1, Math.sin(Math.min(1, ph * 1.6) * Math.PI / 2)); }
  else { dy = 55 * ease.inQuad(ph); open = lerp(1, 0.12, ease.outCubic(clamp(ph / 0.35))); }
  const flapRate = k === 2 ? 3.2 : k === 3 ? 0.5 : 1.6;
  const beat = Math.sin((t * flapRate) * TAU) * (k === 3 ? 0.2 : 1) * open;
  return { x, y: cy + dy * amp, open, beat, k, ph };
}

// heading from motion: forward (+y) follows screen velocity plus the fall
export function flightPose(S, t, o = {}) {
  const f = flight(S, t, o);
  const dt = 1 / 60;
  const f2 = flight(S, t + dt, o);
  const fall = (o.fall ?? 700) * (f.k === 3 ? 1.6 : f.k === 2 ? 0.25 : 1);
  const vx = (f2.x - f.x) / dt, vy = (f2.y - f.y) / dt + fall;
  f.rot = clamp(-Math.atan2(vx, Math.max(500, vy)), -0.75, 0.75);
  f.flow = clamp(vx / 1500, -1, 1);
  return f;
}

// fire trail: past positions, streaming upward as we fall past them
export function fireTrail(ctx, S, t, o = {}) {
  const { n = 26, dt = 0.022, rise = 900, colors = [ORANGE, P.red], size = 1, alpha = 1 } = o;
  const pts = [];
  for (let k = 0; k < n; k++) {
    const tk = t - k * dt;
    const f = flight(S, tk, o);
    pts.push([f.x, f.y - k * dt * rise]);
  }
  ctx.save();
  for (let k = n - 1; k >= 1; k--) {
    const u = k / n;
    const [x, y] = pts[k];
    ctx.globalAlpha = alpha * (1 - u) * 0.85;
    ctx.fillStyle = colors[k % 2];
    const r = size * 34 * (1 - u) + 3;
    ctx.beginPath();
    ctx.ellipse(x + noise1(t * 9 + k, 5) * 10 * u, y, r * 0.6, r * 1.3, 0, 0, TAU);
    ctx.fill();
  }
  // embers
  for (let e = 0; e < 18; e++) {
    const life = fract(t * 1.3 + h2(7, e));
    const k = Math.floor(life * (n - 1));
    const [x, y] = pts[k];
    ctx.globalAlpha = alpha * (1 - life);
    ctx.fillStyle = colors[e % 2];
    ctx.fillRect(x + rnd(8, e, -1, 1) * 60 * life, y - life * 140, 4, 4 + life * 8);
  }
  ctx.restore();
}

// convenience: trail + bird in one call
export function flyingPhoenix(ctx, S, o = {}) {
  const f = flightPose(S, S.t, o);
  const C = o.colors || phoenixColors(o.bg || P.paper);
  if (o.trail !== false) fireTrail(ctx, S, S.t, { ...o, colors: C.trail, alpha: o.alpha ?? 1 });
  phoenix(ctx, f.x + (o.dx || 0), f.y + (o.dy || 0), o.s || 80, f.rot + (o.rotAdd || 0), { open: f.open, beat: f.beat, flow: f.flow, t: S.t, colors: C, alpha: o.alpha ?? 1 });
  return f;
}
