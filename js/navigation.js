// ============================================================
// navigation.js — House Project Explorer
// ============================================================

// CONFIG: Purely relative paths (works on GitHub Pages)
const REPORT_PATH = 'data/houseproject1/report.json';
const EXCEL_PATH  = 'data/houseproject1/ddd.xlsx';

let globalData = [];
let map;
let markerGroup; // holds all map markers so we can fitBounds later

// ─── Entry Point ────────────────────────────────────────────
window.onload = async () => {
    // 1. Theme
    applyTheme();

    // 2. Map
    try {
        if (typeof L !== 'undefined') {
            initMap();
        } else {
            throw new Error("Leaflet library failed to load. Check your network connection.");
        }
    } catch (e) {
        showError("Map Error: " + e.message);
    }

    // 3. Data (run concurrently — each handles its own errors)
    await Promise.all([
        loadStrategicReport(),
        loadExcelData()
    ]);
};

// ─── Theme ──────────────────────────────────────────────────
function applyTheme() {
    const saved = localStorage.getItem('selected-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateToggleLabel(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('selected-theme', next);
    updateToggleLabel(next);

    // Swap map tile layer to match theme
    swapMapTiles(next);
}

function updateToggleLabel(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

// ─── Map ────────────────────────────────────────────────────
let darkLayer, lightLayer;

function initMap() {
    map = L.map('map').setView([0, 0], 2);

    // Two tile layers so we can swap on theme change
    darkLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19 }
    );
    lightLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19 }
    );

    // Start with whichever theme is active
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    (theme === 'dark' ? darkLayer : lightLayer).addTo(map);

    // Layer group for all markers (lets us fitBounds easily)
    markerGroup = L.layerGroup().addTo(map);
}

function swapMapTiles(theme) {
    if (!map) return;
    if (theme === 'dark') {
        map.removeLayer(lightLayer);
        darkLayer.addTo(map);
    } else {
        map.removeLayer(darkLayer);
        lightLayer.addTo(map);
    }
}

// ─── Strategic Report (JSON) ────────────────────────────────
async function loadStrategicReport() {
    const container = document.getElementById('insights-section');
    if (!container) return;

    try {
        const response = await fetch(REPORT_PATH);
        if (!response.ok) throw new Error(`Report not found (${response.status})`);

        const data = await response.json();

        // FIX: null-check the key AND confirm it's an array before calling .map()
        const insights = data && Array.isArray(data.strategicInsights) ? data.strategicInsights : null;
        if (!insights || insights.length === 0) {
            throw new Error("Report JSON has no 'strategicInsights' array.");
        }

        container.innerHTML = insights.map(item => `
            <div class="insight-card">
                <h4>${escapeHtml(item.title || 'Untitled')}</h4>
                <p>${escapeHtml(item.content || 'No details available.')}</p>
            </div>
        `).join('');

    } catch (error) {
        // FIX: show a visible fallback instead of leaving "Loading..." forever
        container.innerHTML = `
            <div class="insight-card" style="border-color: var(--error-border); background: var(--error-bg);">
                <h4 style="color: var(--error-text);">⚠ Strategic Insights Unavailable</h4>
                <p style="color: var(--error-text);">${escapeHtml(error.message)}</p>
            </div>`;
        console.warn("Report load failed:", error.message);
    }
}

// ─── Excel Data ─────────────────────────────────────────────
async function loadExcelData() {
    const tableContainer = document.getElementById('table-container');
    if (!tableContainer) return;

    // Show spinner while loading
    tableContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            Fetching property data…
        </div>`;

    try {
        const response = await fetch(EXCEL_PATH);
        if (!response.ok) throw new Error(`Excel file not found at "${EXCEL_PATH}" (HTTP ${response.status})`);

        const arrayBuffer = await response.arrayBuffer();

        // FIX: pass the raw ArrayBuffer with type:'buffer' — Uint8Array + type:'array' is incorrect
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        globalData = XLSX.utils.sheet_to_json(firstSheet);

        if (!globalData || globalData.length === 0) {
            throw new Error("Excel file is empty or has no parseable rows.");
        }

        renderTable();
        renderMapMarkers();

    } catch (error) {
        showError("Data Error: " + error.message);
        tableContainer.innerHTML = `
            <div class="loading-state" style="color: var(--error-text);">
                ⚠ Could not load property data.<br>
                <span style="font-size:12px; opacity:0.7;">${escapeHtml(error.message)}</span>
            </div>`;
    }
}

// ─── Render Table ───────────────────────────────────────────
function renderTable() {
    const container = document.getElementById('table-container');
    if (!container || globalData.length === 0) return;

    const headers = Object.keys(globalData[0]);

    // Update row count badge
    const countEl = document.getElementById('rowCount');
    if (countEl) countEl.textContent = globalData.length + ' properties';

    let html = '<table><thead><tr>'
        + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')
        + '</tr></thead><tbody>';

    globalData.forEach(row => {
        html += '<tr>' + headers.map(h => {
            const val = row[h];
            // Format numbers with commas if they look like currency/large numbers
            const display = (typeof val === 'number' && val >= 1000)
                ? val.toLocaleString()
                : (val !== undefined && val !== null ? String(val) : '—');
            return `<td>${escapeHtml(display)}</td>`;
        }).join('') + '</tr>';
    });

    container.innerHTML = html + '</tbody></table>';
}

// ─── Render Map Markers ─────────────────────────────────────
function renderMapMarkers() {
    if (!map || !markerGroup) return;

    markerGroup.clearLayers(); // remove old markers on re-render

    let hasMarkers = false;

    globalData.forEach(row => {
        // Support common column-name variants
        const lat = parseFloat(row.Latitude || row.latitude || row.lat || row.Lat);
        const lng = parseFloat(row.Longitude || row.longitude || row.lng || row.Lng || row.Long);

        if (isNaN(lat) || isNaN(lng)) return; // skip rows without valid coords

        hasMarkers = true;

        // FIX: build a proper string tooltip — coerce everything and provide fallback
        const name  = row.Name || row.name || row.Property || row.Title || 'Property';
        const price = row.Price || row.price || '';
        const label = price
            ? `${String(name)} — $${Number(price).toLocaleString()}`
            : String(name);

        L.marker([lat, lng])
            .addTo(markerGroup)
            .bindTooltip(label, { permanent: false, direction: 'top' })
            .bindPopup(`<strong>${escapeHtml(String(name))}</strong><br>
                        Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
                        ${price ? '<br>Price: $' + Number(price).toLocaleString() : ''}`);
    });

    // FIX: auto-zoom the map to fit all markers after plotting
    if (hasMarkers) {
        map.fitBounds(markerGroup.getBounds(), { padding: [40, 40] });
    }
}

// ─── Helpers ────────────────────────────────────────────────

// Prevents XSS when injecting user data into HTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// Shows an error banner at the top of the page
function showError(msg) {
    // Don't stack duplicate banners
    const existing = document.querySelector('.error-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.innerHTML = `<span class="error-icon">⚠️</span><span>${escapeHtml(msg)}</span>`;
    document.querySelector('.container').prepend(banner);
}

// Expose toggleTheme globally so the HTML button can call it
window.toggleTheme = toggleTheme;
