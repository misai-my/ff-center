
const allCharacters = window.FF_CHARACTERS || [];
const allPets = window.FF_PETS || [];
const activeSkills = allCharacters.filter(c => c.skill_type === 'Active');
const passiveSkills = allCharacters.filter(c => c.skill_type === 'Passive');
const petSkills = allPets;

const MAPS = {
  bermuda: { name: 'Bermuda', subtitle: 'Balanced map', description: 'Balanced arena. Attack cards gain +1 base damage.', enemyBoost: {}, apply(unit) { unit.attack += 1; }, favors: ['ATTACK'] },
  purgatory: { name: 'Purgatory', subtitle: 'Sustain map', description: 'Bridge fights favor survival and teamwork. Healing and shield effects gain +15%.', enemyBoost: { maxHp: 10 }, apply(unit) { unit.healAmp += .15; unit.shieldAmp += .15; }, favors: ['SURVIVAL', 'TEAM WORK'] },
  kalahari: { name: 'Kalahari', subtitle: 'Long-range map', description: 'Open desert favors scans and long-range damage. Info/Attack cards gain focus.', enemyBoost: { attack: 1 }, apply(unit) { unit.focus += hasRole(unit, 'INFO') || hasRole(unit, 'ATTACK') ? 4 : 0; unit.crit += 4; }, favors: ['INFO', 'ATTACK'] },
  nexterra: { name: 'NexTerra', subtitle: 'Mobility map', description: 'Futuristic lanes favor speed, cooldown cycling, and dodge.', enemyBoost: { dodge: 4 }, apply(unit) { unit.dodge += hasMovement(unit) ? 8 : 3; unit.cooldownMod += hasMovement(unit) ? 1 : 0; }, favors: ['MOVEMENT', 'SURVIVAL'] },
  solara: { name: 'Solara', subtitle: 'Gloo & explosives map', description: 'Final plaza favors gloo-wall counters, explosives, burn, and burst damage.', enemyBoost: { shield: 12 }, apply(unit) { if (hasExplosive(unit) || hasGloo(unit)) { unit.attack += 3; unit.explosiveAmp += .18; } }, favors: ['ATTACK', 'INVENTORY'] }
};

const CAMPAIGN = [
  { map: 'bermuda', title: 'Bermuda Opener', hp: 95, attack: 8 },
  { map: 'purgatory', title: 'Purgatory Bridge Control', hp: 110, attack: 9 },
  { map: 'kalahari', title: 'Kalahari Long-Range Duel', hp: 120, attack: 10 },
  { map: 'nexterra', title: 'NexTerra Speed Circuit', hp: 130, attack: 11 },
  { map: 'solara', title: 'Solara Final Clash', hp: 145, attack: 12 }
];

const builderState = { active: null, passives: [], pet: null };
const ui = {
  builderScreen: document.getElementById('builderScreen'),
  battleScreen: document.getElementById('battleScreen'),
  activeGrid: document.getElementById('activeGrid'),
  passiveGrid: document.getElementById('passiveGrid'),
  petGrid: document.getElementById('petGrid'),
  selectedSummary: document.getElementById('selectedSummary'),
  topSelectedSummary: document.getElementById('topSelectedSummary'),
  startBattleBtn: document.getElementById('startBattleBtn'),
  clearLoadoutBtn: document.getElementById('clearLoadoutBtn'),
  randomizeBtn: document.getElementById('randomizeBtn'),
  searchInput: document.getElementById('searchInput'),
  roleFilter: document.getElementById('roleFilter'),
  rarityFilter: document.getElementById('rarityFilter'),
  soundBtn: document.getElementById('soundBtn'),
  modeSelect: document.getElementById('modeSelect'),
  mapSelect: document.getElementById('mapSelect'),
  mapInfo: document.getElementById('mapInfo'),
  campaignProgress: document.getElementById('campaignProgress'),
  campaignBtn: document.getElementById('campaignBtn'),
  deckBtn: document.getElementById('deckBtn'),
  playerHero: document.getElementById('playerHero'),
  enemyHero: document.getElementById('enemyHero'),
  playerStatus: document.getElementById('playerStatus'),
  enemyStatus: document.getElementById('enemyStatus'),
  playerPassivePanel: document.getElementById('playerPassivePanel'),
  enemyPassivePanel: document.getElementById('enemyPassivePanel'),
  playerAvatar: document.getElementById('playerAvatar'),
  enemyAvatar: document.getElementById('enemyAvatar'),
  battleLog: document.getElementById('battleLog'),
  turnBanner: document.getElementById('turnBanner'),
  handHint: document.getElementById('handHint'),
  playerHand: document.getElementById('playerHand'),
  basicAttackBtn: document.getElementById('basicAttackBtn'),
  backToBuilderBtn: document.getElementById('backToBuilderBtn'),
  battleMapInfo: document.getElementById('battleMapInfo'),
  turnCounter: document.getElementById('turnCounter'),
  battleBoard: document.getElementById('battleBoard'),
  resultModal: document.getElementById('resultModal'),
  booyahBanner: document.getElementById('booyahBanner'),
  resultKicker: document.getElementById('resultKicker'),
  resultTitle: document.getElementById('resultTitle'),
  resultText: document.getElementById('resultText'),
  rewardText: document.getElementById('rewardText'),
  rematchBtn: document.getElementById('rematchBtn'),
  nextCampaignBtn: document.getElementById('nextCampaignBtn'),
  resultBuilderBtn: document.getElementById('resultBuilderBtn')
};

let soundOn = true;
let audioCtx = null;
let combat = null;
let actionBusy = false;
let deckCollapsed = false;
let playerAutoEnabled = localStorage.getItem('ffcaPlayerAutoEnabled') === '1';
let autoTurnTimer = null;
let campaignIndex = Number(localStorage.getItem('ffcaCampaignIndexV2') || 0);

function rand(n) { return Math.floor(Math.random() * n); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = rand(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function hashString(str) { let h = 0; for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0; return Math.abs(h); }
function normalize(str) { return String(str || '').toLowerCase(); }
function escapeHtml(str) { return String(str ?? '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s])); }

function playTone(freq = 220, dur = .05, type = 'square', vol = .03, slide = 0) {
  if (!soundOn) return;
  if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, now + dur);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + dur);
}

function keywords(card) {
  const text = normalize(`${card.name} ${card.skill} ${card.description} ${card.role}`);
  return {
    text,
    damage: /damage|dmg|fire|firing|headshot|penetration|explosive|grenade|explode|burn|knock|knocking|shot|bullet|weapon|wall brawl|riptide|flame/.test(text),
    explosive: /explosive|grenade|gloo|gloowall|gloo wall|explode|mirage|riptide|flame|throw/.test(text),
    heal: /heal|recover|restore|hp\/s|hp per second|med kit|therapy|heartbeat|recover.*hp|panda/.test(text),
    shield: /shield|force field|armor|damage reduction|reduce.*damage|blocks|protection|refuge|wall reinforcement/.test(text),
    info: /detect|locate|mark|reveal|scan|spot|exposes|tracing|vision|glare|sighted|memory mist/.test(text),
    mobility: /movement|speed|dash|sprint|run|crouch|stealth|camouflage|rush/.test(text),
    cooldown: /cooldown|cooltime|reset|replenish|charges|stored|reduce cool/.test(text),
    ep: /\bep\b|energy|crimson|psychology|inhaler|mushroom/.test(text),
    gloo: /gloo|wall/.test(text)
  };
}
function hasRole(unit, role) { return [unit.active, unit.pet, ...unit.passives].some(c => c.role === role); }
function hasMovement(unit) { return [unit.active, unit.pet, ...unit.passives].some(c => keywords(c).mobility); }
function hasExplosive(unit) { return [unit.active, unit.pet, ...unit.passives].some(c => keywords(c).explosive); }
function hasGloo(unit) { return [unit.active, unit.pet, ...unit.passives].some(c => keywords(c).gloo); }

function inferRarity(card) {
  const k = keywords(card);
  let score = 0;
  if (card.meta === 'yes') score += 2;
  if (card.cs_meta === 'yes') score += 1;
  if (card.status === 'buffed') score += 1;
  if (k.cooldown) score += 1;
  if (k.damage && k.heal) score += 2;
  if (k.shield && k.heal) score += 1;
  if (k.explosive || k.gloo) score += 1;
  if (card.skill_type === 'Active') score += 1;
  if (card.skill_type === 'Pet') score -= 1;
  if (score >= 5) return 'Legendary';
  if (score >= 3) return 'Epic';
  if (score >= 1) return 'Rare';
  return 'Common';
}
function rarityValue(rarity) { return { Common: 0, Rare: 1, Epic: 2, Legendary: 3 }[rarity] || 0; }
function cardCost(card, type) {
  const r = rarityValue(inferRarity(card));
  const k = keywords(card);
  let cost = type === 'passive' ? 0 : type === 'pet' ? 1 + Math.min(2, r) : 2 + r;
  if (k.cooldown && type !== 'passive') cost = Math.max(1, cost - 1);
  if ((k.damage && k.heal) || (k.shield && k.damage)) cost += 1;
  return clamp(cost, 0, 5);
}
function cardCooldown(card, type) {
  if (type === 'passive') return 0;
  const r = rarityValue(inferRarity(card));
  const k = keywords(card);
  let cd = type === 'pet' ? 2 + Math.floor(r / 2) : 2 + r;
  if (k.cooldown) cd = Math.max(1, cd - 1);
  if (k.damage && k.heal) cd += 1;
  return clamp(cd, 1, 5);
}
function roleClass(card) {
  const k = keywords(card);
  if (k.damage || card.role === 'ATTACK') return 'damage';
  if (k.heal || card.role === 'TEAM WORK') return 'heal';
  if (k.shield || card.role === 'SURVIVAL') return 'shield';
  if (k.info || card.role === 'INFO') return 'info';
  if (k.mobility || card.role === 'MOVEMENT') return 'speed';
  if (k.ep || k.cooldown || card.role === 'INVENTORY') return 'support';
  return card.skill_type === 'Pet' ? 'support' : 'damage';
}

function createPassivePower(card) {
  const k = keywords(card);
  const rarity = rarityValue(inferRarity(card));
  const seed = hashString(card.name + card.skill);
  if (k.explosive) return { key: 'explosive', summary: `Passive: explosive/burst damage +${12+rarity*4}%, +${2+rarity} ATK.`, apply(s) { s.explosiveAmp += .12 + rarity*.04; s.attack += 2 + rarity; } };
  if (k.heal) return { key: 'heal', summary: `Passive: +${14+rarity*6} max HP, +${1+Math.ceil(rarity/2)} regen, healing +${8+rarity*4}%.`, apply(s) { s.maxHp += 14+rarity*6; s.hp += 14+rarity*6; s.regen += 1+Math.ceil(rarity/2); s.healAmp += .08 + rarity*.04; } };
  if (k.shield) return { key: 'shield', summary: `Passive: +${10+rarity*6} starting shield and +${1+rarity} defense.`, apply(s) { s.shield += 10+rarity*6; s.defense += 1+rarity; s.shieldAmp += .05 + rarity*.025; } };
  if (k.info) return { key: 'info', summary: `Passive: +${6+rarity*3} focus on first skill and +${3+rarity*2}% crit.`, apply(s) { s.firstSkillFocus += 6+rarity*3; s.crit += 3+rarity*2; } };
  if (k.mobility) return { key: 'speed', summary: `Passive: +${7+rarity*4}% dodge and improved tempo.`, apply(s) { s.dodge += 7+rarity*4; s.cooldownMod += rarity > 1 ? 1 : 0; } };
  if (k.ep || k.cooldown) return { key: 'support', summary: `Passive: start with +1 energy and minor cooldown support.`, apply(s) { s.energy = Math.min(s.maxEnergy, s.energy + 1); s.cooldownMod += 1; } };
  const atk = 2 + rarity + (seed % 2);
  return { key: 'damage', summary: `Passive: +${atk} ATK and +${6+rarity*3}% crit chance.`, apply(s) { s.attack += atk; s.crit += 6+rarity*3; } };
}

function createActionPower(card, type) {
  const k = keywords(card);
  const rarity = rarityValue(inferRarity(card));
  const cost = cardCost(card, type);
  const cooldown = cardCooldown(card, type);
  const title = type === 'pet' ? 'Pet' : 'Active';
  if (k.damage || card.role === 'ATTACK') {
    const base = 14 + rarity * 5 + (k.explosive ? 4 : 0);
    const burn = /fire|flame|burn/.test(k.text);
    const silence = /disable|silence|invalid|cannot|disrupt|stealth|camouflage/.test(k.text);
    const split = /split|mini grenade/.test(k.text);
    return { kind: k.explosive ? 'explosive' : 'damage', cost, cooldown, summary: `${title}: ${base} burst damage${burn ? ', burn' : ''}${silence ? ', silence' : ''}${split ? ', split hit' : ''}.`, async effect(user, target, log) {
      let dmg = Math.round((base + user.attack + user.tempAttack + consumeFocus(user, log)) * (1 + user.explosiveAmp + (k.explosive ? .05 : 0)));
      await animateAction(user, target, type === 'pet' ? 'pet' : k.explosive ? 'explosive' : 'attack');
      dealDamage(user, target, dmg, `${user.name} used ${card.skill}`, log);
      if (split && target.hp > 0) dealDamage(user, target, Math.round(dmg * .2), `${card.skill} split into mini damage`, log, { skipDodge: true, noCrit: true });
      if (burn) { target.burnTurns = Math.max(target.burnTurns, 2); target.burnDamage = 3 + rarity; log(`${target.name} is burning.`); }
      if (silence) { target.silenceTurns = Math.max(target.silenceTurns, 1); log(`${target.name}'s active skill is disrupted.`); }
    }};
  }
  if (k.heal || card.role === 'TEAM WORK') {
    const heal = 16 + rarity * 7, shield = 5 + rarity * 4;
    return { kind: 'heal', cost: Math.max(1, cost - 1), cooldown, summary: `${title}: heal ${heal} HP and gain ${shield} shield.`, async effect(user, target, log) { await animateAction(user, user, 'heal'); restoreHp(user, heal, log, `${user.name} used ${card.skill}`); addShield(user, shield, log); } };
  }
  if (k.shield || card.role === 'SURVIVAL') {
    const shield = 14 + rarity * 8;
    return { kind: 'shield', cost: Math.max(1, cost - 1), cooldown, summary: `${title}: gain ${shield} shield, cleanse burn, reduce damage next turn.`, async effect(user, target, log) { await animateAction(user, user, 'shield'); addShield(user, shield, log, `${user.name} used ${card.skill}`); user.guardTurns = Math.max(user.guardTurns, 1); user.burnTurns = 0; } };
  }
  if (k.info || card.role === 'INFO') {
    const focus = 8 + rarity * 4;
    return { kind: 'info', cost: Math.max(1, cost - 1), cooldown: Math.max(1, cooldown - 1), summary: `${title}: mark enemy, gain +${focus} focus, expose target.`, async effect(user, target, log) { await animateAction(user, target, 'scan'); user.focus += focus; target.vulnerableTurns = Math.max(target.vulnerableTurns, 1); log(`${user.name} used ${card.skill}: enemy exposed, focus +${focus}.`); } };
  }
  if (k.mobility || card.role === 'MOVEMENT') {
    const dodge = 14 + rarity * 5, atk = 2 + rarity;
    return { kind: 'speed', cost: Math.max(1, cost - 1), cooldown: Math.max(1, cooldown - 1), summary: `${title}: +${dodge}% dodge and +${atk} ATK for 2 turns.`, async effect(user, target, log) { await animateAction(user, user, 'speed'); user.tempDodge += dodge; user.tempDodgeTurns = Math.max(user.tempDodgeTurns, 2); user.tempAttack += atk; user.tempAttackTurns = Math.max(user.tempAttackTurns, 2); log(`${user.name} used ${card.skill}: speed and tempo gained.`); } };
  }
  const energy = 1 + (rarity > 1 ? 1 : 0);
  return { kind: 'utility', cost: Math.max(1, cost - 1), cooldown, summary: `${title}: gain ${energy} energy and +${3+rarity} ATK this turn.`, async effect(user, target, log) { await animateAction(user, user, 'buff'); user.energy = Math.min(user.maxEnergy, user.energy + energy); user.tempAttack += 3 + rarity; user.tempAttackTurns = Math.max(user.tempAttackTurns, 1); log(`${user.name} used ${card.skill}: energy restored and damage boosted.`); } };
}

function cardBattleSummary(card, slot) {
  const rarity = inferRarity(card), cost = cardCost(card, slot), cd = cardCooldown(card, slot);
  const power = slot === 'passive' ? createPassivePower(card).summary : createActionPower(card, slot).summary;
  return `${rarity}${slot !== 'passive' ? ` · Cost ${cost} · CD ${cd}` : ''}. ${power}`;
}
function filterCards(list) {
  const query = ui.searchInput.value.trim().toLowerCase(), role = ui.roleFilter.value, rarity = ui.rarityFilter.value;
  return list.filter(item => {
    const text = `${item.name} ${item.skill} ${item.description} ${item.role} ${inferRarity(item)}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (role && item.role !== role) return false;
    if (rarity && inferRarity(item) !== rarity) return false;
    return true;
  });
}
function renderCard(item, slot) {
  const selected = slot === 'active' ? builderState.active?.name === item.name : slot === 'pet' ? builderState.pet?.name === item.name : builderState.passives.some(p => p.name === item.name);
  const locked = slot === 'passive' && !selected && builderState.passives.length >= 3;
  const rarity = inferRarity(item), rarityClass = rarity.toLowerCase();
  const costLine = slot === 'passive' ? 'PASSIVE' : `COST ${cardCost(item, slot)} · CD ${cardCooldown(item, slot)}`;
  return `<article draggable="${locked ? 'false' : 'true'}" class="card template-card slot-${slot} ${rarityClass} ${selected ? 'selected' : ''} ${locked ? 'disabled' : ''}" data-slot="${slot}" data-name="${escapeHtml(item.name)}">
    <div class="card-topline"><span class="topline-icon">${slot === 'active' ? 'A' : slot === 'pet' ? 'P' : 'S'}</span><span class="topline-name">${escapeHtml(item.name)}</span></div>
    <div class="card-image-wrap"><img src="${item.local_image_path}" alt="${escapeHtml(item.name)}" loading="lazy" />
      <div class="badge ${slot}">${slot.toUpperCase()}</div><div class="role-tag">${escapeHtml(item.role || item.skill_type)}</div>
      <div class="rarity-badge rarity-${rarityClass}">${rarity.toUpperCase()}</div><div class="cost-badge">${costLine}</div></div>
    <div class="card-body">
      <div class="card-skill">${escapeHtml(item.skill)}</div>
      <div class="card-stat-row"><span>${escapeHtml(rarity)}</span><span>${escapeHtml(item.role || item.skill_type)}</span></div>
      <div class="card-power">${escapeHtml(cardBattleSummary(item, slot))}</div>
    </div>
    <button class="deck-toggle ${selected ? 'remove' : 'add'}" type="button" aria-label="${selected ? 'Remove from deck' : 'Add to deck'}">${selected ? '−' : '+'}</button>
  </article>`;
}

function selectCardForSlot(item, slot, forceAdd = false) {
  if (!item) return;
  if (slot === 'active') {
    builderState.active = builderState.active?.name === item.name && !forceAdd ? null : item;
  } else if (slot === 'pet') {
    builderState.pet = builderState.pet?.name === item.name && !forceAdd ? null : item;
  } else {
    const idx = builderState.passives.findIndex(p => p.name === item.name);
    if (idx >= 0 && !forceAdd) builderState.passives.splice(idx, 1);
    else if (idx < 0 && builderState.passives.length < 3) builderState.passives.push(item);
  }
  renderBuilder();
}

function removeCardFromDeck(slot, name = '') {
  if (slot === 'active') builderState.active = null;
  else if (slot === 'pet') builderState.pet = null;
  else if (slot === 'passive') {
    if (name) builderState.passives = builderState.passives.filter(p => p.name !== name);
    else builderState.passives.pop();
  }
  renderBuilder();
}

function findCardBySlotAndName(slot, name) {
  const source = slot === 'active' ? activeSkills : slot === 'pet' ? petSkills : passiveSkills;
  return source.find(c => c.name === name);
}

function attachLoadoutDropEvents() {
  document.querySelectorAll('[data-drop-slot]').forEach(slotEl => {
    slotEl.addEventListener('dragover', event => {
      event.preventDefault();
      slotEl.classList.add('drag-over');
      event.dataTransfer.dropEffect = 'copy';
    });
    slotEl.addEventListener('dragleave', () => slotEl.classList.remove('drag-over'));
    slotEl.addEventListener('drop', event => {
      event.preventDefault();
      slotEl.classList.remove('drag-over');
      const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
      if (!raw) return;
      let data;
      try { data = JSON.parse(raw); } catch { return; }
      const item = findCardBySlotAndName(data.slot, data.name);
      if (!item) return;
      const targetSlot = slotEl.dataset.dropSlot;
      if (targetSlot !== data.slot) return;
      selectCardForSlot(item, data.slot, true);
    });
  });
}


function renderBuilder() {
  ui.activeGrid.innerHTML = filterCards(activeSkills).map(item => renderCard(item, 'active')).join('');
  ui.passiveGrid.innerHTML = filterCards(passiveSkills).map(item => renderCard(item, 'passive')).join('');
  ui.petGrid.innerHTML = filterCards(petSkills).map(item => renderCard(item, 'pet')).join('');
  attachBuilderCardEvents();
  renderSelectedSummary();
  renderMapInfo();
  renderCampaignProgress();
}
function renderMapInfo() {
  const map = MAPS[ui.mapSelect.value];
  ui.mapInfo.innerHTML = `<b>${map.name} · ${map.subtitle}</b><br>${map.description}<br><span class="muted">Favored roles: ${map.favors.join(', ')}</span>`;
}
function renderCampaignProgress() {
  if (!ui.campaignProgress) return;
  ui.campaignProgress.innerHTML = `<b>Campaign Progress</b><br>Current stage: ${Math.min(campaignIndex + 1, CAMPAIGN.length)}/${CAMPAIGN.length} · ${CAMPAIGN[Math.min(campaignIndex, CAMPAIGN.length - 1)].title}`;
}
function slotSummary(label, card, emptyText, slot) {
  if (!card) return `<div class="selected-slot empty"><div><b>${label}</b><div>${emptyText}</div></div></div>`;
  return `<div class="selected-slot"><img src="${card.local_image_path}" alt="${escapeHtml(card.name)}" /><div><div class="section-kicker">${escapeHtml(label)} · ${inferRarity(card)}</div><b>${escapeHtml(card.name)}</b><div class="muted">${escapeHtml(card.skill)} ${slot !== 'passive' ? `· Cost ${cardCost(card, slot)}` : ''}</div></div></div>`;
}
function renderSelectedSummary() {
  const rows = [];
  rows.push(slotSummary('Active Skill', builderState.active, 'Choose one active skill', 'active'));
  for (let i = 0; i < 3; i++) rows.push(slotSummary(`Passive ${i + 1}`, builderState.passives[i], 'Choose a passive skill', 'passive'));
  rows.push(slotSummary('Pet Skill', builderState.pet, 'Choose one pet skill', 'pet'));
  if (ui.selectedSummary) ui.selectedSummary.innerHTML = rows.join('');

  if (ui.topSelectedSummary) {
    ui.topSelectedSummary.innerHTML = `
      <div class="deck-left-column">
        ${topSlot('Active', builderState.active, 'active', 'Drop Active')}
        ${topSlot('Pet', builderState.pet, 'pet', 'Drop Pet')}
      </div>
      <div class="deck-right-column">
        ${topSlot('Passive 1', builderState.passives[0], 'passive', 'Drop Passive')}
        ${topSlot('Passive 2', builderState.passives[1], 'passive', 'Drop Passive')}
        ${topSlot('Passive 3', builderState.passives[2], 'passive', 'Drop Passive')}
      </div>`;
    attachLoadoutDropEvents();
    attachDeckSlotRemoveEvents();
  }

  if (ui.startBattleBtn) ui.startBattleBtn.disabled = !(builderState.active && builderState.passives.length === 3 && builderState.pet);
}


function topSlot(label, card, slot, emptyText) {
  if (!card) {
    return `<div class="top-slot deck-slot empty slot-${slot}" data-drop-slot="${slot}"><span>${label}</span><b>${emptyText}</b></div>`;
  }
  return `<div class="top-slot deck-slot filled slot-${slot} ${inferRarity(card).toLowerCase()}" data-drop-slot="${slot}" data-card-name="${escapeHtml(card.name)}">
    <div class="mini-card-top"><span>${slot === 'active' ? 'A' : slot === 'pet' ? 'P' : 'S'}</span><b>${label}</b></div>
    <div class="mini-card-art"><img src="${card.local_image_path}" alt="${escapeHtml(card.name)}" /></div>
    <div class="mini-card-stat"><b>${escapeHtml(card.name)}</b><small>${escapeHtml(card.skill)}</small></div>
    <button class="deck-remove-btn" data-remove-slot="${slot}" data-remove-name="${escapeHtml(card.name)}" type="button">−</button>
  </div>`;
}

function attachDeckSlotRemoveEvents() {
  document.querySelectorAll('[data-remove-slot]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      removeCardFromDeck(btn.dataset.removeSlot, btn.dataset.removeName || '');
    });
  });
}

function attachBuilderCardEvents() {
  document.querySelectorAll('.card[data-slot]').forEach(cardEl => {
    const slot = cardEl.dataset.slot;
    const name = cardEl.dataset.name;
    cardEl.addEventListener('dragstart', event => {
      if (cardEl.classList.contains('disabled')) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData('application/json', JSON.stringify({ slot, name }));
      event.dataTransfer.setData('text/plain', JSON.stringify({ slot, name }));
      event.dataTransfer.effectAllowed = 'copy';
      cardEl.classList.add('dragging');
    });
    cardEl.addEventListener('dragend', () => cardEl.classList.remove('dragging'));
    const toggle = cardEl.querySelector('.deck-toggle');
    if (toggle) {
      toggle.addEventListener('click', event => {
        event.stopPropagation();
        const item = findCardBySlotAndName(slot, name);
        if (!item) return;
        selectCardForSlot(item, slot);
      });
    }
    cardEl.addEventListener('dblclick', () => {
      const item = findCardBySlotAndName(slot, name);
      if (!item) return;
      selectCardForSlot(item, slot);
    });
  });
}

function clearLoadout() { builderState.active = null; builderState.passives = []; builderState.pet = null; renderBuilder(); }
function randomLoadout() { builderState.active = activeSkills[rand(activeSkills.length)]; builderState.passives = shuffle([...passiveSkills]).slice(0, 3); builderState.pet = petSkills[rand(petSkills.length)]; renderBuilder(); }
function setTab(tabName) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`${tabName}Panel`).classList.add('active');
}
function makeEnemyLoadout(stage) {
  const map = MAPS[stage.map || ui.mapSelect.value];
  const favoredActive = activeSkills.filter(c => map.favors.includes(c.role));
  const favoredPassive = passiveSkills.filter(c => map.favors.includes(c.role));
  const favoredPet = petSkills.filter(c => map.favors.includes(c.role));
  return { active: (favoredActive.length && Math.random() < .7) ? favoredActive[rand(favoredActive.length)] : activeSkills[rand(activeSkills.length)], passives: shuffle([...(favoredPassive.length ? favoredPassive : passiveSkills)]).slice(0, 3), pet: (favoredPet.length && Math.random() < .7) ? favoredPet[rand(favoredPet.length)] : petSkills[rand(petSkills.length)] };
}
function buildCombatant(name, loadout, ai = false, baseBoost = {}) {
  const state = { name, label: name, ai, active: loadout.active, passives: loadout.passives, pet: loadout.pet,
    activeAction: createActionPower(loadout.active, 'active'), petAction: createActionPower(loadout.pet, 'pet'),
    maxHp: baseBoost.maxHp || 110, hp: baseBoost.maxHp || 110, shield: baseBoost.shield || 0, maxEnergy: 6, energy: 3,
    attack: baseBoost.attack || 8, defense: 0, crit: 8, dodge: baseBoost.dodge || 0, regen: 0,
    focus: 0, firstSkillFocus: 0, vulnerableTurns: 0, burnTurns: 0, burnDamage: 0, silenceTurns: 0, guardTurns: 0,
    tempAttack: 0, tempAttackTurns: 0, tempDodge: 0, tempDodgeTurns: 0, activeCooldown: 0, petCooldown: 0, healAmp: 0, shieldAmp: 0, explosiveAmp: 0, cooldownMod: 0, usedFirstSkill: false };
  loadout.passives.forEach(card => createPassivePower(card).apply(state));
  state.hp = state.maxHp;
  return state;
}
function startBattle() {
  const mode = ui.modeSelect.value;
  let selectedMap = ui.mapSelect.value, stage = null, enemyBoost = {};
  if (mode === 'campaign') { stage = CAMPAIGN[Math.min(campaignIndex, CAMPAIGN.length - 1)]; selectedMap = stage.map; ui.mapSelect.value = selectedMap; enemyBoost = { maxHp: stage.hp, attack: stage.attack, ...MAPS[selectedMap].enemyBoost }; }
  else enemyBoost = { maxHp: 110, attack: 9, ...MAPS[selectedMap].enemyBoost };
  const map = MAPS[selectedMap], enemyLoadout = makeEnemyLoadout(stage || { map: selectedMap });
  actionBusy = false;
  const enemyDisplayName = `${enemyLoadout.active.name} - ${map.name}`;
  combat = { mode, mapKey: selectedMap, map, stage, player: buildCombatant('You', { active: builderState.active, passives: builderState.passives, pet: builderState.pet }, false), enemy: buildCombatant(enemyDisplayName, enemyLoadout, true, enemyBoost), turn: 'player', turnNumber: 1, over: false, log: [] };
  map.apply(combat.player); map.apply(combat.enemy);
  showBattleScreen();
  logMessage(`${map.name} advantage active: ${map.description}`);
  logMessage('Battle started. Your turn first.');
  renderBattle();
  startTurn(combat.player, combat.enemy);
}
function showBattleScreen() { document.body.classList.add('is-battle-mode'); ui.builderScreen.classList.remove('active'); ui.battleScreen.classList.add('active'); ui.resultModal.classList.remove('active'); }
function showBuilderScreen() { clearTimeout(autoTurnTimer); actionBusy = false; document.body.classList.remove('is-battle-mode'); ui.battleScreen.classList.remove('active'); ui.builderScreen.classList.add('active'); ui.resultModal.classList.remove('active'); renderBuilder(); }
function startTurn(actor, target) {
  if (combat.over) return;
  actionBusy = actor !== combat.player;
  actor.energy = Math.min(actor.maxEnergy, actor.energy + 1);
  actor.activeCooldown = Math.max(0, actor.activeCooldown - actor.cooldownMod);
  actor.petCooldown = Math.max(0, actor.petCooldown - actor.cooldownMod);
  if (actor.activeCooldown > 0) actor.activeCooldown -= 1;
  if (actor.petCooldown > 0) actor.petCooldown -= 1;
  if (actor.tempAttackTurns > 0) { actor.tempAttackTurns -= 1; if (actor.tempAttackTurns === 0) actor.tempAttack = 0; }
  if (actor.tempDodgeTurns > 0) { actor.tempDodgeTurns -= 1; if (actor.tempDodgeTurns === 0) actor.tempDodge = 0; }
  if (actor.vulnerableTurns > 0) actor.vulnerableTurns -= 1;
  if (actor.silenceTurns > 0) actor.silenceTurns -= 1;
  if (actor.guardTurns > 0) actor.guardTurns -= 1;
  if (actor.regen > 0) restoreHp(actor, actor.regen, logMessage, `${actor.name} regenerates`);
  if (actor.burnTurns > 0) { actor.burnTurns -= 1; dealDamage(null, actor, actor.burnDamage, `${actor.name} suffers burn damage`, logMessage, { skipDodge: true }); if (actor.hp <= 0) return finishBattle(target === combat.player ? 'player' : 'enemy'); }
  combat.turn = actor === combat.player ? 'player' : 'enemy';
  if (actor === combat.player) {
    actionBusy = false;
    ui.turnBanner.textContent = playerAutoEnabled ? 'Auto Battle' : 'Your Turn';
    ui.handHint.textContent = playerAutoEnabled ? 'Auto is choosing the best action' : 'Use Basic, Active, or Pet once per turn';
    renderBattle();
    if (playerAutoEnabled && !combat.over) {
      clearTimeout(autoTurnTimer);
      autoTurnTimer = setTimeout(takeAutoPlayerTurn, 620);
    }
  }
  else { actionBusy = true; ui.turnBanner.textContent = 'Opponent Turn'; ui.handHint.textContent = 'Opponent is thinking...'; renderBattle(); setTimeout(() => takeAiTurn(), 800); }
}
async function performPlayerAction(kind) {
  if (!combat || combat.over || combat.turn !== 'player' || actionBusy) return;
  actionBusy = true;
  renderBattle();
  try {
    if (kind === 'basic') await basicAttack(combat.player, combat.enemy, logMessage);
    if (kind === 'active') {
      if (combat.player.activeCooldown > 0 || combat.player.energy < combat.player.activeAction.cost || combat.player.silenceTurns > 0) {
        actionBusy = false;
        renderBattle();
        return;
      }
      await useSkill(combat.player, combat.enemy, combat.player.active, combat.player.activeAction, 'active', logMessage);
    }
    if (kind === 'pet') {
      if (combat.player.petCooldown > 0 || combat.player.energy < combat.player.petAction.cost) {
        actionBusy = false;
        renderBattle();
        return;
      }
      await useSkill(combat.player, combat.enemy, combat.player.pet, combat.player.petAction, 'pet', logMessage);
    }
    afterAction(combat.player, combat.enemy);
  } catch (err) {
    console.error(err);
    actionBusy = false;
    renderBattle();
  }
}


function canUseActive(unit) {
  return unit.activeCooldown === 0 && unit.energy >= unit.activeAction.cost && unit.silenceTurns <= 0;
}
function canUsePet(unit) {
  return unit.petCooldown === 0 && unit.energy >= unit.petAction.cost;
}
function isDefensiveAction(kind) {
  return ['heal', 'shield', 'support', 'utility'].includes(kind);
}
function isTempoAction(kind) {
  return ['info', 'speed'].includes(kind);
}
function isDamageAction(kind) {
  return ['damage', 'explosive'].includes(kind);
}
function chooseAutoPlayerAction() {
  if (!combat || combat.over) return 'basic';
  const p = combat.player;
  const e = combat.enemy;
  const lowHp = p.hp <= p.maxHp * .42;
  const dangerHp = p.hp <= p.maxHp * .28;
  const enemyLow = e.hp <= Math.max(28, e.maxHp * .32);
  const shieldLow = p.shield <= 6;
  const canActive = canUseActive(p);
  const canPet = canUsePet(p);
  const activeKind = p.activeAction.kind;
  const petKind = p.petAction.kind;

  if (dangerHp && canActive && isDefensiveAction(activeKind)) return 'active';
  if (dangerHp && canPet && isDefensiveAction(petKind)) return 'pet';
  if (lowHp && canActive && ['heal', 'shield'].includes(activeKind)) return 'active';
  if (lowHp && canPet && ['heal', 'shield'].includes(petKind)) return 'pet';

  if (enemyLow && canActive && isDamageAction(activeKind)) return 'active';
  if (enemyLow && canPet && isDamageAction(petKind)) return 'pet';

  if (canActive && activeKind === 'info' && p.focus < 8 && combat.turnNumber <= 4) return 'active';
  if (canActive && activeKind === 'speed' && (p.tempDodgeTurns <= 0 || p.tempAttackTurns <= 0)) return 'active';
  if (canPet && petKind === 'info' && p.focus < 6 && combat.turnNumber <= 5) return 'pet';
  if (canPet && petKind === 'speed' && p.tempDodgeTurns <= 0) return 'pet';

  if (canActive && isDamageAction(activeKind) && (p.energy >= p.activeAction.cost + 1 || Math.random() < .78)) return 'active';
  if (canPet && isDamageAction(petKind) && Math.random() < .55) return 'pet';
  if (shieldLow && canActive && activeKind === 'shield') return 'active';
  if (shieldLow && canPet && petKind === 'shield') return 'pet';
  if (canActive && isTempoAction(activeKind) && Math.random() < .35) return 'active';
  if (canPet && isTempoAction(petKind) && Math.random() < .28) return 'pet';
  return 'basic';
}
async function takeAutoPlayerTurn() {
  if (!playerAutoEnabled || !combat || combat.over || combat.turn !== 'player' || actionBusy) return;
  const action = chooseAutoPlayerAction();
  logMessage(`Auto Battle selected ${action.toUpperCase()}.`);
  await performPlayerAction(action);
}
function togglePlayerAuto() {
  playerAutoEnabled = !playerAutoEnabled;
  localStorage.setItem('ffcaPlayerAutoEnabled', playerAutoEnabled ? '1' : '0');
  if (combat && !combat.over) {
    logMessage(`Auto Battle ${playerAutoEnabled ? 'ON' : 'OFF'}.`);
    renderBattle();
    if (playerAutoEnabled && combat.turn === 'player' && !actionBusy) {
      clearTimeout(autoTurnTimer);
      autoTurnTimer = setTimeout(takeAutoPlayerTurn, 420);
    }
  }
}

async function takeAiTurn() {
  if (!combat || combat.over || combat.turn !== 'enemy') return;
  const a = combat.enemy, t = combat.player, lowHp = a.hp <= a.maxHp * .45, canActive = a.activeCooldown === 0 && a.energy >= a.activeAction.cost && a.silenceTurns <= 0, canPet = a.petCooldown === 0 && a.energy >= a.petAction.cost;
  if (lowHp && canActive && ['heal','shield','support'].includes(a.activeAction.kind)) await useSkill(a, t, a.active, a.activeAction, 'active', logMessage);
  else if (lowHp && canPet && ['heal','shield','support'].includes(a.petAction.kind)) await useSkill(a, t, a.pet, a.petAction, 'pet', logMessage);
  else if (canActive && (['damage','explosive','info'].includes(a.activeAction.kind) || Math.random() < .62)) await useSkill(a, t, a.active, a.activeAction, 'active', logMessage);
  else if (canPet && Math.random() < .5) await useSkill(a, t, a.pet, a.petAction, 'pet', logMessage);
  else await basicAttack(a, t, logMessage);
  afterAction(a, t);
}
async function useSkill(user, target, card, action, slot, log) {
  user.energy -= action.cost;
  if (slot === 'active') user.activeCooldown = action.cooldown; else user.petCooldown = action.cooldown;
  if (!user.usedFirstSkill && user.firstSkillFocus) { user.focus += user.firstSkillFocus; user.usedFirstSkill = true; log(`${user.name} gained +${user.firstSkillFocus} focus from passive synergy.`); }
  if (slot === 'pet') await animatePetOverlay(user, target);
  await action.effect(user, target, log);
  playTone(slot === 'active' ? 340 : 270, .08, 'square', .035, 40);
}
async function basicAttack(attacker, defender, log) {
  await animateAction(attacker, defender, 'attack');
  const damage = attacker.attack + attacker.tempAttack + 7 + consumeFocus(attacker, log);
  dealDamage(attacker, defender, damage, `${attacker.name} used a basic attack`, log);
  playTone(180, .05, 'square', .03, -25);
}
function consumeFocus(user, log) { if (!user.focus) return 0; const f = user.focus; user.focus = 0; log(`${user.name} consumed focus for +${f} damage.`); return f; }
function dealDamage(attacker, defender, amount, intro, log, opts = {}) {
  const dodgeChance = opts.skipDodge ? 0 : defender.dodge + defender.tempDodge;
  if (dodgeChance && Math.random() * 100 < dodgeChance) { log(`${intro}. ${defender.name} dodged the hit.`); animateHit(defender); return 0; }
  let dmg = Math.max(1, Math.round(amount - defender.defense + (defender.vulnerableTurns > 0 ? 5 : 0)));
  const critChance = opts.noCrit || !attacker ? 0 : Math.max(0, attacker.crit || 0);
  const isCrit = critChance > 0 && Math.random() * 100 < critChance;
  if (isCrit) dmg = Math.round(dmg * 1.55);
  if (defender.guardTurns > 0) dmg = Math.round(dmg * .72);
  const original = dmg;
  if (defender.shield > 0) { const absorbed = Math.min(defender.shield, dmg); defender.shield -= absorbed; dmg -= absorbed; }
  defender.hp = Math.max(0, defender.hp - dmg);
  if (isCrit && attacker) animateCriticalAttack(attacker, defender);
  animateHit(defender, isCrit);
  log(`${intro}${isCrit ? ' · CRITICAL HIT!' : ''}. ${defender.name} took ${original} damage${original !== dmg ? ` (${original - dmg} shielded)` : ''}.`);
  renderBattle();
  if (defender.hp <= 0) finishBattle(defender === combat.enemy ? 'player' : 'enemy');
  return original;
}
function restoreHp(unit, amount, log, intro = '') { const value = Math.round(amount * (1 + unit.healAmp)); const healed = Math.max(0, Math.min(unit.maxHp - unit.hp, value)); if (healed <= 0) return 0; unit.hp += healed; log(`${intro}. ${unit.name} recovered ${healed} HP.`); return healed; }
function addShield(unit, amount, log, intro = '') { const value = Math.round(amount * (1 + unit.shieldAmp)); unit.shield += value; log(`${intro || unit.name}. ${unit.name} gained ${value} shield.`); }
function afterAction(actor, target) { renderBattle(); if (combat.over) return; if (actor === combat.enemy) combat.turnNumber++; const nextActor = actor === combat.player ? combat.enemy : combat.player; const nextTarget = target === combat.player ? combat.enemy : combat.player; setTimeout(() => startTurn(nextActor, nextTarget), 300); }
function finishBattle(winner) {
  if (combat.over) return;
  combat.over = true;
  clearTimeout(autoTurnTimer);
  renderBattle();
  const resultCard = ui.resultModal.querySelector('.result-card');
  resultCard.classList.toggle('win', winner === 'player');
  ui.resultModal.classList.add('active');
  const campaignWin = winner === 'player' && combat.mode === 'campaign';
  if (winner === 'player') {
    ui.resultKicker.textContent = 'BOOYAH';
    ui.resultTitle.textContent = 'Victory';
    ui.resultText.textContent = `${combat.player.active.name} + ${combat.player.pet.name} controlled ${combat.map.name}.`;
    if (campaignWin && campaignIndex < CAMPAIGN.length - 1) { campaignIndex++; localStorage.setItem('ffcaCampaignIndexV2', campaignIndex); ui.rewardText.textContent = `Campaign advanced to Stage ${campaignIndex + 1}.`; ui.nextCampaignBtn.style.display = ''; }
    else if (campaignWin) { ui.rewardText.textContent = 'Campaign complete. All five map arenas cleared.'; ui.nextCampaignBtn.style.display = 'none'; }
    else { ui.rewardText.textContent = 'Deck duel victory.'; ui.nextCampaignBtn.style.display = 'none'; }
    playTone(420, .13, 'square', .04, 80);
  } else {
    ui.resultKicker.textContent = 'DEFEAT';
    ui.resultTitle.textContent = 'You Lost';
    ui.resultText.textContent = 'Try a different active/passive/pet synergy or choose a better map matchup.';
    ui.rewardText.textContent = '';
    ui.nextCampaignBtn.style.display = 'none';
    playTone(140, .18, 'sawtooth', .04, -50);
  }
  renderCampaignProgress();
}
function logMessage(text) { if (!combat) return; combat.log.push(text); combat.log = combat.log.slice(-16); renderBattleLog(); }
function renderBattleLog() {
  if (!combat) return;
  ui.battleLog.innerHTML = combat.log.slice().reverse().map(line => `<div class="log-item">${escapeHtml(line)}</div>`).join('');
  if (ui.battleLog) ui.battleLog.scrollTop = 0;
}
function renderHeroSummary(unit) { return `<div class="hero-card"><img src="${unit.active.local_image_path}" alt="${escapeHtml(unit.active.name)}" /><div><h4>${escapeHtml(unit.active.name)}</h4><p>${escapeHtml(unit.active.skill)} · ${inferRarity(unit.active)}</p></div></div><div class="hero-card"><img src="${unit.pet.local_image_path}" alt="${escapeHtml(unit.pet.name)}" /><div><h4>${escapeHtml(unit.pet.name)}</h4><p>${escapeHtml(unit.pet.skill)} · ${inferRarity(unit.pet)}</p></div></div>`; }
function statusBar(label, value, max, cls, rightText='') { return `<div class="stat-line"><div class="label-row"><span>${label}</span><span>${rightText || `${Math.round(value)}/${Math.round(max)}`}</span></div><div class="bar ${cls}"><div style="width:${max ? clamp((value/max)*100,0,100) : 0}%"></div></div></div>`; }
function renderStatus(unit) { return [ statusBar('HP', unit.hp, unit.maxHp, 'hp'), statusBar('Shield', unit.shield, Math.max(25, unit.maxHp * .5), 'shield', `${unit.shield}`), statusBar('Energy', unit.energy, unit.maxEnergy, 'energy', `${unit.energy}/${unit.maxEnergy}`), `<div class="muted">ATK ${unit.attack + unit.tempAttack} · DEF ${unit.defense} · CRIT ${unit.crit}% · DODGE ${unit.dodge + unit.tempDodge}%${unit.focus ? ` · FOCUS +${unit.focus}` : ''}${unit.silenceTurns ? ' · SILENCED' : ''}${unit.burnTurns ? ' · BURN' : ''}</div>` ].join(''); }
function renderPassives(unit) { return unit.passives.map(card => `<div class="mini-card"><img src="${card.local_image_path}" alt="${escapeHtml(card.name)}" /><div><b>${escapeHtml(card.name)}</b><div class="meta">${escapeHtml(card.skill)} · ${inferRarity(card)}</div><div class="meta">${escapeHtml(createPassivePower(card).summary)}</div></div></div>`).join(''); }
function renderAvatar(unit) { return `<img src="${unit.active.local_image_path}" alt="${escapeHtml(unit.active.name)}" /><div class="name">${escapeHtml(unit.active.name)}</div><div class="sub">${escapeHtml(unit.pet.name)} · ${unit.name}</div>`; }
function renderHand() {
  if (!combat) return;
  const player = combat.player, isTurn = combat.turn === 'player' && !combat.over;
  const busy = actionBusy || !isTurn;
  const basicDisabled = busy;
  const activeDisabled = busy || player.activeCooldown > 0 || player.energy < player.activeAction.cost || player.silenceTurns > 0;
  const petDisabled = busy || player.petCooldown > 0 || player.energy < player.petAction.cost;

  const actions = [
    { type: 'basic', label: 'Basic', detail: `DMG ${Math.max(1, Math.round(player.attack + player.tempAttack))} · Crit ${player.crit}%`, disabled: basicDisabled },
    { type: 'active', label: 'Active', detail: `${player.active.skill} · Cost ${player.activeAction.cost} · CD ${player.activeCooldown}/${player.activeAction.cooldown}`, disabled: activeDisabled },
    { type: 'pet', label: 'Pet', detail: `${player.pet.skill} · Cost ${player.petAction.cost} · CD ${player.petCooldown}/${player.petAction.cooldown}`, disabled: petDisabled }
  ];

  const deckCards = [
    battleDeckCard(player.active, 'active', 'A'),
    ...player.passives.map(card => battleDeckCard(card, 'passive', 'S')),
    battleDeckCard(player.pet, 'pet', 'P')
  ].join('');

  ui.playerHand.innerHTML = `
    <div class="battle-control-panel ${deckCollapsed ? 'deck-collapsed' : ''}">
      <div class="battle-action-header">
        <div class="battle-action-buttons">
          ${actions.map(action => `<button type="button" data-play="${action.type}" class="battle-action-button ${action.type} ${action.disabled ? '' : 'primary'}" ${action.disabled ? 'disabled' : ''}>
            <b>${action.label}</b><span>${escapeHtml(action.detail)}</span>
          </button>`).join('')}
        </div>
        <div class="battle-side-toggles">
          <button id="autoBattleBtn" class="auto-battle-toggle ${playerAutoEnabled ? 'is-on' : ''}" type="button">${playerAutoEnabled ? 'AUTO ON' : 'AUTO OFF'}</button>
          <button id="toggleDeckBtn" class="mobile-deck-toggle" type="button">${deckCollapsed ? 'SHOW DECK' : 'HIDE DECK'}</button>
        </div>
      </div>
      <div class="battle-deck-row">${deckCards}</div>
    </div>`;

  ui.playerHand.querySelectorAll('[data-play]').forEach(btn => btn.addEventListener('click', () => performPlayerAction(btn.dataset.play)));
  const autoToggle = ui.playerHand.querySelector('#autoBattleBtn');
  if (autoToggle) autoToggle.addEventListener('click', togglePlayerAuto);
  const toggle = ui.playerHand.querySelector('#toggleDeckBtn');
  if (toggle) toggle.addEventListener('click', () => { deckCollapsed = !deckCollapsed; renderHand(); });
}

function battleDeckCard(card, slot, icon) {
  return `<div class="battle-card-outline deck-card slot-${slot} ${inferRarity(card).toLowerCase()}">
    <div class="battle-card-top"><span>${icon}</span><b>${escapeHtml(card.name)}</b></div>
    <div class="battle-card-art"><img src="${card.local_image_path}" alt="${escapeHtml(card.name)}" /></div>
    <div class="battle-card-text"><strong>${escapeHtml(card.skill)}</strong><small>${escapeHtml(inferRarity(card))} · ${escapeHtml(card.role || card.skill_type)}</small></div>
  </div>`;
}

function renderBattle() {
  if (!combat) return;
  ui.playerHero.innerHTML = renderHeroSummary(combat.player);
  ui.enemyHero.innerHTML = renderHeroSummary(combat.enemy);
  ui.playerStatus.innerHTML = renderStatus(combat.player);
  ui.enemyStatus.innerHTML = renderStatus(combat.enemy);
  ui.playerPassivePanel.innerHTML = renderPassives(combat.player);
  ui.enemyPassivePanel.innerHTML = renderPassives(combat.enemy);
  ui.playerAvatar.innerHTML = renderAvatar(combat.player);
  ui.enemyAvatar.innerHTML = renderAvatar(combat.enemy);
  ui.battleMapInfo.innerHTML = `<b>${combat.map.name}</b> · ${combat.map.subtitle}<br>${combat.map.description}`;
  ui.turnCounter.textContent = `TURN ${combat.turnNumber}`;
  ui.basicAttackBtn.disabled = combat.turn !== 'player' || combat.over || actionBusy;
  renderBattleLog();
  renderHand();
}
async function animateAction(user, target, kind) {
  const userPane = user === combat.player ? ui.playerAvatar : ui.enemyAvatar;
  userPane.classList.remove('attack','skill','critical-attack'); void userPane.offsetWidth;
  userPane.classList.add(kind === 'attack' ? 'attack' : 'skill');
  createProjectile(user === combat.enemy, kind);
  await sleep(kind === 'pet' ? 700 : 560);
  userPane.classList.remove('attack','skill');
}
function animateHit(unit, isCrit = false) {
  const pane = unit === combat.player ? ui.playerAvatar : ui.enemyAvatar;
  pane.classList.remove('hit', 'critical-hit'); void pane.offsetWidth;
  pane.classList.add(isCrit ? 'critical-hit' : 'hit');
  setTimeout(() => pane.classList.remove('hit', 'critical-hit'), isCrit ? 850 : 450);
}
function animateCriticalAttack(attacker, defender) {
  const attackerPane = attacker === combat.player ? ui.playerAvatar : ui.enemyAvatar;
  attackerPane.classList.remove('critical-attack'); void attackerPane.offsetWidth;
  attackerPane.classList.add('critical-attack');
  createCritBurst(attacker === combat.enemy);
  setTimeout(() => attackerPane.classList.remove('critical-attack'), 980);
}
function createProjectile(enemy, kind) {
  const layer = document.createElement('div'); layer.className = 'effect-layer';
  const projectile = document.createElement('div'); projectile.className = `projectile ${enemy ? 'enemy' : ''} ${kind === 'pet' ? 'pet-projectile' : ''}`;
  layer.appendChild(projectile); ui.battleBoard.appendChild(layer);
  setTimeout(() => { const blast = document.createElement('div'); blast.className = `blast ${kind === 'pet' ? 'pet-blast' : ''}`; blast.style.left = enemy ? '20%' : '80%'; blast.style.top = '46%'; layer.appendChild(blast); }, 430);
  setTimeout(() => layer.remove(), kind === 'pet' ? 1200 : 980);
}
async function animatePetOverlay(user, target) {
  if (!combat || !user.pet || !ui.battleBoard) return;
  const enemy = user === combat.enemy;
  const layer = document.createElement('div');
  layer.className = `pet-attack-overlay ${enemy ? 'enemy' : ''}`;
  const img = document.createElement('img');
  img.src = user.pet.local_image_path;
  img.alt = `${user.pet.name} attack`;
  layer.appendChild(img);
  ui.battleBoard.appendChild(layer);
  playTone(300, .1, 'square', .035, 80);
  await sleep(720);
  layer.remove();
}
function createCritBurst(enemy) {
  const layer = document.createElement('div');
  layer.className = 'effect-layer crit-layer';
  const burst = document.createElement('div');
  burst.className = `crit-burst ${enemy ? 'enemy' : ''}`;
  burst.textContent = 'CRIT!';
  layer.appendChild(burst);
  ui.battleBoard.appendChild(layer);
  setTimeout(() => layer.remove(), 1000);
}

ui.searchInput.addEventListener('input', renderBuilder);
ui.roleFilter.addEventListener('change', renderBuilder);
ui.rarityFilter.addEventListener('change', renderBuilder);
ui.clearLoadoutBtn.addEventListener('click', clearLoadout);
ui.randomizeBtn.addEventListener('click', randomLoadout);
ui.startBattleBtn.addEventListener('click', startBattle);
ui.basicAttackBtn.addEventListener('click', () => performPlayerAction('basic'));
ui.backToBuilderBtn.addEventListener('click', showBuilderScreen);
ui.rematchBtn.addEventListener('click', startBattle);
ui.resultBuilderBtn.addEventListener('click', showBuilderScreen);
ui.nextCampaignBtn.addEventListener('click', () => { ui.modeSelect.value = 'campaign'; ui.mapSelect.value = CAMPAIGN[Math.min(campaignIndex, CAMPAIGN.length-1)].map; ui.resultModal.classList.remove('active'); startBattle(); });
ui.modeSelect.addEventListener('change', renderBuilder);
ui.mapSelect.addEventListener('change', renderBuilder);
if (ui.campaignBtn) ui.campaignBtn.addEventListener('click', () => { ui.modeSelect.value = 'campaign'; ui.mapSelect.value = CAMPAIGN[Math.min(campaignIndex, CAMPAIGN.length-1)].map; renderBuilder(); });
if (ui.deckBtn) ui.deckBtn.addEventListener('click', () => { ui.modeSelect.value = 'duel'; renderBuilder(); });
ui.soundBtn.addEventListener('click', () => { soundOn = !soundOn; ui.soundBtn.textContent = soundOn ? 'SOUND' : 'MUTED'; if (soundOn) playTone(260, .06, 'square', .03, 60); });
document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));


function applyExternalUser(user) {
  if (!user || typeof user !== 'object') return;
  currentUser = {
    id: user.id || user.email || currentUser.id,
    name: user.name || user.email || currentUser.name || 'Data Center User',
    email: user.email || currentUser.email || '',
    authenticated: true
  };
  try { updateWallet(); } catch {}
}

window.addEventListener('message', event => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'ffdc-user') applyExternalUser(event.data.user);
});

try {
  window.parent?.postMessage({ type: 'card-arena-ready' }, '*');
} catch {}


function addDataCenterExitButton() {
  if (window.self === window.top || document.getElementById('exitDataCenterBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'exitDataCenterBtn';
  btn.type = 'button';
  btn.textContent = 'EXIT DATA CENTER';
  btn.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9999;border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:9px 12px;background:rgba(5,10,18,.86);color:#fff;font-weight:900;letter-spacing:.04em;box-shadow:0 8px 20px rgba(0,0,0,.32)';
  btn.addEventListener('click', () => window.parent?.postMessage({ type: 'card-arena-exit' }, '*'));
  document.body.appendChild(btn);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addDataCenterExitButton, { once: true });
else addDataCenterExitButton();

renderBuilder();
