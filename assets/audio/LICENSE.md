# BlackSite weapon audio — CC0 1.0

All 32 WAV files in this folder use newly added, separate source excerpts. No
recording is assigned to two guns or to two different actions. Gunshot variants
use different recorded shots. The previous generated gunshot and reload tones
are removed; the original objective, hit-marker, and round-result tones remain.

These recordings are released under **Creative Commons Zero 1.0 Universal**:
https://creativecommons.org/publicdomain/zero/1.0/

The audio is licensed separately from the project's MIT code and the Free3D
models. No endorsement by the recordists is implied.

## Credits and sources

**The Free Firearm Sound Library** — Ben Jaszczak, Brian Nelson, Kevin Heras, and
Matthew Nanney. OpenGameArt lists CC0 and preserves the creators' permission for
personal and professional use. Download: `Prepared SFX Library.7z`.

https://opengameart.org/content/the-free-firearm-sound-library

- M4A1 shots: separate AR-15 / M4 5.56 mm recordings in `D_32P.wav`.
- Bot M4A1 shots: separate distant recordings in `D_24P.wav`.
- SV98 shots: separate Tikka T3 .30-06 recordings in `W_29P.wav`.
- M82 shots: separate Mosin Nagant 7.62x54 recordings in `M_21P.wav`, slowed
  slightly and filtered to give the game weapon a heavier report.
- P-9 shots: separate Walther PPQ 9 mm recordings in `X_39P.wav`.

The SV98 and M82 sounds are adaptations of the named source rifles, **not claimed
to be exact recordings of those models**. M4A1 filtering is a game sound-design
choice, not a recording of a real suppressor.

**Gun reload sounds** — SpringySpringo. Recorded with airsoft guns, released CC0.
`assaultriflereload1_0.wav` supplies the M4A1's three separate reload stages;
`gunreload1.wav` supplies the P-9's three separate stages.

https://opengameart.org/content/gun-reload-sounds

**equipment clicks III** — LFA. Recorded using a bolt-action rifle, a stapler,
and a tape measure, released CC0. Separate, non-overlapping portions supply
SV98/M82 reloads, SV98 bolt cycling, and all four distinct equip/empty sounds.

https://opengameart.org/content/equipment-clicks-iii

## Modifications and reproduction

Edits: isolated source excerpts; quiet lead-in removed; mono mixing; high/low-pass
filtering; modest pitch/speed changes for the M82; peak normalization; short
boundary fades; 44.1 kHz, mono, 16-bit PCM WAV encoding. There is no synthesized
weapon fallback and no runtime source-site request.

`manifest.json` records every input hash, source page, original time range,
filter/speed setting, final SHA-256 hash, duration, and size. Build with
`python tools/prepare-audio.py /path/to/sound-source` after downloading the source
WAVs and extracting the firearm archive into `sound-source/extracted`.
The converter requires numpy and scipy; the game requires neither.

## References (MLA)

Jaszczak, Ben, et al. “The Free Firearm Sound Library.” *OpenGameArt.org*,
9 Mar. 2014, https://opengameart.org/content/the-free-firearm-sound-library.
Accessed 1 Oct. 2026.

SpringySpringo. “Gun Reload Sounds.” *OpenGameArt.org*, 30 June 2020,
https://opengameart.org/content/gun-reload-sounds. Accessed 1 Oct. 2026.

LFA. “Equipment Clicks III.” *OpenGameArt.org*, 20 May 2011,
https://opengameart.org/content/equipment-clicks-iii. Accessed 1 Oct. 2026.

Creative Commons. “CC0 1.0 Universal.” *Creative Commons*,
https://creativecommons.org/publicdomain/zero/1.0/. Accessed 1 Oct. 2026.
