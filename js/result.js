/**
 * result.js
 * Loads prediction results from localStorage and renders:
 * – Hero price banner
 * – Confidence ring animation
 * – Score bars
 * – Pie chart (value breakdown)
 * – Bar chart (market trend)
 * – AI insight text
 */

document.addEventListener('DOMContentLoaded', () => {
  const result = JSON.parse(localStorage.getItem('propai_currentResult') || 'null');
  if (!result) {
    // No result found – redirect back to prediction
    showToast('No prediction data found. Please start a new prediction.', 'error');
    setTimeout(() => { window.location.href = 'prediction.html'; }, 2000);
    return;
  }
  renderResult(result);
});

// ──────────────────────────────────────────────
//  Main Render Function
// ──────────────────────────────────────────────

function renderResult(r) {
  // ── Hero Banner ──
  document.getElementById('resultPrice').textContent  = formatIndianPrice(r.price);
  document.getElementById('resultRange').textContent  =
    `Estimated Range: ${formatIndianPrice(r.priceLow)} – ${formatIndianPrice(r.priceHigh)}`;

  document.getElementById('rMetaConfidence').textContent = r.confidence + '%';
  document.getElementById('rMetaTrend').textContent      = r.trend;
  document.getElementById('rMetaInvScore').textContent   = r.investScore + '/100';
  document.getElementById('rMetaYield').textContent      = r.rentalYield + '%';

  // ── Property Info Bar ──
  document.getElementById('propTypeLabel').textContent    = r.propType;
  document.getElementById('propLocationLabel').textContent = `${r.city}${r.state ? ', ' + r.state : ''}`;
  document.getElementById('propAreaLabel').textContent    = `${r.area.toLocaleString('en-IN')} sq.ft`;
  document.getElementById('propBHKLabel').textContent     = r.bedrooms + ' BHK';

  // ── Confidence Ring ──
  renderConfidenceRing(r.confidence);

  // ── Score Bars ──
  renderScoreBars(r);

  // ── AI Insight ──
  document.getElementById('aiInsightText').textContent = generateInsight(r);

  // ── Trend Badge ──
  const trendBadge = document.getElementById('trendBadge');
  if (trendBadge) {
    const cls = r.trend === 'Rising' ? 'tag-green' : r.trend === 'Stable' ? 'tag-amber' : 'tag-red';
    trendBadge.className = `tag ${cls}`;
    trendBadge.textContent = r.trend === 'Rising' ? '↑ Rising' : r.trend === 'Stable' ? '→ Stable' : '↓ Falling';
  }
  const trendGrowthLabel = document.getElementById('trendGrowthLabel');
  if (trendGrowthLabel && r.quarterTrend) {
    const first = r.quarterTrend[0], last = r.quarterTrend[r.quarterTrend.length - 1];
    const growth = (((last - first) / first) * 100).toFixed(1);
    trendGrowthLabel.textContent = `${growth > 0 ? '+' : ''}${growth}% growth`;
    trendGrowthLabel.style.color = growth > 0 ? 'var(--secondary)' : 'var(--danger)';
  }

  // ── Charts ──
  setTimeout(() => {
    renderPieChart(r.breakdown);
    renderBarChart(r.quarterTrend, r.trend);
  }, 300);
}

// ──────────────────────────────────────────────
//  Confidence Ring SVG Animation
// ──────────────────────────────────────────────

function renderConfidenceRing(confidence) {
  const ringFill = document.getElementById('ringFill');
  const ringVal  = document.getElementById('ringValue');
  const badge    = document.getElementById('confidenceBadge');

  if (!ringFill) return;

  // SVG circle circumference = 2 × π × 65 ≈ 408.41
  const circumference   = 2 * Math.PI * 65;
  const targetOffset    = circumference - (circumference * confidence / 100);

  // Animate ring
  setTimeout(() => {
    ringFill.style.strokeDashoffset = targetOffset;
  }, 200);

  // Animate number
  animateNumber(ringVal, 0, confidence, 1500);

  // Confidence badge
  if (badge) {
    if (confidence >= 90) { badge.className = 'tag tag-green'; badge.textContent = '✓ High Confidence'; }
    else if (confidence >= 75) { badge.className = 'tag tag-amber'; badge.textContent = '~ Medium Confidence'; }
    else { badge.className = 'tag tag-red'; badge.textContent = '⚠ Low Confidence'; }
  }
}

// ──────────────────────────────────────────────
//  Score Bars
// ──────────────────────────────────────────────

function renderScoreBars(r) {
  // Investment Score (out of 100)
  setBar('barInvestScore', r.investScore + '/100', 'barInvFill',  r.investScore);

  // Appreciation (max shown as 25%)
  const appPct = Math.min((r.appreciation / 25) * 100, 100);
  setBar('barAppreciation', r.appreciation + '%', 'barAppFill', appPct);

  // Rental Yield (max shown as 8%)
  const rentPct = Math.min((r.rentalYield / 8) * 100, 100);
  setBar('barRentalYield', r.rentalYield + '%', 'barRentFill', rentPct);

  // Liquidity (out of 100)
  setBar('barLiquidity', r.liquidity + '/100', 'barLiqFill', r.liquidity);
}

function setBar(labelId, labelText, fillId, pct) {
  const lbl  = document.getElementById(labelId);
  const fill = document.getElementById(fillId);
  if (lbl)  lbl.textContent    = labelText;
  if (fill) fill.style.width   = Math.round(pct) + '%';
}

// ──────────────────────────────────────────────
//  Pie Chart – Value Breakdown
// ──────────────────────────────────────────────

function renderPieChart(breakdown) {
  const canvas = document.getElementById('pieChart');
  if (!canvas || !breakdown) return;

  const labels = Object.keys(breakdown);
  const values = Object.values(breakdown);
  const colors = ['#1a6cf3', '#00b87a', '#f59e0b', '#8b5cf6', '#ef4444'];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#94a3b8',
          bodyColor: '#fff',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatIndianPrice(ctx.parsed)}`
          }
        }
      }
    }
  });

  // Render custom legend
  const legendEl = document.getElementById('pieLegend');
  if (legendEl) {
    legendEl.innerHTML = labels.map((lbl, i) => `
      <div style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:var(--text-secondary);">
        <span style="width:10px;height:10px;border-radius:2px;background:${colors[i]};flex-shrink:0;"></span>
        <span>${lbl}</span>
        <span style="margin-left:auto;font-weight:700;color:var(--text-primary);">${formatIndianPrice(values[i])}</span>
      </div>
    `).join('');
  }
}

// ──────────────────────────────────────────────
//  Bar Chart – Market Trend
// ──────────────────────────────────────────────

function renderBarChart(quarterTrend, trend) {
  const canvas = document.getElementById('barChart');
  if (!canvas || !quarterTrend) return;

  const quarters = ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26'];

  const barColors = quarterTrend.map((val, i) => {
    const isLast = i === quarterTrend.length - 1;
    return isLast ? '#1a6cf3' : 'rgba(26,108,243,0.35)';
  });

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: quarters,
      datasets: [{
        label: '₹ / sq.ft',
        data: quarterTrend,
        backgroundColor: barColors,
        borderColor: 'transparent',
        borderRadius: 8,
        borderSkipped: false,
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
            label: ctx => ` ₹${ctx.parsed.y.toLocaleString('en-IN')} per sq.ft`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(226,232,240,0.6)', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: v => `₹${v.toLocaleString('en-IN')}`
          }
        }
      }
    }
  });
}

// ──────────────────────────────────────────────
//  Save Report
// ──────────────────────────────────────────────

function saveReport() {
  const result = JSON.parse(localStorage.getItem('propai_currentResult') || 'null');
  if (!result) { showToast('No prediction to save.', 'error'); return; }

  const reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');

  // Avoid duplicates
  if (reports.find(r => r.id === result.id)) {
    showToast('This report is already saved!', 'info');
    return;
  }

  reports.push(result);
  localStorage.setItem('propai_reports', JSON.stringify(reports));
  updateSidebarBadge();
  showToast('Report saved successfully! View in Saved Reports.', 'success');
}

/** Navigate to full report page */
function goToReport() {
  window.location.href = 'report.html';
}

// ──────────────────────────────────────────────
//  AI Insight Text Generator
// ──────────────────────────────────────────────

function generateInsight(r) {
  const insights = [];

  if (r.trend === 'Rising') {
    insights.push(`${r.city} is currently in a strong growth phase with property values rising consistently.`);
  } else if (r.trend === 'Stable') {
    insights.push(`${r.city} shows a stable market, making it a safe choice for long-term investment.`);
  } else {
    insights.push(`${r.city}'s market is experiencing a correction, which may offer buying opportunities.`);
  }

  if (r.investScore >= 75) {
    insights.push(`With an investment score of ${r.investScore}/100, this property is an excellent investment opportunity.`);
  } else if (r.investScore >= 60) {
    insights.push(`Investment score of ${r.investScore}/100 indicates a good potential for moderate returns.`);
  }

  if (r.rentalYield >= 4) {
    insights.push(`The estimated rental yield of ${r.rentalYield}% is above the market average, ideal for rental income.`);
  }

  if (r.nearby.includes('metro')) {
    insights.push(`Metro connectivity significantly enhances this property's value and liquidity.`);
  }

  return insights.join(' ');
}

// ──────────────────────────────────────────────
//  Utilities
// ──────────────────────────────────────────────

function formatIndianPrice(value) {
  if (!value || isNaN(value)) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000)   return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function animateNumber(el, start, end, duration) {
  if (!el) return;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
