// CONFIG: Purely relative paths
const REPORT_PATH = 'data/houseproject1/report.json';
const EXCEL_PATH = 'data/houseproject1/ddd.xlsx'; 

let globalData = [];
let map; 

window.onload = () => {
    // 1. Set Theme
    const savedTheme = localStorage.getItem('selected-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 2. Safe Theme Sync (The fix that prevents the crash)
    const frame = document.getElementById('main-frame');
    if (frame) { syncIframeTheme(); }

    // 3. Run the Data Loaders
    initMap();
    loadStrategicReport();
    initExcelData();
};

function initMap() {
    try {
        map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
            attribution: '&copy; CARTO' 
        }).addTo(map);
    } catch (e) { console.error("Map Init Failed:", e); }
}

async function loadStrategicReport() {
    try {
        const response = await fetch(REPORT_PATH);
        if (!response.ok) return; // Exit silently if file missing
        const data = await response.json();
        
        const container = document.getElementById('insights-section');
        const statusContainer = document.getElementById('status-container');

        if (statusContainer) statusContainer.innerHTML = `<span class="market-status-pill">Status: ${data.marketStatus}</span>`;
        if (container) {
            container.innerHTML = data.strategicInsights.map(item => `
                <div class="insight-card">
                    <small style="color: var(--accent-blue); text-transform: uppercase;">${item.category}</small>
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                </div>
            `).join('');
        }
    } catch (e) { console.warn("JSON Report not found, skipping..."); }
}

async function initExcelData() {
    try {
        const response = await fetch(EXCEL_PATH);
        if (!response.ok) throw new Error("Excel file not found at " + EXCEL_PATH);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        globalData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        renderAll();
    } catch (e) {
        console.error("Excel Error:", e);
        document.getElementById('table-container').innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    }
}

function renderAll() {
    renderMap(globalData);
    renderTable(globalData);
}

function renderMap(data) {
    if (!map || !data.length) return;
    const bounds = [];
    data.forEach(row => {
        const lat = parseFloat(row.Latitude || row.lat);
        const lng = parseFloat(row.Longitude || row.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            L.marker([lat, lng]).addTo(map).bindTooltip(String(row.Price || "Property"));
            bounds.push([lat, lng]);
        }
    });
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

function renderTable(data) {
    const container = document.getElementById('table-container');
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    let html = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    data.forEach(row => {
        html += '<tr>' + headers.map(h => `<td>${row[h] || '-'}</td>`).join('') + '</tr>';
    });
    container.innerHTML = html + '</tbody></table>';
}

function syncIframeTheme() {
    const theme = document.documentElement.getAttribute('data-theme');
    const iframe = document.getElementById('main-frame');
    if (iframe && iframe.contentDocument) {
        iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
    }
}