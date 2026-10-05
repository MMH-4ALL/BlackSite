# Animated operators

Creator: Quaternius. License: CC0 1.0 Universal. Accessed 5 October 2026.

- Universal Base Characters, Standard free edition: https://quaternius.com/packs/universalbasecharacters.html
- Universal Animation Library, Standard free edition: https://quaternius.com/packs/universalanimationlibrary.html
- Universal Animation Library 2 was investigated: https://quaternius.com/packs/universalanimationlibrary2.html. No files from Library 2 are included; the first library supplies the required locomotion and firearm clips.

Included: `operator.glb`, derived from `Superhero_Male_FullBody.gltf` and `UAL1_Standard.glb`; the source license texts are preserved beside it.

Changes: reduced 14,318 source triangles to 6,386; removed large appearance textures, unused UVs/morphs and finger animation tracks; created muted clothing vertex colors; retargeted relative bone rotations to the base model's proportions; preserved bone lengths; selected 13 clips, sampled at at most 24 Hz and removed repeated keys; packed a single self-contained GLB. Two shared appearance variants are created locally. Helmet, ally marker and carried equipment integration are original BlackSite code.

Clips: Idle_Loop, Walk_Loop, Jog_Fwd_Loop, Sprint_Loop, Crouch_Idle_Loop, Crouch_Fwd_Loop, Pistol_Aim_Neutral, Pistol_Shoot, Pistol_Reload, Fixing_Kneeling, Interact, Hit_Head, Death01. Locomotion and upper-body actions blend independently. The free library's pistol handling supplies the upper-body base pose; BlackSite adds the actual rifle aim/recoil presentation. Root motion never moves a gameplay actor.

MLA sources:

Quaternius. “Universal Base Characters.” *Quaternius*, https://quaternius.com/packs/universalbasecharacters.html. Accessed 5 Oct. 2026.

Quaternius. “Universal Animation Library.” *Quaternius*, https://quaternius.com/packs/universalanimationlibrary.html. Accessed 5 Oct. 2026.

Three.js contributors. “SkeletonUtils.js.” *Three.js*, r170, https://github.com/mrdoob/three.js/blob/r170/examples/jsm/utils/SkeletonUtils.js. Accessed 5 Oct. 2026. MIT; notice preserved in `vendor/LICENSE`.
