const API = 'https://script.google.com/macros/s/AKfycbyMKOcKID6Uc4_c9L_5oJdI472gJPc93lLNQQ9PlZsEcCpTvz7Tf6QgwHbV0IENFeL4/exec';
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

// State
let allSubmissions = [];
let currentFilter = { map: 'All Maps', sort: 'newest', search: '' };
let upvotes = JSON.parse(localStorage.getItem('pf_upvotes') || '{}');

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
    const diff = Date.now() - new Date(iso).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function getUpvoteKey(s) {
  return `${s.date}_${s.title}`.replace(/\s/g,'_');
}

function renderCard(s) {
  const type = s.type || 'Tech';
  const key = getUpvoteKey(s);
  const votes = upvotes[key] || 0;
  const voted = localStorage.getItem('pf_voted_' + key) === '1';
  const newBadge = isNew(s.date) ? `<span class="badge-new">NEW</span>` : '';

  return `
    <div class="sub-card">
      <div style="padding-top:2px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <span class="card-tag ${TAG_CLASS[type] || 'tag-tech'}">
          <i class="ti ${TAG_ICON[type] || 'ti-bolt'}" style="font-size:11px"></i> ${esc(type)}
        </span>
        <button class="upvote-btn ${voted ? 'voted' : ''}" onclick="handleUpvote('${esc(key)}')" title="Upvote">
          <i class="ti ti-arrow-up"></i>
          <span id="votes-${esc(key)}">${votes}</span>
        </button>
      </div>
      <div class="sub-card-body">
        <h4>
          ${newBadge}
          ${esc(s.title)}${s.map ? ` <span style="font-weight:400;color:var(--text-muted)">· ${esc(s.map)}</span>` : ''}
        </h4>
        ${s.desc ? `<p>${esc(s.desc)}</p>` : ''}
        ${s.video ? `<div class="sub-card-video"><a href="${esc(s.video)}" target="_blank" rel="noopener"><i class="ti ti-external-link" style="font-size:12px"></i> Watch video</a></div>` : ''}
        <div class="sub-card-meta">By ${esc(s.name || 'Anonymous')}${s.date ? ' · ' + formatDate(s.date) : ''}</div>
      </div>
    </div>`;
}

function handleUpvote(key) {
  const alreadyVoted = localStorage.getItem('pf_voted_' + key) === '1';
  if (alreadyVoted) { showToast('You already upvoted this!'); return; }
  upvotes[key] = (upvotes[key] || 0) + 1;
  localStorage.setItem('pf_upvotes', JSON.stringify(upvotes));
  localStorage.setItem('pf_voted_' + key, '1');
  const el = document.getElementById('votes-' + key);
  if (el) el.textContent = upvotes[key];
  const btn = el?.closest('.upvote-btn');
  if (btn) btn.classList.add('voted');
  showToast('Upvoted! 🔥');
}

function applyFilters(subs) {
  let filtered = [...subs];
  const { map, sort, search } = currentFilter;

  if (map && map !== 'All Maps') {
    filtered = filtered.filter(s => s.map && s.map.toLowerCase() === map.toLowerCase());
  }

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
  else if (sort === 'top') filtered.sort((a, b) => (upvotes[getUpvoteKey(b)] || 0) - (upvotes[getUpvoteKey(a)] || 0));

  return filtered;
}

function renderList(typeFilter) {
  const el = document.getElementById('submissions-list');
  if (!el) return;

  const typeSubs = typeFilter ? allSubmissions.filter(s => s.type === typeFilter) : allSubmissions;
  const filtered = applyFilters(typeSubs);

  if (filtered.length === 0) {
    const msg = currentFilter.search || currentFilter.map !== 'All Maps'
      ? 'No results match your filters.'
      : (EMPTY[typeFilter] || 'Nothing here yet.');
    el.innerHTML = `<div class="empty-state">${msg}</div>`;
  } else {
    el.innerHTML = filtered.map(renderCard).join('');
  }

  // Update count to show filtered/total
  const countEl = document.getElementById('count-' + (typeFilter || '').toLowerCase().replace(' ', '-'));
  if (countEl) countEl.textContent = typeSubs.length;
}

function buildToolbar(typeFilter) {
  const toolbar = document.getElementById('pf-toolbar');
  if (!toolbar) return;

  const mapOptions = MAPS.map(m =>
    `<option value="${esc(m)}" ${m === currentFilter.map ? 'selected' : ''}>${esc(m)}</option>`
  ).join('');

  toolbar.innerHTML = `
    <div class="toolbar-inner">
      <div class="toolbar-search">
        <i class="ti ti-search"></i>
        <input type="text" id="search-input" placeholder="Search ${typeFilter ? typeFilter.toLowerCase() + 's' : 'submissions'}..." value="${esc(currentFilter.search)}" oninput="handleSearch(this.value, '${typeFilter}')" />
      </div>
      <select class="toolbar-select" id="map-filter" onchange="handleMapFilter(this.value, '${typeFilter}')">
        ${mapOptions}
      </select>
      <select class="toolbar-select" id="sort-filter" onchange="handleSort(this.value, '${typeFilter}')">
        <option value="newest" ${currentFilter.sort === 'newest' ? 'selected' : ''}>Newest first</option>
        <option value="oldest" ${currentFilter.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
        <option value="top" ${currentFilter.sort === 'top' ? 'selected' : ''}>Most upvoted</option>
      </select>
    </div>
  `;
}

function handleSearch(val, typeFilter) {
  currentFilter.search = val;
  renderList(typeFilter);
}

function handleMapFilter(val, typeFilter) {
  currentFilter.map = val;
  renderList(typeFilter);
}

function handleSort(val, typeFilter) {
  currentFilter.sort = val;
  renderList(typeFilter);
}

async function loadSubmissions(typeFilter = null) {
  try {
    const res = await fetch(API);
    const data = await res.json();
    allSubmissions = data.submissions || [];

    // Update all counters
    TYPES.forEach(type => {
      const count = allSubmissions.filter(s => s.type === type).length;
      updateCounter(type, count);
    });

    // Build toolbar if it exists
    buildToolbar(typeFilter);

    // Render list
    renderList(typeFilter);

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
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    await fetch(API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title, type, map, desc, video })
    });

    const fields = [
      { name: 'Type', value: type, inline: true },
      { name: 'Submitted by', value: name || 'Anonymous', inline: true },
    ];
    if (map && map !== 'All Maps') fields.push({ name: 'Map', value: map, inline: true });
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

  } catch (e) {
    console.error('Submit error:', e);
    showToast('Something went wrong. Try again.');
  }

  btn.disabled = false;
  btn.textContent = 'Submit for review';
}

function setActiveNav(pageName) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => {
  loadSubmissions();
});

setInterval(() => loadSubmissions(), 30000);
