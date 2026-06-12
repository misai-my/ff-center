# Gloo Rush: Pixel Brawler

A standalone single-player HTML5 Canvas prototype inspired by classic side-scrolling arcade beat-'em-ups.

## Play

Open `index.html` in Chrome, Edge, Firefox, or Safari. No server or build step is required.

## Controls

- Move: WASD or Arrow Keys
- Gun: J
- Active skill: K
- Gloo wall: L
- Heal: I
- Pause: P or Escape

Every run starts with three med kits. Each heal consumes one med kit.

Touch controls appear automatically on touch devices and smaller screens.

## Playable characters

- Kelly — Deadly Velocity
- Tatsuya — Rebel Rush
- Orion — Crimson Crush
- Hayato — Art of Blades

The abilities were adapted for a beat-'em-up format rather than copied exactly from the battle royale rules.

## Included systems

- Four character-selectable fighters
- Procedural pixel-art character animation
- Three regular enemy classes and a boss
- Four side-scrolling combat arenas
- Repeatable gun attack, hit stun, knockback, projectiles, pickups, scoring, and combo counter
- One character-specific active skill per fighter
- Gloo walls that block gunfire and enemies
- Keyboard and touch controls
- Pause, restart, victory, and game-over states
- Animated battle-royale-style closing zone with visible play-area edges, inward warning arrows, unsafe-area haze, and a closing countdown
- Lightweight synthesized sound effects

## Publishing note

This is a fan-made prototype. It contains no official Free Fire image, audio, map, or code assets. Character names and concepts belong to Garena. For any public or commercial release, obtain the appropriate permissions and replace the fan references where required.


## Mobile test build

- Touch controls are overlaid inside the game so they remain available in fullscreen.
- Landscape orientation is recommended and a rotation prompt appears in portrait gameplay.
- Pause, defeat, and victory menus include **Change Survivor**.
- The survivor sprites and selection portraits use higher-resolution procedural pixel art with more recognizable costume details.


## Zone test behavior

Each combat wave now activates a visible zone that closes toward the current battle arena over roughly six seconds. The border physically defines the playable space, but this test version does not apply zone damage yet.


## New in V5

- Five level progression: Bermuda, Purgatory, Kalahari, NexTerra, and Solara
- Original pixel-art backgrounds inspired by each map
- More detailed character, weapon, and enemy sprites
- Level-to-level progression while keeping your score
