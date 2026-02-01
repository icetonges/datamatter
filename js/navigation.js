// CONFIG: Purely relative paths for GitHub Pages
const REPORT_PATH = 'data/houseproject1/report.json';
const EXCEL_PATH = 'data/houseproject1/ddd.xlsx'; 

let globalData = [];
let map;

window.onload = async () => {
    console.log("Diagnostic: Page Loaded. Starting checks...");
    
    // 1. Theme (Safe)
    const savedTheme = localStorage.getItem('selected-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 2. Initialize Map (with Safety Check)
    try {
        if (typeof L !== 'undefined') {
            initMap();
        } else {
            throw new Error("Leaflet Library (L) not loaded. Check your HTML scripts.");
        }
    } catch (e) {
        showError("Map Error: " + e.message);
    }

    // 3. Load Files (Independent of each other)
    loadStrategicReport();
    initExcelData();
};

function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
        attribution: '&copy; CARTO' 
    }).addTo(map);
}

async function loadStrategicReport() {
    try {
        const response = await fetch(REPORT_PATH);
        if (!response.ok) throw new Error(`Could not find ${REPORT_PATH}`);
        const data = await response.json();
        
        const container = document.getElementById('insights-section');
        if (container) {
            container.innerHTML = data.strategicInsights.map(item => `
                <div class="insight-card">
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.warn("Report skipped:", error.message);
        // We don't crash the whole page if just the report is missing
    }
}

async function initExcelData() {
    const tableContainer = document.getElementById('table-container');
    try {
        const response = await fetch(EXCEL_PATH);
        if (!response.ok) throw new Error(`Excel file not found at: ${EXCEL_PATH}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        globalData = XLSX.utils.sheet_to_json(firstSheet);
        
        if (globalData.length > 0) {
            renderAll();
        } else {
            throw new Error("Excel file is empty or formatted incorrectly.");
        }
    } catch (error) {
        showError("Data Error: " + error.message);
    }
}

function renderAll() {
    // 1. Render Table
    const container = document.getElementById('table-container');
    const headers = Object.keys(globalData[0]);
    let html = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    globalData.forEach(row => {
        html += '<tr>' + headers.map(h => `<td>${row[h] || '-'}</td>`).join('') + '</tr>';
    });
    container.innerHTML = html + '</tbody></table>';

    // 2. Render Map Markers
    if (map) {
        globalData.forEach(row => {
            const lat = parseFloat(row.Latitude || row.lat);
            const lng = parseFloat(row.Longitude || row.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                L.marker([lat, lng]).addTo(map).bindTooltip(row.Price || "Property");
            }
        });
    }
}

// Helper to show errors on the actual page for you to see
function showError(msg) {
    const errorDiv = document.createElement('div');
    errorDiv.style = "background: #721c24; color: #f8d7da; padding: 15px; margin: 10px; border-radius: 5px; border: 1px solid #f5c6cb;";
    errorDiv.innerHTML = `<strong>⚠️ System Error:</strong> ${msg}`;
    document.body.prepend(errorDiv);
}