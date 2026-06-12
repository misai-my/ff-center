/* ============ Supabase init ============ */
const EWC_QUALIFICATION_BUILD = '2026-06-12-v2';
const SUPABASE_URL = 'https://ooutjrewmwsixghbouxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXRqcmV3bXdzaXhnaGJvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjg3NTMsImV4cCI6MjA4MjYwNDc1M30.13WkdGiQH39lZH3iDgVDd_tZrHlI0twhGeiZNdwaMSg';
const TEAM_INSIGHTS_FN_URL = `${SUPABASE_URL}/functions/v1/team-insights`;
const AI_INSIGHTS_CACHE_KEY = 'ewc_ai_insights_cache_v2';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

function withTimeout(promise, ms = 20000, label = 'Operation timed out'){
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}


const TABLE = 'ff_player_stats_raw';
const MAP_TABLE = 'match_api';
const CHARACTER_JSON_URL = 'data/character.json';
const PET_JSON_URL = 'data/pet.json';
const LOADOUT_JSON_URL = 'data/loadout.json';
const WEAPON_JSON_URLS = ['data/weapon.json','data/weapons.json','data/free_fire_full_weapon_data_with_armory.json'];
const TEAM_LOGOS_JSON_URL = 'data/team_logos.json';
const MAX_ROWS_TO_LOAD = 5000;
const CHUNK_SIZE = 1000;
let EWC_PENDING_QUALIFICATION_CUTOFF = '';

// Columns used by this dashboard only. Heavy JSON/text columns such as row_data,
// player_stats_weapon_usages and knock_down_damage_info are intentionally excluded.
// player_stats_kill_info is included for the Live Feed team elimination timeline.
const DASHBOARD_DESIRED_COLS = [
  'id','match_id','Mode','Tournament','Stage','Year','Week','Day','MatchNumber',
  'booyah','eliminated_team_name','final','is_double_kill_score','is_eliminated','is_focus','kill_count','killing_score','ranking_score','win_rate',
  'team_id','team_name',
  'player_stats_account_id','player_stats_nickname','player_stats_kills','player_stats_damage','player_stats_assists','player_stats_headshots','player_stats_shoots','player_stats_hits',
  'player_stats_pet_skill_id','player_stats_pet_skill_name',
  'player_stats_skill_ids','player_stats_skill_ids_0','player_stats_skill_ids_1','player_stats_skill_ids_2','player_stats_skill_ids_3',
  'player_stats_skill_info','player_stats_skill_info_active_count','player_stats_skill_info_skill_active','player_stats_skill_info_skill_id','player_stats_skill_info_skill_name',
  'player_stats_loadouts','player_stats_survival_time','player_stats_kill_info',
  'created_at','updated_at','snapshot_id','pulled_at','response_hash','duplicate_key','data_source'
];

const HEAVY_COLS = new Set([
  'row_data','response','team_stats','player_stats_weapon_usages',
  'player_stats_knock_down_damage_info','match_match_stats_extra_circle_info',
  'match_match_stats_extra_spector_info','match_match_stats_extra_round_stats'
]);

// Loadout code lookup supplied for tournament/server.js data.
const LOADOUT_CODE_MAP = new Map([
  ['500000003', 'Super Leg Pockets'],
  ['500000004', 'Tactical Market'],
  ['500000005', 'Team Booster'],
  ['500000008', 'Enhance Hammer']
]);
const LOADOUT_NAME_TO_CODE = new Map([...LOADOUT_CODE_MAP.entries()].map(([code, name]) => [name, code]));


// Sample profile data keeps the EWC card layout complete while official assets are not ready.
// Replace these objects later with real team/player metadata from Supabase or JSON.
let SAMPLE_TEAM_PROFILES = {
  DEFAULT: {
    team_name: 'EWC Contender',
    region: 'TBD Region',
    country: 'TBD Country',
    group: 'TBD Group',
    seed: 'TBD Seed',
    qualification_path: 'EWC qualification path TBD',
    coach: 'TBD Coach',
    team_logo_url: '',
    team_color: '#ffbd59'
  }
};
const SAMPLE_PLAYER_PROFILE_OVERRIDES = {
  DEFAULT: {
    player_photo_url: '',
    status: 'Starter'
  }
};
const SAMPLE_PLAYER_ROLES = ['IGL','Rusher','Support','Sniper','Flex'];
const SAMPLE_PLAYER_COUNTRIES = ['TBD'];
let LAST_SELECTED_TEAM_ROWS = [];
let LAST_PLAYER_SUMMARY_ROWS = [];
const PLAYER_COMPARE_SELECTED = new Set();
const ROLE_ORDER = ['IGL','Rusher','Assaulter','Entry','Fragger','Support','Sniper','Scout','Flex','Starter','TBD'];
function roleOrderValue(role){
  const clean = norm(role) || 'TBD';
  const exact = ROLE_ORDER.findIndex(r => r.toLowerCase() === clean.toLowerCase());
  if(exact >= 0) return exact;
  const fuzzy = ROLE_ORDER.findIndex(r => clean.toLowerCase().includes(r.toLowerCase()));
  return fuzzy >= 0 ? fuzzy : 999;
}


const RESOURCE_DATA = {
  skills: [],
  pets: [],
  weapons: [],
  loadouts: [],
  maps: [
    { kind:'maps', name:'Bermuda', sub:'Battle Royale Map', img:'https://i.imgur.com/V6iUHaA.jpeg', desc:'Classic Free Fire map used for route planning, rotations, and zone-control discussion.', raw:{} },
    { kind:'maps', name:'Purgatory', sub:'Battle Royale Map', img:'https://i.imgur.com/ieY0LHk.jpeg', desc:'Large terrain map with wide rotations and bridge/pathing pressure.', raw:{} },
    { kind:'maps', name:'Alpine', sub:'Battle Royale Map', img:'https://i.imgur.com/48O1Jf8.jpeg', desc:'Mountainous map for high-ground control, early path planning, and endgame reads.', raw:{} },
    { kind:'maps', name:'Kalahari', sub:'Battle Royale Map', img:'https://i.imgur.com/4Yz12P9.jpeg', desc:'Dry, open map where long sightlines and compound control matter.', raw:{} },
    { kind:'maps', name:'NeXTerra', sub:'Battle Royale Map', img:'https://i.imgur.com/x5he05R.jpeg', desc:'Modern map with fast rotations and dense contest areas.', raw:{} },
    { kind:'maps', name:'Solara', sub:'Battle Royale Map', img:'https://i.imgur.com/IX1oY9Z.jpeg', desc:'Map reference slot for EWC preparation and tactical notes.', raw:{} }
  ]
};
const RESOURCE_TITLES = {
  skills: ['Character Skills', 'Active and passive skills from character.json'],
  pets: ['Pets', 'Pet skills from pet.json'],
  weapons: ['Weapons', 'Weapon reference from weapon data'],
  loadouts: ['Loadouts', 'BR/CS loadout tools from loadout.json'],
  maps: ['Maps', 'Map references for rotations and path planning']
};
const RESOURCE_NAV_ORDER = ['skills','pets','weapons','loadouts','maps'];
const RESOURCE_NAV_LABELS = {
  skills:'Character',
  pets:'Pet',
  weapons:'Weapon',
  loadouts:'Loadout',
  maps:'Map'
};
function resourceNavLabel(kind){
  return RESOURCE_NAV_LABELS[kind] || resourceKindSingular(kind);
}
function getResourceNavState(kind){
  const current = RESOURCE_NAV_ORDER.includes(kind) ? kind : 'skills';
  const index = RESOURCE_NAV_ORDER.indexOf(current);
  const prev = index > 0 ? RESOURCE_NAV_ORDER[index - 1] : null;
  const next = index >= 0 && index < RESOURCE_NAV_ORDER.length - 1 ? RESOURCE_NAV_ORDER[index + 1] : null;
  return { current, index, prev, next };
}
function updateResourceNavButtons(){
  const nav = el('resourceModalNav');
  const back = el('resourceBackBtn');
  const next = el('resourceNextBtn');
  const step = el('resourceStepLabel');
  if(!nav || !back || !next || !step) return;

  // When the popup is being used as a Mini Preset picker, keep the user locked to that slot type.
  nav.style.display = RESOURCE_PICK_TARGET ? 'none' : 'flex';
  if(RESOURCE_PICK_TARGET) return;

  const state = getResourceNavState(RESOURCE_MODAL_KIND);
  const currentLabel = resourceNavLabel(state.current);
  step.innerHTML = `Reference ${state.index + 1}/${RESOURCE_NAV_ORDER.length}<b>${escHtml(currentLabel)}</b>`;

  if(state.prev){
    back.disabled = false;
    back.textContent = `← Back: ${resourceNavLabel(state.prev)}`;
    back.dataset.kind = state.prev;
  }else{
    back.disabled = true;
    back.textContent = '← Back';
    back.dataset.kind = '';
  }

  if(state.next){
    next.disabled = false;
    next.textContent = `Next: ${resourceNavLabel(state.next)} →`;
    next.dataset.kind = state.next;
  }else{
    next.disabled = true;
    next.textContent = 'Next →';
    next.dataset.kind = '';
  }
}
function switchResourcePopup(kind){
  if(!kind) return;
  RESOURCE_MODAL_KIND = kind;
  const [title, sub] = RESOURCE_TITLES[RESOURCE_MODAL_KIND] || ['Resources','Browse Free Fire reference data.'];
  setText('resourceModalTitle', title);
  setText('resourceModalSub', sub);
  const search = el('resourceSearch');
  if(search) search.value = '';
  updateResourceNavButtons();
  renderResourceGrid('');
  setTimeout(() => search?.focus?.(), 50);
}

const MINI_PRESET_KEY = 'ewc_mini_preset_v1';
let MINI_PRESET = { active:[null,null,null,null], passive:[null,null,null,null], pet:[null,null,null,null], loadout:[null,null,null,null] };
const FIXED_MINI_LOADOUTS = [
  { code:'500000008', name:'Enhance Hammer', aliases:['Enhance Hammer','Enhance Ha'] },
  { code:'500000003', name:'Super Leg Pockets', aliases:['Super Leg Pockets','Super Leg Pocket','Super Leg'] },
  { code:'500000004', name:'Tactical Market', aliases:['Tactical Market','Tactical Ma'] },
  { code:'500000005', name:'Team Booster', aliases:['Team Booster','Team Boost'] }
];
let RESOURCE_MODAL_KIND = 'skills';
let RESOURCE_PICK_TARGET = null;

let DASHBOARD_SELECT_COLS = [];
const el = id => document.getElementById(id);
const setText = (id, text) => { const node = el(id); if(node) node.textContent = text; };
const n = x => Number(x ?? 0) || 0;
const norm = v => (v == null ? '' : String(v).trim());
function normalizeLookupId(value){
  const s = norm(value);
  if(!s) return '';
  if(/^[-+]?\d+(\.0+)?$/.test(s)) return String(parseInt(s, 10));
  return s;
}
function normalizeMatchApiNumericId(value){
  const raw = norm(value);
  if(!raw) return '';

  // match_api.id is a plain number such as 7706.
  // Player rows can still arrive as number, "7706", "7706.0", or "ID 7706".
  const exact = raw.match(/^[-+]?(\d+)(?:\.0+)?$/);
  if(exact) return String(parseInt(exact[1], 10));

  const token = raw.match(/\d+(?:\.0+)?/);
  if(!token) return '';
  return String(parseInt(token[0], 10));
}
const toNum = v => { const x = Number(v); return Number.isFinite(x) ? x : null; };
const fmtPct = x => Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '—';
const fmtNum = (value, digits = 0) => {
  const num = Number(value);
  if(!Number.isFinite(num)) return '—';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};
const clip = (s, max = 160) => {
  const v = norm(s);
  return v.length > max ? v.slice(0, max - 1) + '…' : v;
};

function gerr(msg){ const box=el('globalErr'); box.textContent=msg; box.classList.add('show'); console.error('[FF_PLAYER_RAW]', msg); }
function clearErr(){ el('globalErr').classList.remove('show'); el('globalErr').textContent=''; }
function escHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function pickKey(keys, patterns){ for(const rx of patterns){ const k = keys.find(k => rx.test(k)); if(k) return k; } return null; }
function groupBy(arr, fn){ const m = new Map(); for(const r of arr){ const k = fn(r); if(!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; }
function firstPresent(row, keys){ for(const k of keys){ if(k && row && row[k] != null && String(row[k]).trim() !== '') return row[k]; } return ''; }
function getVal(r, key){ return key ? r?.[key] : ''; }

function renderSimpleTable(list, cols){
  if(!list.length) return '<div class="muted">No rows.</div>';
  const head = `<thead><tr>${cols.map(c => `<th data-key="${c.key}" class="${c.right ? 'right' : ''}">${c.label}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${list.map((r,i)=>`<tr>${cols.map(c=>{
    let v;
    if(typeof c.html === 'function') v = c.html(r,i);
    else {
      v = r[c.key];
      if(c.format === 'pct') v = Number.isFinite(Number(v)) ? (Number(v)*100).toFixed(1)+'%' : '—';
      else if(c.format === '1d') v = fmtNum(v, 1);
      else if(c.format === '0d') v = fmtNum(v, 0);
      else if(typeof v === 'number') v = fmtNum(v, 0);
      else if(c.escape !== false) v = escHtml(v ?? '');
    }
    return `<td data-key="${c.key}" data-label="${escHtml(c.label)}" class="${c.right ? 'right' : ''}">${(v == null || v === '') ? '—' : v}</td>`;
  }).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="table-wrap"><table>${head}${body}</table></div>`;
}

function applyColumnHeatmap(containerId, keys, options = {}){
  const table = el(containerId)?.querySelector('table');
  if(!table) return;

  table.querySelectorAll('td[data-key]').forEach(td => {
    td.style.removeProperty('background-color');
    td.style.removeProperty('color');
    td.removeAttribute('data-heat');
    td.classList.remove('heat-top');
  });

  // Google Sheets-style 5-step color scale: red -> soft red -> yellow -> light green -> green.
  // Higher values are treated as better by default, which matches score/damage/elims columns.
  const palette = [
    'rgba(235, 118, 111, .42)',
    'rgba(239, 170, 145, .38)',
    'rgba(248, 227, 145, .40)',
    'rgba(160, 212, 162, .38)',
    'rgba(88, 184, 125, .46)'
  ];
  const textPalette = [
    'rgba(255,255,255,.94)',
    'rgba(255,255,255,.94)',
    'rgba(255,255,255,.94)',
    'rgba(255,255,255,.94)',
    'rgba(255,255,255,.97)'
  ];
  const BANDS = palette.length;

  for(const key of keys){
    const reverse = options[key]?.reverse === true;
    const cells = [...table.querySelectorAll(`td[data-key="${key}"]`)];
    const entries = cells.map((td,i)=>{
      const raw = (td.textContent||'').trim().replace('%','').replace(/,/g,'');
      const v = parseFloat(raw);
      return { td, i, v: Number.isFinite(v) ? v : null };
    }).filter(e=>e.v != null);

    if(!entries.length) continue;

    const values = entries.map(e=>e.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const topVal = reverse ? min : max;

    entries.forEach(e=>{
      let band = BANDS - 1;
      if(max !== min){
        const p = reverse ? (max - e.v) / (max - min) : (e.v - min) / (max - min);
        band = Math.max(0, Math.min(BANDS - 1, Math.floor(p * BANDS)));
      }
      e.td.style.setProperty('background-color', palette[band], 'important');
      e.td.style.setProperty('color', textPalette[band], 'important');
      e.td.setAttribute('data-heat', String(band));
      if(e.v === topVal) e.td.classList.add('heat-top');
    });
  }
}

let EWC_MANUAL_LOGOUT = false;

function isSecureSupabaseSession(session){
  if(!session || !session.user || !session.access_token) return false;
  const expiresAtMs = Number(session.expires_at || 0) * 1000;
  if(expiresAtMs && expiresAtMs <= Date.now()) return false;
  return true;
}
function redirectToLogin(){
  const current = (location.pathname.split('/').pop() || '').toLowerCase();
  if(current !== 'index.html') location.replace('index.html');
}
function updateConnectionBadge(session){
  const loggedIn = isSecureSupabaseSession(session);
  setText('user-info', loggedIn ? session.user.email : 'Not logged in');
  setText('connection-status', loggedIn ? 'Connection active' : 'Connection inactive');
  document.body.classList.toggle('is-logged-in', loggedIn);
}
async function requireSecureSession(){
  try{
    const { data: { session }, error } = await withTimeout(client.auth.getSession(), 10000, 'Login check timed out');
    if(error) throw error;

    if(isSecureSupabaseSession(session)){
      updateConnectionBadge(session);
      return session;
    }

    // Do not sign out or redirect automatically. First try to refresh the stored Supabase session.
    try{
      const { data: { session: refreshedSession }, error: refreshError } = await withTimeout(client.auth.refreshSession(), 10000, 'Token refresh timed out');
      if(refreshError) throw refreshError;
      if(isSecureSupabaseSession(refreshedSession)){
        updateConnectionBadge(refreshedSession);
        return refreshedSession;
      }
    }catch(refreshErr){
      console.warn('Session refresh failed or unavailable:', refreshErr?.message || refreshErr);
    }

    updateConnectionBadge(session);
    return null;
  }catch(err){
    console.warn('Login check failed:', err?.message || err);
    setText('user-info', 'Login check failed');
    setText('connection-status', 'Connection inactive');
    document.body.classList.remove('is-logged-in');
    return null;
  }
}

requireSecureSession();

client.auth.onAuthStateChange((event, session) => {
  updateConnectionBadge(session);
  // No automatic page kick-out. Only the Logout button redirects to index.html.
  if(event === 'SIGNED_OUT' && EWC_MANUAL_LOGOUT){
    redirectToLogin();
  }
});
el('logoutBtn').onclick = async () => {
  EWC_MANUAL_LOGOUT = true;
  await client.auth.signOut();
  redirectToLogin();
};


/* ============ Sidebar + Theme controls ============ */
const THEME_KEY = 'ff_theme_v1';
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const ICON_SUN = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07l-1.41 1.41M20.48 3.52l-1.41 1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" stroke-width="2"/></svg>`;
const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function getTheme(){ return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
function renderThemeIcon(theme){ if(themeIcon) themeIcon.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON; }
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try{ localStorage.setItem(THEME_KEY, theme); }catch(_e){}
  renderThemeIcon(theme);
  if(themeToggleBtn){
    const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggleBtn.setAttribute('title', nextLabel);
    themeToggleBtn.setAttribute('aria-label', nextLabel);
    themeToggleBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }
}
themeToggleBtn?.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));
applyTheme(getTheme());

const sidebar = document.getElementById('sidebar');
const sbOverlay = document.getElementById('sbOverlay');
const sbClose = document.getElementById('sbClose');
const sbToggleBtn = document.getElementById('sbToggle');
const sbTogglePath = document.getElementById('sbTogglePath');
function isMobile(){ return window.matchMedia('(max-width: 980px)').matches; }
function setToggleIcon(){
  if(!sbTogglePath || !sidebar) return;
  const mobile = isMobile();
  const open = sidebar.classList.contains('open');
  const collapsed = sidebar.classList.contains('collapsed');
  if(mobile){
    sbTogglePath.setAttribute('d', open ? 'M6 6l12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16');
    sbTogglePath.setAttribute('stroke-linejoin', open ? 'round' : 'miter');
  }else{
    sbTogglePath.setAttribute('d', collapsed ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7');
    sbTogglePath.setAttribute('stroke-linejoin', 'round');
  }
}
function openMobileSidebar(){ sidebar?.classList.add('open'); sbOverlay?.classList.add('show'); sbOverlay?.setAttribute('aria-hidden','false'); document.body.classList.add('sidebar-open'); syncBodyInteractionLocks?.(); setToggleIcon(); }
function closeMobileSidebar(){ sidebar?.classList.remove('open'); sbOverlay?.classList.remove('show'); sbOverlay?.setAttribute('aria-hidden','true'); document.body.classList.remove('sidebar-open'); syncBodyInteractionLocks?.(); setToggleIcon(); }
function toggleSidebar(){
  if(!sidebar) return;
  if(isMobile()){
    sidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
    return;
  }
  sidebar.classList.toggle('collapsed');
  try{ localStorage.setItem('ff_sidebar_collapsed_v1', sidebar.classList.contains('collapsed') ? '1' : '0'); }catch(_e){}
  setToggleIcon();
}
try{ if(!isMobile() && localStorage.getItem('ff_sidebar_collapsed_v1') === '1') sidebar?.classList.add('collapsed'); }catch(_e){}
sbToggleBtn?.addEventListener('click', toggleSidebar);
sbClose?.addEventListener('click', closeMobileSidebar);
sbOverlay?.addEventListener('click', closeMobileSidebar);
window.addEventListener('resize', () => { if(!isMobile()) closeMobileSidebar(); setToggleIcon(); });
setToggleIcon();

/* ===== Managed modal system: focus, stacking, scroll lock, keyboard control ===== */
const EWC_MODAL_STACK = [];
const EWC_MODAL_TRIGGERS = new WeakMap();
const EWC_FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

function ewcVisibleModal(modal){ return !!modal && modal.classList.contains('show') && modal.getAttribute('aria-hidden') !== 'true'; }
function ewcOpenModalElements(){
  return ['teamModal','liveFeedTeamGlobalModal','resourceModal','itemDetailModal']
    .map(id => document.getElementById(id))
    .filter(ewcVisibleModal);
}
function syncBodyInteractionLocks(){
  const modalOpen = ewcOpenModalElements().length > 0;
  const sidebarOpen = !!sidebar?.classList.contains('open') && isMobile();
  if(modalOpen && !document.body.classList.contains('modal-open')){
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty('--ewc-scrollbar-compensation', `${scrollbarWidth}px`);
  }
  document.body.classList.toggle('modal-open', modalOpen);
  document.body.classList.toggle('sidebar-open', sidebarOpen);
  document.body.classList.toggle('sb-open', modalOpen || sidebarOpen); // compatibility with older selectors
  if(!modalOpen) document.documentElement.style.removeProperty('--ewc-scrollbar-compensation');
}
function syncModalInertState(){
  const open = ewcOpenModalElements();
  const top = ewcTopModal();
  open.forEach(modal => {
    if(modal === top) modal.removeAttribute('inert');
    else modal.setAttribute('inert','');
  });
}
function ewcAnnounce(message){
  const region = document.getElementById('modalLiveRegion');
  if(!region || !message) return;
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}
function ewcModalPanel(modal){
  return modal?.querySelector('.team-modal-card,.resource-modal-card,.item-detail-card,.live-feed-popup-panel,[role="dialog"]') || modal;
}
function ewcRememberTrigger(modal){
  const active = document.activeElement;
  if(active && active !== document.body && active instanceof HTMLElement) EWC_MODAL_TRIGGERS.set(modal, active);
}
function ewcPushModal(modal){
  const old = EWC_MODAL_STACK.indexOf(modal);
  if(old >= 0) EWC_MODAL_STACK.splice(old, 1);
  EWC_MODAL_STACK.push(modal);
}
function ewcTopModal(){
  for(let i=EWC_MODAL_STACK.length-1;i>=0;i--){
    const modal = EWC_MODAL_STACK[i];
    if(ewcVisibleModal(modal)) return modal;
    EWC_MODAL_STACK.splice(i,1);
  }
  const fallbacks = ['itemDetailModal','resourceModal','liveFeedTeamGlobalModal','teamModal'];
  return fallbacks.map(id=>document.getElementById(id)).find(ewcVisibleModal) || null;
}
function openManagedModal(modal, options={}){
  if(!modal) return;
  const wasOpen = ewcVisibleModal(modal);
  if(!wasOpen) ewcRememberTrigger(modal);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  modal.removeAttribute('inert');
  ewcPushModal(modal);
  syncBodyInteractionLocks();
  syncModalInertState();
  if(!wasOpen || options.refocus){
    const focusTarget = options.initialFocus
      ? modal.querySelector(options.initialFocus)
      : ewcModalPanel(modal);
    requestAnimationFrame(() => {
      const target = focusTarget || ewcModalPanel(modal);
      if(target instanceof HTMLElement){
        if(!target.matches(EWC_FOCUSABLE) && !target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1');
        target.focus({preventScroll:true});
      }
    });
  }
  if(options.announce && !wasOpen) ewcAnnounce(options.announce);
}
function closeManagedModal(modal, options={}){
  if(!modal) return;
  modal.classList.remove('show','stacked');
  modal.setAttribute('aria-hidden','true');
  modal.setAttribute('inert','');
  const idx = EWC_MODAL_STACK.indexOf(modal);
  if(idx >= 0) EWC_MODAL_STACK.splice(idx,1);
  syncBodyInteractionLocks();
  syncModalInertState();
  if(options.restoreFocus !== false){
    const trigger = EWC_MODAL_TRIGGERS.get(modal);
    EWC_MODAL_TRIGGERS.delete(modal);
    requestAnimationFrame(() => {
      if(trigger?.isConnected && typeof trigger.focus === 'function') trigger.focus({preventScroll:true});
      else {
        const next = ewcTopModal();
        const nextPanel = ewcModalPanel(next);
        nextPanel?.focus?.({preventScroll:true});
      }
    });
  }
}
function ewcFocusableWithin(modal){
  return [...(ewcModalPanel(modal)?.querySelectorAll(EWC_FOCUSABLE) || [])]
    .filter(node => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true' && node.offsetParent !== null);
}
function closeTopManagedModal(){
  const modal = ewcTopModal();
  if(!modal){ closeMobileSidebar(); return; }
  if(modal.id === 'itemDetailModal') closeItemDetailPopup();
  else if(modal.id === 'resourceModal') closeResourcePopup();
  else if(modal.id === 'liveFeedTeamGlobalModal') closeLiveFeedTeamPopup(null, modal);
  else if(modal.id === 'teamModal') closeTeamModal();
}

document.addEventListener('keydown', event => {
  const modal = ewcTopModal();
  if(event.key === 'Escape'){
    event.preventDefault();
    event.stopImmediatePropagation();
    closeTopManagedModal();
    return;
  }
  if(!modal) return;
  if(event.key === 'Tab'){
    const focusables = ewcFocusableWithin(modal);
    if(!focusables.length){ event.preventDefault(); ewcModalPanel(modal)?.focus?.(); return; }
    const first = focusables[0], last = focusables[focusables.length-1];
    if(event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
  }
  if(modal.id === 'teamModal' && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key) && document.activeElement?.matches?.('.team-tab')){
    const tabs = [...modal.querySelectorAll('.team-tab')];
    const current = tabs.indexOf(document.activeElement);
    let next = current;
    if(event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    if(event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    if(event.key === 'Home') next = 0;
    if(event.key === 'End') next = tabs.length - 1;
    event.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }
}, true);

function setActiveNavItem(){
  const nav = document.getElementById('nav');
  if(!nav) return;
  const current = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
  const items = [...nav.querySelectorAll('.nav-item')];
  items.forEach(item => item.classList.remove('active'));

  let active = items.find(item => {
    const page = String(item.dataset.page || '').toLowerCase();
    const href = String(item.getAttribute('href') || '').split('/').pop().toLowerCase();
    return page === current || href === current;
  });

  // This page is an EWC/team profile dashboard. If the filename does not exist in the sidebar,
  // keep the EWC Team Center nav item highlighted.
  if(!active){
    active = items.find(item => String(item.dataset.page || '').toLowerCase() === 'ewc-team-overview.html') ||
      items.find(item => String(item.dataset.page || '').toLowerCase() === 'br-team.html');
  }

  active?.classList.add('active');
}
setActiveNavItem();

let RAW = [];
let FILTERED = [];
let CURRENT_TEAM = null;
let USED_CORE_SELECT = true;
let KEYS = {
  team:null, teamId:null, player:null, accountId:null,
  tournament:null, stage:null, year:null, week:null, day:null, matchNo:null, matchId:null, mode:null, dataSource:null, center:null,
  kills:null, damage:null, assists:null, headshots:null, shoots:null, hits:null, survivalTime:null,
  booyah:null, killCount:null, killingScore:null, rankingScore:null, winRate:null,
  petName:null, petId:null, loadouts:null,
  rawSkillIds:null, skillInfo:null, skillInfoId:null, skillInfoName:null, skillInfoActive:null, skillInfoActiveCount:null,
  killInfo:null,
  skillIds:[]
};

let ID_TO_NAME = new Map();
let SKILL_ID_TO_NAME = new Map();
let WEAPON_ID_TO_NAME = new Map();
let MAP_READY = false;
let CHAR_SKILLKEY_TO_KIND = new Map();
let CHAR_SKILLKEY_TO_CANONICAL = new Map();
let CHAR_SKILLKEY_LIST = [];
let SKILL_NAME_TO_IMAGE = new Map();
let CHAR_NAME_TO_IMAGE = new Map();
let CHAR_ID_TO_IMAGE = new Map();
let CHAR_READY = false;

let PET_NAME_TO_IMAGE = new Map();
let PET_ID_TO_IMAGE = new Map();
let PET_ID_TO_NAME = new Map();
let PET_READY = false;

let LOADOUT_NAME_TO_IMAGE = new Map();
let LOADOUT_ID_TO_IMAGE = new Map();
let LOADOUT_ID_TO_NAME = new Map();
let LOADOUT_READY = false;

function detectSchema(sample){
  const keys = Object.keys(sample || {});
  KEYS.team = pickKey(keys, [/^team_name$/i, /^player_stats_team_name$/i, /^team$/i]);
  KEYS.teamId = pickKey(keys, [/^team_id$/i, /^player_stats_team_id$/i]);
  KEYS.player = pickKey(keys, [/^player_stats_nickname$/i, /^nickname$/i, /player.*name/i, /^name$/i]);
  KEYS.accountId = pickKey(keys, [/^player_stats_account_id$/i, /^account_id$/i, /account.*id/i]);
  KEYS.tournament = pickKey(keys, [/^Tournament$/, /^tournament$/i]);
  KEYS.stage = pickKey(keys, [/^Stage$/, /^stage$/i]);
  KEYS.year = pickKey(keys, [/^Year$/, /^year$/i]);
  KEYS.week = pickKey(keys, [/^Week$/, /^week$/i]);
  KEYS.day = pickKey(keys, [/^Day$/, /^day$/i]);
  KEYS.matchNo = pickKey(keys, [/^MatchNumber$/, /^match_number$/i, /^matchno$/i]);
  KEYS.matchId = pickKey(keys, [/^match_id$/i]);
  KEYS.mode = pickKey(keys, [/^Mode$/, /^mode$/i]);
  KEYS.dataSource = pickKey(keys, [/^data_source$/i]);
  KEYS.center = pickKey(keys, [/^center$/i]);
  KEYS.kills = pickKey(keys, [/^player_stats_kills$/i, /^kills$/i]);
  KEYS.damage = pickKey(keys, [/^player_stats_damage$/i, /^damage$/i]);
  KEYS.assists = pickKey(keys, [/^player_stats_assists$/i, /^assists$/i]);
  KEYS.headshots = pickKey(keys, [/^player_stats_headshots$/i, /^headshots$/i]);
  KEYS.shoots = pickKey(keys, [/^player_stats_shoots$/i, /^shoots$/i]);
  KEYS.hits = pickKey(keys, [/^player_stats_hits$/i, /^hits$/i]);
  KEYS.survivalTime = pickKey(keys, [/^player_stats_survival_time$/i, /^survival_time$/i]);
  KEYS.booyah = pickKey(keys, [/^booyah$/i, /^is_booyah$/i, /^winner$/i, /^is_winner$/i]);
  KEYS.killCount = pickKey(keys, [/^kill_count$/i]);
  KEYS.killingScore = pickKey(keys, [/^killing_score$/i]);
  KEYS.rankingScore = pickKey(keys, [/^ranking_score$/i]);
  KEYS.winRate = pickKey(keys, [/^win_rate$/i]);
  KEYS.petName = pickKey(keys, [/^player_stats_pet_skill_name$/i, /^pet_skill_name$/i]);
  KEYS.petId = pickKey(keys, [/^player_stats_pet_skill_id$/i, /^pet_skill_id$/i]);
  KEYS.loadouts = pickKey(keys, [/^player_stats_loadouts$/i, /^player_stats_loadout$/i, /^loadouts$/i, /^loadout$/i]);
  KEYS.rawSkillIds = pickKey(keys, [/^player_stats_skill_ids$/i, /^skill_ids$/i]);
  KEYS.skillInfo = pickKey(keys, [/^player_stats_skill_info$/i, /^skill_info$/i]);
  KEYS.skillInfoId = pickKey(keys, [/^player_stats_skill_info_skill_id$/i, /^skill_info_skill_id$/i]);
  KEYS.skillInfoName = pickKey(keys, [/^player_stats_skill_info_skill_name$/i, /^skill_info_skill_name$/i]);
  KEYS.skillInfoActive = pickKey(keys, [/^player_stats_skill_info_skill_active$/i]);
  KEYS.skillInfoActiveCount = pickKey(keys, [/^player_stats_skill_info_active_count$/i]);
  KEYS.killInfo = pickKey(keys, [/^player_stats_kill_info$/i, /^kill_info$/i]);
  KEYS.skillIds = keys.filter(k => /^player_stats_skill_ids_\d+$/i.test(k)).sort((a,b)=>Number((a.match(/(\d+)$/)||[])[1]||0)-Number((b.match(/(\d+)$/)||[])[1]||0)).slice(0,4);

  const summary = [
    `table=${TABLE}`,
    KEYS.team ? `team=${KEYS.team}` : 'team=—',
    KEYS.player ? `player=${KEYS.player}` : 'player=—',
    KEYS.accountId ? `account=${KEYS.accountId}` : 'account=—',
    KEYS.tournament ? `tournament=${KEYS.tournament}` : 'tournament=—',
    KEYS.stage ? `stage=${KEYS.stage}` : 'stage=—',
    KEYS.matchNo ? `matchNo=${KEYS.matchNo}` : 'matchNo=—',
    KEYS.kills ? `kills=${KEYS.kills}` : 'kills=—',
    KEYS.damage ? `dmg=${KEYS.damage}` : 'dmg=—',
    KEYS.rankingScore ? `ranking=${KEYS.rankingScore}` : 'ranking=—',
    KEYS.killingScore ? `killing=${KEYS.killingScore}` : 'killing=—',
    KEYS.skillIds.length ? `skills=${KEYS.skillIds.join(',')}` : (KEYS.rawSkillIds ? `skills=${KEYS.rawSkillIds}` : 'skills=—'),
    KEYS.skillInfoId ? `active=${KEYS.skillInfoId}` : (KEYS.skillInfoName ? `activeName=${KEYS.skillInfoName}` : 'active=—'),
    KEYS.petName ? `pet=${KEYS.petName}` : (KEYS.petId ? `petId=${KEYS.petId}` : 'pet=—'),
    KEYS.loadouts ? `loadouts=${KEYS.loadouts}` : 'loadouts=—',
    KEYS.killInfo ? `killInfo=${KEYS.killInfo}` : 'killInfo=—'
  ].join(' • ');
  setText('diagSchema', 'Detected schema: ' + summary);
}

function makeLookupAliases(value){
  const aliases = [];
  const add = v => {
    const id = normalizeLookupId(v);
    if(!id) return;
    if(!aliases.includes(id)) aliases.push(id);
  };

  const raw = norm(value);
  if(!raw) return aliases;
  add(raw);

  // Pull numeric tokens out of strings such as "ID 2006", JSON fragments,
  // or values that arrive with a decimal suffix from CSV/Sheet exports.
  const tokens = raw.match(/\d+(?:\.0+)?/g) || [];
  tokens.forEach(add);

  for(const token of tokens){
    const clean = normalizeLookupId(token);
    if(!clean || !/^\d+$/.test(clean)) continue;

    add(clean.replace(/^0+/, '') || clean);

    // Some reference tables store a longer API code while live data stores the
    // compact equipped skill id. Try suffix aliases so 2006 can resolve against
    // columns like xxxx2006 without changing the visible player data.
    if(clean.length > 4) add(clean.slice(-4));
    if(clean.length > 5) add(clean.slice(-5));
    if(clean.length > 6) add(clean.slice(-6));
  }

  return aliases;
}

function lookupInMap(map, value){
  for(const alias of makeLookupAliases(value)){
    const found = map.get(alias);
    if(found) return found;
  }
  return '';
}

function mapNameFromId(id, fallback=''){
  const key = normalizeLookupId(id);
  if(!key) return fallback || '—';
  return lookupInMap(ID_TO_NAME, key) || fallback || `ID ${key}`;
}
function mapSkillFromId(id, fallback=''){
  const key = normalizeMatchApiNumericId(id);
  if(!key) return fallback || '—';

  // Exact requested lookup:
  // Number from ff_player_stats_raw skill field -> match_api.id, only where match_api.type = 2, display match_api.name.
  return SKILL_ID_TO_NAME.get(key) || fallback || `ID ${key}`;
}
function mapWeaponFromId(id, fallback=''){
  const key = normalizeMatchApiNumericId(id) || normalizeLookupId(id);
  if(!key) return fallback || '';

  // Weapon lookup:
  // player_stats_kill_info.weapon_used_id -> match_api.id, only where match_api.type = 0, display match_api.name.
  return lookupInMap(WEAPON_ID_TO_NAME, key) || fallback || (key ? `Weapon ${key}` : '');
}
function firstNonEmptyFromKeys(row, keys){
  for(const key of keys){
    const value = norm(row?.[key]);
    if(value) return value;
  }
  return '';
}
function isNumericLike(value){
  return /^[-+]?\d+(?:\.0+)?$/.test(norm(value));
}
function isLikelyNameValue(value){
  const s = norm(value);
  if(!s) return false;
  if(isNumericLike(s)) return false;
  if(s.startsWith('{') || s.startsWith('[')) return false;
  if(/^https?:\/\//i.test(s)) return false;
  if(s.length > 120) return false;
  return /[A-Za-z]/.test(s);
}
function getBestNameFromMatchApiRow(row, nameKeys, idKeys, typeKeys){
  for(const key of nameKeys){
    const v = row?.[key];
    if(isLikelyNameValue(v)) return norm(v);
  }

  // Fallback for schemas that use generic columns like value/text instead of name.
  const blocked = new Set([...idKeys, ...typeKeys]);
  for(const [key, value] of Object.entries(row || {})){
    if(blocked.has(key)) continue;
    if(/id|code|type|created|updated|uuid|owner|email/i.test(key)) continue;
    if(isLikelyNameValue(value)) return norm(value);
  }

  return '';
}
function collectNumericCandidates(value, out){
  if(value == null) return;
  if(Array.isArray(value)){
    value.forEach(v => collectNumericCandidates(v, out));
    return;
  }
  if(typeof value === 'object'){
    for(const [key, v] of Object.entries(value)){
      if(/id|code|key|api|skill|item|resource/i.test(key)) collectNumericCandidates(v, out);
    }
    return;
  }
  for(const alias of makeLookupAliases(value)){
    if(/^\d+$/.test(alias) && alias.length >= 3) out.add(alias);
  }
}
function getIdCandidatesFromMatchApiRow(row, idKeys, typeKeys, nameKeys){
  const out = new Set();
  const blocked = new Set([...typeKeys, ...nameKeys]);

  // First pass: columns that look like the actual API/item/skill/code id.
  for(const key of idKeys){
    if(blocked.has(key)) continue;
    collectNumericCandidates(row?.[key], out);
  }

  // Second pass: generic schemas. Only scan scalar fields that are not clearly
  // names/types/timestamps. This catches tables with columns like value_id/key.
  for(const [key, value] of Object.entries(row || {})){
    if(blocked.has(key)) continue;
    if(/type|name|title|label|desc|created|updated|uuid|owner|email/i.test(key)) continue;
    if(typeof value === 'object' && value !== null && !Array.isArray(value)) continue;
    collectNumericCandidates(value, out);
  }

  return [...out];
}
function isSkillTypeValue(value){
  const raw = norm(value).toLowerCase();
  if(!raw) return false;
  if(Number(raw) === 2) return true;
  return raw === 'skill' || raw === 'skills' || raw.includes('skill');
}
function isSkillMatchApiRow(row, typeKeys){
  for(const key of typeKeys){
    if(isSkillTypeValue(row?.[key])) return true;
  }
  return false;
}
async function fetchMatchApiSkillRowsByType(typeValue){
  const rows = [];
  let from = 0;
  const size = 1000;

  for(;;){
    const { data, error } = await client
      .from(MAP_TABLE)
      .select('id,type,name')
      .eq('type', typeValue)
      .range(from, from + size - 1);

    if(error) throw error;

    const batch = data || [];
    rows.push(...batch);

    if(batch.length < size) break;
    from += size;
  }

  return rows;
}

async function loadMatchApi(){
  MAP_READY = false;
  ID_TO_NAME.clear();
  SKILL_ID_TO_NAME.clear();
  WEAPON_ID_TO_NAME.clear();

  async function fetchGenericMatchApiRows(){
    const rows = [];
    const size = 1000;
    let from = 0;
    for(;;){
      const { data, error } = await client
        .from(MAP_TABLE)
        .select('*')
        .range(from, from + size - 1);
      if(error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if(batch.length < size || rows.length >= 5000) break;
      from += size;
    }
    return rows;
  }

  function ingestMatchApiRows(rows, note){
    let skillRows = 0;
    let namedRows = 0;
    const sample = rows.find(r => r && typeof r === 'object') || {};
    const keys = Object.keys(sample);
    const idKeys = keys.filter(k => /(^id$|_id$|id$|code|key|api_id|item_id|skill_id)/i.test(k));
    const nameKeys = keys.filter(k => /(^name$|name$|title|label|skill_name|skillName)/i.test(k));
    const typeKeys = keys.filter(k => /(^type$|type$|category|kind)/i.test(k));

    for(const r of rows){
      const exactType = Number(norm(r?.type));
      const looksSkill = exactType === 2 || isSkillMatchApiRow(r, typeKeys);
      if(!looksSkill) continue;
      skillRows++;

      const name = norm(r?.name) || getBestNameFromMatchApiRow(r, nameKeys, idKeys, typeKeys);
      if(!name) continue;

      const ids = new Set();
      const primaryId = normalizeMatchApiNumericId(r?.id) || normalizeLookupId(r?.id);
      if(primaryId) ids.add(primaryId);
      getIdCandidatesFromMatchApiRow(r, idKeys, typeKeys, nameKeys).forEach(id => ids.add(id));

      for(const id of ids){
        if(!id) continue;
        namedRows++;
        ID_TO_NAME.set(id, name);
        SKILL_ID_TO_NAME.set(id, name);
      }
    }

    MAP_READY = SKILL_ID_TO_NAME.size > 0;
    setText('diagMap', `match_api mapping: fetched=${rows.length} • skill rows=${skillRows} • skill IDs=${SKILL_ID_TO_NAME.size} • weapon IDs=${WEAPON_ID_TO_NAME.size} • ${note}`);
    return { skillRows, namedRows, mapped: SKILL_ID_TO_NAME.size };
  }

  function ingestWeaponMatchApiRows(rows, note){
    let weaponRows = 0;
    let namedRows = 0;
    const sample = rows.find(r => r && typeof r === 'object') || {};
    const keys = Object.keys(sample);
    const idKeys = keys.filter(k => /(^id$|_id$|id$|code|key|api_id|item_id|weapon_id|gun_id)/i.test(k));
    const nameKeys = keys.filter(k => /(^name$|name$|title|label|weapon_name|weaponName|gun_name|gunName)/i.test(k));
    const typeKeys = keys.filter(k => /(^type$|type$|category|kind)/i.test(k));

    for(const r of rows){
      const exactType = Number(norm(r?.type));
      const looksWeapon = exactType === 0 || typeKeys.some(key => {
        const raw = norm(r?.[key]).toLowerCase();
        return raw === '0' || raw === 'weapon' || raw === 'weapons' || raw === 'gun' || raw === 'guns';
      });
      if(!looksWeapon) continue;
      weaponRows++;

      const name = norm(r?.name) || getBestNameFromMatchApiRow(r, nameKeys, idKeys, typeKeys);
      if(!name) continue;

      const ids = new Set();
      const primaryId = normalizeMatchApiNumericId(r?.id) || normalizeLookupId(r?.id);
      if(primaryId) ids.add(primaryId);
      getIdCandidatesFromMatchApiRow(r, idKeys, typeKeys, nameKeys).forEach(id => ids.add(id));

      for(const id of ids){
        if(!id) continue;
        namedRows++;
        ID_TO_NAME.set(id, name);
        WEAPON_ID_TO_NAME.set(id, name);
      }
    }

    setText('diagMap', `match_api mapping: skill IDs=${SKILL_ID_TO_NAME.size} • weapon rows=${weaponRows} • weapon IDs=${WEAPON_ID_TO_NAME.size} • ${note}`);
    return { weaponRows, namedRows, mapped: WEAPON_ID_TO_NAME.size };
  }

  try{
    let rows = [];
    let note = 'type=2 numeric';

    try{
      rows = await fetchMatchApiSkillRowsByType(2);
    }catch(firstErr){
      console.warn('match_api type=2 numeric fetch failed, trying string type:', firstErr?.message || firstErr);
      rows = await fetchMatchApiSkillRowsByType('2');
      note = 'type="2" string';
    }

    let stats = ingestMatchApiRows(rows, note);

    let weaponRows = [];
    let weaponNote = 'type=0 weapon numeric';
    try{
      weaponRows = await fetchMatchApiSkillRowsByType(0);
    }catch(weaponErr){
      console.warn('match_api type=0 weapon numeric fetch failed, trying string type:', weaponErr?.message || weaponErr);
      weaponRows = await fetchMatchApiSkillRowsByType('0');
      weaponNote = 'type="0" weapon string';
    }
    let weaponStats = ingestWeaponMatchApiRows(weaponRows, weaponNote);

    // Safety fallback: if type=2/type=0 returns nothing or schema/type values changed,
    // scan match_api generically and detect skill/weapon rows by type/category/name fields.
    if(!stats.mapped || !weaponStats.mapped){
      const genericRows = await fetchGenericMatchApiRows();
      if(!stats.mapped) stats = ingestMatchApiRows(genericRows, 'generic match_api skill fallback');
      if(!weaponStats.mapped) weaponStats = ingestWeaponMatchApiRows(genericRows, 'generic match_api weapon fallback');
    }

    setText('diagMap', `match_api mapping: skill IDs=${SKILL_ID_TO_NAME.size} • weapon IDs=${WEAPON_ID_TO_NAME.size} • skills ${note} • weapons ${weaponNote}`);
  }catch(e){
    setText('diagMap', 'match_api mapping: unavailable / expected columns: id, type, name');
    console.warn('match_api load failed:', e?.message || e);
  }
}
function normKind(v){ const s = norm(v).toLowerCase(); if(s.includes('active')) return 'active'; if(s.includes('passive')) return 'passive'; return ''; }
function skillKey(s){ return String(s ?? '').toUpperCase().replace(/\(.*?\)/g,' ').replace(/\bAWAKEN(ED)?\b/g,' ').replace(/\bMAX(ED)?\b/g,' ').replace(/\bLV(L)?\s*\d+\b/g,' ').replace(/[-–—_:|•]/g,' ').replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }
function skillKeyVariants(original){
  const raw = norm(original); if(!raw) return [];
  const parts = raw.split(/[:\-–—|•]/g).map(s=>s.trim()).filter(Boolean);
  const variants = new Set([skillKey(raw)]);
  for(const p of parts){ const k = skillKey(p); if(k && k.length >= 3) variants.add(k); }
  if(parts.length >= 2){ const last = skillKey(parts[parts.length-1]); if(last && last.length >= 3) variants.add(last); }
  return [...variants].filter(Boolean);
}
function fuzzyKindLookup(key){
  let best = null;
  for(const item of CHAR_SKILLKEY_LIST){ const ck = item.key; if(key.includes(ck) || ck.includes(key)){ const score = Math.min(key.length, ck.length); if(!best || score > best.score) best = { kind:item.kind, score }; } }
  return best?.kind || '';
}
function firstCharacterValue(row, patterns){
  const keys = Object.keys(row || {});
  const key = pickKey(keys, patterns);
  return key ? row?.[key] : '';
}

function normalizeImageUrl(value){
  if(value == null) return '';

  if(Array.isArray(value)){
    for(const item of value){
      const found = normalizeImageUrl(item);
      if(found) return found;
    }
    return '';
  }

  if(value && typeof value === 'object'){
    const nested =
      value.url ?? value.src ?? value.path ?? value.href ?? value.file ?? value.asset ??
      value.image_url ?? value.imageUrl ?? value.icon_url ?? value.iconUrl ??
      value.download_url ?? value.downloadUrl ?? value.publicUrl ?? value.public_url ??
      value?.image?.url ?? value?.image?.src ?? value?.icon?.url ?? value?.icon?.src ?? value?.img?.url ?? value?.img?.src ?? '';
    if(nested) return normalizeImageUrl(nested);

    for(const [key, nestedValue] of Object.entries(value)){
      if(!/(icon|image|img|photo|avatar|portrait|thumbnail|thumb|url|src|path|asset|file)/i.test(key)) continue;
      const found = normalizeImageUrl(nestedValue);
      if(found) return found;
    }
    return '';
  }

  let raw = norm(value);
  if(!raw) return '';

  // Some JSON exports HTML-escape URLs.
  raw = raw.replace(/&amp;/g, '&').replace(/^['"]+|['"]+$/g, '').trim();

  if(/^\/\//.test(raw)) return `https:${raw}`;
  if(/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  // GitHub Pages project sites usually break root-relative /assets/... paths.
  // Convert common root-relative local paths to repo-relative paths.
  if(/^\/(assets|img|images|character|characters|skills|skill|pets|pet|loadouts|loadout|weapons|weapon)\//i.test(raw)){
    raw = raw.replace(/^\/+/, '');
  }

  if(raw.startsWith('./')) raw = raw.slice(2);
  if(raw.startsWith('../')) return raw;
  if(raw.startsWith('assets/') || raw.startsWith('img/') || raw.startsWith('images/')) return raw;

  if(/\.(png|webp|jpe?g|gif|svg)(\?.*)?$/i.test(raw)) return raw;
  if(/[\/]/.test(raw) && !/[{}\[\]]/.test(raw)) return raw;
  return '';
}
function valueAtPath(obj, path){
  if(!obj || !path) return '';
  return String(path).split('.').reduce((acc, key) => acc && acc[key] != null ? acc[key] : undefined, obj);
}
function firstTextFromPaths(obj, paths=[]){
  for(const path of paths){
    const value = valueAtPath(obj, path);
    if(value == null) continue;
    if(typeof value === 'object') continue;
    const txt = norm(value);
    if(txt && txt !== '[object Object]') return txt;
  }
  return '';
}
function firstImageValue(row){
  if(!row) return '';

  const direct = normalizeImageUrl(row);
  if(direct) return direct;

  const keys = Object.keys(row || {});
  const priority = [
    /^skill.*(icon|image|img|photo)$/i,
    /^ability.*(icon|image|img|photo)$/i,
    /skill.*(icon|image|img|photo)/i,
    /ability.*(icon|image|img|photo)/i,
    /^(icon|image|img|photo|avatar|portrait|thumbnail|thumb|url|src|path|asset|file)$/i,
    /(icon|image|img|photo|avatar|portrait|thumbnail|thumb|url|src|path|asset|file)/i
  ];

  for(const rx of priority){
    const k = keys.find(key => rx.test(key) && normalizeImageUrl(row?.[key]));
    if(k) return normalizeImageUrl(row?.[k]);
  }

  const nestedPaths = [
    'image.url','image.src','image.path','image.href','image.file','image.asset',
    'img.url','img.src','img.path','img.file',
    'icon.url','icon.src','icon.path','icon.file',
    'skill.image.url','skill.image.src','skill.icon.url','skill.icon.src','skill.img.url','skill.img.src',
    'ability.image.url','ability.image.src','ability.icon.url','ability.icon.src','ability.img.url','ability.img.src',
    'portrait.url','portrait.src','avatar.url','avatar.src','thumbnail.url','thumbnail.src',
    'images.url','images.src','media.url','media.src'
  ];
  for(const path of nestedPaths){
    const found = normalizeImageUrl(valueAtPath(row, path));
    if(found) return found;
  }

  function deepFindImage(obj, depth=0){
    if(!obj || depth > 5) return '';
    if(Array.isArray(obj)){
      for(const item of obj){
        const found = deepFindImage(item, depth + 1);
        if(found) return found;
      }
      return '';
    }
    if(typeof obj !== 'object') return normalizeImageUrl(obj);

    const entries = Object.entries(obj);
    const imageLike = entries.filter(([key]) => /(icon|image|img|photo|avatar|portrait|thumbnail|thumb|url|src|path|asset|file)/i.test(key));
    const other = entries.filter(([key]) => !/(icon|image|img|photo|avatar|portrait|thumbnail|thumb|url|src|path|asset|file)/i.test(key));
    for(const [, value] of [...imageLike, ...other]){
      const found = deepFindImage(value, depth + 1);
      if(found) return found;
    }
    return '';
  }

  return deepFindImage(row);
}
function firstValueByPatterns(row, patterns){
  const keys = Object.keys(row || {});
  const key = pickKey(keys, patterns);
  return key ? row?.[key] : '';
}
function jsonArrayFromData(data, preferredKeys=[]){
  if(Array.isArray(data)) return data;
  if(!data || typeof data !== 'object') return [];
  for(const key of preferredKeys){
    if(Array.isArray(data?.[key])) return data[key];
  }
  for(const value of Object.values(data)){
    if(Array.isArray(value)) return value;
  }
  return [];
}
function assetLookupKey(value){
  return skillKey(value);
}
function firstSkillNameTokenKey(value){
  const raw = norm(value)
    .replace(/[()]/g, ' ')
    .replace(/[-–—_:|•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if(!raw) return '';
  const first = raw.split(/\s+/)[0];
  return first ? skillKey(first) : '';
}
function shouldUseFirstNameForSkillLookup(value){
  const raw = norm(value);
  if(!raw) return false;
  const words = raw.replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if(words.length < 2) return false;
  return /awaken|awakened|awakening/i.test(raw);
}
function skillImageLookupKeys(value){
  const raw = norm(value);
  if(!raw) return [];
  const keys = [];

  // Exact lookup first: match_api.name -> character.json skill/name keys.
  for(const k of skillKeyVariants(raw)){
    if(k) keys.push(k);
  }

  // Requested fallback: if the captured match_api name has multiple words,
  // also search character.json by the first word. This fixes names like
  // "Oscar Awakened", "Moco Awakened", or other two-word variants.
  const words = raw.replace(/[()]/g, ' ').replace(/[-–—_:|•]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if(words.length >= 2){
    const firstKey = firstSkillNameTokenKey(raw);
    if(firstKey) keys.unshift(firstKey);
  }

  return uniqueList(keys);
}
function lookupSkillImageFromCharacterJson(label){
  const keys = skillImageLookupKeys(label);
  for(const key of keys){
    const img = SKILL_NAME_TO_IMAGE.get(key) || CHAR_NAME_TO_IMAGE.get(key);
    if(img) return img;
  }

  // First-word hard fallback for any multi-word match_api.name.
  const firstKey = firstSkillNameTokenKey(label);
  if(firstKey){
    const img = SKILL_NAME_TO_IMAGE.get(firstKey) || CHAR_NAME_TO_IMAGE.get(firstKey);
    if(img) return img;
  }

  // Fuzzy fallback against both skill names and character names in character.json.
  for(const key of keys){
    for(const source of [SKILL_NAME_TO_IMAGE, CHAR_NAME_TO_IMAGE]){
      for(const [storedKey, img] of source.entries()){
        if(!storedKey || !img) continue;
        if(key.includes(storedKey) || storedKey.includes(key)) return img;
      }
    }
  }

  return '';
}
function idCandidatesFromRow(row){
  const keys = Object.keys(row || {});
  const idKeys = keys.filter(k => /(^id$|_id$|id$|code|key|api_id|item_id|skill_id|pet_id|loadout_id)/i.test(k));
  const out = [];
  for(const k of idKeys){
    const id = normalizeMatchApiNumericId(row?.[k]) || normalizeLookupId(row?.[k]);
    if(id) out.push(id);
  }
  return uniqueList(out);
}
function slugAssetName(value){
  return norm(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function localAssetCandidates(folder, assetSlug){
  if(!assetSlug) return [];
  const exts = ['png','webp','jpg','jpeg','gif','svg'];
  return exts.map(ext => `${folder}/${assetSlug}.${ext}`);
}
function initialsFromLabel(label){
  const words = norm(label).replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  if(!words.length) return '?';
  if(words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
function uniqueList(items){
  const seen = new Set();
  const out = [];
  for(const item of items){
    const v = norm(item);
    if(!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function compactWeaponNameKey(value){
  return assetLookupKey(value)
    .replace(/freefire|weapon|gun|rifle|shotgun|smg|ar|sr|lmg|pistol|launcher|marksman|sniper/g, '')
    .replace(/[^a-z0-9]/g, '');
}
function weaponNameSimilarity(a, b){
  const ak = compactWeaponNameKey(a);
  const bk = compactWeaponNameKey(b);
  if(!ak || !bk) return 0;
  if(ak === bk) return 100;
  if(ak.includes(bk) || bk.includes(ak)) return 86;
  const aTokens = new Set(assetLookupKey(a).split(/[^a-z0-9]+/).filter(Boolean));
  const bTokens = new Set(assetLookupKey(b).split(/[^a-z0-9]+/).filter(Boolean));
  let shared = 0;
  aTokens.forEach(t => { if(bTokens.has(t)) shared++; });
  const tokenScore = shared ? (shared / Math.max(aTokens.size, bTokens.size)) * 72 : 0;
  let prefix = 0;
  const minLen = Math.min(ak.length, bk.length);
  while(prefix < minLen && ak[prefix] === bk[prefix]) prefix++;
  const prefixScore = minLen ? (prefix / minLen) * 52 : 0;
  return Math.max(tokenScore, prefixScore);
}
function findClosestWeaponResourceItem(label='', id=''){
  const list = RESOURCE_DATA.weapons || [];
  const cleanId = normalizeMatchApiNumericId(id) || normalizeLookupId(id);
  const labelText = norm(label);
  const labelKey = assetLookupKey(labelText);

  if(cleanId){
    const byId = list.find(item => idCandidatesFromRow(item?.raw || {}).map(x => normalizeLookupId(x)).includes(cleanId));
    if(byId) return byId;
  }

  if(!labelKey) return null;

  let best = null;
  let bestScore = 0;
  for(const item of list){
    const names = uniqueList([
      item?.name,
      item?.sub,
      item?.search_name,
      item?.raw?.name,
      item?.raw?.title,
      item?.raw?.label,
      item?.raw?.weapon_name,
      item?.raw?.weaponName,
      item?.raw?.gun_name,
      item?.raw?.gunName,
      item?.raw?.display_name,
      item?.raw?.displayName
    ]).filter(Boolean);

    for(const candidate of names){
      const score = weaponNameSimilarity(labelText, candidate);
      if(score > bestScore){
        bestScore = score;
        best = item;
      }
    }
  }

  return bestScore >= 38 ? best : null;
}

function visualImageCandidates(kind, label, id=''){
  const name = norm(label);
  const slug = slugAssetName(name);
  const key = assetLookupKey(name);
  const normalizedId = normalizeMatchApiNumericId(id) || normalizeLookupId(id);
  const code = normalizedId || (kind === 'loadout' ? LOADOUT_NAME_TO_CODE.get(name) : '');
  const candidates = [];

  if(kind === 'skill'){
    const firstKey = firstSkillNameTokenKey(name);
    const firstSlug = firstKey ? slugAssetName(firstKey) : '';
    if(firstSlug && firstSlug !== slug) candidates.push(...localAssetCandidates('assets/img/characters', firstSlug));
    if(slug) candidates.push(...localAssetCandidates('assets/img/characters', slug));

    const byId = normalizedId ? CHAR_ID_TO_IMAGE.get(normalizedId) : '';
    const mapped = lookupSkillImageFromCharacterJson(name);
    if(byId) candidates.push(byId);
    if(mapped) candidates.push(mapped);
  }else if(kind === 'pet'){
    if(slug) candidates.push(...localAssetCandidates('assets/img/pets', slug));
    const byId = normalizedId ? PET_ID_TO_IMAGE.get(normalizedId) : '';
    const byName = PET_NAME_TO_IMAGE.get(key);
    if(byId) candidates.push(byId);
    if(byName) candidates.push(byName);
  }else if(kind === 'loadout'){
    if(code) candidates.push(...localAssetCandidates('assets/img/loadouts', slugAssetName(code)));
    if(slug) candidates.push(...localAssetCandidates('assets/img/loadouts', slug));
    const byId = code ? LOADOUT_ID_TO_IMAGE.get(code) : '';
    const byName = LOADOUT_NAME_TO_IMAGE.get(key);
    if(byId) candidates.push(byId);
    if(byName) candidates.push(byName);
  }else if(kind === 'weapon'){
    const found = findClosestWeaponResourceItem(name, normalizedId);
    const rawImg = normalizeImageUrl(found?.img || found?.image || found?.icon || found?.src || '');
    const foundName = norm(found?.name || '');
    const foundSlug = slugAssetName(foundName);
    if(normalizedId) candidates.push(...localAssetCandidates('assets/img/weapons', slugAssetName(normalizedId)));
    if(foundSlug && foundSlug !== slug) candidates.push(...localAssetCandidates('assets/img/weapons', foundSlug));
    if(slug) candidates.push(...localAssetCandidates('assets/img/weapons', slug));
    if(rawImg) candidates.push(rawImg);
  }

  return uniqueList(candidates);
}
function tryIconFallback(img){
  const fallbacks = (img.dataset.fallbacks || '').split('|').filter(Boolean);
  const index = Number(img.dataset.fallbackIndex || 0);
  if(index < fallbacks.length){
    img.dataset.fallbackIndex = String(index + 1);
    img.src = fallbacks[index];
    return;
  }
  const wrap = img.closest('.visual-icon-wrap');
  if(wrap) wrap.classList.add('no-img');
}
function visualIconHtml(kind, label, id=''){
  const candidates = visualImageCandidates(kind, label, id);
  const fallback = initialsFromLabel(label);
  if(!candidates.length){
    return `<span class="visual-icon-wrap no-img"><span class="visual-fallback">${escHtml(fallback)}</span></span>`;
  }
  const [first, ...rest] = candidates;
  return `<span class="visual-icon-wrap"><img src="${escHtml(first)}" data-fallbacks="${escHtml(rest.join('|'))}" data-fallback-index="0" alt="${escHtml(label)}" loading="lazy" onerror="tryIconFallback(this)"><span class="visual-fallback">${escHtml(fallback)}</span></span>`;
}
function visualItemHtml(kind, item, compact=false){
  if(!item || !norm(item.name)) return '';
  const label = norm(item.name);
  const picks = item.picks ? Number(item.picks) || item.picks : '';
  const countTitle = picks ? ` (${escHtml(picks)})` : '';
  let itemId = item.id || '';
  if(!itemId && kind === 'loadout') itemId = LOADOUT_NAME_TO_CODE.get(label) || '';

  return `<div class="skill-item ${compact ? 'multi' : ''}" title="${escHtml(label)}${countTitle}">
    <span class="skill-icon-stack">
      ${visualIconHtml(kind, label, itemId)}
      ${picks ? `<span class="skill-count-badge">${escHtml(picks)}</span>` : ''}
    </span>
    <span class="skill-label">${escHtml(label)}${picks ? `<span class="skill-count inline">×${escHtml(picks)}</span>` : ''}</span>
  </div>`;
}
function visualColumnHtml(title, kind, items, compact=false){
  const clean = (items || []).filter(item => item && norm(item.name));
  return `<div class="skill-visual-col"><div class="skill-col-title">${escHtml(title)}</div><div class="skill-items">${clean.length ? clean.map(item => visualItemHtml(kind, item, compact)).join('') : '<span class="skill-empty">—</span>'}</div></div>`;
}
function playerVisualRowHtml(playerName, activeItems, passiveItems, petItems, loadoutItems){
  return `<div class="skill-summary-scroll"><div class="skill-visual-row"><div class="skill-player-name" title="${escHtml(playerName)}">${escHtml(playerName)}</div>${visualColumnHtml('Active', 'skill', activeItems)}${visualColumnHtml('Passive', 'skill', passiveItems, true)}${visualColumnHtml('Pet', 'pet', petItems)}${visualColumnHtml('Loadout', 'loadout', loadoutItems)}</div></div>`;
}
function topVisualRowHtml(activeItems, passiveItems, petItems, loadoutItems){
  return `<div class="skill-summary-scroll"><div class="skill-visual-row team-top">${visualColumnHtml('Top Active', 'skill', activeItems)}${visualColumnHtml('Top Passive', 'skill', passiveItems, true)}${visualColumnHtml('Top Pet', 'pet', petItems)}${visualColumnHtml('Top Loadout', 'loadout', loadoutItems)}</div></div>`;
}

async function loadCharacterJson(){
  CHAR_READY = false;
  CHAR_SKILLKEY_TO_KIND.clear();
  CHAR_SKILLKEY_TO_CANONICAL.clear();
  CHAR_SKILLKEY_LIST = [];
  SKILL_NAME_TO_IMAGE.clear();
  CHAR_NAME_TO_IMAGE.clear();
  CHAR_ID_TO_IMAGE.clear();

  try{
    const res = await fetch(`${CHARACTER_JSON_URL}?v=${Date.now()}`, { cache:'no-store' });
    if(!res.ok) throw new Error(`character.json fetch failed: ${res.status}`);

    const data = await res.json();
    const arr = Array.isArray(data) ? data :
      Array.isArray(data?.characters) ? data.characters :
      Array.isArray(data?.data) ? data.data :
      [];

    RESOURCE_DATA.skills = arr.map(item => normalizeGalleryItem(item, 'skills')).filter(Boolean);

    let activeCount = 0;
    let passiveCount = 0;

    for(const ch of arr){
      const kind = normKind(
        ch?.skill_type ?? ch?.skillType ?? ch?.skill_kind ?? ch?.skillKind ?? ch?.type ?? ch?.category ??
        firstCharacterValue(ch, [/skill.*type/i, /skill.*kind/i, /^type$/i, /^kind$/i, /category/i])
      );
      if(!kind) continue;

      const skillImage = firstImageValue(ch);
      const possibleNames = [
        firstTextFromPaths(ch, ['skill.name','skill.title','skill.label','skill.skill_name','skill.skillName','skill.ability_name','skill.abilityName']),
        firstTextFromPaths(ch, ['ability.name','ability.title','ability.label','ability.skill_name','ability.skillName']),
        ch?.skill,
        ch?.skill_name,
        ch?.skillName,
        ch?.ability,
        ch?.ability_name,
        ch?.abilityName,
        ch?.name,
        ch?.title,
        ch?.label,
        ch?.character_skill,
        ch?.characterSkill,
        firstCharacterValue(ch, [/^skill$/i, /skill.*name/i, /ability.*name/i, /^ability$/i])
      ].filter(v => norm(v) && norm(v) !== '[object Object]');

      const characterNames = [
        firstTextFromPaths(ch, ['character.name','character.title','character.label','hero.name','hero.title','hero.label']),
        ch?.character,
        ch?.character_name,
        ch?.characterName,
        ch?.hero,
        ch?.hero_name,
        ch?.heroName,
        ch?.code,
        ch?.code_name,
        ch?.codeName,
        ch?.name,
        ch?.title,
        ch?.label,
        firstCharacterValue(ch, [/^character$/i, /character.*name/i, /^hero$/i, /hero.*name/i, /^name$/i, /^title$/i, /^label$/i])
      ].filter(v => norm(v) && norm(v) !== '[object Object]');

      const lookupNames = uniqueList([
        ...possibleNames,
        ...characterNames,
        // Store first-word aliases for every multi-word skill/character name so
        // match_api.name can resolve to character.json images even with variants.
        ...possibleNames.map(v => norm(v).split(/\s+/)[0]),
        ...characterNames.map(v => norm(v).split(/\s+/)[0])
      ]);

      if(skillImage){
        for(const alias of lookupNames){
          for(const k of skillImageLookupKeys(alias)){
            if(k && !CHAR_NAME_TO_IMAGE.has(k)) CHAR_NAME_TO_IMAGE.set(k, skillImage);
          }
        }
        for(const id of idCandidatesFromRow(ch)){
          if(id && !CHAR_ID_TO_IMAGE.has(id)) CHAR_ID_TO_IMAGE.set(id, skillImage);
        }
      }

      for(const skillName of lookupNames){
        for(const k of skillImageLookupKeys(skillName)){
          if(!k) continue;
          // Keep the first non-empty classification for each normalized skill/name alias.
          if(!CHAR_SKILLKEY_TO_KIND.has(k)){
            CHAR_SKILLKEY_TO_KIND.set(k, kind);
            CHAR_SKILLKEY_TO_CANONICAL.set(k, norm(skillName));
            if(kind === 'active') activeCount++;
            if(kind === 'passive') passiveCount++;
          }
          if(skillImage && !SKILL_NAME_TO_IMAGE.has(k)){
            SKILL_NAME_TO_IMAGE.set(k, skillImage);
          }
        }
      }
    }

    CHAR_SKILLKEY_LIST = [...CHAR_SKILLKEY_TO_KIND.entries()].map(([key,kind])=>({
      key,
      kind,
      name: CHAR_SKILLKEY_TO_CANONICAL.get(key) || key
    }));
    CHAR_READY = CHAR_SKILLKEY_TO_KIND.size > 0;
    setText('diagChar', `character.json validation: ${CHAR_SKILLKEY_TO_KIND.size} skill names • images=${SKILL_NAME_TO_IMAGE.size + CHAR_NAME_TO_IMAGE.size + CHAR_ID_TO_IMAGE.size} • active=${activeCount} • passive=${passiveCount}`);
  }catch(e){
    CHAR_READY = false;
    setText('diagChar', 'character.json validation: unavailable / fallback mode');
    console.warn('character.json load failed:', e?.message || e);
  }
}


async function loadPetJson(){
  PET_READY = false;
  PET_NAME_TO_IMAGE.clear();
  PET_ID_TO_IMAGE.clear();
  PET_ID_TO_NAME.clear();

  try{
    const res = await fetch(`${PET_JSON_URL}?v=${Date.now()}`, { cache:'no-store' });
    if(!res.ok) throw new Error(`pet.json fetch failed: ${res.status}`);
    const data = await res.json();
    const arr = jsonArrayFromData(data, ['pets','pet','data','items']);
    RESOURCE_DATA.pets = arr.map(item => normalizeGalleryItem(item, 'pets')).filter(Boolean);

    for(const pet of arr){
      if(!pet || typeof pet !== 'object') continue;
      const name = norm(
        pet?.name ?? pet?.pet_name ?? pet?.petName ?? pet?.skill_name ?? pet?.skillName ?? pet?.title ?? pet?.label ??
        firstValueByPatterns(pet, [/^name$/i, /^pet.*name$/i, /^skill.*name$/i, /^title$/i, /^label$/i])
      );
      const image = firstImageValue(pet);
      const ids = idCandidatesFromRow(pet);

      if(name){
        const key = assetLookupKey(name);
        for(const id of ids){
          if(!PET_ID_TO_NAME.has(id)) PET_ID_TO_NAME.set(id, name);
        }
        if(image && !PET_NAME_TO_IMAGE.has(key)) PET_NAME_TO_IMAGE.set(key, image);
      }
      if(image){
        for(const id of ids){
          if(!PET_ID_TO_IMAGE.has(id)) PET_ID_TO_IMAGE.set(id, image);
        }
      }
    }

    PET_READY = PET_NAME_TO_IMAGE.size > 0 || PET_ID_TO_IMAGE.size > 0;
    setText('diagPet', `pet.json images: ${PET_NAME_TO_IMAGE.size} names • ${PET_ID_TO_IMAGE.size} ids`);
  }catch(e){
    PET_READY = false;
    setText('diagPet', 'pet.json images: unavailable / fallback paths');
    console.warn('pet.json load failed:', e?.message || e);
  }
}

async function loadLoadoutJson(){
  LOADOUT_READY = false;
  LOADOUT_NAME_TO_IMAGE.clear();
  LOADOUT_ID_TO_IMAGE.clear();
  LOADOUT_ID_TO_NAME.clear();

  try{
    const res = await fetch(`${LOADOUT_JSON_URL}?v=${Date.now()}`, { cache:'no-store' });
    if(!res.ok) throw new Error(`loadout.json fetch failed: ${res.status}`);
    const data = await res.json();
    const arr = jsonArrayFromData(data, ['loadouts','loadout','data','items']);
    RESOURCE_DATA.loadouts = arr.map(item => normalizeGalleryItem(item, 'loadouts')).filter(Boolean);

    for(const item of arr){
      if(!item || typeof item !== 'object') continue;
      const name = norm(
        item?.name ?? item?.loadout_name ?? item?.loadoutName ?? item?.title ?? item?.label ?? item?.item_name ??
        firstValueByPatterns(item, [/^name$/i, /^loadout.*name$/i, /^item.*name$/i, /^title$/i, /^label$/i])
      );
      const image = firstImageValue(item);
      const ids = idCandidatesFromRow(item);

      if(name){
        const key = assetLookupKey(name);
        for(const id of ids){
          if(!LOADOUT_ID_TO_NAME.has(id)) LOADOUT_ID_TO_NAME.set(id, name);
          if(!LOADOUT_CODE_MAP.has(id)) LOADOUT_CODE_MAP.set(id, name);
          if(!LOADOUT_NAME_TO_CODE.has(name)) LOADOUT_NAME_TO_CODE.set(name, id);
        }
        if(image && !LOADOUT_NAME_TO_IMAGE.has(key)) LOADOUT_NAME_TO_IMAGE.set(key, image);
      }
      if(image){
        for(const id of ids){
          if(!LOADOUT_ID_TO_IMAGE.has(id)) LOADOUT_ID_TO_IMAGE.set(id, image);
        }
      }
    }

    LOADOUT_READY = LOADOUT_NAME_TO_IMAGE.size > 0 || LOADOUT_ID_TO_IMAGE.size > 0;
    setText('diagLoadout', `loadout.json images: ${LOADOUT_NAME_TO_IMAGE.size} names • ${LOADOUT_ID_TO_IMAGE.size} ids`);
  }catch(e){
    LOADOUT_READY = false;
    RESOURCE_DATA.loadouts = [
      {kind:'loadouts', name:'Enhance Hammer', sub:'Loadout', img:'', desc:'Enhance weapons through the loadout panel.', raw:{name:'Enhance Hammer', loadout_id:'500000008', category:'Loadout', description:{br:'Enhance your or your teammates\' weapon on the panel.\n\n- Current BR enhancement cost: 400 FF Coins per enhancement.', cs:'Earn tokens via eliminations and enhance weapons / gloo walls during purchase phase.'}}},
      {kind:'loadouts', name:'Super Leg Pocket', sub:'Loadout', img:'', desc:'Start with extra utility items and inventory advantages.', raw:{name:'Super Leg Pocket', loadout_id:'500000003', category:'Loadout', description:{br:'Start with extra utility items and inventory advantages.', cs:'Start each match with key items and extra protection.'}}},
      {kind:'loadouts', name:'Tactical Market', sub:'Loadout', img:'', desc:'Access tactical market tools and gadgets.', raw:{name:'Tactical Market', loadout_id:'500000004', category:'Loadout', description:{br:'Access the tactical market anytime, anywhere.', cs:'Get a tactical panel each round and deploy a chosen gadget.'}}},
      {kind:'loadouts', name:'Team Booster', sub:'Loadout', img:'', desc:'Activate team buffs depending on match mode.', raw:{name:'Team Booster', loadout_id:'500000005', category:'Loadout', description:{br:'Activate team buffs for Battle Royale utility.', cs:'Use team booster effects for Clash Squad support.'}}}
    ];
    setText('diagLoadout', 'loadout.json images: unavailable / fallback paths');
    console.warn('loadout.json load failed:', e?.message || e);
  }
}

async function headCount(){
  try{
    const res = await withTimeout(client.from(TABLE).select('id', { count:'estimated', head:true }), 12000, 'Row count timed out');
    if(res.error) throw res.error;
    setText('diagCount', `${TABLE} rows: ${res.count ?? '—'}`);
  }catch(e){ setText('diagCount', `${TABLE} rows: count blocked`); console.warn('Count failed:', e?.message || e); }
}
async function loadAvailableColumns(){
  const orderCandidates = ['pulled_at','id','created_at','updated_at'];

  for(const orderCol of orderCandidates){
    try{
      const { data, error } = await withTimeout(
        client
          .from(TABLE)
          .select('*')
          .order(orderCol, { ascending:false })
          .limit(1),
        12000,
        `Schema sample timed out ordering by ${orderCol}`
      );

      if(error){
        console.warn(`Schema sample failed ordering by ${orderCol}:`, error.message || error);
        continue;
      }

      const sample = data?.[0] || null;
      if(!sample) return [];

      return Object.keys(sample).filter(k => !HEAVY_COLS.has(k));
    }catch(e){
      console.warn(`Schema sample exception ordering by ${orderCol}:`, e?.message || e);
    }
  }

  try{
    const { data, error } = await withTimeout(client.from(TABLE).select('*').limit(1), 12000, 'Schema sample timed out without ordering');
    if(error) throw error;
    const sample = data?.[0] || null;
    return sample ? Object.keys(sample).filter(k => !HEAVY_COLS.has(k)) : [];
  }catch(e){
    console.warn('Schema sample failed without ordering:', e?.message || e);
    return [];
  }
}

async function fetchRowsWithSelect(selectList){
  const out = [];
  const orderCandidates = ['pulled_at','id','created_at','updated_at'];

  for(const orderCol of orderCandidates){
    out.length = 0;
    let from = 0;
    let ok = true;

    for(;;){
      const { data, error } = await withTimeout(
        client
          .from(TABLE)
          .select(selectList)
          .order(orderCol, { ascending:false })
          .range(from, from + CHUNK_SIZE - 1),
        20000,
        `Data fetch timed out ordering by ${orderCol}`
      );

      if(error){
        ok = false;
        console.warn(`Fetch failed ordering by ${orderCol}:`, error.message || error);
        break;
      }

      const rows = data || [];
      if(!rows.length) break;

      out.push(...rows);
      from += rows.length;

      setText('diagLoaded', `Loading: ${Math.min(out.length, MAX_ROWS_TO_LOAD)} rows…`);

      if(rows.length < CHUNK_SIZE || out.length >= MAX_ROWS_TO_LOAD) break;
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if(ok) return out.slice(0, MAX_ROWS_TO_LOAD);
  }

  throw new Error('All fetch order attempts failed. Check RLS and indexes for pulled_at/id.');
}

async function fetchAllRows(){
  const availableCols = await loadAvailableColumns();

  if(!availableCols.length){
    USED_CORE_SELECT = false;
    DASHBOARD_SELECT_COLS = [];
    return [];
  }

  const available = new Set(availableCols);
  DASHBOARD_SELECT_COLS = DASHBOARD_DESIRED_COLS.filter(c => available.has(c) && !HEAVY_COLS.has(c));

  // Include any safe server.js metadata aliases if your table has them, without forcing them to exist.
  for(const optional of ['mode','center','target_id','endpoint','match_number','tournament','stage','year','week','day']){
    if(available.has(optional) && !DASHBOARD_SELECT_COLS.includes(optional)) DASHBOARD_SELECT_COLS.push(optional);
  }

  if(!DASHBOARD_SELECT_COLS.length){
    USED_CORE_SELECT = false;
    return [];
  }

  USED_CORE_SELECT = true;
  return await fetchRowsWithSelect(DASHBOARD_SELECT_COLS.join(','));
}

function toBool(v){ const s = norm(v).toLowerCase(); return v === true || s === '1' || s === 'true' || s === 'yes' || s === 'y'; }
function matchKeyForRow(r){
  const t = norm(getVal(r, KEYS.tournament)); const y = norm(getVal(r, KEYS.year)); const w = norm(getVal(r, KEYS.week)); const d = norm(getVal(r, KEYS.day)); const m = norm(getVal(r, KEYS.matchNo)); const mid = norm(getVal(r, KEYS.matchId));
  return mid ? `${t}|${mid}` : `${t}|Y${y}|W${w}|D${d}|M${m}`;
}
function currentFilter(){ return { t:el('fTournament')?.value || '__all__', s:el('fStage')?.value || '__all__', mode:el('fMode')?.value || '__all__', source:el('fSource')?.value || '__all__', y:el('fYear')?.value || '__all__', w:el('fWeek')?.value || '__all__', d:el('fDay')?.value || '__all__', m:el('fMatchNo')?.value || '__all__' }; }
function countMatchesIn(rows){ return new Set(rows.map(matchKeyForRow)).size; }
function uniqSorted(values, descNumeric=true){
  const arr = [...new Set(values.map(v => norm(v)).filter(Boolean))];
  arr.sort((a,b)=>{ const na=Number(String(a).replace(/[^\d.-]/g,'')); const nb=Number(String(b).replace(/[^\d.-]/g,'')); if(Number.isFinite(na)&&Number.isFinite(nb)) return descNumeric ? nb-na : na-nb; return String(b).localeCompare(String(a)); });
  return arr;
}
function setSelectOptions(selectEl, values, keepCurrent=true){
  const cur = keepCurrent ? selectEl.value : '__all__';
  selectEl.innerHTML = '<option value="__all__">All</option>' + values.map(v=>`<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
  if(cur && [...selectEl.options].some(o=>o.value===cur)) selectEl.value = cur; else selectEl.value = '__all__';
}
function rowsForCascade(){
  let rows = RAW.slice();
  const t = el('fTournament')?.value || '__all__';
  const stage = el('fStage')?.value || '__all__';
  const mode = el('fMode')?.value || '__all__';
  const source = el('fSource')?.value || '__all__';
  const y = el('fYear')?.value || '__all__';
  const w = el('fWeek')?.value || '__all__';
  const d = el('fDay')?.value || '__all__';

  if(t !== '__all__' && KEYS.tournament) rows = rows.filter(r => norm(getVal(r, KEYS.tournament)) === t);
  if(stage !== '__all__' && KEYS.stage) rows = rows.filter(r => norm(getVal(r, KEYS.stage)) === stage);
  if(mode !== '__all__' && KEYS.mode) rows = rows.filter(r => norm(getVal(r, KEYS.mode)).toUpperCase() === mode.toUpperCase());
  if(source !== '__all__' && KEYS.dataSource) rows = rows.filter(r => norm(getVal(r, KEYS.dataSource)) === source);

  const rBase = rows.slice();
  if(y !== '__all__' && KEYS.year) rows = rows.filter(r => norm(getVal(r, KEYS.year)) === y);
  const rY = rows.slice();
  if(w !== '__all__' && KEYS.week) rows = rows.filter(r => norm(getVal(r, KEYS.week)) === w);
  const rW = rows.slice();
  if(d !== '__all__' && KEYS.day) rows = rows.filter(r => norm(getVal(r, KEYS.day)) === d);
  return { rBase, rY, rW, rD: rows };
}
function refreshCascadeOptions(changed){
  const { rBase, rY, rW, rD } = rowsForCascade();

  if(['tournament','stage','mode','source'].includes(changed)){
    if(changed === 'tournament' && KEYS.stage){
      const t = el('fTournament')?.value || '__all__';
      const stageRows = RAW.filter(r => t === '__all__' || !KEYS.tournament || norm(getVal(r, KEYS.tournament)) === t);
      setSelectOptions(el('fStage'), uniqSorted(stageRows.map(r=>getVal(r,KEYS.stage))), false);
    }
    if(KEYS.year) setSelectOptions(el('fYear'), uniqSorted(rBase.map(r=>getVal(r,KEYS.year))), false);
    if(KEYS.week) setSelectOptions(el('fWeek'), uniqSorted(rY.map(r=>getVal(r,KEYS.week))), false);
    if(KEYS.day) setSelectOptions(el('fDay'), uniqSorted(rW.map(r=>getVal(r,KEYS.day))), false);
    if(KEYS.matchNo) setSelectOptions(el('fMatchNo'), uniqSorted(rD.map(r=>getVal(r,KEYS.matchNo))), false);
    return;
  }
  if(changed === 'year'){
    if(KEYS.week) setSelectOptions(el('fWeek'), uniqSorted(rY.map(r=>getVal(r,KEYS.week))), false);
    if(KEYS.day) setSelectOptions(el('fDay'), uniqSorted(rW.map(r=>getVal(r,KEYS.day))), false);
    if(KEYS.matchNo) setSelectOptions(el('fMatchNo'), uniqSorted(rD.map(r=>getVal(r,KEYS.matchNo))), false);
    return;
  }
  if(changed === 'week'){
    if(KEYS.day) setSelectOptions(el('fDay'), uniqSorted(rW.map(r=>getVal(r,KEYS.day))), false);
    if(KEYS.matchNo) setSelectOptions(el('fMatchNo'), uniqSorted(rD.map(r=>getVal(r,KEYS.matchNo))), false);
    return;
  }
  if(changed === 'day'){
    if(KEYS.matchNo) setSelectOptions(el('fMatchNo'), uniqSorted(rD.map(r=>getVal(r,KEYS.matchNo))), false);
  }
}
function latestKeyFrom(rows){
  let best = null;
  for(const r of rows){
    const y=n(getVal(r,KEYS.year)), w=n(getVal(r,KEYS.week)), d=n(getVal(r,KEYS.day)), m=n(getVal(r,KEYS.matchNo));
    const pulled = Date.parse(norm(r.pulled_at || '')) || 0;
    const key=(y*1e10)+(w*1e8)+(d*1e6)+(m*1e4)+Math.min(9999, Math.floor(pulled/100000000));
    if(!best || key > best.key) best={key,y:norm(getVal(r,KEYS.year)),w:norm(getVal(r,KEYS.week)),d:norm(getVal(r,KEYS.day)),m:norm(getVal(r,KEYS.matchNo))};
  }
  return best;
}
function populateTopDropdowns(){
  if(KEYS.tournament) setSelectOptions(el('fTournament'), uniqSorted(RAW.map(r=>getVal(r,KEYS.tournament))), false);
  if(KEYS.stage) setSelectOptions(el('fStage'), uniqSorted(RAW.map(r=>getVal(r,KEYS.stage))), false);
  if(KEYS.mode) setSelectOptions(el('fMode'), uniqSorted(RAW.map(r=>String(getVal(r,KEYS.mode)).toUpperCase())), false);
  if(KEYS.dataSource) setSelectOptions(el('fSource'), uniqSorted(RAW.map(r=>getVal(r,KEYS.dataSource))), false);
}
function findEwcTournamentOption(){
  const opts = [...el('fTournament').options].map(o => o.value).filter(v => v && v !== '__all__');
  return opts.find(v => /\bEWC\b|Esports World Cup/i.test(v)) || '';
}
function resetToLatest(){
  populateTopDropdowns();

  // Because this is the EWC page, default to the first tournament containing
  // "EWC" or "Esports World Cup" when that data exists. If not, fall back to all data.
  const ewcTournament = findEwcTournamentOption();
  if(ewcTournament && [...el('fTournament').options].some(o=>o.value===ewcTournament)){
    el('fTournament').value = ewcTournament;
  }

  const tRows = (el('fTournament').value !== '__all__' && KEYS.tournament)
    ? RAW.filter(r => norm(getVal(r, KEYS.tournament)) === el('fTournament').value)
    : RAW.slice();

  const latest = latestKeyFrom(tRows);
  refreshCascadeOptions('tournament');
  if(latest?.y && [...el('fYear').options].some(o=>o.value===latest.y)) el('fYear').value = latest.y;
  refreshCascadeOptions('year');
  if(latest?.w && [...el('fWeek').options].some(o=>o.value===latest.w)) el('fWeek').value = latest.w;
  refreshCascadeOptions('week');
  if(latest?.d && [...el('fDay').options].some(o=>o.value===latest.d)) el('fDay').value = latest.d;
  refreshCascadeOptions('day');
  el('fMatchNo').value = '__all__';
  applyFilters();
}
function applyFilters(options = {}){
  const silentRefresh = !!options.silentRefresh;
  const updateOnlyLiveAndSummary = !!options.updateOnlyLiveAndSummary;
  const f = currentFilter();
  FILTERED = RAW.filter(r => {
    if(f.t !== '__all__' && KEYS.tournament && norm(getVal(r,KEYS.tournament)) !== f.t) return false;
    if(f.s !== '__all__' && KEYS.stage && norm(getVal(r,KEYS.stage)) !== f.s) return false;
    if(f.mode !== '__all__' && KEYS.mode && norm(getVal(r,KEYS.mode)).toUpperCase() !== f.mode.toUpperCase()) return false;
    if(f.source !== '__all__' && KEYS.dataSource && norm(getVal(r,KEYS.dataSource)) !== f.source) return false;
    if(f.y !== '__all__' && KEYS.year && norm(getVal(r,KEYS.year)) !== f.y) return false;
    if(f.w !== '__all__' && KEYS.week && norm(getVal(r,KEYS.week)) !== f.w) return false;
    if(f.d !== '__all__' && KEYS.day && norm(getVal(r,KEYS.day)) !== f.d) return false;
    if(f.m !== '__all__' && KEYS.matchNo && norm(getVal(r,KEYS.matchNo)) !== f.m) return false;
    return true;
  });

  const matchCount = countMatchesIn(FILTERED);
  const teamCount = new Set(FILTERED.map(r=>norm(getVal(r,KEYS.team)).toUpperCase()).filter(Boolean)).size;

  // Live refresh mode is intentionally narrow: it must not touch filters,
  // dropdown option lists, team tiles, selected team modals, tabs, or helper cards.
  // Only the Overall — Team Summary and Latest Match Live Feed are allowed to change.
  if(updateOnlyLiveAndSummary){
    if(el('overallHint')) el('overallHint').textContent = `${matchCount} matches`;
    renderOverall({ silentRefresh:true });
    renderLiveFeed({ silentRefresh:true });
    return;
  }

  const scopeText = [
    f.t !== '__all__' ? f.t : 'All tournaments',
    f.s !== '__all__' ? f.s : 'All stages',
    f.mode !== '__all__' ? f.mode : 'All modes',
    f.source !== '__all__' ? f.source : 'All sources',
    f.y !== '__all__' ? `Y${f.y}` : 'All years',
    f.w !== '__all__' ? `W${f.w}` : 'All weeks',
    f.d !== '__all__' ? `D${f.d}` : 'All days',
    f.m !== '__all__' ? `M${f.m}` : 'All matches'
  ].join(' • ');

  if(el('scopeChip')) el('scopeChip').textContent = 'Scope: ' + scopeText;
  if(el('heroScopeMirror')){
    const scopeRows = [
      ['Tournament', f.t !== '__all__' ? f.t : 'All'],
      ['Stage', f.s !== '__all__' ? f.s : 'All'],
      ['Week', f.w !== '__all__' ? f.w : 'All'],
      ['Day', f.d !== '__all__' ? f.d : 'All'],
      ['Match', f.m !== '__all__' ? f.m : 'All']
    ];
    const scopeHtml = `<ul class="scope-list">${scopeRows.map(([k,v]) => `<li><span>${escHtml(k)}</span><b>${escHtml(v)}</b></li>`).join('')}</ul>`;
    setStableHTML(el('heroScopeMirror'), scopeHtml, 'hero-scope', silentRefresh);
  }
  if(el('heroScopeSub')) el('heroScopeSub').textContent = `${matchCount} matches`;
  if(el('filterHint')) el('filterHint').textContent = `Matches: ${matchCount} • Teams: ${teamCount}`;
  if(el('overallHint')) el('overallHint').textContent = `${matchCount} matches`;

  renderOverall({ silentRefresh });
  renderTeamGrid(el('teamSearch')?.value || '', { silentRefresh });
  renderLiveFeed({ silentRefresh });

  const teams = new Set(FILTERED.map(r=>norm(getVal(r,KEYS.team)).toUpperCase()).filter(Boolean));
  if(CURRENT_TEAM){
    if(teams.has(CURRENT_TEAM)){
      if(el('teamModal')?.classList.contains('show')) selectTeam(CURRENT_TEAM, true);
      else highlightActiveTile();
    }else{
      clearTeam();
    }
  }
}


function matchOrderValueForRow(r){
  const y = n(getVal(r, KEYS.year));
  const w = n(getVal(r, KEYS.week));
  const d = n(getVal(r, KEYS.day));
  const m = n(getVal(r, KEYS.matchNo));
  const pulled = Date.parse(norm(r.pulled_at || r.updated_at || r.created_at || '')) || 0;
  return (y * 1e10) + (w * 1e8) + (d * 1e6) + (m * 1e4) + Math.min(9999, Math.floor(pulled / 100000000));
}


const LIVE_FEED_PLAYER_VIEW_KEY = 'ewc_live_feed_player_view_v1';
const LIVE_FEED_PLAYER_VIEWS = ['stats', 'preset', 'elims'];
function normalizeLiveFeedPlayerView(view){
  const raw = norm(view).toLowerCase();
  if(raw === 'preset') return 'preset';
  if(raw === 'elims' || raw === 'elim' || raw === 'eliminations' || raw === 'kills' || raw === 'killfeed') return 'elims';
  return 'stats';
}
function liveFeedViewLabel(view = LIVE_FEED_PLAYER_VIEW){
  const v = normalizeLiveFeedPlayerView(view);
  if(v === 'preset') return 'Preset View';
  if(v === 'elims') return 'Eliminations View';
  return 'Stats View';
}
let LIVE_FEED_PLAYER_VIEW = (() => {
  try{
    return normalizeLiveFeedPlayerView(localStorage.getItem(LIVE_FEED_PLAYER_VIEW_KEY));
  }catch(_e){
    return 'stats';
  }
})();
function setLiveFeedPlayerView(view){
  LIVE_FEED_PLAYER_VIEW = normalizeLiveFeedPlayerView(view);
  try{ localStorage.setItem(LIVE_FEED_PLAYER_VIEW_KEY, LIVE_FEED_PLAYER_VIEW); }catch(_e){}

  // Fast path: update only the live-feed player sections/buttons instead of
  // rebuilding the entire 12-team feed. This keeps the centered popup responsive
  // and prevents icon/image reloads from feeling slow.
  if(!updateLiveFeedViewInPlace()) renderLiveFeed();
  queueSaveViewState?.();
}
function toggleLiveFeedPlayerView(){
  const idx = Math.max(0, LIVE_FEED_PLAYER_VIEWS.indexOf(normalizeLiveFeedPlayerView(LIVE_FEED_PLAYER_VIEW)));
  setLiveFeedPlayerView(LIVE_FEED_PLAYER_VIEWS[(idx + 1) % LIVE_FEED_PLAYER_VIEWS.length]);
}
function liveFeedViewButtonHtml(){
  const button = (view, label) => {
    const active = normalizeLiveFeedPlayerView(LIVE_FEED_PLAYER_VIEW) === view;
    return `<button class="btn secondary live-feed-view-toggle${active ? ' active' : ''}" type="button" data-live-feed-view="${view}" aria-pressed="${active ? 'true' : 'false'}" onclick="setLiveFeedPlayerView('${view}')">${label}</button>`;
  };
  return `<div class="live-feed-view-group" role="group" aria-label="Latest Match Live Feed view">
    ${button('stats', 'Stats')}
    ${button('preset', 'Preset')}
    ${button('elims', 'Elims')}
  </div>`;
}

function liveFeedLatestRows(){
  const rows = FILTERED || [];
  if(!rows.length) return [];
  let bestOrder = -Infinity;
  for(const r of rows){
    const order = matchOrderValueForRow(r);
    if(order > bestOrder) bestOrder = order;
  }
  return rows.filter(r => matchOrderValueForRow(r) === bestOrder);
}
function liveFeedRowEliminated(row, teamCode, killIndex = null){
  const elimName = norm(row?.eliminated_team_name).toUpperCase();
  if(elimName && elimName === norm(teamCode).toUpperCase()) return true;
  if(liveFeedRowEliminatedFromKillInfo(row, killIndex)) return true;
  return toBool(row?.is_eliminated);
}
function liveFeedTeamStatusLabel(team){
  if(team.booyah) return '<span class="live-feed-status booyah">👑 Booyah</span>';
  if(team.eliminated) return '<span class="live-feed-status eliminated">Eliminated</span>';
  return '<span class="live-feed-status alive">Alive</span>';
}

function parseJsonLoose(value){
  if(value == null || value === '') return null;
  if(typeof value === 'object') return value;

  let text = String(value).trim();
  if(!text || text === 'null' || text === 'undefined') return null;

  // Supabase can store player_stats_kill_info as:
  //   [{...}]
  //   "[{\"killer_id\":\"10001122\",...}]"
  //   "\"[{\\\"killer_id\\\":...}]\""
  // Keep parsing while the decoded result is still a string.
  for(let i = 0; i < 6; i++){
    try{
      const parsed = JSON.parse(text);
      if(typeof parsed !== 'string') return parsed;
      text = parsed.trim();
      if(!text || text === 'null' || text === 'undefined') return null;
      continue;
    }catch(_e){}

    // Some cells are copied with outer quotes and backslash-escaped quotes.
    let unescaped = text;
    if(unescaped.length >= 2 && unescaped[0] === '"' && unescaped[unescaped.length - 1] === '"'){
      unescaped = unescaped.slice(1, -1);
    }
    unescaped = unescaped
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .trim();

    if(unescaped && unescaped !== text){
      text = unescaped;
      continue;
    }

    // Last rescue: parse the JSON-looking portion only.
    const firstArray = text.indexOf('[');
    const lastArray = text.lastIndexOf(']');
    const firstObj = text.indexOf('{');
    const lastObj = text.lastIndexOf('}');
    const start = firstArray >= 0 ? firstArray : firstObj;
    const end = lastArray >= 0 ? lastArray : lastObj;
    if(start >= 0 && end > start){
      const sliced = text.slice(start, end + 1);
      try{ return JSON.parse(sliced); }catch(_e){}
    }
    break;
  }

  return null;
}
function primitiveValue(v){
  return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}
function findFirstByPathPatterns(obj, patterns, maxDepth = 3, prefix = ''){
  if(!obj || typeof obj !== 'object' || maxDepth < 0) return '';
  for(const [rawKey, value] of Object.entries(obj)){
    const key = String(rawKey || '').replace(/[\s.-]+/g, '_');
    const path = `${prefix ? prefix + '_' : ''}${key}`.toLowerCase();
    if(primitiveValue(value) && patterns.some(re => re.test(path))) return value;
    if(value && typeof value === 'object'){
      const found = findFirstByPathPatterns(value, patterns, maxDepth - 1, path);
      if(found !== '' && found != null) return found;
    }
  }
  return '';
}
function flattenKillInfoObjects(value, out = [], depth = 0){
  if(value == null || depth > 6) return out;
  const parsed = depth === 0 ? parseJsonLoose(value) : value;
  if(parsed == null) return out;
  if(Array.isArray(parsed)){
    parsed.forEach(item => flattenKillInfoObjects(item, out, depth + 1));
    return out;
  }
  if(typeof parsed === 'object'){
    const keys = Object.keys(parsed).map(k => String(k).toLowerCase()).join('|');
    const looksLikeKillEvent = /(victim|killed|dead|death|target|killer|attacker|be_killed|eliminated|kill_time|death_time|damage_from)/i.test(keys);
    if(looksLikeKillEvent) out.push(parsed);
    // Keep walking because some APIs store events under nested kill_info / list / data arrays.
    for(const value of Object.values(parsed)){
      if(value && typeof value === 'object') flattenKillInfoObjects(value, out, depth + 1);
    }
  }
  return out;
}
function liveFeedTimeValue(raw){
  if(raw == null || raw === '') return 0;
  if(typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = norm(raw);
  if(!text) return 0;
  const numeric = Number(text.replace(/[^\d.-]/g, ''));
  if(Number.isFinite(numeric) && numeric !== 0) return numeric;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : 0;
}
function dedupeLiveFeedKillEvents(events){
  const seen = new Set();
  const out = [];
  (events || []).forEach(ev => {
    const victimKey = normalizeLookupId(ev.victimAccountId) || `${assetLookupKey(ev.victimTeam)}:${assetLookupKey(ev.victimName)}`;
    const killerKey = `${assetLookupKey(ev.killerTeam)}:${assetLookupKey(ev.killerName)}`;
    const timeKey = ev.timeRaw || ev.timeValue || '';
    const key = `${victimKey}|${killerKey}|${timeKey}`;
    if(seen.has(key)) return;
    seen.add(key);
    out.push(ev);
  });
  return out;
}
function buildLiveFeedKillIndex(rows){
  const playerById = new Map();
  const playerByName = new Map();
  const playerRowsByTeam = new Map();

  rows.forEach(r => {
    const team = norm(getVal(r, KEYS.team)).toUpperCase() || 'UNKNOWN';
    const accountId = normalizeLookupId(getVal(r, KEYS.accountId));
    const playerName = norm(getVal(r, KEYS.player)) || norm(getVal(r, KEYS.accountId)) || '—';
    const entry = { row:r, team, accountId, playerName };
    if(accountId) playerById.set(accountId, entry);
    const nameKey = assetLookupKey(playerName);
    if(nameKey) playerByName.set(nameKey, entry);
    if(!playerRowsByTeam.has(team)) playerRowsByTeam.set(team, []);
    playerRowsByTeam.get(team).push(entry);
  });

  const victimIds = new Set();
  const victimNames = new Set();
  const events = [];

  const victimIdPatterns = [
    /^player_killed_id$/i, /^player_killed.*id$/i, /^killed_player.*id$/i, /^victim_id$/i, /^dead_id$/i, /^target_id$/i,
    /(victim|killed|dead|death|target|eliminated|be_killed).*?(account|uid|user|player|role)?.*id/i,
    /(account|uid|user|player|role).*?(victim|killed|dead|death|target|eliminated|be_killed).*id/i,
    /(account|uid|user|player|role).*id.*?(victim|killed|dead|death|target|eliminated|be_killed)/i
  ];
  const victimNamePatterns = [
    /^player_killed_name$/i, /^killed_player_name$/i, /^victim_name$/i,
    /(victim|killed|dead|death|target|eliminated|be_killed).*?(name|nick)/i,
    /(name|nick).*?(victim|killed|dead|death|target|eliminated|be_killed)/i
  ];
  const victimTeamPatterns = [
    /^player_killed_team.*$/i, /^killed_player_team.*$/i, /^victim_team.*$/i,
    /(victim|killed|dead|death|target|eliminated|be_killed).*?team.*?(name|code|id)?$/i,
    /team.*?(name|code|id)?.*?(victim|killed|dead|death|target|eliminated|be_killed)/i
  ];
  const killerIdPatterns = [
    /^killer_id$/i, /^killer.*id$/i, /^attacker_id$/i, /^source_id$/i,
    /(killer|attacker|source|from|damage_from).*?(account|uid|user|player|role)?.*id/i,
    /(account|uid|user|player|role).*?(killer|attacker|source|from|damage_from).*id/i,
    /(account|uid|user|player|role).*id.*?(killer|attacker|source|from|damage_from)/i
  ];
  const killerNamePatterns = [
    /^killer_name$/i, /^attacker_name$/i,
    /(killer|attacker|source|from|damage_from).*?(name|nick)/i,
    /(name|nick).*?(killer|attacker|source|from|damage_from)/i
  ];
  const killerTeamPatterns = [
    /^killer_team.*$/i, /^attacker_team.*$/i,
    /(killer|attacker|source|from|damage_from).*?team.*?(name|code|id)?$/i,
    /team.*?(name|code|id)?.*?(killer|attacker|source|from|damage_from)/i
  ];
  const weaponIdPatterns = [
    /^weapon_used_id$/i, /^weapon_id$/i, /^gun_id$/i, /^item_id$/i,
    /(weapon|gun|item).*?(used)?.*?(id|code)$/i,
    /(weapon|gun|item).*?(id|code).*?(used)?$/i
  ];
  const weaponNamePatterns = [
    /^weapon_used_name$/i, /^weapon_name$/i, /^gun_name$/i, /^item_name$/i,
    /(weapon|gun|item).*?(used)?.*?(name|label|title)$/i,
    /(weapon|gun|item).*?(name|label|title).*?(used)?$/i
  ];
  const timePatterns = [
    /^kill_timestamp$/i, /^kill_time$/i, /^timestamp$/i,
    /(kill|killed|death|dead|eliminated|be_killed|event|battle).*?(time|ts|timestamp|sec|second|frame|order)/i,
    /^(time|ts|timestamp|sec|second|frame|order)$/i
  ];

  rows.forEach(killerRow => {
    const killerFallbackTeam = norm(getVal(killerRow, KEYS.team)).toUpperCase() || 'UNKNOWN';
    const killerFallbackName = norm(getVal(killerRow, KEYS.player)) || norm(getVal(killerRow, KEYS.accountId)) || '—';
    const rawKillInfo = getVal(killerRow, KEYS.killInfo);
    const objects = flattenKillInfoObjects(rawKillInfo);

    objects.forEach((obj, idx) => {
      const victimId = normalizeLookupId(findFirstByPathPatterns(obj, victimIdPatterns));
      const victimNameRaw = norm(findFirstByPathPatterns(obj, victimNamePatterns));
      const victimNameKey = assetLookupKey(victimNameRaw);
      const victimMatch = victimId ? playerById.get(victimId) : (victimNameKey ? playerByName.get(victimNameKey) : null);
      const victimTeamRaw = norm(findFirstByPathPatterns(obj, victimTeamPatterns)).toUpperCase();
      const victimTeam = victimTeamRaw || victimMatch?.team || '';
      const victimName = victimMatch?.playerName || victimNameRaw || (victimId ? victimId : 'Unknown player');
      const victimAccountId = victimMatch?.accountId || victimId || '';

      // Ignore objects that do not identify a real victim from this match.
      if(!victimTeam && !victimMatch && !victimId && !victimNameRaw) return;

      const killerId = normalizeLookupId(findFirstByPathPatterns(obj, killerIdPatterns));
      const killerNameRaw = norm(findFirstByPathPatterns(obj, killerNamePatterns));
      const killerTeamRaw = norm(findFirstByPathPatterns(obj, killerTeamPatterns)).toUpperCase();
      const killerMatch = killerId ? playerById.get(killerId) : (killerNameRaw ? playerByName.get(assetLookupKey(killerNameRaw)) : null);
      const killerTeam = killerTeamRaw || killerMatch?.team || killerFallbackTeam;
      const killerName = killerMatch?.playerName || killerNameRaw || killerFallbackName;
      const weaponId = normalizeLookupId(findFirstByPathPatterns(obj, weaponIdPatterns));
      const weaponName = norm(findFirstByPathPatterns(obj, weaponNamePatterns));
      const timeRaw = findFirstByPathPatterns(obj, timePatterns);
      const timeValue = liveFeedTimeValue(timeRaw) || (events.length + idx + 1);

      if(victimAccountId) victimIds.add(victimAccountId);
      if(victimNameKey) victimNames.add(victimNameKey);
      if(victimName && victimName !== 'Unknown player') victimNames.add(assetLookupKey(victimName));

      events.push({
        victimTeam: victimTeam || 'UNKNOWN',
        victimName,
        victimAccountId,
        killerTeam,
        killerName,
        weaponId,
        weaponName,
        timeValue,
        timeRaw: norm(timeRaw),
        raw: obj
      });
    });
  });

  return { playerById, playerByName, playerRowsByTeam, victimIds, victimNames, events: dedupeLiveFeedKillEvents(events) };
}
function liveFeedRowEliminatedFromKillInfo(row, killIndex){
  if(!killIndex) return false;
  const accountId = normalizeLookupId(getVal(row, KEYS.accountId));
  const playerName = assetLookupKey(getVal(row, KEYS.player));
  return (accountId && killIndex.victimIds.has(accountId)) || (playerName && killIndex.victimNames.has(playerName));
}
function liveFeedTeamEliminationFeed(teams, killIndex){
  const events = [];
  const byVictimTeam = groupBy(killIndex?.events || [], e => norm(e.victimTeam).toUpperCase() || 'UNKNOWN');

  for(const team of teams){
    const teamKey = norm(team.team).toUpperCase();
    const teamEvents = byVictimTeam.get(teamKey) || [];
    const totalPlayers = Math.max(1, team.players?.length || killIndex?.playerRowsByTeam?.get(teamKey)?.length || 4);
    const killedPlayers = new Map();
    teamEvents.forEach(ev => {
      const key = normalizeLookupId(ev.victimAccountId) || assetLookupKey(ev.victimName);
      if(!key) return;
      const prev = killedPlayers.get(key);
      if(!prev || (ev.timeValue || 0) >= (prev.timeValue || 0)) killedPlayers.set(key, ev);
    });
    const outCount = Math.max(team.eliminatedPlayers || 0, killedPlayers.size);
    if(!team.eliminated && outCount < totalPlayers) continue;

    const last = [...killedPlayers.values()].sort((a,b) => (b.timeValue || 0) - (a.timeValue || 0))[0] || teamEvents[teamEvents.length - 1] || null;
    events.push({
      team: team.team,
      outCount,
      totalPlayers,
      lastVictim: last?.victimName || '',
      killerTeam: last?.killerTeam || '',
      killerName: last?.killerName || '',
      timeValue: last?.timeValue || team.position || 0,
      source: last ? 'kill_info' : 'status'
    });
  }

  events.sort((a,b) => (b.timeValue || 0) - (a.timeValue || 0) || a.team.localeCompare(b.team));
  return events;
}
function liveFeedElimFeedSignature(events){
  return 'elim-feed::' + (events || []).map(e => [e.team,e.outCount,e.totalPlayers,e.lastVictim,e.killerTeam,e.killerName,e.timeValue,e.source].join('^')).join('|');
}
function liveFeedElimFeedHtml(events){
  const count = events?.length || 0;
  const body = count
    ? `<div class="live-feed-elim-list">${events.map(e => `
        <article class="live-feed-elim-card" title="${escHtml(e.team)} eliminated${e.lastVictim ? ` • last out: ${e.lastVictim}` : ''}">
          <div class="elim-team"><b>${escHtml(e.team)}</b><span class="elim-badge">Out</span></div>
          <div class="elim-line"><small>Players</small> ${fmtNum(e.outCount)}/${fmtNum(e.totalPlayers)} eliminated</div>
          <div class="elim-line"><small>Last</small> ${escHtml(e.lastVictim || 'Status confirmed')}</div>
          <div class="elim-line"><small>By</small> ${escHtml(e.killerTeam || e.killerName || '—')}</div>
        </article>`).join('')}</div>`
    : `<div class="live-feed-elim-empty">No team eliminations detected yet from player_stats_kill_info.</div>`;
  return `<div class="live-feed-elim-head"><b>Team Elimination Feed</b><span>${fmtNum(count)} Team${count === 1 ? '' : 's'} Out</span></div>${body}`;
}
function buildLiveFeedTeams(rows){
  const killIndex = buildLiveFeedKillIndex(rows);
  const grouped = groupBy(rows, r => norm(getVal(r, KEYS.team)).toUpperCase() || 'UNKNOWN');
  const teams = [];
  for(const [team, list] of grouped.entries()){
    const rankScore = Math.max(...list.map(r => n(getVal(r, KEYS.rankingScore))), 0);
    const killingScore = Math.max(...list.map(r => n(getVal(r, KEYS.killingScore))), 0);
    const playerElims = list.reduce((sum, r) => sum + n(getVal(r, KEYS.kills)), 0);
    const teamElims = killingScore || playerElims;
    const total = rankScore + teamElims;
    const booyah = list.some(r => toBool(getVal(r, KEYS.booyah)));
    const rowStates = list.map(r => liveFeedRowEliminated(r, team, killIndex));
    const alivePlayers = rowStates.filter(v => !v).length;
    const eliminatedPlayers = rowStates.filter(Boolean).length;
    const eliminatedByName = list.some(r => norm(r?.eliminated_team_name).toUpperCase() === team);
    const eliminated = !booyah && (eliminatedByName || (rowStates.length > 0 && rowStates.every(Boolean)));
    const day = norm(getVal(list[0], KEYS.day));
    const matchNo = norm(getVal(list[0], KEYS.matchNo));
    const matchId = norm(getVal(list[0], KEYS.matchId));
    const players = list.map(r => ({
      player: norm(getVal(r, KEYS.player)) || norm(getVal(r, KEYS.accountId)) || '—',
      kills: n(getVal(r, KEYS.kills)),
      damage: n(getVal(r, KEYS.damage)),
      assists: n(getVal(r, KEYS.assists)),
      headshots: n(getVal(r, KEYS.headshots)),
      eliminated: liveFeedRowEliminated(r, team, killIndex),
      activeItem: (() => {
        const activeId = getActiveSkillId(r);
        const activeName = getActiveSkillLabel(r) || (activeId ? skillLabelFromId(activeId) : '');
        return activeName ? { id: activeId, name: activeName } : null;
      })(),
      passiveItems: getPassiveSkillIds(r).map(id => ({ id, name: skillLabelFromId(id) })).filter(x => x.name),
      petItem: (() => {
        const petName = getPetLabel(r);
        const petId = normalizeMatchApiNumericId(getVal(r, KEYS.petId)) || normalizeLookupId(getVal(r, KEYS.petId));
        return petName ? { id: petId, name: petName } : null;
      })(),
      loadoutItem: (() => {
        const loadoutName = getLoadoutLabel(r);
        return loadoutName ? { name: loadoutName } : null;
      })()
    })).sort((a,b) => b.kills - a.kills || b.damage - a.damage || b.assists - a.assists || a.player.localeCompare(b.player));
    const elimEvents = liveFeedTeamKillEvents(team, killIndex);
    teams.push({ team, day, matchNo, matchId, rankScore, teamElims, total, booyah, alivePlayers, eliminatedPlayers, eliminated, players, elimEvents });
  }
  // Live feed order: alive teams first, then total score descending.
  // Booyah teams count as alive because eliminated is false when booyah is true.
  teams.sort((a,b) => {
    const aliveA = a.eliminated ? 0 : 1;
    const aliveB = b.eliminated ? 0 : 1;
    return (aliveB - aliveA) ||
      (b.total - a.total) ||
      (b.booyah - a.booyah) ||
      (b.teamElims - a.teamElims) ||
      (b.rankScore - a.rankScore) ||
      a.team.localeCompare(b.team);
  });
  teams.forEach((t, index) => t.position = index + 1);
  teams.killIndex = killIndex;
  teams.eliminationFeed = liveFeedTeamEliminationFeed(teams, killIndex);
  return teams;
}
function liveFeedPlayerTag(team, name){
  const teamCode = norm(team).toUpperCase();
  const cleanName = norm(name) || 'Unknown';
  if(!teamCode) return cleanName;
  if(cleanName.toUpperCase().startsWith(`${teamCode}.`)) return cleanName;
  // If the API already returns a team-tagged IGN like BRU JOENA, keep it readable with a dot.
  const teamSpacePrefix = `${teamCode} `;
  if(cleanName.toUpperCase().startsWith(teamSpacePrefix)) return `${teamCode}.${cleanName.slice(teamSpacePrefix.length).trim()}`;
  return `${teamCode}.${cleanName}`;
}
function liveFeedKillEventSignature(ev){
  return [ev.killerTeam, ev.killerName, ev.victimTeam, ev.victimName, ev.victimAccountId, ev.weaponId, ev.weaponName, ev.timeValue, ev.timeRaw].join('^');
}
function liveFeedTeamKillEvents(teamCode, killIndex){
  const key = norm(teamCode).toUpperCase();
  const events = (killIndex?.events || []).filter(ev => {
    const killerTeam = norm(ev.killerTeam).toUpperCase();
    const victimTeam = norm(ev.victimTeam).toUpperCase();
    return killerTeam === key || victimTeam === key;
  }).map(ev => ({
    ...ev,
    perspective: norm(ev.killerTeam).toUpperCase() === key ? 'kill' : 'death'
  }));

  events.sort((a,b) => {
    return ((a.timeValue || 0) - (b.timeValue || 0)) || liveFeedKillEventSignature(a).localeCompare(liveFeedKillEventSignature(b));
  });
  return events;
}
function liveFeedKillWeaponLabel(ev){
  const byName = norm(ev?.weaponName);
  const fromMatchApi = mapWeaponFromId(ev?.weaponId || '');
  const label = byName || fromMatchApi || '';
  const found = findClosestWeaponResourceItem(label, ev?.weaponId || '');
  return norm(found?.name) || label || (ev?.weaponId ? `Weapon ${ev.weaponId}` : 'Elimination');
}
function liveFeedKillWeaponHtml(ev){
  const label = liveFeedKillWeaponLabel(ev);
  const shortLabel = label.replace(/^Weapon\s+/i, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  return `<span class="kill-weapon" title="${escHtml(label)}">${visualIconHtml('weapon', label, ev?.weaponId || '')}<span class="kill-weapon-name">${escHtml(shortLabel)}</span></span>`;
}
function liveFeedKillVictimHtml(ev){
  const victim = liveFeedPlayerTag(ev.victimTeam, ev.victimName);
  const logo = teamLogoHtml(ev.victimTeam || '', getTeamProfile(ev.victimTeam || ''), 'team-logo-fallback kill-team-logo');
  return `<div class="kill-victim">${logo}<span class="kill-victim-name">${escHtml(victim)}</span></div>`;
}
function liveFeedKillRowHtml(ev){
  const killer = liveFeedPlayerTag(ev.killerTeam, ev.killerName);
  const cls = ev.perspective === 'kill' ? 'kill' : 'death';
  const victim = liveFeedPlayerTag(ev.victimTeam, ev.victimName);
  const weaponLabel = liveFeedKillWeaponLabel(ev);
  const title = `${killer} eliminated ${victim} with ${weaponLabel}${ev.timeRaw ? ` • ${ev.timeRaw}` : ''}`;
  return `<div class="live-feed-kill-row ${cls}" title="${escHtml(title)}">
    <span class="kill-killer"><span class="kill-killer-name">${escHtml(killer)}</span></span>
    ${liveFeedKillWeaponHtml(ev)}
    ${liveFeedKillVictimHtml(ev)}
  </div>`;
}
function liveFeedTeamElimEventsHtml(team){
  const events = team?.elimEvents || [];
  const rows = events.length
    ? events.map(liveFeedKillRowHtml).join('')
    : `<div class="live-feed-kill-empty">No player eliminations detected yet</div>`;
  return `${liveFeedPlayerHeaderHtml()}<div class="live-feed-kill-rows">${rows}</div>`;
}
function liveFeedTeamRowsHtml(team){
  if(LIVE_FEED_PLAYER_VIEW === 'elims') return liveFeedTeamElimEventsHtml(team);
  return `${liveFeedPlayerHeaderHtml()}${(team.players || []).map(liveFeedPlayerHtml).join('')}`;
}
function normalizeLiveFeedResourceKind(kind){
  const raw = norm(kind).toLowerCase();
  if(raw === 'skill' || raw === 'skills' || raw === 'passive' || raw === 'passives' || raw === 'active') return 'skills';
  if(raw === 'pet' || raw === 'pets') return 'pets';
  if(raw === 'loadout' || raw === 'loadouts') return 'loadouts';
  if(raw === 'weapon' || raw === 'weapons') return 'weapons';
  if(raw === 'map' || raw === 'maps') return 'maps';
  return raw || 'skills';
}
function findResourceItemForLiveFeed(kind, name, id=''){
  const resourceKind = normalizeLiveFeedResourceKind(kind);
  const list = RESOURCE_DATA[resourceKind] || [];
  const key = assetLookupKey(name);
  const firstKey = firstSkillNameTokenKey(name);
  const cleanId = normalizeMatchApiNumericId(id) || normalizeLookupId(id);

  const itemKeys = (item) => resourceKind === 'skills'
    ? skillSearchKeysForItem(item)
    : resourceKind === 'pets'
      ? petSearchKeysForItem(item)
      : uniqueList([item?.name, item?.sub]).map(assetLookupKey).filter(Boolean);

  const found = list.find(item => {
    const keys = itemKeys(item);
    if(key && keys.includes(key)) return true;
    if(firstKey && keys.includes(firstKey)) return true;
    const raw = item?.raw || {};
    const ids = idCandidatesFromRow(raw).map(x => normalizeLookupId(x));
    return cleanId && ids.includes(cleanId);
  }) || list.find(item => {
    const keys = itemKeys(item);
    return key && keys.some(itemKey => itemKey.includes(key) || key.includes(itemKey));
  });

  if(found) return found;
  if(resourceKind === 'weapons'){
    const closest = findClosestWeaponResourceItem(name, id);
    if(closest) return closest;
  }
  return {
    kind: resourceKind,
    name: name || 'Unknown Item',
    sub: resourceKind === 'skills' ? 'Skill' : resourceKind === 'pets' ? 'Pet' : resourceKind === 'loadouts' ? 'Loadout' : resourceKind === 'weapons' ? 'Weapon' : 'Reference',
    img: '',
    desc: 'No description found in the loaded reference JSON for this item.',
    raw: { id }
  };
}
function openLiveFeedPresetDetail(event, kind, encodedName, encodedId=''){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const resourceKind = normalizeLiveFeedResourceKind(kind);
  const name = decodeURIComponent(encodedName || '');
  const id = decodeURIComponent(encodedId || '');
  const item = findResourceItemForLiveFeed(resourceKind, name, id);
  openItemDetailPopup(item, resourceKind, 'live-feed');
}
function wireLiveFeedPresetDetails(){
  if(window.__liveFeedPresetDetailsWired) return;
  window.__liveFeedPresetDetailsWired = true;
  document.addEventListener('click', event => {
    const btn = event.target?.closest?.('[data-live-feed-detail="1"]');
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const resourceKind = normalizeLiveFeedResourceKind(btn.dataset.resourceKind || 'skills');
    const name = btn.dataset.resourceName || '';
    const id = btn.dataset.resourceId || '';
    const item = findResourceItemForLiveFeed(resourceKind, name, id);
    openItemDetailPopup(item, resourceKind, 'live-feed');
  }, true);
}
wireLiveFeedPresetDetails();
function updateLiveFeedViewInPlace(){
  const grid = document.querySelector('#liveFeedBox .live-feed-grid');
  const cache = window.LIVE_FEED_TEAMS_CACHE || [];
  if(!grid || !cache.length) return false;

  document.querySelectorAll('.live-feed-view-toggle').forEach(btn => {
    const view = normalizeLiveFeedPlayerView(btn.dataset.liveFeedView || 'stats');
    const active = view === normalizeLiveFeedPlayerView(LIVE_FEED_PLAYER_VIEW);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  cache.forEach(team => {
    const card = grid.querySelector(`.live-feed-card[data-live-team="${CSS.escape(team.team)}"]`);
    if(!card) return;
    const playersHtml = liveFeedTeamRowsHtml(team);
    card.querySelectorAll(':scope > .live-feed-players').forEach(node => { node.innerHTML = playersHtml; });
    const popupPlayers = card.querySelector('.live-feed-popup-players');
    if(popupPlayers) popupPlayers.innerHTML = playersHtml;
    const popupSub = card.querySelector('.live-feed-popup-title-wrap span');
    if(popupSub){
      const statusText = team.booyah ? '👑 Booyah' : team.eliminated ? 'Eliminated' : 'Alive';
      popupSub.textContent = `${statusText} • ${liveFeedViewLabel()}`;
    }
  });

  updateLiveFeedGlobalModalInPlace();
  return true;
}

function liveFeedPlayerHeaderHtml(){
  if(LIVE_FEED_PLAYER_VIEW === 'elims'){
    return `<div class="live-feed-player-head elims" aria-hidden="true">
      <span>Killer</span>
      <span>Wpn</span>
      <span>Eliminated</span>
    </div>`;
  }
  if(LIVE_FEED_PLAYER_VIEW === 'preset'){
    return `<div class="live-feed-player-head preset" aria-hidden="true">
      <span>Player</span>
      <span>Preset</span>
    </div>`;
  }
  return `<div class="live-feed-player-head" aria-hidden="true">
    <span>Player</span>
    <span>ELM</span>
    <span>DMG</span>
    <span>AST</span>
    <span></span>
  </div>`;
}
function liveFeedResourceKindFromPresetKind(kind){
  if(kind === 'skill' || kind === 'passives') return 'skills';
  if(kind === 'pet') return 'pets';
  if(kind === 'loadout') return 'loadouts';
  return kind || 'skills';
}
function liveFeedPresetBadgeHtml(kind, item, label=''){
  if(!item || !norm(item.name)) return `<span class="live-feed-preset-badge ${kind} empty" title="No ${escHtml(kind)}">—</span>`;
  const name = norm(item.name);
  const resourceKind = liveFeedResourceKindFromPresetKind(kind);
  const displayTitle = resourceKind === 'skills' ? skillTitleForLiveFeed(findResourceItemForLiveFeed(resourceKind, name, item.id || '')) : name;
  return `<button class="live-feed-preset-badge ${kind}" type="button" title="${escHtml(displayTitle || name)}" data-live-feed-detail="1" data-resource-kind="${escHtml(resourceKind)}" data-resource-name="${escHtml(name)}" data-resource-id="${escHtml(item.id || '')}">${visualIconHtml(kind === 'passives' ? 'skill' : kind, name, item.id || '')}</button>`;
}
function liveFeedPassiveBadgeHtml(items){
  const clean = (items || []).filter(item => item && norm(item.name)).slice(0, 3);
  if(!clean.length) return `<span class="live-feed-preset-badge passives empty" title="No passive skills">—</span>`;
  const title = clean.map(x => x.name).join(' • ');

  // Each passive icon is now its own clickable target.
  // Previous version wrapped all 3 icons in one button and passed only the first skill,
  // so clicking the passive group always opened skill #1.
  const icons = clean.map((item, index) => {
    const name = norm(item.name);
    const foundItem = findResourceItemForLiveFeed('skills', name, item.id || '');
    const displayTitle = skillTitleForLiveFeed(foundItem) || name;
    return `<button class="live-feed-passive-icon-btn" type="button" title="${escHtml(displayTitle)}" aria-label="Open passive skill ${index + 1}: ${escHtml(displayTitle)}" data-live-feed-detail="1" data-resource-kind="skills" data-resource-name="${escHtml(name)}" data-resource-id="${escHtml(item.id || '')}">${visualIconHtml('skill', name, item.id || '')}</button>`;
  }).join('');

  return `<span class="live-feed-preset-badge passives live-feed-passive-badge-group" title="${escHtml(title)}">${icons}</span>`;
}
function liveFeedPlayerPresetHtml(player){
  const badges = [
    liveFeedPresetBadgeHtml('skill', player.activeItem),
    liveFeedPassiveBadgeHtml(player.passiveItems),
    liveFeedPresetBadgeHtml('pet', player.petItem),
    liveFeedPresetBadgeHtml('loadout', player.loadoutItem)
  ].join('');

  return `<div class="live-feed-player preset" title="${escHtml(player.player)}">
    <span class="name">${escHtml(player.player)}</span>
    <span class="live-feed-preset-badges">${badges}</span>
  </div>`;
}
function liveFeedPlayerHtml(player){
  if(LIVE_FEED_PLAYER_VIEW === 'preset') return liveFeedPlayerPresetHtml(player);
  return `<div class="live-feed-player" title="${escHtml(player.player)}">
    <span class="name">${escHtml(player.player)}</span>
    <span class="stat">${fmtNum(player.kills)}</span>
    <span class="stat">${fmtNum(player.damage)}</span>
    <span class="stat">${fmtNum(player.assists)}</span>
    <span class="state" title="${player.eliminated ? 'Eliminated' : 'Alive'}">${player.eliminated ? '🔴' : '🟢'}</span>
  </div>`;
}
function liveFeedTeamPopupHtml(team){
  const players = liveFeedTeamRowsHtml(team);
  const statusText = team.booyah ? '👑 Booyah' : team.eliminated ? 'Eliminated' : 'Alive';
  const viewText = liveFeedViewLabel();

  return `<div class="live-feed-team-popup" aria-hidden="true">
    <div class="live-feed-popup-backdrop" onclick="closeLiveFeedTeamPopup(event, this)"></div>
    <section class="live-feed-popup-panel" role="dialog" aria-modal="true" aria-label="${escHtml(team.team)} live feed preview">
      <div class="live-feed-popup-head">
        <div class="live-feed-popup-title-wrap">
          <b>${escHtml(team.team)}</b>
          <span>${statusText} • ${viewText}</span>
        </div>
        <div class="live-feed-popup-actions">
          ${liveFeedViewButtonHtml()}
          <button type="button" class="live-feed-popup-close" onclick="closeLiveFeedTeamPopup(event, this)" aria-label="Close team preview">×</button>
        </div>
      </div>
      <div class="live-feed-popup-stats">
        <div><span>TOT</span><b>${fmtNum(team.total)}</b></div>
        <div><span>PLC</span><b>${fmtNum(team.rankScore)}</b></div>
        <div><span>ELM</span><b>${fmtNum(team.teamElims)}</b></div>
        <div><span>Alive</span><b>${fmtNum(team.alivePlayers)}</b></div>
      </div>
      <div class="live-feed-popup-players">${players}</div>
    </section>
  </div>`;
}

let LIVE_FEED_ACTIVE_TEAM_CODE = '';
function ensureLiveFeedTeamGlobalModal(){
  let modal = document.getElementById('liveFeedTeamGlobalModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'liveFeedTeamGlobalModal';
    modal.className = 'live-feed-global-modal';
    modal.setAttribute('aria-hidden','true');
    document.body.appendChild(modal);
  }
  return modal;
}
function liveFeedTeamPopupPanelHtml(team){
  const players = liveFeedTeamRowsHtml(team);
  const statusText = team.booyah ? '👑 Booyah' : team.eliminated ? 'Eliminated' : 'Alive';
  const viewText = liveFeedViewLabel();

  return `
    <div class="live-feed-popup-backdrop" onclick="closeLiveFeedTeamPopup(event, this)"></div>
    <section class="live-feed-popup-panel" role="dialog" aria-modal="true" aria-label="${escHtml(team.team)} live feed preview">
      <div class="live-feed-popup-head">
        <div class="live-feed-popup-title-wrap">
          <b>${escHtml(team.team)}</b>
          <span>${statusText} • ${viewText}</span>
        </div>
        <div class="live-feed-popup-actions">
          ${liveFeedViewButtonHtml()}
          <button type="button" class="live-feed-popup-close" onclick="closeLiveFeedTeamPopup(event, this)" aria-label="Close team preview">×</button>
        </div>
      </div>
      <div class="live-feed-popup-stats">
        <div><span>TOT</span><b>${fmtNum(team.total)}</b></div>
        <div><span>PLC</span><b>${fmtNum(team.rankScore)}</b></div>
        <div><span>ELM</span><b>${fmtNum(team.teamElims)}</b></div>
        <div><span>Alive</span><b>${fmtNum(team.alivePlayers)}</b></div>
      </div>
      <div class="live-feed-popup-players">${players}</div>
    </section>`;
}
function renderLiveFeedGlobalModal(){
  if(!LIVE_FEED_ACTIVE_TEAM_CODE) return false;
  const team = (window.LIVE_FEED_TEAMS_CACHE || []).find(t => norm(t.team).toUpperCase() === LIVE_FEED_ACTIVE_TEAM_CODE);
  const modal = ensureLiveFeedTeamGlobalModal();
  if(!team){
    closeManagedModal(modal);
    return false;
  }
  const hadModalFocus = modal.contains(document.activeElement);
  modal.innerHTML = liveFeedTeamPopupPanelHtml(team);
  openManagedModal(modal, { initialFocus:'.live-feed-popup-close', refocus:hadModalFocus, announce:`${team.team} live feed preview opened` });
  return true;
}
function updateLiveFeedGlobalModalInPlace(){
  const modal = document.getElementById('liveFeedTeamGlobalModal');
  if(!modal || !modal.classList.contains('show') || !LIVE_FEED_ACTIVE_TEAM_CODE) return false;
  return renderLiveFeedGlobalModal();
}
function toggleLiveFeedTeamPopup(event, button){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const card = button?.closest?.('.live-feed-card');
  const teamCode = norm(card?.dataset?.liveTeam || button?.dataset?.liveTeam || '').toUpperCase();
  if(!teamCode) return;
  LIVE_FEED_ACTIVE_TEAM_CODE = teamCode;
  renderLiveFeedGlobalModal();
}
function closeLiveFeedTeamPopup(event, button){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  LIVE_FEED_ACTIVE_TEAM_CODE = '';
  const modal = document.getElementById('liveFeedTeamGlobalModal');
  if(modal){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = '';
  }
  closeManagedModal(modal);
}
function liveFeedCardHtml(t){
  return `
    <article class="live-feed-card" data-live-team="${escHtml(t.team)}" data-live-card-signature="${escHtml(liveFeedTeamSignature(t))}">
      <div class="live-feed-card-top">
        <button class="live-feed-team live-feed-team-open" type="button" onclick="toggleLiveFeedTeamPopup(event, this)" title="Open larger ${escHtml(t.team)} view"><b>${escHtml(t.team)}</b></button>
        <div class="live-feed-rank">#${fmtNum(t.position)}</div>
      </div>
      <div class="live-feed-score-row">
        <div class="live-feed-score"><span>TOT</span><b>${fmtNum(t.total)}</b></div>
        <div class="live-feed-score"><span>PLC</span><b>${fmtNum(t.rankScore)}</b></div>
        <div class="live-feed-score"><span>ELM</span><b>${fmtNum(t.teamElims)}</b></div>
        <div class="live-feed-score"><span>Alive</span><b>${fmtNum(t.alivePlayers)}</b></div>
      </div>
      <div class="live-feed-status-row">
        ${liveFeedTeamStatusLabel(t)}
        <span class="live-feed-status">${fmtNum(t.eliminatedPlayers)} Player Out</span>
      </div>
      <div class="live-feed-players">${liveFeedTeamRowsHtml(t)}</div>
    </article>
  `;
}
function liveFeedTeamSignature(t){
  return [
    t.team, t.position, t.total, t.rankScore, t.teamElims, t.booyah,
    t.alivePlayers, t.eliminatedPlayers, t.eliminated, LIVE_FEED_PLAYER_VIEW,
    ...(t.players || []).map(p => [
      p.player, p.kills, p.damage, p.assists, p.headshots, p.eliminated,
      p.activeItem?.id || p.activeItem?.name || '',
      (p.passiveItems || []).map(x => x.id || x.name).join(','),
      p.petItem?.id || p.petItem?.name || '',
      p.loadoutItem?.name || ''
    ].join('^')),
    ...((t.elimEvents || []).map(liveFeedKillEventSignature))
  ].join('|');
}
function renderLiveFeed(options = {}){
  const box = el('liveFeedBox');
  if(!box) return;
  const silentRefresh = !!options.silentRefresh;
  const rows = liveFeedLatestRows();

  if(!rows.length){
    setText('liveFeedHint', 'No rows in current scope');
    box.className = 'live-feed-empty';
    setStableHTML(box, 'No latest match rows found for the current filter.', 'live-empty', silentRefresh);
    return;
  }

  const teams = buildLiveFeedTeams(rows);
  window.LIVE_FEED_TEAMS_CACHE = teams;

  const first = rows[0] || {};
  const label = `D${escHtml(norm(getVal(first, KEYS.day)) || '—')} • M${escHtml(norm(getVal(first, KEYS.matchNo)) || '—')}`;
  const aliveTeams = teams.filter(t => !t.eliminated).length;
  const eliminatedTeams = teams.filter(t => t.eliminated).length;
  setText('liveFeedHint', `${label} • ${teams.length} teams`);
  box.className = '';

  const toolbarHtml = `
    <div>
      <div class="live-feed-title">Latest Match Live Feed</div>
    </div>
    <div class="live-feed-status-row">
      ${liveFeedViewButtonHtml()}
      <span class="live-feed-status alive">${fmtNum(aliveTeams)} Alive Teams</span>
      <span class="live-feed-status eliminated">${fmtNum(eliminatedTeams)} Eliminated Teams</span>
    </div>
  `;

  let toolbar = box.querySelector(':scope > .live-feed-toolbar');
  let elimFeed = box.querySelector(':scope > .live-feed-elim-feed');
  let grid = box.querySelector(':scope > .live-feed-grid');

  if(!toolbar || !elimFeed || !grid){
    setStableHTML(box, `<div class="live-feed-toolbar"></div><div class="live-feed-elim-feed"></div><div class="live-feed-grid"></div>`, 'live-feed-shell-v2', silentRefresh);
    toolbar = box.querySelector(':scope > .live-feed-toolbar');
    elimFeed = box.querySelector(':scope > .live-feed-elim-feed');
    grid = box.querySelector(':scope > .live-feed-grid');
  }

  setStableHTML(toolbar, toolbarHtml, `toolbar::${LIVE_FEED_PLAYER_VIEW}::${aliveTeams}::${eliminatedTeams}`, silentRefresh);
  if(elimFeed){
    elimFeed.style.display = 'none';
    setStableHTML(elimFeed, '', 'elim-feed-moved-to-toggle', silentRefresh);
  }

  const existing = new Map([...grid.querySelectorAll('.live-feed-card[data-live-team]')].map(card => [norm(card.dataset.liveTeam).toUpperCase(), card]));
  const nextKeys = new Set();

  teams.forEach((team, index) => {
    const key = norm(team.team).toUpperCase();
    nextKeys.add(key);
    const sig = liveFeedTeamSignature(team);
    const current = existing.get(key);
    const html = liveFeedCardHtml(team).trim();

    if(current && current.dataset.liveCardSignature === sig){
      // Keep existing node to avoid icon/image reload and flicker.
      if(grid.children[index] !== current) grid.insertBefore(current, grid.children[index] || null);
      return;
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    const nextCard = template.content.firstElementChild;

    if(current){
      current.replaceWith(nextCard);
    }else{
      grid.insertBefore(nextCard, grid.children[index] || null);
    }
  });

  [...grid.querySelectorAll('.live-feed-card[data-live-team]')].forEach(card => {
    if(!nextKeys.has(norm(card.dataset.liveTeam).toUpperCase())) card.remove();
  });

  updateLiveFeedGlobalModalInPlace();
}


function teamMatchAgg(rows){
  const m = new Map();
  for(const r of rows){
    const team = norm(getVal(r, KEYS.team)).toUpperCase(); if(!team) continue;
    const mk = matchKeyForRow(r); const key = `${team}||${mk}`;
    const matchOrder = matchOrderValueForRow(r);
    if(!m.has(key)) m.set(key, {
      team, mk, match_order: matchOrder,
      day: norm(getVal(r, KEYS.day)),
      match_no: norm(getVal(r, KEYS.matchNo)),
      match_id: norm(getVal(r, KEYS.matchId)),
      booyah:0, elims:0, damage:0, assists:0, headshots:0,
      ranking_score:0, killing_score:0, kill_count:0
    });
    const o = m.get(key);
    o.match_order = Math.max(o.match_order || 0, matchOrder);
    if(!o.day) o.day = norm(getVal(r, KEYS.day));
    if(!o.match_no) o.match_no = norm(getVal(r, KEYS.matchNo));
    if(!o.match_id) o.match_id = norm(getVal(r, KEYS.matchId));
    if(toBool(getVal(r, KEYS.booyah))) o.booyah = 1;
    if(KEYS.kills) o.elims += n(getVal(r, KEYS.kills));
    if(KEYS.damage) o.damage += n(getVal(r, KEYS.damage));
    if(KEYS.assists) o.assists += n(getVal(r, KEYS.assists));
    if(KEYS.headshots) o.headshots += n(getVal(r, KEYS.headshots));
    const rs = toNum(getVal(r, KEYS.rankingScore)); if(rs != null) o.ranking_score = Math.max(o.ranking_score, rs);
    const ks = toNum(getVal(r, KEYS.killingScore)); if(ks != null) o.killing_score = Math.max(o.killing_score, ks);
    const kc = toNum(getVal(r, KEYS.killCount)); if(kc != null) o.kill_count = Math.max(o.kill_count, kc);
  }
  return [...m.values()];
}

function sortRows(rows, key, dir, isText=false){
  const d = dir === 'asc' ? 1 : -1;
  rows.sort((a,b)=> isText ? d*String(a[key]||'').localeCompare(String(b[key]||'')) : d*((a[key]??0)-(b[key]??0)));
  return rows;
}

function sortOverallRows(rows, sortKey, dir){
  if(sortKey === 'team') return sortRows(rows, 'team', dir, true);

  const direction = dir === 'asc' ? 1 : -1;
  rows.sort((a,b)=>{
    const primary = ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)) * direction;
    if(primary) return primary;

    // Fixed tie breakers requested for standings-style ordering.
    return (b.booyahs - a.booyahs) ||
      (b.elims - a.elims) ||
      (b.final_ranking_score - a.final_ranking_score) ||
      a.team.localeCompare(b.team);
  });
  return rows;
}

function buildOverallRowsFromTeamMatches(teamMatches){
  const g = groupBy(teamMatches, r => r.team);
  const rows = [];

  for(const [team, list] of g.entries()){
    const matches = list.length;
    const booyahs = list.reduce((a,b)=>a+(b.booyah||0),0);
    const elims = list.reduce((a,b)=>a+(b.elims||0),0);
    const damage = list.reduce((a,b)=>a+(b.damage||0),0);
    const ranking_score = list.reduce((a,b)=>a+(b.ranking_score||0),0);
    const finalMatch = list.slice().sort((a,b)=>(b.match_order||0)-(a.match_order||0))[0] || null;
    const final_ranking_score = finalMatch ? n(finalMatch.ranking_score) : 0;
    const total_score = elims + ranking_score;

    rows.push({
      team, matches, booyahs, elims, damage, ranking_score, total_score, final_ranking_score,
      elims_pm:matches?elims/matches:0,
      dmg_pm:matches?damage/matches:0,
      ranking_score_pm:matches?ranking_score/matches:0,
      total_pm:matches?total_score/matches:0,
      display_rank:0,
      rank_delta:0,
      rank_move:'same'
    });
  }

  return rows;
}

function rowsForMovementReference(latestOrder){
  // Movement is now calculated per match, not just inside the already-filtered table rows.
  // This lets Match # filters still compare against the immediately previous match in the
  // same Tournament / Mode / Source / Year / Week / Day scope.
  const f = currentFilter();
  const maxOrder = Number(latestOrder || 0);

  return RAW.filter(r => {
    if(f.t !== '__all__' && KEYS.tournament && norm(getVal(r, KEYS.tournament)) !== f.t) return false;
    if(f.s !== '__all__' && KEYS.stage && norm(getVal(r, KEYS.stage)) !== f.s) return false;
    if(f.mode !== '__all__' && KEYS.mode && norm(getVal(r, KEYS.mode)).toUpperCase() !== f.mode.toUpperCase()) return false;
    if(f.source !== '__all__' && KEYS.dataSource && norm(getVal(r, KEYS.dataSource)) !== f.source) return false;
    if(f.y !== '__all__' && KEYS.year && norm(getVal(r, KEYS.year)) !== f.y) return false;
    if(f.w !== '__all__' && KEYS.week && norm(getVal(r, KEYS.week)) !== f.w) return false;
    if(f.d !== '__all__' && KEYS.day && norm(getVal(r, KEYS.day)) !== f.d) return false;

    // Do not apply Match # here. We need all matches before the selected/latest match
    // so the movement arrow reflects movement from match to match.
    if(maxOrder && matchOrderValueForRow(r) > maxOrder) return false;
    return true;
  });
}

function syncQualificationCutoffOptions(teamCount){
  const select = el('overallQualiCutoff');
  if(!select) return 0;

  const maxTeams = Math.max(0, Math.floor(Number(teamCount) || 0));
  const requested = String(select.value || EWC_PENDING_QUALIFICATION_CUTOFF || '').trim();
  const requestedNumber = Number(requested);
  const selected = Number.isInteger(requestedNumber) && requestedNumber > 0
    ? Math.min(requestedNumber, maxTeams)
    : 0;

  // Rebuild on every Team Summary render. This avoids stale HTML options when
  // filters change and also recovers cleanly from a previously cached script.
  select.innerHTML = '<option value="">Off</option>' + Array.from({length:maxTeams}, (_, index) => {
    const rank = index + 1;
    return `<option value="${rank}">Top ${rank}</option>`;
  }).join('');

  select.value = selected ? String(selected) : '';
  EWC_PENDING_QUALIFICATION_CUTOFF = select.value;
  select.disabled = maxTeams === 0;
  select.title = maxTeams
    ? `Highlight teams below the selected cutoff (1 to ${maxTeams})`
    : 'No teams are available in the current filters';
  return selected;
}

function applyQualificationMetrics(rows, cutoff){
  const standings = rows.slice();
  sortOverallRows(standings, 'total_score', 'desc');
  const cutoffRow = cutoff > 0 ? standings[cutoff - 1] : null;
  const cutoffScore = cutoffRow ? Number(cutoffRow.total_score || 0) : null;

  standings.forEach((row, index) => {
    const above = index > 0 ? standings[index - 1] : null;
    row.standing_rank = index + 1;
    row.one_up = above ? Math.max(0, Number(above.total_score || 0) - Number(row.total_score || 0)) : null;
    row.quali_pts = cutoffRow
      ? (row.standing_rank <= cutoff ? 0 : Math.max(0, cutoffScore - Number(row.total_score || 0) + 1))
      : null;
    row.below_qualification_cutoff = !!cutoffRow && row.standing_rank > cutoff;
    row.at_qualification_cutoff = !!cutoffRow && row.standing_rank === cutoff;
  });

  return { standings, cutoffRow, cutoffScore };
}

function applyQualificationRowStyles(rows, cutoff){
  const table = el('tblOverall')?.querySelector('table');
  if(!table) return;
  const byTeam = new Map(rows.map(row => [norm(row.team).toUpperCase(), row]));

  table.querySelectorAll('tbody tr').forEach(tr => {
    tr.classList.remove('below-quali-cutoff', 'at-quali-cutoff', 'inside-quali-cutoff', 'rank-tier-1', 'rank-tier-2', 'rank-tier-3', 'rank-tier-top', 'rank-tier-field');
    const teamCell = tr.querySelector('td[data-key="team"]');
    const team = norm(teamCell?.querySelector('.team-name-move')?.dataset?.teamCode || teamCell?.textContent).toUpperCase();
    const row = byTeam.get(team);
    if(!row) return;

    const displayRank = Math.max(1, Number(row.display_rank || row.standing_rank || 1));
    tr.dataset.rank = String(displayRank);
    tr.dataset.standingRank = String(row.standing_rank || displayRank);
    if(displayRank === 1) tr.classList.add('rank-tier-1');
    else if(displayRank === 2) tr.classList.add('rank-tier-2');
    else if(displayRank === 3) tr.classList.add('rank-tier-3');
    else if(displayRank <= Math.max(6, cutoff || 0)) tr.classList.add('rank-tier-top');
    else tr.classList.add('rank-tier-field');

    if(!cutoff) return;
    if(row.below_qualification_cutoff) tr.classList.add('below-quali-cutoff');
    else tr.classList.add('inside-quali-cutoff');
    if(row.at_qualification_cutoff) tr.classList.add('at-quali-cutoff');
  });
}

function rankMovementHtml(row){
  const move = row?.rank_move || 'same';
  const delta = Number(row?.rank_delta || 0);
  const ref = row?.rank_ref_label || 'previous match';

  if(move === 'new') return `<span class="rank-move new" title="No ranking available before the ${escHtml(ref)}">NEW</span>`;
  if(move === 'up') return `<span class="rank-move up" title="Moved up ${Math.abs(delta)} rank${Math.abs(delta) === 1 ? '' : 's'} from the ${escHtml(ref)}">▲${Math.abs(delta)}</span>`;
  if(move === 'down') return `<span class="rank-move down" title="Moved down ${Math.abs(delta)} rank${Math.abs(delta) === 1 ? '' : 's'} from the ${escHtml(ref)}">▼${Math.abs(delta)}</span>`;
  return `<span class="rank-move same" title="No movement from the ${escHtml(ref)}">—</span>`;
}

function renderOverall(options = {}){
  const tm = teamMatchAgg(FILTERED);
  const rows = buildOverallRowsFromTeamMatches(tm);
  const qualificationCutoff = syncQualificationCutoffOptions(rows.length);
  const qualificationInfo = applyQualificationMetrics(rows, qualificationCutoff);

  const qualiHelp = el('overallQualiHelp');
  if(qualiHelp){
    if(qualificationCutoff && qualificationInfo.cutoffRow){
      const firstOutside = qualificationInfo.standings[qualificationCutoff] || null;
      const chaseText = firstOutside
        ? ` • ${firstOutside.team} needs +${fmtNum(firstOutside.quali_pts || 0)}`
        : ' • All filtered teams are inside the cutoff';
      qualiHelp.innerHTML = `<span class="quali-status-dot"></span><strong>Top ${qualificationCutoff}</strong> line: ${fmtNum(qualificationInfo.cutoffScore)} pts${escHtml(chaseText)}`;
    }else{
      qualiHelp.innerHTML = '<span class="quali-status-dot off"></span>Select a Top position to activate the qualification line.';
    }
  }

  const sortKey = el('overallSortKey').value || 'total_score';
  const dir = el('overallSortDir').dataset.dir || 'desc';

  sortOverallRows(rows, sortKey, dir);

  // Movement compares the current displayed standings against the standings after
  // the immediately previous match in the same Tournament / Mode / Source / Year / Week / Day scope.
  // Match # is intentionally ignored for the reference set, so selecting Match 5 can compare
  // against Match 4 instead of showing every team as NEW.
  const currentOrders = [...new Set(tm.map(r => Number(r.match_order || 0)).filter(v => Number.isFinite(v) && v > 0))].sort((a,b)=>a-b);
  const latestOrder = currentOrders.length ? currentOrders[currentOrders.length - 1] : 0;
  const movementReferenceRows = rowsForMovementReference(latestOrder);
  const movementTm = teamMatchAgg(movementReferenceRows);
  const referenceOrders = [...new Set(movementTm.map(r => Number(r.match_order || 0)).filter(v => Number.isFinite(v) && v > 0))]
    .filter(v => v < latestOrder)
    .sort((a,b)=>a-b);
  const previousMatchOrder = referenceOrders.length ? referenceOrders[referenceOrders.length - 1] : 0;
  const previousTm = previousMatchOrder ? movementTm.filter(r => Number(r.match_order || 0) <= previousMatchOrder) : [];
  const previousRows = buildOverallRowsFromTeamMatches(previousTm);
  sortOverallRows(previousRows, sortKey, dir);
  const previousRankByTeam = new Map(previousRows.map((r, index) => [r.team, index + 1]));
  const rankRefLabel = previousMatchOrder ? 'previous match' : 'previous match';

  rows.forEach((row, index) => {
    const currentRank = index + 1;
    const previousRank = previousRankByTeam.get(row.team);
    row.display_rank = currentRank;
    row.rank_ref_label = rankRefLabel;

    if(!previousRank){
      row.rank_delta = 0;
      row.rank_move = 'new';
      return;
    }

    const delta = previousRank - currentRank;
    row.rank_delta = delta;
    row.rank_move = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
  });

  const overallHtml = renderSimpleTable(rows, [
    {label:'Rank', key:'display_rank', right:true, html:(r)=>`<span class="premium-rank-badge" aria-label="Rank ${escHtml(r.display_rank)}"><span>${escHtml(r.display_rank)}</span></span>`},
    {
      label:'Team',
      key:'team',
      escape:false,
      html:(r)=>`<div class="team-name-move premium-team-cell" data-team-code="${escHtml(r.team)}">${teamLogoHtml(r.team, getTeamProfile(r.team), 'team-summary-logo')}<span class="team-name-copy"><strong class="team-name-text">${escHtml(r.team)}</strong><small>Team profile</small></span>${rankMovementHtml(r)}</div>`
    },
    {label:'MP', key:'matches', right:true},
    {label:'BYH', key:'booyahs', right:true},
    {label:'ELM', key:'elims', right:true},
    {label:'PLC', key:'ranking_score', right:true},
    {label:'TOT', key:'total_score', right:true, html:(r)=>`<strong class="premium-total-score">${fmtNum(r.total_score)}</strong>`},
    {label:'1UP', key:'one_up', right:true, html:(r)=>r.one_up == null ? '<span class="gap-pill leader">LEAD</span>' : `<span class="gap-pill">${fmtNum(r.one_up)}</span>`},
    {label:'Quali Pts', key:'quali_pts', right:true, html:(r)=>r.quali_pts == null ? '<span class="quali-pill off">—</span>' : (Number(r.quali_pts) === 0 ? '<span class="quali-pill safe"><b>0</b><small>SAFE</small></span>' : `<span class="quali-pill needed"><b>+${fmtNum(r.quali_pts)}</b><small>NEEDED</small></span>`)},
    {label:'DMG', key:'damage', right:true},
    {label:'ELM/M', key:'elims_pm', right:true, format:'1d'},
    {label:'PLC/M', key:'ranking_score_pm', right:true, format:'1d'},
    {label:'TOT/M', key:'total_pm', right:true, format:'1d'},
    {label:'DMG/M', key:'dmg_pm', right:true, format:'0d'}
  ]);
  setStableHTML(el('tblOverall'), overallHtml, `overall::${sortKey}::${dir}::cutoff=${qualificationCutoff}::${rows.map(r => `${r.team}:${r.total_score}:${r.one_up}:${r.quali_pts}:${r.elims}:${r.ranking_score}:${r.damage}:${r.rank_move}:${r.rank_delta}`).join('|')}`, !!arguments[0]?.silentRefresh);

  applyColumnHeatmap('tblOverall', ['matches','booyahs','elims','ranking_score','total_score','damage','elims_pm','ranking_score_pm','total_pm','dmg_pm']);
  applyQualificationRowStyles(rows, qualificationCutoff);

  const currentSortKey = el('overallSortKey').value || 'total_score';
  const currentDir = el('overallSortDir').dataset.dir || 'desc';
  const sortableKeys = new Set([...el('overallSortKey').options].map(o => o.value));

  el('tblOverall')?.querySelectorAll('thead th[data-key]').forEach(th => {
    const key = th.getAttribute('data-key');
    const cleanLabel = th.textContent.trim().replace(/\s*[↓↑]$/, '');

    if(!sortableKeys.has(key)){
      th.style.cursor = 'default';
      th.title = key === 'display_rank'
        ? 'Current display rank'
        : (key === 'one_up' ? 'Total-points gap to the team immediately above in the standings' : 'Additional points needed to move above the selected qualification cutoff');
      return;
    }

    th.style.cursor = 'pointer';
    th.title = `Sort by ${cleanLabel}`;
    if(key === currentSortKey) th.textContent = `${cleanLabel} ${currentDir === 'desc' ? '↓' : '↑'}`;
    th.addEventListener('click', () => {
      if(el('overallSortKey').value === key){
        const next = el('overallSortDir').dataset.dir === 'desc' ? 'asc' : 'desc';
        el('overallSortDir').dataset.dir = next;
        el('overallSortDir').textContent = next === 'desc' ? 'Desc' : 'Asc';
      }else{
        el('overallSortKey').value = key;
        const defaultDir = key === 'team' ? 'asc' : 'desc';
        el('overallSortDir').dataset.dir = defaultDir;
        el('overallSortDir').textContent = defaultDir === 'desc' ? 'Desc' : 'Asc';
      }
      renderOverall();
    });
  });

  el('tblOverall')?.querySelectorAll('tbody tr').forEach(tr => {
    const teamCell = tr.querySelector('td[data-key="team"]');
    const team = norm(teamCell?.querySelector('.team-name-move')?.dataset?.teamCode || teamCell?.textContent).toUpperCase();
    if(team){
      tr.title = `Open ${team} profile`;
      tr.addEventListener('click', () => selectTeam(team));
    }
  });
}

function normalizeSkillId(value){
  // Skills must match match_api.id, which is a plain number such as 7706.
  return normalizeMatchApiNumericId(value);
}
function parseSkillIdsFromValue(raw){
  if(raw == null || raw === '') return [];
  let value = raw;

  if(typeof value === 'string'){
    const s = value.trim();
    if(!s) return [];
    try{
      value = JSON.parse(s);
    }catch(_e){
      return [...new Set((s.match(/\d+(?:\.0+)?/g) || []).map(normalizeSkillId).filter(Boolean))];
    }
  }

  const out = [];
  const push = v => {
    const id = normalizeSkillId(v);
    if(id) out.push(id);
  };
  const walk = v => {
    if(v == null) return;
    if(Array.isArray(v)){ v.forEach(walk); return; }
    if(typeof v === 'object'){
      push(v.id ?? v.skill_id ?? v.skillId ?? v.active_skill_id ?? v.activeSkillId);
      Object.values(v).forEach(walk);
      return;
    }
    push(v);
  };

  walk(value);
  return [...new Set(out)].filter(Boolean);
}
function skillIdFromRow(r, idx){
  const k = KEYS.skillIds[idx];
  if(!k) return '';
  return normalizeSkillId(r?.[k]);
}
function skillIdsFromRow(r){
  const splitIds = (KEYS.skillIds || []).map((_,idx)=>skillIdFromRow(r, idx)).filter(Boolean);
  const rawIds = parseSkillIdsFromValue(KEYS.rawSkillIds ? r?.[KEYS.rawSkillIds] : r?.player_stats_skill_ids);
  return [...new Set([...splitIds, ...rawIds])].filter(Boolean);
}
function parseSkillInfoIds(raw){
  if(raw == null) return [];
  let v = raw;
  if(typeof v === 'string'){
    const s = v.trim();
    if(!s) return [];
    try{ v = JSON.parse(s); }
    catch{ return [...new Set((s.match(/\d+(?:\.0+)?/g)||[]).map(normalizeSkillId).filter(Boolean))]; }
  }
  const out = [];
  const pushId = x => {
    const id = normalizeSkillId(x);
    if(id) out.push(id);
  };
  const walk = x => {
    if(x == null) return;
    if(Array.isArray(x)){ x.forEach(walk); return; }
    if(typeof x === 'object'){
      pushId(x.id ?? x.skill_id ?? x.skillId ?? x.active_skill_id ?? x.activeSkillId);
      Object.values(x).forEach(walk);
      return;
    }
    const ids = String(x).match(/\d+/g) || [];
    ids.forEach(pushId);
  };
  walk(v);
  return [...new Set(out)].filter(Boolean);
}
function getSkillInfoIdsForRow(r){
  const flatId = norm(getVal(r, KEYS.skillInfoId));
  if(flatId) return [normalizeSkillId(flatId)];
  if(KEYS.skillInfo) return parseSkillInfoIds(r?.[KEYS.skillInfo]);
  return [];
}
function skillKindFromName(name){
  const k = skillKey(name);
  if(!k || !CHAR_READY) return '';
  return CHAR_SKILLKEY_TO_KIND.get(k) || fuzzyKindLookup(k) || '';
}

function skillNameFromId(id){
  if(!id) return '';
  return mapSkillFromId(id, '');
}

function kindOfSkillId(id){
  const nm = skillNameFromId(id);
  if(!nm) return '';
  // Exact requested validation path:
  // ff_player_stats_raw skill id -> match_api.id/type=2/name -> character.json skill name -> skill_type.
  return skillKindFromName(nm);
}

function sameSkillName(id, name){
  if(!id || !name) return false;
  const mapped = skillNameFromId(id);
  return !!mapped && skillKey(mapped) === skillKey(name);
}

function skillLabelFromId(id){
  if(!id) return '';
  return mapSkillFromId(id, `ID ${id}`);
}

function getSkillInfoActiveFlag(r){
  const raw = getVal(r, KEYS.skillInfoActive);
  if(raw === null || raw === undefined || String(raw).trim() === '') return null;
  return toBool(raw);
}

function buildSkillCandidatesFromRow(r){
  const ids = [...new Set(skillIdsFromRow(r))].filter(Boolean);
  return ids.map(id => {
    const name = skillNameFromId(id);
    return {
      id,
      name,
      kind: name ? skillKindFromName(name) : ''
    };
  });
}

function classifySkillsFromRow(r){
  const candidates = buildSkillCandidatesFromRow(r);
  const ids = candidates.map(c => c.id);
  const activeNameRaw = norm(getVal(r, KEYS.skillInfoName));
  const activeInfoIds = getSkillInfoIdsForRow(r);
  const flatActiveId = activeInfoIds.find(Boolean) || '';
  const flatFlag = getSkillInfoActiveFlag(r);

  const flatActiveNameFromId = flatActiveId ? skillNameFromId(flatActiveId) : '';
  const flatActiveName = activeNameRaw || flatActiveNameFromId;
  const flatActiveKind = flatActiveName ? skillKindFromName(flatActiveName) : '';
  const flatActiveCandidate = flatActiveId ? candidates.find(c => c.id === flatActiveId) : null;

  let active = '';
  let activeLabel = '';

  // 1) Prefer the API's skill_info active source, but validate its displayed name
  // against character.json. If character.json says that name is passive, do not put
  // it in the active bucket.
  if(flatActiveId || flatActiveName){
    const isValidatedActive = flatActiveKind === 'active' || flatActiveCandidate?.kind === 'active';
    const isValidatedPassive = flatActiveKind === 'passive' || flatActiveCandidate?.kind === 'passive';

    if(isValidatedActive || (flatFlag === true && !isValidatedPassive) || (!CHAR_READY && !isValidatedPassive)){
      active = flatActiveId || candidates.find(c => skillKey(c.name) === skillKey(flatActiveName))?.id || '';
      activeLabel = flatActiveName || (active ? skillLabelFromId(active) : '');
    }
  }

  // 2) If the flat skill_info value is absent or validated as passive, find the active
  // skill by matching each match_api skill name against character.json.
  if(!active){
    const activeCandidate = candidates.find(c => c.kind === 'active');
    if(activeCandidate){
      active = activeCandidate.id;
      activeLabel = activeCandidate.name || skillLabelFromId(activeCandidate.id);
    }
  }

  // 3) Fallback display only: never hide skills just because validation data is incomplete.
  // This fallback is not used to validate passive/active, it just prevents blank tables.
  if(!active && !activeLabel){
    active = flatActiveId || ids[0] || '';
    activeLabel = flatActiveName || (active ? skillLabelFromId(active) : '');
  }

  const activeKey = active ? normalizeSkillId(active) : '';
  const activeLabelKey = skillKey(activeLabel);

  const remaining = candidates.filter(c => {
    if(activeKey && normalizeSkillId(c.id) === activeKey) return false;
    if(activeLabelKey && c.name && skillKey(c.name) === activeLabelKey) return false;
    if(activeNameRaw && c.name && skillKey(c.name) === skillKey(activeNameRaw)) return false;
    return true;
  });

  // Main validation path for passives: match_api.name -> character.json skill_type === passive.
  const validatedPassives = remaining.filter(c => c.kind === 'passive').map(c => c.id);

  // Do not allow character.json-validated active skills into passive.
  const nonActiveRemaining = remaining.filter(c => c.kind !== 'active').map(c => c.id);

  // If character.json validates at least one passive, use validated passives. Otherwise,
  // fall back to the remaining non-active IDs so the table still shows data while the
  // mapping is being cleaned up.
  const passives = validatedPassives.length ? validatedPassives : nonActiveRemaining;

  return { active, activeLabel, passives };
}

function getActiveSkillLabel(r){
  const cls = classifySkillsFromRow(r);
  return cls.activeLabel || (cls.active ? skillLabelFromId(cls.active) : '');
}
function getActiveSkillId(r){ return classifySkillsFromRow(r).active; }
function getPassiveSkillIds(r){ return classifySkillsFromRow(r).passives; }
function updateSkillLookupDiagnostics(){
  const box = el('diagSkillLookup');
  if(!box) return;

  const ids = new Set();
  for(const r of RAW || []){
    skillIdsFromRow(r).forEach(id => ids.add(id));
    getSkillInfoIdsForRow(r).forEach(id => ids.add(id));
  }

  const all = [...ids].filter(Boolean);
  const mapped = all.filter(id => lookupInMap(SKILL_ID_TO_NAME, id) || lookupInMap(ID_TO_NAME, id));
  const missing = all.filter(id => !(lookupInMap(SKILL_ID_TO_NAME, id) || lookupInMap(ID_TO_NAME, id)));

  const missingText = missing.length ? ` • missing: ${missing.slice(0,12).join(', ')}${missing.length > 12 ? '…' : ''}` : '';
  box.textContent = `skill lookup: ${mapped.length}/${all.length} IDs mapped${missingText}`;
}
function getPetLabel(r){
  const name = norm(getVal(r, KEYS.petName));
  if(name) return name;
  const id = normalizeMatchApiNumericId(getVal(r, KEYS.petId)) || normalizeLookupId(getVal(r, KEYS.petId));
  if(!id) return '';
  return PET_ID_TO_NAME.get(id) || mapNameFromId(id, `ID ${id}`);
}
function getLoadoutRaw(r){
  const v = getVal(r, KEYS.loadouts);
  if(v == null || v === '') return '';
  if(typeof v === 'string') return v.trim();
  try{ return JSON.stringify(v); }catch{ return String(v); }
}
function parseLoadoutCodes(raw){
  if(raw == null || raw === '') return [];
  const out = [];
  const push = value => {
    const s = norm(value);
    if(!s) return;
    if(LOADOUT_CODE_MAP.has(s)) out.push(s);
  };

  if(Array.isArray(raw)){
    for(const item of raw){
      if(item && typeof item === 'object') push(item.id ?? item.loadout_id ?? item.loadoutId ?? item.code ?? item.item_id);
      else push(item);
    }
    return [...new Set(out)];
  }

  if(typeof raw === 'object'){
    push(raw.id ?? raw.loadout_id ?? raw.loadoutId ?? raw.code ?? raw.item_id);
    for(const value of Object.values(raw)) parseLoadoutCodes(value).forEach(push);
    return [...new Set(out)];
  }

  const text = String(raw).trim();
  try{
    const parsed = JSON.parse(text);
    const parsedCodes = parseLoadoutCodes(parsed);
    if(parsedCodes.length) return parsedCodes;
  }catch(_e){}

  const matches = text.match(/50000000\d/g) || [];
  matches.forEach(push);
  return [...new Set(out)];
}
function getLoadoutLabel(r){
  const raw = getLoadoutRaw(r);
  if(!raw) return '';
  const codes = parseLoadoutCodes(raw);
  if(codes.length){
    return codes.map(code => LOADOUT_ID_TO_NAME.get(code) || LOADOUT_CODE_MAP.get(code)).filter(Boolean).join(' • ');
  }

  const rawText = norm(raw);
  const rawId = normalizeMatchApiNumericId(rawText) || normalizeLookupId(rawText);
  if(rawId && /^\d+$/.test(rawId)){
    return LOADOUT_ID_TO_NAME.get(rawId) || LOADOUT_CODE_MAP.get(rawId) || mapNameFromId(rawId, 'Unknown Loadout');
  }
  return rawText;
}
function listTopCounts(map, topN){ return [...map.entries()].sort((a,b)=>b[1]-a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0,topN).map(([name,picks])=>({name,picks})); }
function summarizeTeamLoadout(rows){
  const act = new Map(), pas = new Map(), pet = new Map(), lo = new Map();
  for(const r of rows){
    const aid = getActiveSkillId(r); const alabel = getActiveSkillLabel(r) || (aid ? mapSkillFromId(aid, `ID ${aid}`) : ''); if(alabel) act.set(alabel,(act.get(alabel)||0)+1);
    for(const pid of getPassiveSkillIds(r)){ const label = mapSkillFromId(pid, `ID ${pid}`); pas.set(label,(pas.get(label)||0)+1); }
    const pl = getPetLabel(r); if(pl) pet.set(pl,(pet.get(pl)||0)+1);
    const lraw = getLoadoutLabel(r); if(lraw) lo.set(lraw,(lo.get(lraw)||0)+1);
  }
  const topAct = listTopCounts(act,3).map(o=>`${escHtml(o.name)} (${o.picks})`).join(' • ') || '—';
  const topPas = listTopCounts(pas,6).map(o=>`${escHtml(o.name)} (${o.picks})`).join(' • ') || '—';
  const topPet = listTopCounts(pet,3).map(o=>`${escHtml(o.name)} (${o.picks})`).join(' • ') || '—';
  const topLoad = [...lo.entries()].sort((a,b)=>b[1]-a[1])[0]; const topLoadout = topLoad ? `${clip(topLoad[0], 180)} (${topLoad[1]})` : '—';
  return { topAct, topPas, topPet, topLoadout };
}

function getScopedTeamList(){
  return [...new Set(FILTERED.map(r=>norm(getVal(r,KEYS.team)).toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function populateModalTeamSelect(){
  const sel = el('modalTeamSelect');
  if(!sel) return;
  const teams = getScopedTeamList();
  const current = CURRENT_TEAM && teams.includes(CURRENT_TEAM) ? CURRENT_TEAM : '';
  sel.innerHTML = '<option value="">Select team…</option>' + teams.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');
  sel.value = current;
}
function renderTeamGrid(filter='', options = {}){
  const grid = el('teamGrid');
  if(!grid) return;
  const q = filter.trim().toLowerCase();
  const teams = getScopedTeamList().filter(t=>t.toLowerCase().includes(q));
  populateModalTeamSelect();

  const sig = `${q}::${teams.join('|')}`;
  if(options.silentRefresh && grid.dataset.teamGridSignature === sig){
    highlightActiveTile();
    return;
  }

  if(!teams.length){
    setStableHTML(grid, '<div class="muted">No teams found in this scope.</div>', 'team-grid-empty', !!options.silentRefresh);
    grid.dataset.teamGridSignature = sig;
    return;
  }

  const html = teams.map(t=>{
    const profile = getTeamProfile(t);
    return `<button type="button" class="team-tile" data-team="${escHtml(t)}" aria-label="Open ${escHtml(t)} team profile" aria-pressed="${CURRENT_TEAM === t ? 'true' : 'false'}">${teamLogoHtml(t, profile, 'team-tile-logo')}<span class="team-code" title="${escHtml(t)}">${escHtml(t)}</span></button>`;
  }).join('');

  setStableHTML(grid, html, sig, !!options.silentRefresh);
  grid.dataset.teamGridSignature = sig;
  grid.querySelectorAll('.team-tile').forEach(tile => { tile.onclick = () => selectTeam(tile.getAttribute('data-team')); });
  highlightActiveTile();
}


function highlightActiveTile(){ el('teamGrid')?.querySelectorAll('.team-tile').forEach(tile=>{ const active=!!CURRENT_TEAM && CURRENT_TEAM===tile.getAttribute('data-team'); tile.classList.toggle('active',active); tile.setAttribute('aria-pressed',active?'true':'false'); }); }
function clearTeam(){
  CURRENT_TEAM = null;
  LAST_SELECTED_TEAM_ROWS = [];
  LAST_PLAYER_SUMMARY_ROWS = [];
  setText('selectedTeamChip','—');
  setText('selectedTeamChipModal','—');
  if(el('modalTeamSelect')) el('modalTeamSelect').value = '';
  setText('modalTeamMeta','Choose a team to open details.');
  setText('teamTitle','Team Overview');
  if(el('modalTeamLogo')) el('modalTeamLogo').innerHTML = '<span>—</span>';
  setText('playersHint','');
  setText('aiInsightStatus','Rule-based insights loaded.');
  el('teamProfileHero').innerHTML='Select a team.';
  el('teamInsightCards').innerHTML='—';
  el('teamKpis').innerHTML='Select a team.';
  el('teamLoadoutSnap').innerHTML='<span class="muted">—</span>';
  el('teamStory').innerHTML='<span class="muted">—</span>';
  el('teamMatchLog').innerHTML='—';
  el('rosterCards').innerHTML='<div class="muted">Select a team…</div>';
  el('tblPlayers').innerHTML='<div class="muted">Select a team…</div>';
  el('tblActive').innerHTML='—';
  el('tblPassive').innerHTML='—';
  el('tblPet').innerHTML='—';
  if(el('teamHeadToHeadBox')) el('teamHeadToHeadBox').innerHTML = '<div class="muted">Select a comparison team.</div>';
  if(el('playerCompareBox')) el('playerCompareBox').innerHTML = '<div class="muted">Select a comparison team to automatically list both rosters.</div>';
  highlightActiveTile();
  closeTeamModal();
}

async function loadTeamLogosJson(){
  try{
    const res = await fetch(`${TEAM_LOGOS_JSON_URL}?v=${Date.now()}`, { cache:'no-store' });
    if(!res.ok) throw new Error(`team_logos.json fetch failed: ${res.status}`);
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (Array.isArray(data?.teams) ? data.teams : []);
    for(const row of rows){
      if(!row || typeof row !== 'object') continue;
      const code = norm(row.team_code || row.code || row.tag).toUpperCase();
      const name = norm(row.team_name || row.name || code);
      if(!code && !name) continue;
      const profile = {
        team_name: name || code,
        team_code: code || name,
        team_logo_url: row.image_url || row.local_image_path || '',
        logo_url: row.remote_image_url || '',
        team_logo_tag: code || row.tag || '',
        region: row.region || 'TBD Region',
        country: row.country || 'TBD Country',
        group: row.group || 'TBD Group',
        seed: row.seed || 'TBD Seed',
        qualification_path: row.qualification_path || 'Qualification path TBD',
        coach: row.coach || 'TBD Coach',
        team_color: row.team_color || '#ffbd59'
      };
      const keys = uniqueList([code, name, ...(Array.isArray(row.aliases) ? row.aliases : [])]);
      for(const key of keys){
        const normalized = norm(key).toUpperCase();
        if(normalized) SAMPLE_TEAM_PROFILES[normalized] = profile;
      }
    }
  }catch(e){
    console.warn('team_logos.json load failed:', e?.message || e);
  }
}

function getTeamProfile(teamCode){
  const direct = SAMPLE_TEAM_PROFILES[teamCode] || SAMPLE_TEAM_PROFILES[teamCode?.toUpperCase?.()] || SAMPLE_TEAM_PROFILES.DEFAULT || {};
  return {
    team_name: direct.team_name || teamCode,
    region: direct.region || 'TBD Region',
    country: direct.country || 'TBD Country',
    group: direct.group || 'TBD Group',
    seed: direct.seed || direct.team_seed || direct.slot || 'TBD Seed',
    qualification_path: direct.qualification_path || 'Qualification path TBD',
    coach: direct.coach || 'TBD Coach',
    team_logo_url: direct.team_logo_url || '',
    logo_url: direct.logo_url || '',
    team_logo_tag: direct.team_logo_tag || direct.logo_tag || direct.team_tag || direct.tag || '',
    team_code: direct.team_code || direct.code || teamCode,
    team_color: direct.team_color || '#ffbd59'
  };
}
function getPlayerProfile(playerName, index=0){
  const key = norm(playerName).toUpperCase();
  const override = SAMPLE_PLAYER_PROFILE_OVERRIDES[key] || SAMPLE_PLAYER_PROFILE_OVERRIDES.DEFAULT || {};
  return {
    role: override.role || SAMPLE_PLAYER_ROLES[index % SAMPLE_PLAYER_ROLES.length] || 'Flex',
    country: override.country || SAMPLE_PLAYER_COUNTRIES[index % SAMPLE_PLAYER_COUNTRIES.length] || 'TBD',
    status: override.status || 'Starter',
    player_photo_url: override.player_photo_url || ''
  };
}
function initials(text){
  const parts = norm(text).replace(/[^A-Za-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean);
  if(!parts.length) return 'FF';
  if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function teamLogoTagCandidates(teamCode, profile={}){
  const values = [
    profile.team_logo_tag,
    profile.logo_tag,
    profile.team_tag,
    profile.tag,
    profile.team_code,
    teamCode,
    profile.team_name
  ].map(v => norm(v)).filter(Boolean);

  const bases = [];
  const add = v => {
    const x = norm(v).toLowerCase();
    if(x && !bases.includes(x)) bases.push(x);
  };

  values.forEach(value => {
    const lower = value.toLowerCase().trim();
    const slug = slugAssetName(lower);
    const noSpace = lower.replace(/\s+/g,'').replace(/[^a-z0-9_-]/g,'');
    const underscore = lower.replace(/\s+/g,'_').replace(/[^a-z0-9_-]/g,'');
    const firstToken = (lower.match(/[a-z0-9]+/) || [''])[0];

    add(lower);
    add(slug);
    add(noSpace);
    add(underscore);
    add(firstToken);
  });

  return bases;
}
function teamLogoImageCandidates(teamCode, profile={}){
  const out = [];
  const addPath = src => {
    const v = norm(src);
    if(v && !out.includes(v)) out.push(v);
  };

  addPath(profile.team_logo_url);
  addPath(profile.logo_url);

  const exts = ['png','webp','jpg','jpeg','svg'];
  for(const base of teamLogoTagCandidates(teamCode, profile)){
    for(const ext of exts){
      addPath(`assets/logo/${encodeURIComponent(base)}.${ext}`);
    }
  }

  // Final default logo when a team-specific asset is not available.
  addPath('assets/logo/ff.png');
  addPath('assets/logo/ff.svg');

  return out;
}
function tryTeamLogoFallback(img){
  const fallbacks = (img.dataset.fallbacks || '').split('|').filter(Boolean);
  const index = Number(img.dataset.fallbackIndex || 0);
  if(index < fallbacks.length){
    img.dataset.fallbackIndex = String(index + 1);
    img.src = fallbacks[index];
    return;
  }
  const wrap = img.closest('.team-logo-fallback, .team-tile-logo');
  if(wrap) wrap.classList.add('no-img');
  img.remove();
}
function teamLogoHtml(teamCode, profile={}, className='team-logo-fallback'){
  const label = initials(teamCode);
  const candidates = teamLogoImageCandidates(teamCode, profile);
  if(!candidates.length){
    return `<div class="${escHtml(className)} no-img"><span class="team-logo-fallback-text">${escHtml(label)}</span></div>`;
  }
  const [first, ...rest] = candidates;
  return `<div class="${escHtml(className)}"><img class="team-logo-img" src="${escHtml(first)}" data-fallbacks="${escHtml(rest.join('|'))}" data-fallback-index="0" alt="${escHtml(teamCode)} logo" loading="lazy" onerror="tryTeamLogoFallback(this)"><span class="team-logo-fallback-text">${escHtml(label)}</span></div>`;
}
function teamProfileLogoHtml(teamCode, profile){
  return teamLogoHtml(teamCode, profile, 'team-logo-fallback');
}
function playerAvatarHtml(playerName, profile){
  const label = initials(playerName);
  if(profile.player_photo_url){
    return `<div class="player-avatar-fallback"><img class="player-avatar-img" src="${escHtml(profile.player_photo_url)}" alt="${escHtml(playerName)}" onerror="this.remove();this.parentElement.textContent='${escHtml(label)}'"></div>`;
  }
  return `<div class="player-avatar-fallback">${escHtml(label)}</div>`;
}
function getTeamMatchStats(teamRows){
  const matches = teamMatchAgg(teamRows).sort((a,b)=>(a.match_order||0)-(b.match_order||0));
  const count = matches.length;
  const booyahs = matches.reduce((a,b)=>a+(b.booyah||0),0);
  const elims = matches.reduce((a,b)=>a+(b.elims||0),0);
  const damage = matches.reduce((a,b)=>a+(b.damage||0),0);
  const rankPoints = matches.reduce((a,b)=>a+(b.ranking_score||0),0);
  const totalPoints = elims + rankPoints;
  const last3 = matches.slice(-3).map(m => ({
    day: m.day || '—',
    matchNumber: m.match_no || '—',
    elims: m.elims || 0,
    rankPoints: m.ranking_score || 0,
    total: (m.elims||0)+(m.ranking_score||0),
    damage: m.damage || 0,
    booyah: !!m.booyah
  }));
  const best = matches.slice().sort((a,b)=>((b.elims||0)+(b.ranking_score||0))-((a.elims||0)+(a.ranking_score||0)))[0] || null;
  const avgPoints = count ? totalPoints / count : 0;
  const recentAvg = last3.length ? last3.reduce((a,b)=>a+(b.total||0),0)/last3.length : 0;
  return {
    matches, count, booyahs, elims, damage, rankPoints, totalPoints,
    elimsPerMatch: count ? elims / count : 0,
    rankPerMatch: count ? rankPoints / count : 0,
    damagePerMatch: count ? damage / count : 0,
    avgPoints, recentAvg, last3, best
  };
}
function getLoadoutUsageSummary(teamRows){
  const active = new Map(), passive = new Map(), pet = new Map(), loadout = new Map();
  for(const r of teamRows){
    const al = getActiveSkillLabel(r); if(al) active.set(al,(active.get(al)||0)+1);
    for(const pid of getPassiveSkillIds(r)){ const label=mapSkillFromId(pid,`ID ${pid}`); if(label) passive.set(label,(passive.get(label)||0)+1); }
    const pl=getPetLabel(r); if(pl) pet.set(pl,(pet.get(pl)||0)+1);
    const lr=getLoadoutLabel(r); if(lr) loadout.set(lr,(loadout.get(lr)||0)+1);
  }
  return {
    active:listTopCounts(active,3),
    passive:listTopCounts(passive,6),
    pet:listTopCounts(pet,3),
    loadout:listTopCounts(loadout,3)
  };
}
function buildPlayerSummaryRows(teamRows){
  const g = groupBy(teamRows, r => norm(getVal(r, KEYS.player)) || norm(getVal(r, KEYS.accountId)) || '—');
  const out = [];
  let idx = 0;
  for(const [player, list] of g.entries()){
    const matchSet = new Set(list.map(matchKeyForRow));
    const matches = matchSet.size;
    const kills = list.reduce((a,b)=>a+n(getVal(b,KEYS.kills)),0);
    const damage = list.reduce((a,b)=>a+n(getVal(b,KEYS.damage)),0);
    const assists = list.reduce((a,b)=>a+n(getVal(b,KEYS.assists)),0);
    const headshots = list.reduce((a,b)=>a+n(getVal(b,KEYS.headshots)),0);
    const account = norm(getVal(list[0], KEYS.accountId));
    const active = new Map(), passive = new Map(), pet = new Map(), lo = new Map();
    for(const r of list){
      const alabel = getActiveSkillLabel(r); if(alabel) active.set(alabel, (active.get(alabel)||0)+1);
      for(const pid of getPassiveSkillIds(r)){ const label = mapSkillFromId(pid, `ID ${pid}`); if(label) passive.set(label, (passive.get(label)||0)+1); }
      const pl = getPetLabel(r); if(pl) pet.set(pl, (pet.get(pl)||0)+1);
      const lr = getLoadoutLabel(r); if(lr) lo.set(lr, (lo.get(lr)||0)+1);
    }
    const topActive = listTopCounts(active, 1)[0];
    const topPet = listTopCounts(pet, 1)[0];
    const topPassives = listTopCounts(passive, 3);
    const topLoad = [...lo.entries()].sort((a,b)=>b[1]-a[1])[0];
    const topLoadout = topLoad ? { name: topLoad[0], picks: topLoad[1] } : null;
    const profile = getPlayerProfile(player, idx++);
    out.push({
      player, account, matches, kills, assists, headshots,
      elims_pm: matches ? kills/matches : 0,
      damage, dmg_pm: matches ? damage/matches : 0,
      activeItem: topActive || null,
      passiveItems: topPassives,
      petItem: topPet || null,
      loadoutItem: topLoadout,
      role: profile.role,
      country: profile.country,
      status: profile.status,
      player_photo_url: profile.player_photo_url
    });
  }
  out.sort((a,b)=>b.dmg_pm-a.dmg_pm || b.kills-a.kills || a.player.localeCompare(b.player));
  return out;
}
function playerImpactTag(row, teamStats){
  const topDamage = Math.max(...(LAST_PLAYER_SUMMARY_ROWS || []).map(x=>x.damage||0), 0);
  const topElims = Math.max(...(LAST_PLAYER_SUMMARY_ROWS || []).map(x=>x.kills||0), 0);
  if(row.damage && row.damage === topDamage) return 'Damage Leader';
  if(row.kills && row.kills === topElims) return 'Entry Impact';
  if(row.assists >= Math.max(3, row.kills * .6)) return 'Support Value';
  if(row.elims_pm >= (teamStats.elimsPerMatch || 0) / Math.max(1, LAST_PLAYER_SUMMARY_ROWS.length)) return 'Consistent Impact';
  return 'Watch Factor';
}

function renderTeamProgressChart(matches, teamRows=[]){
  const clean = (matches || []).map((m, index) => {
    const elims = n(m.elims);
    const rank = n(m.ranking_score);
    const total = elims + rank;
    const playedLabel = `D${m.day || '—'} M${m.match_no || index + 1}`;
    const shortLabel = `D${m.day || '—'}\nM${m.match_no || index + 1}`;
    const sourceLabel = playedLabel;
    return { ...m, total, elims, rank, label: playedLabel, shortLabel, sourceLabel, detailIndex:index };
  }).filter(item => Number.isFinite(item.total) || Number.isFinite(item.elims));

  window.EWC_MATCH_CHART_DETAILS = clean.map((m, index) => {
    const players = (teamRows || [])
      .filter(r => matchKeyForRow(r) === m.mk)
      .map(r => {
        const activeId = getActiveSkillId(r);
        const activeName = getActiveSkillLabel(r) || (activeId ? skillLabelFromId(activeId) : '');
        const passiveItems = getPassiveSkillIds(r).map(id => ({ id, name: skillLabelFromId(id) })).filter(x => x.name);
        const petName = getPetLabel(r);
        const loadoutName = getLoadoutLabel(r);
        return {
          player: norm(getVal(r, KEYS.player)) || '—',
          elims: n(getVal(r, KEYS.kills)),
          damage: n(getVal(r, KEYS.damage)),
          assists: n(getVal(r, KEYS.assists)),
          headshots: n(getVal(r, KEYS.headshots)),
          activeItem: activeName ? { id: activeId, name: activeName } : null,
          passiveItems,
          petItem: petName ? { name: petName, id: normalizeMatchApiNumericId(getVal(r, KEYS.petId)) || normalizeLookupId(getVal(r, KEYS.petId)) } : null,
          loadoutItem: loadoutName ? { name: loadoutName } : null
        };
      });
    return { ...m, index, players };
  });

  if(!clean.length){
    return `<div class="progress-chart-empty">No per-match data yet</div>`;
  }

  const w = Math.max(760, clean.length * 82);
  const h = 188;
  const padX = 42;
  const padTop = 26;
  const padBottom = 46;
  const innerW = w - (padX * 2);
  const innerH = h - padTop - padBottom;
  const maxValue = Math.max(1, ...clean.map(p => Math.max(n(p.total), n(p.elims))));
  const minValue = 0;
  const span = Math.max(1, maxValue - minValue);
  const denom = Math.max(1, clean.length - 1);

  const makePoints = (seriesKey) => clean.map((p, i) => {
    const value = n(p[seriesKey]);
    const x = clean.length === 1 ? w / 2 : padX + (i / denom) * innerW;
    const y = padTop + (1 - ((value - minValue) / span)) * innerH;
    return { ...p, value, x, y, index:i };
  });

  const totalPoints = makePoints('total');
  const elimPoints = makePoints('elims');

  function smoothPathFor(pts){
    if(!pts.length) return '';
    if(pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for(let i = 0; i < pts.length - 1; i++){
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  const totalLinePath = smoothPathFor(totalPoints);
  const elimLinePath = smoothPathFor(elimPoints);
  const areaPath = `${totalLinePath} L ${totalPoints[totalPoints.length - 1].x.toFixed(2)} ${h - padBottom} L ${totalPoints[0].x.toFixed(2)} ${h - padBottom} Z`;
  const lastTotal = totalPoints[totalPoints.length - 1];
  const lastElim = elimPoints[elimPoints.length - 1];
  const highTotal = clean.reduce((best, p) => p.total > best.total ? p : best, clean[0]);
  const highElims = clean.reduce((best, p) => p.elims > best.elims ? p : best, clean[0]);

  const clickCircle = p => `<circle class="chart-click-target" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="13" fill="transparent" onclick="openChartMatchDetail(${p.index})"><title>${escHtml(p.sourceLabel)} • Total: ${fmtNum(p.total)} • Elims: ${fmtNum(p.elims)} • Rank: ${fmtNum(p.rank)}</title></circle>`;
  const totalPointNodes = totalPoints.map((p, i) => `
    ${clickCircle(p)}
    <circle class="chart-point total ${i === totalPoints.length - 1 ? 'last' : ''}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${i === totalPoints.length - 1 ? 4.8 : 3.2}"></circle>
    <text class="chart-point-value total" x="${p.x.toFixed(2)}" y="${Math.max(12, p.y - 10).toFixed(2)}" text-anchor="middle">${fmtNum(p.total)}</text>
  `).join('');
  const elimPointNodes = elimPoints.map((p, i) => `
    ${clickCircle(p)}
    <circle class="chart-point elims ${i === elimPoints.length - 1 ? 'last' : ''}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${i === elimPoints.length - 1 ? 4.2 : 2.8}"></circle>
    <text class="chart-point-value elims" x="${p.x.toFixed(2)}" y="${Math.min(h - padBottom - 4, p.y + 14).toFixed(2)}" text-anchor="middle">${fmtNum(p.elims)}</text>
  `).join('');
  const crownNodes = totalPoints.filter(p => n(p.rank) === 12).map((p) => {
    const cy = Math.min(h - padBottom - 10, Math.max(padTop + 20, p.y + 34));
    return `<g class="chart-crown-badge" transform="translate(${p.x.toFixed(2)} ${cy.toFixed(2)})" onclick="openChartMatchDetail(${p.index})"><title>${escHtml(p.sourceLabel)} • Perfect placement (12 rank points)</title><circle cx="0" cy="0" r="10"></circle><text class="chart-crown" x="0" y="4" text-anchor="middle">👑</text></g>`;
  }).join('');
  const allLabels = totalPoints.map((p) => {
    const parts = String(p.shortLabel).split('\n');
    return `<text class="chart-label all-match" x="${p.x.toFixed(2)}" y="${h - 20}" text-anchor="middle"><tspan x="${p.x.toFixed(2)}">${escHtml(parts[0])}</tspan><tspan class="chart-day-label" x="${p.x.toFixed(2)}" dy="10">${escHtml(parts[1] || '')}</tspan></text>`;
  }).join('');

  return `
    <div class="chart-legend" aria-hidden="true"><span class="total"><i></i>Total Points</span><span class="elims"><i></i>Eliminations</span><span>Played matches only</span><span>Click any point for details</span></div>
    <div class="team-progress-svg-wrap">
      <svg class="team-progress-svg" style="width:${w}px;min-width:100%;" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Per played match total points and eliminations progress chart">
        <defs>
          <linearGradient id="teamProgressArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5a9dff" stop-opacity=".34"/><stop offset="100%" stop-color="#0d5dff" stop-opacity="0"/></linearGradient>
          <filter id="teamProgressGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="teamElimGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <line class="chart-grid-line" x1="${padX}" y1="${padTop}" x2="${w - padX}" y2="${padTop}"/>
        <line class="chart-grid-line" x1="${padX}" y1="${padTop + innerH/2}" x2="${w - padX}" y2="${padTop + innerH/2}"/>
        <line class="chart-grid-line" x1="${padX}" y1="${h - padBottom}" x2="${w - padX}" y2="${h - padBottom}"/>
        <path class="chart-area" d="${areaPath}"/>
        <path class="chart-line total" d="${totalLinePath}"/>
        <path class="chart-line elims" d="${elimLinePath}"/>
        ${totalPointNodes}
        ${elimPointNodes}
        ${crownNodes}
        ${allLabels}
      </svg>
    </div>
    <div class="progress-mini-stats"><span>Latest: <b>${fmtNum(lastTotal.total)} pts</b> / <b>${fmtNum(lastElim.elims)} elim</b></span><span>Peak: <b>${fmtNum(highTotal.total)} pts</b> / <b>${fmtNum(highElims.elims)} elim</b></span></div>
  `;
}

function renderChartPlayerCard(p){
  const active = p.activeItem ? visualItemHtml('skill', p.activeItem) : '<span class="skill-empty">—</span>';
  const passive = p.passiveItems?.length ? p.passiveItems.map(x => visualItemHtml('skill', x, true)).join('') : '<span class="skill-empty">—</span>';
  const pet = p.petItem ? visualItemHtml('pet', p.petItem) : '<span class="skill-empty">—</span>';
  const loadout = p.loadoutItem ? visualItemHtml('loadout', p.loadoutItem) : '<span class="skill-empty">—</span>';
  return `<div class="match-detail-player-card">
    <h4>${escHtml(p.player)}</h4>
    <div class="match-detail-stats">
      <div class="match-detail-stat"><span>Elims</span><b>${fmtNum(p.elims)}</b></div>
      <div class="match-detail-stat"><span>Damage</span><b>${fmtNum(p.damage)}</b></div>
      <div class="match-detail-stat"><span>AST</span><b>${fmtNum(p.assists)}</b></div>
      <div class="match-detail-stat"><span>HS</span><b>${fmtNum(p.headshots)}</b></div>
    </div>
    <div class="match-detail-loadout">${active}${passive}${pet}${loadout}</div>
  </div>`;
}

function openChartMatchDetail(index){
  const detail = window.EWC_MATCH_CHART_DETAILS?.[index];
  if(!detail) return;
  setText('itemDetailTitle', `${detail.sourceLabel} — Match Detail`);
  setText('itemDetailSub', 'Team chart point breakdown');
  const body = el('itemDetailBody');
  const detailCard = el('itemDetailModal')?.querySelector('.item-detail-card');
  detailCard?.classList.remove('map-view');
  body.innerHTML = `
    <div class="item-detail-extra">
      <div class="item-detail-meta"><span>Day</span><b>${escHtml(detail.day || '—')}</b></div>
      <div class="item-detail-meta"><span>Match</span><b>${escHtml(detail.match_no || '—')}</b></div>
      <div class="item-detail-meta"><span>Total Points</span><b>${fmtNum(detail.total)}</b></div>
      <div class="item-detail-meta"><span>Elims</span><b>${fmtNum(detail.elims)}</b></div>
      <div class="item-detail-meta"><span>Rank</span><b>${fmtNum(detail.rank)}</b></div>
    </div>
    <div class="item-detail-desc-block"><b>PLAYERS</b><div class="match-detail-player-grid">${detail.players?.length ? detail.players.map(renderChartPlayerCard).join('') : '<div class="muted">No player rows for this match.</div>'}</div></div>
  `;
  configureItemDetailBack('team', 'team');
  openManagedModal(el('itemDetailModal'), { initialFocus:'#itemDetailBack:not([hidden]), #itemDetailClose', announce:`${detail.sourceLabel} match detail opened` });
}
function renderTeamProfileHero(teamCode, teamRows){
  const profile = getTeamProfile(teamCode);
  const stats = getTeamMatchStats(teamRows);
  const status = stats.count ? (stats.avgPoints >= 15 ? 'High Output' : stats.avgPoints >= 9 ? 'Contender Pace' : 'Needs Surge') : 'Insufficient Data';
  const best = stats.best ? `D${stats.best.day || '—'} • M${stats.best.match_no || '—'} • ${fmtNum((stats.best.elims||0)+(stats.best.ranking_score||0))} pts` : '—';
  const last3 = stats.last3.length ? stats.last3.map(m => `<span class="form-pill">D${escHtml(m.day)} M${escHtml(m.matchNumber)} <b>${fmtNum(m.total)}</b></span>`).join('') : '<span class="form-pill">No recent matches</span>';
  const progressChart = renderTeamProgressChart(stats.matches, teamRows);
  const statSource = (m) => m ? `D${m.day || '—'} • M${m.match_no || '—'}` : '—';
  const matchTotal = (m) => n(m?.elims) + n(m?.ranking_score);
  const bestTotalMatch = stats.matches.length ? stats.matches.slice().sort((a,b)=>matchTotal(b)-matchTotal(a))[0] : null;
  const bestElimsMatch = stats.matches.length ? stats.matches.slice().sort((a,b)=>n(b.elims)-n(a.elims))[0] : null;
  const bestDamageMatch = stats.matches.length ? stats.matches.slice().sort((a,b)=>n(b.damage)-n(a.damage))[0] : null;
  el('teamProfileHero').innerHTML = `
    <div class="profile-hero-card">
      <div class="profile-id-card">
        <div class="profile-id-top">
          ${teamProfileLogoHtml(teamCode, profile)}
          <div class="profile-name"><h3>${escHtml(teamCode)}</h3><span>${escHtml(profile.team_name)}</span></div>
        </div>
        <div class="profile-meta-grid">
          <div class="profile-meta"><span>Region</span><b>${escHtml(profile.region)}</b></div>
          <div class="profile-meta"><span>Country</span><b>${escHtml(profile.country)}</b></div>
          <div class="profile-meta"><span>Group</span><b>${escHtml(profile.group)}</b></div>
          <div class="profile-meta"><span>Seed</span><b>${escHtml(profile.seed)}</b></div>
          <div class="profile-meta"><span>Coach</span><b>${escHtml(profile.coach)}</b></div>
          <div class="profile-meta"><span>Path</span><b>${escHtml(profile.qualification_path)}</b></div>
        </div>
      </div>
      <div class="profile-score-card">
        <div class="profile-big-stats">
          <div class="big-stat"><span>Total</span><strong>${fmtNum(stats.totalPoints)}</strong></div>
          <div class="big-stat"><span>Rank</span><strong>${fmtNum(stats.rankPoints)}</strong></div>
          <div class="big-stat"><span>Elims</span><strong>${fmtNum(stats.elims)}</strong></div>
          <div class="big-stat"><span>Booyah</span><strong>${fmtNum(stats.booyahs)}</strong></div>
          <div class="big-stat"><span>Pts/m</span><strong>${fmtNum(stats.avgPoints,1)}</strong></div>
          <div class="big-stat"><span>Damage/m</span><strong>${fmtNum(stats.damagePerMatch,0)}</strong></div>
          <div class="big-stat best"><span>Best Total</span><strong>${bestTotalMatch ? fmtNum(matchTotal(bestTotalMatch)) : '—'}</strong><small>${escHtml(statSource(bestTotalMatch))}</small></div>
          <div class="big-stat best"><span>Best Elims</span><strong>${bestElimsMatch ? fmtNum(bestElimsMatch.elims) : '—'}</strong><small>${escHtml(statSource(bestElimsMatch))}</small></div>
          <div class="big-stat best"><span>Best Damage</span><strong>${bestDamageMatch ? fmtNum(bestDamageMatch.damage) : '—'}</strong><small>${escHtml(statSource(bestDamageMatch))}</small></div>
        </div>
      </div>
      <div class="profile-form-card">
        <div class="profile-meta"><span>Status</span><b>${escHtml(status)}</b></div>
        <div class="profile-meta"><span>Best Match</span><b>${escHtml(best)}</b></div>
        <div class="profile-meta"><span>Last 3 Match Form</span><div class="form-pill-row">${last3}</div></div>
      </div>
      <div class="team-progress-card full-width">
        <div class="progress-chart-head"><span>Per Match Progress</span><b>Total Points + Eliminations</b></div>
        ${progressChart}
      </div>
    </div>
  `;
}

function getTeamRowsByCode(teamCode){
  const code = norm(teamCode).toUpperCase();
  if(!code) return [];
  return FILTERED.filter(r => norm(getVal(r, KEYS.team)).toUpperCase() === code);
}
function buildTeamCompareStats(teamCode){
  const rows = getTeamRowsByCode(teamCode);
  const stats = getTeamMatchStats(rows);
  const bestTotalMatch = stats.matches.length ? stats.matches.slice().sort((a,b)=>(n(b.elims)+n(b.ranking_score))-(n(a.elims)+n(a.ranking_score)))[0] : null;
  const bestElimsMatch = stats.matches.length ? stats.matches.slice().sort((a,b)=>n(b.elims)-n(a.elims))[0] : null;
  const bestDamageMatch = stats.matches.length ? stats.matches.slice().sort((a,b)=>n(b.damage)-n(a.damage))[0] : null;
  return {
    team: teamCode,
    total: stats.totalPoints,
    rank: stats.rankPoints,
    elims: stats.elims,
    booyah: stats.booyahs,
    ptsPerMatch: stats.avgPoints,
    damagePerMatch: stats.damagePerMatch,
    bestTotal: bestTotalMatch ? n(bestTotalMatch.elims) + n(bestTotalMatch.ranking_score) : 0,
    bestTotalLabel: bestTotalMatch ? `D${bestTotalMatch.day || '—'} • M${bestTotalMatch.match_no || '—'}` : '—',
    bestElims: bestElimsMatch ? n(bestElimsMatch.elims) : 0,
    bestElimsLabel: bestElimsMatch ? `D${bestElimsMatch.day || '—'} • M${bestElimsMatch.match_no || '—'}` : '—',
    bestDamage: bestDamageMatch ? n(bestDamageMatch.damage) : 0,
    bestDamageLabel: bestDamageMatch ? `D${bestDamageMatch.day || '—'} • M${bestDamageMatch.match_no || '—'}` : '—'
  };
}
function renderH2HCard(stats, selected=false){
  return `
    <div class="h2h-card ${selected ? 'selected' : ''}">
      <div class="h2h-title"><strong>${escHtml(stats.team)}</strong><span>${selected ? 'Selected Team' : 'Comparison Team'}</span></div>
      <div class="h2h-stats">
        <div class="h2h-stat"><span>Total</span><b>${fmtNum(stats.total)}</b></div>
        <div class="h2h-stat"><span>Rank</span><b>${fmtNum(stats.rank)}</b></div>
        <div class="h2h-stat"><span>Elims</span><b>${fmtNum(stats.elims)}</b></div>
        <div class="h2h-stat"><span>Booyah</span><b>${fmtNum(stats.booyah)}</b></div>
        <div class="h2h-stat"><span>Pts/m</span><b>${fmtNum(stats.ptsPerMatch,1)}</b></div>
        <div class="h2h-stat"><span>Damage/m</span><b>${fmtNum(stats.damagePerMatch,0)}</b></div>
        <div class="h2h-stat"><span>Best Total</span><b>${fmtNum(stats.bestTotal)}</b><small>${escHtml(stats.bestTotalLabel)}</small></div>
        <div class="h2h-stat"><span>Best Elims</span><b>${fmtNum(stats.bestElims)}</b><small>${escHtml(stats.bestElimsLabel)}</small></div>
        <div class="h2h-stat"><span>Best Damage</span><b>${fmtNum(stats.bestDamage)}</b><small>${escHtml(stats.bestDamageLabel)}</small></div>
      </div>
    </div>`;
}
function populateTeamCompareSelect(){
  const select = el('teamCompareSelect');
  if(!select) return;
  const current = select.value;
  const teams = getScopedTeamList().filter(t => t !== CURRENT_TEAM);
  select.innerHTML = '<option value="">Select team…</option>' + teams.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');
  if(current && teams.includes(current)) select.value = current;
}
function renderTeamHeadToHead(){
  const box = el('teamHeadToHeadBox');
  if(!box || !CURRENT_TEAM) return;
  populateTeamCompareSelect();
  const compareTeam = norm(el('teamCompareSelect')?.value).toUpperCase();
  if(!compareTeam){
    box.innerHTML = renderH2HCard(buildTeamCompareStats(CURRENT_TEAM), true) + `<div class="h2h-card"><div class="muted">Select another team to compare against ${escHtml(CURRENT_TEAM)}.</div></div>`;
    renderPlayerComparison();
    return;
  }
  box.innerHTML = renderH2HCard(buildTeamCompareStats(CURRENT_TEAM), true) + renderH2HCard(buildTeamCompareStats(compareTeam), false);
  renderPlayerComparison();
}
function togglePlayerCompare(playerName){
  const key = `${CURRENT_TEAM || 'TEAM'}::${norm(playerName).toUpperCase()}`;
  if(PLAYER_COMPARE_SELECTED.has(key)) PLAYER_COMPARE_SELECTED.delete(key);
  else PLAYER_COMPARE_SELECTED.add(key);
  renderRosterCards(LAST_SELECTED_TEAM_ROWS);
  renderPlayerComparison();
}
function isPlayerSelectedForCompare(playerName){
  const key = `${CURRENT_TEAM || 'TEAM'}::${norm(playerName).toUpperCase()}`;
  return PLAYER_COMPARE_SELECTED.has(key);
}
function getPlayerRoleLabel(row) {
  return norm(row?.role) || 'TBD';
}

function getPlayerTeamLabel(row) {
  return norm(row?.compareTeam) || norm(row?.team) || '—';
}

function playerComparePowerScore(row) {
  return (n(row.kills) * 120) +
    (n(row.damage) * 0.08) +
    (n(row.assists) * 55) +
    (n(row.headshots) * 20);
}

function matchupEdge(left, right) {
  if (!left && !right) {
    return { side: 'even', label: 'No Data', diff: '—' };
  }

  if (left && !right) {
    return { side: 'left', label: `${getPlayerTeamLabel(left)} Only`, diff: 'No matching role on right' };
  }

  if (!left && right) {
    return { side: 'right', label: `${getPlayerTeamLabel(right)} Only`, diff: 'No matching role on left' };
  }

  const leftScore = playerComparePowerScore(left);
  const rightScore = playerComparePowerScore(right);
  const scoreDiff = leftScore - rightScore;

  const elimDiff = n(left.kills) - n(right.kills);
  const damageDiff = n(left.damage) - n(right.damage);
  const assistDiff = n(left.assists) - n(right.assists);

  const diffParts = [];
  if (elimDiff) diffParts.push(`${elimDiff > 0 ? '+' : ''}${fmtNum(elimDiff)} Elims`);
  if (damageDiff) diffParts.push(`${damageDiff > 0 ? '+' : ''}${fmtNum(damageDiff)} Dmg`);
  if (assistDiff) diffParts.push(`${assistDiff > 0 ? '+' : ''}${fmtNum(assistDiff)} Ast`);

  if (Math.abs(scoreDiff) < 120) {
    return {
      side: 'even',
      label: 'Even Matchup',
      diff: diffParts.length ? diffParts.join(' • ') : 'Stats are nearly even'
    };
  }

  if (scoreDiff > 0) {
    return {
      side: 'left',
      label: `${getPlayerTeamLabel(left)} Edge`,
      diff: diffParts.join(' • ') || 'Left-side statistical edge'
    };
  }

  return {
    side: 'right',
    label: `${getPlayerTeamLabel(right)} Edge`,
    diff: diffParts.join(' • ') || 'Right-side statistical edge'
  };
}

function compactLoadoutText(row) {
  const active = clip(row?.activeItem?.name || '—', 12);
  const pet = clip(row?.petItem?.name || '—', 12);
  return `${active} • ${pet}`;
}

function matchupStatsHtml(row, side = 'left') {
  const isLeft = side === 'left';

  if (!row) {
    return `
      <div class="player-matchup-stats ${side}">
        <div class="matchup-stat-line matchup-stat-main"><span>Elims</span><b>—</b></div>
        <div class="matchup-stat-line"><span>Elim/m</span><b>—</b></div>
        <div class="matchup-stat-line"><span>Damage</span><b>—</b></div>
        <div class="matchup-stat-line"><span>Dmg/m</span><b>—</b></div>
        <div class="matchup-stat-line"><span>AST</span><b>—</b></div>
        <div class="matchup-stat-line"><span>HS</span><b>—</b></div>
      </div>
    `;
  }

  return `
    <div class="player-matchup-stats ${side}">
      <div class="matchup-stat-line matchup-stat-main">
        <span>Elims</span>
        <b>${fmtNum(row.kills)}</b>
      </div>
      <div class="matchup-stat-line">
        <span>Elim/m</span>
        <b>${fmtNum(row.elims_pm, 1)}</b>
      </div>
      <div class="matchup-stat-line">
        <span>Damage</span>
        <b>${fmtNum(row.damage)}</b>
      </div>
      <div class="matchup-stat-line">
        <span>Dmg/m</span>
        <b>${fmtNum(row.dmg_pm, 0)}</b>
      </div>
      <div class="matchup-stat-line">
        <span>AST</span>
        <b>${fmtNum(row.assists)}</b>
      </div>
      <div class="matchup-stat-line">
        <span>HS</span>
        <b>${fmtNum(row.headshots)}</b>
      </div>
    </div>
  `;
}


function matchupPlayerHtml(row, side = 'left') {
  if (!row) {
    return `
      <div class="player-matchup-player ${side}">
        <div class="player-matchup-team">—</div>
        <div class="player-matchup-name">No Match</div>
        <div class="player-matchup-loadout">—</div>
      </div>
    `;
  }

  const playerName = norm(row.player) || 'Unknown Player';
  const teamLabel = getPlayerTeamLabel(row);
  const loadoutText = compactLoadoutText(row);

  return `
    <div class="player-matchup-player ${side}">
      <div class="player-matchup-team">${escHtml(teamLabel)}</div>
      <div class="player-matchup-name" title="${escHtml(playerName)}">${escHtml(playerName)}</div>
      <div class="player-matchup-loadout" title="${escHtml(loadoutText)}">
        ${escHtml(loadoutText)}
      </div>
    </div>
  `;
}

function buildAutoPlayerComparisonRows() {
  if (!CURRENT_TEAM) return [];

  const compareTeam = norm(el('teamCompareSelect')?.value).toUpperCase();
  if (!compareTeam) return [];

  const leftTeam = CURRENT_TEAM;
  const rightTeam = compareTeam;

  const leftRows = buildPlayerSummaryRows(getTeamRowsByCode(leftTeam)).map(r => ({
    ...r,
    compareTeam: leftTeam
  }));

  const rightRows = buildPlayerSummaryRows(getTeamRowsByCode(rightTeam)).map(r => ({
    ...r,
    compareTeam: rightTeam
  }));

  const groupByRole = (rows) => {
    const map = new Map();

    rows.forEach(row => {
      const role = getPlayerRoleLabel(row);
      if (!map.has(role)) map.set(role, []);
      map.get(role).push(row);
    });

    map.forEach(list => {
      list.sort((a,b) =>
        b.kills - a.kills ||
        b.damage - a.damage ||
        b.assists - a.assists ||
        a.player.localeCompare(b.player)
      );
    });

    return map;
  };

  const leftByRole = groupByRole(leftRows);
  const rightByRole = groupByRole(rightRows);

  const allRoles = [...new Set([...leftByRole.keys(), ...rightByRole.keys()])]
    .sort((a,b) => roleOrderValue(a) - roleOrderValue(b) || a.localeCompare(b));

  const output = [];

  allRoles.forEach(role => {
    const leftList = leftByRole.get(role) || [];
    const rightList = rightByRole.get(role) || [];
    const max = Math.max(leftList.length, rightList.length);

    for (let i = 0; i < max; i++) {
      output.push({
        role,
        left: leftList[i] || null,
        right: rightList[i] || null
      });
    }
  });

  return output;
}

function renderPlayerComparison() {
  const box = el('playerCompareBox');
  if (!box) return;

  const compareTeam = norm(el('teamCompareSelect')?.value).toUpperCase();

  if (!CURRENT_TEAM || !compareTeam) {
    box.innerHTML = '<div class="muted">Select a comparison team to see role-based player matchups.</div>';
    return;
  }

  const rows = buildAutoPlayerComparisonRows();

  if (!rows.length) {
    box.innerHTML = '<div class="muted">No player rows found for this matchup.</div>';
    return;
  }

  box.innerHTML = `
    <div class="player-compare-note">
      Role matchup view: left stats and right stats are mirrored for quick caster comparison.
    </div>

    ${rows.map(row => {
      const edge = matchupEdge(row.left, row.right);
      const unmatched = !row.left || !row.right;

      return `
        <div class="player-matchup-row ${unmatched ? 'unmatched' : ''}">
          ${matchupStatsHtml(row.left, 'left')}
          ${matchupPlayerHtml(row.left, 'left')}

          <div class="player-matchup-center">
            <div class="matchup-role">${escHtml(row.role)}</div>
            <div class="matchup-vs">ROLE MATCHUP</div>
            <div class="matchup-edge ${escHtml(edge.side)}">${escHtml(edge.label)}</div>
            <div class="matchup-diff">${escHtml(edge.diff)}</div>
          </div>

          ${matchupPlayerHtml(row.right, 'right')}
          ${matchupStatsHtml(row.right, 'right')}
        </div>
      `;
    }).join('')}
  `;
}
  
function renderComparisonPanel(){
  renderTeamHeadToHead();
  renderPlayerComparison();
}

function renderRosterCards(teamRows){
  const teamStats = getTeamMatchStats(teamRows);
  const rows = (LAST_PLAYER_SUMMARY_ROWS || []).slice().sort((a,b)=>
    roleOrderValue(a.role)-roleOrderValue(b.role) ||
    b.kills-a.kills ||
    b.damage-a.damage ||
    a.player.localeCompare(b.player)
  );
  if(!rows.length){
    el('rosterCards').innerHTML = '<div class="muted">No player rows for this team.</div>';
    renderPlayerComparison();
    return;
  }
  el('rosterCards').innerHTML = rows.map((r, i) => {
    const profile = getPlayerProfile(r.player, i);
    return `<div class="roster-card">
      <div class="roster-head">
        ${playerAvatarHtml(r.player, profile)}
        <div class="roster-name"><strong>${escHtml(r.player)}</strong><span>${escHtml(r.role || profile.role)} • ${escHtml(profile.country)} • ${escHtml(profile.status)}</span></div>
      </div>
      <div class="roster-stats">
        <div class="roster-stat"><span>Elims</span><b>${fmtNum(r.kills)}</b></div>
        <div class="roster-stat"><span>Dmg/m</span><b>${fmtNum(r.dmg_pm,0)}</b></div>
        <div class="roster-stat"><span>AST</span><b>${fmtNum(r.assists)}</b></div>
        <div class="roster-stat"><span>Elim/m</span><b>${fmtNum(r.elims_pm,1)}</b></div>
        <div class="roster-stat"><span>HS</span><b>${fmtNum(r.headshots)}</b></div>
        <div class="roster-stat"><span>Matches</span><b>${fmtNum(r.matches)}</b></div>
      </div>
      <div class="roster-tag">${escHtml(playerImpactTag(r, teamStats))}</div>
    </div>`;
  }).join('');
  renderPlayerComparison();
}

function ruleBasedInsightData(teamCode, teamRows){
  const stats = getTeamMatchStats(teamRows);
  const players = LAST_PLAYER_SUMMARY_ROWS || [];
  const topPlayer = players.slice().sort((a,b)=>(b.damage-a.damage)||(b.kills-a.kills))[0];
  const elimShare = stats.avgPoints ? stats.elimsPerMatch / Math.max(stats.avgPoints,1) : 0;
  const playstyle = stats.elimsPerMatch >= 7 && stats.rankPerMatch < 7 ? 'Aggressive Fragging Team' : stats.rankPerMatch >= stats.elimsPerMatch ? 'Placement-Control Team' : 'Balanced BR Team';
  const recentDelta = stats.recentAvg - stats.avgPoints;
  const momentum = !stats.count ? 'Insufficient Data' : recentDelta >= 2 ? 'Trending Up' : recentDelta <= -2 ? 'Dropping Form' : 'Stable Form';
  const risk = stats.rankPerMatch < 5 ? 'Low placement stability' : stats.elimsPerMatch < 4 ? 'Low elimination pressure' : 'Conversion under pressure';
  return {
    playstyle:{label:playstyle, summary:`${teamCode} is currently averaging ${fmtNum(stats.elimsPerMatch,1)} elims and ${fmtNum(stats.rankPerMatch,1)} rank points per match.`, evidence:[`${fmtNum(stats.elimsPerMatch,1)} elims/m`, `${fmtNum(stats.rankPerMatch,1)} rank/m`, `${fmtNum(stats.damagePerMatch,0)} damage/m`]},
    momentum:{label:momentum, summary:`Recent form is ${fmtNum(stats.recentAvg,1)} pts/m compared to ${fmtNum(stats.avgPoints,1)} overall pts/m.`, evidence:[`Last 3 avg: ${fmtNum(stats.recentAvg,1)}`, `Overall avg: ${fmtNum(stats.avgPoints,1)}`]},
    winCondition:{label: elimShare > .55 ? 'Convert fights into placement' : 'Increase fight pressure', summary: elimShare > .55 ? 'They are finding eliminations, but need cleaner late-game survival to maximize score.' : 'They need more elimination pressure to support their placement points.', evidence:[`${fmtNum(stats.totalPoints)} total pts`, `${fmtNum(stats.elims)} elims`, `${fmtNum(stats.rankPoints)} rank pts`]},
    riskFactor:{label:risk, summary:'The biggest concern is the part of their scoring profile that can disappear quickly when lobby pressure increases.', evidence:[`${fmtNum(stats.booyahs)} Booyahs`, `${fmtNum(stats.count)} matches`]},
    keyPlayerWatch:{player:topPlayer?.player || 'Insufficient data', label:topPlayer ? playerImpactTag(topPlayer, stats) : 'Insufficient data', summary:topPlayer ? `${topPlayer.player} leads the watch list with ${fmtNum(topPlayer.damage)} damage and ${fmtNum(topPlayer.kills)} elims in this scope.` : 'No player rows are available.', evidence:topPlayer ? [`${fmtNum(topPlayer.damage)} damage`, `${fmtNum(topPlayer.kills)} elims`, `${fmtNum(topPlayer.dmg_pm,0)} damage/m`] : []},
    broadcastNote:`${teamCode} enters this scope with ${fmtNum(stats.totalPoints)} points across ${fmtNum(stats.count)} matches; the story is whether they can keep their scoring split balanced under EWC pressure.`
  };
}
function normalizeEvidence(evidence){
  if(evidence == null) return [];
  if(Array.isArray(evidence)) return evidence.flatMap(item => normalizeEvidence(item)).map(x => String(x).trim()).filter(Boolean);
  if(typeof evidence === 'string'){
    const raw = evidence.trim();
    if(!raw) return [];
    try{ const parsed = JSON.parse(raw); if(Array.isArray(parsed)) return normalizeEvidence(parsed); }catch(_e){}
    return raw.split(/\n|;/g).map(x => x.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
  }
  if(typeof evidence === 'object') return Object.values(evidence).flatMap(value => normalizeEvidence(value)).map(x => String(x).trim()).filter(Boolean);
  return [String(evidence).trim()].filter(Boolean);
}
function insightCardHtml(label, title, desc, evidence=[]){
  const ev = normalizeEvidence(evidence).slice(0, 3);
  return `<div class="insight-card"><span>${escHtml(label)}</span><strong>${escHtml(title || 'Insufficient data')}</strong><p>${escHtml(desc || 'Insufficient data for this card.')}</p>${ev.length ? `<div class="insight-evidence">${ev.map(x => `<b title="${escHtml(x)}">${escHtml(x)}</b>`).join('')}</div>` : ''}</div>`;
}
function renderAiInsightCards(aiData){
  if(!aiData || typeof aiData !== 'object') return false;
  const keyPlayer = aiData.keyPlayerWatch || {};
  const keyPlayerTitle = keyPlayer.player && keyPlayer.label ? `${keyPlayer.player} — ${keyPlayer.label}` : keyPlayer.label || keyPlayer.player || 'Key Player Watch';
  const cards = [
    insightCardHtml('Playstyle Read', aiData.playstyle?.label, aiData.playstyle?.summary, aiData.playstyle?.evidence),
    insightCardHtml('Momentum', aiData.momentum?.label, aiData.momentum?.summary, aiData.momentum?.evidence),
    insightCardHtml('Win Condition', aiData.winCondition?.label, aiData.winCondition?.summary, aiData.winCondition?.evidence),
    insightCardHtml('Risk Factor', aiData.riskFactor?.label, aiData.riskFactor?.summary, aiData.riskFactor?.evidence),
    insightCardHtml('Key Player Watch', keyPlayerTitle, keyPlayer.summary, keyPlayer.evidence),
    insightCardHtml('Broadcast Note', 'Caster Angle', aiData.broadcastNote || 'Insufficient data for a broadcast note.', [])
  ];
  el('teamInsightCards').innerHTML = cards.join('');
  return true;
}
function renderRuleBasedInsights(teamCode, teamRows){
  const data = ruleBasedInsightData(teamCode, teamRows);
  renderAiInsightCards(data);
  setText('aiInsightStatus', 'Rule-based insights loaded.');
}
function getAiCache(){
  try{ return JSON.parse(localStorage.getItem(AI_INSIGHTS_CACHE_KEY) || '{}') || {}; }catch(_e){ return {}; }
}
function setAiCache(key, value){
  try{ const cache = getAiCache(); cache[key] = { value, at: Date.now() }; localStorage.setItem(AI_INSIGHTS_CACHE_KEY, JSON.stringify(cache)); }catch(_e){}
}
function currentAiCacheKey(teamCode){ return `${teamCode}::${scopeLine()}`; }
function buildAiPayload(teamCode, teamRows){
  const stats = getTeamMatchStats(teamRows);
  const loadout = getLoadoutUsageSummary(teamRows);
  return {
    team: teamCode,
    scope: {
      text: scopeLine(),
      tournament: currentFilter().t,
      stage: currentFilter().s,
      mode: currentFilter().mode,
      source: currentFilter().source,
      year: currentFilter().y,
      week: currentFilter().w,
      day: currentFilter().d,
      matchNumber: currentFilter().m
    },
    teamStats: {
      matches: stats.count,
      booyahs: stats.booyahs,
      elims: stats.elims,
      rankPoints: stats.rankPoints,
      totalPoints: stats.totalPoints,
      damage: stats.damage,
      damagePerMatch: Number(stats.damagePerMatch.toFixed(2)),
      elimsPerMatch: Number(stats.elimsPerMatch.toFixed(2)),
      rankPerMatch: Number(stats.rankPerMatch.toFixed(2)),
      pointsPerMatch: Number(stats.avgPoints.toFixed(2)),
      recentPointsPerMatch: Number(stats.recentAvg.toFixed(2))
    },
    players: (LAST_PLAYER_SUMMARY_ROWS || []).slice(0,8).map(p => ({
      player: p.player,
      account: p.account,
      matches: p.matches,
      elims: p.kills,
      damage: p.damage,
      assists: p.assists,
      headshots: p.headshots,
      damagePerMatch: Number((p.dmg_pm || 0).toFixed(2)),
      elimsPerMatch: Number((p.elims_pm || 0).toFixed(2)),
      topActive: p.activeItem?.name || '',
      topPet: p.petItem?.name || '',
      topLoadout: p.loadoutItem?.name || ''
    })),
    lastMatches: stats.last3,
    loadoutUsage: {
      topActive: loadout.active,
      topPassive: loadout.passive,
      topPet: loadout.pet,
      topLoadout: loadout.loadout
    }
  };
}
async function generateAiInsightsForCurrentTeam(){
  if(!CURRENT_TEAM || !LAST_SELECTED_TEAM_ROWS.length) return;
  const btn = el('generateAiInsightsBtn');
  const cacheKey = currentAiCacheKey(CURRENT_TEAM);
  const cached = getAiCache()[cacheKey]?.value;
  if(cached && renderAiInsightCards(cached)){
    setText('aiInsightStatus','Loaded cached AI insights.');
    return;
  }
  try{
    if(btn) btn.disabled = true;
    setText('aiInsightStatus','Generating AI insights…');
    const response = await fetch(TEAM_INSIGHTS_FN_URL, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(buildAiPayload(CURRENT_TEAM, LAST_SELECTED_TEAM_ROWS))
    });
    const text = await response.text();
    let data = {};
    try{ data = JSON.parse(text); }catch(_e){ data = { error:text }; }
    if(!response.ok) throw new Error(data?.details || data?.error || `HTTP ${response.status}`);
    if(!renderAiInsightCards(data)) throw new Error('AI returned an invalid insight payload.');
    setAiCache(cacheKey, data);
    setText('aiInsightStatus','AI insights generated.');
  }catch(e){
    console.error(e);
    setText('aiInsightStatus', `AI failed: ${e?.message || e}`);
    renderRuleBasedInsights(CURRENT_TEAM, LAST_SELECTED_TEAM_ROWS);
  }finally{
    if(btn) btn.disabled = false;
  }
}
function renderTeamKpis(teamRows){
  const tm = teamMatchAgg(teamRows);
  const matches=tm.length;
  const booyahs=tm.reduce((a,b)=>a+(b.booyah||0),0);
  const elims=tm.reduce((a,b)=>a+(b.elims||0),0);
  const damage=tm.reduce((a,b)=>a+(b.damage||0),0);
  const ranking=tm.reduce((a,b)=>a+(b.ranking_score||0),0);
  const totalScore = elims + ranking;

  el('teamKpis').innerHTML = matches ? `<div class="kpis"><div class="kpi">Matches <strong>${matches}</strong></div><div class="kpi">Total Score <strong>${totalScore}</strong></div><div class="kpi">Booyahs <strong>${booyahs}</strong> <span class="muted">(${fmtPct(matches?booyahs/matches:0)})</span></div><div class="kpi">Elims <strong>${elims}</strong> <span class="muted">(${(elims/matches).toFixed(1)}/m)</span></div><div class="kpi">Rank Score <strong>${ranking}</strong> <span class="muted">(${(ranking/matches).toFixed(1)}/m)</span></div><div class="kpi">Damage <strong>${damage}</strong> <span class="muted">(${(damage/matches).toFixed(0)}/m)</span></div></div>` : '<div class="muted">No team rows in this scope.</div>';
  const usageSnap = getLoadoutUsageSummary(teamRows);
  const snapItem = (kind, item, compact=false) => item ? visualItemHtml(kind, item, compact) : '<span class="skill-empty">—</span>';
  const snapItems = (kind, items, compact=false, limit=3) => (items && items.length)
    ? items.slice(0, limit).map(item => snapItem(kind, item, compact)).join('')
    : '<span class="skill-empty">—</span>';
  el('teamLoadoutSnap').innerHTML = `
    <div class="snap-visual-grid">
      <div class="snap-visual-card"><span>Top Active</span><div class="snap-visual-items">${snapItems('skill', usageSnap.active, false, 1)}</div></div>
      <div class="snap-visual-card"><span>Top Pet</span><div class="snap-visual-items">${snapItems('pet', usageSnap.pet, false, 1)}</div></div>
      <div class="snap-visual-card passive"><span>Top Passive</span><div class="snap-visual-items">${snapItems('skill', usageSnap.passive, true, 1)}</div></div>
      <div class="snap-visual-card"><span>Top Loadout</span><div class="snap-visual-items">${snapItems('loadout', usageSnap.loadout, false, 1)}</div></div>
    </div>`;
}
function renderPlayersTable(teamRows){
  const out = buildPlayerSummaryRows(teamRows);
  LAST_PLAYER_SUMMARY_ROWS = out;

  const tableRows = out.map((r,i)=>({
    ...r,
    rank:i+1,
    active: r.activeItem ? `<div class="player-visual-cell">${visualItemHtml('skill', r.activeItem)}</div>` : '—',
    passive: r.passiveItems?.length ? `<div class="player-visual-cell multi">${r.passiveItems.map(p => visualItemHtml('skill', p, true)).join('')}</div>` : '—',
    pet: r.petItem ? `<div class="player-visual-cell">${visualItemHtml('pet', r.petItem)}</div>` : '—',
    loadout: r.loadoutItem ? `<div class="player-visual-cell">${visualItemHtml('loadout', r.loadoutItem)}</div>` : '—'
  }));

  el('tblPlayers').innerHTML = renderSimpleTable(tableRows, [
    {label:'#',key:'rank',right:true},
    {label:'Player',key:'player'},
    {label:'Matches',key:'matches',right:true},
    {label:'ELM',key:'kills',right:true},
    {label:'ELM/M',key:'elims_pm',right:true,format:'1d'},
    {label:'DMG',key:'damage',right:true},
    {label:'DMG/M',key:'dmg_pm',right:true,format:'0d'},
    {label:'AST',key:'assists',right:true},
    {label:'Headshots',key:'headshots',right:true},
    {label:'Top Active',key:'active',escape:false},
    {label:'Top Passives',key:'passive',escape:false},
    {label:'Top Pet',key:'pet',escape:false},
    {label:'Loadout',key:'loadout',escape:false}
  ]);

  applyColumnHeatmap('tblPlayers', ['dmg_pm','elims_pm','damage','kills','assists','headshots']);
}

function renderTeamUsageTables(teamRows){
  const act=new Map(), pas=new Map(), pet=new Map();
  for(const r of teamRows){ const alabel = getActiveSkillLabel(r); if(alabel) act.set(alabel,(act.get(alabel)||0)+1); for(const pid of getPassiveSkillIds(r)){ const label=mapSkillFromId(pid,`ID ${pid}`); pas.set(label,(pas.get(label)||0)+1); } const pl=getPetLabel(r); if(pl) pet.set(pl,(pet.get(pl)||0)+1); }
  el('tblActive').innerHTML = renderSimpleTable(listTopCounts(act,20).map((o,i)=>({rank:i+1,skill:o.name,picks:o.picks})), [{label:'#',key:'rank',right:true},{label:'Active Skill',key:'skill'},{label:'Picks',key:'picks',right:true}]); applyColumnHeatmap('tblActive',['picks']);
  el('tblPassive').innerHTML = renderSimpleTable(listTopCounts(pas,20).map((o,i)=>({rank:i+1,skill:o.name,picks:o.picks})), [{label:'#',key:'rank',right:true},{label:'Passive Skill',key:'skill'},{label:'Picks',key:'picks',right:true}]); applyColumnHeatmap('tblPassive',['picks']);
  el('tblPet').innerHTML = renderSimpleTable(listTopCounts(pet,20).map((o,i)=>({rank:i+1,pet:o.name,picks:o.picks})), [{label:'#',key:'rank',right:true},{label:'Pet',key:'pet'},{label:'Picks',key:'picks',right:true}]); applyColumnHeatmap('tblPet',['picks']);
}

function isTeamModalOpen(){ return el('teamModal')?.classList.contains('show'); }
function openTeamModal(){
  const modal = el('teamModal');
  if(!modal) return;
  setTeamTab('overview');
  openManagedModal(modal, { initialFocus:'#teamModalClose', announce:`${CURRENT_TEAM || 'Team'} profile opened` });
}
function closeTeamModal(){
  const modal = el('teamModal');
  if(!modal) return;
  closeManagedModal(modal);
}
function setTeamTab(tab){
  document.querySelectorAll('.team-tab').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.setAttribute('tabindex', active ? '0' : '-1');
  });
  document.querySelectorAll('.team-tab-panel').forEach(panel => {
    const active = panel.dataset.panel === tab;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
}
function wireTeamModal(){
  el('teamModalClose')?.addEventListener('click', closeTeamModal);
  el('teamModalBackdrop')?.addEventListener('click', closeTeamModal);
  document.querySelectorAll('.team-tab').forEach(btn => btn.addEventListener('click', () => setTeamTab(btn.dataset.tab)));
}
function scopeLine(){
  const f = currentFilter();
  return [
    f.t !== '__all__' ? f.t : 'All tournaments',
    f.s !== '__all__' ? f.s : '',
    f.w !== '__all__' ? `W${f.w}` : '',
    f.d !== '__all__' ? `D${f.d}` : '',
    f.m !== '__all__' ? `M${f.m}` : 'All matches'
  ].filter(Boolean).join(' • ');
}
function renderTeamStory(teamRows){
  const matches = teamMatchAgg(teamRows).sort((a,b)=>(a.match_order||0)-(b.match_order||0));
  const last = matches[matches.length - 1];
  const first = matches[0];
  const totalElims = matches.reduce((a,b)=>a+(b.elims||0),0);
  const totalRank = matches.reduce((a,b)=>a+(b.ranking_score||0),0);
  const totalScore = totalElims + totalRank;
  const bestTotal = matches.slice().sort((a,b)=>(((b.elims||0)+(b.ranking_score||0))-((a.elims||0)+(a.ranking_score||0))))[0];
  const bestRank = matches.slice().sort((a,b)=>(b.ranking_score||0)-(a.ranking_score||0))[0];
  const bestElim = matches.slice().sort((a,b)=>(b.elims||0)-(a.elims||0))[0];
  const bestDmg = matches.slice().sort((a,b)=>(b.damage||0)-(a.damage||0))[0];

  const bestStatSource = (m) => m ? `D${escHtml(m.day || '—')} M${escHtml(m.match_no || '—')}` : '—';
  const bestTotalValue = (m) => m ? (n(m.elims) + n(m.ranking_score)) : 0;
  const story = matches.length ? `
    <div class="kpis">
      <div class="kpi">Opening Match <strong>D${escHtml(first?.day || '—')} M${escHtml(first?.match_no || '—')}</strong></div>
      <div class="kpi">Latest Match <strong>D${escHtml(last?.day || '—')} M${escHtml(last?.match_no || '—')}</strong></div>
      <div class="kpi">Total Score <strong>${fmtNum(totalScore)}</strong></div>
      <div class="kpi">Elim / Rank Split <strong>${fmtNum(totalElims)} / ${fmtNum(totalRank)}</strong></div>
      <div class="kpi">Best Total Game <strong>${bestTotal ? `${fmtNum(bestTotalValue(bestTotal))} • ${bestStatSource(bestTotal)}` : '—'}</strong></div>
      <div class="kpi">Best Rank Game <strong>${bestRank ? `${fmtNum(bestRank.ranking_score)} • ${bestStatSource(bestRank)}` : '—'}</strong></div>
      <div class="kpi">Best Elim Game <strong>${bestElim ? `${fmtNum(bestElim.elims)} • ${bestStatSource(bestElim)}` : '—'}</strong></div>
      <div class="kpi">Best Damage Game <strong>${bestDmg ? `${fmtNum(bestDmg.damage)} • ${bestStatSource(bestDmg)}` : '—'}</strong></div>
    </div>
    <div class="muted">This profile is based on the current filter scope: ${escHtml(scopeLine())}.</div>
  ` : '<div class="muted">No match data available for this team in the current scope.</div>';

  el('teamStory').innerHTML = story;
  el('teamMatchLog').innerHTML = renderSimpleTable(matches.map((r,i)=>({
    rank:i+1,
    day:r.day || '—',
    matchNo:r.match_no || '—',
    match:r.mk,
    booyah:r.booyah ? '👑' : '',
    elims:r.elims,
    rankScore:r.ranking_score,
    total:(r.elims||0)+(r.ranking_score||0),
    damage:r.damage,
    assists:r.assists,
    headshots:r.headshots
  })), [
    {label:'#',key:'rank',right:true},
    {label:'Day',key:'day',right:true},
    {label:'MP',key:'matchNo',right:true},
    {label:'BYH',key:'booyah'},
    {label:'ELM',key:'elims',right:true},
    {label:'PLC',key:'rankScore',right:true},
    {label:'TOT',key:'total',right:true},
    {label:'DMG',key:'damage',right:true},
    {label:'AST',key:'assists',right:true},
    {label:'HS',key:'headshots',right:true}
  ]);
  applyColumnHeatmap('teamMatchLog',['elims','rankScore','total','damage','assists','headshots']);
}

function selectTeam(team, keepCurrentModalState=false){
  const teamCode = norm(team).toUpperCase();
  if(!teamCode) return;

  const teamRows = FILTERED.filter(r => norm(getVal(r, KEYS.team)).toUpperCase() === teamCode);
  CURRENT_TEAM = teamCode;
  LAST_SELECTED_TEAM_ROWS = teamRows;
  LAST_PLAYER_SUMMARY_ROWS = [];

  setText('selectedTeamChip', teamCode);
  setText('selectedTeamChipModal', teamCode);
  if(el('modalTeamSelect')){
    populateModalTeamSelect();
    el('modalTeamSelect').value = teamCode;
  }
  setText('teamTitle', `Team Overview — ${teamCode}`);
  setText('modalTeamMeta', scopeLine());
  if(el('modalTeamLogo')) el('modalTeamLogo').innerHTML = teamLogoHtml(teamCode, getTeamProfile(teamCode), 'modal-team-logo-inner');
  setText('playersHint', teamRows.length ? `• ${teamRows.length} rows` : '• no rows');
  setText('aiInsightStatus','Rule-based insights loaded.');

  renderTeamProfileHero(teamCode, teamRows);
  renderRuleBasedInsights(teamCode, teamRows);
  renderTeamKpis(teamRows);
  renderPlayersTable(teamRows);
  renderRosterCards(teamRows);
  renderTeamUsageTables(teamRows);
  renderTeamStory(teamRows);
  syncTeamCardFilterControls?.();

  // Refreshes comparison dropdown, head-to-head, and automatic player comparison
  renderComparisonPanel();

  highlightActiveTile();

  if(!keepCurrentModalState || !isTeamModalOpen()) openTeamModal();
}

function isPlainObject(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
function tidyBlock(v){
  if(v == null) return '';
  if(Array.isArray(v)) return v.map(tidyBlock).filter(Boolean).join('\n');
  if(isPlainObject(v)) return Object.entries(v).map(([k,val]) => `${String(k).toUpperCase()}: ${tidyBlock(val)}`).filter(Boolean).join('\n\n');
  return String(v).replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\r\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function pickObjectValue(obj, keys=['br','cs']){
  if(!isPlainObject(obj)) return tidyBlock(obj);
  for(const k of keys){ const v = tidyBlock(obj[k]); if(v) return v; }
  for(const v of Object.values(obj)){ const t = tidyBlock(v); if(t) return t; }
  return '';
}
function getGalleryName(item, kind){
  const nestedName = firstTextFromPaths(item, [
    'skill.name','skill.title','skill.label',
    'ability.name','ability.title','ability.label',
    'character.name','character.title','character.label',
    'hero.name','hero.title','hero.label'
  ]);
  const directName = item?.name ?? item?.title ?? item?.label ??
    item?.character ?? item?.character_name ?? item?.characterName ?? item?.hero ?? item?.hero_name ??
    item?.skill_name ?? item?.skillName ?? item?.skill ?? item?.ability ?? item?.ability_name ??
    item?.pet_name ?? item?.petName ?? item?.loadout_name ?? item?.loadoutName ??
    item?.weapon_name ?? item?.weaponName ?? item?.gun_name ?? item?.gunName ??
    firstValueByPatterns(item || {}, [/^name$/i, /^title$/i, /^label$/i, /character.*name/i, /hero.*name/i, /skill.*name/i, /^skill$/i, /^ability$/i, /pet.*name/i, /loadout.*name/i, /weapon.*name/i, /gun.*name/i]);
  return norm(nestedName || directName);
}
function getGallerySub(item, kind){
  if(kind === 'skills') return norm(item?.skill_type ?? item?.skillType ?? item?.type ?? item?.role ?? item?.category) || 'Skill';
  if(kind === 'pets') return norm(item?.type ?? item?.category ?? item?.role) || 'Pet';
  if(kind === 'weapons') return norm(item?.category ?? item?.type ?? item?.weapon_type ?? item?.weaponType) || 'Weapon';
  if(kind === 'loadouts') return norm(item?.mode ?? item?.category ?? item?.type) || 'Loadout';
  if(kind === 'maps') return norm(item?.category ?? item?.type ?? item?.sub) || 'Map';
  return '';
}

function getSkillCharacterName(item){
  const raw = item?.raw || item || {};
  return norm(
    raw?.character_name || raw?.characterName || raw?.character ||
    raw?.hero_name || raw?.heroName || raw?.hero || raw?.code_name || raw?.codeName ||
    firstTextFromPaths(raw, ['character.name','character.title','character.label','hero.name','hero.title','hero.label']) ||
    raw?.character_id_name || raw?.characterIdName ||
    // In most character.json files, raw.name is the character name.
    raw?.name || raw?.title || raw?.label || item?.name
  );
}
function getSkillAbilityName(item){
  const raw = item?.raw || item || {};
  const skillObj = raw?.skill && typeof raw.skill === 'object' ? raw.skill : null;
  const abilityObj = raw?.ability && typeof raw.ability === 'object' ? raw.ability : null;
  return norm(
    firstTextFromPaths(raw, [
      'skill.name','skill.title','skill.label','skill.skill_name','skill.skillName',
      'ability.name','ability.title','ability.label','ability.skill_name','ability.skillName'
    ]) ||
    skillObj?.name || skillObj?.title || skillObj?.label ||
    abilityObj?.name || abilityObj?.title || abilityObj?.label ||
    raw?.skill_name || raw?.skillName ||
    (typeof raw?.skill === 'string' ? raw.skill : '') ||
    raw?.ability_name || raw?.abilityName ||
    (typeof raw?.ability === 'string' ? raw.ability : '') ||
    raw?.ability_title || raw?.abilityTitle ||
    raw?.skill_title || raw?.skillTitle || raw?.skill_label || raw?.skillLabel ||
    raw?.skill_description_name || raw?.skillDescriptionName ||
    item?.skill_name || item?.skillName || item?.ability_name || item?.abilityName || ''
  );
}
function getSkillPopupTitle(item){
  return getSkillCharacterName(item) || norm(item?.name) || 'Skill';
}
function getSkillPopupSubTitle(item){
  const rawSub = norm(item?.sub);
  const skillName = getSkillAbilityName(item);
  const subKey = skillKey(rawSub);
  const skillNameKey = skillKey(skillName);
  const type = rawSub && (!skillNameKey || !subKey.includes(skillNameKey)) ? rawSub : 'Skill';
  return skillName ? `${type} • ${skillName}` : type;
}

function getPetDisplayName(item){
  const raw = item?.raw || item || {};
  return norm(
    raw?.pet_name || raw?.petName || raw?.pet || raw?.name || raw?.title || raw?.label ||
    firstTextFromPaths(raw, ['pet.name','pet.title','pet.label','companion.name','companion.title','companion.label']) ||
    item?.pet_name || item?.petName || item?.name || ''
  );
}
function getPetSkillName(item){
  const raw = item?.raw || item || {};
  const skillObj = raw?.skill && typeof raw.skill === 'object' ? raw.skill : null;
  const abilityObj = raw?.ability && typeof raw.ability === 'object' ? raw.ability : null;
  const petSkillObj = raw?.pet_skill && typeof raw.pet_skill === 'object' ? raw.pet_skill : null;

  return norm(
    firstTextFromPaths(raw, [
      'pet_skill.name','pet_skill.title','pet_skill.label','pet_skill.skill_name','pet_skill.skillName',
      'skill.name','skill.title','skill.label','skill.skill_name','skill.skillName',
      'ability.name','ability.title','ability.label','ability.skill_name','ability.skillName'
    ]) ||
    petSkillObj?.name || petSkillObj?.title || petSkillObj?.label ||
    skillObj?.name || skillObj?.title || skillObj?.label ||
    abilityObj?.name || abilityObj?.title || abilityObj?.label ||
    raw?.pet_skill_name || raw?.petSkillName ||
    raw?.skill_name || raw?.skillName ||
    (typeof raw?.skill === 'string' ? raw.skill : '') ||
    raw?.ability_name || raw?.abilityName ||
    (typeof raw?.ability === 'string' ? raw.ability : '') ||
    raw?.ability_title || raw?.abilityTitle ||
    raw?.skill_title || raw?.skillTitle || raw?.skill_label || raw?.skillLabel ||
    item?.pet_skill_name || item?.petSkillName || item?.skill_name || item?.skillName || item?.ability_name || item?.abilityName || ''
  );
}
function getPetPopupTitle(item){
  return getPetDisplayName(item) || norm(item?.name) || 'Pet';
}
function getPetPopupSubTitle(item){
  const rawSub = norm(item?.sub);
  const skillName = getPetSkillName(item);
  const subKey = skillKey(rawSub);
  const skillNameKey = skillKey(skillName);
  const type = rawSub && (!skillNameKey || !subKey.includes(skillNameKey)) ? rawSub : 'Pet';
  return skillName ? `${type} • ${skillName}` : type;
}
function petSearchKeysForItem(item){
  return uniqueList([
    item?.name,
    item?.sub,
    getPetDisplayName(item),
    getPetSkillName(item),
    firstSkillNameTokenKey(getPetDisplayName(item)),
    firstSkillNameTokenKey(getPetSkillName(item))
  ]).map(assetLookupKey).filter(Boolean);
}
function skillSearchKeysForItem(item){
  return uniqueList([
    item?.name,
    item?.sub,
    getSkillCharacterName(item),
    getSkillAbilityName(item),
    firstSkillNameTokenKey(getSkillCharacterName(item)),
    firstSkillNameTokenKey(getSkillAbilityName(item))
  ]).map(assetLookupKey).filter(Boolean);
}
function skillTitleForLiveFeed(item){
  if(!item) return '';
  const charName = getSkillCharacterName(item) || norm(item.name);
  const skillName = getSkillAbilityName(item);
  return skillName && skillKey(skillName) !== skillKey(charName) ? `${charName} — ${skillName}` : charName;
}
function getLoadoutDescParts(item){
  const raw = item?.raw || item || {};
  const en = raw.description ?? raw.description_en ?? raw.desc ?? raw.details ?? raw.effect;
  const ms = raw.description_ms;
  let br = '';
  let cs = '';

  if(isPlainObject(en)){
    br = tidyBlock(en.br) || tidyBlock(en.BR) || tidyBlock(en.battle_royale);
    cs = tidyBlock(en.cs) || tidyBlock(en.CS) || tidyBlock(en.clash_squad);
  }else{
    br = tidyBlock(en);
  }

  // Keep Malay text available if English is missing. Do not mix languages if EN exists.
  if(!br && isPlainObject(ms)) br = tidyBlock(ms.br) || tidyBlock(ms.BR) || tidyBlock(ms.battle_royale);
  if(!cs && isPlainObject(ms)) cs = tidyBlock(ms.cs) || tidyBlock(ms.CS) || tidyBlock(ms.clash_squad);
  if(!br && !cs && ms && !isPlainObject(ms)) br = tidyBlock(ms);

  // Legacy schemas sometimes use direct fields.
  br = br || tidyBlock(raw.br_description) || tidyBlock(raw.description_br) || tidyBlock(raw.br);
  cs = cs || tidyBlock(raw.cs_description) || tidyBlock(raw.description_cs) || tidyBlock(raw.cs);

  const fallback = tidyBlock(raw.summary) || tidyBlock(raw.info) || tidyBlock(raw.notes);
  if(!br && !cs && fallback) br = fallback;

  return { br, cs };
}
function getGalleryDesc(item, kind){
  if(kind === 'loadouts'){
    const parts = getLoadoutDescParts(item);
    return parts.br || parts.cs || 'No loadout description yet.';
  }
  return tidyBlock(
    item?.description ?? item?.desc ?? item?.details ?? item?.effect ?? item?.skill_description ?? item?.skillDescription ??
    item?.description_en ?? item?.description_ms ?? item?.br_description ?? item?.cs_description ?? item?.ability_description ??
    firstValueByPatterns(item || {}, [/description/i, /^desc$/i, /effect/i, /details/i])
  );
}
function normalizeGalleryItem(item, kind){
  if(!item || typeof item !== 'object') return null;
  const baseName = getGalleryName(item, kind);
  if(!baseName) return null;
  if(kind === 'skills'){
    const normalized = { kind, name: baseName, sub: getGallerySub(item, kind), desc: getGalleryDesc(item, kind), img: firstImageValue(item), raw: item };
    normalized.character_name = getSkillCharacterName(normalized) || baseName;
    normalized.skill_name = getSkillAbilityName(normalized);
    // Keep the card/popup searchable by both character name and skill name.
    normalized.search_name = uniqueList([normalized.name, normalized.character_name, normalized.skill_name]).join(' • ');
    return normalized;
  }
  if(kind === 'pets'){
    const normalized = { kind, name: baseName, sub: getGallerySub(item, kind), desc: getGalleryDesc(item, kind), img: firstImageValue(item), raw: item };
    normalized.pet_name = getPetDisplayName(normalized) || baseName;
    normalized.pet_skill_name = getPetSkillName(normalized);
    normalized.search_name = uniqueList([normalized.name, normalized.pet_name, normalized.pet_skill_name]).join(' • ');
    return normalized;
  }
  return { kind, name: baseName, sub: getGallerySub(item, kind), desc: getGalleryDesc(item, kind), img: firstImageValue(item), raw: item };
}
function resourceKindSingular(kind){
  return ({ skills:'Skill', pets:'Pet', weapons:'Weapon', loadouts:'Loadout', maps:'Map' })[kind] || 'Item';
}
function resourceImageHtml(item, kind){
  const name = item?.name || resourceKindSingular(kind);
  const rawImg = normalizeImageUrl(item?.img || item?.image || item?.icon || item?.src || '');
  let candidates = [];
  const slug = slugAssetName(name);
  if(kind === 'maps'){
    if(slug) candidates.push(`assets/img/maps/${slug}.png`, `assets/img/map/${slug}.png`, `assets/maps/${slug}.png`);
  }else if(kind === 'weapons'){
    if(slug) candidates.push(`assets/img/weapons/${slug}.png`, `assets/img/weapon/${slug}.png`, `assets/weapons/${slug}.png`);
  }else if(kind === 'pets'){
    candidates = candidates.concat(visualImageCandidates('pet', name, item?.raw?.id || item?.raw?.pet_id || ''));
  }else if(kind === 'loadouts'){
    candidates = candidates.concat(visualImageCandidates('loadout', name, item?.raw?.id || item?.raw?.loadout_id || item?.raw?.code || ''));
  }else if(kind === 'skills'){
    candidates = candidates.concat(visualImageCandidates('skill', name, item?.raw?.id || item?.raw?.skill_id || ''));
  }
  if(rawImg) candidates.push(rawImg);
  candidates = uniqueList(candidates);
  const fallback = initialsFromLabel(name);
  if(!candidates.length) return `<span class="resource-fallback">${escHtml(fallback)}</span>`;
  const [first, ...rest] = candidates;
  return `<img src="${escHtml(first)}" alt="${escHtml(name)}" loading="lazy" data-fallbacks="${escHtml(rest.join('|'))}" data-fallback-index="0" onerror="tryResourceImageFallback(this)"><span class="resource-fallback">${escHtml(fallback)}</span>`;
}
function tryResourceImageFallback(img){
  const fallbacks = String(img.dataset.fallbacks || '').split('|').filter(Boolean);
  const index = Number(img.dataset.fallbackIndex || 0);
  if(index < fallbacks.length){
    img.dataset.fallbackIndex = String(index + 1);
    img.src = fallbacks[index];
    return;
  }
  img.remove();
}
function renderResourceGrid(query=''){
  const q = norm(query).toLowerCase();
  const kind = RESOURCE_MODAL_KIND || 'skills';
  updateResourceNavButtons();
  const data = (RESOURCE_DATA[kind] || []).filter(item => {
    const hay = [item.name, item.sub, item.desc].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });
  setText('resourceCount', `${data.length} item${data.length === 1 ? '' : 's'}`);
  const grid = el('resourceGrid');
  if(!grid) return;
  if(!data.length){
    grid.innerHTML = `<div class="modal-state modal-state-empty"><span aria-hidden="true">⌕</span><b>No ${escHtml(resourceKindSingular(kind).toLowerCase())} items found</b><small>Try another search term or reference category.</small></div>`;
    return;
  }
  grid.innerHTML = data.map((item, index) => `
    <article class="resource-card" data-kind="${escHtml(kind)}" data-index="${index}">
      <div class="resource-thumb">${resourceImageHtml(item, kind)}</div>
      <div class="resource-name" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
      <div class="resource-sub"><span class="resource-chip">${escHtml(item.sub || resourceKindSingular(kind))}</span></div>
      <div class="resource-desc">${escHtml(item.desc || 'No description yet.')}</div>
      <div class="resource-actions">
        <button class="resource-mini-btn" type="button" data-detail-index="${index}">Details</button>
        ${RESOURCE_PICK_TARGET ? `<button class="resource-mini-btn pick" type="button" data-pick-index="${index}">Pick</button>` : ''}
      </div>
    </article>
  `).join('');
  grid.querySelectorAll('[data-detail-index]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = data[Number(btn.getAttribute('data-detail-index'))];
      openItemDetailPopup(item, kind, 'resource');
    });
  });
  grid.querySelectorAll('[data-pick-index]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = data[Number(btn.getAttribute('data-pick-index'))];
      pickResourceItem(item);
    });
  });
  grid.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = data[Number(card.getAttribute('data-index'))];
      openItemDetailPopup(item, kind, 'resource');
    });
  });
}
async function loadWeaponJson(){
  RESOURCE_DATA.weapons = [];
  let lastErr = null;
  for(const url of WEAPON_JSON_URLS){
    try{
      const res = await fetch(`${url}?v=${Date.now()}`, { cache:'no-store' });
      if(!res.ok) throw new Error(`${url} fetch failed: ${res.status}`);
      const data = await res.json();
      const arr = jsonArrayFromData(data, ['weapons','weapon','data','items','guns']);
      RESOURCE_DATA.weapons = arr.map(item => normalizeGalleryItem(item, 'weapons')).filter(Boolean);
      if(RESOURCE_DATA.weapons.length) return;
    }catch(e){
      lastErr = e;
      console.warn('weapon data load failed:', e?.message || e);
    }
  }
  RESOURCE_DATA.weapons = [
    {kind:'weapons', name:'M82B', sub:'Sniper Rifle', desc:'Sample weapon card. Replace with weapon.json data when available.', img:'', raw:{}},
    {kind:'weapons', name:'M1887', sub:'Shotgun', desc:'Sample close-range weapon reference.', img:'', raw:{}},
    {kind:'weapons', name:'PARAFAL', sub:'Assault Rifle', desc:'Sample rifle reference for preset planning.', img:'', raw:{}},
    {kind:'weapons', name:'Groza', sub:'Assault Rifle', desc:'Sample rifle reference for preset planning.', img:'', raw:{}}
  ];
  if(lastErr) console.warn('Using sample weapon data:', lastErr?.message || lastErr);
}
function isTeamModalOpen(){ return el('teamModal')?.classList.contains('show'); }
function isResourceModalOpen(){ return el('resourceModal')?.classList.contains('show'); }
function isItemDetailOpen(){ return el('itemDetailModal')?.classList.contains('show'); }
function openResourcePopup(kind, pickTarget=null){
  RESOURCE_MODAL_KIND = kind || 'skills';
  RESOURCE_PICK_TARGET = pickTarget;
  const [title, sub] = RESOURCE_TITLES[RESOURCE_MODAL_KIND] || ['Resources','Browse Free Fire reference data.'];
  setText('resourceModalTitle', pickTarget ? `Pick ${pickTarget.label || resourceKindSingular(kind)}` : title);
  setText('resourceModalSub', pickTarget ? 'Choose an item for the Mini Preset Builder.' : sub);
  const search = el('resourceSearch');
  if(search) search.value = '';
  const modal = el('resourceModal');
  modal?.classList.toggle('stacked', isTeamModalOpen());
  el('teamModal')?.classList.toggle('resource-stacked', isTeamModalOpen());
  const grid = el('resourceGrid');
  if(grid) grid.innerHTML = '<div class="modal-state modal-state-loading"><span class="modal-spinner" aria-hidden="true"></span><b>Loading reference data…</b></div>';
  openManagedModal(modal, { initialFocus:'#resourceSearch', announce:`${title} opened` });
  updateResourceNavButtons();
  requestAnimationFrame(() => renderResourceGrid(''));
}
function closeResourcePopup(options={}){
  const modal = el('resourceModal');
  RESOURCE_PICK_TARGET = null;
  el('teamModal')?.classList.remove('resource-stacked');
  closeManagedModal(modal, options);
}
function closeItemDetailPopup(options={}){
  const modal = el('itemDetailModal');
  modal?.querySelector('.item-detail-card')?.classList.remove('map-view');
  closeManagedModal(modal, options);
}
function itemDetailImageClass(kind){ return kind === 'weapons' || kind === 'weapon' ? 'weapon' : ''; }
function formatLoadoutDescriptionBlocks(item){
  const parts = getLoadoutDescParts(item);
  const blocks = [];
  if(parts.br) blocks.push(`<div class="item-detail-desc-block"><b>BR DESCRIPTION</b><div>${escHtml(parts.br)}</div></div>`);
  if(parts.cs) blocks.push(`<div class="item-detail-desc-block"><b>CS DESCRIPTION</b><div>${escHtml(parts.cs)}</div></div>`);
  if(blocks.length) return blocks.join('');
  return `<p class="item-detail-desc">${escHtml(item?.desc || 'No loadout description yet.')}</p>`;
}
function costText(value){
  if(value == null) return '';
  if(typeof value === 'string' || typeof value === 'number') return String(value);
  if(Array.isArray(value)) return value.map(costText).filter(Boolean).join(' • ');
  if(isPlainObject(value)){
    const parts = [];
    for(const [mode, data] of Object.entries(value)){
      if(isPlainObject(data)){
        const currency = data.currency || '';
        const note = data.note || '';
        const items = Array.isArray(data.items) && data.items.length ? data.items.map(i => `${i.name || i.id || 'Item'}${i.cost != null ? `: ${i.cost}` : ''}`).join(', ') : '';
        parts.push(`${mode.toUpperCase()}: ${[items, currency, note].filter(Boolean).join(' • ')}`);
      }else parts.push(`${mode.toUpperCase()}: ${costText(data)}`);
    }
    return parts.filter(Boolean).join(' | ');
  }
  return '';
}

function elevateItemDetailPopupLayer(){
  const modal = el('itemDetailModal');
  if(modal && modal.parentElement !== document.body) document.body.appendChild(modal);
}

let ITEM_DETAIL_CONTEXT = 'standalone';
function configureItemDetailBack(kind, context='standalone'){
  ITEM_DETAIL_CONTEXT = context || 'standalone';
  const btn = el('itemDetailBack');
  if(!btn) return;
  if(context === 'resource' && isResourceModalOpen()){
    const title = (RESOURCE_TITLES[kind] || [resourceKindSingular(kind)])[0];
    btn.hidden = false;
    btn.textContent = `← Back to ${title}`;
  }else if(context === 'team' || isTeamModalOpen()){
    btn.hidden = false;
    btn.textContent = '← Back to Team Profile';
  }else{
    btn.hidden = true;
    btn.textContent = '← Back';
  }
}
function handleItemDetailBack(){ closeItemDetailPopup(); }

function openItemDetailPopup(item, kind, context='resource'){
  elevateItemDetailPopupLayer();
  configureItemDetailBack(kind, context);
  if(!item) return;
  const raw = item.raw || item;
  const singular = resourceKindSingular(kind);
  const detailTitle = kind === 'skills' ? getSkillPopupTitle(item) : kind === 'pets' ? getPetPopupTitle(item) : (item.name || singular);
  const detailSub = kind === 'skills' ? getSkillPopupSubTitle(item) : kind === 'pets' ? getPetPopupSubTitle(item) : `${singular} • ${item.sub || 'Reference'}`;
  setText('itemDetailTitle', detailTitle);
  setText('itemDetailSub', detailSub);
  const body = el('itemDetailBody');
  const detailCard = el('itemDetailModal')?.querySelector('.item-detail-card');
  detailCard?.classList.toggle('map-view', kind === 'maps');

  if(kind === 'maps'){
    const mapImg = item.img
      ? `<img src="${escHtml(item.img)}" alt="${escHtml(item.name || 'Map')}" loading="lazy">`
      : `<div class="map-detail-fallback">${escHtml(item.name || 'Map')}</div>`;

    body.innerHTML = `
      <div class="map-detail-view">
        <div class="map-detail-image">${mapImg}</div>
        <div class="map-detail-caption">
          <span class="item-detail-chip">${escHtml(singular)}</span>
          <span class="item-detail-chip">${escHtml(item.sub || 'Map Reference')}</span>
        </div>
      </div>
    `;
    openManagedModal(el('itemDetailModal'), { initialFocus:'#itemDetailBack:not([hidden]), #itemDetailClose', announce:`${detailTitle} details opened` });
    return;
  }

  const imgCls = itemDetailImageClass(kind);
  const skillNameBlock = kind === 'skills' && getSkillAbilityName(item)
    ? `<div class="item-detail-desc-block"><b>SKILL NAME</b><div>${escHtml(getSkillAbilityName(item))}</div></div>`
    : '';
  const petSkillNameBlock = kind === 'pets' && getPetSkillName(item)
    ? `<div class="item-detail-desc-block"><b>PET SKILL</b><div>${escHtml(getPetSkillName(item))}</div></div>`
    : '';
  const descHtml = kind === 'loadouts'
    ? formatLoadoutDescriptionBlocks(item)
    : `${skillNameBlock}${petSkillNameBlock}<p class="item-detail-desc">${escHtml(item.desc || getGalleryDesc(raw, kind) || 'No description yet.')}</p>`;
  const metaPairs = [
    ['Type', item.sub || singular],
    kind === 'skills' ? ['Skill Name', getSkillAbilityName(item) || '—'] : null,
    kind === 'pets' ? ['Pet Skill', getPetSkillName(item) || '—'] : null,
    ['ID / Code', raw.loadout_id || raw.id || raw.code || raw.skill_id || raw.pet_id || raw.weapon_id || '—'],
    ['Category', raw.category || raw.type || raw.role || '—'],
    kind === 'loadouts' ? ['Cost / Notes', costText(raw.cost) || raw.cost_note || raw.note || '—'] : null,
    kind === 'weapons' ? ['Special', raw.special_attributes || raw.special || raw.perk || raw.attribute || '—'] : null
  ].filter(Boolean);
  body.innerHTML = `
    <div class="item-detail-main">
      <div class="item-detail-thumb ${imgCls}">${resourceImageHtml(item, kind)}</div>
      <div class="item-detail-copy">
        <div class="item-detail-badges">
          <span class="item-detail-chip">${escHtml(singular)}</span>
          <span class="item-detail-chip">${escHtml(item.sub || 'Reference')}</span>
          ${kind === 'loadouts' ? '<span class="item-detail-chip">BR + CS</span>' : ''}
        </div>
        ${descHtml}
      </div>
    </div>
    <div class="item-detail-extra">${metaPairs.map(([k,v]) => `<div class="item-detail-meta"><span>${escHtml(k)}</span><b title="${escHtml(v)}">${escHtml(v)}</b></div>`).join('')}</div>
  `;
  openManagedModal(el('itemDetailModal'), { initialFocus:'#itemDetailBack:not([hidden]), #itemDetailClose', announce:`${detailTitle} details opened` });
}
function pickResourceItem(item){
  if(!RESOURCE_PICK_TARGET || !item) return;
  applyPresetPick(RESOURCE_PICK_TARGET.kind, RESOURCE_PICK_TARGET.index, item);
  closeResourcePopup({restoreFocus:false});
  document.activeElement?.blur?.();
  openItemDetailPopup(item, RESOURCE_MODAL_KIND, 'preset');
}

function findResourceLoadoutByFixedItem(fixed){
  const source = RESOURCE_DATA.loadouts || [];
  const aliasKeys = (fixed.aliases || [fixed.name]).map(assetLookupKey).filter(Boolean);
  const code = normalizeLookupId(fixed.code);
  const found = source.find(item => {
    const itemNameKey = assetLookupKey(item?.name);
    const raw = item?.raw || {};
    const itemCodes = idCandidatesFromRow(raw).map(normalizeLookupId);
    if(code && itemCodes.includes(code)) return true;
    if(aliasKeys.includes(itemNameKey)) return true;
    return aliasKeys.some(k => itemNameKey.includes(k) || k.includes(itemNameKey));
  });
  if(found) return found;
  return {
    kind:'loadouts',
    name:fixed.name,
    sub:'Loadout',
    img: LOADOUT_ID_TO_IMAGE.get(code) || LOADOUT_NAME_TO_IMAGE.get(assetLookupKey(fixed.name)) || '',
    desc:'Fixed Mini Preset Builder loadout slot.',
    raw:{ name:fixed.name, loadout_id:fixed.code, code:fixed.code, category:'Loadout' }
  };
}
function getFixedMiniLoadouts(){
  return FIXED_MINI_LOADOUTS.map(findResourceLoadoutByFixedItem);
}
function enforceFixedMiniLoadouts(){
  MINI_PRESET.loadout = getFixedMiniLoadouts();
}
function normalizeMiniPresetSlots(){
  if(!Array.isArray(MINI_PRESET.active)) MINI_PRESET.active = [null,null,null,null];
  if(!Array.isArray(MINI_PRESET.passive)) MINI_PRESET.passive = [null,null,null,null];
  if(!Array.isArray(MINI_PRESET.pet)) MINI_PRESET.pet = [null,null,null,null];
  if(!Array.isArray(MINI_PRESET.loadout)) MINI_PRESET.loadout = [null,null,null,null];

  // Minimum slot layout: 4 active, 4 passive, 4 pet.
  // Loadout is fixed to the four official loadout slots below.
  while(MINI_PRESET.active.length < 4) MINI_PRESET.active.push(null);
  while(MINI_PRESET.passive.length < 4) MINI_PRESET.passive.push(null);
  while(MINI_PRESET.pet.length < 4) MINI_PRESET.pet.push(null);
  enforceFixedMiniLoadouts();
}
function loadMiniPreset(){
  try{
    const parsed = JSON.parse(localStorage.getItem(MINI_PRESET_KEY) || 'null');
    if(parsed && typeof parsed === 'object') MINI_PRESET = Object.assign(MINI_PRESET, parsed);
  }catch(_e){}
  normalizeMiniPresetSlots();
}
function saveMiniPreset(){ try{ localStorage.setItem(MINI_PRESET_KEY, JSON.stringify(MINI_PRESET)); }catch(_e){} }
function emptyPresetSlotLabel(kind, index){
  if(kind === 'active') return 'Active Skill';
  if(kind === 'passive') return `Passive ${index + 1}`;
  if(kind === 'pet') return 'Pet';
  if(kind === 'weapon') return `Weapon ${index + 1}`;
  if(kind === 'loadout') return `Loadout ${index + 1}`;
  return `Slot ${index + 1}`;
}
function presetKindToResourceKind(kind){ return kind === 'active' || kind === 'passive' ? 'skills' : kind === 'pet' ? 'pets' : kind === 'weapon' ? 'weapons' : kind === 'loadout' ? 'loadouts' : kind; }
function renderPresetRow(rowId, kind){
  const row = el(rowId); if(!row) return;
  const slots = MINI_PRESET[kind] || [];
  row.innerHTML = slots.map((item, index) => {
    const has = !!item;
    const fixedLoadout = kind === 'loadout';
    const label = emptyPresetSlotLabel(kind, index);
    const thumb = has ? resourceImageHtml(item, presetKindToResourceKind(kind)) : `<span class="resource-fallback">+</span>`;
    const actionButtons = fixedLoadout ? '' : (has ? `<button class="preset-change" type="button" data-change-index="${index}">Change</button><button class="preset-clear" type="button" title="Clear" data-clear-index="${index}">×</button>` : '');
    return `<div class="preset-slot ${has ? 'has-item' : ''} ${fixedLoadout ? 'fixed-loadout-slot' : ''}" data-kind="${escHtml(kind)}" data-index="${index}">
      <div class="preset-slot-top"><b>${escHtml(label)}</b><span class="resource-chip">${fixedLoadout ? 'Fixed' : (has ? 'Set' : 'Empty')}</span></div>
      <div class="preset-slot-body"><div class="preset-thumb">${thumb}</div><div class="preset-meta"><div class="preset-name">${escHtml(has ? item.name : 'Click to pick')}</div><div class="preset-sub">${escHtml(has ? (item.sub || resourceKindSingular(presetKindToResourceKind(kind))) + (fixedLoadout ? ' • fixed' : '') : 'Picker popup')}</div></div></div>
      ${actionButtons}
    </div>`;
  }).join('');
  row.querySelectorAll('.preset-slot').forEach(slot => {
    slot.addEventListener('click', e => {
      const idx = Number(slot.getAttribute('data-index')) || 0;
      const target = e.target;
      const item = MINI_PRESET[kind][idx];
      if(kind === 'loadout'){
        if(item) openItemDetailPopup(item, 'loadouts', 'preset');
        return;
      }
      if(target?.matches?.('[data-clear-index]')){ MINI_PRESET[kind][idx] = null; saveMiniPreset(); renderMiniPresetBuilder(); return; }
      if(target?.matches?.('[data-change-index]')){ openResourcePopup(presetKindToResourceKind(kind), { kind, index: idx, label: emptyPresetSlotLabel(kind, idx) }); return; }
      if(item) openItemDetailPopup(item, presetKindToResourceKind(kind), 'preset');
      else openResourcePopup(presetKindToResourceKind(kind), { kind, index: idx, label: emptyPresetSlotLabel(kind, idx) });
    });
  });
}
function presetSlotCountText(kind){
  if(kind === 'loadout') return 'Fixed 4 slots';
  const count = (MINI_PRESET[kind] || []).length;
  return `${count} slot${count === 1 ? '' : 's'}`;
}
function updateMiniPresetSlotCounts(){
  setText('presetActiveCount', presetSlotCountText('active'));
  setText('presetPassiveCount', presetSlotCountText('passive'));
  setText('presetPetCount', presetSlotCountText('pet'));
  setText('presetLoadoutCount', presetSlotCountText('loadout'));
}
function addMiniPresetSlot(kind){
  if(kind === 'loadout') return;
  if(!MINI_PRESET[kind]) return;
  MINI_PRESET[kind].push(null);
  saveMiniPreset();
  renderMiniPresetBuilder();
}
function renderMiniPresetBuilder(){
  normalizeMiniPresetSlots();
  renderPresetRow('presetActiveRow','active');
  renderPresetRow('presetPassiveRow','passive');
  renderPresetRow('presetPetRow','pet');
  renderPresetRow('presetLoadoutRow','loadout');
  updateMiniPresetSlotCounts();
}
function applyPresetPick(kind, index, item){
  if(kind === 'loadout') return;
  if(!MINI_PRESET[kind]) return;
  MINI_PRESET[kind][index] = item;
  saveMiniPreset();
  renderMiniPresetBuilder();
}
function resetMiniPreset(){
  MINI_PRESET = { active:[null,null,null,null], passive:[null,null,null,null], pet:[null,null,null,null], loadout:getFixedMiniLoadouts() };
  saveMiniPreset();
  renderMiniPresetBuilder();
}
function wireResourceTools(){
  document.querySelectorAll('[data-open-resource]').forEach(btn => {
    btn.addEventListener('click', () => openResourcePopup(btn.getAttribute('data-open-resource')));
  });
  el('resourceModalClose')?.addEventListener('click', closeResourcePopup);
  el('resourceModalBackdrop')?.addEventListener('click', closeResourcePopup);
  el('resourceBackBtn')?.addEventListener('click', () => switchResourcePopup(el('resourceBackBtn')?.dataset.kind || ''));
  el('resourceNextBtn')?.addEventListener('click', () => switchResourcePopup(el('resourceNextBtn')?.dataset.kind || ''));
  el('resourceSearch')?.addEventListener('input', e => renderResourceGrid(e.target.value || ''));
  el('itemDetailBack')?.addEventListener('click', handleItemDetailBack);
  el('itemDetailClose')?.addEventListener('click', closeItemDetailPopup);
  el('itemDetailBackdrop')?.addEventListener('click', closeItemDetailPopup);
  el('presetResetBtn')?.addEventListener('click', resetMiniPreset);
  document.querySelectorAll('[data-add-preset-slot]').forEach(btn => {
    btn.addEventListener('click', () => addMiniPresetSlot(btn.getAttribute('data-add-preset-slot')));
  });
  loadMiniPreset();
  renderMiniPresetBuilder();
}

function updateSkillDiagnostics(){
  try{
    const rows = RAW || [];
    const withSplit = rows.filter(r => (KEYS.skillIds || []).some((_,idx)=>skillIdFromRow(r, idx))).length;
    const withRaw = rows.filter(r => parseSkillIdsFromValue(KEYS.rawSkillIds ? r?.[KEYS.rawSkillIds] : r?.player_stats_skill_ids).length).length;
    const withInfo = rows.filter(r => getSkillInfoIdsForRow(r).length || norm(getVal(r, KEYS.skillInfoName))).length;
    const sample = rows.find(r => skillIdsFromRow(r).length || getSkillInfoIdsForRow(r).length || norm(getVal(r, KEYS.skillInfoName)));
    const sampleIds = sample ? skillIdsFromRow(sample).slice(0,4).join(',') : 'none';
    const sampleActive = sample ? (getActiveSkillLabel(sample) || getActiveSkillId(sample) || 'none') : 'none';
    const validation = skillValidationSummary(rows);
    setText('diagSkill', `skill fields: split=${withSplit} • raw=${withRaw} • info=${withInfo} • sample=${sampleIds} • active=${sampleActive} • validated A/P/U=${validation.active}/${validation.passive}/${validation.unknown}`);
  }catch(e){
    setText('diagSkill', 'skill fields: diagnostic failed');
    console.warn('Skill diagnostic failed:', e?.message || e);
  }
}

function wire(){
  const reloadBtn = el('reloadBtn');

  if(reloadBtn) {
    reloadBtn.addEventListener('click', () => location.reload());
  }

  el('overallSortDir')?.addEventListener('click', () => {
    const b = el('overallSortDir');
    const cur = b.dataset.dir === 'desc' ? 'asc' : 'desc';
    b.dataset.dir = cur;
    b.textContent = cur === 'desc' ? 'Desc' : 'Asc';
    renderOverall();
  });

  el('overallSortKey')?.addEventListener('change', renderOverall);
  el('overallQualiCutoff')?.addEventListener('change', () => {
    EWC_PENDING_QUALIFICATION_CUTOFF = el('overallQualiCutoff')?.value || '';
    renderOverall();
  });

  el('teamSearch')?.addEventListener('input', e => {
    renderTeamGrid(e.target.value || '');
  });

  for (const [id, changed] of [
    ['fTournament', 'tournament'],
    ['fStage', 'stage'],
    ['fMode', 'mode'],
    ['fSource', 'source'],
    ['fYear', 'year'],
    ['fWeek', 'week'],
    ['fDay', 'day']
  ]) {
    el(id)?.addEventListener('change', () => {
      refreshCascadeOptions(changed);
      applyFilters();
      saveFilterState();
      syncTeamCardFilterControls();
    });
  }

  el('fMatchNo')?.addEventListener('change', () => {
    applyFilters();
    saveFilterState();
    syncTeamCardFilterControls();
  });

  el('resetFilters')?.addEventListener('click', () => {
    resetToLatest();
    saveFilterState();
    syncTeamCardFilterControls();
  });

  el('generateAiInsightsBtn')?.addEventListener('click', generateAiInsightsForCurrentTeam);

  wireTeamModal();

  el('modalTeamSelect')?.addEventListener('change', e => {
    const nextTeam = norm(e.target.value).toUpperCase();
    if (nextTeam) selectTeam(nextTeam, true);
  });

  el('teamCompareSelect')?.addEventListener('change', renderTeamHeadToHead);

  wireResourceTools();
}


/* ===== Saved filters + team-card filters + color theme controls ===== */
const EWC_FILTER_STATE_KEY = 'ewc_team_center_filter_state_v3';
const EWC_COLOR_THEME_KEY = 'ewc_team_center_color_theme_v1';
function readSelectValue(id){ return el(id)?.value || '__all__'; }
function getFilterState(){
  return {
    t: readSelectValue('fTournament'), s: readSelectValue('fStage'), mode: readSelectValue('fMode'), source: readSelectValue('fSource'),
    y: readSelectValue('fYear'), w: readSelectValue('fWeek'), d: readSelectValue('fDay'), m: readSelectValue('fMatchNo')
  };
}
function saveFilterState(){
  try{ localStorage.setItem(EWC_FILTER_STATE_KEY, JSON.stringify(getFilterState())); }catch(_e){}
}
function optionExists(selectId, value){
  const node = el(selectId);
  return !!node && [...node.options].some(o => o.value === value);
}
function setSelectIfExists(selectId, value){
  if(value && optionExists(selectId, value)) el(selectId).value = value;
}
function applySavedFilterState(state){
  if(!state || typeof state !== 'object') return false;
  populateTopDropdowns();
  setSelectIfExists('fTournament', state.t || '__all__');
  refreshCascadeOptions('tournament');
  setSelectIfExists('fStage', state.s || '__all__');
  setSelectIfExists('fMode', state.mode || '__all__');
  setSelectIfExists('fSource', state.source || '__all__');
  refreshCascadeOptions('tournament');
  setSelectIfExists('fYear', state.y || '__all__');
  refreshCascadeOptions('year');
  setSelectIfExists('fWeek', state.w || '__all__');
  refreshCascadeOptions('week');
  setSelectIfExists('fDay', state.d || '__all__');
  refreshCascadeOptions('day');
  setSelectIfExists('fMatchNo', state.m || '__all__');
  applyFilters();
  syncTeamCardFilterControls();
  return true;
}
function initFiltersFromStorageOrLatest(){
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(EWC_FILTER_STATE_KEY) || 'null'); }catch(_e){ saved = null; }
  if(saved && applySavedFilterState(saved)) return;
  resetToLatest();
  saveFilterState();
  syncTeamCardFilterControls();
}
function syncSelectOptions(targetId, sourceId){
  const target = el(targetId), source = el(sourceId);
  if(!target || !source) return;
  const current = target.value;
  target.innerHTML = source.innerHTML;
  target.value = optionExists(targetId, current) ? current : source.value;
}
function syncTeamCardFilterControls(){
  syncSelectOptions('teamCardTournament','fTournament');
  syncSelectOptions('teamCardStage','fStage');
  syncSelectOptions('teamCardDay','fDay');
  syncSelectOptions('teamCardMatchNo','fMatchNo');
  if(el('teamCardTournament')) el('teamCardTournament').value = el('fTournament')?.value || '__all__';
  if(el('teamCardStage')) el('teamCardStage').value = el('fStage')?.value || '__all__';
  if(el('teamCardDay')) el('teamCardDay').value = el('fDay')?.value || '__all__';
  if(el('teamCardMatchNo')) el('teamCardMatchNo').value = el('fMatchNo')?.value || '__all__';
}
function applyTeamCardFilter(){
  if(el('teamCardTournament')) el('fTournament').value = el('teamCardTournament').value;
  refreshCascadeOptions('tournament');
  if(el('teamCardStage') && optionExists('fStage', el('teamCardStage').value)) el('fStage').value = el('teamCardStage').value;
  refreshCascadeOptions('stage');
  if(el('teamCardDay') && optionExists('fDay', el('teamCardDay').value)) el('fDay').value = el('teamCardDay').value;
  refreshCascadeOptions('day');
  if(el('teamCardMatchNo') && optionExists('fMatchNo', el('teamCardMatchNo').value)) el('fMatchNo').value = el('teamCardMatchNo').value;
  applyFilters();
  saveFilterState();
  syncTeamCardFilterControls();
}
function applyColorTheme(accent){
  const value = ['red','blue','purple','gray'].includes(accent) ? accent : 'blue';
  document.documentElement.setAttribute('data-accent', value);
  try{ localStorage.setItem(EWC_COLOR_THEME_KEY, value); }catch(_e){}
  document.querySelectorAll('.theme-swatch').forEach(btn => btn.classList.toggle('active', btn.dataset.accent === value));
}
function wireColorThemeControls(){
  const saved = (() => { try{return localStorage.getItem(EWC_COLOR_THEME_KEY) || 'blue';}catch(_e){return 'blue';} })();
  applyColorTheme(saved);
  document.querySelectorAll('.theme-swatch').forEach(btn => btn.addEventListener('click', () => applyColorTheme(btn.dataset.accent)));
}
function wireTeamCardFilterControls(){
  ['teamCardTournament','teamCardStage','teamCardDay','teamCardMatchNo'].forEach(id => el(id)?.addEventListener('change', applyTeamCardFilter));
  el('teamCardResetLatest')?.addEventListener('click', () => { resetToLatest(); saveFilterState(); syncTeamCardFilterControls(); });
  syncTeamCardFilterControls();
}



/* ===== Persistent local view state: filters + view controls =====
   User-facing behavior:
   - Manual UI changes are saved to localStorage.
   - Live auto-refresh never writes over saved view state.
   - Reloading the page restores the dashboard view, not just the data. */
const EWC_VIEW_STATE_KEY = 'ewc_team_center_view_state_v1';
let EWC_RESTORING_VIEW_STATE = false;
let EWC_VIEW_SAVE_TIMER = null;
let EWC_VIEW_STATE_WIRED = false;
let EWC_PENDING_SAVED_VIEW_STATE = null;

function safeReadJsonStorage(key, fallback = null){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(_e){
    return fallback;
  }
}
function safeWriteJsonStorage(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_e){}
}
function readControlValue(id, fallback=''){
  const node = el(id);
  if(!node) return fallback;
  if(node.type === 'checkbox') return !!node.checked;
  return node.value ?? fallback;
}
function getAccordionState(){
  const ids = ['accFilters','accOverall','accLiveFeed','miniPresetBuilder'];
  return ids.reduce((out, id) => {
    const node = el(id);
    if(node) out[id] = !!node.open;
    return out;
  }, {});
}
function restoreAccordionState(state){
  if(!state || typeof state !== 'object') return;
  Object.entries(state).forEach(([id, open]) => {
    const node = el(id);
    if(node && node.tagName === 'DETAILS') node.open = !!open;
  });
}
function getOverallSortState(){
  return {
    key: readControlValue('overallSortKey', 'total_score') || 'total_score',
    dir: el('overallSortDir')?.dataset?.dir || 'desc',
    qualificationCutoff: el('overallQualiCutoff')?.value || EWC_PENDING_QUALIFICATION_CUTOFF || ''
  };
}
function restoreOverallSortState(state){
  if(!state || typeof state !== 'object') return;
  const sortKey = state.key || 'total_score';
  const sortDir = state.dir === 'asc' ? 'asc' : 'desc';
  EWC_PENDING_QUALIFICATION_CUTOFF = String(state.qualificationCutoff || '');
  if(el('overallSortKey') && optionExists('overallSortKey', sortKey)) el('overallSortKey').value = sortKey;
  const btn = el('overallSortDir');
  if(btn){
    btn.dataset.dir = sortDir;
    btn.textContent = sortDir === 'desc' ? 'Desc' : 'Asc';
  }
}
function getTeamCardFilterState(){
  return {
    tournament: readControlValue('teamCardTournament', '__all__'),
    stage: readControlValue('teamCardStage', '__all__'),
    day: readControlValue('teamCardDay', '__all__'),
    matchNo: readControlValue('teamCardMatchNo', '__all__')
  };
}
function restoreTeamCardFilterState(state){
  if(!state || typeof state !== 'object') return;
  const map = {
    teamCardTournament: state.tournament,
    teamCardStage: state.stage,
    teamCardDay: state.day,
    teamCardMatchNo: state.matchNo
  };
  Object.entries(map).forEach(([id, value]) => {
    if(value && optionExists(id, value)) el(id).value = value;
  });
}
function getPersistentScrollState(){
  const tableScrolls = [];
  document.querySelectorAll('.table-wrap').forEach((node, idx) => {
    tableScrolls.push({ idx, key: tableScrollKey(node, idx), left: node.scrollLeft || 0, top: node.scrollTop || 0 });
  });
  return {
    pageX: window.scrollX || document.documentElement.scrollLeft || 0,
    pageY: window.scrollY || document.documentElement.scrollTop || 0,
    tableScrolls,
    teamModalScroll: document.querySelector('.team-modal-body')?.scrollTop || 0,
    liveFeedScroll: el('liveFeedBox')?.scrollTop || 0
  };
}
function restorePersistentScrollState(state, attempt = 0){
  if(!state || typeof state !== 'object') return;
  if(typeof state.pageX === 'number' || typeof state.pageY === 'number'){
    window.scrollTo(state.pageX || 0, state.pageY || 0);
    document.documentElement.scrollTop = state.pageY || 0;
    if(document.body) document.body.scrollTop = state.pageY || 0;
  }
  const tableByKey = new Map((state.tableScrolls || []).map(item => [item.key, item]));
  document.querySelectorAll('.table-wrap').forEach((node, idx) => {
    const key = tableScrollKey(node, idx);
    const saved = tableByKey.get(key) || (state.tableScrolls || []).find(x => x.idx === idx);
    if(saved){
      node.scrollLeft = saved.left || 0;
      node.scrollTop = saved.top || 0;
    }
  });
  const teamBody = document.querySelector('.team-modal-body');
  if(teamBody) teamBody.scrollTop = state.teamModalScroll || 0;
  if(attempt < 4) requestAnimationFrame(() => restorePersistentScrollState(state, attempt + 1));
}
function getCurrentViewState(){
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    filters: getFilterState(),
    teamCardFilters: getTeamCardFilterState(),
    overallSort: getOverallSortState(),
    accordions: getAccordionState(),
    teamSearch: el('teamSearch')?.value || '',
    selectedTeam: CURRENT_TEAM || '',
    teamModal: {
      open: isTeamModalOpen(),
      tab: document.querySelector('.team-tab.active')?.dataset?.tab || 'overview'
    },
    teamCompare: readControlValue('teamCompareSelect', ''),
    liveFeed: {
      playerView: LIVE_FEED_PLAYER_VIEW || 'stats',
      activeTeam: LIVE_FEED_ACTIVE_TEAM_CODE || ''
    },
    resource: {
      kind: RESOURCE_MODAL_KIND || 'skills',
      search: el('resourceSearch')?.value || ''
    },
    theme: document.documentElement.getAttribute('data-accent') || 'blue',
    scroll: getPersistentScrollState()
  };
}
function saveViewStateNow(){
  if(EWC_RESTORING_VIEW_STATE) return;
  if(document.body?.classList?.contains('ewc-refreshing')) return;
  const state = getCurrentViewState();
  safeWriteJsonStorage(EWC_VIEW_STATE_KEY, state);
  // Keep the older filter key updated for backward compatibility.
  try{ localStorage.setItem(EWC_FILTER_STATE_KEY, JSON.stringify(state.filters)); }catch(_e){}
}
function queueSaveViewState(delay = 80){
  if(EWC_RESTORING_VIEW_STATE) return;
  if(EWC_VIEW_SAVE_TIMER) clearTimeout(EWC_VIEW_SAVE_TIMER);
  EWC_VIEW_SAVE_TIMER = setTimeout(saveViewStateNow, delay);
}

// Override the older filter save so every filter change also stores the full view.
function saveFilterState(){
  try{ localStorage.setItem(EWC_FILTER_STATE_KEY, JSON.stringify(getFilterState())); }catch(_e){}
  queueSaveViewState();
}

function isValidSavedTeam(teamCode){
  const team = norm(teamCode).toUpperCase();
  if(!team) return false;
  return getScopedTeamList().includes(team);
}
function restoreSelectedTeamFromView(state){
  const team = norm(state?.selectedTeam).toUpperCase();
  if(!team || !isValidSavedTeam(team)) return;

  if(state?.teamModal?.open){
    selectTeam(team, true);
    setTeamTab(state?.teamModal?.tab || 'overview');
    return;
  }

  CURRENT_TEAM = team;
  setText('selectedTeamChip', team);
  setText('selectedTeamChipModal', team);
  if(el('modalTeamSelect')){
    populateModalTeamSelect();
    if(optionExists('modalTeamSelect', team)) el('modalTeamSelect').value = team;
  }
  highlightActiveTile();
}
function restoreSavedViewAfterFilters(saved){
  if(!saved || typeof saved !== 'object') return;

  restoreAccordionState(saved.accordions);

  if(el('teamSearch')){
    el('teamSearch').value = saved.teamSearch || '';
    renderTeamGrid(saved.teamSearch || '', { silentRefresh:true });
  }

  if(saved.liveFeed?.playerView){
    LIVE_FEED_PLAYER_VIEW = normalizeLiveFeedPlayerView(saved.liveFeed.playerView);
    try{ localStorage.setItem(LIVE_FEED_PLAYER_VIEW_KEY, LIVE_FEED_PLAYER_VIEW); }catch(_e){}
    renderLiveFeed({ silentRefresh:true });
  }

  restoreSelectedTeamFromView(saved);

  if(saved.teamCompare && el('teamCompareSelect') && optionExists('teamCompareSelect', saved.teamCompare)){
    el('teamCompareSelect').value = saved.teamCompare;
    renderTeamHeadToHead?.();
  }

  restorePersistentScrollState(saved.scroll);
}

// Override initialization so the page prefers the full saved view, then falls back to legacy saved filters, then latest.
function initFiltersFromStorageOrLatest(){
  const savedView = safeReadJsonStorage(EWC_VIEW_STATE_KEY, null);
  const legacyFilters = safeReadJsonStorage(EWC_FILTER_STATE_KEY, null);
  EWC_PENDING_SAVED_VIEW_STATE = savedView;
  EWC_RESTORING_VIEW_STATE = true;

  try{
    if(savedView?.theme) document.documentElement.setAttribute('data-accent', savedView.theme);
    restoreOverallSortState(savedView?.overallSort);

    let applied = false;
    if(savedView?.filters) applied = applySavedFilterState(savedView.filters);
    else if(legacyFilters) applied = applySavedFilterState(legacyFilters);

    if(!applied){
      resetToLatest();
    }

    syncTeamCardFilterControls();
    restoreTeamCardFilterState(savedView?.teamCardFilters);
    restoreSavedViewAfterFilters(savedView);
  }finally{
    EWC_RESTORING_VIEW_STATE = false;
    queueSaveViewState(150);
  }
}

function wirePersistentViewState(){
  if(EWC_VIEW_STATE_WIRED) return;
  EWC_VIEW_STATE_WIRED = true;

  const saveSoon = () => queueSaveViewState();
  const saveAfterDom = () => setTimeout(saveSoon, 0);

  document.addEventListener('change', event => {
    const t = event.target;
    if(!t?.matches?.('select,input,textarea')) return;
    saveAfterDom();
  }, true);

  document.addEventListener('input', event => {
    const t = event.target;
    if(!t?.matches?.('#teamSearch,#resourceSearch,input[type="search"],input[type="text"],textarea')) return;
    queueSaveViewState(180);
  }, true);

  document.addEventListener('toggle', event => {
    if(event.target?.matches?.('details.accordion')) saveAfterDom();
  }, true);

  document.addEventListener('click', event => {
    const target = event.target?.closest?.('.team-tile,.team-tab,#overallSortDir,#resetFilters,#teamCardResetLatest,.theme-swatch,.live-feed-view-toggle,.live-feed-team-open,.live-feed-popup-close,#teamModalClose,#resourceModalClose,#itemDetailClose,[data-open-resource],[data-add-preset-slot],#presetResetBtn,.preset-slot,.preset-clear,.preset-change');
    if(target) saveAfterDom();
  }, true);

  window.addEventListener('scroll', () => queueSaveViewState(250), { passive:true });
  document.addEventListener('scroll', event => {
    if(event.target && event.target !== document) queueSaveViewState(250);
  }, true);
  window.addEventListener('beforeunload', saveViewStateNow);
}



/* ===== Data-only 5-second refresh: updates Supabase rows without rebuilding the whole page ===== */
const EWC_DATA_REFRESH_MS = 5000;
let EWC_DATA_REFRESH_TIMER = null;
let EWC_DATA_REFRESH_BUSY = false;
let EWC_LAST_DATA_SIGNATURE = '';
let EWC_LAST_USER_SCROLL_AT = 0;

function markUserScrollIntent(){
  if(document.body?.classList?.contains('ewc-refreshing')) return;
  EWC_LAST_USER_SCROLL_AT = Date.now();
}
window.addEventListener('wheel', markUserScrollIntent, { passive:true });
window.addEventListener('touchmove', markUserScrollIntent, { passive:true });
window.addEventListener('scroll', markUserScrollIntent, { passive:true, capture:true });
window.addEventListener('keydown', ev => {
  const keys = ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '];
  if(keys.includes(ev.key)) markUserScrollIntent();
}, { passive:true });
function isUserActivelyScrolling(){
  return Date.now() - EWC_LAST_USER_SCROLL_AT < 900;
}

function isUserEditingField(){
  const a = document.activeElement;
  if(!a) return false;
  const tag = (a.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea' || a.isContentEditable;
}
function getStableRowSignature(row){
  // Only include fields that affect visible stats/filter/team views.
  // This prevents harmless timestamp-only updates from causing scroll-resetting re-renders.
  const parts = [
    row?.id,
    getVal(row, KEYS.team), getVal(row, KEYS.player), getVal(row, KEYS.accountId),
    getVal(row, KEYS.tournament), getVal(row, KEYS.year), getVal(row, KEYS.week), getVal(row, KEYS.day), getVal(row, KEYS.matchNo), getVal(row, KEYS.matchId),
    getVal(row, KEYS.mode), getVal(row, KEYS.dataSource),
    getVal(row, KEYS.kills), getVal(row, KEYS.damage), getVal(row, KEYS.assists), getVal(row, KEYS.headshots), getVal(row, KEYS.shoots), getVal(row, KEYS.hits),
    getVal(row, KEYS.booyah), getVal(row, KEYS.killCount), getVal(row, KEYS.killingScore), getVal(row, KEYS.rankingScore),
    getVal(row, KEYS.petName), getVal(row, KEYS.petId), getVal(row, KEYS.loadouts),
    getVal(row, KEYS.rawSkillIds), getVal(row, KEYS.skillInfoId), getVal(row, KEYS.skillInfoName),
    ...(KEYS.skillIds || []).map(k => row?.[k])
  ];
  return parts.map(v => norm(v)).join('~');
}
function makeDataSignature(rows){
  if(!Array.isArray(rows) || !rows.length) return 'empty';
  const newest = rows[0] || {};
  const oldest = rows[rows.length - 1] || {};
  const sample = rows.slice(0, 80).map(getStableRowSignature).join('|');
  return `${rows.length}::${norm(newest.id)}::${norm(oldest.id)}::${sample}`;
}
function setStableHTML(node, html, signature = '', preserveHeight = false){
  if(!node) return false;
  const normalized = String(html ?? '');
  const sig = String(signature || normalized);
  if(node.dataset && node.dataset.stableSignature === sig) return false;

  const oldMinHeight = node.style.minHeight;
  if(preserveHeight){
    const h = node.offsetHeight;
    if(h > 0) node.style.minHeight = `${h}px`;
  }

  node.innerHTML = normalized;
  if(node.dataset) node.dataset.stableSignature = sig;

  if(preserveHeight){
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.style.minHeight = oldMinHeight || '';
      });
    });
  }
  return true;
}
function tableScrollKey(node, idx){
  const parentId = node.parentElement?.id || '';
  const grandId = node.parentElement?.parentElement?.id || '';
  const closestId = node.closest('[id]')?.id || '';
  return parentId || grandId || closestId || `idx:${idx}`;
}
function captureViewportAnchor(){
  const x = Math.max(12, Math.min(window.innerWidth - 12, Math.floor(window.innerWidth / 2)));
  const probes = [92, 132, 190, Math.floor(window.innerHeight * 0.42), Math.floor(window.innerHeight * 0.68)].filter(y => y > 0 && y < window.innerHeight);
  for(const y of probes){
    let node = document.elementFromPoint(x, y);
    if(!node) continue;
    if(node.nodeType !== 1) node = node.parentElement;
    if(!node || node.closest?.('.topbar,.team-modal-head,.team-modal-tabs,.team-resource-strip,.resource-modal-top,.item-detail-top')) continue;
    const anchor = node.closest?.('.section,details.accordion,.team-modal-body,.resource-modal-body,.item-detail-body,.live-feed-card,.team-tile,tr,.card,[id]') || node;
    if(!anchor || anchor === document.body || anchor === document.documentElement) continue;
    const rect = anchor.getBoundingClientRect();
    if(rect.height <= 0 || rect.width <= 0) continue;
    return { node: anchor, top: rect.top, left: rect.left };
  }
  return null;
}
function restorePageScrollPosition(state){
  if(!state) return;
  const x = state.pageX || 0;
  const y = state.pageY ?? state.docScrollTop ?? state.bodyScrollTop ?? 0;
  const anchor = state.anchor;
  try{
    if(anchor?.node?.isConnected){
      const rect = anchor.node.getBoundingClientRect();
      const deltaY = rect.top - anchor.top;
      const deltaX = rect.left - anchor.left;
      if(Math.abs(deltaY) > 0.5 || Math.abs(deltaX) > 0.5){
        window.scrollBy({ left: deltaX, top: deltaY, behavior: 'instant' });
      }
      return;
    }
    window.scrollTo({ left:x, top:y, behavior:'instant' });
  }catch(_e){
    if(anchor?.node?.isConnected){
      const rect = anchor.node.getBoundingClientRect();
      const deltaY = rect.top - anchor.top;
      const deltaX = rect.left - anchor.left;
      if(Math.abs(deltaY) > 0.5 || Math.abs(deltaX) > 0.5){
        window.scrollBy(deltaX, deltaY);
      }
      return;
    }
    window.scrollTo(x, y);
  }
  if(document.documentElement) document.documentElement.scrollTop = y;
  if(document.body) document.body.scrollTop = y;
}
function captureDashboardViewState(){
  const tableScrolls = [];
  document.querySelectorAll('.table-wrap').forEach((node, idx) => {
    tableScrolls.push({ idx, key: tableScrollKey(node, idx), left: node.scrollLeft, top: node.scrollTop });
  });

  const scrollables = [];
  document.querySelectorAll('[data-preserve-scroll], .team-modal-body, .resource-modal-body, .item-detail-body, .live-feed-players, .live-feed-popup-players').forEach((node, idx) => {
    const key = node.id || node.closest('[id]')?.id || `scrollable:${idx}`;
    scrollables.push({ idx, key, left: node.scrollLeft || 0, top: node.scrollTop || 0 });
  });

  return {
    pageX: window.scrollX || document.documentElement.scrollLeft || 0,
    pageY: window.scrollY || document.documentElement.scrollTop || 0,
    bodyScrollTop: document.body?.scrollTop || 0,
    docScrollTop: document.documentElement?.scrollTop || 0,
    anchor: captureViewportAnchor(),
    teamSearch: el('teamSearch')?.value || '',
    activeTab: document.querySelector('.team-tab.active')?.dataset?.tab || 'overview',
    teamModalOpen: isTeamModalOpen(),
    teamModalScroll: document.querySelector('.team-modal-body')?.scrollTop || 0,
    resourceModalOpen: (typeof isResourceModalOpen === 'function' ? isResourceModalOpen() : false),
    resourceSearch: el('resourceSearch')?.value || '',
    resourceScroll: document.querySelector('.resource-modal-body')?.scrollTop || 0,
    itemDetailOpen: (typeof isItemDetailOpen === 'function' ? isItemDetailOpen() : false),
    itemScroll: el('itemDetailBody')?.scrollTop || 0,
    tableScrolls,
    scrollables
  };
}
function restoreDashboardViewState(state, attempt = 0){
  if(!state) return;
  if(el('teamSearch')) el('teamSearch').value = state.teamSearch || '';
  if(el('resourceSearch')) el('resourceSearch').value = state.resourceSearch || '';
  if(state.teamModalOpen && typeof setTeamTab === 'function') setTeamTab(state.activeTab || 'overview');

  const teamBody = document.querySelector('.team-modal-body');
  if(teamBody) teamBody.scrollTop = state.teamModalScroll || 0;
  const resourceBody = document.querySelector('.resource-modal-body');
  if(resourceBody) resourceBody.scrollTop = state.resourceScroll || 0;
  if(el('itemDetailBody')) el('itemDetailBody').scrollTop = state.itemScroll || 0;

  const tableByKey = new Map((state.tableScrolls || []).map(item => [item.key, item]));
  document.querySelectorAll('.table-wrap').forEach((node, idx) => {
    const key = tableScrollKey(node, idx);
    const saved = tableByKey.get(key) || (state.tableScrolls || []).find(x => x.idx === idx);
    if(saved){
      node.scrollLeft = saved.left || 0;
      node.scrollTop = saved.top || 0;
    }
  });

  const scrollableByKey = new Map((state.scrollables || []).map(item => [item.key, item]));
  document.querySelectorAll('[data-preserve-scroll], .team-modal-body, .resource-modal-body, .item-detail-body, .live-feed-players, .live-feed-popup-players').forEach((node, idx) => {
    const key = node.id || node.closest('[id]')?.id || `scrollable:${idx}`;
    const saved = scrollableByKey.get(key) || (state.scrollables || []).find(x => x.idx === idx);
    if(saved){
      node.scrollLeft = saved.left || 0;
      node.scrollTop = saved.top || 0;
    }
  });

  restorePageScrollPosition(state);

  // New images/cards can change height a frame later, so restore more than once.
  if(attempt < 3){
    requestAnimationFrame(() => restoreDashboardViewState(state, attempt + 1));
  }
}



function captureFilterControlState(){
  const ids = [
    'fTournament','fStage','fMode','fSource','fYear','fWeek','fDay','fMatchNo',
    'teamCardTournament','teamCardStage','teamCardDay','teamCardMatchNo'
  ];
  const controls = {};
  ids.forEach(id => {
    const node = el(id);
    if(node) controls[id] = { value: node.value, html: node.innerHTML, scrollLeft: node.scrollLeft || 0, scrollTop: node.scrollTop || 0 };
  });
  return controls;
}
function restoreFilterControlState(state){
  if(!state) return;
  Object.entries(state).forEach(([id, item]) => {
    const node = el(id);
    if(!node || !item) return;
    if(typeof item.html === 'string' && node.innerHTML !== item.html) node.innerHTML = item.html;
    if([...node.options].some(o => o.value === item.value)) node.value = item.value;
    node.scrollLeft = item.scrollLeft || 0;
    node.scrollTop = item.scrollTop || 0;
  });
}
function getRefreshLockedFilterSignature(){
  const f = currentFilterSnapshot();
  return [f.t,f.s,f.mode,f.source,f.y,f.w,f.d,f.m].join('::');
}
function currentFilterSnapshot(){
  return {
    t: el('fTournament')?.value || '__all__',
    s: el('fStage')?.value || '__all__',
    mode: el('fMode')?.value || '__all__',
    source: el('fSource')?.value || '__all__',
    y: el('fYear')?.value || '__all__',
    w: el('fWeek')?.value || '__all__',
    d: el('fDay')?.value || '__all__',
    m: el('fMatchNo')?.value || '__all__'
  };
}
function setSelectValueIfAvailable(id, value){
  const node = el(id);
  if(!node) return;
  node.value = [...node.options].some(o => o.value === value) ? value : '__all__';
}
function rebuildFilterOptionsPreservingCurrent(){
  const f = currentFilterSnapshot();
  populateTopDropdowns();
  setSelectValueIfAvailable('fTournament', f.t);
  refreshCascadeOptions('tournament');
  setSelectValueIfAvailable('fStage', f.s);
  setSelectValueIfAvailable('fMode', f.mode);
  setSelectValueIfAvailable('fSource', f.source);
  refreshCascadeOptions('tournament');
  setSelectValueIfAvailable('fYear', f.y);
  refreshCascadeOptions('year');
  setSelectValueIfAvailable('fWeek', f.w);
  refreshCascadeOptions('week');
  setSelectValueIfAvailable('fDay', f.d);
  refreshCascadeOptions('day');
  setSelectValueIfAvailable('fMatchNo', f.m);
}
async function refreshDataOnly(){
  if(EWC_DATA_REFRESH_BUSY) return;
  if(document.hidden) return;
  if(isUserEditingField()) return;
  if(isUserActivelyScrolling()) return;

  EWC_DATA_REFRESH_BUSY = true;
  let state = null;
  let lockedFilters = null;
  let beforeFilterSig = '';

  try{
    const activeSession = await requireSecureSession();
    if(!activeSession) return;

    const freshRows = await withTimeout(fetchAllRows(), 45000, 'Live refresh data fetch timed out');
    if(!freshRows?.length) return;

    const newSignature = makeDataSignature(freshRows);
    if(newSignature === EWC_LAST_DATA_SIGNATURE) return;
    EWC_LAST_DATA_SIGNATURE = newSignature;

    // Capture scroll/filter state only after the async fetch is done, right before
    // the DOM update. This prevents auto-refresh from pulling the user back to an
    // older scroll position if they scrolled while Supabase was loading.
    if(isUserEditingField()) return;
    if(isUserActivelyScrolling()) return;
    state = captureDashboardViewState();
    beforeFilterSig = getRefreshLockedFilterSignature();
    lockedFilters = captureFilterControlState();

    document.body.classList.add('ewc-refreshing');

    RAW = freshRows;

    // Do not rebuild cascade options during live refresh. Rebuilding options can
    // reset dropdowns to "All" or resync team-card filters while a game is ongoing.
    restoreFilterControlState(lockedFilters);
    applyFilters({ silentRefresh:true, updateOnlyLiveAndSummary:true });
    restoreFilterControlState(lockedFilters);

    // Safety guard: if any downstream code tried to alter the filter selection,
    // restore it immediately. This keeps live refresh data-only for filters.
    if(getRefreshLockedFilterSignature() !== beforeFilterSig) restoreFilterControlState(lockedFilters);

    // During auto-refresh, do not re-render selected team cards/modals/team grids.
    // Those can be manually refreshed by changing filters or reopening a team.
    restoreDashboardViewState(state);
  }catch(err){
    console.warn('Data-only refresh failed:', err?.message || err);
  }finally{
    requestAnimationFrame(() => {
      if(lockedFilters) restoreFilterControlState(lockedFilters);
      if(state) restoreDashboardViewState(state);
      document.body.classList.remove('ewc-refreshing');
      EWC_DATA_REFRESH_BUSY = false;
    });
  }
}


function startDataOnlyAutoRefresh(){
  EWC_LAST_DATA_SIGNATURE = makeDataSignature(RAW);
  if(EWC_DATA_REFRESH_TIMER) clearInterval(EWC_DATA_REFRESH_TIMER);
  EWC_DATA_REFRESH_TIMER = setInterval(refreshDataOnly, EWC_DATA_REFRESH_MS);
  window.addEventListener('beforeunload', () => {
    if(EWC_DATA_REFRESH_TIMER) clearInterval(EWC_DATA_REFRESH_TIMER);
  });
}

async function init(){
  let loadWatchdog = null;
  try{
    clearErr(); el('veil').classList.remove('hide');
    loadWatchdog = setTimeout(() => {
      try{
        el('veil').classList.add('hide');
        gerr('Dashboard load is taking too long. This usually means the Supabase request is blocked, the session expired, or a selected column is unavailable. Refresh after signing in, or check the browser console for the exact Supabase error.');
      }catch(_e){}
    }, 55000);
    const activeSession = await withTimeout(requireSecureSession(), 12000, 'Login check timed out');
    if(!activeSession){
      if(loadWatchdog) clearTimeout(loadWatchdog);
      el('veil').classList.add('hide');
      gerr('Login/session is inactive, so the dashboard cannot load protected Supabase data. The page will not auto-logout anymore; use index.html only if you need to sign in again.');
      return;
    }
    await withTimeout(headCount(), 15000, 'Row count timed out').catch(e => console.warn(e?.message || e));
    setText('diagLoaded', 'Loading rows from Supabase…');
    RAW = await withTimeout(fetchAllRows(), 45000, 'Data load timed out. Check Supabase/RLS or try reducing MAX_ROWS_TO_LOAD.');
    setText('diagLoaded', `Loaded: ${RAW.length} rows • ${DASHBOARD_SELECT_COLS.length || 'safe'} selected columns${RAW.length >= MAX_ROWS_TO_LOAD ? ' (latest-row limit reached)' : ''}`);
    if(!RAW.length){
      if(loadWatchdog) clearTimeout(loadWatchdog);
      el('veil').classList.add('hide');
      gerr(`No rows returned from ${TABLE}.\n\nPossible causes:\n• Table is empty\n• RLS blocks SELECT\n• You are writing to another schema/table\n\nQuick check in Supabase SQL editor:\nselect count(*) from public.${TABLE};`);
      return;
    }
    detectSchema(RAW[0]);
    await loadMatchApi();
    await loadCharacterJson();
    await Promise.all([loadPetJson(), loadLoadoutJson(), loadWeaponJson(), loadTeamLogosJson()]);
    updateSkillDiagnostics();
    updateSkillLookupDiagnostics();
    populateTopDropdowns();
    initFiltersFromStorageOrLatest();
    wire();
    wireColorThemeControls();
    wireTeamCardFilterControls();
    wirePersistentViewState();
    const url = new URL(window.location.href); const qt=(url.searchParams.get('team')||'').trim().toUpperCase();
    if(qt){ const teams=new Set(FILTERED.map(r=>norm(getVal(r,KEYS.team)).toUpperCase()).filter(Boolean)); if(teams.has(qt)) selectTeam(qt,false); }
    startDataOnlyAutoRefresh();
    document.body.classList.add('ewc-live-ready');
    if(loadWatchdog) clearTimeout(loadWatchdog);
    el('veil').classList.add('hide');
  }catch(e){ if(loadWatchdog) clearTimeout(loadWatchdog); el('veil').classList.add('hide'); gerr('Fatal init error:\n\n' + (e?.message || e)); }
}
init();
