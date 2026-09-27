// Loads data + fonts for rendering in Node with @napi-rs/canvas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { FONTS } from '../src/type.js';
import { createVideo } from '../src/video.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(readFileSync(path.join(ROOT, 'data', f), 'utf8'));

export function loadVideo({ W = 1920, H = 1080, scale = 1 } = {}) {
  for (const k in FONTS) {
    const ok = GlobalFonts.registerFromPath(path.join(ROOT, 'assets', 'fonts', FONTS[k].file), FONTS[k].family);
    if (!ok) throw new Error('font failed: ' + FONTS[k].file);
  }
  const data = {
    lyrics: json('lyrics.json'),
    music: json('music.json'),
    beats: json('beats.json'),
    envelope: json('envelope.json'),
    placements: json('untimed-placement.json'),
  };
  const makeCanvas = (w, h) => createCanvas(w, h);
  const grain = process.env.DISSEND_GRAIN !== undefined ? parseFloat(process.env.DISSEND_GRAIN) : 1;
  const video = createVideo({ W, H, scale, grain, data, makeCanvas });
  const canvas = createCanvas(video.PW, video.PH);
  const ctx = canvas.getContext('2d');
  return { video, canvas, ctx };
}
