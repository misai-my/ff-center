# Breakpoint: Survivor — action prototype

An unofficial, static, manga-inspired action story set against selected Free Fire lore. The illustrated chapters and consequential choices lead into three real-time top-down arenas. All artwork in the arenas is drawn by the game at runtime. Progress saves at story and arena checkpoints in the browser.

## Play

Open `index.html` in a modern browser. The game has no build step or gameplay network dependency. Google Fonts are optional; system fallbacks work offline.

**Desktop:** Move with WASD or arrow keys. Aim and fire by clicking the arena, or hold Space for automatic targeting. Interact with E, use a field patch with F, scan with Q, and dodge with Shift.

**Touch:** Use the left movement stick and the action buttons on the right. Hold Fire to shoot the nearest enemy. Tap Interact when close to a relay or the exit. Landscape gives more room to play.

**Mission 1 — Patrol:** Defeat all three enemies, then reach and interact with the exit.

**Mission 2 — Relay Hunter:** Reach the two glowing relays and interact to disable them. The drone takes little damage until both are offline. Defeat it and extract.

**Mission 3 — Moco:** Decrypt the glowing terminal, survive 22 seconds, and extract. Moco is a survival encounter, not a kill target. Shoot to briefly interrupt her, dodge her attacks, or scan to jam her briefly.

An arena restarts from its checkpoint after defeat or a page reload; completed story choices and encounters are saved. New Game resets that browser's save.

## GitHub Pages update

Replace `index.html`, `game.js`, `styles.css`, and `README.md` under `minigames/breakpoint-survivor/`; add the new `arena.js` beside them. Keep the filenames and relative paths as provided. GitHub Pages will load the new file automatically when the branch deploys. No configuration or server is needed.

## Lore and rights

Official lore used: [Moco](https://ff.garena.com/en/chars/433), [Steffie](https://ff.garena.com/en/chars/150), [Rampage: Finale](https://ff.garena.com/en/article/1234/). Subject 031, the island recovery operation, combat mechanics, dialogue, and encounter levels are original fan fiction. Free Fire and its characters belong to Garena. This fan project is unaffiliated and contains no extracted game art or audio. Public promotion or monetization involving Garena IP may need permission from the rights holder.
