// Every lyric line gets its own typographic treatment, keyed by source_line_id.
// Line text and timing come from data/*.json; this file only decides the look.
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba } from './util.js';
import { P } from './palette.js';
import * as M from './motifs.js';
import { textH, textV, glyph, widthOf, fitSize, layoutH, layoutV, metrics, hasCJK } from './type.js';
import { horizonY, cageState } from './scenes.js';
import { charTimes, wordTimes, bigWord, dropColumn } from './typefx.js';
import { T2 } from './lyrics2.js';
import { T3 } from './lyrics3.js';

// ------------------------------------------------------------------ treatments
const T = {};

// ---------------- Verse 1 ----------------
T.L001 = { // 落ちる — the first word
  pre: 0.1, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const size = 250;
    dropColumn(ctx, S, L, S.W / 2, S.H / 2 - size * 1.53, size, lt, { exitAt: dur + 0.05, inDur: 0.35 });
    // a thin red plumb line through the column
    const a = env(lt, 0, dur + 0.5, 0.4, 0.3);
    ctx.fillStyle = rgba(P.red, a);
    ctx.fillRect(S.W / 2 + size * 0.72, -20, 4, S.H * ew(lt, 0, dur, 'outCubic') + 20);
  },
};
T.L002 = { // Fall.
  pre: 0, post: 0.8,
  draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'FALL.', S.W / 2, S.H * 0.52, 470, lt, dur, { stagger: 0.07 }); },
};

T.L003 = { // 空の指の間から光が零れる
  pre: 0.05, post: 0.8,
  draw(ctx, S, L, lt, dur) {
    const times = charTimes(L);
    const size = 70, x = S.W * 0.84, y = S.H * 0.08;
    const out = ew(lt, dur + 0.1, dur + 0.8, 'inCubic');
    textV(ctx, 'mincho', L.text, x, y, size, { fill: P.ink, lead: 1.08 }, (i) => {
      const ti = times[i] - L.start;
      const a = ew(lt, ti - 0.05, ti + 0.35, 'outCubic');
      if (a <= 0) return false;
      const light = i >= 6; // 光が零れる — light spills
      return { dy: (1 - a) * -30 + out * 600 * (1 + i * 0.05), alpha: a * (1 - out), fill: light && lt > ti + 0.3 ? P.redDeep : P.ink };
    });
    // droplets of light spilling from the last glyphs
    const k0 = times[6] - L.start;
    if (lt > k0) {
      ctx.fillStyle = P.paperLight;
      for (let k = 0; k < 26; k++) {
        const life = fract((lt - k0) * 0.7 + h2(6, k));
        ctx.globalAlpha = (1 - life) * (1 - out);
        ctx.beginPath();
        ctx.arc(x + rnd(6, k + 1, -60, 60), y + size * 8 + life * S.H * 0.5, 3 + rnd(6, k + 2, 0, 5), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  },
};
T.L004 = { // Light spills through the fingers of the sky.
  pre: 0.1, post: 0.9,
  draw(ctx, S, L, lt, dur) {
    const rows = [['Light', 230, 'italic'], ['spills through', 92, 'italic'], ['the fingers', 92, 'italic'], ['of the sky.', 92, 'italic']];
    const x = S.W * 0.62, y0 = S.H * 0.43;
    const out = ew(lt, dur + 0.1, dur + 0.9, 'inCubic');
    let y = y0;
    rows.forEach(([txt, size, font], r) => {
      const t0 = [0, 0.7, 1.6, 2.5][r];
      const a = ew(lt, t0, t0 + 0.6, 'outExpo');
      if (a > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y - size * 0.75, S.W, size * 1.3);
        ctx.clip();
        const isLight = r === 0;
        textH(ctx, font, txt, x + (r === 0 ? -60 : 40), y + (1 - a) * size + out * 400, size, {
          fill: isLight ? P.paperLight : P.ink, align: 0.5, stroke: isLight ? P.ink : null, lw: 3,
        }, (i, n) => ({ alpha: 1 - out }));
        ctx.restore();
      }
      y += size * (r === 0 ? 0.95 : 1.05);
    });
  },
};
T.L005 = { // 落ちる (quick)
  pre: 0.05, post: 0.5,
  draw(ctx, S, L, lt, dur) { dropColumn(ctx, S, L, S.W * 0.12, S.H * 0.18, 150, lt, { exitAt: dur, times: charTimes(L, 0.2), inDur: 0.18 }); },
};
T.L006 = { // Fall. sinking behind the horizon
  pre: 0, post: 0.7,
  draw(ctx, S, L, lt, dur) {
    const hy = horizonY(S.t, S.H);
    bigWord(ctx, S, 'FALL.', S.W / 2, hy - 190, 300, lt, dur - 0.3, { clipY: hy - 3, exit: 0.6 });
  },
};
T.L007 = { // 翼ある瞼が地平線に輝く — rising along the horizon
  pre: 0.05, post: 0.7,
  draw(ctx, S, L, lt, dur) {
    const hy = horizonY(S.t, S.H);
    const times = charTimes(L);
    const chars = Array.from(L.text);
    const size = 66;
    const out = ew(lt, dur + 0.05, dur + 0.7, 'inCubic');
    ctx.save();
    ctx.beginPath();
    ctx.rect(-50, -50, S.W + 100, hy - 3 + 50);
    ctx.clip();
    chars.forEach((ch, i) => {
      const left = i < 5;
      const x = left ? lerp(S.W * 0.07, S.W * 0.31, i / 4) : lerp(S.W * 0.69, S.W * 0.93, (i - 5) / 5);
      const ti = times[i] - L.start;
      const a = ew(lt, ti - 0.05, ti + 0.4, 'outBack');
      if (a <= 0) return;
      const shine = i >= 9 && lt > ti;
      glyph(ctx, 'mincho', ch, x, hy - size * 0.75 + (1 - a) * size * 1.6 + out * size * 1.6, size, { fill: shine ? P.red : P.ink });
    });
    ctx.restore();
  },
};
T.L008 = { // Winged eyelids shine in the horizon.
  pre: 0.1, post: 0.45,
  draw(ctx, S, L, lt, dur) {
    const hy = horizonY(S.t, S.H);
    const out = ew(lt, dur - 0.2, dur + 0.45, 'inCubic');
    const ws = [['Winged', 0], ['eyelids', 0.45], ['shine', 1.3], ['in the horizon.', 2.2]];
    const lines = [[ws[0], ws[1]], [ws[2], ws[3]]];
    const size = 104;
    lines.forEach((row, r) => {
      const txt = row.map((w) => w[0]).join(' ');
      const y = hy + 115 + r * size * 1.02;
      let acc = 0;
      const total = widthOf('italic', txt, size);
      row.forEach(([w, t0], k) => {
        const ww = widthOf('italic', w + ' ', size);
        const a = ew(lt, t0, t0 + 0.7, 'outExpo');
        if (a > 0) {
          const x = S.W / 2 - total / 2 + acc;
          const isShine = w === 'shine';
          textH(ctx, 'italic', w, x, y + (1 - a) * 40 + out * 300, size, { fill: isShine ? P.red : P.ink, align: 0 }, () => ({ alpha: a * (1 - out) }));
          if (isShine && lt > t0) {
            const sp = env(lt, t0 + 0.1, t0 + 2.4, 0.1, 0.8);
            for (let k = 0; k < 4; k++) M.sparkle(ctx, x + rnd(8, k, 0, ww), y - size * rnd(8, k + 5, 0.2, 0.7), 16 * sp * (0.6 + 0.4 * Math.sin(S.t * 6 + k)), P.red, 0);
          }
        }
        acc += ww;
      });
    });
  },
};
T.L009 = { // 落ちる — the drop
  pre: 0, post: 0.15,
  draw(ctx, S, L, lt, dur) {
    const a = ew(lt, 0, 0.14, 'outExpo');
    const out = ew(lt, dur - 0.12, dur + 0.08, 'inCubic');
    const sc = lerp(2.4, 1, a) * (1 + out * 3);
    ctx.save();
    ctx.translate(S.W / 2, S.H / 2);
    ctx.scale(sc, sc);
    ctx.globalAlpha = 1 - out;
    textH(ctx, 'gothic', L.text, 0, 0, 300, { fill: P.red, align: 0.5 });
    ctx.restore();
  },
};
T.L010 = { // Fall. — full width slam
  pre: 0, post: 0.5,
  draw(ctx, S, L, lt, dur) {
    const size = fitSize('wide', 'FALL', S.W * 0.84);
    textH(ctx, 'wide', 'FALL', S.W / 2, S.H / 2, size, { fill: P.ink }, (i, n) => {
      const a = ew(lt, i * 0.06, i * 0.06 + 0.16, 'outExpo');
      if (a <= 0) return false;
      const out = Math.max(0, lt - dur + 0.3 - i * 0.05);
      return { sy: lerp(2.2, 1, a), dy: out * out * 6000, alpha: clamp(a * 3) };
    });
    const a = ew(lt, 0.3, 0.5, 'outBack');
    const out = Math.max(0, lt - dur + 0.1);
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.arc(S.W * 0.955, S.H / 2 + size * 0.28 + out * out * 3000, 34 * a, 0, TAU);
    ctx.fill();
  },
};
T.L011 = { // 形、移ろい、脱ぎ、沈む
  pre: 0.05, post: 0.6,
  draw(ctx, S, L, lt, dur) {
    const words = L.text.split('、');
    const size = 165;
    const out = ew(lt, dur + 0.05, dur + 0.6, 'inCubic');
    words.forEach((w, k) => {
      const t0 = k * 1.0;
      const a = ew(lt, t0, t0 + 0.35, 'outExpo');
      if (a <= 0) return;
      const x = S.W * (0.85 - k * 0.22);
      const y = S.H * 0.14;
      const colH = Array.from(w).length * size;
      const drop = out * S.H * (1 + k * 0.2);
      if (k === 0) { // 形 — a frame draws around the form
        const f = ew(lt, t0 + 0.1, t0 + 0.7, 'inOutCubic');
        ctx.strokeStyle = P.red;
        ctx.lineWidth = 6;
        const bx = x - size * 0.75, by = y - size * 0.25 + drop, bw = size * 1.5, bh = size * 1.5;
        ctx.beginPath();
        const per = f * 4;
        const pts = [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]];
        ctx.moveTo(bx, by);
        for (let s = 0; s < 4; s++) {
          const u = clamp(per - s);
          if (u <= 0) break;
          ctx.lineTo(lerp(pts[s][0], pts[s + 1][0], u), lerp(pts[s][1], pts[s + 1][1], u));
        }
        ctx.stroke();
      }
      if (k === 1) { // 移ろい — echoes sliding
        for (let e = 3; e >= 1; e--) {
          const dx = Math.sin((lt - t0) * 3) * 50 * e * a;
          textV(ctx, 'mincho', w, x + dx, y + drop, size, { fill: rgba(P.red, 0.22 * (4 - e)) });
        }
      }
      if (k === 2) { // 脱ぎ — outline skins peel off
        for (let e = 1; e <= 3; e++) {
          const u = ew(lt, t0 + 0.15 * e, t0 + 1.4 + 0.15 * e, 'outCubic');
          ctx.save();
          ctx.translate(x + u * 70 * e, y - u * 90 * e + drop);
          ctx.rotate(u * 0.12 * e);
          ctx.globalAlpha = 1 - u;
          textV(ctx, 'mincho', w, 0, 0, size, { fill: null, stroke: P.red, lw: 2.5 });
          ctx.restore();
        }
      }
      ctx.save();
      if (k === 3) { // 沈む — sinking under a line
        const ly = y + colH + 10;
        ctx.fillStyle = P.ink;
        ctx.fillRect(x - size * 0.9, ly + drop, size * 1.8, 6);
        ctx.beginPath();
        ctx.rect(x - size, -S.H, size * 2, ly + S.H + drop);
        ctx.clip();
      }
      const sink = k === 3 ? ew(lt, t0 + 0.4, dur, 'inOutCubic') * colH * 0.55 : 0;
      textV(ctx, 'mincho', w, x, y + drop + sink, size, { fill: P.ink }, () => ({ dy: (1 - a) * -80, alpha: a }));
      ctx.restore();
    });
  },
};
T.L012 = { // Shapes, Shift, Shed, Sink.
  pre: 0, post: 0.25,
  draw(ctx, S, L, lt, dur) {
    const words = ['SHAPES', 'SHIFT', 'SHED', 'SINK'];
    const slot = 0.575;
    const k = clamp(Math.floor(lt / slot), 0, 3);
    const u = (lt - k * slot) / slot;
    if (lt > dur + 0.25) return;
    const w = words[k];
    const fills = [P.paper, P.ink, P.red, P.red];
    const size = Math.min(fitSize('wide', w, S.W * 0.86), 380);
    const cy = S.H / 2;
    const L0 = layoutH('wide', w);
    const x0 = S.W / 2 - (L0.width * size) / 2;
    if (k === 0) {
      // geometric primitives behind each letter
      L0.glyphs.forEach((g, i) => {
        const a = ew(u, i * 0.06, i * 0.06 + 0.3, 'outBack');
        const gx = x0 + g.x * size, r = size * 0.42 * a;
        ctx.fillStyle = P.red;
        ctx.beginPath();
        if (i % 3 === 0) ctx.arc(gx, cy, r, 0, TAU);
        else if (i % 3 === 1) ctx.rect(gx - r, cy - r, r * 2, r * 2);
        else { ctx.moveTo(gx, cy - r); ctx.lineTo(gx + r, cy + r * 0.8); ctx.lineTo(gx - r, cy + r * 0.8); ctx.closePath(); }
        ctx.fill();
      });
    }
    if (k === 2) {
      for (let e = 1; e <= 3; e++) {
        const pe = ew(u, 0.1 + e * 0.08, 1, 'outCubic');
        ctx.globalAlpha = 1 - pe;
        textH(ctx, 'wide', w, S.W / 2 + pe * 40 * e, cy - pe * 70 * e, size * (1 + pe * 0.1 * e), { fill: null, stroke: P.ink, lw: 3 });
        ctx.globalAlpha = 1;
      }
    }
    ctx.save();
    if (k === 3) {
      ctx.beginPath();
      ctx.rect(0, 0, S.W, cy + size * 0.42);
      ctx.clip();
      ctx.fillStyle = P.red;
      ctx.fillRect(S.W * 0.05, cy + size * 0.42, S.W * 0.9, 8);
    }
    textH(ctx, 'wide', w, S.W / 2, cy, size, { fill: fills[k] }, (i, n) => {
      const a = ew(u, i * 0.04, i * 0.04 + 0.22, 'outExpo');
      if (k === 1) return { dx: (i % 2 ? 1 : -1) * (1 - a) * 300, alpha: a };
      if (k === 3) return { dy: ew(u, 0.25 + i * 0.07, 0.9 + i * 0.03, 'inCubic') * size * 1.1 + (1 - a) * -60, alpha: a };
      return { sy: lerp(1.6, 1, a), alpha: a };
    });
    ctx.restore();
  },
};
T.L013 = { // 落ちる — inside the cage, glyph by glyph
  pre: 0.05, post: 0.4,
  draw(ctx, S, L, lt, dur) {
    dropColumn(ctx, S, L, S.W / 2, S.H * 0.5 - 180 * 1.5, 180, lt, { exitAt: dur + 0.05, inDur: 0.3, fill: P.ink });
  },
};
T.L014 = { // Fall. behind bars
  pre: 0, post: 0.6,
  draw(ctx, S, L, lt, dur) { bigWord(ctx, S, 'FALL.', S.W / 2, S.H * 0.5, 340, lt, dur - 0.2, { fill: P.ink }); },
};
T.L015 = { // 鳥籠は遠く彼方へ — receding with the cage
  pre: 0.05, post: 0.9,
  draw(ctx, S, L, lt, dur) {
    const times = charTimes(L);
    const chars = Array.from(L.text);
    let y = S.H * 0.13;
    const out = ew(lt, dur + 0.1, dur + 0.9, 'inCubic');
    const x = S.W * 0.2;
    chars.forEach((ch, i) => {
      const far = Math.max(0, i - 2);
      const size = 112 * Math.pow(0.84, far);
      const ti = times[i] - L.start;
      const a = ew(lt, ti - 0.05, ti + 0.4, 'outExpo');
      y += size * 0.5 + far * 10;
      if (a > 0) glyph(ctx, 'mincho', ch, x, y + (1 - a) * -60 + out * 500, size, { fill: i >= 3 ? mix(P.ink, P.sand, far * 0.1) : P.ink });
      y += size * 0.52;
    });
    // 鳥籠 label drifts with the cage
  },
};
T.L016 = { // Gone and distant is the aviary.
  pre: 0.05, post: 0.35,
  draw(ctx, S, L, lt, dur) {
    const out = ew(lt, dur - 0.15, dur + 0.35, 'inCubic');
    const x = S.W * 0.08;
    const aGone = ew(lt, 0, 0.6, 'outExpo');
    // "Gone" drifts left, away from us
    textH(ctx, 'italic', 'Gone', x - lt * 12, S.H * 0.5 + (1 - aGone) * 60, 330, { fill: P.ink, align: 0 }, () => ({ alpha: aGone * (1 - out) }));
    const aDist = ew(lt, 0.9, 1.6, 'outCubic');
    const track = lerp(0.02, 0.9, ew(lt, 0.9, dur, 'outCubic'));
    textH(ctx, 'wideThin', 'AND DISTANT', x, S.H * 0.72, 44, { fill: P.ink, tracking: track, align: 0 }, () => ({ alpha: aDist * (1 - out) }));
    // "is the aviary." clings to the cage as it shrinks into the sky
    const c = cageState(S.t, S.H);
    const aAv = ew(lt, 2.0, 2.8, 'outCubic');
    const size = clamp(c.r * 0.55, 26, 64);
    textH(ctx, 'italic', 'is the aviary.', S.W / 2, c.baseY + c.r * 0.25 + size * 0.9, size, { fill: P.red }, () => ({ alpha: aAv * (1 - out) }));
  },
};

// ------------------------------------------------------------------ default
function fallback(ctx, S, L, lt, dur) {
  const a = env(lt, -0.1, dur + 0.3, 0.3, 0.3);
  const cj = hasCJK(L.text);
  const size = cj ? 84 : 76;
  const w = widthOf(cj ? 'mincho' : 'italic', L.text, size);
  const s = Math.min(size, (size * S.W * 0.9) / w);
  const y = L.sung ? S.H * 0.5 : S.H * 0.68;
  textH(ctx, cj ? 'mincho' : 'italic', L.text, S.W / 2, y + (1 - a) * 30, s, { fill: S.t > 73.7 && S.t < 98.3 ? P.paperLight : P.ink }, () => ({ alpha: a }));
}

Object.assign(T, T2, T3);

export function drawLyrics(ctx, S) {
  const { t, TL } = S;
  for (const L of TL.lines) {
    const tr = T[L.id];
    const pre = tr ? tr.pre : 0.2, post = tr ? tr.post : 0.4;
    if (t < L.start - pre || t > L.end + post) continue;
    const lt = t - L.start, dur = L.end - L.start;
    ctx.save();
    if (tr) tr.draw(ctx, S, L, lt, dur);
    else fallback(ctx, S, L, lt, dur);
    ctx.restore();
  }
}
