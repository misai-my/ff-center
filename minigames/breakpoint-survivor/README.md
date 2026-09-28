# Breakpoint: Survivor — RPG field build

A static, unofficial Free Fire fan game prototype built around an action RPG loop. Explore three Bermuda areas, solve short quests, choose how to handle the courier and the subject record, collect equipment and supplies, complete an optional beacon quest, travel back to unlocked areas, spend credits, level up, specialize your character, and fight through three top-down encounters. Comic panels appear at the opening and the major story reveal.

## Play

Open `index.html` in a modern browser. No build process or backend is required. Story and character progress save in localStorage; world position saves periodically. A page reload during combat restarts that encounter at its checkpoint. New Game resets this browser's save. Previous story saves remain usable and route the player into the new field areas when appropriate.

### Controls

| Activity | Desktop | Touch |
| --- | --- | --- |
| Move | WASD or arrows | Left movement stick |
| Interact in field | E or Space | Interact button |
| Aim and fire in combat | Mouse click or Space auto-target | Hold Fire |
| Dodge, scan, patch in combat | Shift, Q, F | Action buttons |
| Character, items, quests, travel | Skills, Inventory, Journal, Map buttons | Same buttons |

Auto-targeting selects only enemies in clear line of sight. Move around cover when a shot is blocked.

### RPG route

1. **Crash Site:** Find the patrol radio to unlock the gate. The supply cache is optional. Clear the patrol.
2. **Service Road:** Speak with the courier, search for salvage, and trade with the scavenger. Disable the drone's two shield relays before defeating it.
3. **Signal Outpost:** Decide whether to share or keep the subject file. Survive Moco's pursuit and extract.

XP from exploration, quests, and encounters raises your level and awards skill points. Upgrade Marksmanship (+4 shot damage), Vitality (+10 maximum HP), or Recon (+50 scan radius), each up to rank 3. Combat earns credits, which can buy patches and a permanent reinforced vest. Inventory and decisions persist between maps. The optional three-part beacon quest grants a permanent signal scrambler (+50 scan range); use Map to revisit unlocked areas for missed parts.

## Update an existing GitHub Pages installation

Replace `index.html`, `game.js`, `arena.js`, `styles.css`, and `README.md` in `minigames/breakpoint-survivor/`, and add **`world.js`** in the same directory. The site uses relative asset paths. After GitHub Pages deploys, refresh the browser to load the new scripts.

## Lore and rights

Official lore foundation: [Moco](https://ff.garena.com/en/chars/433), [Steffie](https://ff.garena.com/en/chars/150), [Rampage: Finale](https://ff.garena.com/en/article/1234/). Subject 031, the island mission, encounters, RPG levels, and dialogue are original fan fiction. Free Fire and its characters belong to Garena. This project is unaffiliated and includes no extracted game art or audio.
