// CONFIG: Use purely relative paths (no leading slash) for GitHub Pages
const REPORT_PATH = 'data/houseproject1/report.json'; 
const EXCEL_PATH = 'data/houseproject1/ddd.xlsx'; 

// 1. Fetch JSON Strategic Report with Error Handling
async function loadStrategicReport() {
    try {
        console.log("Attempting to fetch JSON from:", REPORT_PATH);
        const response = await fetch(REPORT_PATH);
        
        // Check if the file actually exists
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} at ${REPORT_PATH}`);
        }

        const data = await response.json();
        console.log("JSON successfully loaded:", data);
        
        const container = document.getElementById('insights-section');
        const statusContainer = document.getElementById('status-container');

        // Update Market Status
        if (statusContainer && data.marketStatus) {
            statusContainer.innerHTML = `<span class="market-status-pill">Status: ${data.marketStatus}</span>`;
        }

        // Render Insight Cards
        if (container && data.strategicInsights) {
            container.innerHTML = data.strategicInsights.map(item => `
                <div class="insight-card">
                    <small style="color: var(--accent-blue); text-transform: uppercase; font-weight:bold;">${item.category}</small>
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                    ${item.action ? `<div class="pro-tip">💡 <b>Strategy:</b> ${item.action}</div>` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        // Log the error but don't crash the Map or Table
        console.error("Critical JSON Load Failure:", error.message);
        const container = document.getElementById('insights-section');
        if (container) {
            container.innerHTML = `<p style="color: #64748b; font-size: 13px;">Notice: Strategic insights are currently unavailable.</p>`;
        }
    }
}