"""Derive fast audio envelopes (60 samples/s) that drive small visual pulses.

    python3 tools/analyze_audio.py            # writes data/envelope.json

Outputs, all scaled 0..1 within this song:
  low   - smoothed 35-140 Hz band level (bass / kick body)
  hit   - positive spectral flux across 40 Hz-8 kHz with fast decay (attacks)
  air   - positive flux 5-11 kHz (hats / sibilance sparkle)
  level - broadband RMS level (dB-scaled)
These are signal measurements for animation, not beat or mood labels.
Requires numpy and an ffmpeg binary on PATH.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "Dissend.webm")
SR = 22050
FPS = 60

pcm = subprocess.run(
    ["ffmpeg", "-v", "error", "-i", AUDIO, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
    check=True, capture_output=True).stdout
x = np.frombuffer(pcm, dtype=np.float32)
dur = len(x) / SR
N = 2048
n_out = int(np.floor(dur * FPS)) + 1
win = np.hanning(N).astype(np.float32)
pad = np.concatenate([np.zeros(N // 2, np.float32), x, np.zeros(N, np.float32)])
freqs = np.fft.rfftfreq(N, 1 / SR)
mags = np.empty((n_out, N // 2 + 1), np.float32)
for i in range(n_out):
    s = int(round(i / FPS * SR))
    mags[i] = np.abs(np.fft.rfft(pad[s:s + N] * win))

def band(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return np.log1p(mags[:, m] * 4.0)

def norm(v, lo_pct=5, hi_pct=99):
    lo, hi = np.percentile(v, lo_pct), np.percentile(v, hi_pct)
    return np.clip((v - lo) / (hi - lo + 1e-9), 0, 1)

def decay(v, per_frame):
    out = np.empty_like(v)
    acc = 0.0
    for i, s in enumerate(v):
        acc = max(s, acc * per_frame)
        out[i] = acc
    return out

low = band(35, 140).mean(1)
low = norm(np.convolve(low, np.ones(3) / 3, mode="same"), 10, 99.5)

B = band(40, 8000)
flux = np.maximum(0, np.diff(B, axis=0, prepend=B[:1])).mean(1)
hit = decay(norm(flux, 50, 99.7), 0.86)

A = band(5000, 11000)
aflux = np.maximum(0, np.diff(A, axis=0, prepend=A[:1])).mean(1)
air = decay(norm(aflux, 50, 99.7), 0.8)

rms = np.sqrt(np.convolve(x.astype(np.float64) ** 2, np.ones(1024) / 1024, mode="same"))
level = 20 * np.log10(rms[np.clip((np.arange(n_out) / FPS * SR).astype(int), 0, len(x) - 1)] + 1e-7)
level = norm(level, 5, 99)

def q(v):
    return [round(float(a), 3) for a in v]

json.dump({
    "about": "Fast signal envelopes for animation accents; relative within this song, not beats or moods.",
    "fps": FPS,
    "duration": round(dur, 3),
    "low": q(low), "hit": q(hit), "air": q(air), "level": q(level),
}, open(os.path.join(ROOT, "data", "envelope.json"), "w"), separators=(",", ":"))
print("frames", n_out, "duration", dur)
