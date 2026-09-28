# Breakpoint: Survivor — Volume I prototype

An unofficial, static, manga-inspired tactical story game set against selected Free Fire lore. It contains four short story chapters, three turn-based encounters, choices, a lore dossier, and local autosave. Subject 031, the operation, dialogue, and encounter levels are original fan fiction; the dossier links the Garena pages used for the lore foundation.

## Play locally

Open `index.html` in a modern browser. Fonts will fall back to system fonts offline; the game itself has no network dependency and no build step.

## Host on GitHub Pages

1. Create a GitHub repository and upload `index.html`, `styles.css`, and `game.js` at the repository root (or push this directory as the repository root).
2. Under **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
3. The game will be available at `https://USERNAME.github.io/REPOSITORY/` after deployment. Relative asset paths also work for project sites.

The static game stores progress in the browser's `localStorage`; each browser/device has its own save. New Game resets it. No accounts, API keys, analytics, or server are needed.

## Combat

Each action advances one enemy turn. **Fire** deals damage; **Aim** adds damage to the next shot; **Cover** reduces the next hit; **Scan** exposes the drone's shield; **Field Patch** heals. The Moco encounter is a survival objective: live through four rounds. Defeat offers a retry at the encounter's starting health and inventory.

## Lore and rights

Official lore used: [Moco](https://ff.garena.com/en/chars/433), [Steffie](https://ff.garena.com/en/chars/150), [Rampage: Finale](https://ff.garena.com/en/article/1234/). Free Fire and its characters belong to Garena. This fan project is unaffiliated and contains no extracted game art or audio. Public promotion or monetization involving Garena IP may need permission from the rights holder.
