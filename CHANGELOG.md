# Changelog

## 0.3.1 — Weapon Audio / 1 October 2026

- Replaced every generated weapon report with distinct, freely licensed firearm recordings; two different recorded shots per gun, with no shared files or source excerpts between guns/actions.
- Added unique magazine-out, magazine-in, charging, equip, and empty-trigger recordings for each weapon. SV98 has its own two-stage bolt cycle.
- Reload sounds follow each gun's existing reload timing and stop when switching, pausing, or ending a round; resuming only schedules remaining stages.
- Bot rifle fire uses separate distant recordings, directional stereo, and distance attenuation.
- Cached local WAV loading, overlapping automatic-fire playback, a peak limiter, node cleanup, and live master-volume/mute handling.
- Armory Shot/Reload preview buttons work without WebGL and respect saved volume.
- CC0 audio notices, exact provenance/hashes, reproducible conversion, and audio regression checks.

## 0.3.0 — Interface & Armory / 1 October 2026

- Redesigned deployment, armory, field manual, settings, HUD, buy screen, pause, scoreboard, and round results.
- Muted charcoal/olive palette, original BlackSite mark, Helix site plan, clearer typography, keyboard focus, and responsive menu layouts.
- Added modified Free3D SV98 and M82 models by chasieboy317, with separate magazines and optimized PBR meshes. Added vector previews generated from the actual weapon geometry.
- Four weapons: automatic M4A1, bolt-action SV98, semi-automatic M82, and P-9 backup. Snipers have scoped aim, heavier movement, different recoil/reload/fire intervals, and lethal torso hits.
- Choose the opening primary in the armory. Rebuy at spawn, retain a surviving weapon, and lose it on death. Weapon purchases enforce prices, ownership, timing, and spawn proximity.
- Saved sensitivity, volume, FOV, crosshair length, graphics quality, and opening loadout. Settings also work when browser storage is unavailable.
- Actual round combat statistics, remaining hostiles, health/reload bars, weapon slots, and clearer purchase states.
- Explicit read-only combat UI preview for design review without WebGL. Normal game startup reports graphics compatibility without blocking the armory and settings.
- Expanded real-model and gameplay validation; source credits and separate model permissions included.

Previous visual release: https://github.com/MMH-4ALL/BlackSite/releases/tag/v0.2.0
