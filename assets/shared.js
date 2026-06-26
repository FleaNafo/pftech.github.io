// assets/shared.js

// Global variables to hold data and current filter state
let allSubmissions = [];
let currentMapFilter = 'all';

// Exact Phantom Forces maps list
const PF_MAPS = [
    'Bazaar', 'Black Site', 'Capot', 'Castle Keep', 'Containers', 
    'Crane Site', 'Derrick', 'Desert Storm', 'Dual Crane Site', 'Dunes', 
    'Dust Bowl', 'Elevation', 'Facility', 'Favela', 'Fortress', 
    'Foxholes', 'Heat', 'Height', 'Highway Lot', 'Marooned', 
    'Metro Classic', 'Metro ( 2025 )', 'Mirage', 'Paradise', 'Penthouse', 
    'Ravod 911', 'Rig', 'Ruins', 'Rundown', 'Second Storm', 
    'Stardom', 'Suburbia', 'Transit', 'Trench', 'Villa', 'Warehouse'
];

// Tag styling mappings
const TAG_CLASS = {
    'Tech': 'tag-tech',
    'Glitch': 'tag-glitch',
    'Tutorial': 'tag-tutorial',
    'Showcase': 'tag-showcase'
};

const TAG_ICON = {
    'Tech': 'ti-bolt',
    'Glitch': 'ti-bug',
    'Tutorial': 'ti-book',
    'Showcase': 'ti-video'
};

// Helper to escape HTML
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Helper to format dates
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Render a single card (Cleaned up video logic!)
function renderCard(s) {
    const type = s.type || 'Tech';
    const videoUrl = s.video || ''; 
    
    return `
        <div class="card">
            <div class="card-header">
                <span class="tag ${TAG_CLASS[type] || 'tag-tech'}"><i class="ti ${TAG_ICON[type] || 'ti-bolt'}"></i>${esc(type)}</span>
            </div>
            <h4 class="card-title">${esc(s.title)}${s.map ? ` · <span class="card-map">${esc(s.map)}</span>` : ''}</h4>
            ${s.desc ? `<p class="card-desc">${esc(s.desc)}</p>` : ''}
            
            ${videoUrl ? `<a href="${esc(videoUrl)}" target="_blank" class="card-video"><i class="ti ti-player-play"></i> Watch video</a>` : ''}
            
            <div class="card-footer">
                By ${esc(s.name || 'Anonymous')}${s.date ? ' · ' + formatDate(s.date) : ''}
            </div>
        </div>
    `;
}

// Main function to render the grid based on the current filter
function renderGrid() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    let filteredData = allSubmissions;
    
    // Apply map filter if one is selected
    if (currentMapFilter !== 'all') {
        filteredData = allSubmissions.filter(s => s.map === currentMapFilter);
    }

    if (filteredData.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="ti ti-inbox"></i><p>No submissions found for this map yet.</p></div>`;
        return;
    }

    grid.innerHTML = filteredData.map(renderCard).join('');
}

// Build the sidebar map buttons dynamically based on data
function buildSidebar() {
    const sidebar = document.getElementById('map-sidebar');
    if (!sidebar) return;

    // Get unique maps that actually have submissions
    const availableMaps = [...new Set(allSubmissions.map(s => s.map).filter(Boolean))].sort();
    
    let html = `<h3 class="sidebar-title"><i class="ti ti-map-pin"></i> Filter by Map</h3>`;
    html += `<button class="map-filter-btn ${currentMapFilter === 'all' ? 'active' : ''}" data-map="all">All Maps</button>`;
    
    availableMaps.forEach(map => {
        html += `<button class="map-filter-btn ${currentMapFilter === map ? 'active' : ''}" data-map="${esc(map)}">${esc(map)}</button>`;
    });

    sidebar.innerHTML = html;

    // Add click listeners to the new buttons
    sidebar.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMapFilter = btn.getAttribute('data-map');
            buildSidebar(); // Re-render to update 'active' class
            renderGrid();   // Re-render cards
        });
    });
}

// Fetch data from your Google Sheet API
async function initPage() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return; // Not on a page that needs this

    grid.innerHTML = `<div class="loading"><i class="ti ti-loader-2"></i> Loading submissions...</div>`;

    try {
        // REPLACE THIS URL with your actual Google Apps Script Web App URL
        const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'; 
        const response = await fetch(API_URL);
        const data = await response.json();
        
        allSubmissions = data; 
        buildSidebar();
        renderGrid();
    } catch (error) {
        console.error('Error fetching data:', error);
        grid.innerHTML = `<div class="empty-state"><i class="ti ti-alert-triangle"></i><p>Failed to load submissions. Please try again later.</p></div>`;
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', initPage);
