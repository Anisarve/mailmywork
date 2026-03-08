// Menu toggle
const toggle = document.getElementById("menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (toggle && navLinks) {
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
}

// Global GSAP Entrance Animations for Premium Feel
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  if (container) {
    // Reveal container
    gsap.fromTo(container,
      { opacity: 0, y: 40, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" }
    );

    // Stagger reveal container contents
    const children = Array.from(container.children);
    if (children.length > 0) {
      gsap.fromTo(children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", delay: 0.2 }
      );
    }
  }

  // Navbar animation
  const header = document.querySelector("header");
  if (header) {
    gsap.fromTo(header,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );
  }

  // --- SEAMLESS LOCAL HISTORY DRAWER ---
  initHistoryDrawer();
});

function initHistoryDrawer() {
  // Inject the History Drawer HTML into the body
  const drawerHTML = `
    <div id="history-overlay" class="history-hidden"></div>
    <div id="history-drawer" class="history-hidden">
      <div class="history-header">
        <h2>Your Activity</h2>
        <button id="close-history">&times;</button>
      </div>
      <div id="history-content">
        <!-- History items injected here -->
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', drawerHTML);

  // Add History button to nav links if it doesn't exist
  const navLinksList = document.querySelector(".nav-links");
  if (navLinksList) {
    const historyBtnHtml = `<li><a href="#" id="open-history">History</a></li>`;
    navLinksList.insertAdjacentHTML('beforeend', historyBtnHtml);
  }

  const drawer = document.getElementById("history-drawer");
  const overlay = document.getElementById("history-overlay");
  const openBtn = document.getElementById("open-history");
  const closeBtn = document.getElementById("close-history");

  function openHistory() {
    renderHistory();
    drawer.classList.remove("history-hidden");
    overlay.classList.remove("history-hidden");
    gsap.to(drawer, { right: 0, duration: 0.4, ease: "power3.out" });
    gsap.to(overlay, { opacity: 1, display: "block", duration: 0.3 });
    // Close mobile menu if open
    if (toggle.classList.contains("active")) {
      toggle.classList.remove("active");
      navLinks.classList.remove("active");
    }
  }

  function closeHistory() {
    gsap.to(drawer, { right: "-400px", duration: 0.4, ease: "power3.in", onComplete: () => drawer.classList.add("history-hidden") });
    gsap.to(overlay, {
      opacity: 0, duration: 0.3, onComplete: () => {
        overlay.classList.add("history-hidden");
        overlay.style.display = "none";
      }
    });
  }

  if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openHistory(); });
  if (closeBtn) closeBtn.addEventListener("click", closeHistory);
  if (overlay) overlay.addEventListener("click", closeHistory);
}

// Global function to save activity to localStorage
window.saveToHistory = function (type, details, code = null) {
  try {
    let history = JSON.parse(localStorage.getItem('mmw_history') || '[]');

    const entry = {
      id: Date.now().toString(),
      type: type, // 'self-mail', 'share-text', 'share-file'
      details: details,
      code: code,
      timestamp: new Date().toISOString()
    };

    // Add to beginning of array
    history.unshift(entry);

    // Keep only the last 30 items
    if (history.length > 30) history = history.slice(0, 30);

    localStorage.setItem('mmw_history', JSON.stringify(history));
  } catch (e) {
    console.error("Could not save to history", e);
  }
};

// Render function for the UI
function renderHistory() {
  const content = document.getElementById("history-content");
  if (!content) return;

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('mmw_history') || '[]');
  } catch (e) { }

  if (history.length === 0) {
    content.innerHTML = `<div class="empty-history">No recent activity found.</div>`;
    return;
  }

  let html = '';
  history.forEach(item => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let icon = '';
    if (item.type === 'self-mail') icon = '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg>';
    else if (item.type === 'share-text') icon = '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>';
    else if (item.type === 'share-file') icon = '<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" fill="currentColor"/></svg>';

    let codeHtml = item.code ? `<div class="history-code">Code: <span>${item.code}</span></div>` : '';

    html += `
      <div class="history-item">
        <div class="history-icon type-${item.type}">${icon}</div>
        <div class="history-body">
          <div class="history-meta">${dateStr} at ${timeStr}</div>
          <div class="history-details">${item.details}</div>
          ${codeHtml}
        </div>
      </div>
    `;
  });

  content.innerHTML = html;
}