# Validation — 1 October 2026

## Completed

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
- Corpse animation changes the visual rig rather than the gameplay hit volumes.
- Binary integrity and mesh data for the active GLB assets; all external texture references resolve to bundled files.
- Weapon framing inspected in a CPU projection of the actual loaded geometry and game transforms. This verifies orientation and screen coverage, not browser lighting or frame rate.
- Static asset and module imports are local and use relative paths.

Run the checks with `node tools/validate.mjs`. Rendering and DOM are stubbed, but the rifle loader, scene graph, geometry, materials, raycaster, and gameplay logic are real. No network or installed npm packages are required.

## Not completed in this environment

GPU rendering, mouse capture, sound playback, frame rate, and cross-browser behavior have not been verified by the Node checks. A desktop browser playtest is still required before treating this as a polished release.

## First browser playtest

1. Serve with `python3 -m http.server 8000` and open `http://localhost:8000`.
2. Confirm the menu, weapon models, map, and shadows appear without console errors.
3. Start Easy / Breach. Test mouse capture, Escape / Resume, WASD, crouch, jump, reloading, magazine travel, weapon switching, and muted palette shading.
4. Open B during buy time; buy armor, close the panel, and confirm the clock resumes.
5. Shoot a bot's head, then compare controlled bursts with moving fire.
6. Plant at A and B in separate rounds; interrupt planting and verify progress resets.
7. Play Contain, let bots plant, eliminate them, then defuse. The planted core must still require defusing after the final enemy dies.
8. Test smoke, flash, all three difficulties, round restart, and full-match restart.
9. Repeat after GitHub Pages publishing, especially under the repository subpath.

Prototype difficulty values are not competitively balanced. No online multiplayer or synchronization is present.
