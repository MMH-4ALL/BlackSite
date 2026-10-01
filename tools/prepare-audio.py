#!/usr/bin/env python3
"""Prepare distinct CC0 recordings. Needs Python, numpy and scipy; not used at runtime.

Pass the sound-source folder containing the three OpenGameArt WAV downloads and
an extracted Prepared SFX Library folder. Source links/hashes are in the manifest.
No source interval is assigned to more than one output. All edits are reproducible.
"""
import argparse
import hashlib
import json
import warnings
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly

warnings.filterwarnings('ignore', category=wavfile.WavFileWarning)
ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
 'ak47': ('extracted/Prepared SFX Library/AK-47/C_28P.wav','e0934c1d79192d2216db62fdf6ab57bf9d5d585267af367a1cfb21f0972a537d','firearms'),
 'smg': ('extracted/Prepared SFX Library/Carl Gustav M45/G_31P.wav','5982c6c2fa44545b750ba6217ed57797a6a15c02f5c9943ac0e99e5f3ab2b158','firearms'),
 'compact': ('extracted/Prepared SFX Library/Bersa/F_47P.wav','f800c86f9a724bd52f6fe844909adbb9ad3c50cac654908ee83bf15d1ad18ce3','firearms'),
 'heavy': ('extracted/Prepared SFX Library/1911/A_42P.wav','8e84438e771c157155a6a1ff47a6a7a7d81b6f39b185d41e426c57337a82254a','firearms'),
 'mechanics2': ('equipmentclicks2.wav','42d40e4970fcee45b86088dab9c6a6e7f87b6dc29a6dd9dbbf4d98da7a4e3a47','mechanics2'),
 'ar15': ('extracted/Prepared SFX Library/AR-15/D_32P.wav', 'acee9d2106b68fe5956225a19d7aedf943d97793817f9bda9d486a2b74b0a812', 'firearms'),
 'ar15_distant': ('extracted/Prepared SFX Library/AR-15/D_24P.wav', '4c6a54ca0583150bbb32b7f658bc64da9ad9ba42fd3aca769c6120b44af8d3f0', 'firearms'),
 'tikka': ('extracted/Prepared SFX Library/Tikka/W_29P.wav', 'b1ffe3c104391bf8ceb8337aa4d5a2ca47938fb88ccbd051cdd2b2e205d9e72b', 'firearms'),
 'mosin': ('extracted/Prepared SFX Library/Mosin Nagant/M_21P.wav', '970ed2322ba61579dc8afaefb4f25e6ae791a3acb1e6e23372ea948cfe2a97b3', 'firearms'),
 'ppq': ('extracted/Prepared SFX Library/Walther PPQ/X_39P.wav', 'd679a3cd87eae2898d984159f83544392932e6b77526045b672e3aaa9c2dda9f', 'firearms'),
 'rifle_reload': ('assaultriflereload1.wav', 'efb2d724d634eabe6ba8d3065686abca848bb7497d4d43a5e4aed5e5ea23016f', 'reloads'),
 'pistol_reload': ('gunreload1.wav', '685cac6a184e3cc3ec09a25b6ddb1d6feffd86d469778f339aa423d384035c50', 'reloads'),
 'mechanics': ('equipment_clicks3.wav', '1cd2612f226886a7c0badbe26e9732e097a448e97cbea72a3e3cd2c8aa91ace8', 'mechanics'),
}
PAGES = {
 'mechanics2': 'https://opengameart.org/content/equipment-clicks-ii',
 'firearms': 'https://opengameart.org/content/the-free-firearm-sound-library',
 'reloads': 'https://opengameart.org/content/gun-reload-sounds',
 'mechanics': 'https://opengameart.org/content/equipment-clicks-iii',
}
# filename, source, source start/end seconds, pitch/speed, low-pass Hz, target peak.
CLIPS = [
 ('ak47-shot-01', 'ak47', 0.59, 1.45, 1, 13500, 0.84),
 ('ak47-shot-02', 'ak47', 3.24, 4.1, 1, 13500, 0.84),
 ('mp5-shot-01', 'smg', 0.29, 0.89, 1, 12500, 0.77),
 ('mp5-shot-02', 'smg', 3.48, 4.08, 1, 12500, 0.77),
 ('c9-shot-01', 'compact', 0.32, 0.9, 1, 14500, 0.73),
 ('c9-shot-02', 'compact', 4.39, 4.98, 1, 14500, 0.73),
 ('h45-shot-01', 'heavy', 0.92, 1.72, 1, 12000, 0.85),
 ('h45-shot-02', 'heavy', 4.985, 5.785, 1, 12000, 0.85),
 ('ak47-mag-out', 'mechanics2', 0.05, 0.47, 1, 12500, 0.65),
 ('ak47-mag-in', 'mechanics2', 1, 1.41, 1, 12500, 0.65),
 ('ak47-charge', 'mechanics2', 3.82, 4.22, 1, 12500, 0.65),
 ('ak47-equip', 'mechanics', 19, 19.34, 1, 12500, 0.53),
 ('ak47-empty', 'mechanics', 21.23, 21.58, 1, 12500, 0.53),
 ('mp5-mag-out', 'mechanics', 3.23, 3.58, 1, 12500, 0.65),
 ('mp5-mag-in', 'mechanics', 3.7, 4.04, 1, 12500, 0.65),
 ('mp5-charge', 'mechanics', 4.23, 4.57, 1, 12500, 0.65),
 ('mp5-equip', 'mechanics', 19.63, 19.96, 1, 12500, 0.53),
 ('mp5-empty', 'mechanics', 21.95, 22.25, 1, 12500, 0.53),
 ('c9-mag-out', 'mechanics', 5, 5.34, 1, 12500, 0.65),
 ('c9-mag-in', 'mechanics', 5.6, 5.93, 1, 12500, 0.65),
 ('c9-charge', 'mechanics', 12.05, 12.38, 1, 12500, 0.65),
 ('c9-equip', 'mechanics', 20.27, 20.57, 1, 12500, 0.53),
 ('c9-empty', 'mechanics', 22.48, 22.8, 1, 12500, 0.53),
 ('h45-mag-out', 'mechanics', 17.36, 17.72, 1, 12500, 0.65),
 ('h45-mag-in', 'mechanics', 17.96, 18.32, 1, 12500, 0.65),
 ('h45-charge', 'mechanics', 18.47, 18.81, 1, 12500, 0.65),
 ('h45-equip', 'mechanics', 20.77, 21.05, 1, 12500, 0.53),
 ('h45-empty', 'mechanics2', 2.26, 2.57, 1, 12500, 0.53),

 ('m4a1-shot-01', 'ar15', .64, 1.19, 1, 5400, .79),
 ('m4a1-shot-02', 'ar15', 5.58, 6.13, 1, 5400, .79),
 ('m4a1-distant-01', 'ar15_distant', .49, 1.30, 1, 4700, .75),
 ('m4a1-distant-02', 'ar15_distant', 3.85, 4.66, 1, 4700, .75),
 ('sv98-shot-01', 'tikka', .52, 1.82, 1, 13000, .84),
 ('sv98-shot-02', 'tikka', 5.61, 6.91, 1, 13000, .84),
 ('m82-shot-01', 'mosin', .98, 2.28, .82, 11000, .86),
 ('m82-shot-02', 'mosin', 4.96, 6.26, .82, 11000, .86),
 ('p9-shot-01', 'ppq', 1.35, 1.94, 1, 15000, .76),
 ('p9-shot-02', 'ppq', 6.39, 6.98, 1, 15000, .76),
 ('m4a1-mag-out', 'rifle_reload', .16, .60, 1, 13000, .64),
 ('m4a1-mag-in', 'rifle_reload', 1.00, 1.21, 1, 13000, .70),
 ('m4a1-charge', 'rifle_reload', 1.22, 1.55, 1, 13000, .67),
 ('p9-mag-out', 'pistol_reload', .07, .51, 1, 15000, .61),
 ('p9-mag-in', 'pistol_reload', .69, .99, 1, 15000, .60),
 ('p9-charge', 'pistol_reload', 1.20, 1.57, 1, 15000, .65),
 ('sv98-mag-out', 'mechanics', .13, .55, 1, 11500, .65),
 ('sv98-mag-in', 'mechanics', .79, 1.15, 1, 11500, .67),
 ('sv98-charge', 'mechanics', 1.39, 1.96, 1, 11500, .69),
 ('sv98-bolt-open', 'mechanics', 2.09, 2.60, 1, 12000, .64),
 ('sv98-bolt-close', 'mechanics', 2.72, 3.10, 1, 12000, .66),
 ('m82-mag-out', 'mechanics', 12.45, 12.96, .91, 9500, .67),
 ('m82-mag-in', 'mechanics', 13.03, 13.73, .91, 9500, .71),
 ('m82-charge', 'mechanics', 14.52, 15.28, .91, 9500, .69),
 ('m4a1-equip', 'mechanics', 6.31, 6.86, 1, 13000, .55),
 ('sv98-equip', 'mechanics', 7.15, 7.59, 1, 11000, .56),
 ('m82-equip', 'mechanics', 16.13, 16.70, .92, 9000, .58),
 ('p9-equip', 'mechanics', 7.91, 8.33, 1, 15000, .53),
 ('m4a1-empty', 'mechanics', 8.53, 8.86, 1, 13000, .51),
 ('sv98-empty', 'mechanics', 9.53, 9.95, 1, 11000, .52),
 ('m82-empty', 'mechanics', 11.31, 11.93, .92, 9000, .53),
 ('p9-empty', 'mechanics', 10.45, 10.88, 1, 15000, .50),
]

def main():
 parser = argparse.ArgumentParser(description=__doc__)
 parser.add_argument('source', type=Path)
 args = parser.parse_args()
 output = ROOT / 'assets/audio'
 output.mkdir(parents=True, exist_ok=True)
 tracks = {}
 provenance = {}
 for key, (relative, digest, page) in SOURCES.items():
  path = args.source / relative
  assert hashlib.sha256(path.read_bytes()).hexdigest() == digest, f'Changed source: {path}'
  rate, data = wavfile.read(path)
  if np.issubdtype(data.dtype, np.integer): data = data.astype(np.float64) / (np.iinfo(data.dtype).max + 1)
  if data.ndim > 1: data = data.mean(axis=1)
  tracks[key] = (rate, data)
  provenance[key] = {'file': relative, 'sha256': digest, 'page': PAGES[page], 'license': 'CC0-1.0'}
 clips = []
 for name, key, start, end, speed, cutoff, peak in CLIPS:
  rate, source = tracks[key]
  for previous in clips:
   if previous['source'] == key:
    a, b = previous['sourceRangeSeconds']
    assert end <= a or start >= b, f'Reused source interval: {name}'
  data = source[round(start * rate):round(end * rate)].copy()
  assert len(data) and np.max(np.abs(data)) > .003, f'Silent clip: {name}'
  # Trim quiet lead-in while retaining 3 ms before the recorded transient.
  onset = np.flatnonzero(np.abs(data) > np.max(np.abs(data)) * .045)[0]
  data = data[max(0, onset - round(rate * .003)):]
  data = sosfilt(butter(2, 65, 'highpass', fs=rate, output='sos'), data)
  data = sosfilt(butter(3, cutoff, 'lowpass', fs=rate, output='sos'), data)
  target_frames = round(len(data) * 44100 / (rate * speed))
  ratio = 44100 / (rate * speed)
  from fractions import Fraction
  frac = Fraction(ratio).limit_denominator(10000)
  data = resample_poly(data, frac.numerator, frac.denominator)[:target_frames]
  # Filtering can suppress room noise that preceded the true transient. Trim
  # again on the final waveform so every trigger has an immediate attack.
  filtered_onset = np.flatnonzero(np.abs(data) > np.max(np.abs(data)) * .045)[0]
  data = data[max(0, filtered_onset - round(44100 * .003)):]
  data *= peak / max(.001, float(np.max(np.abs(data))))
  fade_in = min(round(.001 * 44100), len(data) // 8)
  fade_out = min(round((.075 if 'shot' in name or 'distant' in name else .025) * 44100), len(data) // 4)
  data[:fade_in] *= np.linspace(0, 1, fade_in)
  data[-fade_out:] *= np.linspace(1, 0, fade_out)
  path = output / (name + '.wav')
  pcm = np.round(np.clip(data, -.97, .97) * 32767).astype('<i2')
  wavfile.write(path, 44100, pcm)
  clips.append({'file': name + '.wav', 'source': key, 'sourceRangeSeconds': [start, end],
                'speed': speed, 'lowPassHz': cutoff, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'duration': round(len(pcm) / 44100, 6), 'bytes': path.stat().st_size})
 manifest = {'version': '0.3.1', 'license': 'CC0-1.0', 'sampleRate': 44100, 'channels': 1,
             'format': 'PCM 16-bit WAV', 'sources': provenance, 'clips': clips}
 (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
 print(f'Prepared {len(clips)} unique sounds; {sum(c["bytes"] for c in clips):,} bytes.')

if __name__ == '__main__': main()
