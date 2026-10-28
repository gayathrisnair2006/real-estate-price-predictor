/**
 * saved-reports.js
 * Renders saved reports from localStorage with search, view, and delete functionality.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderSavedReports();
});

// All reports loaded from localStorage
let allReports = [];

// ──────────────────────────────────────────────
//  Render Reports Grid
// ──────────────────────────────────────────────

function renderSavedReports(filter = '') {
  const container = document.getElementById('reportsContainer');
  const countEl   = document.getElementById('reportCountText');
  const clearBtn  = document.getElementById('clearAllBtn');
  if (!container) return;

  allReports = JSON.parse(localStorage.getItem('propai_reports') || '[]').reverse();
  const filtered = filter
    ? allReports.filter(r =>
        r.propType?.toLowerCase().includes(filter.toLowerCase()) ||
        r.city?.toLowerCase().includes(filter.toLowerCase()) ||
        r.state?.toLowerCase().includes(filter.toLowerCase()) ||
        r.date?.toLowerCase().includes(filter.toLowerCase())
      )
    : allReports;

  // Update count text
  if (countEl) {
    countEl.textContent = allReports.length === 0
      ? 'No reports saved yet.'
      : `${filtered.length} report${filtered.length !== 1 ? 's' : ''} found${filter ? ' matching "' + filter + '"' : ''}`;
  }

  // Show/hide Clear All button
  if (clearBtn) clearBtn.style.display = allReports.length > 0 ? 'inline-flex' : 'none';

  // Empty states
  if (allReports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <div class="empty-title">No saved reports yet</div>
        <div class="empty-text">Run an AI prediction and save the report to view it here.</div>
        <a href="prediction.html" class="btn btn-primary" style="width:auto;display:inline-flex;">
          <i class="fa-solid fa-plus"></i> New Prediction
        </a>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No reports found</div>
        <div class="empty-text">No reports match your search term. Try a different keyword.</div>
      </div>
    `;
    return;
  }

  // Render cards grid
  container.innerHTML = `<div class="reports-grid">${filtered.map(r => buildReportCard(r)).join('')}</div>`;
}

// ──────────────────────────────────────────────
//  Build Report Card HTML
// ──────────────────────────────────────────────

function buildReportCard(r) {
  const trendCls  = r.trend === 'Rising' ? 'tag-green' : r.trend === 'Stable' ? 'tag-amber' : 'tag-red';
  const trendIcon = r.trend === 'Rising' ? '↑' : r.trend === 'Stable' ? '→' : '↓';
  const typeIcon  = getPropertyIcon(r.propType);

  return `
    <div class="saved-report-card" id="card-${r.id}">
      <div class="src-header">
        <div>
          <div class="src-title">${escapeHtml(r.propType)} — ${escapeHtml(r.city)}</div>
          <div class="src-date">
            <i class="fa-solid fa-calendar" style="margin-right:3px;font-size:0.7rem;color:var(--text-muted);"></i>
            ${escapeHtml(r.date || '–')}
          </div>
        </div>
        <span class="tag ${trendCls}">${trendIcon} ${r.trend}</span>
      </div>

      <!-- Type & Location -->
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.875rem;font-size:0.82rem;color:var(--text-muted);">
        <span>${typeIcon}</span>
        <span>${escapeHtml(r.area?.toLocaleString('en-IN') || '–')} sq.ft</span>
        <span>•</span>
        <span>${r.bedrooms || '–'} BHK</span>
        <span>•</span>
        <span>${escapeHtml(r.furnishing || '–')}</span>
      </div>

      <div class="src-price">${formatIndianPrice(r.price)}</div>

      <!-- Quick Metrics -->
      <div class="src-stats">
        <div class="src-stat">
          <div class="src-stat-val" style="color:var(--primary);">${r.confidence || '–'}%</div>
          <div class="src-stat-lbl">Confidence</div>
        </div>
        <div class="src-stat">
          <div class="src-stat-val" style="color:var(--secondary);">${r.investScore || '–'}</div>
          <div class="src-stat-lbl">Invest Score</div>
        </div>
        <div class="src-stat">
          <div class="src-stat-val" style="color:var(--accent);">${r.rentalYield || '–'}%</div>
          <div class="src-stat-lbl">Rental Yield</div>
        </div>
      </div>

      <!-- Range -->
      <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1rem;">
        <i class="fa-solid fa-arrows-left-right" style="margin-right:4px;font-size:0.7rem;"></i>
        Range: ${formatIndianPrice(r.priceLow)} – ${formatIndianPrice(r.priceHigh)}
      </div>

      <!-- Actions -->
      <div class="src-actions">
        <button class="btn btn-primary btn-sm" onclick="viewReport('${r.id}')" style="flex:1;width:auto;">
          <i class="fa-solid fa-eye"></i> View
        </button>
        <button class="btn btn-outline btn-sm" onclick="viewResult('${r.id}')" style="flex:1;width:auto;">
          <i class="fa-solid fa-chart-bar"></i> Result
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteReport('${r.id}')" title="Delete report" style="padding:0.5rem 0.75rem;width:auto;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────
//  Actions
// ──────────────────────────────────────────────

/** View the full AI report for a saved report */
function viewReport(id) {
  const report = allReports.find(r => r.id === id);
  if (!report) { showToast('Report not found.', 'error'); return; }
  localStorage.setItem('propai_currentResult', JSON.stringify(report));
  window.location.href = 'report.html';
}

/** View the result page for a saved report */
function viewResult(id) {
  const report = allReports.find(r => r.id === id);
  if (!report) { showToast('Report not found.', 'error'); return; }
  localStorage.setItem('propai_currentResult', JSON.stringify(report));
  window.location.href = 'result.html';
}

/** Delete a single report with confirmation */
function deleteReport(id) {
  if (!confirm('Delete this report? This action cannot be undone.')) return;

  let reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');
  reports = reports.filter(r => r.id !== id);
  localStorage.setItem('propai_reports', JSON.stringify(reports));

  showToast('Report deleted.', 'info');
  updateSidebarBadge();
  renderSavedReports(document.getElementById('searchReports')?.value || '');
}

/** Clear all reports with confirmation */
function clearAllReports() {
  if (!confirm(`Delete all ${allReports.length} saved report(s)? This cannot be undone.`)) return;
  localStorage.removeItem('propai_reports');
  updateSidebarBadge();
  showToast('All reports cleared.', 'info');
  renderSavedReports();
}

/** Filter reports by search term */
function filterReports(term) {
  renderSavedReports(term);
}

// ──────────────────────────────────────────────
//  Utilities
// ──────────────────────────────────────────────

function getPropertyIcon(type) {
  const icons = {
    'Apartment': '🏢', 'Villa': '🏰', 'Independent House': '🏡',
    'Commercial': '🏗️', 'Land': '🌿',
  };
  return icons[type] || '🏠';
}

function formatIndianPrice(value) {
  if (!value || isNaN(value)) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000)   return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
