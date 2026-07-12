'use strict';

const SUPABASE_URL = 'https://ooutjrewmwsixghbouxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXRqcmV3bXdzaXhnaGJvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjg3NTMsImV4cCI6MjA4MjYwNDc1M30.13WkdGiQH39lZH3iDgVDd_tZrHlI0twhGeiZNdwaMSg';
const HISTORICAL_KEY_STORAGE_KEY = 'ffdc_historical_anon_key';
const PROFILE_STORAGE_KEY = 'ffdc_team_profile_metadata_v1';
const PROFILE_TABLE = 'team_profile_metadata';
const DEFAULT_LIVE_TABLE = 'ff_player_stats_raw';
const DEFAULT_HISTORICAL_TABLE = 'ffbr_data';
const CHUNK_SIZE = 1000;
const MAX_ROWS = 50000;

const noWaitAuthLock = async (_name, _acquireTimeout, fn) => await fn();
const liveClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, lock:noWaitAuthLock } })
  : null;

const $ = id => document.getElementById(id);
const els = {
  loading:$('loadingScreen'), notice:$('pageNotice'), retry:$('retryInitBtn'), adminUser:$('adminUser'), themeToggle:$('themeToggle'), logout:$('logoutBtn'),
  sourceMode:$('sourceModeInput'), sourceTable:$('sourceTableInput'), historicalKeyField:$('historicalKeyField'), historicalKey:$('historicalKeyInput'), loadTeams:$('loadTeamsBtn'),
  status:$('profileStatus'), statusGrid:$('statusGrid'), statTeams:$('statTeams'), statProfiles:$('statProfiles'), statSource:$('statSource'), statTable:$('statTable'),
  toolbar:$('profileToolbar'), board:$('profileBoard'), search:$('teamSearchInput'), fTournament:$('filterTournament'), fYear:$('filterYear'), fSeason:$('filterSeason'),
  saveVisible:$('saveVisibleBtn'), clearFilters:$('clearFiltersBtn'),
  loginModal:$('adminLoginModal'), loginForm:$('adminLoginForm'), loginEmail:$('adminLoginEmail'), loginPassword:$('adminLoginPassword'), loginMessage:$('adminLoginMessage'), loginSubmit:$('adminLoginSubmit'), passwordToggle:$('adminPasswordToggle')
};

const state = { session:null, rows:[], teams:new Map(), profiles:new Map(), visibleKeys:[], sourceMode:'live', sourceTable:DEFAULT_LIVE_TABLE, sharedSaveReady:false };

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
function setLoading(message='Loading team profile metadata…', visible=true){
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
  try{ const payload = String(token || '').split('.')[1]; if(!payload) return null; const padded = payload.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - payload.length % 4) % 4); return JSON.parse(atob(padded)); }
  catch(_e){ return null; }
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
    return { mode, label:'Historical Supabase (ffbr_data)', url:cfg.url, anonKey:cfg.anonKey, table:cfg.table || DEFAULT_HISTORICAL_TABLE };
  }
  return { mode, label:'Live Supabase', url:SUPABASE_URL, anonKey:SUPABASE_ANON_KEY, table:els.sourceTable?.value.trim() || DEFAULT_LIVE_TABLE };
}
function sourceKey(mode=state.sourceMode, table=state.sourceTable){ return `${mode}::${table}`; }
function profileKey(value){ return keyText(value); }

function readLocalProfiles(){
  try{
    const root = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
    if(Array.isArray(root)) return root;
    if(Array.isArray(root.profiles)) return root.profiles;
    if(root.profiles && typeof root.profiles === 'object') return Object.values(root.profiles);
  }catch(_e){}
  return [];
}
function writeLocalProfile(profile){
  const root = { profiles:{} };
  for(const row of readLocalProfiles()){
    const key = `${row.source_mode || 'global'}::${row.source_table || 'all'}::${row.team_key || row.team_name || row.team_tag}`;
    root.profiles[key] = row;
  }
  root.profiles[`${profile.source_mode}::${profile.source_table}::${profile.team_key}`] = profile;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(root));
}
function removeLocalProfile(profile){
  const root = { profiles:{} };
  const removeKey = `${profile.source_mode}::${profile.source_table}::${profile.team_key}`;
  for(const row of readLocalProfiles()){
    const key = `${row.source_mode || 'global'}::${row.source_table || 'all'}::${row.team_key || row.team_name || row.team_tag}`;
    if(key !== removeKey) root.profiles[key] = row;
  }
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(root));
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
  els.loginModal?.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  setLoginMessage(message);
  setTimeout(() => els.loginEmail?.focus(), 50);
}
function hideAdminLogin(){
  els.loginModal?.classList.remove('show');
  els.loginModal?.setAttribute('aria-hidden','true');
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
  }finally{ setBusy(els.loginSubmit, false); }
}
async function requireAdmin(){
  if(!liveClient){ showAdminLogin('Supabase library is unavailable.'); return false; }
  setLoading('Checking your sign-in…', true);
  const { data:{ session }, error } = await withTimeout(liveClient.auth.getSession(), 9000, 'Session check');
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
  const key = profileKey(name || tag);
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
async function loadExistingProfiles(){
  state.profiles.clear();
  for(const row of readLocalProfiles()){
    if((row.source_mode || '') === state.sourceMode && (row.source_table || '') === state.sourceTable && row.team_key) state.profiles.set(row.team_key, row);
  }
  try{
    const { data, error } = await withTimeout(
      liveClient.from(PROFILE_TABLE).select('*').eq('source_mode', state.sourceMode).eq('source_table', state.sourceTable).limit(5000),
      9000,
      'Profile metadata fetch'
    );
    if(error) throw error;
    (data || []).forEach(row => { if(row.team_key) state.profiles.set(row.team_key, row); });
    state.sharedSaveReady = true;
  }catch(error){
    state.sharedSaveReady = false;
    console.warn(`${PROFILE_TABLE} unavailable; local profile backup only:`, error.message || error);
    showNotice(`Profile table not ready yet. Run supabase/11_team_profile_metadata.sql for shared saves. Local browser backup is still available.`, 'warn');
  }
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
    if(!state.teams.has(item.key)) state.teams.set(item.key, { ...item, rows:0, tournaments:new Set(), years:new Set(), seasons:new Set(), groups:new Set() });
    const existing = state.teams.get(item.key);
    existing.rows += 1;
    if(item.tournament) existing.tournaments.add(item.tournament);
    if(item.year) existing.years.add(item.year);
    if(item.season) existing.seasons.add(item.season);
    if(item.group) existing.groups.add(item.group);
  });
  await loadExistingProfiles();
  populateFilters();
  renderBoard();
  els.toolbar.hidden = false;
  els.statusGrid.hidden = false;
  els.status.textContent = `${state.teams.size} teams loaded`;
  els.statTeams.textContent = state.teams.size;
  els.statProfiles.textContent = state.profiles.size;
  els.statSource.textContent = state.sourceMode === 'historical' ? 'History' : 'Live';
  els.statTable.textContent = state.sourceTable;
}
function populateFilters(){
  const teams = [...state.teams.values()];
  setOptions(els.fTournament, uniq(teams.flatMap(t => [...t.tournaments])));
  setOptions(els.fYear, uniq(teams.flatMap(t => [...t.years])));
  setOptions(els.fSeason, uniq(teams.flatMap(t => [...t.seasons])));
}
function passesFilters(team){
  const q = lowerKey(els.search?.value || '');
  if(q && !lowerKey(`${team.name} ${team.tag} ${[...team.tournaments].join(' ')}`).includes(q)) return false;
  if(els.fTournament.value !== '__all__' && !team.tournaments.has(els.fTournament.value)) return false;
  if(els.fYear.value !== '__all__' && !team.years.has(els.fYear.value)) return false;
  if(els.fSeason.value !== '__all__' && !team.seasons.has(els.fSeason.value)) return false;
  return true;
}
function profileForTeam(team){
  return state.profiles.get(team.key) || {
    source_mode: state.sourceMode,
    source_table: state.sourceTable,
    team_key: team.key,
    team_name: team.name,
    team_tag: team.tag,
    aliases: [team.name, team.tag, team.tag ? `${team.name} / ${team.tag}` : ''].filter(Boolean),
    region: '',
    country: '',
    group_name: [...team.groups][0] || '',
    seed: '',
    coach: '',
    qualification_path: '',
    logo_url: '',
    team_color: ''
  };
}
function renderBoard(){
  const teams = [...state.teams.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const visible = teams.filter(passesFilters);
  state.visibleKeys = visible.map(t => t.key);
  if(!visible.length){ els.board.innerHTML = '<div class="empty-state">No teams match the current filters.</div>'; return; }
  els.board.innerHTML = visible.map(team => {
    const p = profileForTeam(team);
    const saved = state.profiles.has(team.key);
    return `<article class="profile-card" data-team-key="${safeText(team.key)}">
      <div class="profile-card-head">
        <div class="profile-card-title"><strong>${safeText(team.name)}</strong><span>${safeText(team.tag || 'No tag')} • ${team.rows} rows</span></div>
        <div class="profile-chip-row"><span class="profile-mini-chip ${saved ? 'saved' : ''}">${saved ? 'Saved' : 'New'}</span>${[...team.groups].slice(0,2).map(g => `<span class="profile-mini-chip">${safeText(g)}</span>`).join('')}</div>
      </div>
      <div class="profile-form-grid">
        <label class="field"><span>Region</span><input data-field="region" value="${safeText(p.region || '')}" placeholder="SOUTHEAST ASIA" /></label>
        <label class="field"><span>Country</span><input data-field="country" value="${safeText(p.country || '')}" placeholder="ID / TH / PH" /></label>
        <label class="field"><span>Group</span><input data-field="group_name" value="${safeText(p.group_name || p.group || '')}" placeholder="Group A" /></label>
        <label class="field"><span>Seed</span><input data-field="seed" value="${safeText(p.seed || '')}" placeholder="Seed 1" /></label>
        <label class="field"><span>Coach</span><input data-field="coach" value="${safeText(p.coach || '')}" placeholder="Coach name" /></label>
        <label class="field"><span>Team color</span><input data-field="team_color" value="${safeText(p.team_color || '')}" placeholder="#ffbd59" /></label>
        <label class="field full"><span>Qualification path</span><input data-field="qualification_path" value="${safeText(p.qualification_path || '')}" placeholder="Qualifier / Invited / Regional champion" /></label>
        <label class="field full"><span>Logo URL/path</span><input data-field="logo_url" value="${safeText(p.logo_url || p.team_logo_url || '')}" placeholder="assets/logo/team.png" /></label>
      </div>
      <div class="profile-actions">
        <button class="btn secondary profile-delete" type="button">Delete</button>
        <button class="btn primary profile-save" type="button">Save Profile</button>
      </div>
    </article>`;
  }).join('');
  els.board.querySelectorAll('.profile-save').forEach(btn => btn.addEventListener('click', () => saveCard(btn.closest('.profile-card'))));
  els.board.querySelectorAll('.profile-delete').forEach(btn => btn.addEventListener('click', () => deleteCard(btn.closest('.profile-card'))));
}
function profileFromCard(card){
  const key = card?.dataset.teamKey;
  const team = state.teams.get(key);
  if(!team) return null;
  const payload = {
    source_mode: state.sourceMode,
    source_table: state.sourceTable,
    team_key: team.key,
    team_name: team.name,
    team_tag: team.tag || null,
    aliases: [team.name, team.tag, team.tag ? `${team.name} / ${team.tag}` : ''].filter(Boolean),
    region: null,
    country: null,
    group_name: null,
    seed: null,
    coach: null,
    qualification_path: null,
    logo_url: null,
    team_color: null,
    updated_at: new Date().toISOString()
  };
  card.querySelectorAll('[data-field]').forEach(input => { payload[input.dataset.field] = norm(input.value) || null; });
  return payload;
}
async function saveProfile(payload){
  writeLocalProfile(payload);
  if(state.sharedSaveReady){
    const { error } = await withTimeout(liveClient.from(PROFILE_TABLE).upsert(payload, { onConflict:'source_mode,source_table,team_key' }), 12000, 'Profile save');
    if(error) throw error;
  }
  state.profiles.set(payload.team_key, payload);
}
async function saveCard(card){
  const payload = profileFromCard(card);
  if(!payload) return;
  const btn = card.querySelector('.profile-save');
  setBusy(btn, true, 'Saving…');
  try{
    await saveProfile(payload);
    showNotice(`Saved profile for ${payload.team_name}.`, 'success');
    renderBoard();
  }catch(error){
    console.error(error);
    showNotice(error.message || 'Unable to save profile.', 'error');
  }finally{ setBusy(btn, false); }
}
async function deleteCard(card){
  const payload = profileFromCard(card);
  if(!payload) return;
  if(!confirm(`Delete saved profile metadata for ${payload.team_name}? Raw match data will not be touched.`)) return;
  try{
    removeLocalProfile(payload);
    if(state.sharedSaveReady){
      const { error } = await withTimeout(liveClient.from(PROFILE_TABLE).delete().eq('source_mode', payload.source_mode).eq('source_table', payload.source_table).eq('team_key', payload.team_key), 12000, 'Profile delete');
      if(error) throw error;
    }
    state.profiles.delete(payload.team_key);
    showNotice(`Deleted profile metadata for ${payload.team_name}.`, 'success');
    renderBoard();
  }catch(error){
    console.error(error);
    showNotice(error.message || 'Unable to delete profile.', 'error');
  }
}
async function saveVisible(){
  const cards = [...els.board.querySelectorAll('.profile-card')];
  if(!cards.length) return;
  setBusy(els.saveVisible, true, 'Saving visible…');
  try{
    for(const card of cards){
      const payload = profileFromCard(card);
      if(payload) await saveProfile(payload);
    }
    showNotice(`Saved ${cards.length} visible team profiles.`, 'success');
    renderBoard();
  }catch(error){
    console.error(error);
    showNotice(error.message || 'Unable to save visible profiles.', 'error');
  }finally{ setBusy(els.saveVisible, false); }
}
function clearFilters(){
  if(els.search) els.search.value = '';
  [els.fTournament, els.fYear, els.fSeason].forEach(select => { if(select) select.value = '__all__'; });
  renderBoard();
}
function updateSourceFields(){
  const historical = els.sourceMode?.value === 'historical';
  if(els.historicalKeyField) els.historicalKeyField.hidden = !historical;
  if(els.sourceTable) els.sourceTable.value = historical ? (window.FFDC_DATA_SOURCES?.historical?.table || DEFAULT_HISTORICAL_TABLE) : DEFAULT_LIVE_TABLE;
}
function wire(){
  els.sourceMode?.addEventListener('change', updateSourceFields);
  els.loadTeams?.addEventListener('click', async () => {
    setBusy(els.loadTeams, true, 'Loading…'); showNotice('');
    try{ await loadTeams(); }
    catch(error){ console.error(error); showNotice(error.message || 'Unable to load teams.', 'error'); }
    finally{ setBusy(els.loadTeams, false); setLoading('', false); }
  });
  [els.search, els.fTournament, els.fYear, els.fSeason].forEach(input => input?.addEventListener('input', renderBoard));
  els.saveVisible?.addEventListener('click', saveVisible);
  els.clearFilters?.addEventListener('click', clearFilters);
  els.themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; localStorage.setItem('ff_theme_v1', next);
  });
  els.logout?.addEventListener('click', async () => { await liveClient?.auth.signOut(); location.reload(); });
  els.loginForm?.addEventListener('submit', handleAdminLogin);
  els.passwordToggle?.addEventListener('click', () => {
    if(!els.loginPassword) return;
    const show = els.loginPassword.type === 'password';
    els.loginPassword.type = show ? 'text' : 'password';
    els.passwordToggle.textContent = show ? 'Hide' : 'Show';
  });
  els.retry?.addEventListener('click', initializePage);
}
async function initializePage(){
  try{
    showNotice('');
    setLoading('Loading team profile metadata…', true);
    const ok = await requireAdmin();
    if(!ok) return;
    updateSourceFields();
    wire();
    setLoading('', false);
    els.status.textContent = 'Ready';
  }catch(error){
    console.error(error);
    setLoading('', false);
    showNotice(error.message || 'Unable to initialize page.', 'error');
    if(els.retry) els.retry.hidden = false;
  }
}
initializePage();
