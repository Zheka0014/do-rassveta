# Источники ресурсов

## Женщина в подвале v41

Анатомия и исходный скелет — [Female base mesh](https://www.innerscene.com/tools/library/3d-parts/female-base-mesh-3d-person-rigged-a-pose-dba97ed5); одежда, текстуры взрослой кожи, глаза, брови, ресницы, зубы и волосы — [Jordan](https://www.innerscene.com/tools/library/3d-parts/jordan-3d-person-athlete-a0770454). Оба ресурса опубликованы Innerscene на основе MakeHuman под CC0. Для игры одежда и волосы подогнаны к анатомии, перенесены веса, поставлена поза с опорой на ладони и колени, добавлен непрозрачный тканевый слой. Поза запечена, геометрия упрощена, встроенные текстуры сжаты. Полные сведения: [ATTRIBUTION.txt](dist/assets/characters-v41/ATTRIBUTION.txt). В v41 удлинена рубашка, добавлены объёмные подгибы, цвет загрязнений, один морф дыхания и зацикленный клип.

## Смотритель v36

Цельная модель **Zombie Walk Test** — [OSCAR CREATIVO](https://sketchfab.com/3d-models/zombie-walk-test-165fd9342c364216bfdd8c2f1102223c), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Сохранены авторские геометрия, UV, скиннинг, текстуры цвета и нормалей. Изменены масштаб и материалы. Анимации Idle / Walk / Run — Adobe Mixamo из примера Three.js Soldier; перенесены на скелет модели. Добавлены коррекция стоп по рельефу, направление взгляда и процедурный замах. Подробная атрибуция: [ATTRIBUTION.txt](dist/assets/characters-v36/ATTRIBUTION.txt).


## Poly Haven — CC0

Модели и текстуры используются по [лицензии CC0](https://polyhaven.com/license). Часть моделей упрощена для браузерного рендера.

Модели:

- [Fir Tree 01](https://polyhaven.com/a/fir_tree_01) — высокие хвойные деревья, три уровня детализации.
- [Pine Sapling Small](https://polyhaven.com/a/pine_sapling_small) — молодые деревья трёх форм, два уровня детализации с общими текстурами.
- [Pine Roots](https://polyhaven.com/a/pine_roots) — корни.
- [Fern 02](https://polyhaven.com/a/fern_02) — папоротники.
- [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) — камни.
- [Dead Tree Trunk](https://polyhaven.com/a/dead_tree_trunk) — упавшие стволы.
- [Wooden Military Crate](https://polyhaven.com/a/wooden_military_crate) — ящики.
- [Wooden Lantern 01](https://polyhaven.com/a/wooden_lantern_01) — фонари.
- [Stone Fire Pit](https://polyhaven.com/a/stone_fire_pit) — каменное кольцо костра.
- [Tree Stump 02](https://polyhaven.com/a/tree_stump_02) — пни.

- [Grass Medium 01](https://polyhaven.com/a/grass_medium_01) — трава.

Материалы:

- [Forrest Ground 01](https://polyhaven.com/a/forrest_ground_01) — лесная подстилка.
- [Weathered Planks](https://polyhaven.com/a/weathered_planks) — старая древесина; изба использует карты цвета, нормалей и шероховатости 2К.
- [Grey Roof 01](https://polyhaven.com/a/grey_roof_01) — кровля; карты цвета, нормалей и шероховатости 2К.
- Материалы коры и хвои из наборов хвойных деревьев Poly Haven. Брёвна избы используют карты цвета, нормалей и ARM коры 2К из Fir Tree 01.

## Three.js

Three.js 0.180.0 и GLTFLoader/BufferGeometryUtils — [MIT](https://github.com/mrdoob/three.js/blob/r180/LICENSE). Текст лицензии: `dist/vendor/THREE-LICENSE.txt`.

## Созданные ресурсы

Титульный лес и текстура пламени фальшфейера созданы встроенным ImageGen. Текстура пламени: `dist/assets/flame.png`; точный запрос сохранён в `asset-prompts/flame.txt`. Геометрия избы, объёмное пламя костра, модель руки с фонарём, тканевая поверхность перчатки, эффекты дождя, процедурное небо, облака и луна, постобработка, логика игры и процедурный звук созданы для этого проекта.

Кладбище, ограда, надгробия, гроб, повешенные фигуры, анимации, скрип верёвок, шёпот и колокол созданы для проекта. Каменные и деревянные поверхности переиспользуют указанные выше материалы Poly Haven.
Каталка, рация, костяные подвески, ткань с пятнами и их звуки также процедурно созданы для проекта.

Подвал, лестница и люк, двойник, сидящие фигуры, капканы, растяжки, дополнительные могилы и следы созданы для проекта; материалы переиспользуют приведённые выше источники. Для рации используются процедурный радиошум, текстовые реплики и локальный голос Web Speech API на языке игры, если он установлен. Пространственные шаги и звуки двери синтезируются Web Audio API.

## Версия для ПК и Steam (v48)

- Оболочка для ПК — [Electron](https://www.electronjs.org/) 44, [MIT](https://github.com/electron/electron/blob/main/LICENSE); лицензии Chromium поставляются рядом с исполняемым файлом (`LICENSES.chromium.html`).
- Связь со Steam — [steamworks.js](https://github.com/ceifa/steamworks.js) 0.4, MIT. Включает распространяемые библиотеки Steamworks API от Valve (`steam_api64.dll`, `libsteam_api.so`, `libsteam_api.dylib`) по соглашению Steamworks SDK.
- Значок игры, иконки 18 достижений и вёрстка капсул магазина созданы для проекта. В капсулах использован титульный лес (см. «Созданные ресурсы») и шрифты [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) и [PT Sans Narrow](https://fonts.google.com/specimen/PT+Sans+Narrow) под [SIL Open Font License 1.1](https://openfontlicense.org/); шрифты используются только в картинках и в игру не входят.
- Скриншоты для магазина — кадры самой игры.
