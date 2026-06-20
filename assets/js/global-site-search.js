/* Free Fire Esports — global site search layer
   Non-breaking: keeps existing local search handlers, adds site-wide results + deep-link opening. */
(function(){
  'use strict';

  const INDEX = Array.isArray(window.FF_SITE_SEARCH_INDEX) ? window.FF_SITE_SEARCH_INDEX : [];
  const MAX_RESULTS = 10;
  const SEARCH_INPUT_SELECTOR = 'input[type="search"], input[id*="search" i], input[placeholder*="search" i]';
  const INPUT_SKIP_SELECTOR = '.ff-global-search-input, [data-ff-search-ignore="true"]';
  const UI_CLASS = 'ff-global-search-ui';
  const state = { input:null, results:[], active:0, paletteOpen:false, lastQuery:'' };

  const pageName = () => (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const norm = (s) => String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
  const compact = (s) => norm(s).replace(/\s+/g,'');
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const debounce = (fn, wait=60) => { let t; return (...args) => { clearTimeout(t); t=setTimeout(() => fn(...args), wait); }; };

  function injectStyles(){
    if(document.getElementById('ffGlobalSearchStyles')) return;
    const css = `
      .ff-global-search-ui{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
      .ff-global-search-dropdown{position:fixed;z-index:2147483000;display:none;min-width:280px;max-width:min(720px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 96px));overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(12,16,28,.96);box-shadow:0 26px 80px rgba(0,0,0,.45);backdrop-filter:blur(18px);color:#eef3ff;}
      .ff-global-search-palette-backdrop{position:fixed;z-index:2147482998;inset:0;display:none;background:rgba(0,0,0,.48);backdrop-filter:blur(6px);}
      .ff-global-search-palette{position:fixed;z-index:2147482999;left:50%;top:9vh;transform:translateX(-50%);display:none;width:min(780px,calc(100vw - 28px));padding:14px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:rgba(12,16,28,.97);box-shadow:0 30px 90px rgba(0,0,0,.52);backdrop-filter:blur(20px);color:#eef3ff;}
      .ff-global-search-input-wrap{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.07);}
      .ff-global-search-input-wrap svg{width:20px;height:20px;opacity:.82;flex:0 0 auto;}
      .ff-global-search-input{width:100%;border:0!important;outline:0!important;background:transparent!important;color:#eef3ff!important;font:inherit;font-size:15px;}
      .ff-global-search-input::placeholder{color:rgba(220,228,255,.62)!important;}
      .ff-global-search-results{display:grid;gap:7px;margin-top:10px;}
      .ff-global-search-result{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;width:100%;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.045);color:#eef3ff;text-align:left;cursor:pointer;}
      .ff-global-search-result:hover,.ff-global-search-result.is-active{background:linear-gradient(135deg,rgba(255,193,7,.16),rgba(255,255,255,.07));border-color:rgba(255,193,7,.35);}
      .ff-global-search-thumb{width:38px;height:38px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.09);}
      .ff-global-search-glyph{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(255,193,7,.14);border:1px solid rgba(255,193,7,.22);font-weight:900;color:#ffd166;}
      .ff-global-search-title{font-weight:900;font-size:14px;line-height:1.22;color:#fff;}
      .ff-global-search-sub{margin-top:3px;font-size:12px;line-height:1.32;color:rgba(223,231,255,.72);}
      .ff-global-search-snippet{margin-top:3px;font-size:11px;line-height:1.25;color:rgba(223,231,255,.55);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .ff-global-search-kind{align-self:center;justify-self:end;white-space:nowrap;border:1px solid rgba(255,255,255,.13);background:rgba(0,0,0,.22);border-radius:999px;padding:4px 7px;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:rgba(250,250,255,.76);}
      .ff-global-search-empty,.ff-global-search-hint{padding:12px;color:rgba(223,231,255,.68);font-size:12px;line-height:1.45;}
      .ff-global-search-hint{border-top:1px solid rgba(255,255,255,.08);margin-top:8px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;}
      .ff-global-search-kbd{border:1px solid rgba(255,255,255,.16);border-bottom-color:rgba(255,255,255,.28);background:rgba(255,255,255,.08);border-radius:7px;padding:1px 6px;font-size:11px;color:#fff;}
      .ff-global-search-fab{position:fixed;z-index:2147482500;right:18px;bottom:18px;width:48px;height:48px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:linear-gradient(135deg,rgba(255,193,7,.95),rgba(255,112,67,.92));color:#111827;box-shadow:0 18px 50px rgba(0,0,0,.38);display:grid;place-items:center;cursor:pointer;}
      .ff-global-search-fab svg{width:22px;height:22px;}
      .ff-global-search-highlight{outline:2px solid rgba(255,193,7,.95)!important;outline-offset:4px!important;border-radius:14px!important;transition:outline-color .25s ease;}
      html[data-theme="light"] .ff-global-search-dropdown, html[data-theme="light"] .ff-global-search-palette, body.theme-light .ff-global-search-dropdown, body.theme-light .ff-global-search-palette{background:rgba(255,255,255,.97);color:#172036;border-color:rgba(10,20,40,.12);box-shadow:0 28px 80px rgba(20,30,60,.24);}
      html[data-theme="light"] .ff-global-search-result, body.theme-light .ff-global-search-result{background:rgba(10,20,40,.035);border-color:rgba(10,20,40,.09);color:#172036;}
      html[data-theme="light"] .ff-global-search-title, body.theme-light .ff-global-search-title{color:#111827;}
      html[data-theme="light"] .ff-global-search-sub, body.theme-light .ff-global-search-sub{color:rgba(23,32,54,.70);}
      html[data-theme="light"] .ff-global-search-snippet, body.theme-light .ff-global-search-snippet{color:rgba(23,32,54,.55);}
      html[data-theme="light"] .ff-global-search-kind, body.theme-light .ff-global-search-kind{background:rgba(10,20,40,.045);border-color:rgba(10,20,40,.12);color:rgba(23,32,54,.66);}
      html[data-theme="light"] .ff-global-search-input-wrap, body.theme-light .ff-global-search-input-wrap{background:rgba(10,20,40,.04);border-color:rgba(10,20,40,.12);}
      html[data-theme="light"] .ff-global-search-input, body.theme-light .ff-global-search-input{color:#111827!important;}
      @media (max-width:640px){.ff-global-search-dropdown{left:12px!important;right:12px!important;width:auto!important;max-width:none;}.ff-global-search-palette{top:7vh;}.ff-global-search-result{grid-template-columns:auto 1fr;}.ff-global-search-kind{grid-column:2;justify-self:start}.ff-global-search-fab{right:14px;bottom:14px;width:44px;height:44px;border-radius:14px;}}
    `;
    const style=document.createElement('style');
    style.id='ffGlobalSearchStyles';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function resultHaystack(item){
    if(!item._hay){
      item._hay = norm([item.title,item.subtitle,item.kind,(item.tags||[]).join(' '),item.terms,item.snippet,item.url].join(' '));
      item._title = norm(item.title);
      item._compactTitle = compact(item.title);
    }
    return item._hay;
  }

  function scoreItem(item, q){
    const query = norm(q);
    if(!query){
      return (item.kind === 'Shortcut' ? 200 : 0) + (item.priority || 0);
    }
    const hay = resultHaystack(item);
    const title = item._title || norm(item.title);
    const qCompact = compact(q);
    const tokens = query.split(/\s+/).filter(Boolean);
    if(!tokens.length) return 0;
    let score = item.priority || 0;
    let matched = 0;
    for(const token of tokens){
      if(title === token) { score += 220; matched++; continue; }
      if(title.startsWith(token)) { score += 120; matched++; continue; }
      if(title.includes(token)) { score += 90; matched++; continue; }
      if((item._compactTitle || '').includes(token)) { score += 60; matched++; continue; }
      if(hay.includes(token)) { score += 25; matched++; continue; }
    }
    if(matched !== tokens.length){
      // For longer queries, allow "any strong exact phrase" but avoid noisy 1-token misses.
      if(query.length > 3 && hay.includes(query)) score += 70;
      else return 0;
    }
    if(title === query) score += 300;
    if(title.includes(query)) score += 160;
    if(qCompact && (item._compactTitle || '').includes(qCompact)) score += 110;
    if(item.kind === 'Character' || item.kind === 'Weapon' || item.kind === 'Pet' || item.kind === 'Loadout') score += 12;
    return score;
  }

  function search(q){
    const scored = INDEX.map(item => ({item, score:scoreItem(item,q)})).filter(x => x.score > 0);
    scored.sort((a,b) => b.score - a.score || String(a.item.title).localeCompare(String(b.item.title)));
    return scored.slice(0, MAX_RESULTS).map(x => x.item);
  }

  function snippetFor(item, q){
    const source = String(item.terms || item.snippet || item.subtitle || '');
    const clean = source.replace(/\s+/g,' ').trim();
    if(!clean) return '';
    const nq = norm(q);
    const tokens = nq.split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);
    let idx = -1;
    const low = clean.toLowerCase();
    for(const token of tokens){
      idx = low.indexOf(token);
      if(idx >= 0) break;
    }
    if(idx < 0) return clean.slice(0, 180);
    const start = Math.max(0, idx - 70);
    const end = Math.min(clean.length, idx + 160);
    return (start ? '…' : '') + clean.slice(start, end) + (end < clean.length ? '…' : '');
  }

  function iconFor(kind){
    const k=String(kind||'').toLowerCase();
    if(k.includes('team')) return 'TEAM';
    if(k.includes('weapon')) return 'WPN';
    if(k.includes('character')) return 'CHR';
    if(k.includes('pet')) return 'PET';
    if(k.includes('loadout')) return 'LOAD';
    if(k.includes('counter')) return 'VS';
    if(k.includes('section')) return 'SEC';
    return 'FF';
  }

  function resultButton(item, index, query){
    const image = item.image ? `<img class="ff-global-search-thumb" src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ff-global-search-glyph',textContent:'${escapeHtml(iconFor(item.kind))}'}))">` : `<div class="ff-global-search-glyph">${escapeHtml(iconFor(item.kind))}</div>`;
    const actionLabel = item.action === 'modal' ? 'Open modal' : item.action === 'team' ? 'Team view' : item.action === 'section' ? 'Section' : 'Go';
    return `<button type="button" class="ff-global-search-result ${index===state.active?'is-active':''}" data-ff-idx="${index}">
      ${image}
      <span>
        <div class="ff-global-search-title">${escapeHtml(item.title)}</div>
        <div class="ff-global-search-sub">${escapeHtml(item.subtitle || item.url || '')}</div>
        <div class="ff-global-search-snippet">${escapeHtml(snippetFor(item, query))}</div>
      </span>
      <span class="ff-global-search-kind">${escapeHtml(actionLabel)}</span>
    </button>`;
  }

  function ensureDropdown(){
    let dd=document.getElementById('ffGlobalSearchDropdown');
    if(dd) return dd;
    dd=document.createElement('div');
    dd.id='ffGlobalSearchDropdown';
    dd.className=`ff-global-search-dropdown ${UI_CLASS}`;
    dd.innerHTML='<div class="ff-global-search-results"></div><div class="ff-global-search-hint"><span><span class="ff-global-search-kbd">↑↓</span> move <span class="ff-global-search-kbd">Enter</span> open</span><span><span class="ff-global-search-kbd">Ctrl</span> + <span class="ff-global-search-kbd">K</span> full search</span></div>';
    document.body.appendChild(dd);
    dd.addEventListener('mousedown', e => e.preventDefault());
    dd.addEventListener('click', e => {
      const btn=e.target.closest('.ff-global-search-result');
      if(!btn) return;
      const item=state.results[Number(btn.dataset.ffIdx)];
      if(item) openResult(item);
    });
    return dd;
  }

  function ensurePalette(){
    let backdrop=document.getElementById('ffGlobalSearchBackdrop');
    let palette=document.getElementById('ffGlobalSearchPalette');
    if(backdrop && palette) return {backdrop,palette};
    backdrop=document.createElement('div');
    backdrop.id='ffGlobalSearchBackdrop';
    backdrop.className=`ff-global-search-palette-backdrop ${UI_CLASS}`;
    palette=document.createElement('div');
    palette.id='ffGlobalSearchPalette';
    palette.className=`ff-global-search-palette ${UI_CLASS}`;
    palette.innerHTML=`
      <div class="ff-global-search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input class="ff-global-search-input" id="ffGlobalSearchInput" placeholder="Search every page, team, player, character, pet, weapon, loadout…" autocomplete="off" />
      </div>
      <div class="ff-global-search-results" id="ffGlobalPaletteResults"></div>
      <div class="ff-global-search-hint"><span>Search opens page results, or opens cards/modals where supported.</span><span><span class="ff-global-search-kbd">Esc</span> close</span></div>`;
    document.body.appendChild(backdrop);
    document.body.appendChild(palette);
    backdrop.addEventListener('click', closePalette);
    palette.addEventListener('click', e => {
      const btn=e.target.closest('.ff-global-search-result');
      if(!btn) return;
      const item=state.results[Number(btn.dataset.ffIdx)];
      if(item) openResult(item);
    });
    const input=palette.querySelector('#ffGlobalSearchInput');
    input.addEventListener('input', debounce(() => renderPalette(input.value), 35));
    input.addEventListener('keydown', handleResultKeys);
    return {backdrop,palette};
  }

  function renderResults(container, query){
    state.lastQuery = query || '';
    state.results = search(query || '');
    state.active = Math.min(state.active, Math.max(0, state.results.length - 1));
    if(!state.results.length){
      container.innerHTML = `<div class="ff-global-search-empty">No global results. Try a team tag, player name, weapon, character, pet, loadout, page, section, or dashboard term.</div>`;
      return;
    }
    container.innerHTML = state.results.map((item,i)=>resultButton(item,i,query)).join('');
  }

  function positionDropdown(input){
    const dd=ensureDropdown();
    const r=input.getBoundingClientRect();
    const width=Math.max(320, Math.min(720, r.width || 420));
    dd.style.width=width+'px';
    dd.style.left=Math.max(12, Math.min(window.innerWidth - width - 12, r.left))+'px';
    dd.style.top=Math.min(window.innerHeight - 90, r.bottom + 8)+'px';
  }

  function renderDropdown(input){
    const dd=ensureDropdown();
    const results=dd.querySelector('.ff-global-search-results');
    positionDropdown(input);
    renderResults(results, input.value || '');
    dd.style.display='block';
  }

  function hideDropdown(){
    const dd=document.getElementById('ffGlobalSearchDropdown');
    if(dd) dd.style.display='none';
  }

  const debouncedDropdown = debounce(renderDropdown, 35);

  function enhanceInput(input){
    if(!input || input.matches(INPUT_SKIP_SELECTOR) || input.dataset.ffGlobalSearch === '1') return;
    input.dataset.ffGlobalSearch='1';
    input.dataset.ffOriginalPlaceholder = input.getAttribute('placeholder') || '';
    const old = input.getAttribute('placeholder') || '';
    if(/search/i.test(old)) input.setAttribute('placeholder', 'Search entire site…');
    input.setAttribute('autocomplete','off');
    input.addEventListener('focus', () => { state.input=input; renderDropdown(input); });
    input.addEventListener('input', () => { state.input=input; state.active=0; debouncedDropdown(input); });
    input.addEventListener('keydown', handleResultKeys);
    input.addEventListener('blur', () => setTimeout(hideDropdown, 160));
  }

  function enhanceAllInputs(root=document){
    root.querySelectorAll(SEARCH_INPUT_SELECTOR).forEach(enhanceInput);
  }

  function renderPalette(query){
    const container=document.getElementById('ffGlobalPaletteResults');
    if(container) renderResults(container, query || '');
  }

  function openPalette(seed=''){
    const {backdrop,palette}=ensurePalette();
    backdrop.style.display='block';
    palette.style.display='block';
    state.paletteOpen=true;
    const input=palette.querySelector('#ffGlobalSearchInput');
    input.value=seed || state.input?.value || '';
    renderPalette(input.value);
    requestAnimationFrame(() => input.focus());
  }

  function closePalette(){
    const backdrop=document.getElementById('ffGlobalSearchBackdrop');
    const palette=document.getElementById('ffGlobalSearchPalette');
    if(backdrop) backdrop.style.display='none';
    if(palette) palette.style.display='none';
    state.paletteOpen=false;
  }

  function updateActive(delta){
    if(!state.results.length) return;
    state.active = (state.active + delta + state.results.length) % state.results.length;
    const root = state.paletteOpen ? document.getElementById('ffGlobalPaletteResults') : document.querySelector('#ffGlobalSearchDropdown .ff-global-search-results');
    if(root) root.innerHTML = state.results.map((item,i)=>resultButton(item,i,state.lastQuery)).join('');
    const active=root?.querySelector('.is-active');
    active?.scrollIntoView?.({block:'nearest'});
  }

  function handleResultKeys(e){
    if(e.key === 'ArrowDown'){ e.preventDefault(); updateActive(1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); updateActive(-1); }
    else if(e.key === 'Enter'){
      if(state.results[state.active]){ e.preventDefault(); openResult(state.results[state.active]); }
    }else if(e.key === 'Escape'){
      closePalette(); hideDropdown();
      if(state.input) state.input.blur?.();
    }
  }

  function absolutizeItemUrl(item){
    const url = new URL(item.url || 'home.html', location.href);
    const q = item.query || item.title || '';
    if(q && !url.searchParams.get('ffq')) url.searchParams.set('ffq', q);
    if(item.kind && !url.searchParams.get('ffkind')) url.searchParams.set('ffkind', String(item.kind).toLowerCase());
    if(q && !url.searchParams.get('ffitem')) url.searchParams.set('ffitem', q);
    if((item.action === 'modal' || item.action === 'team') && !url.searchParams.get('ffopen')) url.searchParams.set('ffopen','1');
    return url;
  }

  function sameFile(url){
    const here = pageName() || 'index.html';
    const there = (url.pathname.split('/').pop() || 'index.html').toLowerCase();
    return here === there;
  }

  function openResult(item){
    closePalette(); hideDropdown();
    const url=absolutizeItemUrl(item);
    if(sameFile(url)){
      history.replaceState(null,'', url.pathname + url.search + url.hash);
      applyIncomingSearch(true);
    }else{
      location.href = url.toString();
    }
  }

  function createFloatingLauncher(){
    if(document.getElementById('ffGlobalSearchFab')) return;
    // Keep pages with no visible top search searchable. Hide if an input is visible near the top.
    const btn=document.createElement('button');
    btn.id='ffGlobalSearchFab';
    btn.className=`ff-global-search-fab ${UI_CLASS}`;
    btn.type='button';
    btn.title='Global search (Ctrl/Cmd + K)';
    btn.setAttribute('aria-label','Open global search');
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 21l-4.3-4.3m1.3-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    btn.addEventListener('click', () => openPalette());
    document.body.appendChild(btn);
  }

  function currentSearchTarget(kind){
    const k = String(kind || '').toLowerCase();
    if(k.includes('team')) return document.getElementById('teamSearch') || document.querySelector('input[placeholder*="team" i]') || document.querySelector(SEARCH_INPUT_SELECTOR);
    if(k.includes('resource') || ['character','pet','weapon','loadout','counter'].some(x => k.includes(x))) return document.getElementById('searchInput') || document.getElementById('resourceSearch') || document.querySelector(SEARCH_INPUT_SELECTOR);
    return document.getElementById('searchInput') || document.querySelector(SEARCH_INPUT_SELECTOR);
  }

  function setInputAndDispatch(input, value){
    if(!input || !value) return;
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function isVisible(el){
    if(!el || el.closest('.'+UI_CLASS)) return false;
    const st=getComputedStyle(el);
    if(st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    const r=el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function candidateText(el){
    const bits=[];
    ['search','name','teamCode','team','title','id'].forEach(k => { if(el.dataset && el.dataset[k]) bits.push(el.dataset[k]); });
    bits.push(el.getAttribute('aria-label') || '', el.getAttribute('title') || '', el.textContent || '');
    return norm(bits.join(' '));
  }

  function findCandidate(query){
    const qn=norm(query);
    const qc=compact(query);
    if(!qn) return null;
    const selectors = [
      '[data-search]','[data-name]','[data-team-code]','[data-open-resource]',
      '.team-tile','.team-card','.team-row','.resource-card','.item-card','.character-card','.pet-card','.weapon-card','.loadout-card',
      '.card','.nav-item','article','tr'
    ].join(',');
    const all=[...document.querySelectorAll(selectors)].filter(isVisible);
    const tokens=qn.split(/\s+/).filter(Boolean);
    const scored=[];
    for(const el of all){
      const text=candidateText(el);
      if(!text) continue;
      let score=0;
      if(text === qn) score+=500;
      if(text.startsWith(qn)) score+=260;
      if(text.includes(qn)) score+=180;
      if(qc && text.replace(/\s+/g,'').includes(qc)) score+=140;
      let matched=0;
      for(const t of tokens){ if(text.includes(t)){ score+=20; matched++; } }
      if(matched < tokens.length && score < 140) continue;
      // Prefer clickable cards, not giant wrappers/tables.
      if(el.matches('.item-card,.character-card,.pet-card,.weapon-card,.loadout-card,.resource-card,.team-tile,[data-search]')) score+=45;
      if(el.tagName === 'TR') score-=30;
      const r=el.getBoundingClientRect();
      if(r.height > 900) score-=90;
      scored.push({el,score});
    }
    scored.sort((a,b)=>b.score-a.score);
    return scored[0]?.el || null;
  }

  function highlightAndMaybeOpen(el, shouldClick){
    if(!el) return false;
    el.scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'});
    el.classList.add('ff-global-search-highlight');
    setTimeout(()=>el.classList.remove('ff-global-search-highlight'), 2400);
    if(shouldClick){
      const clickable = el.matches('button,a,[role="button"],.item-card,.character-card,.pet-card,.weapon-card,.loadout-card,.resource-card,.team-tile,.card') ? el : el.querySelector('button,a,[role="button"],.item-card,.character-card,.pet-card,.weapon-card,.loadout-card,.resource-card,.team-tile');
      clickable?.click?.();
    }
    return true;
  }

  function applyTeamDeepLink(query){
    const team = (new URL(location.href).searchParams.get('team') || query || '').trim().toUpperCase();
    if(!team) return false;
    if(typeof window.selectTeam === 'function'){
      try{ window.selectTeam(team); return true; }catch(e){}
    }
    const el=findCandidate(team);
    return highlightAndMaybeOpen(el, true);
  }

  function applyIncomingSearch(forceOpen=false){
    const params = new URL(location.href).searchParams;
    const query = params.get('ffitem') || params.get('ffq') || params.get('team') || '';
    const kind = params.get('ffkind') || '';
    const shouldOpen = forceOpen || params.get('ffopen') === '1' || params.has('team');
    if(!query && !location.hash) return;

    const target = currentSearchTarget(kind);
    if(target && query) setInputAndDispatch(target, query);

    if(location.hash){
      const targetHash = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if(targetHash) highlightAndMaybeOpen(targetHash, false);
    }

    const isTeam = kind.toLowerCase().includes('team') || params.has('team');
    let tries=0;
    const attempt = () => {
      tries++;
      if(isTeam && applyTeamDeepLink(query)) return;
      if(query){
        const candidate = findCandidate(query);
        if(highlightAndMaybeOpen(candidate, shouldOpen && !String(kind).toLowerCase().includes('page') && !String(kind).toLowerCase().includes('section'))) return;
      }
      if(tries < 14) setTimeout(attempt, tries < 4 ? 250 : 550);
    };
    setTimeout(attempt, 180);
  }

  function init(){
    if(!INDEX.length) return;
    injectStyles();
    enhanceAllInputs();
    ensurePalette();
    createFloatingLauncher();
    applyIncomingSearch(false);

    window.addEventListener('resize', () => { if(state.input) positionDropdown(state.input); });
    document.addEventListener('keydown', e => {
      const key = String(e.key || '').toLowerCase();
      if((e.ctrlKey || e.metaKey) && key === 'k'){
        e.preventDefault(); openPalette(); return;
      }
      if(key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey){
        const tag = document.activeElement?.tagName?.toLowerCase();
        if(!['input','textarea','select'].includes(tag)){
          e.preventDefault(); openPalette();
        }
      }
    });

    const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
      if(n.nodeType === 1) enhanceAllInputs(n);
    })));
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
