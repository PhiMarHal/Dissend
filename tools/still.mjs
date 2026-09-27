// Render individual frames to PNG for review.
//   node tools/still.mjs 12.5 26 50.1 --out out/stills [--scale 0.5] [--sheet name]
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { loadVideo, ROOT } from './node-env.mjs';

const args = process.argv.slice(2);
let out = path.join(ROOT, 'out', 'stills');
let scale = 1;
let sheet = null;
const times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') out = args[++i];
  else if (args[i] === '--scale') scale = parseFloat(args[++i]);
  else if (args[i] === '--sheet') sheet = args[++i];
  else if (args[i].includes(':')) {
    // range a:b:step
    const [a, b, s] = args[i].split(':').map(Number);
    for (let t = a; t <= b + 1e-9; t += s) times.push(+t.toFixed(3));
  } else times.push(parseFloat(args[i]));
}
mkdirSync(out, { recursive: true });
const { video, canvas, ctx } = loadVideo();
const W = video.W, H = video.H;
const tw = Math.round(W * scale), th = Math.round(H * scale);
const cols = sheet ? Math.min(4, times.length) : 1;
const rows = sheet ? Math.ceil(times.length / cols) : 1;
const sc = sheet ? createCanvas(tw * cols, th * rows) : null;
const sctx = sc && sc.getContext('2d');
let k = 0;
for (const t of times) {
  const t0 = performance.now();
  video.render(ctx, canvas, t);
  const ms = performance.now() - t0;
  if (sheet) {
    sctx.drawImage(canvas, (k % cols) * tw, Math.floor(k / cols) * th, tw, th);
    sctx.fillStyle = '#0f0';
    sctx.font = '20px sans-serif';
    sctx.fillText(t.toFixed(2), (k % cols) * tw + 8, Math.floor(k / cols) * th + 24);
  } else {
    let img = canvas;
    if (scale !== 1) {
      img = createCanvas(tw, th);
      img.getContext('2d').drawImage(canvas, 0, 0, tw, th);
    }
    writeFileSync(path.join(out, `f_${t.toFixed(2).padStart(7, '0')}.png`), img.toBuffer('image/png'));
  }
  console.log(`t=${t.toFixed(2)} ${ms.toFixed(1)}ms`);
  k++;
}
if (sheet) writeFileSync(path.join(out, sheet + '.png'), sc.toBuffer('image/png'));
