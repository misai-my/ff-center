# Gloo Rush Sprite Integration

This build integrates the uploaded 16-bit sprite assets into the Gloo Rush minigame.

## Integrated assets
- Player sprites:
  - Kelly
  - Tatsuya
  - Orion
  - Hayato
- Enemy sprites:
  - Raider mapped to Thug
  - Gunner mapped to Gunner
  - Psycho mapped to Brute and Boss

## Gameplay behavior adjusted
- Player idle, run, shoot, hit, skill, and dead states now use the sprite frames.
- Enemy idle, run, attack/shoot, hit, and knockout states now use the sprite frames.
- Existing gameplay, waves, joystick, gloo wall, heal, skill, and leaderboard logic are retained.
- If a sprite has not loaded yet, the older procedural character drawing is used as fallback.

- Updated player run animation to use only frames `03_run_1` and `06_run_4` for movement, as requested.
