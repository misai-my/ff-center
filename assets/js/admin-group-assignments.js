'use strict';

const SUPABASE_URL = 'https://ooutjrewmwsixghbouxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdXRqcmV3bXdzaXhnaGJvdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjg3NTMsImV4cCI6MjA4MjYwNDc1M30.13WkdGiQH39lZH3iDgVDd_tZrHlI0twhGeiZNdwaMSg';
const noWaitAuthLock = async (_name, _acquireTimeout, fn) => await fn();
const client = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: noWaitAuthLock
      }
    })
  : null;

function withTimeout(promise, ms, label = 'Request') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function setLoading(message = 'Loading group assignment tools…', visible = true) {
  if (!els.loading) return;
  const text = els.loading.querySelector('strong');
  if (text) text.textContent = message;
  els.loading.classList.toggle('hide', !visible);
}

const $ = (id) => document.getElementById(id);
const els = {
  loading: $('loadingScreen'), notice: $('pageNotice'), retry: $('retryInitBtn'), adminUser: $('adminUser'), themeToggle: $('themeToggle'), logout: $('logoutBtn'),
  tournament: $('tournamentInput'), tournamentList: $('tournamentList'), stage: $('stageInput'), stageList: $('stageList'),
  groupCount: $('groupCountInput'), teamsPerGroup: $('teamsPerGroupInput'), load: $('loadSetupBtn'), status: $('assignmentStatus'),
  toolbar: $('assignmentToolbar'), search: $('teamSearchInput'), summary: $('summaryChips'), board: $('assignmentBoard'), validation: $('validationPanel'),
  autoSplit: $('autoSplitBtn'), clear: $('clearGroupsBtn'), addTeam: $('addTeamBtn'), saveDraft: $('saveDraftBtn'), confirm: $('confirmLockBtn'),
  modal: $('teamModal'), modalTitle: $('teamModalTitle'), modalClose: $('teamModalClose'), teamForm: $('teamForm'),
  recordId: $('teamRecordId'), logoFile: $('teamLogoFile'), logoPreview: $('teamLogoPreview'), teamCode: $('teamCodeInput'),
  teamName: $('teamNameInput'), shortName: $('teamShortNameInput'), organization: $('teamOrganizationInput'), country: $('teamCountryInput'),
  region: $('teamRegionInput'), externalId: $('teamExternalIdInput'), aliases: $('teamAliasesInput'), notes: $('teamNotesInput'), saveTeam: $('saveTeamBtn'),
  logoFilename: $('teamLogoFilename'), logoRepoPath: $('teamLogoRepoPath'), downloadRepoLogo: $('downloadRepoLogoBtn'),
  loginModal: $('adminLoginModal'), loginForm: $('adminLoginForm'), loginEmail: $('adminLoginEmail'), loginPassword: $('adminLoginPassword'),
  loginMessage: $('adminLoginMessage'), loginSubmit: $('adminLoginSubmit'), passwordToggle: $('adminPasswordToggle')
};

const state = {
  session: null,
  tournamentIndex: new Map(),
  directory: new Map(),
  teams: new Map(),
  groupCodes: ['A', 'B'],
  groupCount: 2,
  teamsPerGroup: 12,
  tournament: '',
  stage: 'Group Stage',
  locked: false,
  loaded: false,
  draggedKey: null,
  editingTeamKey: null,
  logoObjectUrl: '',
  logoPngBlob: null,
  logoPngFilename: ''
};

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function groupCodeFromIndex(index) {
  let n = Number(index);
  let out = '';
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

function generateGroupCodes(count) {
  return Array.from({ length: count }, (_, i) => groupCodeFromIndex(i + 1));
}

function showNotice(message, type = '') {
  els.notice.hidden = !message;
  els.notice.textContent = message || '';
  els.notice.className = `notice${type ? ` ${type}` : ''}`;
}

function setBusy(button, busy, text) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = text || 'Working…';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function teamKey(team) {
  return team.directoryId ? `dir:${team.directoryId}` : `stats:${team.teamId || normalize(team.teamName || team.teamTag)}`;
}

function teamInitials(team) {
  const source = team.teamTag || team.teamName || '?';
  return source.split(/\s+/).map((part) => part[0]).join('').slice(0, 4).toUpperCase();
}

function findDirectoryMatch(teamId, teamName, teamTag = '') {
  const idNorm = String(teamId ?? '').trim();
  const candidates = [teamName, teamTag].map(normalize).filter(Boolean);
  for (const team of state.directory.values()) {
    if (idNorm && String(team.external_team_id ?? '').trim() === idNorm) return team;
    const names = [team.team_code, team.team_name, team.short_name, ...(team.aliases || [])].map(normalize);
    if (candidates.some((candidate) => names.includes(candidate))) return team;
  }
  return null;
}

function setLoginMessage(message, type = '') {
  if (!els.loginMessage) return;
  els.loginMessage.hidden = !message;
  els.loginMessage.textContent = message || '';
  els.loginMessage.className = `auth-message${type ? ` ${type}` : ''}`;
}

function showAdminLogin(message = '') {
  setLoading('', false);
  els.loginModal?.classList.add('show');
  els.loginModal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setLoginMessage(message);
  window.setTimeout(() => els.loginEmail?.focus(), 50);
}

function hideAdminLogin() {
  els.loginModal?.classList.remove('show');
  els.loginModal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  setLoginMessage('');
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!client) {
    setLoginMessage('Supabase could not load. Check your internet connection or Content Security Policy.', 'error');
    return;
  }
  const email = els.loginEmail?.value.trim();
  const password = els.loginPassword?.value || '';
  if (!email || !password) {
    setLoginMessage('Enter both your email and password.', 'error');
    return;
  }
  setBusy(els.loginSubmit, true, 'Signing in…');
  setLoginMessage('');
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    hideAdminLogin();
    els.loading?.classList.remove('hide');
    await initializeAdminPage();
  } catch (error) {
    console.error(error);
    setLoginMessage(error.message || 'Unable to sign in.', 'error');
  } finally {
    setBusy(els.loginSubmit, false);
  }
}

async function requireAdmin() {
  if (!client) {
    showNotice('Supabase failed to load. Check the CDN, connection, or site Content Security Policy.', 'error');
    showAdminLogin('Supabase library is unavailable.');
    return false;
  }

  setLoading('Checking your sign-in…', true);
  let authResult;
  try {
    authResult = await withTimeout(client.auth.getSession(), 8000, 'Session check');
  } catch (error) {
    console.error(error);
    showNotice(`${error.message} Sign in again or press Retry.`, 'error');
    showAdminLogin('The saved session could not be checked. Please sign in again.');
    return false;
  }

  const { data: { session }, error } = authResult;
  if (error) throw error;
  if (!session) {
    showAdminLogin();
    return false;
  }

  state.session = session;
  els.adminUser.textContent = session.user.email || 'Signed in';
  setLoading('Confirming administrator access…', true);

  let adminResult;
  try {
    adminResult = await withTimeout(client.rpc('is_app_admin'), 8000, 'Administrator check');
  } catch (error) {
    throw new Error(`${error.message} Confirm that supabase/03_group_assignment_admin.sql was run in this Supabase project.`);
  }

  const { data, error: adminError } = adminResult;
  if (adminError) {
    throw new Error(`Admin check failed: ${adminError.message}. Run supabase/03_group_assignment_admin.sql in the same Supabase project used by this page.`);
  }
  if (!data) {
    showNotice('This account is not listed in app_admins. Add it through the Supabase SQL Editor before using this page.', 'error');
    setLoading('', false);
    document.querySelectorAll('button,input,textarea,select').forEach((node) => {
      if (!['themeToggle', 'logoutBtn', 'retryInitBtn'].includes(node.id)) node.disabled = true;
    });
    return false;
  }
  return true;
}

async function loadTournamentIndex() {
  let result = await client
    .from('ff_player_stats_raw')
    .select('Tournament,Stage,pulled_at')
    .not('Tournament', 'is', null)
    .order('pulled_at', { ascending: false })
    .limit(5000);

  // Older copies of ff_player_stats_raw may not contain pulled_at.
  if (result.error) {
    result = await client
      .from('ff_player_stats_raw')
      .select('Tournament,Stage')
      .not('Tournament', 'is', null)
      .limit(5000);
  }
  const { data, error } = result;
  if (error) throw new Error(`Unable to load tournaments: ${error.message}`);

  state.tournamentIndex.clear();
  for (const row of data || []) {
    const tournament = String(row.Tournament || '').trim();
    const stage = String(row.Stage || '').trim();
    if (!tournament) continue;
    if (!state.tournamentIndex.has(tournament)) state.tournamentIndex.set(tournament, { stages: new Set(), latest: row.pulled_at || '' });
    if (stage) state.tournamentIndex.get(tournament).stages.add(stage);
  }

  els.tournamentList.innerHTML = [...state.tournamentIndex.keys()].map((name) => `<option value="${safeText(name)}"></option>`).join('');
  if (!els.tournament.value && state.tournamentIndex.size) els.tournament.value = state.tournamentIndex.keys().next().value;
  refreshStageList();
}

function refreshStageList() {
  const tournament = els.tournament.value.trim();
  const stages = state.tournamentIndex.get(tournament)?.stages || new Set(['Group Stage']);
  els.stageList.innerHTML = [...stages].map((name) => `<option value="${safeText(name)}"></option>`).join('');
  if (!els.stage.value) els.stage.value = stages.values().next().value || 'Group Stage';
}

async function loadDirectory() {
  const { data, error } = await client.from('ff_teams').select('*').order('team_code');
  if (error) throw new Error('Team directory is unavailable. Run supabase/03_group_assignment_admin.sql.');
  state.directory.clear();
  for (const row of data || []) state.directory.set(row.id, row);
}

async function loadStatsTeams(tournament, stage) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await client
      .from('ff_player_stats_raw')
      .select('team_id,team_name')
      .eq('Tournament', tournament)
      .eq('Stage', stage)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const distinct = new Map();
  for (const row of rows) {
    const id = String(row.team_id ?? '').trim();
    const name = String(row.team_name ?? '').trim();
    const key = id || normalize(name);
    if (!key || distinct.has(key)) continue;
    distinct.set(key, { teamId: id, teamName: name });
  }
  return [...distinct.values()];
}

async function loadSetup() {
  const tournament = els.tournament.value.trim();
  const stage = els.stage.value.trim();
  if (!tournament || !stage) {
    showNotice('Enter both a tournament and a stage.', 'error');
    return;
  }
  setBusy(els.load, true, 'Loading…');
  showNotice('');
  try {
    await loadDirectory();
    const [statsTeams, configResult, assignmentsResult] = await Promise.all([
      loadStatsTeams(tournament, stage),
      client.from('tournament_stage_config').select('*').eq('tournament', tournament).eq('stage', stage).maybeSingle(),
      client.from('tournament_team_assignments').select('*').eq('tournament', tournament).eq('stage', stage).eq('is_active', true).order('seed')
    ]);
    if (configResult.error && configResult.error.code !== 'PGRST116') throw configResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;

    const config = configResult.data;
    state.groupCount = Number(config?.group_count || config?.group_codes?.length || els.groupCount.value || 2);
    state.teamsPerGroup = Number(config?.teams_per_group || els.teamsPerGroup.value || 12);
    state.groupCodes = Array.isArray(config?.group_codes) && config.group_codes.length
      ? config.group_codes.map((code) => String(code).toUpperCase())
      : generateGroupCodes(state.groupCount);
    els.groupCount.value = state.groupCount;
    els.teamsPerGroup.value = state.teamsPerGroup;
    state.tournament = tournament;
    state.stage = stage;
    state.teams.clear();

    const assignments = assignmentsResult.data || [];
    const assignmentById = new Map();
    const assignmentByName = new Map();
    for (const row of assignments) {
      if (row.team_id) assignmentById.set(String(row.team_id), row);
      [row.team_tag, row.team_name].filter(Boolean).forEach((value) => assignmentByName.set(normalize(value), row));
    }

    for (const statsTeam of statsTeams) {
      const assignment = assignmentById.get(statsTeam.teamId) || assignmentByName.get(normalize(statsTeam.teamName));
      const directory = assignment?.team_directory_id
        ? state.directory.get(assignment.team_directory_id)
        : findDirectoryMatch(statsTeam.teamId, statsTeam.teamName, assignment?.team_tag || '');
      const tag = assignment?.team_tag || directory?.team_code || statsTeam.teamName || statsTeam.teamId;
      const team = {
        directoryId: directory?.id || assignment?.team_directory_id || null,
        teamId: statsTeam.teamId || assignment?.team_id || directory?.external_team_id || '',
        teamTag: tag,
        teamName: assignment?.team_name || directory?.team_name || statsTeam.teamName || tag,
        shortName: directory?.short_name || '',
        organizationName: directory?.organization_name || '',
        countryCode: directory?.country_code || '',
        region: directory?.region || '',
        aliases: directory?.aliases || [],
        notes: directory?.notes || assignment?.notes || '',
        logoUrl: directory?.logo_url || '',
        logoFilename: directory?.logo_filename || '',
        localImagePath: directory?.local_image_path || '',
        storageBucket: directory?.storage_bucket || '',
        storagePath: directory?.storage_path || '',
        groupCode: assignment?.group_code || null,
        seed: assignment?.seed || 999,
        source: assignment?.assignment_source || 'match_data'
      };
      state.teams.set(teamKey(team), team);
    }

    // Keep officially assigned teams visible even before they appear in match data.
    for (const assignment of assignments) {
      const directory = assignment.team_directory_id ? state.directory.get(assignment.team_directory_id) : findDirectoryMatch(assignment.team_id, assignment.team_name, assignment.team_tag);
      const team = {
        directoryId: directory?.id || assignment.team_directory_id || null,
        teamId: assignment.team_id || directory?.external_team_id || '',
        teamTag: assignment.team_tag || directory?.team_code || assignment.team_name,
        teamName: assignment.team_name || directory?.team_name || assignment.team_tag,
        shortName: directory?.short_name || '', organizationName: directory?.organization_name || '',
        countryCode: directory?.country_code || '', region: directory?.region || '', aliases: directory?.aliases || [],
        notes: directory?.notes || assignment.notes || '', logoUrl: directory?.logo_url || '', logoFilename: directory?.logo_filename || '', localImagePath: directory?.local_image_path || '', storageBucket: directory?.storage_bucket || '', storagePath: directory?.storage_path || '',
        groupCode: assignment.group_code || null, seed: assignment.seed || 999, source: assignment.assignment_source || 'admin_page'
      };
      const key = teamKey(team);
      if (!state.teams.has(key)) state.teams.set(key, team);
    }

    state.locked = assignments.length > 0 && assignments.every((row) => row.is_locked === true);
    state.loaded = true;
    els.toolbar.hidden = false;
    els.validation.hidden = false;
    updateLockState();
    renderBoard();
    showNotice(statsTeams.length ? '' : 'No match-data teams were found for this tournament/stage. You can still add teams manually.', '');
  } catch (error) {
    console.error(error);
    showNotice(error.message || 'Unable to load assignments.', 'error');
  } finally {
    setBusy(els.load, false);
  }
}

function updateLockState() {
  els.status.textContent = state.locked ? 'Official assignments locked' : 'Draft mode';
  els.status.className = `status-pill ${state.locked ? 'locked' : ''}`;
  const disabled = state.locked;
  [els.groupCount, els.teamsPerGroup, els.autoSplit, els.clear, els.addTeam, els.saveDraft].forEach((node) => { node.disabled = disabled; });
  els.confirm.textContent = state.locked ? 'Unlock for Editing' : 'Confirm & Lock';
}

function setGroup(teamKeyValue, groupCode) {
  const team = state.teams.get(teamKeyValue);
  if (!team || state.locked) return;
  team.groupCode = groupCode || null;
  const inGroup = [...state.teams.values()].filter((item) => item.groupCode === team.groupCode);
  team.seed = inGroup.length;
  renderBoard();
}

function renderTeamCard(key, team) {
  const options = [`<option value="">Unassigned</option>`, ...state.groupCodes.map((code) => `<option value="${code}"${team.groupCode === code ? ' selected' : ''}>Group ${code}</option>`)].join('');
  const logoSource = team.logoUrl || team.localImagePath || '';
  const logo = logoSource
    ? `<img src="${safeText(logoSource)}" alt="" onerror="this.remove();this.parentElement.textContent='${safeText(teamInitials(team))}'">`
    : safeText(teamInitials(team));
  return `
    <article class="team-card" draggable="${state.locked ? 'false' : 'true'}" data-team-key="${safeText(key)}">
      <div class="team-logo">${logo}</div>
      <div class="team-copy">
        <strong>${safeText(team.teamTag || team.teamName)}</strong>
        <span>${safeText(team.teamName || team.teamTag)}${team.countryCode ? ` · ${safeText(team.countryCode)}` : ''}</span>
      </div>
      <div class="team-controls">
        <select class="team-group-select" data-team-group="${safeText(key)}" ${state.locked ? 'disabled' : ''} aria-label="Assign ${safeText(team.teamTag)} to group">${options}</select>
        <button class="btn secondary edit-team" type="button" data-edit-team="${safeText(key)}" title="Edit team">✎</button>
      </div>
    </article>`;
}

function renderBoard() {
  const search = normalize(els.search.value);
  const columns = [{ code: null, label: 'Unassigned' }, ...state.groupCodes.map((code) => ({ code, label: `Group ${code}` }))];
  const allTeams = [...state.teams.entries()];
  const filtered = search
    ? allTeams.filter(([, team]) => [team.teamTag, team.teamName, team.shortName, team.organizationName, team.countryCode, ...(team.aliases || [])].some((value) => normalize(value).includes(search)))
    : allTeams;

  els.board.innerHTML = columns.map(({ code, label }) => {
    const teams = filtered
      .filter(([, team]) => (team.groupCode || null) === code)
      .sort((a, b) => (a[1].seed || 999) - (b[1].seed || 999) || String(a[1].teamTag).localeCompare(String(b[1].teamTag)));
    const totalCount = allTeams.filter(([, team]) => (team.groupCode || null) === code).length;
    const countClass = code && state.teamsPerGroup ? (totalCount === state.teamsPerGroup ? 'full' : totalCount > state.teamsPerGroup ? 'over' : '') : '';
    return `
      <section class="group-column" data-drop-group="${code || ''}">
        <header class="group-head"><h3>${safeText(label)}</h3><span class="count ${countClass}">${totalCount}${code && state.teamsPerGroup ? ` / ${state.teamsPerGroup}` : ''}</span></header>
        <div class="team-list">${teams.length ? teams.map(([key, team]) => renderTeamCard(key, team)).join('') : '<div class="empty-column">Drop teams here</div>'}</div>
      </section>`;
  }).join('');

  bindBoardEvents();
  renderSummary();
}

function bindBoardEvents() {
  document.querySelectorAll('[data-team-group]').forEach((select) => select.addEventListener('change', () => setGroup(select.dataset.teamGroup, select.value)));
  document.querySelectorAll('[data-edit-team]').forEach((button) => button.addEventListener('click', () => openTeamModal(button.dataset.editTeam)));
  document.querySelectorAll('.team-card[draggable="true"]').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      state.draggedKey = card.dataset.teamKey;
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', state.draggedKey);
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); state.draggedKey = null; document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over')); });
  });
  document.querySelectorAll('[data-drop-group]').forEach((column) => {
    column.addEventListener('dragover', (event) => { if (state.locked) return; event.preventDefault(); column.classList.add('drag-over'); });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', (event) => {
      if (state.locked) return;
      event.preventDefault();
      column.classList.remove('drag-over');
      const key = event.dataTransfer.getData('text/plain') || state.draggedKey;
      setGroup(key, column.dataset.dropGroup || null);
    });
  });
}

function getValidation() {
  const teams = [...state.teams.values()];
  const unassigned = teams.filter((team) => !team.groupCode).length;
  const counts = Object.fromEntries(state.groupCodes.map((code) => [code, teams.filter((team) => team.groupCode === code).length]));
  const wrong = state.groupCodes.filter((code) => state.teamsPerGroup && counts[code] !== state.teamsPerGroup);
  const expectedTotal = state.groupCount * state.teamsPerGroup;
  const exactTotal = !state.teamsPerGroup || teams.length === expectedTotal;
  return { teams, unassigned, counts, wrong, expectedTotal, exactTotal, validForLock: teams.length > 0 && unassigned === 0 && wrong.length === 0 && exactTotal };
}

function renderSummary() {
  const check = getValidation();
  els.summary.innerHTML = [
    `<span class="chip">${check.teams.length} teams</span>`,
    `<span class="chip">${state.groupCount} groups</span>`,
    `<span class="chip">${check.unassigned} unassigned</span>`
  ].join('');

  const messages = [];
  if (!check.teams.length) messages.push('Add at least one team.');
  if (check.unassigned) messages.push(`${check.unassigned} team${check.unassigned === 1 ? '' : 's'} still unassigned.`);
  if (!check.exactTotal) messages.push(`Format expects ${check.expectedTotal} teams, but ${check.teams.length} are loaded.`);
  if (check.wrong.length) messages.push(`Group size mismatch: ${check.wrong.map((code) => `${code}=${check.counts[code]}`).join(', ')}.`);
  els.validation.textContent = messages.length ? messages.join(' ') : 'Ready to confirm: every team is assigned and all group sizes are correct.';
  els.validation.className = `validation${messages.length ? '' : ' ok'}`;
}

function autoSplit() {
  if (state.locked) return;
  const teams = [...state.teams.values()].sort((a, b) => String(a.teamTag).localeCompare(String(b.teamTag)));
  teams.forEach((team, index) => {
    team.groupCode = state.groupCodes[index % state.groupCodes.length];
    team.seed = Math.floor(index / state.groupCodes.length) + 1;
  });
  renderBoard();
}

function clearGroups() {
  if (state.locked || !confirm('Move every team back to Unassigned?')) return;
  for (const team of state.teams.values()) { team.groupCode = null; team.seed = 999; }
  renderBoard();
}

function applyGroupCount() {
  if (state.locked) return;
  const count = Math.max(1, Math.min(52, Number(els.groupCount.value) || 1));
  state.groupCount = count;
  const nextCodes = generateGroupCodes(count);
  for (const team of state.teams.values()) if (team.groupCode && !nextCodes.includes(team.groupCode)) team.groupCode = null;
  state.groupCodes = nextCodes;
  renderBoard();
}

async function saveAssignments(lock) {
  if (!state.loaded) return;
  const check = getValidation();
  if (lock && !check.validForLock) {
    showNotice('Resolve every validation warning before confirming and locking the groups.', 'error');
    return;
  }
  const button = lock ? els.confirm : els.saveDraft;
  setBusy(button, true, lock ? 'Locking…' : 'Saving…');
  showNotice('');
  try {
    const groupSeeds = new Map(state.groupCodes.map((code) => [code, 0]));
    const assignments = [...state.teams.values()].map((team) => {
      let seed = null;
      if (team.groupCode) {
        seed = (groupSeeds.get(team.groupCode) || 0) + 1;
        groupSeeds.set(team.groupCode, seed);
      }
      return {
        team_directory_id: team.directoryId || null,
        team_id: team.teamId || null,
        team_tag: team.teamTag,
        team_name: team.teamName,
        group_code: team.groupCode || null,
        seed,
        assignment_source: team.source || 'admin_page',
        notes: team.notes || null
      };
    });
    const { data, error } = await client.rpc('save_tournament_group_assignments', {
      p_tournament: state.tournament,
      p_stage: state.stage,
      p_group_count: state.groupCount,
      p_teams_per_group: state.teamsPerGroup,
      p_assignments: assignments,
      p_lock: lock
    });
    if (error) throw error;
    state.locked = lock;
    updateLockState();
    showNotice(`${lock ? 'Official assignments confirmed and locked' : 'Draft saved'} — ${data?.assignments_saved ?? assignments.length} teams.`, '');
  } catch (error) {
    console.error(error);
    showNotice(error.message || 'Unable to save assignments.', 'error');
  } finally {
    setBusy(button, false);
    updateLockState();
  }
}

function openTeamModal(key = null) {
  state.editingTeamKey = key;
  const team = key ? state.teams.get(key) : null;
  els.modalTitle.textContent = team ? 'Edit Team' : 'Add New Team';
  els.recordId.value = team?.directoryId || '';
  els.teamCode.value = team?.teamTag || '';
  els.teamName.value = team?.teamName || '';
  els.shortName.value = team?.shortName || '';
  els.organization.value = team?.organizationName || '';
  els.country.value = team?.countryCode || '';
  els.region.value = team?.region || '';
  els.externalId.value = team?.teamId || '';
  els.aliases.value = (team?.aliases || []).join(', ');
  els.notes.value = team?.notes || '';
  els.logoFile.value = '';
  renderLogoPreview(team?.logoUrl || team?.localImagePath || '', team ? teamInitials(team) : 'LOGO');
  state.logoPngBlob = null;
  state.logoPngFilename = '';
  updateLogoPathPreview();
  els.modal.classList.add('show');
  els.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => els.teamCode.focus(), 50);
}

function closeTeamModal() {
  els.modal.classList.remove('show');
  els.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (state.logoObjectUrl) URL.revokeObjectURL(state.logoObjectUrl);
  state.logoObjectUrl = '';
  state.logoPngBlob = null;
  state.logoPngFilename = '';
  updateLogoPathPreview();
}

function renderLogoPreview(url, fallback = 'LOGO') {
  els.logoPreview.innerHTML = url ? `<img src="${safeText(url)}" alt="Team logo preview">` : `<span>${safeText(fallback)}</span>`;
}

function teamTagSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '');
}

function teamLogoFilename(teamCode) {
  const slug = teamTagSlug(teamCode);
  return slug ? `${slug}.png` : 'team-tag.png';
}

function updateLogoPathPreview() {
  const filename = teamLogoFilename(els.teamCode?.value);
  if (els.logoFilename) els.logoFilename.textContent = filename;
  if (els.logoRepoPath) els.logoRepoPath.textContent = `assets/logo/${filename}`;
  if (els.downloadRepoLogo) els.downloadRepoLogo.disabled = !state.logoPngBlob;
}

async function imageFileToPng(file) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('Logo must be 5 MB or smaller.');
  if (!/^image\//i.test(file.type || '')) throw new Error('Select a valid image file.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('The selected logo could not be decoded.'));
      img.src = objectUrl;
    });

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) throw new Error('The selected logo has invalid dimensions.');

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas conversion is unavailable in this browser.');
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Unable to convert the logo to PNG.');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadTeamLogo(blob, teamCode) {
  if (!blob) return null;
  const slug = teamTagSlug(teamCode);
  if (!slug) throw new Error('Enter a valid team tag before uploading the logo.');
  const filename = `${slug}.png`;
  const { error } = await client.storage
    .from('team-logos')
    .upload(filename, blob, { cacheControl: '3600', upsert: true, contentType: 'image/png' });
  if (error) throw error;
  const { data } = client.storage.from('team-logos').getPublicUrl(filename);
  return {
    bucket: 'team-logos',
    path: filename,
    filename,
    localPath: `assets/logo/${filename}`,
    url: `${data.publicUrl}?v=${Date.now()}`
  };
}

function downloadRepoLogo() {
  if (!state.logoPngBlob) return;
  const filename = teamLogoFilename(els.teamCode.value);
  const url = URL.createObjectURL(state.logoPngBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveTeam(event) {
  event.preventDefault();
  const code = els.teamCode.value.trim().toUpperCase();
  const name = els.teamName.value.trim();
  if (!code || !name) return;
  setBusy(els.saveTeam, true, 'Saving…');
  try {
    const existing = state.editingTeamKey ? state.teams.get(state.editingTeamKey) : null;
    const uploaded = await uploadTeamLogo(state.logoPngBlob, code);
    const payload = {
      id: els.recordId.value || null,
      team_code: code,
      team_name: name,
      short_name: els.shortName.value.trim() || null,
      organization_name: els.organization.value.trim() || null,
      country_code: els.country.value.trim().toUpperCase() || null,
      region: els.region.value.trim() || null,
      external_team_id: els.externalId.value.trim() || null,
      aliases: els.aliases.value.split(',').map((value) => value.trim()).filter(Boolean),
      notes: els.notes.value.trim() || null,
      logo_filename: uploaded?.filename || existing?.logoFilename || teamLogoFilename(code),
      local_image_path: uploaded?.localPath || existing?.localImagePath || `assets/logo/${teamLogoFilename(code)}`,
      logo_url: uploaded?.url || existing?.logoUrl || '',
      storage_bucket: uploaded?.bucket || existing?.storageBucket || '',
      storage_path: uploaded?.path || existing?.storagePath || '',
      is_active: true
    };
    const { data, error } = await client.rpc('upsert_ff_team', { p_team: payload });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Team was saved but no record was returned.');
    state.directory.set(row.id, row);
    const team = {
      directoryId: row.id,
      teamId: row.external_team_id || existing?.teamId || '',
      teamTag: row.team_code,
      teamName: row.team_name,
      shortName: row.short_name || '', organizationName: row.organization_name || '',
      countryCode: row.country_code || '', region: row.region || '', aliases: row.aliases || [], notes: row.notes || '',
      logoUrl: row.logo_url || '', logoFilename: row.logo_filename || teamLogoFilename(row.team_code), localImagePath: row.local_image_path || `assets/logo/${teamLogoFilename(row.team_code)}`, storageBucket: row.storage_bucket || '', storagePath: row.storage_path || '',
      groupCode: existing?.groupCode || null, seed: existing?.seed || 999, source: 'admin_page'
    };
    const newKey = teamKey(team);
    if (state.editingTeamKey && state.editingTeamKey !== newKey) state.teams.delete(state.editingTeamKey);
    state.teams.set(newKey, team);
    closeTeamModal();
    renderBoard();
    showNotice(`${row.team_code} was saved and added to this assignment board.`, '');
  } catch (error) {
    console.error(error);
    showNotice(error.message || 'Unable to save the team.', 'error');
  } finally {
    setBusy(els.saveTeam, false);
  }
}

function bindEvents() {
  const bind = (element, eventName, handler) => {
    if (!element || typeof element.addEventListener !== 'function') return false;
    element.addEventListener(eventName, handler);
    return true;
  };
  bind(els.loginForm, 'submit', handleAdminLogin);
  bind(els.passwordToggle, 'click', () => {
    const showing = els.loginPassword.type === 'text';
    els.loginPassword.type = showing ? 'password' : 'text';
    els.passwordToggle.textContent = showing ? 'Show' : 'Hide';
  });
  bind(els.themeToggle, 'click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ff_theme_v1', next);
  });
  bind(els.logout, 'click', async () => {
    if (client) await client.auth.signOut();
    showAdminLogin('You have been signed out.');
  });
  bind(els.tournament, 'input', refreshStageList);
  bind(els.load, 'click', loadSetup);
  bind(els.search, 'input', renderBoard);
  bind(els.groupCount, 'change', applyGroupCount);
  bind(els.teamsPerGroup, 'change', () => { state.teamsPerGroup = Math.max(1, Number(els.teamsPerGroup.value) || 1); renderSummary(); renderBoard(); });
  bind(els.autoSplit, 'click', autoSplit);
  bind(els.clear, 'click', clearGroups);
  bind(els.addTeam, 'click', () => openTeamModal());
  bind(els.saveDraft, 'click', () => saveAssignments(false));
  bind(els.confirm, 'click', () => {
    if (state.locked) {
      state.locked = false;
      updateLockState();
      showNotice('Assignments unlocked locally. Save Draft to persist the unlocked state.', '');
      renderBoard();
    } else {
      saveAssignments(true);
    }
  });
  bind(els.modalClose, 'click', closeTeamModal);
  document.querySelectorAll('[data-close-team-modal]').forEach((node) => node.addEventListener('click', closeTeamModal));
  bind(els.teamForm, 'submit', saveTeam);
  bind(els.teamCode, 'input', updateLogoPathPreview);
  bind(els.downloadRepoLogo, 'click', downloadRepoLogo);
  bind(els.logoFile, 'change', async () => {
    const file = els.logoFile.files?.[0];
    if (!file) return;
    try {
      setBusy(els.saveTeam, true, 'Preparing logo…');
      const blob = await imageFileToPng(file);
      state.logoPngBlob = blob;
      state.logoPngFilename = teamLogoFilename(els.teamCode.value);
      if (state.logoObjectUrl) URL.revokeObjectURL(state.logoObjectUrl);
      state.logoObjectUrl = URL.createObjectURL(blob);
      renderLogoPreview(state.logoObjectUrl, els.teamCode.value || 'LOGO');
      updateLogoPathPreview();
    } catch (error) {
      console.error(error);
      state.logoPngBlob = null;
      showNotice(error.message || 'Unable to prepare the team logo.', 'error');
      els.logoFile.value = '';
    } finally {
      setBusy(els.saveTeam, false);
    }
  });
  bind(els.retry, 'click', async () => {
    els.retry.hidden = true;
    showNotice('');
    await initializeAdminPage();
  });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && els.modal?.classList.contains('show')) closeTeamModal(); });
}

async function initializeAdminPage() {
  try {
    const allowed = await requireAdmin();
    if (!allowed) return;
    hideAdminLogin();
    setLoading('Loading tournaments and teams…', true);
    await Promise.all([
      withTimeout(loadTournamentIndex(), 15000, 'Tournament loading'),
      withTimeout(loadDirectory(), 15000, 'Team-directory loading')
    ]);
    showNotice('');
  } catch (error) {
    console.error(error);
    showNotice(error.message || 'Unable to initialize the admin page.', 'error');
    if (els.retry) els.retry.hidden = false;
  } finally {
    setLoading('', false);
  }
}

async function init() {
  try {
    bindEvents();
    updateLogoPathPreview();
    if (!client || window.__ffdcSupabaseFailed) {
      showNotice('Supabase failed to load. Check that cdn.jsdelivr.net is allowed by your site and browser.', 'error');
      showAdminLogin('Supabase library is unavailable.');
      return;
    }
    await initializeAdminPage();
  } catch (error) {
    console.error(error);
    setLoading('', false);
    showNotice(error.message || 'The Group Assignment page failed to start.', 'error');
    if (els.retry) els.retry.hidden = false;
  }
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  setLoading('', false);
  showNotice(event.reason?.message || 'An unexpected request error occurred.', 'error');
  if (els.retry) els.retry.hidden = false;
});
window.addEventListener('error', (event) => {
  console.error('Page error:', event.error || event.message);
  setLoading('', false);
  showNotice(event.error?.message || event.message || 'An unexpected page error occurred.', 'error');
  if (els.retry) els.retry.hidden = false;
});

init();
