function loadPage(btn, url) {
    document.getElementById('main-frame').src = url;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Theme Toggle Feature
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Apply to the main portal
    document.documentElement.setAttribute('data-theme', targetTheme);
    
    // Also apply to the content inside the iframe
    const iframe = document.getElementById('main-frame');
    if (iframe.contentDocument) {
        iframe.contentDocument.documentElement.setAttribute('data-theme', targetTheme);
    }
}