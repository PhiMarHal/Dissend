// Render the music video.
//
//   node tools/render.mjs                       # full 1920x1080 @ 60fps -> out/Dissend.mp4
//   node tools/render.mjs --scale 0.5 --fps 30  # quick 960x540 preview
//   node tools/render.mjs --from 70 --to 100    # a time range (audio trimmed to match)
//
// Frames are rendered in parallel worker processes, each piping raw RGBA into
// its own x264 encoder. Chunks are concatenated without re-encoding and the
// original Opus audio from Dissend.webm is stream-copied, untouched.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './node-env.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : def;
};
const flag = (name) => argv.includes('--' + name);

const FPS = parseFloat(opt('fps', '60'));
const SCALE = parseFloat(opt('scale', '1'));
const CRF = opt('crf', SCALE < 1 ? '23' : '17');
const PRESET = opt('preset', SCALE < 1 ? 'veryfast' : 'slow');
const AUDIO = path.join(ROOT, 'Dissend.webm');
const DURATION = 271.5;

async function worker() {
  const { loadVideo } = await import('./node-env.mjs');
  const f0 = parseInt(opt('f0')), f1 = parseInt(opt('f1'));
  const out = opt('out');
  const { video, canvas, ctx } = loadVideo({ scale: SCALE });
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${video.PW}x${video.PH}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-threads', opt('x264threads', '2'),
    '-x264-params', 'keyint=' + Math.round(FPS * 4),
    out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    video.render(ctx, canvas, f / FPS);
    await write(canvas.data());
    if ((f - f0) % 120 === 0) process.stdout.write(`[${opt('id')}] ${f - f0}/${f1 - f0} ${((f - f0) / ((Date.now() - t0) / 1000 + 1e-9)).toFixed(1)} fps\n`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res())));
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', (c) => (c ? rej(new Error(cmd + ' exited ' + c)) : res()));
  });
}

async function main() {
  const from = parseFloat(opt('from', '0'));
  const to = Math.min(DURATION, parseFloat(opt('to', String(DURATION))));
  const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
  const nWorkers = parseInt(opt('workers', String(Math.max(1, os.cpus().length))));
  const outFile = opt('out', path.join(ROOT, 'out', SCALE < 1 ? 'Dissend-preview.mp4' : 'Dissend.mp4'));
  const work = path.join(ROOT, 'out', 'chunks');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const total = f1 - f0;
  const per = Math.ceil(total / nWorkers);
  const chunks = [];
  const t0 = Date.now();
  const jobs = [];
  for (let w = 0; w < nWorkers; w++) {
    const a = f0 + w * per, b = Math.min(f1, a + per);
    if (a >= b) break;
    const file = path.join(work, `chunk_${String(w).padStart(3, '0')}.mp4`);
    chunks.push(file);
    const args = [path.join(ROOT, 'tools', 'render.mjs'), '--worker', '--id', String(w), '--f0', String(a), '--f1', String(b), '--out', file,
      '--fps', String(FPS), '--scale', String(SCALE), '--crf', CRF, '--preset', PRESET, '--x264threads', opt('x264threads', '2')];
    jobs.push(run(process.execPath, args));
  }
  await Promise.all(jobs);
  const list = path.join(work, 'list.txt');
  writeFileSync(list, chunks.map((c) => `file '${c}'`).join('\n'));
  mkdirSync(path.dirname(outFile), { recursive: true });
  await run('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'concat', '-safe', '0', '-i', list,
    '-ss', String(from), '-t', String(to - from), '-i', AUDIO,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy',
    '-movflags', '+faststart', outFile,
  ]);
  const secs = (Date.now() - t0) / 1000;
  console.log(`done: ${outFile}  ${(statSync(outFile).size / 1e6).toFixed(1)} MB  in ${secs.toFixed(0)}s (${(total / secs).toFixed(1)} fps)`);
}

if (flag('worker')) worker().catch((e) => { console.error(e); process.exit(1); });
else main().catch((e) => { console.error(e); process.exit(1); });
