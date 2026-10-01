# Third-party credits

## chasieboy317 — M4A1 on Free3D

- Creator: chasieboy317.
- Source: https://free3d.com/3d-model/m4a1-33156.html
- Downloaded 1 October 2026: `t9o1kvsjptds-M4A1.rar`.
- Included: modified `assets/m4a1.glb`.
- The listing says Personal Use License; the author additionally permits credited use and reuploads of modified versions in the description. This is not an MIT or CC0 asset. See `assets/M4A1-LICENSE.md` for the permission and credit.
- Changes: triangulation, vertex indexing and clustering, repaired zero normals, four merged meshes, separate animated magazine, scale normalization, and original steel/polymer/glass materials.
- The reproducible converter is `tools/convert-m4a1.py`.

## chasieboy317 — SV98 and M82 on Free3D

- SV98: https://free3d.com/3d-model/sv98-sniper-rifle-72000.html, archive `bwobs-SV98.rar`.
- M82: https://free3d.com/3d-model/m82-barrett-10543.html, archive `olf2hohvj9-M82 Barrett.rar`.
- Downloaded 1 October 2026. Included modified `assets/sv98.glb`, `assets/m82.glb`, and their derived vector UI previews.
- Both source descriptions permit credited use and modified reuploads. Assets retain the author's permission and credit, separately from the MIT code license. See `assets/FREE3D-WEAPONS-LICENSE.md`.
- Changes: mesh optimization and merging, normalization, repaired normals, separate magazines, original PBR materials, removal of the SV98 ground plane and loose cartridge props, leveling and removal of the deployed M82 bipod. Browser GLBs contain four meshes each: 18,957 / 27,672 triangles and 548,368 / 527,864 bytes respectively.
- `tools/convert-m4a1.py` supports the `sv98` and `m82` profiles. `tools/weapon-previews.py` generates model-derived SVG previews. The M4A1 preview retains its original model permission; the P-9 preview is derived from Kenney's CC0 asset.

## Kenney — Blaster Kit 2.1

- Creator: Kenney.
- Official source: https://kenney.nl/assets/blaster-kit
- Download retrieved 30 September 2026: https://kenney.nl/media/pages/assets/blaster-kit/261d80a716-1753959510/kenney_blaster-kit_2.1.zip
- License: Creative Commons CC0 1.0 Universal. Original notice: `assets/License.txt`.
- Included files: `blaster-b.glb`, `crate-medium.glb`, and `Textures/colormap.png`. The previous `blaster-e.glb` remains as an unused CC0 fallback asset.
- Changes at runtime: desaturated palette shading, material properties, normalization, orientation, and scale. The palette image itself is unchanged.
- No endorsement by Kenney is implied.

## Three.js 0.170.0

- Project: https://threejs.org/
- Source release: https://github.com/mrdoob/three.js/tree/r170
- Package: https://registry.npmjs.org/three/-/three-0.170.0.tgz
- License: MIT. Full notice: `vendor/THREE-LICENSE.txt`.
- Included: `three.module.min.js` (stored as `three.module.js`), `GLTFLoader.js`, and `BufferGeometryUtils.js`.
- Files are bundled unchanged, aside from the engine filename.

## Weapon recordings — CC0 1.0

32 newly added WAV files supply distinct M4A1, SV98, M82, and P-9 gunshots,
reload stages, equip sounds, empty-trigger clicks, SV98 bolt cycling, and separate
distant M4A1 shots for bots. No file or source excerpt is shared between guns or
actions. All sources are CC0: The Free Firearm Sound Library by Ben Jaszczak,
Brian Nelson, Kevin Heras, and Matthew Nanney; gun reload recordings by
SpringySpringo; and equipment clicks III by LFA.

See `assets/audio/LICENSE.md` for source links and MLA references;
`assets/audio/manifest.json` records exact source ranges, edits, and file hashes.
Some shots are sound-design adaptations of other rifles rather than exact
recordings of the named model. Runtime audio is entirely bundled.

## Original work

Map layout, articulated bot geometry, first-person gloves, animations, match logic, interface, objective/hit/round tones, and game code were created for this project. The code is covered by the root MIT license. There are no external fonts, trackers, or remote runtime asset requests.

## Source references (MLA)

chasieboy317. “M4A1.” *Free3D*, 26 Aug. 2012, https://free3d.com/3d-model/m4a1-33156.html. Accessed 1 Oct. 2026.

Kenney. “Blaster Kit.” *Kenney*, https://kenney.nl/assets/blaster-kit. Accessed 30 Sept. 2026.

Three.js Authors. “Three.js, Release r170.” *GitHub*, https://github.com/mrdoob/three.js/tree/r170. Accessed 30 Sept. 2026.

GitHub. “Configuring a Publishing Source for Your GitHub Pages Site.” *GitHub Docs*, https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site. Accessed 30 Sept. 2026.
