# Credits and licenses

Every third-party asset used by BooCake is listed here. Only the files the game actually uses are kept in the repo
(`src/assets/`); each folder also contains the pack's original `License.txt`.

## Art, UI, effects and sounds: Kenney (CC0)
All packs are by [Kenney](https://kenney.nl) and released under **Creative Commons Zero (CC0 1.0)**: free for any use,
no attribution required (we credit anyway).

| Used for | Pack | Source | Files in repo |
|----------|------|--------|---------------|
| Buttons, panels, stars | UI Pack 2.0 | https://kenney.nl/assets/ui-pack | `src/assets/ui/` |
| Particles (sparkles, smoke, flame, glow) | Particle Pack 1.0 (downscaled from 512 px to 128 px) | https://kenney.nl/assets/particle-pack | `src/assets/fx/` |
| UI and game sounds | Interface Sounds 1.0 | https://kenney.nl/assets/interface-sounds | `src/assets/audio/` |
| Bell and coin sounds | Impact Sounds 1.0 | https://kenney.nl/assets/impact-sounds | `src/assets/audio/` |

## Font: Fredoka (SIL Open Font License 1.1)
Fredoka by The Fredoka Project Authors, installed from npm as `@fontsource/fredoka`.
License: https://openfontlicense.org (the license text is in `node_modules/@fontsource/fredoka/LICENSE`).

## Everything else
The shop scenery (wall, windows, bats, bunting, cobwebs, clock, neon sign, counter, pumpkin, candles, tip jar),
all customer monsters (pastel cartoon style chosen by the team), the ovens, piping bags, topping jars, trash can and all cupcakes are drawn in code (`src/objects/`), so they need no license.

## How to add a new asset
1. Prefer CC0 or another license that allows free use in a school project.
2. Copy **only the files you use** into `src/assets/<type>/` together with the license text.
3. Add a row to the table above (what it is used for, pack name, source URL).
