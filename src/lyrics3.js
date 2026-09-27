// Lyric treatments: verse 3 (the peak).
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';
import { textH, textV, glyph, widthOf, fitSize, measure } from './type.js';
import { charTimes, bigWord, dropColumn } from './typefx.js';
import { v3Bg } from './scenes3.js';

export const T3 = {};
const fgOn = (bg) => (bg === P.paper ? P.ink : bg === P.ink ? P.paper : P.ink);
const acOn = (bg) => (bg === P.red ? P.paperLight : P.red);

T3.L049 = { // 下へ — the peak begins
  pre: 0.02, post: 0.25,
  draw(ctx, S, L, lt, dur) {
    const times = charTimes(L);
    const size = 400;
    const out = ew(lt, dur, dur + 0.25, 'inExpo');
    Array.from(L.text).forEach((ch, i) => {
      const ti = times[i] - L.start;
      const a = ew(lt, ti, ti + 0.12, 'outExpo');
      if (a <= 0) return;
      const sc = lerp(2.6, 1, a) * (1 + out * 2.5);
      glyph(ctx, 'gothic', ch, S.W / 2, S.H / 2 + (i - 0.5) * size * 1.0 * (1 + out * 2), size * sc, { fill: P.paperLight });
    });
  },
};
T3.L050 = { pre: 0, post: 0.3, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'DOWN.', S.W / 2, S.H * 0.52, 520, lt, dur - 0.05, { fill: P.paper, stagger: 0.035 }); } };

// 香り、影、声、木霊 + Scent, shadow, sound, echo — a manga page
const PANELS = [
  [[40, 40], [1110, 40], [1030, 525], [40, 525]],
  [[1140, 40], [1880, 40], [1880, 525], [1060, 525]],
  [[40, 555], [770, 555], [850, 1040], [40, 1040]],
  [[800, 555], [1880, 555], [1880, 1040], [880, 1040]],
];
function panelPath(ctx, pts, k = 1) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / 4, cy = pts.reduce((a, p) => a + p[1], 0) / 4;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const X = lerp(cx, x, k), Y = lerp(cy, y, k);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  });
  ctx.closePath();
  return [cx, cy];
}
T3.L051 = {
  pre: 0.05, post: 0.75,
  draw(ctx, S, L, lt, dur) {
    const jp = L.text.split('、');
    const en = ['SCENT', 'SHADOW', 'SOUND', 'ECHO'];
    const out = ew(lt, dur + 0.3, dur + 0.75, 'inExpo');
    for (let k = 0; k < 4; k++) {
      const t0 = k * 0.85;
      const a = ew(lt, t0, t0 + 0.3, 'outBack');
      if (a <= 0) continue;
      const u = lt - t0;
      const pts = PANELS[k];
      ctx.save();
      // the page falls away at the end, panel by panel
      ctx.translate(0, out * S.H * (1.2 + k * 0.25));
      const [cx, cy] = panelPath(ctx, pts, a);
      const pbg = [P.paperLight, P.red, P.paperLight, P.ink][k];
      const pfg = [P.ink, P.paperLight, P.ink, P.paper][k];
      ctx.fillStyle = pbg;
      ctx.fill();
      ctx.save();
      ctx.clip();
      const size = [220, 300, 300, 230][k];
      if (k === 0) { // scent: wisps curling upward
        ctx.strokeStyle = P.red;
        ctx.lineWidth = 4;
        for (let w = 0; w < 7; w++) {
          ctx.beginPath();
          const bx = cx - 380 + w * 125;
          for (let j = 0; j <= 40; j++) {
            const yy = cy + 260 - j * 14 - (u * 120 % 14);
            const xx = bx + Math.sin(j * 0.35 + u * 3 + w) * (10 + j * 1.6);
            j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
          }
          ctx.globalAlpha = 0.7;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        textH(ctx, 'mincho', jp[0], cx - 60, cy - 10, size, { fill: pfg });
      } else if (k === 1) { // shadow: a long cast shadow
        const n = 26;
        for (let s = n; s >= 1; s--) textH(ctx, 'mincho', jp[1], cx - 40 + s * 7 * a, cy + s * 7 * a, size, { fill: P.redDeep });
        textH(ctx, 'mincho', jp[1], cx - 40, cy, size, { fill: pfg });
      } else if (k === 2) { // sound: ripples
        M.ripple(ctx, cx - 60, cy, u, { count: 7, maxR: 700, color: P.red, lw: 5, period: 0.8 });
        textH(ctx, 'mincho', jp[2], cx - 60, cy, size, { fill: pfg });
      } else { // echo: receding repeats
        for (let e = 6; e >= 0; e--) {
          const sc = Math.pow(0.72, e);
          ctx.globalAlpha = Math.pow(0.7, e);
          textH(ctx, 'mincho', jp[3], cx - 120 + e * 150 * ew(u, 0, 0.6, 'outCubic'), cy - e * 30, size * sc, { fill: e ? P.red : pfg });
        }
        ctx.globalAlpha = 1;
      }
      // english label
      textH(ctx, 'wide', en[k], Math.min(pts[1][0], pts[2][0]) - 50, pts[2][1] - 60, 60, { fill: k === 1 ? P.ink : k === 3 ? P.red : P.red, align: 1, tracking: 0.08 }, (i) => ({ alpha: ew(u, 0.15 + i * 0.03, 0.4 + i * 0.03) }));
      ctx.restore();
      panelPath(ctx, pts, a);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 9;
      ctx.lineJoin = 'miter';
      ctx.stroke();
      ctx.restore();
    }
  },
};
T3.L052 = { pre: 0, post: 0, draw() {} }; // typeset inside the L051 panels

T3.L053 = { pre: 0.02, post: 0.25, draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.5, S.H * 0.5 - 260, 260, lt, { font: 'gothic', fill: P.paperLight, times: charTimes(L, 0.15), inDur: 0.12, exitAt: dur }); } };
T3.L054 = { pre: 0, post: 0.3, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'DOWN.', S.W / 2, S.H * 0.52, 480, lt, dur, { fill: P.paper, stagger: 0.03 }); } };

// 薄れ×6、広がるーーー  +  Waning ×6, Groooowing
T3.L055 = {
  pre: 0.02, post: 0.15,
  draw(ctx, S, L, lt, dur) {
    const bg = v3Bg(S.t);
    const out = ew(lt, dur - 0.1, dur + 0.15, 'inCubic');
    // six fading 薄れ spiralling inward
    for (let k = 0; k < 6; k++) {
      const t0 = k * 0.45;
      const a = ew(lt, t0, t0 + 0.18, 'outExpo');
      if (a <= 0) continue;
      const fade = Math.pow(0.78, k) * (1 - ew(lt, t0 + 0.6, 2.9, 'inCubic'));
      if (fade <= 0.01) continue;
      const ang = k * 1.05 + 0.4;
      const rad = 420 * Math.pow(0.8, k);
      const x = S.W / 2 + Math.cos(ang) * rad * 1.5, y = S.H / 2 + Math.sin(ang) * rad * 0.8;
      const size = 230 * Math.pow(0.8, k);
      ctx.globalAlpha = fade * a;
      textH(ctx, 'mincho', '薄れ', x, y, size, { fill: P.paper });
      textH(ctx, 'cond', 'WANING', x, y + size * 0.62, size * 0.3, { fill: P.red, tracking: 0.2 });
      ctx.globalAlpha = 1;
    }
    // 広がる — expands past the frame, the long mark shooting outwards
    const g0 = 2.8;
    const ga = ew(lt, g0, g0 + 0.25, 'outExpo');
    if (ga > 0) {
      const grow = ew(lt, g0, dur + 0.4, 'inCubic');
      const size = lerp(160, 900, grow) * lerp(0.4, 1, ga);
      ctx.globalAlpha = 1 - out;
      textH(ctx, 'gothic', '広がる', S.W / 2, S.H * 0.42, size, { fill: bg === P.red ? P.paperLight : P.red });
      const bh = size * 0.1;
      const bw = S.W * (0.2 + grow * 1.5);
      ctx.fillStyle = bg === P.red ? P.ink : P.paper;
      ctx.fillRect(S.W / 2 - bw / 2, S.H * 0.42 + size * 0.62, bw, bh);
      ctx.globalAlpha = 1;
    }
  },
};
T3.L056 = { // GROOOOWING — the Os swell
  pre: 0, post: 0.3,
  draw(ctx, S, L, lt, dur) {
    const g0 = 2.9;
    if (lt < g0) return;
    const u = lt - g0;
    const bg = v3Bg(S.t);
    const out = ew(lt, dur, dur + 0.3, 'inCubic');
    const chars = Array.from('GROOOOWING');
    const stretch = 1 + ew(u, 0, dur - g0, 'outCubic') * 1.2;
    const size = 170;
    const ws = chars.map((c) => measure('wide', c) * size * (c === 'O' ? stretch : 1));
    const tot = ws.reduce((a, b) => a + b, 0);
    const k = Math.min(1, (S.W * 0.95) / tot);
    let x = S.W / 2 - (tot * k) / 2;
    chars.forEach((c, i) => {
      const a = ew(u, i * 0.03, i * 0.03 + 0.2, 'outBack');
      glyph(ctx, 'wide', c, x + (ws[i] * k) / 2, S.H * 0.8 + out * 300, size * k, { fill: c === 'O' ? (bg === P.red ? P.paperLight : P.red) : P.ink, sx: c === 'O' ? stretch : 1, sy: a });
      x += ws[i] * k;
    });
  },
};
T3.L057 = { pre: 0.02, post: 0.25, draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.1, S.H * 0.25, 170, lt, { font: 'gothic', fill: P.ink, times: charTimes(L, 0.2), inDur: 0.12, exitAt: dur }); } };
T3.L058 = { pre: 0, post: 0.25, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'DOWN.', S.W / 2, S.H * 0.52, 480, lt, dur, { fill: P.paper, stagger: 0.03 }); } };

// 羽が伸びる、縛りが解ける、空が撓む、鷲が舞う  +  English
T3.L059 = {
  pre: 0.02, post: 0.15,
  draw(ctx, S, L, lt, dur) {
    const parts = L.text.split('、');
    const k = clamp(Math.floor(lt / 1.2), 0, 3);
    const u = (lt - k * 1.2) / 1.2;
    if (lt > dur + 0.15) return;
    const bg = v3Bg(S.t);
    const fg = fgOn(bg), ac = acOn(bg);
    const txt = parts[k];
    const size = 150;
    const x = S.W * 0.86;
    const chars = Array.from(txt);
    let y = S.H * 0.1;
    chars.forEach((ch, i) => {
      const a = ew(u, i * 0.05, i * 0.05 + 0.2, 'outExpo');
      let dx = 0, dy = 0, rot = 0, sy = 1;
      if (k === 0) sy = 1 + ew(u, 0.2, 0.9, 'outCubic') * 0.6 * (i < 1 ? 1 : 0.3); // 羽 stretches
      if (k === 1) { const s = ew(u, 0.35, 1, 'outCubic'); dx = rnd(5, i, -1, 1) * s * 260; rot = rnd(6, i, -1, 1) * s * 1.2; }
      if (k === 2) { dx = -Math.sin((i / (chars.length - 1)) * Math.PI) * ew(u, 0, 0.9, 'inOutCubic') * 140; }
      if (k === 3) { dy = -ew(u, 0.3, 1, 'inCubic') * 300 * (1 + i * 0.3); rot = Math.sin(S.t * 8 + i) * 0.2 * u; }
      y += size * 0.5 * sy;
      if (a > 0) glyph(ctx, 'mincho', ch, x + dx, y + dy + (1 - a) * -100, size, { fill: i === 0 ? ac : fg, rot, sy });
      y += size * 0.52 * sy;
    });
  },
};
T3.L060 = {
  pre: 0, post: 0.15,
  draw(ctx, S, L, lt, dur) {
    const parts = L.text.replace(/\.$/, '').split(', ');
    const k = clamp(Math.floor(lt / 1.2), 0, 3);
    const u = (lt - k * 1.2) / 1.2;
    if (lt > dur + 0.15) return;
    const bg = v3Bg(S.t);
    const fg = fgOn(bg), ac = acOn(bg);
    const [w1, w2] = parts[k].toUpperCase().split(' ');
    const a1 = ew(u, 0, 0.25, 'outExpo'), a2 = ew(u, 0.15, 0.4, 'outExpo');
    const x = S.W * 0.06;
    textH(ctx, 'wide', w1, x, S.H * 0.72, 140, { fill: fg, align: 0 }, (i) => ({ alpha: a1, dx: (1 - a1) * -200 }));
    ctx.save();
    ctx.translate(x, S.H * 0.87);
    if (k === 0) ctx.scale(1 + ew(u, 0.2, 1, 'outCubic') * 0.5, 1); // stretch
    textH(ctx, 'wide', w2, 0, 0, 140, { fill: ac, align: 0 }, (i, n) => {
      let dx = 0, dy = 0, rot = 0;
      if (k === 1) { const s = ew(u, 0.35, 1, 'outCubic'); dx = (i - n / 2) * s * 60; rot = (i - n / 2) * s * 0.08; }
      if (k === 2) dy = -Math.sin((i / (n - 1)) * Math.PI) * ew(u, 0.1, 0.9, 'inOutCubic') * 90;
      if (k === 3) dy = -ew(u, 0.3, 1, 'inCubic') * 200 * (i / n);
      return { alpha: a2, dx, dy, rot };
    });
    ctx.restore();
  },
};
T3.L061 = { pre: 0.02, post: 0.15, draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.5, S.H * 0.5 - 220, 220, lt, { font: 'gothic', fill: P.paper, times: charTimes(L, 0.12), inDur: 0.1, exitAt: dur }); } };
T3.L062 = { pre: 0, post: 0.25, draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'DOWN.', S.W / 2, S.H * 0.52, 500, lt, dur, { fill: P.ink, dot: P.paperLight, stagger: 0.025 }); } };

// 落ちる×4 + Fall down×4 — accelerating cascade into the last chorus
T3.L063 = {
  pre: 0.02, post: 0.1,
  draw(ctx, S, L, lt, dur) {
    const slot = dur / 4;
    for (let k = 0; k < 4; k++) {
      const t0 = k * slot;
      if (lt < t0) continue;
      const u = lt - t0;
      const bg = v3Bg(L.start + t0 + 0.01);
      const col = k === 3 ? P.red : k % 2 ? P.paperLight : P.red;
      const x = S.W * [0.84, 0.62, 0.38, 0.16][k];
      const fall = Math.pow(u, 2.2) * 260;
      textV(ctx, 'gothic', '落ちる', x, S.H * 0.12 + fall, 200, { fill: v3Bg(S.t) === P.red && col === P.red ? P.ink : col }, (i) => {
        const a = ew(u, i * 0.06, i * 0.06 + 0.15, 'outExpo');
        return { alpha: a, dy: (1 - a) * -300 };
      });
    }
  },
};
T3.L064 = {
  pre: 0, post: 0.1,
  draw(ctx, S, L, lt, dur) {
    const slot = dur / 4;
    const bg = v3Bg(S.t);
    for (let k = 0; k < 4; k++) {
      const t0 = k * slot + 0.2;
      if (lt < t0) continue;
      const a = ew(lt, t0, t0 + 0.25, 'outExpo');
      const y = S.H * (0.22 + k * 0.2);
      const run = (lt - t0) * 500;
      textH(ctx, 'cond', 'FALL DOWN · FALL DOWN · FALL DOWN · FALL DOWN · ', (k % 2 ? S.W - run : run) - S.W * 0.5, y, 120, {
        fill: k % 2 ? acOn(bg) : fgOn(bg), align: 0, tracking: 0.04,
      }, () => ({ alpha: a * 0.9 }));
    }
  },
};
