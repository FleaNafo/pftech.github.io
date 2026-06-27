const API = 'https://script.google.com/macros/s/AKfycbyPqdIwfRMGpQ-20R_OeZwkb3ykStr8S8eEMQw8-5HhtYXuqyZWCcU6LQryy9D3f0mr/exec';
const WEBHOOK = 'https://discord.com/api/webhooks/1519986780177305611/LcIjXkgLnvSYeFPzx1kLM6edgCPaeR-qjdeT5xkLRUSK1RAgJxDlCFHd8UXLjNIWVvbW';

const MAPS = [
  'All Maps',
  'Bazaar','Black Site','Capot','Castle Keep','Containers','Crane Site',
  'Derrick','Desert Storm','Dual Crane Site','Dunes','Dust Bowl','Elevation',
  'Facility','Favela','Fortress','Foxholes','Heat','Height','Highway Lot',
  'Marooned','Metro Classic','Metro (2025)','Mirage','Paradise','Penthouse',
  'Ravod 911','Rig','Ruins','Rundown','Second Storm','Stardom','Suburbia',
  'Transit','Trench','Villa','Warehouse'
];

const TYPES = ['Tech', 'Glitch', 'Tutorial', 'Video showcase'];

const EMPTY = {
  'Tech': 'No techs approved yet — be the first to submit!',
  'Glitch': 'No glitches documented yet.',
  'Tutorial': 'No tutorials yet.',
  'Video showcase': 'No video showcases yet.'
};

const TAG_CLASS = {
  'Tech': 'tag-tech', 'Glitch': 'tag-glitch',
  'Tutorial': 'tag-tutorial', 'Video showcase': 'tag-video'
};

const TAG_ICON = {
  'Tech': 'ti-bolt', 'Glitch': 'ti-alert-triangle',
  'Tutorial': 'ti-book', 'Video showcase': 'ti-player-play'
};

const EMBED_COLOR = {
  'Tech': 0x185fa5, 'Glitch': 0xba7517,
  'Tutorial': 0x3b6d11, 'Video showcase': 0x7c3aed
};

let allSubmissions = [];
let claimedNames = [];
let currentFilter = { map: 'All Maps', sort: 'newest', search: '' };
let votedKeys = JSON.parse(localStorage.getItem('pf_voted_keys') || '[]');

// Set by each page to keep interval scoped correctly
let PAGE_TYPE = null;
let PAGE_MAP = null;

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function isNew(iso) {
  try {
    return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function getVoteKey(s) {
  return `${s.date}_${s.title}`.replace(/\s/g, '_');
}

function statusBadge(status) {
  if (!status || status === '') return '';
  if (status === 'Patched') return `<span class="badge-status patched"><i class="ti ti-x" style="font-size:10px"></i> Patched</span>`;
  if (status === 'Still works') return `<span class="badge-status works"><i class="ti ti-check" style="font-size:10px"></i> Still works</span>`;
  return '';
}

function renderCard(s) {
  const type = s.type || 'Tech';
  const key = getVoteKey(s);
  const voted = votedKeys.includes(key);
  const votes = parseInt(s.votes) || 0;
  const newBadge = isNew(s.date) ? `<span class="badge-new">NEW</span>` : '';

  return `
    <div class="sub-card">
      <div style="padding-top:2px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <span class="card-tag ${TAG_CLASS[type] || 'tag-tech'}">
          <i class="ti ${TAG_ICON[type] || 'ti-bolt'}" style="font-size:11px"></i> ${esc(type)}
        </span>
        <button class="upvote-btn ${voted ? 'voted' : ''}" onclick="handleUpvote(this, '${esc(key)}', '${esc(s.date)}', '${esc(s.title)}')" title="Upvote">
          <i class="ti ti-arrow-up"></i>
          <span class="vote-count">${votes}</span>
        </button>
      </div>
      <div class="sub-card-body">
        <h4>
          ${newBadge}
          ${statusBadge(s.status)}
          ${esc(s.title)}
          ${s.map && s.map !== 'No specific map' ? `<a href="map.html?map=${encodeURIComponent(s.map)}" class="map-link">· ${esc(s.map)}</a>` : ''}
        </h4>
        ${s.desc ? `<p>${esc(s.desc)}</p>` : ''}
        ${s.video ? `<div class="sub-card-video"><a href="${esc(s.video)}" target="_blank" rel="noopener"><i class="ti ti-external-link" style="font-size:12px"></i> Watch video</a></div>` : ''}
        <div class="sub-card-footer">
          <div class="sub-card-meta">By ${esc(s.name || 'Anonymous')}${s.date ? ' · ' + formatDate(s.date) : ''}</div>
          ${!s.status ? `<button class="suggest-status-btn" onclick="openStatusModal('${esc(key)}', '${esc(s.date)}', '${esc(s.title)}')"><i class="ti ti-flag" style="font-size:11px"></i> Suggest status</button>` : ''}
        </div>
      </div>
    </div>`;
}

async function handleUpvote(btn, key, date, title) {
  if (votedKeys.includes(key)) { showToast('You already upvoted this!'); return; }
  try {
    await fetch(API, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upvote', date, title })
    });
    votedKeys.push(key);
    localStorage.setItem('pf_voted_keys', JSON.stringify(votedKeys));
    const countEl = btn.querySelector('.vote-count');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || 0) + 1;
    btn.classList.add('voted');
    showToast('Upvoted! 🔥');
  } catch(e) {
    showToast('Failed to upvote. Try again.');
  }
}

function openStatusModal(key, date, title) {
  let modal = document.getElementById('status-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'status-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <h3>Suggest patch status</h3>
        <p>Is this tech/glitch still working in the current version of Phantom Forces?</p>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="modal-btn works" onclick="submitStatus('Still works')"><i class="ti ti-check"></i> Still works</button>
          <button class="modal-btn patched" onclick="submitStatus('Patched')"><i class="ti ti-x"></i> Patched</button>
        </div>
        <button class="modal-close" onclick="closeStatusModal()">Cancel</button>
      </div>`;
    document.body.appendChild(modal);
  }
  modal._key = key; modal._date = date; modal._title = title;
  modal.style.display = 'flex';
}

function closeStatusModal() {
  const modal = document.getElementById('status-modal');
  if (modal) modal.style.display = 'none';
}

async function submitStatus(status) {
  const modal = document.getElementById('status-modal');
  if (!modal) return;
  const { _date, _title } = modal;
  closeStatusModal();
  try {
    await fetch(API, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suggest_status', date: _date, title: _title, status })
    });
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `🏷️ Status suggestion: ${_title}`,
          color: status === 'Patched' ? 0xef4444 : 0x22c55e,
          fields: [
            { name: 'Suggestion', value: status, inline: true },
            { name: 'Submission', value: _title, inline: true }
          ],
          footer: { text: 'Phantom Forces Tech · Check col K in sheet to confirm' }
        }]
      })
    });
    showToast(`Thanks! "${status}" suggestion sent for review.`);
  } catch(e) {
    showToast('Failed to send suggestion. Try again.');
  }
}

function applyFilters(subs) {
  let filtered = [...subs];
  const { map, sort, search } = currentFilter;
  if (map && map !== 'All Maps') filtered = filtered.filter(s => s.map && s.map === map);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      (s.title || '').toLowerCase().includes(q) ||
      (s.desc || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.map || '').toLowerCase().includes(q)
    );
  }
  if (sort === 'newest') filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (sort === 'oldest') filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  else if (sort === 'top') filtered.sort((a, b) => (parseInt(b.votes) || 0) - (parseInt(a.votes) || 0));
  return filtered;
}

function renderList(typeFilter, mapFilter) {
  const el = document.getElementById('submissions-list');
  if (!el) return;

  let subs = [...allSubmissions];
  if (typeFilter) subs = subs.filter(s => s.type === typeFilter);
  if (mapFilter) subs = subs.filter(s => s.map === mapFilter);

  const filtered = applyFilters(subs);

  if (filtered.length === 0) {
    const msg = currentFilter.search || currentFilter.map !== 'All Maps'
      ? 'No results match your filters.'
      : (mapFilter ? `No approved submissions for ${mapFilter} yet.` : (EMPTY[typeFilter] || 'Nothing here yet.'));
    el.innerHTML = `<div class="empty-state">${msg}</div>`;
  } else {
    el.innerHTML = filtered.map(renderCard).join('');
  }

  const countEl = document.getElementById('count-' + (typeFilter || '').toLowerCase().replace(' ', '-'));
  if (countEl) countEl.textContent = subs.length;
}

function buildToolbar(typeFilter, mapFilter) {
  const toolbar = document.getElementById('pf-toolbar');
  if (!toolbar) return;
  const mapOptions = MAPS.map(m =>
    `<option value="${esc(m)}" ${m === currentFilter.map ? 'selected' : ''}>${esc(m)}</option>`
  ).join('');
  toolbar.innerHTML = `
    <div class="toolbar-inner">
      <div class="toolbar-search">
        <i class="ti ti-search"></i>
        <input type="text" id="search-input" placeholder="Search..." value="${esc(currentFilter.search)}"
          oninput="handleSearch(this.value, '${typeFilter || ''}', '${mapFilter || ''}')" />
      </div>
      ${!mapFilter ? `<select class="toolbar-select" onchange="handleMapFilter(this.value, '${typeFilter || ''}')">
        ${mapOptions}
      </select>` : ''}
      <select class="toolbar-select" onchange="handleSort(this.value, '${typeFilter || ''}', '${mapFilter || ''}')">
        <option value="newest" ${currentFilter.sort === 'newest' ? 'selected' : ''}>Newest first</option>
        <option value="oldest" ${currentFilter.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
        <option value="top" ${currentFilter.sort === 'top' ? 'selected' : ''}>Most upvoted</option>
      </select>
    </div>`;
}

function handleSearch(val, typeFilter, mapFilter) {
  currentFilter.search = val;
  renderList(typeFilter || null, mapFilter || null);
}

function handleMapFilter(val, typeFilter) {
  currentFilter.map = val;
  renderList(typeFilter || null);
}

function handleSort(val, typeFilter, mapFilter) {
  currentFilter.sort = val;
  renderList(typeFilter || null, mapFilter || null);
}

async function loadSubmissions(typeFilter, mapFilter) {
  try {
    const res = await fetch(API);
    const data = await res.json();
    allSubmissions = data.submissions || [];
    claimedNames = (data.claimedNames || []).map(n => n.toLowerCase());

    TYPES.forEach(type => {
      const count = allSubmissions.filter(s => s.type === type).length;
      updateCounter(type, count);
    });

    buildToolbar(typeFilter, mapFilter);
    renderList(typeFilter, mapFilter);
    renderLeaderboard();
    renderTopSubmissions();
  } catch (err) {
    console.error('Failed to load submissions:', err);
    const el = document.getElementById('submissions-list');
    if (el) el.innerHTML = `<div class="empty-state">Couldn't load submissions. Try refreshing.</div>`;
  }
}

function updateCounter(type, count) {
  const id = `count-${type.toLowerCase().replace(' ', '-')}`;
  const el = document.getElementById(id);
  if (el) el.textContent = count;
}

function renderLeaderboard() {
  const el = document.getElementById('leaderboard-list');
  if (!el) return;
  const counts = {};
  const topVoted = {};
  allSubmissions.forEach(s => {
    const name = s.name || 'Anonymous';
    counts[name] = (counts[name] || 0) + 1;
    const v = parseInt(s.votes) || 0;
    if (!topVoted[name] || v > (parseInt(topVoted[name].votes) || 0)) topVoted[name] = s;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (sorted.length === 0) { el.innerHTML = `<div class="empty-state">No submissions yet.</div>`; return; }
  const medals = ['🥇','🥈','🥉'];
  el.innerHTML = sorted.map(([name, count], i) => {
    const best = topVoted[name];
    const verified = claimedNames.includes(name.toLowerCase());
    return `
      <div class="leaderboard-card">
        <div class="leaderboard-rank">${medals[i] || `#${i+1}`}</div>
        <div class="leaderboard-body">
          <div class="leaderboard-name">${esc(name)} ${verified ? '<span class="badge-verified">🔒 Verified</span>' : ''}</div>
          <div class="leaderboard-meta">${count} submission${count !== 1 ? 's' : ''}${best ? ` · Best: "${esc(best.title)}" (${parseInt(best.votes)||0} votes)` : ''}</div>
        </div>
        <div class="leaderboard-count">${count}</div>
      </div>`;
  }).join('');
}

function renderTopSubmissions() {
  const el = document.getElementById('top-submissions');
  if (!el) return;
  const top = [...allSubmissions]
    .sort((a, b) => (parseInt(b.votes) || 0) - (parseInt(a.votes) || 0))
    .slice(0, 3);
  if (top.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = top.map(s => `
    <div class="sub-card">
      <div style="padding-top:2px">
        <span class="card-tag ${TAG_CLASS[s.type] || 'tag-tech'}">
          <i class="ti ${TAG_ICON[s.type] || 'ti-bolt'}" style="font-size:11px"></i> ${esc(s.type)}
        </span>
      </div>
      <div class="sub-card-body">
        <h4>${esc(s.title)}${s.map && s.map !== 'No specific map' ? ` <span style="font-weight:400;color:var(--text-muted)">· ${esc(s.map)}</span>` : ''}</h4>
        ${s.desc ? `<p>${esc(s.desc)}</p>` : ''}
        <div class="sub-card-meta">By ${esc(s.name || 'Anonymous')} · <i class="ti ti-arrow-up" style="font-size:11px"></i> ${parseInt(s.votes)||0} votes</div>
      </div>
    </div>`).join('');
}

async function loadRequests() {
  const el = document.getElementById('requests-list');
  if (!el) return;
  try {
    const res = await fetch(API + '?action=requests');
    const data = await res.json();
    const requests = (data.requests || []).reverse();
    if (requests.length === 0) { el.innerHTML = `<div class="empty-state">No requests yet — be the first!</div>`; return; }
    el.innerHTML = requests.map(r => `
      <div class="request-card ${r.claimed === true || r.claimed === 'TRUE' ? 'claimed' : ''}">
        <div class="request-body">
          <h4>${esc(r.request)}${r.map && r.map !== 'No specific map' ? ` <span class="map-tag">· ${esc(r.map)}</span>` : ''}</h4>
          <div class="sub-card-meta">By ${esc(r.name || 'Anonymous')} · ${formatDate(r.date)}${r.claimed === true || r.claimed === 'TRUE' ? ' · <span style="color:var(--success-text)">✓ Claimed</span>' : ''}</div>
        </div>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = `<div class="empty-state">Couldn't load requests.</div>`;
  }
}

async function handleRequest() {
  const name = document.getElementById('r-name').value.trim();
  const request = document.getElementById('r-request').value.trim();
  const map = document.getElementById('r-map').value;
  if (!request) { showToast("Please describe what you're looking for."); return; }
  const btn = document.getElementById('request-btn');
  btn.disabled = true; btn.textContent = 'Posting...';
  try {
    await fetch(API, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request', name, request, map })
    });
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `❓ New Request: ${request}`,
          color: 0x8b5cf6,
          fields: [
            { name: 'Posted by', value: name || 'Anonymous', inline: true },
            { name: 'Map', value: map || 'Any', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Phantom Forces Tech · Request Board' }
        }]
      })
    });
    showToast('Request posted! ✓');
    document.getElementById('r-name').value = '';
    document.getElementById('r-request').value = '';
    document.getElementById('r-map').value = 'No specific map';
    setTimeout(() => loadRequests(), 1000);
  } catch(e) { showToast('Something went wrong. Try again.'); }
  btn.disabled = false; btn.textContent = 'Post request';
}

async function handleSubmit() {
  const name  = document.getElementById('s-name').value.trim();
  const title = document.getElementById('s-title').value.trim();
  const type  = document.getElementById('s-type').value;
  const map   = document.getElementById('s-map').value;
  const desc  = document.getElementById('s-desc').value.trim();
  const video = document.getElementById('s-video').value.trim();
  if (!title) { showToast('Please add a title.'); return; }
  if (!desc)  { showToast('Please add a description.'); return; }
  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting...';
  try {
    await fetch(API, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title, type, map, desc, video })
    });
    const fields = [
      { name: 'Type', value: type, inline: true },
      { name: 'Submitted by', value: name || 'Anonymous', inline: true },
    ];
    if (map && map !== 'No specific map') fields.push({ name: 'Map', value: map, inline: true });
    if (desc)  fields.push({ name: 'Description', value: desc });
    if (video) fields.push({ name: 'Video', value: video });
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `📥 New ${type}: ${title}`,
          color: EMBED_COLOR[type] || 0x185fa5,
          fields,
          timestamp: new Date().toISOString(),
          footer: { text: 'Phantom Forces Tech · Pending approval in Google Sheet' }
        }]
      })
    });
    showToast("Submitted! It'll go live once approved. ✓");
    document.getElementById('s-name').value  = '';
    document.getElementById('s-title').value = '';
    document.getElementById('s-map').value   = 'No specific map';
    document.getElementById('s-desc').value  = '';
    document.getElementById('s-video').value = '';
  } catch(e) { showToast('Something went wrong. Try again.'); }
  btn.disabled = false; btn.textContent = 'Submit for review';
}

function setActiveNav(pageName) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// Auto-refresh using the page's own type/map so it never loses its filter
setInterval(() => loadSubmissions(PAGE_TYPE, PAGE_MAP), 30000);
