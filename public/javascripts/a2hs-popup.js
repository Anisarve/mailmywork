// a2hs-popup.js - Add to Home Screen prompt

let deferredPrompt;

window.addEventListener('load', () => {
    // Check if user has already seen the popup
    const hasSeenA2HS = localStorage.getItem('hasSeenA2HS');

    if (hasSeenA2HS) {
        // User has already seen the popup, don't show again
        return;
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the default mini-infobar from appearing
        e.preventDefault();

        // Store the event for later use
        deferredPrompt = e;

        // Show custom popup after a short delay
        setTimeout(() => {
            showA2HSPopup();
        }, 2000); // Show popup 2 seconds after page load
    });
});

function showA2HSPopup() {
    // Create popup HTML
    const popup = document.createElement('div');
    popup.id = 'a2hs-popup';
    popup.innerHTML = `
        <div class="a2hs-overlay"></div>
        <div class="a2hs-content">
            <div class="a2hs-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="url(#logoGradient)" stroke-width="2"/>
                    <path d="M22 6l-10 7L2 6" fill="none" stroke="url(#logoGradient)" stroke-width="2"/>
                </svg>
            </div>
            <h2 class="a2hs-title">Add to Home Screen</h2>
            <p class="a2hs-text">Install MailMyWork for quick access and a better experience!</p>
            <div class="a2hs-buttons">
                <button class="a2hs-btn a2hs-install" id="installBtn">Install</button>
                <button class="a2hs-btn a2hs-dismiss" id="dismissBtn">Maybe Later</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Add event listeners
    document.getElementById('installBtn').addEventListener('click', installApp);
    document.getElementById('dismissBtn').addEventListener('click', dismissPopup);

    // Animate popup in
    setTimeout(() => {
        popup.classList.add('show');
    }, 100);
}

async function installApp() {
    if (!deferredPrompt) {
        dismissPopup();
        return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    deferredPrompt = null;

    // Mark as seen and close popup
    localStorage.setItem('hasSeenA2HS', 'true');
    dismissPopup();
}

function dismissPopup() {
    const popup = document.getElementById('a2hs-popup');
    if (popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
        }, 300);
    }

    // Mark as seen so it won't show again
    localStorage.setItem('hasSeenA2HS', 'true');
}

// Listen for successful installation
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed successfully');
    localStorage.setItem('hasSeenA2HS', 'true');
    dismissPopup();
});