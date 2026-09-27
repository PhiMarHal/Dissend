// Lyric treatments: choruses (shared across all three), instrumental, verse 2.
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';
import { textH, textV, glyph, widthOf, fitSize, layoutH, measure, metrics } from './type.js';
import { charTimes, bigWord, dropColumn } from './typefx.js';
import { CH, CHP, crownState } from './scenes2.js';

export const T2 = {};

// ------------------------------------------------------------------ chorus parts
// じゆうーーー, vertical: the long-vowel mark becomes an endless falling line.
function jiyuuV(ctx, S, L, lt, dur, v) {
  const [bg, ink] = CHP[v].A;
  const size = v === 3 ? 320 : 290;
  const x = v === 2 ? S.W * 0.24 : S.W * 0.5;
  const scroll = v === 3 ? Math.pow(Math.max(0, lt - 0.45), 1.3) * 900 : Math.pow(Math.max(0, lt - 0.85), 1.45) * 460;
  const top = S.H / 2 - 1.5 * size - scroll;
  const out = Math.max(0, lt - dur);
  const kana = 'じゆう';
  for (let i = 0; i < 3; i++) {
    const a = ew(lt, i * 0.12, i * 0.12 + 0.32, 'outExpo');
    if (a <= 0) continue;
    const y = top + (i + 0.5) * size - (1 - a) * S.H;
    if (y < -size) continue;
    glyph(ctx, 'gothic', kana[i], x, y, size, { fill: ink });
  }
  // the bar (ーーー stretched without end)
  const bw = size * 0.12;
  const y0 = top + 3 * size + size * 0.12;
  const grow = ew(lt, 0.35, 1.1, 'outCubic');
  const y1 = lerp(y0, S.H + 200, grow);
  if (grow > 0) {
    if (out <= 0) {
      ctx.fillStyle = ink;
      ctx.fillRect(x - bw / 2, Math.max(-20, y0), bw, y1 - Math.max(-20, y0));
      // motion ticks travelling up the bar
      ctx.fillStyle = bg;
      for (let k = 0; k < 14; k++) {
        const yy = mod(k * 140 - S.D * 1.3, S.H + 280) - 140;
        if (yy > y0 && yy < y1) ctx.fillRect(x - bw / 2 - 1, yy, bw + 2, 5 + S.speed * 0.004);
      }
    } else {
      // snap: halves fly apart
      const k = ease.outCubic(clamp(out / 0.6));
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = ink;
      const mid = S.H * 0.5;
      ctx.save();
      ctx.translate(x, Math.max(y0, -20) - k * 700);
      ctx.rotate(-k * 0.3);
      ctx.fillRect(-bw / 2, 0, bw, mid - Math.max(y0, -20) - 10);
      ctx.restore();
      ctx.save();
      ctx.translate(x, mid + 10 + k * 700);
      ctx.rotate(k * 0.25);
      ctx.fillRect(-bw / 2, 0, bw, S.H);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}

// じゆうーーー, horizontal: the mark becomes a horizon running off the frame.
function jiyuuH(ctx, S, L, lt, dur, v) {
  const [bg, ink] = CHP[v].C;
  const size = v === 3 ? 300 : 260;
  const slide = -Math.pow(Math.max(0, lt - 1.2), 1.35) * 240;
  const x0 = S.W * 0.06 + slide;
  const y = S.H * (v === 2 ? 0.36 : 0.4);
  const out = Math.max(0, lt - dur);
  const kana = 'じゆう';
  for (let i = 0; i < 3; i++) {
    const a = ew(lt, i * 0.12, i * 0.12 + 0.3, 'outExpo');
    if (a <= 0) continue;
    glyph(ctx, 'gothic', kana[i], x0 + (i + 0.5) * size * 0.98 - (1 - a) * 500, y + out * out * -3000 * (i + 1) * 0.3, size, { fill: ink });
  }
  const bh = size * 0.12;
  const bx0 = x0 + size * 3 + 20;
  const grow = ew(lt, 0.35, 1.2, 'outCubic');
  if (grow <= 0) return;
  const bx1 = lerp(bx0, S.W + 200, grow);
  ctx.save();
  const k = ease.outCubic(clamp(out / 0.6));
  ctx.globalAlpha = 1 - k;
  ctx.fillStyle = ink;
  ctx.fillRect(bx0 - k * 400, y - bh / 2 + k * 200, bx1 - bx0, bh);
  ctx.fillStyle = bg;
  for (let j = 0; j < 16; j++) {
    const xx = mod(j * 150 - (S.t * 2200), S.W + 300) - 150;
    if (xx > bx0 && xx < bx1) ctx.fillRect(xx, y - bh / 2 - 1, 6, bh + 2);
  }
  ctx.restore();
}

// FREEEEDOM! — the four E's stretch wide like a held note.
export function freedom(ctx, S, lt, dur, o) {
  const { y, size, fill, accent, sung = false, x = S.W / 2, font = 'anton', maxW = S.W * 0.94 } = o;
  const chars = Array.from('FREEEEDOM!');
  const stretch = 1 + ew(lt, 0.15, dur, 'outCubic') * (sung ? 1.5 : 1.1);
  const out = Math.max(0, lt - dur + 0.15);
  const gap = size * 0.03;
  let total = 0;
  const ws = chars.map((ch) => measure(font, ch) * size * (ch === 'E' ? stretch : 1));
  total = ws.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  const k = Math.min(1, maxW / total); // keep it inside the frame
  let cx = x - (total * k) / 2;
  chars.forEach((ch, i) => {
    const w = ws[i] * k;
    const a = ew(lt, Math.abs(i - 4.5) * 0.03, Math.abs(i - 4.5) * 0.03 + 0.25, 'outExpo');
    if (a > 0) {
      const side = i < 5 ? -1 : 1;
      const fly = out > 0 ? side * Math.pow(out, 2) * 9000 * (0.4 + Math.abs(i - 4.5) * 0.15) : 0;
      const isE = ch === 'E';
      ctx.globalAlpha = clamp(a * 2);
      glyph(ctx, font, ch, cx + w / 2 + fly, y, size * k, {
        fill: isE && accent && i % 2 === 1 ? accent : fill, sx: isE ? stretch : 1, sy: lerp(0.2, 1, a),
      });
    }
    cx += w + gap * k;
  });
  ctx.globalAlpha = 1;
}

// 石と鋼と蒸気の鳥が加速する
function birdsJP(ctx, S, L, lt, dur, v) {
  const [bg] = CHP[v].B;
  const light = bg !== P.paper;
  const inkC = light ? P.paperLight : P.ink;
  const segs = [
    ['石', 0.0, 'stone', 200, 0], ['と', 0.35, 'plain', 110, 0], ['鋼', 0.6, 'steel', 200, 0], ['と', 0.95, 'plain', 110, 0],
    ['蒸気', 1.2, 'steam', 200, 0], ['の', 1.7, 'plain', 110, 0], ['鳥が', 1.95, 'plain', 150, 1], ['加速する', 2.5, 'fast', 150, 1],
  ];
  let row = -1, x = 0, y = 0;
  const rush = Math.pow(Math.max(0, lt - dur + 0.6), 2) * 4200;
  for (const [txt, t0, kind, size, r] of segs) {
    if (r !== row) { row = r; x = S.W * (r ? 0.3 : 0.06); y = S.H * (r ? 0.46 : 0.24); }
    const w = widthOf(kind === 'plain' || kind === 'fast' ? 'mincho' : 'gothic', txt, size);
    const a = ew(lt, t0, t0 + 0.3, 'outExpo');
    if (a > 0) {
      const dx = (1 - a) * -120 + rush * (kind === 'fast' ? 1.4 : 1);
      if (kind === 'stone') {
        textH(ctx, 'gothic', txt, x + dx, y, size, { fill: light ? P.paperDark : P.sand, stroke: light ? P.ink : P.ink, lw: 5, align: 0 });
      } else if (kind === 'steel') {
        textH(ctx, 'gothic', txt, x + dx, y, size, { fill: bg === P.ink ? P.red : P.ink, align: 0 });
        textH(ctx, 'gothic', txt, x + dx - 4, y - 4, size, { fill: null, stroke: bg === P.red ? P.paperLight : bg === P.ink ? P.paperLight : P.red, lw: 1.6, align: 0 });
      } else if (kind === 'steam') {
        for (let k = 0; k < 3; k++) {
          const u = fract(S.t * 0.8 + k / 3);
          ctx.globalAlpha = (1 - u) * 0.5;
          textH(ctx, 'gothic', txt, x + dx - u * 60, y - u * 80, size * (1 + u * 0.15), { fill: null, stroke: inkC, lw: 2, align: 0 });
        }
        ctx.globalAlpha = 1;
        textH(ctx, 'gothic', txt, x + dx, y, size, { fill: null, stroke: inkC, lw: 4, align: 0 });
      } else if (kind === 'fast') {
        const acc = Math.max(0, lt - t0);
        const run = acc * acc * 180;
        for (let k = 3; k >= 1; k--) {
          ctx.globalAlpha = 0.18 * (4 - k);
          textH(ctx, 'mincho', txt, x + dx + run - k * (20 + run * 0.15), y, size, { fill: light ? P.ink : P.red, align: 0, skew: -0.25 });
        }
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(x + dx + run, y);
        ctx.scale(1 + Math.min(0.6, acc * 0.2), 1);
        textH(ctx, 'mincho', txt, 0, 0, size, { fill: inkC, align: 0, skew: -0.25 });
        ctx.restore();
      } else {
        textH(ctx, 'mincho', txt, x + dx, y, size, { fill: inkC, align: 0 });
      }
    }
    x += w + 18;
  }
}

// Birds of stone and steel and steam rapidly gaining speed.
function birdsEN(ctx, S, L, lt, dur, v) {
  const [bg] = CHP[v].B;
  const col = bg === P.paper ? P.ink : bg === P.ink ? P.paper : P.ink;
  const a1 = ew(lt, 0, 0.5, 'outExpo');
  const out = ew(lt, dur - 0.3, dur + 0.3, 'inCubic');
  const row1 = 'BIRDS OF STONE AND STEEL AND STEAM';
  textH(ctx, 'cond', row1, S.W * 0.05, S.H * 0.66, 76, { fill: col, align: 0, tracking: 0.06 }, (i, n) => {
    const a = ew(lt, i * 0.025, i * 0.025 + 0.3, 'outCubic');
    return { alpha: a * (1 - out), dy: (1 - a) * 30 };
  });
  const t2 = 1.3;
  const acc = Math.max(0, lt - t2);
  const run = acc * acc * 160;
  const a2 = ew(lt, t2, t2 + 0.4, 'outExpo');
  if (a2 > 0) {
    const sk = -Math.min(0.5, acc * 0.12);
    const red = bg === P.red ? P.paperLight : P.red;
    for (let k = 1; k <= 3; k++) {
      ctx.globalAlpha = 0.15 * (4 - k) * a2;
      textH(ctx, 'wide', 'RAPIDLY  GAINING  SPEED', S.W * 0.05 + run - k * (14 + run * 0.12), S.H * 0.82, 112, { fill: red, align: 0, skew: sk });
    }
    ctx.globalAlpha = a2 * (1 - out);
    ctx.save();
    ctx.translate(S.W * 0.05 + run, S.H * 0.82);
    ctx.scale(1 + Math.min(0.5, acc * 0.12), 1);
    textH(ctx, 'wide', 'RAPIDLY  GAINING  SPEED', 0, 0, 112, { fill: col, align: 0, skew: sk });
    ctx.restore();
    ctx.globalAlpha = 1;
    // speed rules
    ctx.fillStyle = col;
    for (let k = 0; k < 6; k++) {
      const ww = Math.min(S.W, 80 + run * rnd(3, k, 0.5, 1.5));
      ctx.fillRect(S.W * 0.05 + run - ww - 40, S.H * 0.82 - 40 + k * 16, ww, 3);
    }
  }
}

// 雲と炎を越えて終わらない疾走
function cloudsJP(ctx, S, L, lt, dur, v) {
  const [bg] = CHP[v].D;
  const dark = bg === P.ink;
  const pass = ew(lt, 2.5, 3.3, 'inCubic') * S.H * 1.4; // we fall past them
  const aC = ew(lt, 0, 0.35, 'outBack');
  if (aC > 0) {
    ctx.save();
    ctx.translate(S.W * 0.27, S.H * 0.4 - pass);
    ctx.scale(aC, aC);
    textH(ctx, 'gothic', '雲', 0, 0, 340, { fill: P.paperLight, stroke: P.ink, lw: 8 });
    ctx.restore();
  }
  const aT = ew(lt, 0.45, 0.7, 'outCubic');
  if (aT > 0) textH(ctx, 'mincho', 'と', S.W * 0.5, S.H * 0.46 - pass * 1.1, 120, { fill: dark ? P.paper : P.ink }, () => ({ alpha: aT }));
  const aF = ew(lt, 0.8, 1.15, 'outBack');
  if (aF > 0) {
    const flick = 1 + 0.05 * noise1(S.t * 14, 3);
    ctx.save();
    ctx.translate(S.W * 0.73, S.H * 0.4 - pass * 0.9);
    ctx.scale(aF, aF * flick);
    textH(ctx, 'gothic', '炎', 0, 0, 340, { fill: dark ? P.red : P.redHot, stroke: P.ink, lw: 8 });
    ctx.restore();
  }
  // を越えて — hops over the two kanji
  const aO = ew(lt, 1.6, 2.4, 'inOutCubic');
  if (lt > 1.6) {
    const arc = Math.sin(aO * Math.PI) * 260;
    textH(ctx, 'mincho', 'を越えて', lerp(S.W * 0.2, S.W * 0.62, aO), S.H * 0.74 - arc - pass * 0.6, 120, { fill: dark ? P.paper : P.ink }, () => ({ alpha: 1 - ew(lt, 2.6, 3.2) }));
  }
  // 終わらない疾走 — an endless tape
  const tapeIn = ew(lt, 2.7, 3.1, 'outExpo');
  const tapeOut = ew(lt, dur + 0.2, dur + 0.6, 'inExpo');
  if (tapeIn > 0 && tapeOut < 1) {
    tape(ctx, S, '終わらない疾走　', S.H * 0.52, 190, -0.035, {
      band: dark ? P.red : P.ink, color: dark ? P.ink : P.paperLight, font: 'gothic', size: 128,
      offset: S.t * (1500 + 400 * lt), dir: -1, reveal: tapeIn, hide: tapeOut,
    });
  }
}

// A band of repeating text crossing the frame (ticker tape).
export function tape(ctx, S, text, y, h, rot, o) {
  const { band, color, font = 'wide', size = 90, offset = 0, dir = -1, reveal = 1, hide = 0, tracking = 0 } = o;
  const unit = widthOf(font, text, size, tracking);
  ctx.save();
  ctx.translate(S.W / 2, y);
  ctx.rotate(rot);
  const W2 = S.W * 0.75;
  const bx0 = -W2 + (W2 * 2) * hide * (dir < 0 ? 1 : 0), bx1 = -W2 + W2 * 2 * reveal - (W2 * 2) * hide * (dir < 0 ? 0 : 1);
  if (bx1 > bx0) {
    ctx.fillStyle = band;
    ctx.fillRect(bx0, -h / 2, bx1 - bx0, h);
    ctx.beginPath();
    ctx.rect(bx0, -h / 2, bx1 - bx0, h);
    ctx.clip();
    const off = mod(offset * (dir < 0 ? 1 : -1), unit);
    for (let x = -W2 - off; x < W2 + unit; x += unit) textH(ctx, font, text, x, 0, size, { fill: color, align: 0, tracking });
  }
  ctx.restore();
}

// Journey across cloud and flame in a run that never ends.
function journeyEN(ctx, S, L, lt, dur, v) {
  const rows = [
    [0.18, -0.06, 'wide', 64, 1, P.paper, P.ink],
    [0.36, 0.03, 'italic', 96, -1, P.red, P.paperLight],
    [0.56, -0.02, 'wide', 64, 1, P.ink, P.paper],
    [0.76, 0.05, 'cond', 88, -1, P.paperLight, P.red],
    [0.92, -0.04, 'italic', 80, 1, P.red, P.ink],
  ];
  const text = ['JOURNEY ACROSS CLOUD AND FLAME IN A RUN THAT NEVER ENDS — ', 'Journey across cloud and flame in a run that never ends — '];
  rows.forEach(([yy, rot, font, size, dir, band, color], r) => {
    const reveal = ew(lt, r * 0.35, r * 0.35 + 0.7, 'outExpo');
    const hide = ew(lt, dur - 0.9 + r * 0.12, dur - 0.1 + r * 0.12, 'inExpo');
    if (reveal <= 0 || hide >= 1) return;
    tape(ctx, S, text[font === 'italic' ? 1 : 0], S.H * yy, size * 1.45, rot, {
      band, color, font, size, offset: S.t * (500 + r * 180 + S.E * 500), dir, reveal, hide, tracking: font === 'wide' ? 0.04 : 0,
    });
  });
}

// register chorus lines for all three choruses
for (const c of CH) {
  const v = c.v;
  T2[c.a] = { pre: 0.05, post: 0.6, draw: (ctx, S, L, lt, dur) => jiyuuV(ctx, S, L, lt, dur, v) };
  T2[c.ae] = {
    pre: 0, post: 0.3,
    draw: (ctx, S, L, lt, dur) => {
      const [bg, ink, en] = CHP[v].A;
      const sung = L.sung;
      const size = sung ? 330 : 250;
      freedom(ctx, S, lt, dur, { y: S.H * (v === 2 ? 0.5 : 0.52), size, fill: en, accent: ink, sung, x: v === 2 ? S.W * 0.62 : S.W / 2, maxW: v === 2 ? S.W * 0.62 : S.W * 0.94 });
    },
  };
  T2[c.b] = { pre: 0.05, post: 0.7, draw: (ctx, S, L, lt, dur) => birdsJP(ctx, S, L, lt, dur, v) };
  T2[c.be] = { pre: 0, post: 0.3, draw: (ctx, S, L, lt, dur) => birdsEN(ctx, S, L, lt, dur, v) };
  T2[c.c] = { pre: 0.05, post: 0.6, draw: (ctx, S, L, lt, dur) => jiyuuH(ctx, S, L, lt, dur, v) };
  T2[c.ce] = {
    pre: 0, post: 0.3,
    draw: (ctx, S, L, lt, dur) => {
      const [bg, ink, en] = CHP[v].C;
      freedom(ctx, S, lt, dur, { y: S.H * 0.74, size: 230, fill: en, accent: ink });
    },
  };
  T2[c.d] = { pre: 0.05, post: 0.6, draw: (ctx, S, L, lt, dur) => cloudsJP(ctx, S, L, lt, dur, v) };
  T2[c.de] = { pre: 0, post: 0.2, draw: (ctx, S, L, lt, dur) => journeyEN(ctx, S, L, lt, dur, v) };
}

// ------------------------------------------------------------------ verse 2
T2.L025 = { // 落ちる — night
  pre: 0.05, post: 0.5,
  draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W / 2, S.H / 2 - 260 * 1.53, 260, lt, { fill: P.paper, exitAt: dur + 0.1, times: charTimes(L, 0.45) }); },
};
T2.L026 = { pre: 0, post: 0.7, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'FALL.', S.W / 2, S.H * 0.52, 440, lt, dur - 0.2, { fill: P.paper }); } };
T2.L027 = { // 星屑より速く進む
  pre: 0.05, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const times = charTimes(L, 2.2);
    const out = ew(lt, dur + 0.05, dur + 0.6, 'inCubic');
    const size = 128, x = S.W * 0.76, y = S.H * 0.06;
    textV(ctx, 'mincho', L.text, x, y, size, { fill: P.paper, lead: 1.04 }, (i, n, g, gx, gy) => {
      const ti = times[i] - L.start;
      const a = ew(lt, ti, ti + 0.3, 'outExpo');
      if (a <= 0) return false;
      // stardust peeling upward from each glyph
      ctx.fillStyle = P.paper;
      for (let k = 0; k < 10; k++) {
        const life = fract((lt - ti) * rnd(i, k, 0.6, 1.4) + h2(i, k + 20));
        ctx.globalAlpha = (1 - life) * 0.8 * (1 - out);
        ctx.fillRect(gx + rnd(i, k + 40, -0.5, 0.5) * size, gy - life * 400, 2.5, 2.5 + S.speed * 0.02 * life);
      }
      ctx.globalAlpha = 1;
      const fast = i === 3 || i === 4;
      return { dy: (1 - a) * 200 + out * 900, sy: fast ? 1.35 : 1, alpha: a * (1 - out), fill: fast ? P.red : P.paper };
    });
  },
};
function textDots(S, key, font, text, size, step) {
  let pts = S.cache.get(key);
  if (pts) return pts;
  const w = Math.ceil(widthOf(font, text, size)) + 20, h = Math.ceil(size * 1.4);
  const c = S.makeCanvas(w, h);
  const x = c.getContext('2d');
  textH(x, font, text, 10, h / 2, size, { fill: '#000', align: 0 });
  const d = x.getImageData(0, 0, w, h).data;
  pts = [];
  for (let yy = 0; yy < h; yy += step) for (let xx = 0; xx < w; xx += step) if (d[(yy * w + xx) * 4 + 3] > 128) pts.push([xx - 10, yy - h / 2]);
  S.cache.set(key, pts);
  return pts;
}
T2.L028 = { // I'm moving faster than the stardust.
  pre: 0.05, post: 0.3,
  draw(ctx, S, L, lt, dur) {
    const rows = [["I'M MOVING FASTER", 0], ['THAN THE STARDUST.', 1.1]];
    const out = ew(lt, dur - 0.1, dur + 0.3, 'inCubic');
    rows.forEach(([txt, t0], r) => {
      const size = 118;
      const w = widthOf('wide', txt, size);
      const x0 = S.W / 2 - w / 2, y = S.H * (0.42 + r * 0.18);
      const a = ew(lt, t0, t0 + 0.4, 'outExpo');
      if (a <= 0) return;
      // solid letters sweep in from the right
      textH(ctx, 'wide', txt, x0, y + out * 400, size, { fill: P.paper, align: 0 }, (i, n) => {
        const ai = ew(lt, t0 + i * 0.03, t0 + i * 0.03 + 0.3, 'outExpo');
        return { alpha: ai * (1 - out), dx: (1 - ai) * 200 };
      });
      // the stardust we leave behind: a dotted copy rising away
      const pts = textDots(S, 'dots' + r, 'wide', txt, size, 7);
      const k = Math.max(0, lt - t0 - 0.35);
      ctx.fillStyle = r ? P.red : P.paper;
      for (let p = 0; p < pts.length; p++) {
        const [px, py] = pts[p];
        const sp = rnd(p, r, 60, 520);
        const up = k * k * sp;
        if (up < 2) continue;
        ctx.globalAlpha = clamp(1 - up / 900) * 0.8;
        ctx.fillRect(x0 + px + noise1(p * 0.1 + k, r) * up * 0.08, y + py - up, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
    });
  },
};
T2.L029 = { pre: 0.05, post: 0.4, draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.5, S.H * 0.5 - 250, 250, lt, { font: 'gothic', fill: P.red, times: charTimes(L, 0.3), exitAt: dur }); } };
T2.L030 = { pre: 0, post: 0.6, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'DOWN.', S.W / 2, S.H * 0.52, 420, lt, dur - 0.1, { fill: P.paper }); } };
T2.L031 = { // 夜明けより軽くなる — getting lighter (weight thins, text floats)
  pre: 0.05, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const times = charTimes(L, 1.6);
    const size = 112;
    const out = ew(lt, dur + 0.05, dur + 0.6, 'inCubic');
    const x = S.W * 0.5, y = S.H * 0.14 - lt * 22;
    textV(ctx, 'mincho', L.text, x, y, size, { lead: 1.0 }, (i, n, g, gx, gy) => {
      const ti = times[i] - L.start;
      const a = ew(lt, ti, ti + 0.4, 'outCubic');
      if (a <= 0) return false;
      const light = ew(lt, 1.2 + i * 0.22, 2.2 + i * 0.22, 'inOutCubic');
      const col = mix(P.paperLight, P.paperLight, 0);
      ctx.globalAlpha = a * (1 - light) * (1 - out);
      glyph(ctx, 'mincho', g.ch, gx, gy - out * 400, size, { fill: col });
      ctx.globalAlpha = a * light * (1 - out);
      glyph(ctx, 'minchoLight', g.ch, gx, gy - out * 400 - light * 12, size, { fill: col, stroke: col, lw: 1 });
      ctx.globalAlpha = 1;
      return false;
    });
  },
};
T2.L032 = { // I'm turning lighter than the dawn.
  pre: 0.05, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const out = ew(lt, dur + 0.05, dur + 0.6, 'inCubic');
    const rows = [["I'M TURNING", 96, 0, 0.2], ['LIGHTER', 300, 0.5, 0.43], ['THAN THE DAWN.', 96, 1.2, 0.66]];
    rows.forEach(([txt, size, t0, yy], r) => {
      const y = S.H * yy - lt * 18;
      const a = ew(lt, t0, t0 + 0.5, 'outExpo');
      if (a > 0) {
        textH(ctx, 'wide', txt, S.W / 2, y - out * 500, size, { fill: P.ink, tracking: r === 1 ? 0.02 : 0.12 }, (i, n, g, gx, gy) => {
          const light = ew(lt, t0 + 0.6 + i * 0.12, t0 + 1.4 + i * 0.12, 'inOutCubic');
          ctx.globalAlpha = a * light * (1 - out);
          glyph(ctx, 'wideThin', g.ch, gx, gy - out * 500 - light * 10 * (r === 1 ? 2 : 1), size, { fill: r === 1 ? P.red : P.ink });
          ctx.globalAlpha = 1;
          return { alpha: a * (1 - light) * (1 - out), dy: (1 - a) * 60 };
        });
      }
    });
  },
};
T2.L033 = { pre: 0.05, post: 0.4, draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.22, S.H * 0.5 - 330, 220, lt, { font: 'gothic', fill: P.red, times: charTimes(L, 0.3), exitAt: dur }); } };
T2.L034 = { pre: 0, post: 0.5, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'FALL.', S.W * 0.62, S.H * 0.52, 380, lt, dur - 0.1, { fill: P.ink }); } };
T2.L035 = { // 恐怖がこの軌道の樹で逆さに咲く
  pre: 0.05, post: 0.7,
  draw(ctx, S, L, lt, dur) {
    const chars = Array.from(L.text);
    const times = charTimes(L, 3.0);
    const out = ew(lt, dur + 0.1, dur + 0.7, 'inCubic');
    const size = 84;
    const cols = [[0, 8, S.W * 0.9], [8, 15, S.W * 0.83]];
    cols.forEach(([a0, a1, x]) => {
      let y = S.H * 0.1;
      for (let i = a0; i < a1; i++) {
        const ch = chars[i];
        const ti = times[i] - L.start;
        const a = ew(lt, ti, ti + 0.35, 'outExpo');
        const fear = i < 2;
        const s = fear ? 130 : size;
        y += s * 0.5;
        if (a > 0) {
          const upside = i >= 10 && i <= 12; // 逆さに — upside down
          const bloom = i >= 13 ? ew(lt, ti + 0.1, ti + 0.6, 'outBack') : 1;
          glyph(ctx, fear ? 'gothic' : 'mincho', ch, x, y + (1 - a) * -60 - out * 700, s * (i >= 13 ? bloom : 1), {
            fill: fear || i >= 13 ? P.red : P.ink, rot: upside ? Math.PI * ew(lt, ti + 0.2, ti + 0.7, 'outBack') : 0,
          });
        }
        y += s * 0.52;
      }
    });
  },
};
T2.L036 = { // Fear blooms backwards in this tree of trajectories.
  pre: 0.05, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const out = ew(lt, dur + 0.05, dur + 0.6, 'inCubic');
    const x = S.W * 0.07;
    const items = [
      ['FEAR', 'wide', 190, P.red, 0, S.H * 0.2],
      ['blooms', 'italic', 150, P.ink, 0.6, S.H * 0.4],
      ['backwards', 'italic', 150, P.ink, 1.2, S.H * 0.55],
      ['in this tree', 'italic', 84, P.ink, 2.0, S.H * 0.7],
      ['of trajectories.', 'italic', 84, P.ink, 2.6, S.H * 0.79],
    ];
    for (const [txt, font, size, col, t0, y] of items) {
      const a = ew(lt, t0, t0 + 0.5, 'outExpo');
      if (a <= 0) continue;
      if (txt === 'backwards') {
        // mirrored, and it flips around as it arrives
        const w = widthOf(font, txt, size);
        const flip = lerp(1, -1, ew(lt, t0 + 0.2, t0 + 0.9, 'inOutCubic'));
        ctx.save();
        ctx.translate(x + w / 2, y - out * 600);
        ctx.scale(flip, 1);
        textH(ctx, font, txt, 0, 0, size, { fill: P.red }, () => ({ alpha: a }));
        ctx.restore();
        continue;
      }
      textH(ctx, font, txt, x + (1 - a) * -80, y - out * 600, size, { fill: col, align: 0 }, () => ({ alpha: a }));
    }
  },
};
T2.L037 = { pre: 0.05, post: 0.35, draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.28, S.H * 0.5 - 230, 230, lt, { font: 'gothic', fill: P.red, times: charTimes(L, 0.25), exitAt: dur }); } };
T2.L038 = { pre: 0, post: 0.5, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'DOWN.', S.W * 0.4, S.H * 0.52, 400, lt, dur, { fill: P.ink }); } };

// The crown of whispers: text carried on a spinning, tilted ring.
function ringText(ctx, S, text, font, size, col, spinOff, alpha, highlight = null) {
  const c = crownState(S.t, S.W, S.H);
  const chars = Array.from(text);
  const n = chars.length;
  const items = chars.map((ch, i) => {
    const a = -c.spin - spinOff - (i / n) * TAU; // front half reads left to right
    return { ch, i, a, z: Math.sin(a) };
  }).sort((p, q) => p.z - q.z);
  for (const it of items) {
    if (it.ch === ' ') continue;
    const x = c.cx + Math.cos(it.a) * c.rx, y = c.cy + Math.sin(it.a) * c.ry;
    const d = (it.z + 1) / 2; // 0 back .. 1 front
    ctx.globalAlpha = alpha * lerp(0.28, 1, d);
    glyph(ctx, font, it.ch, x, y - size * 0.1, size * lerp(0.65, 1.1, d), { fill: highlight && highlight(it.i) ? P.red : col, sx: lerp(0.35, 1, Math.abs(Math.cos(it.a)) * 0.3 + 0.7) });
  }
  ctx.globalAlpha = 1;
}
T2.L039 = { // 囁きの冠が私と共に廻り落ちる
  pre: 0.1, post: 0.4,
  draw(ctx, S, L, lt, dur) {
    const a = ew(lt, -0.1, 0.6, 'outCubic') * (1 - ew(lt, dur, dur + 0.4));
    ringText(ctx, S, L.text + '　', 'mincho', 96, P.ink, 0, a, (i) => i === 3);
  },
};
T2.L040 = { // The crown of whispers spins and spins down with me.
  pre: 0, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const a = ew(lt, 0, 0.5, 'outCubic');
    ringText(ctx, S, 'THE CROWN OF WHISPERS · SPINS AND SPINS · DOWN WITH ME · ', 'cond', 58, P.ink, 0.3, a, (i) => i >= 4 && i <= 8);
    const c = crownState(S.t, S.W, S.H);
    const out = ew(lt, dur - 0.2, dur + 0.6, 'inCubic');
    const a2 = ew(lt, 0.8, 1.4, 'outExpo');
    if (a2 > 0) {
      ctx.save();
      ctx.translate(S.W / 2, c.cy - 330);
      ctx.rotate(Math.sin(S.t * 3) * 0.05);
      textH(ctx, 'italic', 'spins and spins', 0, 0, 150, { fill: P.red }, (i, n) => ({ alpha: a2 * (1 - out), rot: Math.sin(S.t * 4 + i * 0.5) * 0.15 }));
      ctx.restore();
    }
    const a3 = ew(lt, 2.2, 2.8, 'outExpo');
    if (a3 > 0) textH(ctx, 'italic', 'down with me.', S.W / 2, c.cy + 300 + out * 300, 110, { fill: P.ink }, () => ({ alpha: a3 * (1 - out) }));
  },
};
