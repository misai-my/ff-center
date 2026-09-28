# Free Fire Card Arena — Neon Duel

## Install in your project
Replace the contents of `ff-center/minigames/card-arena/` with this archive's `card-arena/` folder contents. Open `ff-center/minigames/card-arena/index.html`.

Character art resolves to `../../assets/img/characters/` from the game page — your `ff-center/assets/img/characters/` directory. Filenames retain the original data's spelling and extension. Failed local character images try the supplied remote image URL, then the bundled placeholder. Pet art uses supplied remote URLs. Background and supply art are bundled. For a different deployment, pass `?assetBase=/your/path/characters/`.

For a page in the ff-center root:
```html
<iframe src="./minigames/card-arena/index.html" title="Free Fire Card Arena"
  style="display:block;width:100%;height:90dvh;min-height:600px;border:0"
  allow="autoplay; fullscreen"></iframe>
```
Use an iframe to isolate this game from the host page's styles. The new `arena.css` replaces the old stacked stylesheets; no legacy CSS is loaded. Versioned script/style URLs help refresh old assets.

## Build and battle
Equip exactly 1 active skill, 3 different passives, 1 pet and 1 loadout. Click +, double-click or drag to a matching slot. RANDOM builds a complete kit.

One action per turn: basic attack, active skill, pet skill, gloo wall or loadout. Skills spend energy and recover through cooldowns. Gloo costs 1 energy for 20 shield; start with two charges. Passive bonuses apply automatically.

Choose a stance before your action:
- Balanced: normal damage.
- Rush: deal 20% more damage, take 15% more.
- Guard: take 20% less damage, deal 10% less.

At the start of round 8, the safe zone deals 4 direct HP damage to both fighters. This rises by 4 each round. It bypasses shields and prevents endless sustain. If both are reduced to zero by the same zone tick, the opponent wins the tie.

One-use loadouts:
- Team Booster: heal 22 HP and gain 8 shield.
- Tactical Market: gain 3 energy and reduce both cooldowns by 2.
- Enhanced Hammer: remove up to 25 enemy shield and gain 8 focus.
- Super Leg Pocket: gain two gloo charges and two energy.

AUTO chooses actions and stances. TIPS opens contextual advice and rules. Portrait and landscape layouts are supported. Reduced-motion preferences are respected.

## Scope
Fan-made card battler using the supplied character/pet reference data. Effects, rarity, stances, loadout values and map bonuses are custom duel rules, not an official Free Fire simulation or an OB55 balance guarantee. No multiplayer server or account dependency.

Visual research: Konami's Master Duel developer message (readable cards and effect presentation), and Marvel Snap's official game overview (character-focused cards and tactical locations). Original interface styling; no copied game UI assets.
