# Free Fire Card Arena — Duel Edition

Extract the complete folder and open index.html. No build step is required. Character and pet artwork uses the image URLs supplied in the original data; internet access is needed for that artwork. An included supply emblem appears if an image cannot load.

## Build
Equip exactly 1 active character skill, 3 different passive skills, 1 pet and 1 loadout. Use the plus buttons, double-click a card, or drag it onto its matching slot. RANDOM creates a valid build. CLEAR removes all six cards. Start Battle unlocks only with a complete build.

## Duel
Take one action each turn: Basic Attack, Active Skill, Pet Skill, Gloo Wall or Loadout. Skills consume energy and have cooldowns. Passive cards apply automatically. You have two gloo walls per duel; each costs one energy and grants 20 shield. Loadout supplies are consumed once per duel:
- Team Booster: restore 22 HP and gain 8 shield.
- Tactical Market: gain 3 energy (up to the cap), reduce both cooldowns by 2.
- Enhanced Hammer: remove up to 25 enemy shield and gain 8 focus.
- Super Leg Pocket: gain 2 gloo walls and 2 energy.

The opponent can use its own loadout. Auto Battle chooses character/pet/attack actions; use manual play for gloo and loadout timing. Campaign and map advantages from the original project remain. Enemy HP reaches zero: BOOYAH. Your HP reaches zero: defeat. Rematch resets supplies.

## Design and scope
Original gold-framed trading cards, dark duel mat, six visible equipment zones, energy/cooldown decisions and a combat log. Inspired by the presentation and decision-making of trading-card duels; this is not a reproduction of Yu-Gi-Oh rules. No random draw pile or monster summons: your six equipped cards are your persistent kit.

This is a fan-made prototype. Skill effects, loadout effects, map bonuses, rarity and numeric balance are game adaptations, not official Free Fire simulation. The provided character/pet dataset is preserved; this release does not claim an OB55 data refresh. No server, multiplayer or account system is included.

## Mobile
Portrait phones use stacked build sections, a two-column card library, touch-size buttons and a three-column battle deck. Opponent/player health remain side-by-side. Landscape tablets use a wider layout. Rotation is not required; browser zoom is enabled.

## Embed in your GitHub page project
Keep this folder named `card-arena` at the root of your project. All CSS, scripts and bundled assets use relative paths, so it also works under a GitHub Pages repository subpath. Link with `./card-arena/index.html` or embed:

```html
<iframe src="./card-arena/index.html" title="Free Fire Card Arena"
  style="display:block;width:100%;height:90dvh;min-height:600px;border:0"
  allow="autoplay; fullscreen" loading="lazy"></iframe>
```

The iframe isolates the game's styles from your main page. Mobile scrolling stays inside the game. TIPS opens a field guide with contextual advice; Escape or Close hides it. No parent-page scripts or external user/account messages are required. Character artwork still uses supplied remote URLs.
