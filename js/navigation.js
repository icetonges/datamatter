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
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // 1. Apply to the main portal
    document.documentElement.setAttribute('data-theme', targetTheme);
    
    // 2. Save choice to memory
    localStorage.setItem('theme', targetTheme);
    
    // 3. Apply to the current iframe content
    syncIframeTheme();
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