# Environment asset licenses / v0.7.0

The original map arrangements and environment code are MIT licensed. Imported
models and textures keep the licenses below, separate from the code license.
All files are bundled locally for GitHub Pages and may be redistributed with
this public source repository under their listed terms.

## Zsky — Military Base Pack / CC BY 4.0

Creator: Zsky (@Zsky_01). Required attribution: https://www.patreon.com/Zsky
Source: https://opengameart.org/content/military-base-pack
Source ZIP: https://opengameart.org/sites/default/files/military_base.zip
License: https://creativecommons.org/licenses/by/4.0/
Original author notice: `ZSKY-ORIGINAL-LICENSE.txt`.
Included: `quarter.glb`, `radiostation.glb`, `snipertower.glb`,
`gatekeeperstation.glb`, `gastank.glb`, `lightpole.glb`, `container_01.glb`,
`sandssack.glb`. Changes: OBJ triangulation, meter-friendly unit width and
floor origin, world-sized planar UVs, muted colors, ambientCG PBR materials,
and placement/scaling. Original geometry retained. Credit must stay with
redistributions and adaptations; no endorsement is implied.

## 32kda — Warehouse building low-poly / CC0 1.0

Source: https://opengameart.org/content/warehouse-building-low-poly
Source ZIP: https://opengameart.org/sites/default/files/warehouse02.zip
Included: `warehouse.glb` and `warehouse-color.jpg` from Set 01.
Changes: normalized origin/width, external resized JPEG atlas, desaturation,
roughness/material adjustments, and placement/scaling. The source author
reports the texture set is made from CC0 textures, including
ScreamingBrainStudios. The asset listing dedicates the model/textures to CC0.
License: https://creativecommons.org/publicdomain/zero/1.0/

## Yughues / Nobiax — Hesco box / CC0 1.0

Source: https://opengameart.org/content/hesco-box
Source archive: https://opengameart.org/sites/default/files/hesco.7z
Included: `hesco.glb`, `hesco-color.jpg`, `hesco-normal.jpg` from the sand model.
Changes: triangulated OBJ, normalized origin/width, converted/resized textures,
muted diffuse colors. Authored UVs retained. Original notice:
`YUGHUES-ORIGINAL-LICENSE.txt`.
License: https://creativecommons.org/publicdomain/zero/1.0/

## ambientCG — Concrete034, Asphalt010, Metal032 / CC0 1.0

Sources: https://ambientcg.com/view?id=Concrete034
https://ambientcg.com/view?id=Asphalt010
https://ambientcg.com/view?id=Metal032
Downloads: the official 1K-JPG packages linked on those pages, retrieved
3 October 2026. Included color, OpenGL normal, and roughness JPG maps.
Changes: JPEG recompression, muted color saturation, runtime tile density and
normal strength. The source pages explicitly allow copying, modifying and
redistributing these assets for any purpose, including commercially.
License: https://creativecommons.org/publicdomain/zero/1.0/

## Derived scene previews

`*-scene.jpg`, `*-street.jpg`, and `environment-overview.jpg` are CPU renders of
the actual bundled game geometry and textures. They contain the above assets
and retain their attribution requirements. They are previews, not GPU
screenshots. `tools/environment-preview.py` reproduces them from a scene export
made by `tools/validate.mjs`; GPU lighting and shadows are not represented.

## Source references (MLA)

Zsky. “Military Base Pack.” *OpenGameArt.org*,
https://opengameart.org/content/military-base-pack. Accessed 3 Oct. 2026.

32kda. “Warehouse building low-poly.” *OpenGameArt.org*,
https://opengameart.org/content/warehouse-building-low-poly. Accessed 3 Oct. 2026.

Yughues. “Hesco box.” *OpenGameArt.org*,
https://opengameart.org/content/hesco-box. Accessed 3 Oct. 2026.

ambientCG. “Concrete034,” “Asphalt010,” and “Metal032.” *ambientCG*,
https://ambientcg.com/. Accessed 3 Oct. 2026.


## Expansion environment models / 0.8.0

Downloaded/accessed 5 October 2026. CC0 1.0, verified on creator pages and preserved notices. Unused textures/attributes removed, muted vertex colors baked, meshes joined and simplified to at most 1,800 triangles per asset. No external runtime requests.

- Kenney. “Factory Kit.” *Kenney*, https://kenney.nl/assets/factory-kit. CC0. Files: door-panel.glb, catwalk-stairs.glb, catwalk.glb, machinery.glb, pipe-unit.glb, loading-lift.glb, conveyor.glb. Notice: KENNEY-FACTORY-LICENSE.txt.
- Kenney. “City Kit Industrial.” *Kenney*, https://kenney.nl/assets/city-kit-industrial. CC0. Files: industrial-tank.glb, solar-panel.glb, chimney.glb. Notice: KENNEY-INDUSTRIAL-LICENSE.txt.
- Quaternius. “Modular Sci-Fi Megakit.” *Quaternius*, https://quaternius.com/packs/modularscifimegakit.html. CC0. Files: control-console.glb, access-terminal.glb, vent-unit.glb, fan-unit.glb, research-rail.glb. Notice: QUATERNIUS-SCIFI-LICENSE.txt.

Build: tools/prepare-world-props.mjs using glTF Transform 4.2.1 and meshoptimizer 0.22.0 (MIT), development only. Existing map and surface licenses remain unchanged.
