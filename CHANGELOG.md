# Changelog

## 0.5.0 — Motion & Handling / 2 October 2026

- Articulated first-person hands and forearms for every weapon, with magazine withdrawal/reinsertion, charging gestures, and a manual SV98 bolt gesture.
- Distance-driven walking/running motion, strafing lean, breathing, crouch transitions, jumping and landing recovery, equip raise, and damage flinch.
- Recoil, moving slide/bolt parts where available, muzzle flashes, bounded casing effects, smooth scope zoom, and hold-V inspection.
- Utility hand throws and visual grenade arcs, smoke expansion, and animated handheld objective handling. Utility hit/visibility timing remains unchanged.
- Bots animate hips, knees, ankles, torso, head, and arms; movement/turning, firing, blindness, planting/defusing, and settling deaths have distinct poses.
- Menu, panel, kill-feed, toast, scope, health-bar, and button transitions. Interface animations respect reduced-motion preferences.
- Presentation freezes on pause, resets between loadouts/rounds, and leaves authoritative aim, damage, hit volumes, economy, and ammo untouched.
- All eight weapons checked for reload restoration, pause/reset behavior, landing and movement, finite transforms, plus real-model/gameplay/audio regressions.

## 0.4.0 — Expanded Arsenal / 1 October 2026

- Added AK-47, MP5, C-9, and H-45 using distinct adapted CC0 models. Five primaries and three sidearms.
- Separate primary/sidearm opening selections, ownership, purchases, survival retention, and free P-9 after elimination.
- Each addition has its own recorded shots and handling audio; 60 distinct CC0 sound files total.
- Expanded armory/buy layouts, model/audio provenance, and validation.

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
