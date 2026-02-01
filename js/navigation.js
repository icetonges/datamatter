// CONFIG: Paths
const REPORT_PATH = 'data/houseproject1/report.json';
const EXCEL_PATH = 'data/houseproject1/ddd.xlsx';

let globalData = [];
let sortConfig = { key: null, direction: 'asc' };
let map; // Define globally to avoid initialization errors

// Initialize everything on load
window.onload = () => {
    const savedTheme = localStorage.getItem('selected-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    initMap();
    loadStrategicReport();
    initExcelData();
    syncIframeTheme();
};

function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; CARTO' 
    }).addTo(map);
}

// 1. Fetch JSON Strategic Report
async function loadStrategicReport() {
    try {
        const response = await fetch(REPORT_PATH);
        if (!response.ok) throw new Error('Report file not found');
        const data = await response.json();
        
        const container = document.getElementById('insights-section');
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
    }
}

// 2. Fetch Excel Property Data
async function initExcelData() {
    try {
        const response = await fetch(EXCEL_PATH);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        globalData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        renderAll();
    } catch (error) {
        document.getElementById('table-container').innerHTML = `<p style="color:red; text-align:center;">Error loading Excel: ${error.message}</p>`;
    }
}

// --- RENDERING LOGIC ---
const formatCurrency = (value) => {
    if (!value) return '-';
    const num = parseFloat(String(value).replace(/[$,]/g, ''));
    return isNaN(num) ? value : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
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
            marker.bindTooltip(`
                <div class="property-tooltip">
                    ${row.Image ? `<img src="${row.Image}" class="tooltip-img">` : ''}
                    <div style="font-size: 16px; font-weight: bold; color: white;">${formatCurrency(row.Price)}</div>
                    <div style="font-size: 12px; margin: 5px 0; color: #ccc;">📏 ${row.Size || '-'} sqft</div>
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
        html += '<tr>' + headers.map(h => {
            let val = row[h] || '-';
            if (h.toLowerCase() === 'price') val = formatCurrency(val);
            if (h.toLowerCase().includes('redfin') && String(val).startsWith('http')) val = `<a href="${val}" target="_blank" class="redfin-link">Redfin</a>`;
            return `<td>${val}</td>`;
        }).join('') + '</tr>';
    });
    container.innerHTML = html + '</tbody></table>';
}

function handleSort(key) {
    sortConfig.direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    sortConfig.key = key;
    globalData.sort((a, b) => {
        let v1 = String(a[key]).replace(/[$,]/g, '');
        let v2 = String(b[key]).replace(/[$,]/g, '');
        if (!isNaN(v1) && !isNaN(v2)) { v1 = parseFloat(v1); v2 = parseFloat(v2); }
        return sortConfig.direction === 'asc' ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
    });
    renderAll();
}

function syncIframeTheme() {
    const theme = document.documentElement.getAttribute('data-theme');
    const iframe = document.getElementById('main-frame');
    if (iframe && iframe.contentDocument) {
        iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
    }
}
