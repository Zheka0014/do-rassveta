# Asset sources

## The woman in the basement v41

Anatomy and the base skeleton — [Female base mesh](https://www.innerscene.com/tools/library/3d-parts/female-base-mesh-3d-person-rigged-a-pose-dba97ed5); clothing, adult skin textures, eyes, eyebrows, eyelashes, teeth and hair — [Jordan](https://www.innerscene.com/tools/library/3d-parts/jordan-3d-person-athlete-a0770454). Both assets are published by Innerscene, based on MakeHuman, under CC0. For the game the clothing and hair were fitted to the anatomy, the skin weights were transferred, the figure was posed on her palms and knees, and an opaque cloth layer was added. The pose is baked, the geometry is simplified and the embedded textures are compressed. Full details: [ATTRIBUTION.txt](dist/assets/characters-v41/ATTRIBUTION.txt). In v41 the shirt was lengthened, and volumetric folds, dirt color, one breathing morph and a looping clip were added.

## The Watcher v36

The complete model **Zombie Walk Test** — [OSCAR CREATIVO](https://sketchfab.com/3d-models/zombie-walk-test-165fd9342c364216bfdd8c2f1102223c), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The author's geometry, UVs, skinning, color and normal textures are kept. The scale and materials were changed. Idle / Walk / Run animations — Adobe Mixamo, from the Three.js Soldier example; retargeted to the model's skeleton. Added: foot placement on uneven ground, gaze direction and a procedural swing. Detailed attribution: [ATTRIBUTION.txt](dist/assets/characters-v36/ATTRIBUTION.txt).


## Poly Haven — CC0

Models and textures are used under the [CC0 license](https://polyhaven.com/license). Some models were simplified for rendering in the browser.

Models:

- [Fir Tree 01](https://polyhaven.com/a/fir_tree_01) — tall conifers, three levels of detail.
- [Pine Sapling Small](https://polyhaven.com/a/pine_sapling_small) — young trees in three shapes, two levels of detail with shared textures.
- [Pine Roots](https://polyhaven.com/a/pine_roots) — roots.
- [Fern 02](https://polyhaven.com/a/fern_02) — ferns.
- [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) — rocks.
- [Dead Tree Trunk](https://polyhaven.com/a/dead_tree_trunk) — fallen trunks.
- [Wooden Military Crate](https://polyhaven.com/a/wooden_military_crate) — crates.
- [Wooden Lantern 01](https://polyhaven.com/a/wooden_lantern_01) — lanterns.
- [Stone Fire Pit](https://polyhaven.com/a/stone_fire_pit) — the stone ring of the campfire.
- [Tree Stump 02](https://polyhaven.com/a/tree_stump_02) — stumps.

- [Grass Medium 01](https://polyhaven.com/a/grass_medium_01) — grass.

Materials:

- [Forrest Ground 01](https://polyhaven.com/a/forrest_ground_01) — forest floor.
- [Weathered Planks](https://polyhaven.com/a/weathered_planks) — old wood; the cabin uses its 2K color, normal and roughness maps.
- [Grey Roof 01](https://polyhaven.com/a/grey_roof_01) — roofing; 2K color, normal and roughness maps.
- Bark and needle materials come from the Poly Haven conifer sets. The cabin logs use the 2K bark color, normal and ARM maps from Fir Tree 01.

## Three.js

Three.js 0.180.0 and GLTFLoader/BufferGeometryUtils — [MIT](https://github.com/mrdoob/three.js/blob/r180/LICENSE). License text: `dist/vendor/THREE-LICENSE.txt`.

## Assets made for the game

The title-screen forest and the flare's flame texture were made with the built-in ImageGen. Flame texture: `dist/assets/flame.png`; the exact prompt is saved in `asset-prompts/flame.txt`. The cabin geometry, the volumetric campfire flame, the hand-and-flashlight model, the glove's cloth surface, the rain effects, the procedural sky, clouds and moon, the post-processing, the game logic and the procedural sound were created for this project.

The cemetery, fence, gravestones, coffin, hanged figures, animations, creaking ropes, whispers and the bell were created for the project. Stone and wooden surfaces reuse the Poly Haven materials listed above.
The stretcher, the radio, the bone charms, the stained cloth and their sounds were also created procedurally for the project.

The basement, the stairs and hatch, the Double, the seated figures, traps, tripwires, extra graves and footprints were created for the project; their materials reuse the sources above. The radio uses procedural static, text lines and a local Web Speech API voice in the game's language, if one is installed. Spatial footsteps and door sounds are synthesized with the Web Audio API.

## PC and Steam edition (v48)

- PC shell — [Electron](https://www.electronjs.org/) 44, [MIT](https://github.com/electron/electron/blob/main/LICENSE); the Chromium licenses ship next to the executable (`LICENSES.chromium.html`).
- Steam integration — [steamworks.js](https://github.com/ceifa/steamworks.js) 0.4, MIT. Includes Valve's redistributable Steamworks API libraries (`steam_api64.dll`, `libsteam_api.so`, `libsteam_api.dylib`) under the Steamworks SDK agreement.
- The game icon, the 18 achievement icons and the store capsule layouts were created for the project. The capsules use the title-screen forest (see "Assets made for the game") and the fonts [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) and [PT Sans Narrow](https://fonts.google.com/specimen/PT+Sans+Narrow) under the [SIL Open Font License 1.1](https://openfontlicense.org/); the fonts are used only in those images and are not part of the game.
- Store screenshots are frames from the game itself.
