// Shared typographic effects used by the lyric treatments.
import { TAU, clamp, lerp, seg, env, ew, ease, mod, h2, rnd, noise1, fract, mix, rgba } from './util.js';
import { P } from './palette.js';
import { textH, textV, glyph, widthOf, fitSize, layoutH, layoutV, metrics, hasCJK } from './type.js';

// ------------------------------------------------------------------ helpers
// Start time of glyph i: reviewed/automatic word timing when present,
// otherwise an even display stagger inside the line (a visual choice only).
export function charTimes(L, span = null) {
  const chars = Array.from(L.text);
  const out = new Array(chars.length);
  if (L.words && L.words.length) {
    let ci = 0;
    for (const w of L.words) {
      const wc = Array.from(w.text);
      for (let k = 0; k < wc.length; k++) out[ci++] = w.start + ((w.end - w.start) * k) / wc.length;
    }
    for (; ci < chars.length; ci++) out[ci] = L.end;
    return out;
  }
  const d = span ?? (L.end - L.start) * 0.7;
  for (let i = 0; i < chars.length; i++) out[i] = L.start + (d * i) / Math.max(1, chars.length - 1);
  return out;
}
// Words of an English line with display stagger across [a, b].
export function wordTimes(text, a, b) {
  const ws = text.split(' ');
  return ws.map((w, i) => ({ w, t: a + ((b - a) * i) / Math.max(1, ws.length - 1) }));
}

// Anton "Fall." / "Down." with a red period that keeps falling.
export function bigWord(ctx, S, word, x, y, size, lt, dur, o = {}) {
  const { fill = P.ink, dot = P.red, font = 'anton', stagger = 0.05, exit = 0.45, from = -1, clipY = null, tracking = 0.01 } = o;
  const base = word.replace(/[.!]$/, '');
  const hasDot = /\.$/.test(word);
  const w = widthOf(font, base, size, tracking);
  const m = metrics(font);
  ctx.save();
  if (clipY !== null) {
    ctx.beginPath();
    ctx.rect(-100, -100, S.W + 200, clipY + 100);
    ctx.clip();
  }
  const out = Math.max(0, lt - dur);
  textH(ctx, font, base, x - (hasDot ? size * 0.09 : 0), y, size, { fill, tracking }, (i, n) => {
    const a = ew(lt, i * stagger, i * stagger + 0.22, 'outExpo');
    if (a <= 0) return false;
    const fallOut = out > 0 ? Math.pow(Math.max(0, out - (n - i) * 0.03), 2) * 5200 : 0;
    return { dy: from * (1 - a) * size * 1.4 + fallOut, alpha: clamp(a * 3) };
  });
  ctx.restore();
  if (hasDot) {
    const n = base.length;
    const a = ew(lt, n * stagger + 0.05, n * stagger + 0.3, 'outBack');
    const r = size * 0.085;
    const dx = x - (hasDot ? size * 0.09 : 0) + w / 2 + size * 0.1;
    const dy = y + m.asc * size / 2 - r;
    const fallOut = out > 0 ? Math.pow(out, 1.6) * 900 : 0;
    if (a > 0) {
      ctx.save();
      ctx.fillStyle = dot;
      // streak trail above the dot as it falls
      if (fallOut > 4) {
        ctx.globalAlpha = 0.5;
        ctx.fillRect(dx - r * 0.35, dy + fallOut - Math.min(fallOut, 400), r * 0.7, Math.min(fallOut, 400));
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(dx, dy + fallOut, r * a, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  return w;
}

// Vertical 落ちる / 下へ column that drops in glyph by glyph and falls out.
export function dropColumn(ctx, S, L, x, y, size, lt, o = {}) {
  const { font = 'mincho', fill = P.ink, lead = 1.02, exitAt = L.end - L.start, streak = true, times = charTimes(L, 0.25), inDur = 0.3, exitK = 4200, stroke = null, lw = 0 } = o;
  const out = Math.max(0, lt - exitAt);
  textV(ctx, font, L.text, x, y, size, { fill, lead, stroke, lw }, (i, n, g, gx, gy) => {
    const ti = times[i] - L.start;
    const a = ew(lt, ti, ti + inDur, 'outExpo');
    if (a <= 0) return false;
    const dy = -(1 - a) * S.H * 0.7 + Math.pow(Math.max(0, out - (n - 1 - i) * 0.04), 2) * exitK;
    if (streak && a < 0.98) {
      ctx.fillStyle = rgba(fill, 0.5 * (1 - a));
      ctx.fillRect(gx - size * 0.04, gy + dy - size * 3, size * 0.08, size * 3);
    }
    return { dy, alpha: clamp(a * 2.5) };
  });
}

