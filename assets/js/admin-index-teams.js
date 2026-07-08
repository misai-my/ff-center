'use strict';

const SUPABASE_URL = 'https://ooutjrewmwsixghbouxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXRqcmV3bXdzaXhnaGJvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjg3NTMsImV4cCI6MjA4MjYwNDc1M30.13WkdGiQH39lZH3iDgVDd_tZrHlI0twhGeiZNdwaMSg';
const HISTORICAL_KEY_STORAGE_KEY = 'ffdc_historical_anon_key';
const INDEX_SELECTION_STORAGE_KEY = 'ffdc_index_team_selection_v1';
const INDEX_SELECTION_TABLE = 'index_team_selection';
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
  toolbar: $('selectionToolbar'), status: $('selectionStatus'), board: $('teamBoard'), summary: $('selectionSummary'), search: $('teamSearchInput'),
  fTournament: $('filterTournament'), fStage: $('filterStage'), fYear: $('filterYear'), fSeason: $('filterSeason'), enabled: $('selectionEnabledInput'),
  selectVisible: $('selectVisibleBtn'), clearSelected: $('clearSelectedBtn'), save: $('saveSelectionBtn'),
  loginModal: $('adminLoginModal'), loginForm: $('adminLoginForm'), loginEmail: $('adminLoginEmail'), loginPassword: $('adminLoginPassword'), loginMessage: $('adminLoginMessage'), loginSubmit: $('adminLoginSubmit'), passwordToggle: $('adminPasswordToggle')
};

const state = {
  session: null,
  rows: [],
  teams: new Map(),
  visibleKeys: [],
  selected: new Set(),
  sourceMode: 'live',
  sourceTable: DEFAULT_LIVE_TABLE,
  sharedSaveReady: false
};

function norm(value){ return String(value ?? '').trim(); }
function safeText(value){ return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function keyText(value){ return norm(value).toUpperCase(); }
function lowerKey(value){ return norm(value).toLowerCase(); }
function showNotice(message, type=''){
  if(!els.notice) return;
  els.notice.hidden = !message;
  els.notice.textContent = message || '';
  els.notice.className = `notice${type ? ` ${type}` : ''}`;
}
function setLoading(message='Loading Index team selector…', visible=true){
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
function sourceKey(mode=state.sourceMode, table=state.sourceTable){ return `${mode}::${table}`; }
function saveLocalSelection(payload){
  let root = { selections: {} };
  try{
    const existing = JSON.parse(localStorage.getItem(INDEX_SELECTION_STORAGE_KEY) || '{}');
    if(existing?.selections && typeof existing.selections === 'object') root = existing;
    else if(existing?.source_mode) root.selections[sourceKey(existing.source_mode, existing.source_table)] = existing;
  }catch(_e){}
  root.selections[sourceKey(payload.source_mode, payload.source_table)] = payload;
  localStorage.setItem(INDEX_SELECTION_STORAGE_KEY, JSON.stringify(root));
}
function readLocalSelection(mode, table){
  try{
    const root = JSON.parse(localStorage.getItem(INDEX_SELECTION_STORAGE_KEY) || '{}');
    if(root?.selections) return root.selections[sourceKey(mode, table)] || null;
    if(root?.source_mode === mode && root?.source_table === table) return root;
  }catch(_e){}
  return null;
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
      if(rows.length < CHUNK_SIZE || out.length >= MAX_ROWS) break;
      from += rows.length;
      setLoading(`Loading teams… ${out.length} rows`, true);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if(ok) return out.slice(0, MAX_ROWS);
  }
  return out.slice(0, MAX_ROWS);
}
function teamFromRow(row, keys){
  const name = norm(getRowValue(row, keys.team) || getRowValue(row, keys.teamAlt) || getRowValue(row, keys.teamNameAlt));
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
    if(item.tag && !existing.tag) existing.tag = item.tag;
  });
  setOptions(els.fTournament, uniq([...state.teams.values()].flatMap(t => [...t.tournaments])));
  setOptions(els.fStage, uniq([...state.teams.values()].flatMap(t => [...t.stages])));
  setOptions(els.fYear, uniq([...state.teams.values()].flatMap(t => [...t.years])));
  setOptions(els.fSeason, uniq([...state.teams.values()].flatMap(t => [...t.seasons])));
  await loadSavedSelection();
  els.toolbar.hidden = false;
  els.summary.hidden = false;
  renderTeams();
  els.status.textContent = `${state.teams.size} teams loaded`;
  els.status.className = 'status-pill saved';
}
function getFilteredTeams(){
  const q = lowerKey(els.search.value);
  const tournament = els.fTournament.value;
  const stage = els.fStage.value;
  const year = els.fYear.value;
  const season = els.fSeason.value;
  return [...state.teams.values()].filter(team => {
    if(q && ![team.name, team.tag, team.key].some(v => lowerKey(v).includes(q))) return false;
    if(tournament !== '__all__' && !team.tournaments.has(tournament)) return false;
    if(stage !== '__all__' && !team.stages.has(stage)) return false;
    if(year !== '__all__' && !team.years.has(year)) return false;
    if(season !== '__all__' && !team.seasons.has(season)) return false;
    return true;
  }).sort((a,b) => String(a.name || a.key).localeCompare(String(b.name || b.key)));
}
function renderTeams(){
  const teams = getFilteredTeams();
  state.visibleKeys = teams.map(t => t.key);
  if(!teams.length){
    els.board.innerHTML = '<div class="panel"><p class="muted">No teams match the current filters.</p></div>';
  }else{
    els.board.innerHTML = teams.map(team => {
      const checked = state.selected.has(team.key) ? ' checked' : '';
      const meta = [team.tag, team.groups.size ? `Groups: ${[...team.groups].join(', ')}` : '', `${team.rows} rows`].filter(Boolean).join(' • ');
      return `<label class="index-team-card${checked ? ' selected' : ''}" data-team-card="${safeText(team.key)}">
        <input type="checkbox" data-team-select="${safeText(team.key)}"${checked}>
        <span class="index-team-mark">✓</span>
        <span class="index-team-copy"><strong>${safeText(team.name || team.key)}</strong><small>${safeText(meta)}</small></span>
      </label>`;
    }).join('');
    els.board.querySelectorAll('[data-team-select]').forEach(input => input.addEventListener('change', () => {
      if(input.checked) state.selected.add(input.dataset.teamSelect);
      else state.selected.delete(input.dataset.teamSelect);
      renderSummary();
      input.closest('.index-team-card')?.classList.toggle('selected', input.checked);
    }));
  }
  renderSummary();
}
function renderSummary(){
  if(!els.summary) return;
  const visible = state.visibleKeys.length;
  const selectedVisible = state.visibleKeys.filter(k => state.selected.has(k)).length;
  const enabledText = els.enabled.checked ? 'enabled' : 'disabled';
  els.summary.textContent = `${state.selected.size} selected total • ${selectedVisible}/${visible} selected in current view • Index filter ${enabledText} • Source: ${state.sourceMode} / ${state.sourceTable}`;
  els.summary.className = `validation${state.selected.size ? ' ok' : ''}`;
}
async function loadSavedSelection(){
  state.selected.clear();
  let saved = null;
  try{
    const { data, error } = await withTimeout(
      liveClient.from(INDEX_SELECTION_TABLE).select('*').eq('source_mode', state.sourceMode).eq('source_table', state.sourceTable).maybeSingle(),
      8000,
      'Saved selection load'
    );
    if(!error && data) { saved = data; state.sharedSaveReady = true; }
    if(error) { state.sharedSaveReady = false; console.warn('Shared selection table unavailable:', error.message || error); }
  }catch(err){
    state.sharedSaveReady = false;
    console.warn('Shared selection load skipped:', err?.message || err);
  }
  if(!saved) saved = readLocalSelection(state.sourceMode, state.sourceTable);
  const teams = Array.isArray(saved?.teams) ? saved.teams.map(keyText).filter(Boolean) : [];
  teams.forEach(team => state.selected.add(team));
  els.enabled.checked = saved?.enabled !== false;
}
function buildPayload(){
  return {
    source_mode: state.sourceMode,
    source_table: state.sourceTable,
    source_label: state.sourceMode === 'historical' ? 'Historical Supabase (ffbr_data)' : 'Live Supabase',
    enabled: !!els.enabled.checked,
    teams: [...state.selected].sort(),
    filters: {
      tournament: els.fTournament.value,
      stage: els.fStage.value,
      year: els.fYear.value,
      season: els.fSeason.value
    },
    updated_at: new Date().toISOString(),
    updated_by_email: state.session?.user?.email || ''
  };
}
async function saveSelection(){
  const payload = buildPayload();
  saveLocalSelection(payload);
  setBusy(els.save, true, 'Saving…');
  showNotice('');
  try{
    const { error } = await liveClient.from(INDEX_SELECTION_TABLE).upsert(payload, { onConflict:'source_mode,source_table' });
    if(error) throw error;
    state.sharedSaveReady = true;
    showNotice(`Saved shared Index team selection: ${payload.teams.length} teams. Refresh index.html to see it.`, '');
  }catch(error){
    console.warn(error);
    showNotice(`Saved locally for this browser. Shared Supabase save is unavailable until you run supabase/09_index_team_selection.sql. Details: ${error.message || error}`, 'error');
  }finally{
    setBusy(els.save, false);
    renderSummary();
  }
}
function syncSourceInputs(){
  const mode = els.sourceMode.value === 'historical' ? 'historical' : 'live';
  els.historicalKeyField.hidden = mode !== 'historical';
  if(mode === 'historical'){
    els.sourceTable.value = els.sourceTable.value && els.sourceTable.value !== DEFAULT_LIVE_TABLE ? els.sourceTable.value : DEFAULT_HISTORICAL_TABLE;
    els.historicalKey.value = localStorage.getItem(HISTORICAL_KEY_STORAGE_KEY) || window.FFDC_DATA_SOURCES?.historical?.anonKey || '';
  }else{
    els.sourceTable.value = els.sourceTable.value && els.sourceTable.value !== DEFAULT_HISTORICAL_TABLE ? els.sourceTable.value : DEFAULT_LIVE_TABLE;
  }
}
function bindEvents(){
  els.loginForm?.addEventListener('submit', handleAdminLogin);
  els.passwordToggle?.addEventListener('click', () => {
    const showing = els.loginPassword.type === 'text';
    els.loginPassword.type = showing ? 'password' : 'text';
    els.passwordToggle.textContent = showing ? 'Show' : 'Hide';
  });
  els.themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ff_theme_v1', next);
  });
  els.logout?.addEventListener('click', async () => { if(liveClient) await liveClient.auth.signOut(); showAdminLogin('You have been signed out.'); });
  els.sourceMode?.addEventListener('change', syncSourceInputs);
  els.loadTeams?.addEventListener('click', async () => {
    setBusy(els.loadTeams, true, 'Loading…'); showNotice('');
    try{ await loadTeams(); }
    catch(error){ console.error(error); showNotice(error.message || 'Unable to load teams.', 'error'); }
    finally{ setBusy(els.loadTeams, false); setLoading('', false); }
  });
  [els.fTournament, els.fStage, els.fYear, els.fSeason, els.search].forEach(node => node?.addEventListener('input', renderTeams));
  [els.fTournament, els.fStage, els.fYear, els.fSeason].forEach(node => node?.addEventListener('change', renderTeams));
  els.enabled?.addEventListener('change', renderSummary);
  els.selectVisible?.addEventListener('click', () => { state.visibleKeys.forEach(k => state.selected.add(k)); renderTeams(); });
  els.clearSelected?.addEventListener('click', () => { if(confirm('Clear all selected Index teams for this source?')){ state.selected.clear(); renderTeams(); } });
  els.save?.addEventListener('click', saveSelection);
  els.retry?.addEventListener('click', initializePage);
}
async function initializePage(){
  try{
    setLoading('Checking access…', true);
    const allowed = await requireAdmin();
    if(!allowed) return;
    hideAdminLogin();
    syncSourceInputs();
    showNotice('Load a database source, select teams, then save. The Index will use the saved list only when the same database/table is active.', '');
  }catch(error){
    console.error(error);
    showNotice(error.message || 'Unable to initialize page.', 'error');
    els.retry.hidden = false;
  }finally{
    setLoading('', false);
  }
}
function init(){
  bindEvents();
  syncSourceInputs();
  if(!liveClient || window.__ffdcSupabaseFailed){ showAdminLogin('Supabase library is unavailable.'); return; }
  initializePage();
}

init();
