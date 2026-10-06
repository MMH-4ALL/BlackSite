# BlackSite

Open source tactical browser FPS for Chromebook players and ordinary laptops.

**v0.8.1 — Weapon Inspection** adds tap-to-inspect controls to Squad Operations,
with its animated operators, allied squads, four maps and offline career. It remains a static
HTML/CSS/JavaScript game using bundled Three.js r170: no account, paid API,
backend, CDN or build step is required to play.

[Play on GitHub Pages](https://mmh-4all.github.io/BlackSite/)

## Squad Operations

- Quaternius CC0 humanoid operators with 13 retargeted skeletal clips, separate
  upper/lower blending, muted attacker/defender clothing and friendly markers.
  Animation presents locomotion, aiming, firing, reloads, crouching, flash
  reactions, objective work and death. Combat values are independent of animation.
- Six persistent bot personalities: Aggressive, Cautious, Flanker, Objective,
  Marksman and Support. Easy/Normal/Hard retain their reaction, aim and memory
  differences. Personalities change decisions rather than weapon power.
- Customize **0–7 allies** and **1–16 enemies**. Presets include solo 1v5, 3v5,
  5v5 and 8v8. Allies fight, navigate, plant, hold and defuse. Friendly fire is
  disabled, and surviving allies continue after the player dies.
- First to four round wins, with a side switch after round three. Score, credits,
  the roster and surviving weapons carry over. A banner announces the new role.
- Strategic animated sliding doors block movement, bullets and sight while
  closed. Players and bots can open them. Occupants prevent a door closing on
  them. Holding E for a nearby objective takes priority over door interaction.
- Accessible ramps and elevated gantries on the existing maps. BlackSite Zero
  has a sunken interior, exterior checkpoint, three access ramps, control and
  storage sites, roofed rooms, service routes and a raised overlook.
- Armory finishes: Default, Tactical Black, Desert, Urban, Woodland, Carbon,
  Worn Steel, BlackSite Elite and Field Honors. Four are available initially;
  levels and a challenge badge unlock the others. Finishes never change stats.
- Local XP/levels, career statistics, selected service badge, personal bests and
  ten permanent challenges. Profile and reports show combat, accuracy, objectives,
  map/difficulty wins, weapon usage, playtime and progression.
- Expanded reports include team setup, score, round history, XP, level progress,
  challenge progress and unlocks. Crosshair shape, length, thickness, gap, dot,
  outline, opacity, color and recoil expansion are saved.
- Quiet wind/rain/machinery, surface footsteps, doors and impacts supplement the
  existing 60 distinct weapon recordings. Helix has subtle dust; Ironwood has
  light rain/mist. Four small lights/equipment props per map can break without
  changing routes, buildings or collision. They reset each round.

## Maps

| Map | Identity and additions |
| --- | --- |
| Helix Compound | Desert communications facility; solar equipment, terminals, pipes, fuel equipment, signal access door and raised gantry. |
| Bastion Depot | Military logistics facility; loading lift, conveyor, machinery, cargo yards, loading door and gantry. |
| Ironwood Garrison | Overcast motor pool; machinery, pipes, chimney, cold atmosphere, rain, access door and gantry. |
| BlackSite Zero | Original partially underground research installation; exterior security, sunken rooms, service tunnels, two sites, two doors and raised overlook. |

Existing textured warehouses, barracks, radio stations, guard towers, containers,
fuel tanks, Hesco barriers, asphalt/concrete/metal textures and original layouts
are retained. Layouts do not recreate commercial FPS maps. Menu previews come
from the actual geometry with CPU lighting; they are previews rather than
screenshots of GPU lighting.

## Play locally

Download the complete release ZIP, extract it, and serve the folder containing
`index.html`:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a desktop browser supporting WebGL 2. Choose map,
teams, side and difficulty, then Deploy. Use a keyboard and mouse. `file://`
opening cannot load browser modules/models reliably. All game assets are served
locally; an internet connection is unnecessary when running this local server.
No service-worker installation or first-load offline Pages cache is provided.

## Controls and match rules

| Input | Action |
| --- | --- |
| WASD / mouse | Move / aim |
| Left mouse | Fire; hold for automatic weapons |
| Right mouse | Toggle sniper scope |
| R | Reload |
| F or Y | Play a weapon inspection; hold V still works |
| Shift | Walk |
| Ctrl or C | Crouch |
| Space | Jump |
| 1 / 2 | Owned primary / sidearm |
| E | Open/close a nearby door |
| E (hold, stationary) | Plant in 3 seconds; player defuse in 5 seconds |
| G / H | Smoke / flash |
| B | Shop at spawn during buy time; pauses the countdown |
| Tab (hold) / wheel | Scoreboard / scroll its roster |
| Escape | Release mouse and pause |

The 12-second buy phase locks walking, strafing, jumping and crouching. Looking
and purchasing remain available. Opening equipment pauses the whole offline
simulation and preserves remaining buy time. A live round lasts 90 seconds;
an armed core lasts 40 seconds. Bots take seven seconds to defuse, and extra bots
do not accelerate progress. A planted core remains urgent after a team dies.

Wins award $3,000, losses $1,900, and player eliminations $300, up to $16,000.
Survival retains both weapons; player death removes the primary and issues the
free P-9. Armor and utility retain their existing purchase/capacity rules.
After death the camera follows a surviving ally; there is no free spectator camera.

## Preserved arsenal

Five primaries and three sidearms retain their existing damage, recoil, spread,
movement, fire rate, ammo, scopes, animation and individually licensed recordings.

| Weapon | Magazine | Body / head damage before the existing armor rule | Reload | Rebuy |
| --- | ---: | ---: | ---: | ---: |
| M4A1 | 30 | 34 / 160 | 2.20 s | $2,700 |
| AK-47 | 30 | 38 / 160 | 2.45 s | $2,600 |
| MP5 | 30 | 27 / 108 | 2.10 s | $1,500 |
| SV98 | 10 | 145 / 400 | 3.10 s | $3,800 |
| M82 | 10 | 132 / 280 | 3.60 s | $4,700 |
| P-9 | 12 | 25 / 80 | 1.45 s | Free |
| C-9 | 18 | 24 / 96 | 1.70 s | $400 |
| H-45 | 7 | 54 / 150 | 1.95 s | $700 |

`weapons.js` is authoritative. Stationary shots settle; movement/jumping widen
spread; bursts climb and pull sideways. The two snipers retain lethal torso
shots, slower movement, trigger-based fire and scoped aiming. Tap F or Y for a complete inspection (or hold V);
hands, magazine/bolt/slide handling, walking, landing and utility animations remain.

## Career and storage

Career saves at round completion and when returning to the menu. Abandoned
matches keep recorded combat/time but do not count as wins or award round XP.
Closing the tab during an unfinished round can lose that round's unsaved progress.
Statistics belong to this browser/origin, with no account, leaderboard or cloud
sync. Private browsing, storage clearing and different Pages/local origins have
separate records. Malformed/blocked/full LocalStorage falls back to session play.

Levels unlock only cosmetics. The ten challenges are First Deployment,
Headhunter, Demolition, EOD, Veteran, Operator, Arsenal, Survivor, Precision and
BlackSite. Each is permanent, with visible progress and a one-time badge/XP award.
There are no daily streaks, purchases, weapon upgrades or time-limited rewards.

## Performance and current limits

Start with **Performance** graphics on Chromebooks, especially with larger teams.
It uses 1x pixel ratio, no real-time shadows, no weather particles or debris and
lower distant animation rates. Standard uses up to 1.5x ratio, 1024px shadows and
small particle/debris caps; High uses 2048px shadows and modestly larger caps.
Fog is inexpensive and visibility remains readable.

Navigation connectivity is cached at map load; path/sight work is budgeted and
staggered. Animation distance LOD changes only presentation. Static geometry and
bot rifle materials are batched, and operator parts share one skinned draw.
Bot rifle presentation uses a simplified version of the existing CC0 AK model;
its original rifle AI/combat/audio values remain unchanged. Player weapons retain
full models. Skeleton textures, mixers, map geometry, particles and audio nodes
are cleaned up; cached shared assets stay available for later matches.

This is offline play with one human and AI, not online multiplayer. Navigation
supports one walkable height at each X/Z location. Explicit ramps/gantries are
supported; arbitrary stacked walkable floors, ladders and accessible decorative
perimeter towers are not. Imported stairs were unsuitable for the height field;
textured ramps provide reliable access instead. Free UAL pistol handling supplies
upper-body poses; BlackSite adds carried rifle aim/recoil and visual attachments.
Destruction is limited to cosmetic lights/equipment, with capped temporary debris.
Weather is deliberately subtle. Mouse capture and GPU speed vary by browser/device.

## GitHub Pages

Upload the complete folder to a GitHub repository. In Settings → Pages, publish
from `main` and `/ (root)` (or use a static Pages workflow). Relative module and
asset paths support repository URLs such as `/BlackSite/`. No `CNAME`, paid domain,
server process or runtime remote asset host is required.

## Source layout and validation

| File | Responsibility |
| --- | --- |
| `app.js`, `index.html`, `style.css`, `ui.js` | Startup, muted interface, settings, Armory and shop |
| `game.js`, `weapons.js`, `audio.js` | Authoritative match/combat, first-person presentation, weapon definitions/audio |
| `maps.js`, `environment.js`, `navigation.js`, `doors.js` | Maps, local scenery, height-aware routes and doors |
| `characters.js`, `ai.js` | Skeletal presentation/LOD and bot personalities/teams |
| `skins.js`, `crosshair.js` | Original cosmetic materials and configurable reticle |
| `progression.js`, `challenges.js`, `stats.js`, `career-ui.js` | Local career, achievements, reports and statistics |
| `effects.js`, `environment-audio.js`, `performance.js` | Bounded effects/audio and geometry batching |
| `assets/`, `vendor/` | Bundled models, textures, recordings, previews, notices and Three.js |
| `tools/` | Conversion, previews and validation; development dependencies do not ship to gameplay |

Run `node tools/validate.mjs`, `node tools/validate-career.mjs`,
`node tools/validate-environment.mjs` and `node tools/validate-audio.mjs`.
`node tools/validate.mjs --benchmark` measures CPU AI/presentation, not GPU FPS.
Optional `tools/validate-browser.mjs` uses development-only Playwright/Chromium.
See `TESTING.md` for completed checks, commands and remaining device playtesting.

## Licenses

Original project code is MIT. New Quaternius/Kenney assets and original environment
recordings are CC0, with full sources, dates, changes and preserved notices.
Existing CC-BY environment credits and Free3D weapon permissions remain separate
from the code license. Do not assume every asset is MIT or CC0.
See `ATTRIBUTION.md`, `assets/*/LICENSE.md`, `assets/M4A1-LICENSE.md` and
`vendor/THREE-LICENSE.txt`. Prior releases and changelog history remain available.
