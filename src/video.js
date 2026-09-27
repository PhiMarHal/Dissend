// Entry point: builds the timeline and returns render(ctx, canvas, t).
import { buildTimeline, integrate } from './timeline.js';
import { setMeasureContext } from './type.js';
import { makePaperTextures, chromaSplit, sliceShift, vignette } from './post.js';
import { clamp, lerp, noise1, h2, rgba } from './util.js';
import { P } from './palette.js';
import { speedAt, drawWorld, frameFx, drawOverlay } from './scenes.js';
import { drawLyrics } from './lyrics.js';

export function createVideo({ W = 1920, H = 1080, scale = 1, grain = 1, data, makeCanvas }) {
  // W,H are design units; the output canvas is (W*scale) x (H*scale) pixels
  const PW = Math.round(W * scale), PH = Math.round(H * scale);
  const TL = buildTimeline(data);
  const mc = makeCanvas(32, 32);
  setMeasureContext(mc.getContext('2d'));
  const tex = makePaperTextures(makeCanvas, PW, PH);
  const tmpA = makeCanvas(PW, PH), tmpB = makeCanvas(PW, PH);
  const base = (c) => c.setTransform(scale, 0, 0, scale, 0, 0);
  const Dist = integrate((t) => speedAt(t, TL), TL.duration + 2, 240);
  const cache = new Map(); // per-render-process memo for expensive derived assets

  function render(ctx, canvas, t) {
    const S = {
      t, W, H, TL, P, cache, makeCanvas,
      E: TL.energy(t), A: TL.activity(t), I: TL.intensity(t),
      low: TL.low(t), hit: TL.hit(t), air: TL.air(t),
      beat: TL.beat(t), bp: TL.beatPulse(t, 0.16),
      speed: speedAt(t, TL), D: Dist(t), Dist,
      fx: { flash: 0, flashColor: P.paperLight, chroma: 0, slice: 0, shake: 0, zoom: 0, rot: 0, vignette: 0.18, invert: 0 },
    };
    frameFx(S); // scenes decide camera + post amounts for this moment

    ctx.save();
    base(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // camera: punch zoom, roll, shake
    const sh = S.fx.shake;
    const sx = noise1(t * 23, 1) * sh + (h2(Math.floor(t * 60), 5) - 0.5) * sh * 0.6;
    const sy = noise1(t * 21, 2) * sh + (h2(Math.floor(t * 60), 6) - 0.5) * sh * 0.6;
    const z = 1 + S.fx.zoom;
    S.cam = { x: sx, y: sy, z, rot: S.fx.rot };
    S.applyCam = (c) => {
      c.translate(W / 2 + sx, H / 2 + sy);
      c.rotate(S.fx.rot);
      c.scale(z, z);
      c.translate(-W / 2, -H / 2);
    };

    drawWorld(ctx, S);
    ctx.save();
    S.applyCam(ctx);
    drawLyrics(ctx, S);
    ctx.restore();
    drawOverlay(ctx, S);

    // ------------------------------------------------ finishing
    base(ctx);
    ctx.globalAlpha = 1;
    if (S.fx.flash > 0.004) {
      ctx.globalAlpha = clamp(S.fx.flash);
      ctx.fillStyle = S.fx.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (S.fx.slice > 0.5) sliceShift(ctx, canvas, tmpA, PW, PH, 14, S.fx.slice * scale, (i, k) => h2(Math.floor(t * 30) * 31 + i, k));
    if (S.fx.chroma > 0.5) chromaSplit(ctx, canvas, tmpA, tmpB, PW, PH, S.fx.chroma * scale, S.fx.chroma * 0.25 * scale);
    base(ctx);
    vignette(ctx, W, H, S.fx.vignette, '#1a0a06');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (grain > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.85 * grain;
      ctx.drawImage(tex.mul, 0, 0);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.9 * grain;
      ctx.drawImage(tex.scr, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return { render, TL, W, H, PW, PH, scale };
}
