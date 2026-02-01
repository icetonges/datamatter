// CONFIG: Strictly relative paths. These work on both Local and GitHub Pages.
const REPORT_PATH = 'data/houseproject1/report.json';
const EXCEL_PATH = 'data/houseproject1/ddd.xlsx'; 

let globalData = [];
let sortConfig = { key: null, direction: 'asc' };
let map; 

window.onload = () => {
    // 1. Theme Setup
    const savedTheme = localStorage.getItem('selected-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 2. Initialize Map
    initMap();
    
    // 3. Load Data
    loadStrategicReport();
    initExcelData();
};

function initMap() {
    try {
        map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
            attribution: '&copy; CARTO' 
        }).addTo(map);
    } catch (e) {
        console.error("Leaflet Map Error:", e);
    }
}

async function loadStrategicReport() {
    const container = document.getElementById('insights-section');
    try {
        const response = await fetch(REPORT_PATH);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${REPORT_PATH} not found`);
        const data = await response.json();
        
        const statusContainer = document.getElementById('status-container');
        if (statusContainer && data.marketStatus) {
            statusContainer.innerHTML = `<span class="market-status-pill">Status: ${data.marketStatus}</span>`;
        }

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
        if (container) container.innerHTML = `<p style="color: #ff6b6b; padding: 20px;">⚠️ Summary data unavailable. Ensure file exists at: <b>${REPORT_PATH}</b></p>`;
    }
}

async function initExcelData() {
    const tableContainer = document.getElementById('table-container');
    try {
        const response = await fetch(EXCEL_PATH);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${EXCEL_PATH} not found`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        globalData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        renderAll();
    } catch (error) {
        console.error("Excel Load Error:", error);
        if (tableContainer) tableContainer.innerHTML = `<p style="color:red; text-align:center; padding: 20px;">Error loading Excel data. <br>Path checked: <b>${EXCEL_PATH}</b></p>`;
    }
}

const formatCurrency = (val) => {
    if (!val) return '-';
    const num = parseFloat(String(val).replace(/[$,]/g, ''));
    return isNaN(num) ? val : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

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
            marker.bindTooltip(`<b>${formatCurrency(row.Price)}</b><br>${row.ProjectName || 'Property'}`);
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
        html += '<tr>' + headers.map(h => {
            let val = row[h] || '-';
            if (h.toLowerCase() === 'price') val = formatCurrency(val);
            return `<td>${val}</td>`;
        }).join('') + '</tr>';
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