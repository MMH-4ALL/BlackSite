# Validation — 3 October 2026

## Completed

- v0.6.1: WASD, jump, both crouch keys, combined inputs, and leftover momentum cannot move the player during buy time on any map or side. Shopping works, the countdown advances, bots stay frozen, and held movement/jump inputs resume when the round goes live.
- v0.6.0: three distinct playable map collision layouts. Both player sides and 1/3/6/16 hostiles per map have clear spawns, unique bot names, separation at spawn, and traversable routes to both objective sites.
- Sixteen attackers actually reach and plant a core on each map; sixteen defenders actually traverse each map and finish a seven-second defuse. Additional bots do not shorten objective timers.
- Repeated map switches replace geometry/colliders, refresh cached navigation, remove previous round objects, and update HUD/report labels. Selected map/count are read by normal deployment, retained between rounds, and replaced on a new match.
- Higher counts populate the full scoreboard and remaining-hostile counter; eliminating one enemy does not win while another survives, and the final kill does win.
- Saved counts normalize to 1–16, invalid values default to six, and invalid map names fall back to Helix.

- v0.5.0 motion checks with real model geometry: two articulated hands on all eight weapons; staged reload hands/magazines return to their rest transforms; recoil, casing/muzzle effects, jump/landing, actual-distance movement and strafe bank, inspection, throw and objective poses.
- Zero elapsed time freezes all presentation transforms. Weapon switches and round resets remove stale handling state. All transforms remain finite through action overlaps.
- Bot legs/ankles and torso animate during actual movement; walking phase stops while stationary. Firing, blind, objective, and corpse states use distinct poses; gameplay hit-volume local transforms remain unchanged.
- Animation checks leave the authoritative camera, ammunition and health unchanged. Existing raycast kills, recoil mechanics, scope FOV, purchase/ownership, difficulty, navigation, objectives, and all 60 distinct audio assets are covered by regressions.

- v0.3.1 audio checks: all 60 actual WAVs have valid mono 44.1 kHz / 16-bit PCM data, audible content, immediate attacks, and normalized peaks with headroom. File hashes and source ranges are distinct; no file or source excerpt is shared between actions/guns. Total WAV size is recorded by the audio validator.
- Audio scheduling regression checks use real local PCM bytes and the real `WeaponAudio` class, with Web Audio nodes stubbed: per-gun shot variants, staged reloads within actual gameplay durations, pause/switch cancellation, remaining-stage resume, separate bot rifle recordings, pan/distance attenuation, volume/mute, single-download caching, missing-file behavior, sustained automatic fire, and ended-node cleanup.
- Integrated game logic dispatches each gun to its own bank and reload duration; exhausted guns click at most once per fire interval, without consuming ammunition; ending a round cancels handling audio.

- JavaScript syntax check.
- Direct game-logic execution with the real Three.js scene graph and raycaster. Rendering and DOM were stubbed for these tests.
- Player spawn, three enemy spawns, magazine initialization.
- Traversable bot routes from spawn to both objective sites.
- Collision rejection at walls and perimeter.
- Rifle headshot actually hits the head mesh, kills a full-health armored bot, increments kills, and consumes ammunition.
- Smoke blocks shared line-of-sight queries.
- Attack bots navigate from spawn and plant a core.
- Multiple nearby bots do not speed up the seven-second defuse.
- Completed bot defuse ends the round with the correct winner.
- Difficulty ordering: Hard has a faster reaction and tighter aim than Normal/Easy.
- Actual bundled GLTFLoader parses the modified Free3D M4A1: four meshes, an independently movable magazine, 32,980 triangles, and an 847,036-byte GLB.
- Quantized normals have unit length within rounding tolerance; zero normals in the original OBJ were repaired.
- Imported rifle PBR materials survive loading.
- Reload animation lowers and restores the magazine; the weapon settles after reload and switching. Presentation does not alter ammunition.
- Actual MP5 reload and bot walking poses inspected in a CPU projection of the loaded models and game transforms; reload framing keeps magazine handling on screen. This does not verify GPU lighting.
- Corpse animation changes the visual rig rather than the gameplay hit volumes.
- Binary integrity and mesh data for the active GLB assets; all external texture references resolve to bundled files.
- Weapon framing inspected in a CPU projection of the actual loaded geometry and game transforms. This verifies orientation and screen coverage, not browser lighting or frame rate.
- Static asset and module imports are local and use relative paths.
- Actual bundled GLTFLoader also parses both new Free3D assets: four meshes each, scope and magazine present, repaired unit normals, reasonable dimensions, and model budgets below 650 KB / 30,000 triangles each.
- Scoped SV98 and M82 shots perform real scene raycasts and kill a full-health armored bot with a torso hit. Fire interval consumes no extra ammunition during cooldown.
- Buying checks actual costs, insufficient funds, repeated purchases, armor/grenade capacities, spawn proximity, and buy-phase timing.
- Replaced or lost primaries cannot be equipped; surviving primaries persist; death leaves the sidearm.
- Scope changes camera FOV and resets on reload/switch; a pistol cannot scope.
- Shot, hit, and headshot counters match actual rifle raycast results.
- Browser UI review on the deployed Pages site: deployment, armory, field manual, and settings; changing the opening primary, sensitivity, and crosshair, reloading to confirm persistence, and resetting preferences.
- Combat interfaces reviewed through explicit preview mode: HUD, buy screen, round report, pause, and scoreboard. Preview values are samples, not a recorded match.
- The cloud review browser cannot create a WebGL context. Menus still work and compatibility feedback appears; 3D rendering/input/performance require a real desktop playtest.

Run the checks with `node tools/validate.mjs` and `node tools/validate-audio.mjs`. Rendering, DOM, and Web Audio nodes are stubbed, but the seven imported model loaders, scene graph, geometry, materials, raycaster, gameplay logic, weapon-audio class, and local PCM data are real. No network or installed npm packages are required.

## Not completed in this environment

GPU rendering, mouse capture, sound playback, frame rate, and cross-browser behavior have not been verified by the Node checks. A desktop browser playtest is still required before treating this as a polished release.

## First browser playtest

1. Choose each map and hostile count on Deploy; reload to confirm both choices persist. Start games with 1, 6, and 16 enemies on each side. Check names/counts, routes, firing, objectives, deaths, and frame rate in both graphics settings.
2. Serve with `python3 -m http.server 8000` and open `http://localhost:8000`.
2. Confirm the menu, weapon models, map, and shadows appear without console errors.
3. Start Easy / Breach. Hold V to inspect each weapon, and compare idle/walk/run/strafe/jump/landing animations. Test mouse capture, Escape / Resume, WASD, crouch, jump, reloading, magazine travel, weapon switching, and muted palette shading.
4. During buy time, try WASD, Space, Control, and C: position and height must stay fixed, even with the shop closed. Open B, buy armor, and close the panel; confirm the clock resumes and movement stays locked until it reaches zero. Hold W and Space across the transition and confirm movement/jumping unlock.
5. Shoot a bot's head, then compare controlled bursts with moving fire.
6. Plant at A and B in separate rounds; interrupt planting and verify progress resets.
7. Play Contain, let bots plant, eliminate them, then defuse. The planted core must still require defusing after the final enemy dies.
8. Test smoke, flash, all three difficulties, round restart, and full-match restart.
9. Repeat after GitHub Pages publishing, especially under the repository subpath.
10. Inspect all eight armory entries, choose an opening primary, and verify it is carried after deployment. Buy a different primary and use keys 1/2.
11. Compare stationary scoped sniper shots against moving/unscoped shots; test right-click scope, scope reset, torso kills, bolt/trigger behavior, and each reload.
12. Save settings, reload the page, and confirm preferences remain. Compare standard/performance graphics and crosshair/FOV settings.
13. Compare round-report eliminations, headshot eliminations, accuracy, and credits with the shots you actually fired.
14. In Armory, preview Shot and Reload for all eight guns. Compare all unique reports and handling sounds; test Master volume at zero, midway, and full.
15. In a match, hold M4A1 fire and compare with single-click pistol/snipers. Confirm the SV98 bolt cycle and directional distant bot fire. Interrupt a reload by switching, pause/resume midway, and end a round while reloading; no canceled cue should play later.

Prototype difficulty values are not competitively balanced. No online multiplayer or synchronization is present.
