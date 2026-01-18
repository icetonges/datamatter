// Function to switch sub-pages
function loadPage(btn, url) {
    const iframe = document.getElementById('main-frame');
    iframe.src = url;
    
    // UI Update for buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Sync theme to the new page once it finishes loading
    iframe.onload = function() {
        syncIframeTheme();
    };
}

// Function to toggle the theme
function toggleTheme() {
    const root = document.documentElement;
    const newTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    
    // 1. Update the sidebar/portal
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('selected-theme', newTheme);

    // 2. REACH INTO THE IFRAME (The "Developer Dashboard" part)
    const frame = document.getElementById('content-frame'); // or your iframe ID
    if (frame && frame.contentDocument) {
        frame.contentDocument.documentElement.setAttribute('data-theme', newTheme);
    }
}

// Helper to push the theme inside the Iframe
function syncIframeTheme() {
    const theme = document.documentElement.getAttribute('data-theme');
    const iframe = document.getElementById('main-frame');
    if (iframe && iframe.contentDocument) {
        iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
    }
}

// Initialize theme on page load
window.onload = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    syncIframeTheme();
};