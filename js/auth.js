/**
 * auth.js
 * Handles authentication, session management, sidebar, and toast notifications.
 * Shared across all pages.
 */

// ──────────────────────────────────────────────
//  Utility: Toast Notifications
// ──────────────────────────────────────────────

/**
 * Shows a toast notification.
 * @param {string} message  – Message to display
 * @param {'success'|'error'|'info'} type – Toast type
 * @param {number} duration – Duration in ms (default 3500)
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const iconMap = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    info:    'fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon"><i class="fa-solid ${iconMap[type] || iconMap.info}"></i></span>
    <span class="toast-text">${message}</span>
    <button class="toast-close" onclick="this.closest('.toast').remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ──────────────────────────────────────────────
//  Login Page Logic
// ──────────────────────────────────────────────

/** Toggle password visibility on login page */
const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const pwdInput = document.getElementById('password');
    const eyeIcon  = document.getElementById('eyeIcon');
    const isHidden = pwdInput.type === 'password';
    pwdInput.type = isHidden ? 'text' : 'password';
    eyeIcon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });
}

/**
 * Handles login form submission.
 * Validates credentials and redirects to dashboard.
 */
function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('loginBtn');
  const btnText  = document.getElementById('loginBtnText');

  // Clear previous errors
  ['emailError', 'passwordError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Basic validation
  let valid = true;
  if (!email || !email.includes('@')) {
    showFieldError('emailError', 'Please enter a valid email address.');
    valid = false;
  }
  if (!password || password.length < 6) {
    showFieldError('passwordError', 'Password must be at least 6 characters.');
    valid = false;
  }
  if (!valid) return;

  // Simulate loading state
  btn.disabled = true;
  btnText.textContent = 'Signing in...';
  btn.style.opacity = '0.8';

  setTimeout(() => {
    // Demo: Accept any email with password ≥ 6 chars
    const userName = email.split('@')[0].replace(/[._]/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Store session in localStorage
    const session = {
      email,
      name: userName,
      loggedIn: true,
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem('propai_user', JSON.stringify(session));

    showToast('Welcome back! Redirecting to dashboard...', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  }, 1200);
}

/** Show a field-level error message */
function showFieldError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

/** Sign up click handler (demo only) */
function showSignupToast() {
  showToast('Registration is disabled in demo mode. Use the pre-filled credentials to sign in.', 'info', 5000);
}

// ──────────────────────────────────────────────
//  Session Guard – redirect if not logged in
// ──────────────────────────────────────────────

(function checkSession() {
  // Pages that don't require authentication
  const publicPages = ['index.html', '/', ''];
  const currentPage = window.location.pathname.split('/').pop();

  if (publicPages.includes(currentPage)) return; // On login page – OK

  const session = JSON.parse(localStorage.getItem('propai_user') || 'null');
  if (!session || !session.loggedIn) {
    // Not logged in → redirect to login
    window.location.href = 'index.html';
    return;
  }

  // Populate sidebar user info if elements exist
  populateSidebarUser(session);
  updateSidebarBadge();
})();

/** Fill sidebar user name & avatar */
function populateSidebarUser(session) {
  const nameEl   = document.getElementById('sidebarUserName');
  const avatarEl = document.getElementById('sidebarAvatar');
  if (nameEl) nameEl.textContent = session.name || 'Demo User';
  if (avatarEl) avatarEl.textContent = (session.name || 'D').charAt(0).toUpperCase();

  // Also update welcome name on dashboard
  const welcomeEl = document.getElementById('welcomeName');
  if (welcomeEl) {
    const firstName = (session.name || 'Demo').split(' ')[0];
    welcomeEl.textContent = firstName;
  }
}

/** Update the saved-reports badge in sidebar */
function updateSidebarBadge() {
  const badge = document.getElementById('sidebarReportCount');
  if (!badge) return;
  const reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');
  badge.textContent = reports.length;
}

/** Logout: clear session and redirect */
function logout() {
  localStorage.removeItem('propai_user');
  window.location.href = 'index.html';
}

// ──────────────────────────────────────────────
//  Mobile Sidebar Toggle
// ──────────────────────────────────────────────

function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  overlay && overlay.classList.toggle('open');
}
