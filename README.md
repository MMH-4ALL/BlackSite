# BlackSite

Open source, half vibecoded html game open for all students with a chromebook or anyone trying to have fun.

## BlackSite — Tactical Operations / v0.6.2

An original, open-source tactical FPS for a desktop browser. Three muted tactical maps, two objective sites per map, and offline matches against 1–16 bots. Built with HTML, CSS, JavaScript, and Three.js. No account, backend, build step, or paid API is needed.

Version 0.6.2 preserves the buy countdown whenever equipment is open. Press B to shop for as long as you need; close with Return to Game or Escape to resume from the remaining time.

Version 0.6.1 locks walking, strafing, jumping, and crouching during the 12-second buy phase. Look around and buy equipment while waiting; movement unlocks when the live round begins.

Version 0.6.0 adds two original military maps and a saved hostile-count selector. Choose **Operation map** and **Hostile count** on Deploy, then select your role and difficulty. Every integer from 1 to 16 is available; the default is six. A match keeps its selected map/count for all rounds. Returning to the menu and deploying again applies new choices.

| Map | Setting |
| --- | --- |
| Helix Compound | Existing desert research compound, solar court, and reactor hall. |
| Bastion Depot | Fortified supply base with barracks, ammunition bays, blast walls, guard posts, and cargo siding. |
| Ironwood Garrison | Overcast air station with cargo lanes, a maintenance hangar, helicopter apron, trees, and signal relay. |

Bots have clear, separated spawns, unique names, routes to both objectives, and local separation while moving. Navigation uses a cached collision grid and staggered route refreshes for larger groups. Map previews come directly from the playable wall, cover, crate, spawn, and site data. These maps are original project geometry, bundled with the source.

This is a **playable prototype**. M4A1, SV98, and M82 models are modified assets by chasieboy317 from Free3D, optimized into four meshes each with original PBR materials and animated magazines. The pistol and crates use Kenney's CC0 Blaster Kit, with a desaturated palette. Map geometry, articulated bot characters, and first-person gloves are original. See `ATTRIBUTION.md` for the separate asset licenses.

Version 0.3.0 redesigns deployment, the armory, field manual, settings, HUD, buy menu, pause screen, scoreboard, and round results in a muted charcoal/olive style. Model-derived vector previews show the actual weapons. Choose an opening primary in the armory; it is issued at deployment. Snipers have scoped aiming, distinct recoil, heavier movement, and lethal torso hits. M4A1 recoil and objective/bot rules retain the previous behavior. Sidearm and sniper fire is now trigger-based; hold left mouse for automatic M4A1 fire.

Version 0.5.0 adds procedural motion throughout the game: articulated first-person hands, actual-distance walking/running sway, crouch transitions, jump/landing recovery, recoil, muzzle flashes, casing ejection, staged magazine handling, slide/bolt motion where the model has separate parts, smooth scope zoom, utility throws, objective device handling, and hold-V inspection. Bots have jointed legs/feet and arms, breathing, turning/strafe lean, firing recoil, flash reactions, objective handling, and settling deaths. Interface panels and combat feedback have short transitions, with reduced-motion support for the interface. Aiming, damage, ammunition, and gameplay hit volumes remain independent of the presentation.

Version 0.4.0 added AK-47, MP5, C-9 and H-45: five primaries and three sidearms in total. Each new weapon uses a distinct internet-sourced CC0 model adapted with muted PBR materials, an animated magazine and bolt/slide. Choose both opening slots in Armory. Buy primary and sidearm replacements separately; both persist when you survive, while elimination removes them and issues the free P-9.

This update replaces all weapon audio with 60 distinct CC0 recordings. Every gun has
separate shots, reload stages, equip sounds, and empty-trigger clicks; SV98 has a
bolt cycle and bots have separate distant rifle shots. No clip or source excerpt
is shared between guns/actions. In **Armory**, use **Shot** or **Reload** to hear
the chosen weapon, even if WebGL is unavailable. Previews use saved Master volume.
All sounds are bundled locally; no audio account or subscription is needed.
See `assets/audio/LICENSE.md` for credits and the adapted source weapons.

## Play locally

Unzip the project, open a terminal in the folder containing `index.html`, and run:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000** in Chrome, Edge, or Firefox. Do not double-click `index.html`: browsers restrict loading modules and model files from `file://` URLs. After serving the folder, all runtime assets are local; no CDN calls are required. You need WebGL 2, a keyboard, and a mouse. Mobile controls are not included.

Choose your side and difficulty, then click **Deploy to compound**. Your mouse is captured for aiming. Press Escape to release it and pause. Clicking Resume captures it again.

## Match rules

- One human against 1–16 bots (six by default). First to four round wins.
- Attack: plant at A (solar court) or B (reactor hall), then protect the core.
- Defend: stop the attackers or defuse their core.
- Buy phase: 12 seconds, with player movement locked. Live round: 90 seconds. Core timer: 40 seconds.
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
| Right mouse | Toggle sniper scope |
| R | Reload |
| V (hold) | Inspect weapon |
| Shift | Walk |
| Ctrl or C | Crouch |
| Space | Jump |
| 1 / 2 | Carried primary / pistol |
| E (hold) | Plant / defuse |
| G | Smoke grenade |
| F | Flash grenade |
| B | Buy at spawn during the buy phase |
| Tab (hold) | Scoreboard |
| Escape | Pause and release mouse |

Sensitivity and sound volume are adjustable in both settings and pause. Field of view (68–100), crosshair length, and standard/performance graphics are in settings. Preferences and both opening weapons are saved in local browser storage, with a session-only fallback when storage is unavailable.

## Gunplay

- Hitscan weapons with original recoil values and head/body hit detection.
- M4A1: 34 body damage before armor, 160 head damage, 30 rounds, 2.2-second reload. Rifle headshots defeat full health and armor. Rebuy: $2,700.
- SV98: bolt-action, 10 rounds, 1.35-second shot interval, 3.1-second reload, 24° scoped FOV. Rebuy: $3,800.
- M82: semi-automatic, 10 rounds, 0.65-second shot interval, 3.6-second reload, 29° scoped FOV. Rebuy: $4,700.
- Both snipers kill a full-health bot with one head or torso hit; running, jumping, and unscoped firing are inaccurate. Carrying a sniper slows movement.
- P-9 pistol: 25 body damage before armor, 80 head damage, 12 rounds, 1.45-second reload.
- AK-47: 30 rounds, 38 body / 160 head damage, automatic, 2.45-second reload; $2,600.
- MP5: 30 rounds, 27 body / 108 head damage, automatic, 2.1-second reload; $1,500.
- C-9: 18 rounds, 24 body / 96 head damage, semi-automatic, 1.7-second reload; $400.
- H-45: 7 rounds, 54 body / 150 head damage, semi-automatic, 1.95-second reload; $700.
- Bots have 100 HP and body armor. Player armor reduces incoming body damage.
- Running and jumping increase spread. Standing still settles the first shot. The crosshair reflects movement and recoil.
- Strafing, tap firing, and burst control matter. Recoil is intentionally original and does not reproduce either commercial game's exact physics.
- No penetration, grenade damage, fall damage, weapon pickups, matchmaking, or anti-cheat in this release.
- Smoke blocks bot visibility and obscures the scene. Bullets can still pass through it.
- Flash blinds exposed bots; looking at your own flash can blind you too.
- Buy at spawn during the buy phase. Purchasing a different primary replaces the old one. Survive to retain it; death leaves the free P-9 for the next round. Sidearm purchases replace only the sidearm slot. Buying either already-carried weapon cannot refill it.
- Round reports show actual eliminations, headshot eliminations, shot accuracy, and the standard round reward. The live HUD includes remaining hostiles, armor, credits, reload progress, and weapon slots.

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
app.js            Game startup and explicit UI preview mode
ui.js             Menus, armory, settings storage, shop and reports
weapons.js        Shared weapon balance, model paths and equipment metadata
audio.js          Cached weapon recordings, playback, timing and cancellation
game.js           World, gunplay, bots, match rules, controls
assets/           GLB models, vector UI previews, map plan, local WAVs and licenses
tools/            Reproducible converters, vector previews and validation
maps.js           Original map layouts, themes, sites, spawns, and bot-count limits
vendor/           Three.js 0.170.0, loader, utility, MIT license
LICENSE           MIT license for original code
ATTRIBUTION.md    Third-party sources and licenses
```

Edit `DIFFICULTY` in `game.js` and `WEAPONS` in `weapons.js` to tune the game. Edit `buildMap()` for layout. Collision and bot navigation are generated from the solid map boxes. Imported models are replaceable via the weapon metadata; check license and orientation.

An opt-in `?test` URL exposes local state for development and testing. This is an offline game and it is not designed to prevent players from changing their own client.

An explicit `?preview=deploy` (or `armory`, `manual`, `settings`, `hud`, `buy`, `pause`, `scoreboard`, `result`) displays the real interface without starting WebGL or a match. Preview combat values are examples, clearly marked as a preview, and purchases are disabled. This is useful for UI review on a machine without a GPU.

## License and identity

Original project source is MIT licensed. Kenney assets are CC0; Three.js and its addons retain their MIT notice. The Free3D weapons and their derived previews retain chasieboy317's credit and permission for modified reuploads; **they are not covered by the project's MIT license**. See `assets/M4A1-LICENSE.md` and `assets/FREE3D-WEAPONS-LICENSE.md`. No assets are extracted from Counter-Strike, Valorant, or their publishers. The working project name has not been trademark-cleared.

Weapon WAV files are separately licensed CC0 1.0; source credits, modifications,
and MLA references are in `assets/audio/LICENSE.md`. Run audio checks with
`node tools/validate-audio.mjs` and gameplay checks with `node tools/validate.mjs`.

## Current limits

This release uses procedural articulated bot silhouettes, distinct recorded weapon sounds and synthetic objective cues, procedural visual grenade arcs and smoke expansion, and three compact original maps. It has no online multiplayer, physical grenade collisions, imported skeletal character animations, doors, vertical navigation, or automatic side switching. Internet assets are bundled for weapons and crates; the map and bots remain procedural. See `TESTING.md` for what was checked and what still needs a browser playtest.
