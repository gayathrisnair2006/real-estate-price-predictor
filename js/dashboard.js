/**
 * dashboard.js
 * Populates the dashboard with statistics, recent predictions, and the market trend chart.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
  renderRecentPredictions();
  renderMarketTrendChart();
});

// ──────────────────────────────────────────────
//  Stats Cards
// ──────────────────────────────────────────────

/** Load and animate dashboard stat cards */
function loadDashboardStats() {
  const reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');

  // Count of analyzed properties (reports saved)
  const propCount = reports.length;

  // Average price from saved reports (or demo value)
  let avgPrice = 0;
  if (reports.length > 0) {
    const total = reports.reduce((sum, r) => sum + (r.price || 0), 0);
    avgPrice = Math.round(total / reports.length);
  } else {
    avgPrice = 7850000; // Demo default
  }

  // Animate number counters
  animateCounter('statProperties', 0, propCount || 24, 1200, '');
  animateCounter('statAvgPrice', 0, avgPrice, 1500, '', true);
  animateCounter('statReports', 0, reports.length || 12, 1000, '');
}

/**
 * Animates a numeric counter from start to end.
 * @param {string} elementId – Target element ID
 * @param {number} start – Start value
 * @param {number} end   – End value
 * @param {number} duration – Animation duration (ms)
 * @param {string} prefix – Prefix character (e.g., '₹')
 * @param {boolean} formatLakh – Whether to format as Lakh/Cr
 */
function animateCounter(elementId, start, end, duration, prefix = '', formatLakh = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startTime = performance.now();
  function step(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const value  = Math.round(start + (end - start) * eased);

    // When formatLakh is true, formatIndianPrice already includes the ₹ symbol
    el.textContent = formatLakh ? formatIndianPrice(value, true) : (prefix + value.toLocaleString('en-IN'));

    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ──────────────────────────────────────────────
//  Recent Predictions List
// ──────────────────────────────────────────────

/** Renders recent predictions from localStorage */
function renderRecentPredictions() {
  const container = document.getElementById('recentPredictions');
  if (!container) return;

  const reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');

  // Use real saved reports OR show demo data
  const items = reports.length > 0
    ? reports.slice(-5).reverse()  // Latest 5
    : getDemoReports();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2rem;">
        <div class="empty-icon">🏠</div>
        <div class="empty-title">No predictions yet</div>
        <div class="empty-text">Start your first AI property prediction to see results here.</div>
        <a href="prediction.html" class="btn btn-primary btn-sm" style="width:auto;">
          <i class="fa-solid fa-plus"></i> New Prediction
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const trendClass = item.trend === 'Rising' ? 'rising' : item.trend === 'Stable' ? 'stable' : 'falling';
    const trendIcon  = item.trend === 'Rising' ? '↑' : item.trend === 'Stable' ? '→' : '↓';
    const typeIcon   = getPropertyIcon(item.propType);
    return `
      <div class="prediction-item" onclick="loadReport('${item.id}')">
        <div class="pred-icon">${typeIcon}</div>
        <div class="pred-details">
          <div class="pred-name">${escapeHtml(item.propType)} — ${escapeHtml(item.city || '–')}</div>
          <div class="pred-meta">
            <i class="fa-solid fa-ruler-combined" style="font-size:0.72rem;"></i> ${item.area || '–'} sq.ft &nbsp;•&nbsp;
            <i class="fa-solid fa-bed" style="font-size:0.72rem;"></i> ${item.bedrooms || '–'} BHK &nbsp;•&nbsp;
            ${item.date || '–'}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="pred-price">${formatIndianPrice(item.price)}</div>
          <span class="pred-badge ${trendClass}">${trendIcon} ${item.trend || 'Stable'}</span>
        </div>
      </div>
    `;
  }).join('');
}

/** Load a specific report into current prediction and redirect */
function loadReport(id) {
  const reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');
  const report  = reports.find(r => r.id === id);
  if (report) {
    localStorage.setItem('propai_currentResult', JSON.stringify(report));
    window.location.href = 'result.html';
  }
}

/** Get property type icon */
function getPropertyIcon(type) {
  const icons = {
    'Apartment':          '🏢',
    'Villa':              '🏰',
    'Independent House':  '🏡',
    'Commercial':         '🏗️',
    'Land':               '🌿',
  };
  return icons[type] || '🏠';
}

/** Demo data shown when no real reports exist */
function getDemoReports() {
  return [
    { id: 'demo1', propType: 'Apartment',         city: 'Mumbai',    area: 1200, bedrooms: 2, price: 18500000, trend: 'Rising',  date: '24 Oct 2026', confidence: 93 },
    { id: 'demo2', propType: 'Villa',              city: 'Bengaluru', area: 3200, bedrooms: 4, price: 42000000, trend: 'Rising',  date: '22 Oct 2026', confidence: 91 },
    { id: 'demo3', propType: 'Independent House',  city: 'Pune',      area: 1800, bedrooms: 3, price: 12500000, trend: 'Stable',  date: '20 Oct 2026', confidence: 88 },
    { id: 'demo4', propType: 'Apartment',          city: 'Hyderabad', area: 950,  bedrooms: 2, price: 7800000,  trend: 'Rising',  date: '18 Oct 2026', confidence: 90 },
    { id: 'demo5', propType: 'Commercial',         city: 'Delhi',     area: 2400, bedrooms: 0, price: 35000000, trend: 'Stable',  date: '15 Oct 2026', confidence: 86 },
  ];
}

// ──────────────────────────────────────────────
//  Market Trend Chart (Chart.js)
// ──────────────────────────────────────────────

function renderMarketTrendChart() {
  const canvas = document.getElementById('marketTrendChart');
  if (!canvas) return;

  const months  = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  // Realistic price index data (in Lakh ₹ per 1000 sqft)
  const priceIndex = [68.2, 69.5, 71.0, 72.4, 73.8, 75.1, 76.9, 77.5, 79.2, 80.8, 82.4, 84.1];

  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(26,108,243,0.25)');
  gradient.addColorStop(1, 'rgba(26,108,243,0)');

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Price Index (₹L / 1000 sqft)',
        data: priceIndex,
        borderColor: '#1a6cf3',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#1a6cf3',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.45,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#94a3b8',
          bodyColor: '#fff',
          padding: 10,
          callbacks: {
            label: ctx => ` ₹${ctx.parsed.y.toFixed(1)}L per 1000 sqft`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(226,232,240,0.6)', drawBorder: false },
          ticks: { color: '#94a3b8', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(226,232,240,0.6)', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => `₹${v}L`
          },
          min: 60,
        }
      }
    }
  });
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/**
 * Formats a number in Indian Rupee notation (Lakh / Crore).
 * @param {number} value – Numeric value in rupees
 * @param {boolean} short – If true, abbreviates (₹1.85 Cr)
 */
function formatIndianPrice(value, short = false) {
  if (!value || isNaN(value)) return '₹0';
  if (value >= 10000000) {
    const cr = (value / 10000000).toFixed(2);
    return short ? `₹${cr} Cr` : `₹${cr} Cr`;
  } else if (value >= 100000) {
    const l = (value / 100000).toFixed(2);
    return short ? `₹${l} L` : `₹${l} L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}

/** Sanitize HTML to prevent XSS */
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
