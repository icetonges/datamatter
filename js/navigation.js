// CONFIG: Fixed paths including the 'datamatter' repository name
const REPORT_PATH = 'datamatter/data/houseproject1/report.json';
const EXCEL_PATH = 'datamatter/data/houseproject1/ddd.xlsx'; 

let globalData = [];
let sortConfig = { key: null, direction: 'asc' };
let map; 

window.onload = () => {
    const savedTheme = localStorage.getItem('selected-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    initMap();
    loadStrategicReport();
    initExcelData();
};

function initMap() {
    // Standard Leaflet initialization
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; CARTO' 
    }).addTo(map);
}

async function loadStrategicReport() {
    try {
        const response = await fetch(REPORT_PATH);
        if (!response.ok) throw new Error('Report file not found');
        const data = await response.json();
        
        const container = document.getElementById('insights-section');
        const statusContainer = document.getElementById('status-container');

        // Render the status pill
        if (statusContainer && data.marketStatus) {
            statusContainer.innerHTML = `<span class="market-status-pill">Status: ${data.marketStatus}</span>`;
        }

        // Render strategic insight cards
        if (container && data.strategicInsights) {
            container.innerHTML = data.strategicInsights.map(item => `
                <div class="insight-card">
                    <small style="color: var(--accent-blue); text-transform: uppercase; font-weight:bold;">${item.category}</small>
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                    <div class="pro-tip">💡 <b>Strategy:</b> ${item.action}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error("Report Load Error:", error);
        document.getElementById('insights-section').innerHTML = `<p style="color: #ff6b6b;">Summary data unavailable. Path checked: ${REPORT_PATH}</p>`;
    }
}

async function initExcelData() {
    try {
        const response = await fetch(EXCEL_PATH);
        if (!response.ok) throw new Error('Excel file not found at ' + EXCEL_PATH);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        globalData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        renderAll();
    } catch (error) {
        console.error("Excel Load Error:", error);
        document.getElementById('table-container').innerHTML = `<p style="color:red; text-align:center;">Error loading Excel data from: ${EXCEL_PATH}</p>`;
    }
}

function renderAll() {
    renderMap(globalData);
    renderTable(globalData);
}

function renderMap(data) {
    if (!map) return;
    map.eachLayer((layer) => { if (layer instanceof L.Marker) map.removeLayer(layer); });
    const bounds = [];
    data.forEach(row => {
        const lat = parseFloat(row.Latitude || row.lat);
        const lng = parseFloat(row.Longitude || row.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng]).addTo(map);
            marker.bindTooltip(`
                <div class="property-tooltip">
                    <div style="font-size: 14px; font-weight: bold; color: white;">${row.Price || 'Contact'}</div>
                    <div style="font-size: 11px; color: #ccc;">${row.ProjectName || 'Property'}</div>
                </div>`, { sticky: true, direction: 'right' });
            bounds.push([lat, lng]);
        }
    });
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

function renderTable(data) {
    const container = document.getElementById('table-container');
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    let html = '<table><thead><tr>' + headers.map(h => `<th onclick="handleSort('${h}')">${h}</th>`).join('') + '</tr></thead><tbody>';
    data.forEach(row => {
        html += '<tr>' + headers.map(h => `<td>${row[h] || '-'}</td>`).join('') + '</tr>';
    });
    container.innerHTML = html + '</tbody></table>';
}

function handleSort(key) {
    sortConfig.direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    sortConfig.key = key;
    globalData.sort((a, b) => {
        let v1 = a[key], v2 = b[key];
        return sortConfig.direction === 'asc' ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
    });
    renderAll();
}