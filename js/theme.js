/* ================================================================
   المحل العراقي — Universal Theme Engine (Zero-Flicker Architecture)
   ================================================================ */

function getResolvedTheme() {
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch (e) {
    return 'dark';
  }
}

function applyTheme(theme) {
  if (!theme) theme = getResolvedTheme();
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.backgroundColor = theme === 'dark' ? '#181b22' : '#e6ecf4';
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';

  // Dynamic meta theme-color sync
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', theme === 'dark' ? '#181b22' : '#e6ecf4');
}

// Immediately apply theme upon script evaluation
applyTheme();

function syncThemeButtons() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || getResolvedTheme();
  const isDark = currentTheme === 'dark';
  const iconClass = isDark ? 'fas fa-sun' : 'fas fa-moon';

  document.querySelectorAll('.theme-toggle, #themeToggleBtn, [data-theme-toggle]').forEach(btn => {
    const i = btn.querySelector('#themeIcon') || btn.querySelector('i');
    if (i) {
      i.className = iconClass;
    } else {
      btn.innerHTML = `<i class="${iconClass}" id="themeIcon"></i>`;
    }
    btn.setAttribute('aria-label', isDark ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن');
    btn.setAttribute('title', isDark ? 'الوضع الفاتح' : 'الوضع الداكن');
  });
}

function toggleAppTheme() {
  document.documentElement.classList.add('theme-transitioning');
  const currentTheme = document.documentElement.getAttribute('data-theme') || getResolvedTheme();
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  try {
    localStorage.setItem('theme', nextTheme);
  } catch (e) {}

  applyTheme(nextTheme);
  syncThemeButtons();

  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 350);
}

window.toggleAppTheme = toggleAppTheme;
window.applyTheme = applyTheme;
window.initTheme = applyTheme;
window.syncThemeButtons = syncThemeButtons;

// Global Delegated Event Listener so dynamically created buttons immediately work
document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('.theme-toggle, #themeToggleBtn, [data-theme-toggle]');
  if (toggleBtn) {
    e.preventDefault();
    e.stopPropagation();
    toggleAppTheme();
  }
}, true);

// Initial sync
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncThemeButtons);
} else {
  syncThemeButtons();
}

// Ensure clean URL without any lingering hash tags like #us
if (window.location.hash) {
  try {
    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch (e) {}
}

// Automatic Service Worker Registration for Ultra-Fast Local Caching & Background Updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // Check for updates automatically
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version available and cached.');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}
