// Typography helpers: font registry, cached measurement, per-glyph layout
// (horizontal and vertical/tategaki) and a per-glyph animated draw call.

export const FONTS = {
  mincho: { family: 'DS Mincho', file: 'NotoSerifJP-Black.ttf' },
  minchoLight: { family: 'DS Mincho Light', file: 'NotoSerifJP-ExtraLight.ttf' },
  gothic: { family: 'DS Gothic', file: 'DelaGothicOne.ttf' },
  anton: { family: 'DS Anton', file: 'Anton.ttf' },
  serif: { family: 'DS Serif', file: 'InstrumentSerif.ttf' },
  italic: { family: 'DS Serif Italic', file: 'InstrumentSerif-Italic.ttf' },
  wide: { family: 'DS Wide', file: 'Archivo-ExpandedBlack.ttf' },
  wideThin: { family: 'DS Wide Thin', file: 'Archivo-ExpandedThin.ttf' },
  cond: { family: 'DS Cond', file: 'Archivo-CondensedBlack.ttf' },
  sans: { family: 'DS Sans', file: 'Archivo-Medium.ttf' },
};

export const fontCss = (key, size) => `${Math.max(0.5, size).toFixed(2)}px "${FONTS[key].family}"`;

const REF = 100;
let mctx = null;
export function setMeasureContext(ctx) { mctx = ctx; }

const wCache = new Map();
export function measure(key, text) {
  const k = key + '\u0000' + text;
  let w = wCache.get(k);
  if (w === undefined) {
    mctx.font = fontCss(key, REF);
    w = mctx.measureText(text).width / REF;
    wCache.set(k, w);
  }
  return w; // width per 1px of font size
}

const bCache = new Map();
// vertical metrics (per 1px of size) measured from a reference glyph
export function metrics(key, ref = null) {
  const r = ref || (isCJK(key) ? '国' : 'H');
  const k = key + '\u0000' + r;
  let m = bCache.get(k);
  if (!m) {
    mctx.font = fontCss(key, REF);
    mctx.textBaseline = 'alphabetic';
    const mm = mctx.measureText(r);
    m = { asc: mm.actualBoundingBoxAscent / REF, desc: mm.actualBoundingBoxDescent / REF };
    m.mid = (m.asc - m.desc) / 2; // distance from baseline up to the visual centre
    bCache.set(k, m);
  }
  return m;
}
const isCJK = (key) => key === 'mincho' || key === 'minchoLight' || key === 'gothic';
export const hasCJK = (s) => /[　-鿿]/.test(s);

// ---------------------------------------------------------------- layout
const lCache = new Map();
// Horizontal layout; glyph x = centre of glyph, per 1px of size.
export function layoutH(key, text, tracking = 0) {
  const k = key + '\u0000' + text + '\u0000' + tracking;
  let L = lCache.get(k);
  if (L) return L;
  const chars = Array.from(text);
  const glyphs = [];
  let prefix = '';
  let x = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const before = measure(key, prefix);
    prefix += ch;
    const after = measure(key, prefix);
    const w = measure(key, ch);
    // keep kerning from prefix measurement, add tracking per glyph
    const left = before + i * tracking;
    glyphs.push({ ch, i, x: left + w / 2, w, left });
    x = after + (i + 1) * tracking;
  }
  L = { glyphs, width: chars.length ? x - tracking : 0 };
  lCache.set(k, L);
  return L;
}

// Vertical (tategaki) layout; glyph y = centre of the em box, per 1px of size.
export function layoutV(text, lead = 1.0) {
  const chars = Array.from(text);
  const glyphs = [];
  let y = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const g = { ch, i, y: y + 0.5, dx: 0, dy: 0, rot: 0, adv: lead };
    if (ch === 'ー') g.rot = Math.PI / 2;
    if (ch === '、' || ch === '。') { g.dx = 0.62; g.dy = -0.62; g.adv = lead * 0.55; }
    glyphs.push(g);
    y += g.adv;
  }
  return { glyphs, height: y };
}

// ---------------------------------------------------------------- drawing
// Draw one glyph centred at (x,y) with transform.
export function glyph(ctx, key, ch, x, y, size, o = {}) {
  const m = metrics(key);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.sx !== undefined || o.sy !== undefined) ctx.scale(o.sx ?? 1, o.sy ?? 1);
  if (o.skew) ctx.transform(1, 0, o.skew, 1, 0, 0);
  ctx.font = fontCss(key, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const by = m.mid * size;
  if (o.fill !== null) {
    ctx.fillStyle = o.fill || '#000';
    ctx.fillText(ch, 0, by);
  }
  if (o.stroke) {
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lw || 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(ch, 0, by);
  }
  ctx.restore();
}

// Draw a whole string (horizontal) with optional per-glyph animation fn.
// align: 0 = left, 0.5 = centre, 1 = right. y is the visual centre line.
export function textH(ctx, key, text, x, y, size, o = {}, fn = null) {
  const L = layoutH(key, text, o.tracking || 0);
  const x0 = x - L.width * size * (o.align ?? 0.5);
  const n = L.glyphs.length;
  for (const g of L.glyphs) {
    if (g.ch === ' ') continue;
    let gx = x0 + g.x * size, gy = y;
    let st = { fill: o.fill, stroke: o.stroke, lw: o.lw, rot: 0, sx: o.sx, sy: o.sy, skew: o.skew, alpha: 1 };
    if (fn) {
      const r = fn(g.i, n, g, gx, gy);
      if (r === false) continue;
      if (r) {
        gx += r.dx || 0; gy += r.dy || 0;
        st = { ...st, ...r };
      }
    }
    if (st.alpha <= 0.002) continue;
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * st.alpha;
    glyph(ctx, key, g.ch, gx, gy, size * (st.scale ?? 1), st);
    ctx.globalAlpha = pa;
  }
  return L.width * size;
}

// Vertical Japanese text. (x,y) = centre-x, top-y of the column.
export function textV(ctx, key, text, x, y, size, o = {}, fn = null) {
  const L = layoutV(text, o.lead || 1.0);
  const n = L.glyphs.length;
  const y0 = y - L.height * size * (o.valign ?? 0);
  for (const g of L.glyphs) {
    let gx = x + g.dx * size * 0.5, gy = y0 + g.y * size + g.dy * size * 0.5;
    let st = { fill: o.fill, stroke: o.stroke, lw: o.lw, rot: g.rot, alpha: 1, sx: o.sx, sy: o.sy };
    if (fn) {
      const r = fn(g.i, n, g, gx, gy);
      if (r === false) continue;
      if (r) {
        gx += r.dx || 0; gy += r.dy || 0;
        st = { ...st, ...r, rot: (r.rot || 0) + g.rot };
      }
    }
    if (st.alpha <= 0.002) continue;
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * st.alpha;
    glyph(ctx, key, g.ch, gx, gy, size * (st.scale ?? 1), st);
    ctx.globalAlpha = pa;
  }
  return L.height * size;
}

export const widthOf = (key, text, size, tracking = 0) => layoutH(key, text, tracking).width * size;
// size that makes text exactly `w` pixels wide
export const fitSize = (key, text, w, tracking = 0) => w / Math.max(1e-6, layoutH(key, text, tracking).width);
