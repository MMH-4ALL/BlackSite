# Weapon inspection patch — v0.8.1 / 6 October 2026

Tap F or Y for a 2.4-second inspection, hold V for the original pose, G for smoke and H for flash. Gameplay and Chromium browser suites passed. Validation checks both tap keys on all eight guns, automatic return, no utility/ammo consumption, camera independence, pause, repeat keys, combat/reload/scope/utility cancellation and round/weapon resets. Browser checks exercise real F/Y/H keyboard input. The v0.8.0 regression record remains below.

# Validation — v0.8.0 / 5 October 2026

## Current completed checks

All five validation scripts below passed again on the final expansion source, including the final operator facing and hand attachment changes. A machine-readable record of checks and measured budgets is in `tools/reports/v0.8.0-validation.json`.

| Suite | What was exercised |
| --- | --- |
| Gameplay/assets | Actual bundled GLTFLoader, Three.js scene graph/raycasts and game logic; all four maps, both sides, Easy/Normal/Hard, 1/3/6/16 enemies, maximum 16 enemies + 7 allies, clear/separated spawns, paths to both sites, real bot plant/defuse, allied combat/friendly-fire rules, post-human-death victory, halftime without score/economy/weapon reset |
| Weapons/animation | All eight weapon definitions and handling rigs, real lethal head/torso raycasts, ammunition/cooldowns, scopes, recoil, inspect/crouch/jump, purchases/ownership/death reset/survival retention, smoke/flash, skeletal clip changes, near/distant LOD, zero-time freeze, independent hit volumes, finite transforms and mixer disposal |
| Doors/vertical world | Closed doors block motion/bullets/sight; occupants prevent closure, bots open doors, resets restore state; every map's elevated destination is reached by actual bot movement over its ramp; map arrays replace rather than accumulate, floor top layers and objective rings avoid overlapping planes |
| Career/cosmetics/UI | Persistent counters, all ten challenges, XP/unlocks, duplicate-round prevention, partial-match handling, malformed/denied/quota-exceeded storage, all weapons/finishes without balance changes, crosshair controls, actual Career/Challenges/Armory/report DOM and team presets |
| Environment | Sixteen distinct local PCM files; audio caching, missing-file fallback, volume/mute, bounded spatial voices, ambient/pause cleanup, weather quality/disposal, actual bullet-raycast cosmetic destruction, round restoration and capped/finite/expiring debris |
| Weapon audio | All sixty existing WAVs, distinct files/source excerpts, licensing/provenance, each weapon's shot/action mapping, reload/cycle timing/cancel/resume, distant bot attenuation/pan, caching, rapid fire and node cleanup |
| Real browser | Chrome 151.0.7922.34 with actual software WebGL 2/ANGLE SwiftShader: mouse capture, buy movement lock, 800 simulated frames with B-shop time unchanged, purchase/close/resume, 24 four-map/two-side/1,6,16-enemy configurations with 2 or 7 allies, rendered operator facing/hand attachment and finite transforms |
| Browser materials/lifecycle | All four worlds rendered; all 72 weapon/finish pairs compiled; six menu views at 960×600 without horizontal overflow; persisted settings/skins/career, reports, quality/shadows, optional operator-download failure, denied storage, no console/runtime errors, no external runtime requests, all `/BlackSite/` assets resolve. Four repeated sixteen-operator map resets held at 77 geometries / 15 textures |

Node suites stub the DOM, GPU and Web Audio nodes while retaining real model/geometry/combat/data logic. Browser fixtures freeze the normal animation frame loop and step the real callback deterministically; the initial mouse-capture/shop tests use real keyboard/click input. Later mass-deployment fixtures suppress only their non-user pointer-capture requests. These checks are broader than compilation but are not a human competitive playtest.

## Measured performance budgets

- Sixteen animated bots, Performance Mode: Helix 100 world draw calls, Bastion 86, Ironwood 92, Zero 90; approximately 170k–175k rendered world triangles.
- Shared static-world batching saves approximately 260–300 draws. Operators use one 6,386-triangle skinned mesh; the 410,780-byte GLB includes thirteen clips. Bot rifle presentation is one shared mesh/material; first-person weapons retain their detailed models.
- In this Linux CPU sample, sixteen-bot AI + animation + scene-transform P95 was 0.41–0.54 ms; twenty-three bots were 0.68–1.10 ms. This excludes GPU rendering and UI, and varies by machine.
- Software WebGL render submission and screenshot timings are not hardware FPS. No claim is made that these numbers predict Chromebook frame rate.
- Performance Mode: 1x pixel ratio, no real-time shadows, weather particles or debris, reduced distant animation frequency. Standard/High enable bounded extras. AI gameplay remains authoritative at every quality level.

## Reproduce

From the repository root, with Node.js:

```sh
node tools/validate.mjs --benchmark
node tools/validate-career.mjs
node tools/validate-environment.mjs
node tools/validate-audio.mjs
```

These four scripts use bundled runtime files and built-in Node facilities; no installed npm runtime packages are required. Optional browser validation requires **development-only** Playwright and Chromium. Install them in a separate tooling location or provide their existing paths:

```sh
PLAYWRIGHT_MODULE_PATH=/absolute/path/to/playwright BLACKSITE_CHROMIUM=/absolute/path/to/chromium node tools/validate-browser.mjs
```

`BLACKSITE_TEST_ARTIFACTS=/absolute/path` saves browser scene/UI snapshots. The test starts its own temporary local HTTP server under `/BlackSite/`. Neither Playwright nor Chromium is downloaded by gameplay or included as a player dependency.

## Remaining human/device checks

- Play full operations on real Chromebook/integrated graphics hardware with 16 enemies, then try 7 allies as well. Compare sustained FPS, thermals, aim latency and Standard/High quality, especially during smoke/flash/weather.
- Check speaker/headphone playback and subjective spatial levels for all eight guns, surfaces, doors and ambient loops. Node audio scheduling and browser unlocking do not verify audible output.
- Check other desktop browsers and mouse/keyboard behavior, game balance, long-session memory, legibility at combat distance, and full round/match flow after publishing.
- Inspect door/ramp sightlines and indoor Zero routes in normal play. Navigation deliberately supports one walkable height per X/Z, not arbitrary stacked floors or ladders. Decorative perimeter towers remain inaccessible.
- Test Pages after a hard refresh if an older cached asset survives the release. Career is per-browser LocalStorage, not a cloud save; settings/cosmetics fail gracefully into session data, and closing a tab mid-round can lose the most recent unsaved counters.

## Historical validation before v0.8.0

The following records describe older releases and the environment limitations at that time. Current Chromium WebGL/input checks above supersede the historical statement that browser rendering had not been exercised.

# Validation — 3 October 2026

## Completed

- v0.7.1: actual world-space floor geometry on all three maps has separated top faces wherever slabs overlap, and both objective rings sit above the underlying loading pads.
- v0.6.2: thirty seconds in the shop preserves the exact remaining buy and simulation time, including a delayed mouse-capture event and stale pause flag. Purchases and repeated visits work; Return to Game and Escape resume without subtracting shopping time.
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

## v0.7.0 environment validation

- All ten bundled environment GLBs parse with the real Three.js loader: normalized floor origin, unit width, normals, UVs, and referenced JPGs. Texture decoding is stubbed in Node; Pillow decodes the actual textures for CPU scene previews.
- Solid imported mesh bounds match their rotated collision footprints. Barracks, warehouses, radio station, cargo, barriers, and tanks block actual bullet/vision raycasts.
- Both sides and 1/3/6/16 bots on all three replacement layouts have clear spawns, connected objectives, and sixteen-bot plant/defuse simulations.
- Existing buy lock, shopping timer pause, gun/animation/audio regressions pass.
- CPU scene previews show actual geometry, UVs and textures with simple lighting. GPU rendering, shaders, sound playback and frame rate still require a desktop browser playtest.
