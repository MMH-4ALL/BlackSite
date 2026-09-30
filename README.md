# BlackSite

Open source, half vibecoded html game open for all students with a chromebook or anyone trying to have fun.

## Breach Protocol — Helix Compound

An original, open-source tactical FPS for a desktop browser. A muted desert research compound, two objective sites, and offline matches against three bots. Built with HTML, CSS, JavaScript, and Three.js. No account, backend, build step, or paid API is needed.

This is a **first playable prototype**, not a replacement for a commercial shooter. The weapon models and crates come from Kenney's CC0 Blaster Kit, recolored to graphite. Map geometry and simple articulated bot characters are original. The weapon pack is stylized rather than a realistic military pack. See `ATTRIBUTION.md` for license details.

## Play locally

Unzip the project, open a terminal in the folder containing `index.html`, and run:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000** in Chrome, Edge, or Firefox. Do not double-click `index.html`: browsers restrict loading modules and model files from `file://` URLs. After serving the folder, all runtime assets are local; no CDN calls are required. You need WebGL 2, a keyboard, and a mouse. Mobile controls are not included.

Choose your side and difficulty, then click **Deploy to compound**. Your mouse is captured for aiming. Press Escape to release it and pause. Clicking Resume captures it again.

## Match rules

- One human against three bots. First to four round wins.
- Attack: plant at A (solar court) or B (reactor hall), then protect the core.
- Defend: stop the attackers or defuse their core.
- Buy phase: 12 seconds. Live round: 90 seconds. Core timer: 40 seconds.
- Hold E while stationary: plant in 3 seconds; player defuse in 5 seconds.
- Defending bots take 7 seconds to defuse. Multiple bots do not accelerate it.
- Eliminating all attackers does not win a defending round if their core is still active. You must defuse it.
- Death ends the round immediately in this solo mode; there are no human teammates.
- Pausing or opening the buy panel freezes this offline simulation.

## Controls

| Key | Action |
| --- | --- |
| WASD / mouse | Move / aim |
| Left mouse | Fire |
| R | Reload |
| Shift | Walk |
| Ctrl or C | Crouch |
| Space | Jump |
| 1 / 2 | Rifle / pistol |
| E (hold) | Plant / defuse |
| G | Smoke grenade |
| F | Flash grenade |
| B | Buy at spawn during the buy phase |
| Tab (hold) | Scoreboard |
| Escape | Pause and release mouse |

Sensitivity and sound volume are adjustable in the pause menu. Settings are session-only.

## Gunplay

- Hitscan weapons with original recoil values and head/body hit detection.
- M-17 rifle: 34 body damage before armor, 160 head damage, 30 rounds, 2.2-second reload. Rifle headshots defeat full health and armor.
- P-9 pistol: 25 body damage before armor, 80 head damage, 12 rounds, 1.45-second reload.
- Bots have 100 HP and body armor. Player armor reduces incoming body damage.
- Running and jumping increase spread. Standing still settles the first shot. The crosshair reflects movement and recoil.
- Strafing, tap firing, and burst control matter. Recoil is intentionally original and does not reproduce either commercial game's exact physics.
- No penetration, grenade damage, fall damage, weapon pickups, matchmaking, or anti-cheat in this release.
- Smoke blocks bot visibility and obscures the scene. Bullets can still pass through it.
- Flash blinds exposed bots; looking at your own flash can blind you too.

## Bot difficulty

All levels have the same 100 health. Difficulty changes behavior rather than health.

| Level | Reaction delay | Fire interval | Aim spread | Move speed | Last-seen memory |
| --- | --- | --- | --- | --- | --- |
| Easy | 0.95 s | 0.55 s | 0.14 | 2.4 m/s | 1.5 s |
| Normal | 0.55 s | 0.30 s | 0.072 | 3.0 m/s | 3 s |
| Hard | 0.28 s | 0.19 s | 0.04 | 3.5 m/s | 5 s |

Bots use grid-based pathfinding, cover/smoke line-of-sight checks, last-seen pursuit, and objective actions. Normal/Hard bots strafe in firefights. They do not call an AI service. Awareness is intentionally omnidirectional when line of sight is clear, and navigation is a simple grid, not a production navigation mesh. Balance values are starting points and need human playtesting.

## Publish to GitHub Pages

1. Create a new **public** GitHub repository, for example `breach-protocol`.
2. Upload the **contents** of this folder. `index.html` must be at the repository root, alongside `game.js`, `style.css`, `assets`, and `vendor`. Do not upload only the ZIP or only the HTML file.
3. In the repository, open **Settings → Pages**.
4. Choose **Deploy from a branch**, then **main** and **/(root)**. Save.
5. Wait for the Pages deployment, then open the address GitHub displays. A project site typically looks like `https://YOUR-USERNAME.github.io/breach-protocol/`.

Every asset URL is relative so a repository subpath works. `.nojekyll` is included. No workflow secret, package installation, or build command is needed for publishing.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

### Let the assistant upload it

Connect the GitHub plugin in ChatGPT and grant access to the intended repository. Then send the repository URL and say: “Upload the Breach Protocol project to this repository and enable GitHub Pages.” Repository write access is required; changing Pages settings may require separate repository administration permission. If the connection provides read-only access, the assistant must tell you and use an approved write-capable GitHub connection or have you perform the final upload. Never paste passwords or access tokens into chat.

## Source layout

```
index.html        Game menus and HUD
style.css         Interface styling
game.js           World, gunplay, bots, match rules, controls
assets/           CC0 GLB models and original pack license
vendor/           Three.js 0.170.0, loader, utility, MIT license
LICENSE           MIT license for original code
ATTRIBUTION.md    Third-party sources and licenses
```

Edit `DIFFICULTY` and `WEAPONS` near the start of `game.js` to tune the game. Edit `buildMap()` for layout. Collision and bot navigation are generated from the solid map boxes. Imported weapon models are replaceable in `loadAssets()`; check both the new asset's license and orientation.

An opt-in `?test` URL exposes local state for development and testing. This is an offline game and it is not designed to prevent players from changing their own client.

## License and identity

Original project source is MIT licensed. Included Kenney assets are CC0; Three.js and its addons retain their MIT notice. No assets are extracted from Counter-Strike, Valorant, or their publishers. The working project name has not been trademark-cleared. Asset provenance reduces avoidable licensing problems but is not a guarantee against any possible complaint.

## Current limits

This release uses simple bot silhouettes, synthetic sound effects, basic utility effects, and a compact original map. It has no online multiplayer, physical grenade arcs, advanced skeletal character animations, doors, vertical navigation, or automatic side switching. Internet assets are bundled for weapons and crates; the map and bots remain procedural. See `TESTING.md` for what was checked and what still needs a browser playtest.
