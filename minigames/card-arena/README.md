# Free Fire Card Arena V2

Turn-based card battle prototype using Free Fire character and pet skill data.

## V2 additions
- Full-screen/no body-scroll desktop layout
- Game-card visual theme inspired by monster/card battlers
- Skill balancing inferred from actual skill descriptions
- Rarity and cost system
- Animated attacks, projectiles, hit reactions, and skill pulses
- Five Free Fire map advantages: Bermuda, Purgatory, Kalahari, NexTerra, Solara
- Campaign mode and Deck Duel mode
- Character/pet synergy via roles, keywords, cooldowns, burn, shield, healing, focus, dodge, gloo/explosive effects
- BOOYAH victory display after winning

Open `index.html` in a browser.


## Comic style remix update
- Comic-style UI refresh with generated arena background
- Critical hit chance now affects damage
- Quick action cluster groups Basic Attack, Active Skill, and Pet Skill together
- Passive skills displayed below as a compact strip
- Anti-spam lock prevents rapid repeated basic attacks/actions during turn resolution
- Compact responsive layout tuned for tablet and phone landscape


## Layout refresh
- Card design updated to match the provided trading-card template style
- Panels/background made more transparent so the arena art shows through
- Player action area restyled as a duel-mat / deck zone inspired by Yu-Gi-Oh-style turn-based card games


## Drag Builder + Battle Card Outline update
- Loadout slots moved to the top of the builder page
- Cards can now be clicked or dragged into the top loadout slots
- Drop validation keeps Active, Passive, and Pet cards in the correct slot type
- Battle page action cards and passive cards now retain the trading-card outline style


## Premium comic layout revision
- Skill description removed from browser cards so stats/buttons stay visible
- Drop-card deck slots moved to the left side
- Selected layout: Active/Pet on left column, three Passives on right column
- Mode/map/start/clear controls moved to the top of the builder
- Battle page now has Basic/Active/Pet buttons above the 5 outlined card deck
- Bottom battle deck is narrower so the arena and side skill panels have more space


## Fix pass
- Restored drag-and-drop helper logic
- Fixed Start Battle by guarding removed Campaign Progress element
- Fixed deck click/add behavior
- Added green plus and red minus card buttons
- Stabilized selected deck slot sizes so the layout no longer resizes with fewer cards
- Right-side passive slots now stay compact and align from the top


## V3 tuning update
- Player and opponent side panels now extend down through the battle deck area
- Selected deck cards keep a consistent fixed card dimension and no longer resize based on fill state
- Battle deck cards now better match the selected deck card dimensions
- Skill values rebalanced for more even fights (lower burst, lower dodge spikes, smoother sustain)
- Basic attacks no longer double-dip crit bonuses


## V4 card dimension match
- Selected deck/drop cards now use the same width/height system as the card browser selection cards
- Builder sidebar widened so the outlined deck cards match the browser card proportions more closely
- Responsive breakpoints keep both browser cards and selected deck cards matched at smaller sizes


## V5 slot resize pass
- Selected deck slots resized to match the card-browser outline footprint more closely
- Browser cards and selected deck cards now share one width/height sizing system
- Inner art and text sections are aligned so the deck-slot cards visually match the selection-card outline


## V6 drop-slot resize
- Drop Cards Here slots now use a fixed card-size system to match the deck/browser outline more closely
- Left/right drop columns now stack with flex layout so there is no accidental row stretching
- Inner header, art, and text blocks of selected cards are aligned to the same visual proportions as the card browser


## V7 responsive landscape
- Added dedicated tablet-landscape layout tuning
- Added dedicated phone-landscape layout tuning
- Builder, selected deck, battle side panels, arena, controls, and battle deck are all compacted for landscape tablets/phones
- Top bar and action controls are condensed to keep everything on-screen without layout breakage
