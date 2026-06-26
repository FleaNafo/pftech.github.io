const API = 'https://script.google.com/macros/s/AKfycbyMKOcKID6Uc4_c9L_5oJdI472gJPc93lLNQQ9PlZsEcCpTvz7Tf6QgwHbV0IENFeL4/exec';
const WEBHOOK = 'https://discord.com/api/webhooks/1519986780177305611/LcIjXkgLnvSYeFPzx1kLM6edgCPaeR-qjdeT5xkLRUSK1RAgJxDlCFHd8UXLjNIWVvbW';

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

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function getEmbedUrl(videoUrl) {
  if (!videoUrl) return null;
  
  // YouTube
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  
  // Roblox clip (example: roblox.com/share?code=XXX)
  const robloxMatch = videoUrl.match(/roblox\.com\/share\?code=([a-zA-Z0-9_-]+)/);
  if (robloxMatch) return `https://www.roblox.com/share?code=${robloxMatch[1]}`;
  
  return null;
}

function openVideoModal(videoUrl, title) {
  const embedUrl = getEmbedUrl(videoUrl);
  if (!embedUrl) {
    window.open(videoUrl, '_blank');
    return;
  }
  
  const modal = document.getElementById('video-modal');
  if (!modal) return;
  
  document.getElementById('modal-title').textContent = title;
  document.getElementById('video-embed').innerHTML = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
  modal.classList.add('show');
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('video-embed').innerHTML = '';
  }
}

function renderCard(s) {
  const type = s.type || 'Tech';
  return `
    <div class="sub-card">
      <div style="padding-top:2px">
        <span class="card-tag ${TAG_CLASS[type] || 'tag-tech'}">
          <i class="ti ${TAG_ICON[type] || 'ti-bolt'}" style="font-size:11px"></i> ${esc(type)}
        </span>
      </div>
      <div class="sub-card-body">
        <h4>${esc(s.title)}${s.map ? ` <span style="font-weight:400;color:var(--text-muted)">· ${esc(s.map)}</span>` : ''}</h4>
        ${s.desc ? `<p>${esc(s.desc)}</p>` : ''}
        ${s.video ? `<div class="sub-card-video" onclick="openVideoModal('${esc(s.video)}', '${esc(s.title)}')"><i class="ti ti-play" style="font-size:12px"></i> Watch video</div>` : ''}
        <div class="sub-card-meta">By ${esc(s.name || 'Anonymous')}${s.date ? ' · ' + formatDate(s.date) : ''}</div>
      </div>
    </div>`;
}

async function loadSubmissions(typeFilter = null) {
  try {
    const res = await fetch(API);
    const data = await res.json();
    const subs = data.submissions || [];

    const counts = { 'Tech': 0, 'Glitch': 0, 'Tutorial': 0, 'Video showcase': 0 };

    // Update counters
    TYPES.forEach(type => {
      counts[type] = subs.filter(s => s.type === type).length;
      updateCounter(type, counts[type]);
    });

    // Render specific type if on that page
    if (typeFilter) {
      const filtered = subs.filter(s => s.type === typeFilter).reverse();
      const el = document.getElementById('submissions-list');
      if (el) {
        el.innerHTML = filtered.length
          ? filtered.map(renderCard).join('')
          : `<div class="empty-state">${EMPTY[typeFilter]}</div>`;
      }
    }

  } catch (err) {
    console.error('Failed to load submissions:', err);
    const el = document.getElementById('submissions-list');
    if (el) el.innerHTML = `<div class="empty-state">Couldn't load submissions. Try refreshing.</div>`;
  }
}

function updateCounter(type, count) {
  const counterEl = document.getElementById(`count-${type.toLowerCase().replace(' ', '-')}`);
  if (counterEl) {
    counterEl.textContent = count;
  }
}

async function handleSubmit() {
  const name  = document.getElementById('s-name').value.trim();
  const title = document.getElementById('s-title').value.trim();
  const type  = document.getElementById('s-type').value;
  const map   = document.getElementById('s-map').value.trim();
  const desc  = document.getElementById('s-desc').value.trim();
  const video = document.getElementById('s-video').value.trim();

  if (!title) { showToast('Please add a title.'); return; }
  if (!desc)  { showToast('Please add a description.'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    // Save to Google Sheet
    await fetch(API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title, type, map, desc, video })
    });

    // Notify Discord
    const fields = [
      { name: 'Type', value: type, inline: true },
      { name: 'Submitted by', value: name || 'Anonymous', inline: true },
    ];
    if (map)   fields.push({ name: 'Map', value: map, inline: true });
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

    showToast('Submitted! It\'ll go live once approved. ✓');
    document.getElementById('s-name').value  = '';
    document.getElementById('s-title').value = '';
    document.getElementById('s-map').value   = '';
    document.getElementById('s-desc').value  = '';
    document.getElementById('s-video').value = '';

    // Reload submissions after a short delay to show new data
    setTimeout(() => loadSubmissions(), 1000);

  } catch (e) {
    console.error('Submit error:', e);
    showToast('Something went wrong. Try again.');
  }

  btn.disabled = false;
  btn.textContent = 'Submit for review';
}

// Set active nav link
function setActiveNav(pageName) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSubmissions();
  
  const modal = document.getElementById('video-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVideoModal();
    });
  }
  
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeVideoModal);
  }
});

// Refresh counters every 30 seconds
setInterval(() => loadSubmissions(), 30000);
