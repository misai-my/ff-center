'use strict';

const SUPABASE_URL = 'https://ooutjrewmwsixghbouxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXRqcmV3bXdzaXhnaGJvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjg3NTMsImV4cCI6MjA4MjYwNDc1M30.13WkdGiQH39lZH3iDgVDd_tZrHlI0twhGeiZNdwaMSg';
const HISTORICAL_KEY_STORAGE_KEY = 'ffdc_historical_anon_key';
const TEAM_IDENTITY_STORAGE_KEY = 'ffdc_team_identity_mappings_v1';
const TEAM_IDENTITY_TABLE = 'team_identity';
const TEAM_ALIAS_TABLE = 'team_alias';
const DEFAULT_LIVE_TABLE = 'ff_player_stats_raw';
const DEFAULT_HISTORICAL_TABLE = 'ffbr_data';
const CHUNK_SIZE = 1000;
const MAX_ROWS = 50000;

const noWaitAuthLock = async (_name, _acquireTimeout, fn) => await fn();
const liveClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: noWaitAuthLock }
    })
  : null;

const $ = id => document.getElementById(id);
const els = {
  loading: $('loadingScreen'), notice: $('pageNotice'), retry: $('retryInitBtn'), adminUser: $('adminUser'), themeToggle: $('themeToggle'), logout: $('logoutBtn'),
  sourceMode: $('sourceModeInput'), sourceTable: $('sourceTableInput'), historicalKeyField: $('historicalKeyField'), historicalKey: $('historicalKeyInput'), loadTeams: $('loadTeamsBtn'),
  status: $('identityStatus'), statusGrid: $('statusGrid'), statTeams: $('statTeams'), statSelected: $('statSelected'), statIdentities: $('statIdentities'), statAliases: $('statAliases'),
  toolbar: $('teamToolbar'), board: $('teamBoard'), search: $('teamSearchInput'), fTournament: $('filterTournament'), fYear: $('filterYear'), fSeason: $('filterSeason'),
  selectVisible: $('selectVisibleBtn'), clearSelected: $('clearSelectedBtn'),
  identitySelect: $('identitySelect'), canonicalName: $('canonicalNameInput'), canonicalTag: $('canonicalTagInput'), region: $('regionInput'), country: $('countryInput'), validFrom: $('validFromInput'), validTo: $('validToInput'), notes: $('notesInput'), guess: $('guessIdentityBtn'), save: $('saveAliasesBtn'), reload: $('reloadMappingsBtn'), identityList: $('identityList'),
  loginModal: $('adminLoginModal'), loginForm: $('adminLoginForm'), loginEmail: $('adminLoginEmail'), loginPassword: $('adminLoginPassword'), loginMessage: $('adminLoginMessage'), loginSubmit: $('adminLoginSubmit'), passwordToggle: $('adminPasswordToggle')
};

const state = {
  session: null,
  rows: [],
  teams: new Map(),
  visibleKeys: [],
  selected: new Set(),
  identities: [],
  aliases: [],
  sourceMode: 'live',
  sourceTable: DEFAULT_LIVE_TABLE,
  sharedSaveReady: false
};

function norm(value){ return String(value ?? '').trim(); }
function keyText(value){ return norm(value).toUpperCase().replace(/\s+/g, ' '); }
function safeText(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function makeId(){ return (crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`); }
function normalizeSourceMode(value){
  const v = norm(value).toLowerCase();
  return (!v || v === 'all' || v === 'any' || v === '__all__') ? '*' : v;
}
function normalizeSourceTable(value){
  let v = norm(value).toLowerCase();
  if(!v || v === 'all' || v === 'any' || v === '__all__') return '*';
  if(v.includes('.')) v = v.split('.').pop();
  return v || '*';
}
function aliasKeyFor({source_mode, source_table, alias_name, alias_tag, tournament='', season='', valid_from_year='', valid_to_year=''}){
  return [normalizeSourceMode(source_mode), normalizeSourceTable(source_table), keyText(alias_name), keyText(alias_tag), norm(tournament), norm(season), norm(valid_from_year), norm(valid_to_year)].join('::');
}
function showNotice(message, type=''){
  if(!els.notice) return;
  els.notice.hidden = !message;
  els.notice.textContent = message || '';
  els.notice.className = `notice${type ? ` ${type}` : ''}`;
}
function setLoading(message='Loading Team Identity Manager…', visible=true){
  if(!els.loading) return;
  const strong = els.loading.querySelector('strong');
  if(strong && message) strong.textContent = message;
  els.loading.classList.toggle('hide', !visible);
}
function setBusy(button, busy, text){
  if(!button) return;
  if(busy){ button.dataset.originalText = button.textContent; button.textContent = text || 'Working…'; button.disabled = true; }
  else { button.textContent = button.dataset.originalText || button.textContent; button.disabled = false; }
}
function withTimeout(promise, ms, label='Request'){
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms/1000)} seconds.`)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
function decodeJwtPayload(token){
  try{
    const payload = String(token || '').split('.')[1];
    if(!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(padded));
  }catch(_e){ return null; }
}
function isServiceRoleKey(token){ return decodeJwtPayload(token)?.role === 'service_role'; }

function getHistoricalConfig(){
  const configured = window.FFDC_DATA_SOURCES?.historical || {};
  return {
    url: configured.url || 'https://gkugecflfddkpitlrmws.supabase.co',
    anonKey: els.historicalKey?.value.trim() || localStorage.getItem(HISTORICAL_KEY_STORAGE_KEY) || configured.anonKey || '',
    table: els.sourceTable?.value.trim() || configured.table || DEFAULT_HISTORICAL_TABLE
  };
}
function getSourceConfig(){
  const mode = els.sourceMode.value === 'historical' ? 'historical' : 'live';
  if(mode === 'historical'){
    const cfg = getHistoricalConfig();
    return { mode, label: 'Historical Supabase (ffbr_data)', url: cfg.url, anonKey: cfg.anonKey, table: cfg.table || DEFAULT_HISTORICAL_TABLE };
  }
  return { mode, label: 'Live Supabase', url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, table: els.sourceTable?.value.trim() || DEFAULT_LIVE_TABLE };
}
function sourceKey(mode=state.sourceMode, table=state.sourceTable){ return `${normalizeSourceMode(mode)}::${normalizeSourceTable(table)}`; }
function saveLocalMappings(){
  const payload = {
    savedAt: new Date().toISOString(),
    identities: state.identities,
    aliases: state.aliases.map(alias => ({
      ...alias,
      team_identity: state.identities.find(id => id.id === alias.team_identity_id) || alias.team_identity || null
    }))
  };
  localStorage.setItem(TEAM_IDENTITY_STORAGE_KEY, JSON.stringify(payload));
}
function readLocalMappings(){
  try{
    const payload = JSON.parse(localStorage.getItem(TEAM_IDENTITY_STORAGE_KEY) || '{}');
    return {
      identities: Array.isArray(payload.identities) ? payload.identities : [],
      aliases: Array.isArray(payload.aliases) ? payload.aliases : []
    };
  }catch(_e){ return { identities: [], aliases: [] }; }
}

function setLoginMessage(message, type=''){
  if(!els.loginMessage) return;
  els.loginMessage.hidden = !message;
  els.loginMessage.textContent = message || '';
  els.loginMessage.className = `auth-message${type ? ` ${type}` : ''}`;
}
function showAdminLogin(message=''){
  setLoading('', false);
  els.loginModal?.classList.add('show');
  els.loginModal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setLoginMessage(message);
  setTimeout(() => els.loginEmail?.focus(), 50);
}
function hideAdminLogin(){
  els.loginModal?.classList.remove('show');
  els.loginModal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  setLoginMessage('');
}
async function handleAdminLogin(event){
  event.preventDefault();
  const email = els.loginEmail?.value.trim();
  const password = els.loginPassword?.value || '';
  if(!email || !password) return setLoginMessage('Enter both email and password.', 'error');
  setBusy(els.loginSubmit, true, 'Signing in…');
  try{
    const { error } = await liveClient.auth.signInWithPassword({ email, password });
    if(error) throw error;
    hideAdminLogin();
    await initializePage();
  }catch(error){
    console.error(error);
    setLoginMessage(error.message || 'Unable to sign in.', 'error');
  }finally{
    setBusy(els.loginSubmit, false);
  }
}
async function requireAdmin(){
  if(!liveClient){ showAdminLogin('Supabase library is unavailable.'); return false; }
  setLoading('Checking your sign-in…', true);
  const { data: { session }, error } = await withTimeout(liveClient.auth.getSession(), 9000, 'Session check');
  if(error) throw error;
  if(!session){ showAdminLogin(); return false; }
  state.session = session;
  els.adminUser.textContent = session.user.email || 'Signed in';
  setLoading('Confirming administrator access…', true);
  const { data, error: adminError } = await withTimeout(liveClient.rpc('is_app_admin'), 9000, 'Administrator check');
  if(adminError) throw new Error(`Admin check failed: ${adminError.message}. Run supabase/03_group_assignment_admin.sql first.`);
  if(!data){ showNotice('This account is not listed in app_admins.', 'error'); setLoading('', false); return false; }
  return true;
}

async function sampleColumns(client, table){
  const orderCandidates = ['pulled_at','id','created_at','updated_at'];
  for(const col of orderCandidates){
    try{
      const { data, error } = await withTimeout(client.from(table).select('*').order(col, { ascending:false }).limit(1), 9000, `Schema sample ${col}`);
      if(!error && data?.[0]) return Object.keys(data[0]);
    }catch(_e){}
  }
  const { data, error } = await withTimeout(client.from(table).select('*').limit(1), 9000, 'Schema sample');
  if(error) throw error;
  return data?.[0] ? Object.keys(data[0]) : [];
}
function pickKey(keys, patterns){ return keys.find(k => patterns.some(p => p.test(k))) || ''; }
function getRowValue(row, key){ return key ? row?.[key] : ''; }
function uniq(values){ return [...new Set(values.map(norm).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b), undefined, { numeric:true })); }
function setOptions(select, values){
  if(!select) return;
  const current = select.value || '__all__';
  select.innerHTML = '<option value="__all__">All</option>' + values.map(v => `<option value="${safeText(v)}">${safeText(v)}</option>`).join('');
  select.value = [...select.options].some(o => o.value === current) ? current : '__all__';
}
async function fetchRows(client, table, selectCols, orderCols){
  const out = [];
  const selectList = selectCols.join(',');
  for(const orderCol of orderCols){
    out.length = 0;
    let ok = true;
    for(let from=0; from<MAX_ROWS;){
      let q = client.from(table).select(selectList).range(from, from + CHUNK_SIZE - 1);
      if(orderCol) q = q.order(orderCol, { ascending:false });
      const { data, error } = await withTimeout(q, 18000, `Team fetch ${orderCol || 'unordered'}`);
      if(error){ ok = false; console.warn(`Team fetch failed ordering by ${orderCol}:`, error.message || error); break; }
      const rows = data || [];
      out.push(...rows);
      if(rows.length < CHUNK_SIZE) break;
      from += rows.length;
      if(out.length >= MAX_ROWS) break;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if(ok) return out.slice(0, MAX_ROWS);
  }
  throw new Error('Unable to read team rows from the selected table.');
}
function teamFromRow(row, keys){
  const name = norm(getRowValue(row, keys.team) || getRowValue(row, keys.teamNameAlt) || getRowValue(row, keys.teamAlt));
  const tag = norm(getRowValue(row, keys.tag) || getRowValue(row, keys.teamId));
  const key = keyText(name || tag);
  if(!key) return null;
  return {
    key,
    name: name || tag,
    tag,
    tournament: norm(getRowValue(row, keys.tournament)),
    stage: norm(getRowValue(row, keys.stage)),
    year: norm(getRowValue(row, keys.year)),
    season: norm(getRowValue(row, keys.season)),
    group: norm(getRowValue(row, keys.group))
  };
}
function normalizeIdentity(row){
  if(!row) return null;
  return {
    id: row.id || makeId(),
    canonical_name: keyText(row.canonical_name || row.name || row.team_identity?.canonical_name || ''),
    canonical_tag: keyText(row.canonical_tag || row.team_identity?.canonical_tag || ''),
    region: norm(row.region || row.team_identity?.region || ''),
    country: norm(row.country || row.team_identity?.country || ''),
    notes: norm(row.notes || row.team_identity?.notes || '')
  };
}
function normalizeAlias(row){
  if(!row) return null;
  const identity = normalizeIdentity(row.team_identity || row.identity || row);
  const alias = {
    id: row.id || makeId(),
    team_identity_id: row.team_identity_id || identity?.id || '',
    source_mode: normalizeSourceMode(row.source_mode || row.sourceMode || '*'),
    source_table: normalizeSourceTable(row.source_table || row.sourceTable || '*'),
    alias_name: keyText(row.alias_name || row.team || row.name || ''),
    alias_tag: keyText(row.alias_tag || row.tag || ''),
    alias_key: norm(row.alias_key || ''),
    valid_from_year: row.valid_from_year ?? null,
    valid_to_year: row.valid_to_year ?? null,
    tournament: norm(row.tournament || ''),
    season: norm(row.season || ''),
    notes: norm(row.notes || ''),
    team_identity: identity
  };
  alias.alias_key = alias.alias_key || aliasKeyFor(alias);
  return alias.alias_name && alias.team_identity_id ? alias : null;
}
function findAliasForTeam(team){
  const teamName = keyText(team?.name);
  const teamTag = keyText(team?.tag);
  const keyVariants = [
    aliasKeyFor({source_mode:state.sourceMode, source_table:state.sourceTable, alias_name:teamName, alias_tag:teamTag}),
    aliasKeyFor({source_mode:state.sourceMode, source_table:state.sourceTable, alias_name:teamName, alias_tag:''}),
    aliasKeyFor({source_mode:state.sourceMode, source_table:'*', alias_name:teamName, alias_tag:teamTag}),
    aliasKeyFor({source_mode:state.sourceMode, source_table:'*', alias_name:teamName, alias_tag:''}),
    aliasKeyFor({source_mode:'*', source_table:state.sourceTable, alias_name:teamName, alias_tag:teamTag}),
    aliasKeyFor({source_mode:'*', source_table:state.sourceTable, alias_name:teamName, alias_tag:''}),
    aliasKeyFor({source_mode:'*', source_table:'*', alias_name:teamName, alias_tag:teamTag}),
    aliasKeyFor({source_mode:'*', source_table:'*', alias_name:teamName, alias_tag:''})
  ];
  return state.aliases.find(alias => keyVariants.includes(alias.alias_key)) || state.aliases.find(alias => alias.alias_name === teamName && (!alias.alias_tag || !teamTag || alias.alias_tag === teamTag));
}
function mergeIdentityRows(...groups){
  const byId = new Map();
  const byName = new Map();
  for(const group of groups){
    for(const raw of group || []){
      const identity = normalizeIdentity(raw);
      if(!identity?.canonical_name) continue;
      const idKey = identity.id || '';
      const nameKey = `${identity.canonical_name}::${identity.canonical_tag || ''}`;
      if(idKey && byId.has(idKey)) Object.assign(byId.get(idKey), { ...identity, ...byId.get(idKey) });
      else if(byName.has(nameKey)) Object.assign(byName.get(nameKey), { ...identity, ...byName.get(nameKey) });
      else {
        byId.set(identity.id, identity);
        byName.set(nameKey, identity);
      }
    }
  }
  return [...new Set([...byId.values(), ...byName.values()])];
}
function mergeAliasRows(...groups){
  const byKey = new Map();
  for(const group of groups){
    for(const raw of group || []){
      const alias = normalizeAlias(raw);
      if(!alias) continue;
      byKey.set(alias.alias_key || aliasKeyFor(alias), alias);
    }
  }
  return [...byKey.values()];
}
function buildCanonicalAliasRows(identities){
  return (identities || []).map(identity => ({
    id: `canonical-${identity.id || identity.canonical_name}`,
    team_identity_id: identity.id,
    source_mode: '*',
    source_table: '*',
    alias_name: identity.canonical_name,
    alias_tag: identity.canonical_tag || '',
    team_identity: identity
  }));
}
async function loadMappings(){
  let loadedRemote = false;
  let remoteIdentities = [];
  let remoteAliases = [];
  const local = readLocalMappings();
  try{
    const [identityRes, aliasRes] = await Promise.all([
      withTimeout(liveClient.from(TEAM_IDENTITY_TABLE).select('*').order('canonical_name', { ascending:true }).limit(5000), 9000, 'Identity load'),
      withTimeout(liveClient.from(TEAM_ALIAS_TABLE).select('*,team_identity:team_identity_id(*)').order('alias_name', { ascending:true }).limit(10000), 9000, 'Alias load')
    ]);
    if(identityRes.error) throw identityRes.error;
    if(aliasRes.error) throw aliasRes.error;
    remoteIdentities = identityRes.data || [];
    remoteAliases = aliasRes.data || [];
    state.sharedSaveReady = true;
    loadedRemote = true;
  }catch(error){
    console.warn('Remote identity relation load failed, retrying without embedded relationship:', error?.message || error);
    try{
      const [identityRes, aliasRes] = await Promise.all([
        withTimeout(liveClient.from(TEAM_IDENTITY_TABLE).select('*').order('canonical_name', { ascending:true }).limit(5000), 9000, 'Identity fallback load'),
        withTimeout(liveClient.from(TEAM_ALIAS_TABLE).select('id,team_identity_id,source_mode,source_table,alias_name,alias_tag,alias_key,valid_from_year,valid_to_year,tournament,season,notes').order('alias_name', { ascending:true }).limit(10000), 9000, 'Alias fallback load')
      ]);
      if(identityRes.error) throw identityRes.error;
      if(aliasRes.error) throw aliasRes.error;
      remoteIdentities = identityRes.data || [];
      const identityById = new Map(remoteIdentities.map(identity => [identity.id, identity]));
      remoteAliases = (aliasRes.data || []).map(alias => ({ ...alias, team_identity: identityById.get(alias.team_identity_id) || null }));
      state.sharedSaveReady = true;
      loadedRemote = true;
    }catch(fallbackError){
      console.warn('Remote identity tables unavailable. Local fallback enabled:', fallbackError?.message || fallbackError);
      state.sharedSaveReady = false;
    }
  }

  const identityRowsFromAliases = [
    ...remoteAliases.map(alias => alias.team_identity).filter(Boolean),
    ...(local.aliases || []).map(alias => alias.team_identity).filter(Boolean)
  ];
  state.identities = mergeIdentityRows(remoteIdentities, local.identities, identityRowsFromAliases);
  const identityById = new Map(state.identities.map(identity => [identity.id, identity]));
  const localAliases = (local.aliases || []).map(alias => ({
    ...alias,
    team_identity: alias.team_identity || identityById.get(alias.team_identity_id) || null
  }));
  state.aliases = mergeAliasRows(remoteAliases, localAliases, buildCanonicalAliasRows(state.identities));
  saveLocalMappings();
  renderIdentitySelect();
  renderIdentityList();
  updateStats();
  const localNote = local.aliases?.length ? ` Local backup also loaded: ${local.aliases.length} aliases.` : '';
  showNotice(loadedRemote ? `Team identity mappings loaded from Supabase.${localNote}` : 'Team identity tables are not installed yet. Local browser fallback is active. Run supabase/10_team_identity_aliases.sql for shared saves.', loadedRemote ? 'success' : 'warn');
}

async function loadTeams(){
  const cfg = getSourceConfig();
  if(cfg.mode === 'historical'){
    if(!cfg.anonKey) throw new Error('Historical mode needs a PUBLIC anon key in assets/js/data-source-config.js or this page input.');
    if(isServiceRoleKey(cfg.anonKey)) throw new Error('The historical key provided is a service_role key. Use the public anon key only.');
    localStorage.setItem(HISTORICAL_KEY_STORAGE_KEY, cfg.anonKey);
  }
  state.sourceMode = cfg.mode;
  state.sourceTable = cfg.table;
  const dataClient = window.supabase.createClient(cfg.url, cfg.anonKey, { auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } });
  setLoading(`Reading ${cfg.label} • ${cfg.table}…`, true);
  const columns = await sampleColumns(dataClient, cfg.table);
  if(!columns.length) throw new Error(`No readable columns found in ${cfg.table}.`);
  const keys = {
    team: pickKey(columns, [/^team_name$/i, /^team$/i, /^Team$/]),
    teamAlt: pickKey(columns, [/^TEAM$/]),
    teamNameAlt: pickKey(columns, [/^player_stats_team_name$/i]),
    tag: pickKey(columns, [/^tag$/i, /^team_tag$/i, /^team_code$/i]),
    teamId: pickKey(columns, [/^team_id$/i, /^player_stats_team_id$/i]),
    tournament: pickKey(columns, [/^Tournament$/i, /^tournament$/i]),
    stage: pickKey(columns, [/^Stage$/i, /^stage$/i]),
    year: pickKey(columns, [/^Year$/i, /^year$/i]),
    season: pickKey(columns, [/^Season$/i, /^season$/i]),
    group: pickKey(columns, [/^Group$/i, /^group$/i, /^group_code$/i])
  };
  if(!keys.team && !keys.teamAlt && !keys.teamNameAlt && !keys.tag) throw new Error('This table does not include a recognizable team column.');
  const wanted = [...new Set(Object.values(keys).filter(Boolean))];
  const orderCols = ['pulled_at','id','created_at','updated_at'].filter(c => columns.includes(c));
  orderCols.push('');
  const rows = await fetchRows(dataClient, cfg.table, wanted, orderCols);
  state.rows = rows;
  state.teams.clear();
  rows.forEach(row => {
    const item = teamFromRow(row, keys);
    if(!item) return;
    if(!state.teams.has(item.key)) state.teams.set(item.key, { ...item, rows:0, tournaments:new Set(), stages:new Set(), years:new Set(), seasons:new Set(), groups:new Set() });
    const existing = state.teams.get(item.key);
    existing.rows += 1;
    if(item.tournament) existing.tournaments.add(item.tournament);
    if(item.stage) existing.stages.add(item.stage);
    if(item.year) existing.years.add(item.year);
    if(item.season) existing.seasons.add(item.season);
    if(item.group) existing.groups.add(item.group);
    if(!existing.tag && item.tag) existing.tag = item.tag;
  });
  [...state.teams.values()].forEach(team => {
    team.tournaments = [...team.tournaments].sort();
    team.stages = [...team.stages].sort();
    team.years = [...team.years].sort();
    team.seasons = [...team.seasons].sort();
    team.groups = [...team.groups].sort();
  });
  setOptions(els.fTournament, uniq([...state.teams.values()].flatMap(t => t.tournaments)));
  setOptions(els.fYear, uniq([...state.teams.values()].flatMap(t => t.years)));
  setOptions(els.fSeason, uniq([...state.teams.values()].flatMap(t => t.seasons)));
  els.toolbar.hidden = false;
  els.statusGrid.hidden = false;
  els.status.textContent = `${state.teams.size} teams loaded`;
  renderTeams();
  updateStats();
  setLoading('', false);
  showNotice(`${state.teams.size} unique teams loaded from ${cfg.label} • ${cfg.table}.`, 'success');
}
function teamPassesFilters(team){
  const q = norm(els.search.value).toLowerCase();
  if(q && !`${team.name} ${team.tag}`.toLowerCase().includes(q)) return false;
  const tournament = els.fTournament.value || '__all__';
  const year = els.fYear.value || '__all__';
  const season = els.fSeason.value || '__all__';
  if(tournament !== '__all__' && !team.tournaments.includes(tournament)) return false;
  if(year !== '__all__' && !team.years.includes(year)) return false;
  if(season !== '__all__' && !team.seasons.includes(season)) return false;
  return true;
}
function renderTeams(){
  const teams = [...state.teams.values()].filter(teamPassesFilters).sort((a,b)=>a.name.localeCompare(b.name));
  state.visibleKeys = teams.map(t => t.key);
  if(!teams.length){
    els.board.innerHTML = '<div class="empty-state">No teams match the current filters.</div>';
    updateStats();
    return;
  }
  els.board.innerHTML = teams.map(team => {
    const mapped = findAliasForTeam(team);
    const identity = mapped?.team_identity || state.identities.find(id => id.id === mapped?.team_identity_id);
    return `<label class="identity-team-card ${state.selected.has(team.key) ? 'selected' : ''}">
      <input type="checkbox" data-team-key="${safeText(team.key)}" ${state.selected.has(team.key) ? 'checked' : ''} />
      <span>
        <span class="identity-team-name">${safeText(team.name)}</span>
        ${team.tag ? `<span class="mapped-target">Tag: <b>${safeText(team.tag)}</b></span>` : ''}
        ${identity ? `<span class="mapped-target">Mapped to <b>${safeText(identity.canonical_name)}</b></span>` : '<span class="mapped-target">Unmapped</span>'}
        <span class="identity-team-meta">
          <span class="mini-chip">${team.rows} rows</span>
          ${team.years.slice(0,3).map(v => `<span class="mini-chip">${safeText(v)}</span>`).join('')}
          ${team.seasons.slice(0,2).map(v => `<span class="mini-chip">${safeText(v)}</span>`).join('')}
          ${identity ? '<span class="mini-chip mapped">Mapped</span>' : ''}
        </span>
      </span>
    </label>`;
  }).join('');
  els.board.querySelectorAll('input[data-team-key]').forEach(input => {
    input.addEventListener('change', () => {
      const key = input.dataset.teamKey;
      if(input.checked) state.selected.add(key); else state.selected.delete(key);
      input.closest('.identity-team-card')?.classList.toggle('selected', input.checked);
      updateStats();
    });
  });
  updateStats();
}
function updateStats(){
  if(els.statTeams) els.statTeams.textContent = state.teams.size;
  if(els.statSelected) els.statSelected.textContent = state.selected.size;
  if(els.statIdentities) els.statIdentities.textContent = state.identities.length;
  if(els.statAliases) els.statAliases.textContent = state.aliases.length;
}
function renderIdentitySelect(){
  els.identitySelect.innerHTML = '<option value="">Create new identity…</option>' + state.identities
    .slice().sort((a,b)=>a.canonical_name.localeCompare(b.canonical_name))
    .map(identity => `<option value="${safeText(identity.id)}">${safeText(identity.canonical_name)}${identity.canonical_tag ? ` (${safeText(identity.canonical_tag)})` : ''}</option>`).join('');
}
function aliasesForIdentity(id){ return state.aliases.filter(alias => alias.team_identity_id === id); }
function renderIdentityList(){
  if(!state.identities.length){
    els.identityList.innerHTML = '<div class="empty-state">No team identities saved yet.</div>';
    return;
  }
  els.identityList.innerHTML = state.identities.slice().sort((a,b)=>a.canonical_name.localeCompare(b.canonical_name)).map(identity => {
    const aliases = aliasesForIdentity(identity.id);
    return `<article class="identity-row" data-identity-id="${safeText(identity.id)}">
      <div class="identity-row-head">
        <strong>${safeText(identity.canonical_name)}${identity.canonical_tag ? ` <span class="mini-chip">${safeText(identity.canonical_tag)}</span>` : ''}</strong>
        <div class="identity-row-actions">
          <button class="btn tiny secondary" type="button" data-edit-identity="${safeText(identity.id)}">Edit</button>
          <button class="btn tiny ghost" type="button" data-select-identity="${safeText(identity.id)}">Select aliases</button>
        </div>
      </div>
      <div class="alias-list">${aliases.length ? aliases.slice(0,12).map(alias => `<span class="mini-chip">${safeText(alias.alias_name)}${alias.alias_tag ? ` / ${safeText(alias.alias_tag)}` : ''}</span>`).join('') : '<span class="mini-chip">No aliases</span>'}</div>
      ${aliases.length > 12 ? `<small class="muted">+${aliases.length - 12} more aliases</small>` : ''}
    </article>`;
  }).join('');
}
function teamMatchesAlias(team, alias){
  const name = keyText(team?.name);
  const tag = keyText(team?.tag);
  if(!name || !alias) return false;
  return alias.alias_name === name && (!alias.alias_tag || !tag || alias.alias_tag === tag);
}
function selectTeamsForIdentity(id, append=false){
  if(!append) state.selected.clear();
  const identity = state.identities.find(item => item.id === id);
  const aliases = aliasesForIdentity(id);
  for(const team of state.teams.values()){
    const mapped = findAliasForTeam(team);
    const isMapped = mapped?.team_identity_id === id || mapped?.team_identity?.id === id || aliases.some(alias => teamMatchesAlias(team, alias));
    const isCanonical = identity && keyText(team.name) === keyText(identity.canonical_name) && (!identity.canonical_tag || !team.tag || keyText(team.tag) === keyText(identity.canonical_tag));
    if(isMapped || isCanonical) state.selected.add(team.key);
  }
  renderTeams();
}
function fillFormFromIdentity(id, selectMapped=false){
  const identity = state.identities.find(item => item.id === id);
  if(!identity) return;
  els.identitySelect.value = identity.id;
  els.canonicalName.value = identity.canonical_name || '';
  els.canonicalTag.value = identity.canonical_tag || '';
  els.region.value = identity.region || '';
  els.country.value = identity.country || '';
  els.notes.value = identity.notes || '';
  if(selectMapped) {
    selectTeamsForIdentity(id);
    showNotice(`Editing ${identity.canonical_name}. Existing aliases from the loaded team list were selected.`, 'success');
  }
}
function selectedTeams(){ return [...state.selected].map(key => state.teams.get(key)).filter(Boolean); }
function useFirstSelected(){
  const first = selectedTeams()[0];
  if(!first) return showNotice('Select at least one team first.', 'error');
  els.canonicalName.value = keyText(first.name);
  els.canonicalTag.value = keyText(first.tag);
  if(first.years.length === 1) els.validFrom.value = first.years[0];
}
async function saveIdentityAndAliases(){
  const teams = selectedTeams();
  let identityId = els.identitySelect.value;
  let identity = identityId ? state.identities.find(item => item.id === identityId) : null;
  const canonicalName = keyText(els.canonicalName.value || identity?.canonical_name || '');
  if(!identity && !canonicalName) return showNotice('Choose an existing identity or enter a canonical team name.', 'error');
  if(!teams.length && !identity) return showNotice('Select at least one team alias to create a new identity.', 'error');

  const identityPayload = {
    canonical_name: canonicalName || identity?.canonical_name || '',
    canonical_tag: keyText(els.canonicalTag.value || identity?.canonical_tag || ''),
    region: norm(els.region.value || identity?.region || ''),
    country: norm(els.country.value || identity?.country || ''),
    notes: norm(els.notes.value || identity?.notes || '')
  };

  setBusy(els.save, true, 'Saving…');
  try{
    if(state.sharedSaveReady){
      if(identity){
        const { data, error } = await liveClient.from(TEAM_IDENTITY_TABLE).update(identityPayload).eq('id', identity.id).select('*').single();
        if(error) throw error;
        identity = normalizeIdentity(data);
      }else{
        const { data, error } = await liveClient.from(TEAM_IDENTITY_TABLE).insert(identityPayload).select('*').single();
        if(error) throw error;
        identity = normalizeIdentity(data);
        identityId = identity.id;
      }
    }else{
      if(identity){ Object.assign(identity, identityPayload); }
      else { identity = { id: makeId(), ...identityPayload }; identityId = identity.id; state.identities.push(identity); }
    }

    if(!state.identities.some(item => item.id === identity.id)) state.identities.push(identity);
    else state.identities = state.identities.map(item => item.id === identity.id ? { ...item, ...identity } : item);

    const aliasRows = teams.map(team => {
      const row = {
        team_identity_id: identity.id,
        source_mode: state.sourceMode,
        source_table: state.sourceTable,
        alias_name: keyText(team.name),
        alias_tag: keyText(team.tag),
        valid_from_year: norm(els.validFrom.value) || null,
        valid_to_year: norm(els.validTo.value) || null,
        tournament: els.fTournament.value !== '__all__' ? els.fTournament.value : '',
        season: els.fSeason.value !== '__all__' ? els.fSeason.value : '',
        notes: norm(els.notes.value),
        team_identity: identity
      };
      row.alias_key = aliasKeyFor(row);
      return row;
    });

    // Always save the canonical name as a global alias too. This makes rows that
    // already use the new identity name join the merge, and it also fixes cases
    // where the canonical team was not checked in the team source list.
    if(identity.canonical_name){
      const canonicalAlias = {
        team_identity_id: identity.id,
        source_mode: '*',
        source_table: '*',
        alias_name: keyText(identity.canonical_name),
        alias_tag: keyText(identity.canonical_tag || ''),
        valid_from_year: null,
        valid_to_year: null,
        tournament: '',
        season: '',
        notes: norm(els.notes.value),
        team_identity: identity
      };
      canonicalAlias.alias_key = aliasKeyFor(canonicalAlias);
      aliasRows.push(canonicalAlias);
    }

    const uniqueAliasRows = mergeAliasRows(aliasRows);
    if(state.sharedSaveReady){
      if(uniqueAliasRows.length){
        const dbRows = uniqueAliasRows.map(({team_identity, ...row}) => row);
        const { error } = await liveClient.from(TEAM_ALIAS_TABLE).upsert(dbRows, { onConflict:'alias_key' });
        if(error) throw error;
      }
      await loadMappings();
    }else{
      const byKey = new Map(state.aliases.map(alias => [alias.alias_key, alias]));
      uniqueAliasRows.forEach(row => byKey.set(row.alias_key, { id: byKey.get(row.alias_key)?.id || makeId(), ...row }));
      state.aliases = [...byKey.values()];
      saveLocalMappings();
      renderIdentitySelect();
      renderIdentityList();
      updateStats();
    }

    els.identitySelect.value = identity.id;
    showNotice(`${teams.length ? `Saved ${teams.length} selected alias${teams.length === 1 ? '' : 'es'} and updated` : 'Updated'} ${identity.canonical_name}.`, 'success');
    renderTeams();
  }catch(error){
    console.error(error);
    showNotice(error.message || 'Unable to save team identity.', 'error');
  }finally{
    setBusy(els.save, false);
  }
}


function updateSourceFields(){
  const historical = els.sourceMode.value === 'historical';
  els.historicalKeyField.hidden = !historical;
  els.sourceTable.value = historical ? DEFAULT_HISTORICAL_TABLE : DEFAULT_LIVE_TABLE;
}
function wire(){
  els.sourceMode?.addEventListener('change', updateSourceFields);
  els.loadTeams?.addEventListener('click', async () => {
    setBusy(els.loadTeams, true, 'Loading…');
    try{ await loadTeams(); }catch(error){ console.error(error); setLoading('', false); showNotice(error.message || 'Unable to load teams.', 'error'); }
    finally{ setBusy(els.loadTeams, false); }
  });
  [els.search, els.fTournament, els.fYear, els.fSeason].forEach(control => control?.addEventListener('input', renderTeams));
  [els.fTournament, els.fYear, els.fSeason].forEach(control => control?.addEventListener('change', renderTeams));
  els.selectVisible?.addEventListener('click', () => { state.visibleKeys.forEach(key => state.selected.add(key)); renderTeams(); });
  els.clearSelected?.addEventListener('click', () => { state.selected.clear(); renderTeams(); });
  els.identitySelect?.addEventListener('change', () => fillFormFromIdentity(els.identitySelect.value, true));
  els.identityList?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-identity]');
    const select = event.target.closest('[data-select-identity]');
    const id = edit?.dataset.editIdentity || select?.dataset.selectIdentity || '';
    if(!id) return;
    fillFormFromIdentity(id, true);
    document.querySelector('.identity-form-grid')?.scrollIntoView({ behavior:'smooth', block:'center' });
  });
  els.guess?.addEventListener('click', useFirstSelected);
  els.save?.addEventListener('click', saveIdentityAndAliases);
  els.reload?.addEventListener('click', loadMappings);
  els.retry?.addEventListener('click', initializePage);
  els.logout?.addEventListener('click', async () => { await liveClient.auth.signOut(); location.reload(); });
  els.loginForm?.addEventListener('submit', handleAdminLogin);
  els.passwordToggle?.addEventListener('click', () => {
    const input = els.loginPassword;
    if(!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    els.passwordToggle.textContent = input.type === 'password' ? 'Show' : 'Hide';
  });
  els.themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ff_theme_v1', next);
  });
}
async function initializePage(){
  try{
    showNotice('');
    setLoading('Checking administrator access…', true);
    const ok = await requireAdmin();
    if(!ok) return;
    await loadMappings();
    updateSourceFields();
    setLoading('', false);
  }catch(error){
    console.error(error);
    setLoading('', false);
    showNotice(error.message || 'Unable to initialize Team Identity Manager.', 'error');
    els.retry.hidden = false;
  }
}

wire();
initializePage();
