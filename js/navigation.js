// 1. Updated Path: Ensure no leading slash for GitHub Pages
const REPORT_PATH = 'data/houseproject1/report.json';

async function loadStrategicReport() {
    try {
        // We add a "timestamp" to the URL to force the browser to get the freshest version
        const cacheBuster = `?t=${new Date().getTime()}`;
        const response = await fetch(REPORT_PATH + cacheBuster);
        
        if (!response.ok) {
            throw new Error(`File not found at ${REPORT_PATH}`);
        }

        const data = await response.json();
        
        const container = document.getElementById('insights-section');
        const statusContainer = document.getElementById('status-container');

        // Update the Market Status Pill
        if (statusContainer && data.marketStatus) {
            statusContainer.innerHTML = `<span class="market-status-pill">Status: ${data.marketStatus}</span>`;
        }

        // Render the Strategic Insight Cards
        if (container && data.strategicInsights) {
            container.innerHTML = data.strategicInsights.map(item => `
                <div class="insight-card">
                    <small style="color: var(--accent-blue); font-weight:bold;">${item.category}</small>
                    <h4>${item.title}</h4>
                    <p>${item.content}</p>
                    <div class="pro-tip">💡 <b>Action:</b> ${item.action}</div>
                </div>
            `).join('');
        }
        console.log("JSON loaded successfully!");
    } catch (error) {
        console.error("JSON Error:", error.message);
        // Fallback so the UI doesn't look empty
        document.getElementById('insights-section').innerHTML = "<p>Insights are currently being updated...</p>";
    }
}