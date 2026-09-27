// Turns the JSON data files into fast time lookups.
import { clamp, lerp } from './util.js';

function sampler(arr, rate) {
  const n = arr.length;
  return (t) => {
    const x = t * rate;
    if (x <= 0) return arr[0];
    if (x >= n - 1) return arr[n - 1];
    const i = Math.floor(x);
    return lerp(arr[i], arr[i + 1], x - i);
  };
}

export function buildTimeline({ lyrics, music, beats, envelope, placements }) {
  // ------------------------------------------------------------ lyric lines
  const lines = [];
  for (const l of lyrics.lyrics) {
    lines.push({
      id: l.source_line_id, text: l.text, lang: l.language, section: l.section,
      start: l.start, end: l.display_end ?? l.end, words: l.words || [], sung: true,
    });
  }
  for (const p of placements.placements) {
    lines.push({
      id: p.source_line_id, text: p.text, lang: p.language, section: null,
      start: p.start, end: p.end, words: [], sung: false, pairsWith: p.pairs_with,
    });
  }
  lines.sort((a, b) => a.start - b.start);
  const byId = Object.fromEntries(lines.map((l) => [l.id, l]));

  // ------------------------------------------------------------ curves
  const cols = music.curve_columns;
  const rate = 1 / music.sample_interval_seconds;
  const col = (name) => music.curves.map((r) => r[cols.indexOf(name)]);
  const energy = sampler(col('relative_energy'), rate);
  const activity = sampler(col('rhythmic_activity'), rate);
  const bright = sampler(col('brightness'), rate);
  const intensity = sampler(col('visual_intensity_hint'), rate);

  const ef = envelope.fps;
  const low = sampler(envelope.low, ef);
  const hit = sampler(envelope.hit, ef);
  const air = sampler(envelope.air, ef);
  const level = sampler(envelope.level, ef);

  // ------------------------------------------------------------ beats
  const B = beats.beats;
  const period = 60 / beats.estimated_bpm;
  function beatIndexAt(t) {
    if (t < B[0]) return Math.floor((t - B[0]) / period);
    if (t >= B[B.length - 1]) return B.length - 1 + Math.floor((t - B[B.length - 1]) / period);
    let lo = 0, hi = B.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (B[mid] <= t) lo = mid; else hi = mid - 1;
    }
    return lo;
  }
  const beatTime = (i) =>
    i < 0 ? B[0] + i * period : i >= B.length ? B[B.length - 1] + (i - B.length + 1) * period : B[i];

  // Guess the bar phase: the beat class (mod 4) with the most bass on it.
  const score = [0, 0, 0, 0];
  for (let i = 0; i < B.length; i++) score[i % 4] += low(B[i]);
  const barPhase = score.indexOf(Math.max(...score));

  function beat(t) {
    const i = beatIndexAt(t);
    const t0 = beatTime(i), t1 = beatTime(i + 1);
    const phase = clamp((t - t0) / (t1 - t0));
    const bar = Math.floor((i - barPhase) / 4);
    const inBar = (((i - barPhase) % 4) + 4) % 4;
    return { i, t0, t1, phase, since: t - t0, bar, inBar };
  }
  // exponential kick-like decay since the last beat
  const beatPulse = (t, decay = 0.18) => Math.exp(-(t - beatTime(beatIndexAt(t))) / decay);

  const onsets = music.onset_candidates;
  function onsetPulse(t, decay = 0.12, minStrength = 0.35) {
    // strongest recent onset, decayed
    let lo = 0, hi = onsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (onsets[mid].time <= t) lo = mid; else hi = mid - 1;
    }
    let best = 0;
    for (let k = lo; k >= 0 && t - onsets[k].time < decay * 5; k--) {
      const o = onsets[k];
      if (o.time > t || o.strength < minStrength) continue;
      best = Math.max(best, o.strength * Math.exp(-(t - o.time) / decay));
    }
    return best;
  }

  const active = (t, pad = 0) => lines.filter((l) => t >= l.start - pad && t <= l.end + pad);

  return {
    lines, byId, active,
    energy, activity, bright, intensity, low, hit, air, level,
    beats: B, period, beat, beatTime, beatIndexAt, beatPulse, barPhase, onsetPulse,
    duration: lyrics.audio.decoded_duration_seconds || 271.5,
  };
}

// Integrate a speed function into a distance lookup table.
export function integrate(fn, duration, hz = 240) {
  const n = Math.ceil(duration * hz) + 2;
  const acc = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const t = (i - 0.5) / hz;
    acc[i] = acc[i - 1] + fn(t) / hz;
  }
  return (t) => {
    const x = clamp(t * hz, 0, n - 1.0001);
    const i = Math.floor(x);
    return lerp(acc[i], acc[i + 1], x - i);
  };
}
