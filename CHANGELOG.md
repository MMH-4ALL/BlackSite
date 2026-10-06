# Changelog

## 0.9.0 — Tactical Tools / 6 October 2026

- Added a separate practice range: five reactive targets, two movers, recoil board, headshot/accuracy counters, all eight guns, normal reloads with unlimited reserve, B controls and reset. Training never modifies XP/career/economy.
- Added original headshot/kill sounds, kill confirmation, bounded directional damage arrows, surface-aligned impact marks and capped short-lived sparks. Existing weapon recordings and weapon balance are retained.
- Added factual death recaps with killer, weapon, distance, applied health damage and hit locations; visible while allies continue and in the round report.
- Added consecutive loss rewards ($1,900 to $3,900), scoreboard credits, contextual buy advice and an optional suggested-purchase button. Bots retain rifles when alive, rebuy after death when affordable, and otherwise use the issued P-9 with its correct model/audio/magazine/reload.
- Added purchasable decoys (J, $100, 10 seconds) and incendiaries (K, $500, 8 seconds). False contact attracts idle opponents, without overriding combat memory/urgent objectives. Fire respects walls, height and friendly-fire rules; bots route around enemy fire and smoke extinguishes it. Zones and geometry are capped.
- Added symmetric two-second spawn protection that breaks on firing/utility/leaving the 3m spawn radius, plus short staggered bot releases. The existing buy movement lock and paused shop timer remain.
- Added configurable first-to-2/4/7/10 matches, quick mode, balanced bot fill and optional win-by-two overtime capped at six extra rounds plus a decider. Halftime follows match length; overtime swaps sides in pairs without resetting squad score/credits/surviving equipment.
- Added named A/B objective callouts, plant confirmation and a low-cost core beacon.
- Added original map controls: Helix false-contact relay, Bastion timed loading override, Ironwood equipment-light breaker and Zero timed security bypass. All four maps/layouts/ramps remain; E objective priority and door occupant protection are preserved.
- Kept muted, responsive native UI controls and Performance Mode. Shared bot rifle stays low-poly, no new external runtime requests or downloads; six focused modules isolate the new systems. Previous release notes/licenses remain intact.
- Extended real-model/gameplay and Chromium regressions for rules, utilities, recaps, switches, training and storage. See TESTING.md for measured budgets and device-testing limits.

## 0.8.1 — Weapon Inspection / 6 October 2026

- Tap F or Y to play a full 2.4-second inspection on any weapon, with a smooth lift, turning motion and automatic return. The existing hold-V inspection remains available.
- Flashbangs move to H so F can inspect without throwing a grenade. Smoke stays on G. HUD hints, Field Manual and README show the new controls.
- Firing, reloading, scopes, utility and weapon/round changes cancel the inspection; pause freezes it. Presentation leaves aim, ammunition, damage and weapon statistics unchanged.

## 0.8.0 — Squad Operations / 5 October 2026

- Replaced the normal procedural bot presentation with optimized Quaternius CC0 humanoids: distinct gray attackers and olive defenders, helmets, ally markers, thirteen skeletal clips, independent upper/lower blending, rifle aim/hand attachments, reactions and deaths. A built-in fallback remains for failed character downloads.
- Added six AI decision profiles: Aggressive, Cautious, Flanker, Objective, Marksman and Support. Existing difficulty still controls reaction, accuracy, memory and speed. Up to seven allies can join the human against 1–16 enemies; friendly fire is disabled and allied objective/combat play continues after a human elimination.
- Teams switch attack/defense once after round three, with an explicit banner, correct spawns/objective roles and retained team score, credits and surviving equipment.
- Added animated, audible sliding doors with E interaction, closed-door collision/bullet/vision blocking, occupant protection and bot opening. Objective interaction takes precedence.
- Added cached height-aware routes, textured ramps and accessible gantries on the three existing maps. Introduced BlackSite Zero: an original partially underground research installation with two objective sites, service routes, interiors, doors and a raised position. One walkable height per X/Z avoids unreliable stacked-floor navigation.
- Strengthened the existing map identities with locally bundled CC0 communications/logistics/motor-pool props, lighting/fog palettes, subtle desert dust and cold light rain. Existing Helix, Bastion and Ironwood layouts and v0.7.1 floor separation remain.
- Added nine original weapon finishes with per-gun Armory selection; four are available from level one and others unlock through cosmetic progression. All eight weapons keep their damage, recoil, accuracy, handling, movement and recorded audio.
- Added offline XP, levels, combat/objective/weapon/map/difficulty/playtime statistics, personal bests, ten permanent challenges, badges and a Career screen. LocalStorage failures fall back to session data. Cosmetic unlocks give no gameplay power.
- Expanded Deploy with team presets/customization, remaining allies/enemies, scoreboard team/profile/K-D labels, crosshair shapes/presets/dot/outline/gap/thickness/opacity/dynamic expansion, round histories, XP/level/unlock reports and staged loading feedback.
- Added sixteen distinct, original CC0 environment WAVs: concrete/metal/dirt/gravel footsteps, doors, material impacts and ambient wind/rain/machinery. Existing sixty weapon recordings and their credits remain intact. Voice counts, ambient loops and debris are bounded and cleaned up.
- Added lightweight cosmetic breakable lights/equipment. Destroyed scenery does not alter navigation, objectives or movement collision; capped debris expires and objects reset each round.
- Batched static scenery and the shared bot rifle, merged operator parts into one skinned draw, staggered AI senses/paths, cached navigation edges, limited HUD/radar updates and added animation distance LOD. Performance Mode disables shadows, weather particles and debris. Repeated browser map switches keep GPU geometry/texture counts stable.
- Fixed stale mouse-capture requests after leaving/restarting matches and refreshed the camera immediately on round spawn. Split major systems into focused modules; expanded regression tooling and preserved previous release history/licenses.
- Validation: all five current suites pass, including real Chromium WebGL/input, 24 browser team/map configurations, maximum 23-bot logic configurations, objectives, side switches, doors/ramps, all 72 finish combinations, storage failures and the GitHub Pages subpath. Measured 86–100 world draw calls with sixteen bots in Performance Mode. Hardware Chromebook FPS, cross-browser behavior and real sound playback remain device playtests; see TESTING.md.

## 0.7.1 — Floor flicker fix

- Separated overlapping concrete and asphalt top faces on every map and lifted objective rings above the loading pads to prevent z-fighting.

## 0.7.0 — Textured military environments

- Replaced all three block layouts with new military compounds built around imported textured structures and props.
- Added brick warehouses, barracks, radio stations, guard towers, corrugated cargo, fuel tanks, and Hesco barriers; all runtime assets are bundled.
- Added real concrete, asphalt, and metal color/normal/roughness maps, loading pads, road markings, curbs, drains, and perimeter details.
- Rebuilt matching collision footprints, bullet/vision blockers, bot navigation, objective sites, and tactical plans.
- Added attributed CC0/CC-BY notices, source hashes, conversion tooling, and actual-scene CPU previews.
- Preserved 1–16 bots, difficulties, buy movement lock, and shopping timer pause.


## 0.6.2 — Paused Buy Countdown / 3 October 2026

- Opening equipment with B preserves all remaining buy time until the shop is closed. The open shop independently blocks simulation updates, including during delayed mouse-capture events.
- The equipment panel clearly states that the timer is paused. Closing with Return to Game or Escape resumes the countdown without deducting shopping time.
- Checked thirty seconds of shopping, purchases, repeated visits, delayed mouse-capture events, both close paths, and the live-round transition.

## 0.6.1 — Buy-Phase Movement Lock / 3 October 2026

- Walking, strafing, jumping, and crouching are locked throughout the buy phase, including with the shop closed. Leftover velocity is cleared.
- The countdown, looking around, loadout changes, and shopping remain available. Held movement keys work when the round goes live.
- Checked every movement input on all three maps and both sides, plus shopping, countdown, bot freezing, and the live-round transition.

## 0.6.0 — Military Maps & Hostile Counts / 2 October 2026

- Added Bastion Depot and Ironwood Garrison as distinct original military maps; Helix Compound remains available.
- Saved map and 1–16 hostile selectors on Deploy, with six bots by default. Match choices persist between rounds and change on the next deployment.
- Separate collision layouts, cover, objectives, patrol routes, map palettes, military scenery, and plans generated from actual layout data.
- Clear, spaced spawns on both sides, sixteen unique bot names, alternating objective assignments, and local movement separation.
- Cached navigation occupancy and staggered route refreshes for larger bot groups.
- Radar, location, pause, and scoreboard labels follow the selected map; reports scroll to fit every hostile.
- Validated all three maps and both sides with 1/3/6/16 bots: clear spawns, routes to both sites, sixteen-bot planting/defusing, match resets, and final-enemy victory. Existing weapon, animation, economy, and audio checks remain in place.

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
