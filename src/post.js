// Print-like finishing: paper tooth, dust, vignette, chromatic split, flashes.
import { mulberry, clamp, lerp } from './util.js';

export function makePaperTextures(makeCanvas, W, H, seed = 7) {
  const rand = mulberry(seed);
  // low-frequency mottling: small random canvas scaled up smoothly
  const sw = Math.ceil(W / 24), sh = Math.ceil(H / 24);
  const small = makeCanvas(sw, sh);
  const sctx = small.getContext('2d');
  const sid = sctx.createImageData(sw, sh);
  for (let i = 0; i < sw * sh; i++) {
    const v = 128 + (rand() - 0.5) * 70;
    sid.data[i * 4] = sid.data[i * 4 + 1] = sid.data[i * 4 + 2] = v;
    sid.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(sid, 0, 0);
  const mott = makeCanvas(W, H);
  const mctx = mott.getContext('2d');
  mctx.imageSmoothingEnabled = true;
  mctx.drawImage(small, 0, 0, W, H);
  const mdata = mctx.getImageData(0, 0, W, H).data;

  // multiply layer: near-white with tooth + fibres
  const mul = makeCanvas(W, H);
  const mul2 = mul.getContext('2d');
  const md = mul2.createImageData(W, H);
  // screen layer: near-black with dust specks
  const scr = makeCanvas(W, H);
  const scr2 = scr.getContext('2d');
  const sd = scr2.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const m = (mdata[i * 4] - 128) / 70; // -0.5..0.5
    const g = rand();
    const v = 247 - m * 16 - g * 12 - (g > 0.985 ? 26 : 0);
    md.data[i * 4] = v;
    md.data[i * 4 + 1] = v - 1.5;
    md.data[i * 4 + 2] = v - 4;
    md.data[i * 4 + 3] = 255;
    const s = g > 0.9965 ? 40 + rand() * 60 : rand() * 9 + m * 6;
    sd.data[i * 4] = sd.data[i * 4 + 1] = sd.data[i * 4 + 2] = Math.max(0, s);
    sd.data[i * 4 + 3] = 255;
  }
  mul2.putImageData(md, 0, 0);
  scr2.putImageData(sd, 0, 0);
  // fibres
  for (const [c2, col, n] of [[mul2, 'rgba(120,100,80,0.10)', 900], [scr2, 'rgba(255,245,230,0.07)', 500]]) {
    c2.strokeStyle = col;
    c2.lineWidth = 0.8;
    for (let k = 0; k < n; k++) {
      const x = rand() * W, y = rand() * H, a = rand() * Math.PI * 2, L = 6 + rand() * 30;
      c2.beginPath();
      c2.moveTo(x, y);
      c2.quadraticCurveTo(x + Math.cos(a + 0.6) * L * 0.5, y + Math.sin(a + 0.6) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L);
      c2.stroke();
    }
  }
  return { mul, scr };
}

export function vignette(ctx, W, H, amount, color = '#000') {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// RGB split: split frame into red and cyan copies offset horizontally.
export function chromaSplit(ctx, canvas, tmpA, tmpB, W, H, dx, dy = 0) {
  if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) return;
  const a = tmpA.getContext('2d'), b = tmpB.getContext('2d');
  a.globalCompositeOperation = 'copy';
  a.drawImage(canvas, 0, 0);
  a.globalCompositeOperation = 'multiply';
  a.fillStyle = '#ff0000';
  a.fillRect(0, 0, W, H);
  b.globalCompositeOperation = 'copy';
  b.drawImage(canvas, 0, 0);
  b.globalCompositeOperation = 'multiply';
  b.fillStyle = '#00ffff';
  b.fillRect(0, 0, W, H);
  // copies are scaled up slightly so the shifted edges never expose a gap
  const k = 1 + (2 * (Math.abs(dx) + Math.abs(dy)) + 4) / W;
  const ow = W * k, oh = H * k, ox = (W - ow) / 2, oy = (H - oh) / 2;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'copy';
  ctx.drawImage(tmpB, ox - dx, oy - dy, ow, oh);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(tmpA, ox + dx, oy + dy, ow, oh);
  ctx.restore();
}

// Horizontal slice displacement (a glitchy "tear" used on impacts).
export function sliceShift(ctx, canvas, tmp, W, H, slices, amp, seedFn) {
  if (amp < 0.5) return;
  const c = tmp.getContext('2d');
  c.globalCompositeOperation = 'copy';
  c.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let y = 0;
  for (let i = 0; y < H; i++) {
    const h = Math.max(8, H / slices * (0.3 + seedFn(i, 0) * 1.4));
    const dx = (seedFn(i, 1) - 0.5) * 2 * amp * (seedFn(i, 2) > 0.45 ? 1 : 0.1);
    ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
    y += h;
  }
  ctx.restore();
}
