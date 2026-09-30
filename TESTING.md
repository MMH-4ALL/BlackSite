# Validation — 30 September 2026

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
- Binary integrity and mesh data for all three bundled GLB assets.
- Static asset and module imports are local and use relative paths.

## Not completed in this environment

An interactive browser rendering test was not available: the test-browser download returned an invalid archive. No desktop visual performance, mouse-capture, sound playback, weapon framing, or cross-browser claims are made. A human playtest is still required before treating this as a polished release.

## First browser playtest

1. Serve with `python3 -m http.server 8000` and open `http://localhost:8000`.
2. Confirm the menu, weapon models, map, and shadows appear without console errors.
3. Start Easy / Breach. Test mouse capture, Escape / Resume, WASD, crouch, jump, and reloading.
4. Open B during buy time; buy armor, close the panel, and confirm the clock resumes.
5. Shoot a bot's head, then compare controlled bursts with moving fire.
6. Plant at A and B in separate rounds; interrupt planting and verify progress resets.
7. Play Contain, let bots plant, eliminate them, then defuse. The planted core must still require defusing after the final enemy dies.
8. Test smoke, flash, all three difficulties, round restart, and full-match restart.
9. Repeat after GitHub Pages publishing, especially under the repository subpath.

Prototype difficulty values are not competitively balanced. No online multiplayer or synchronization is present.
