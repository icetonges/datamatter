// ============================================================
// navigation.js — House Project Explorer
// Works standalone OR inside an <iframe> within a parent shell.
// ============================================================

const REPORT_PATH = 'data/houseproject1/report.json';
const EXCEL_PATH  = 'data/houseproject1/ddd.xlsx';

let globalData  = [];
let map         = null;
let markerGroup = null;
let darkLayer   = null;
let lightLayer  = null;

// ─── Entry ──────────────────────────────────────────────────
// Use DOMContentLoaded instead of window.onload.
// window.onload waits for ALL sub-resources (images, iframes, external scripts).
// Inside an iframe that itself loads Leaflet + XLSX from CDNs, onload can fire
// before those CDN scripts have finished executing, so L or XLSX may be undefined.
// DOMContentLoaded fires once the DOM is parsed; we then explicitly wait for the
// external libs with a small poll before proceeding.
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[HouseProjExplorer] DOM ready. Initialising…');

    // 1. Apply theme (reads parent if in iframe, else uses own localStorage)
    applyTheme();

    // 2. Wait for Leaflet + XLSX to actually be available (CDN scripts can be slow)
    await waitForLibs();

    // 3. Init map
    initMap();

    // 4. Load data — fire both concurrently, each handles its own errors
    await Promise.all([
        loadStrategicReport(),
        loadExcelData()
    ]);

    console.log('[HouseProjExplorer] Init complete.');
});

// ─── Wait for CDN libs ──────────────────────────────────────
// Polls for up to 5 seconds. This is the reliable way to handle async CDN script loading.
function waitForLibs() {
    return new Promise((resolve) => {
        const start = Date.now();
        function check() {
            const leafletOk = typeof L !== 'undefined';
            const xlsxOk   = typeof XLSX !== 'undefined';
            if ((leafletOk && xlsxOk) || (Date.now() - start > 5000)) {
                if (!leafletOk) console.warn('[HouseProjExplorer] Leaflet did not load within 5s.');
                if (!xlsxOk)   console.warn('[HouseProjExplorer] XLSX did not load within 5s.');
                resolve();
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    });
}

// ─── Theme ──────────────────────────────────────────────────
function applyTheme() {
    let theme;

    // If we're inside an iframe, try to read the parent's theme first
    try {
        if (window.parent && window.parent !== window) {
            const parentTheme = window.parent.document.documentElement.getAttribute('data-theme');
            if (parentTheme) {
                theme = parentTheme;
                console.log('[HouseProjExplorer] Synced theme from parent:', theme);
            }
        }
    } catch (e) {
        // Cross-origin parent — can't access, fall through to own localStorage
    }

    // Fallback: own localStorage, then default to 'light' to match parent's default
    if (!theme) {
        theme = localStorage.getItem('selected-theme') || 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    updateToggleLabel(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next    = current === 'dark' ? 'light' : 'dark';

    // Set on this document
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('selected-theme', next);
    updateToggleLabel(next);

    // Try to sync to parent as well
    try {
        if (window.parent && window.parent !== window) {
            window.parent.document.documentElement.setAttribute('data-theme', next);
        }
    } catch (e) { /* cross-origin, ignore */ }

    // Swap map tiles
    swapMapTiles(next);
}

function updateToggleLabel(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

// ─── Map ────────────────────────────────────────────────────
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) { console.error('[HouseProjExplorer] #map element not found.'); return; }

    if (typeof L === 'undefined') {
        console.error('[HouseProjExplorer] Leaflet not available — map will not render.');
        mapEl.innerHTML = '<div class="error-inline" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;"><div class="error-title">⚠ Map Failed</div><div class="error-detail">Leaflet library could not be loaded.</div></div>';
        return;
    }

    map = L.map('map').setView([0, 0], 2);

    darkLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19 }
    );
    lightLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19 }
    );

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    (theme === 'dark' ? darkLayer : lightLayer).addTo(map);

    markerGroup = L.layerGroup().addTo(map);
    console.log('[HouseProjExplorer] Map initialised.');
}

function swapMapTiles(theme) {
    if (!map) return;
    try {
        if (map.hasLayer(lightLayer)) map.removeLayer(lightLayer);
        if (map.hasLayer(darkLayer))  map.removeLayer(darkLayer);
    } catch (e) { /* layer wasn't added yet, safe to ignore */ }
    (theme === 'dark' ? darkLayer : lightLayer).addTo(map);
}

// ─── Strategic Report ───────────────────────────────────────
async function loadStrategicReport() {
    const container = document.getElementById('insights-section');
    if (!container) { console.error('[HouseProjExplorer] #insights-section not found.'); return; }

    try {
        console.log('[HouseProjExplorer] Fetching report from:', REPORT_PATH);
        const response = await fetch(REPORT_PATH);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} — report.json not found at "${REPORT_PATH}".`);
        }

        const data = await response.json();

        // Validate structure before using
        if (!data || !Array.isArray(data.strategicInsights) || data.strategicInsights.length === 0) {
            throw new Error('report.json exists but has no valid "strategicInsights" array.');
        }

        container.innerHTML = data.strategicInsights.map(item => `
            <div class="insight-card">
                <h4>${escapeHtml(item.title  || 'Untitled')}</h4>
                <p>${escapeHtml(item.content || 'No details available.')}</p>
            </div>
        `).join('');

        console.log('[HouseProjExplorer] Report loaded — ' + data.strategicInsights.length + ' insights.');

    } catch (error) {
        console.error('[HouseProjExplorer] Report failed:', error.message);

        // Replace the loading placeholder with a visible error card
        container.innerHTML = `
            <div class="error-inline">
                <div class="error-title">⚠ Strategic Insights Unavailable</div>
                <div class="error-detail">${escapeHtml(error.message)}</div>
            </div>`;
    }
}

// ─── Excel Data ─────────────────────────────────────────────
async function loadExcelData() {
    const container = document.getElementById('table-container');
    if (!container) { console.error('[HouseProjExplorer] #table-container not found.'); return; }

    if (typeof XLSX === 'undefined') {
        console.error('[HouseProjExplorer] XLSX library not available.');
        container.innerHTML = renderErrorInline('XLSX library failed to load from CDN.');
        return;
    }

    try {
        console.log('[HouseProjExplorer] Fetching Excel from:', EXCEL_PATH);
        const response = await fetch(EXCEL_PATH);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} — Excel file not found at "${EXCEL_PATH}".`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // XLSX.read with an ArrayBuffer requires type:'buffer'
        const workbook    = XLSX.read(arrayBuffer, { type: 'buffer' });
        const sheetName   = workbook.SheetNames[0];
        const sheet       = workbook.Sheets[sheetName];
        globalData        = XLSX.utils.sheet_to_json(sheet);

        if (!globalData || globalData.length === 0) {
            throw new Error('Excel file parsed successfully but contains no data rows.');
        }

        console.log('[HouseProjExplorer] Excel loaded — ' + globalData.length + ' rows from sheet "' + sheetName + '".');

        renderTable();
        renderMapMarkers();

    } catch (error) {
        console.error('[HouseProjExplorer] Excel failed:', error.message);
        container.innerHTML = renderErrorInline(error.message);
    }
}

// ─── Render Table ───────────────────────────────────────────
function renderTable() {
    const container = document.getElementById('table-container');
    if (!container || globalData.length === 0) return;

    const headers = Object.keys(globalData[0]);

    // Update row count
    const countEl = document.getElementById('rowCount');
    if (countEl) countEl.textContent = globalData.length + ' properties';

    let html = '<table><thead><tr>'
             + headers.map(h => '<th>' + escapeHtml(h) + '</th>').join('')
             + '</tr></thead><tbody>';

    globalData.forEach(row => {
        html += '<tr>' + headers.map(h => {
            const val = row[h];
            let display;
            if (val === undefined || val === null) {
                display = '—';
            } else if (typeof val === 'number' && val >= 1000) {
                display = val.toLocaleString();
            } else {
                display = String(val);
            }
            return '<td>' + escapeHtml(display) + '</td>';
        }).join('') + '</tr>';
    });

    container.innerHTML = html + '</tbody></table>';
}

// ─── Render Map Markers ─────────────────────────────────────
function renderMapMarkers() {
    if (!map || !markerGroup) {
        console.warn('[HouseProjExplorer] Map not ready — skipping marker render.');
        return;
    }

    markerGroup.clearLayers();
    let markerCount = 0;

    globalData.forEach((row, i) => {
        // Try every common column name variant for coordinates
        const lat = parseFloat(
            row.Latitude  || row.latitude  || row.lat || row.Lat || row.LAT || ''
        );
        const lng = parseFloat(
            row.Longitude || row.longitude || row.lng || row.Lng || row.LNG || row.Long || ''
        );

        if (isNaN(lat) || isNaN(lng)) return;

        markerCount++;

        // Build tooltip + popup strings safely
        const name  = String(row.Name || row.name || row.Property || row.Title || ('Property #' + (i + 1)));
        const price = row.Price || row.price || '';
        const tooltipText = price
            ? name + ' — $' + Number(price).toLocaleString()
            : name;

        const popupHtml = '<strong>' + escapeHtml(name) + '</strong><br>'
            + 'Coordinates: ' + lat.toFixed(4) + ', ' + lng.toFixed(4)
            + (price ? '<br>Price: $' + Number(price).toLocaleString() : '');

        L.marker([lat, lng])
            .addTo(markerGroup)
            .bindTooltip(tooltipText, { permanent: false, direction: 'top' })
            .bindPopup(popupHtml);
    });

    console.log('[HouseProjExplorer] Plotted ' + markerCount + ' markers.');

    // Auto-zoom to fit all markers
    if (markerCount > 0) {
        try {
            map.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
        } catch (e) {
            console.warn('[HouseProjExplorer] fitBounds failed:', e.message);
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

function renderErrorInline(msg) {
    return '<div class="error-inline">'
         + '<div class="error-title">⚠ Could not load property data</div>'
         + '<div class="error-detail">' + escapeHtml(msg) + '</div>'
         + '</div>';
}

// Global so the HTML button's onclick can call it
window.toggleTheme = toggleTheme;
