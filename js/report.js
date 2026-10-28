/**
 * report.js
 * Builds the full AI Appraisal Report page and provides PDF download.
 */

document.addEventListener('DOMContentLoaded', () => {
  const result = JSON.parse(localStorage.getItem('propai_currentResult') || 'null');
  if (!result) {
    showToast('No report data found. Please run a prediction first.', 'error');
    setTimeout(() => window.location.href = 'prediction.html', 2000);
    return;
  }
  renderReport(result);
});

// ──────────────────────────────────────────────
//  Report Renderer
// ──────────────────────────────────────────────

function renderReport(r) {
  // Header
  const title = `${r.propType} — ${r.city}`;
  document.getElementById('reportTitle').textContent = title;
  document.getElementById('reportMeta').textContent  =
    `Generated on ${r.date} | PropAI v3.2 AI Engine`;

  // Tags
  const tagsEl = document.getElementById('reportTags');
  if (tagsEl) {
    const trendCls = r.trend === 'Rising' ? 'tag-green' : r.trend === 'Stable' ? 'tag-amber' : 'tag-red';
    tagsEl.innerHTML = `
      <span class="tag tag-blue"><i class="fa-solid fa-building"></i> ${r.propType}</span>
      <span class="tag tag-blue"><i class="fa-solid fa-location-dot"></i> ${r.city}, ${r.state}</span>
      <span class="tag ${trendCls}"><i class="fa-solid fa-chart-line"></i> ${r.trend} Market</span>
      <span class="tag tag-purple"><i class="fa-solid fa-bullseye"></i> ${r.confidence}% Confidence</span>
    `;
  }

  // Section 1: Overview
  setText('rpType',    r.propType);
  setText('rpLocation', `${r.address ? r.address + ', ' : ''}${r.city}, ${r.state}`);
  setText('rpArea',     `${r.area.toLocaleString('en-IN')} sq.ft`);
  setText('rpBHK',      `${r.bedrooms} Bedroom${r.bedrooms !== 1 ? 's' : ''}, ${r.bathrooms} Bathroom${r.bathrooms !== 1 ? 's' : ''}`);
  setText('rpFurnish',  r.furnishing);
  setText('rpAge',      r.propAge === 0 ? 'New / Under Construction' : `${r.propAge} year${r.propAge !== 1 ? 's' : ''} old`);
  setText('rpFloor',    `Floor ${r.floor} of ${r.totalFloors}`);
  setText('rpParking',  r.parking > 0 ? `${r.parking} covered space${r.parking > 1 ? 's' : ''}` : 'None');
  setText('rpAmenities', r.amenities.length > 0 ? r.amenities.join(', ').replace(/_/g, ' ') : 'None listed');
  setText('rpDate',     r.date);

  // Section 2: Valuation Summary
  setText('rpEstPrice',    formatIndianPrice(r.price));
  setText('rpPricePerSqft', `₹${r.pricePerSqft.toLocaleString('en-IN')} per sq.ft`);
  setText('rpPriceRange',  `${formatIndianPrice(r.priceLow)} – ${formatIndianPrice(r.priceHigh)}`);

  const vmEl = document.getElementById('valuationMetrics');
  if (vmEl) {
    const metrics = [
      { label: 'AI Confidence',   value: r.confidence + '%',      color: 'var(--primary)' },
      { label: 'Investment Score', value: r.investScore + '/100', color: 'var(--secondary)' },
      { label: 'Future Apprec.',  value: '+' + r.appreciation + '%', color: 'var(--accent)' },
      { label: 'Rental Yield',    value: r.rentalYield + '%',      color: '#8b5cf6' },
    ];
    vmEl.innerHTML = metrics.map(m => `
      <div style="text-align:center;padding:0.875rem;background:var(--bg-main);border-radius:12px;border:1px solid var(--border);">
        <div style="font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:800;color:${m.color};margin-bottom:0.25rem;">${m.value}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${m.label}</div>
      </div>
    `).join('');
  }

  // Section 3: Key Strengths
  const strengths = generateStrengths(r);
  const strengthsEl = document.getElementById('strengthsList');
  if (strengthsEl) {
    strengthsEl.innerHTML = strengths.map(s => `
      <div class="strength-item">
        <span class="strength-dot dot-green"></span>
        ${s}
      </div>
    `).join('');
  }

  // Section 4: Areas for Improvement
  const improvements = generateImprovements(r);
  const improvEl = document.getElementById('improvementsList');
  if (improvEl) {
    improvEl.innerHTML = improvements.map(s => `
      <div class="strength-item">
        <span class="strength-dot dot-amber"></span>
        ${s}
      </div>
    `).join('');
  }

  // Section 5: Market Analysis
  setText('marketAnalysisText', generateMarketAnalysis(r));
  const msEl = document.getElementById('marketStatsGrid');
  if (msEl) {
    const mStats = [
      { label: 'Market Trend',     value: r.trend,         cls: r.trend === 'Rising' ? 'green' : r.trend === 'Stable' ? 'amber' : 'red' },
      { label: 'Avg Price / sqft', value: `₹${r.baseRate.toLocaleString('en-IN')}`, cls: 'blue' },
      { label: '3-Year Apprec.',   value: '+' + r.appreciation + '%', cls: 'purple' },
    ];
    msEl.innerHTML = mStats.map(ms => `
      <div style="text-align:center;padding:1rem;background:var(--bg-main);border-radius:12px;border:1px solid var(--border);">
        <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:800;color:var(--${ms.cls === 'red' ? 'danger' : ms.cls === 'green' ? 'secondary' : ms.cls === 'amber' ? 'accent' : ms.cls === 'purple' ? 'text-primary' : 'primary'});margin-bottom:0.3rem;">${ms.value}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${ms.label}</div>
      </div>
    `).join('');
  }

  // Section 6: Investment Recommendation
  const { rating, ratingText, ratingIcon } = getInvestmentRating(r);
  const recEl = document.getElementById('investmentRec');
  if (recEl) {
    recEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2.5rem;">${ratingIcon}</div>
        <div>
          <div style="font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:800;color:var(--text-primary);">${rating}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${ratingText}</div>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:var(--primary);">${r.investScore}/100</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Investment Score</div>
        </div>
      </div>
    `;
  }
  setText('investmentText', generateInvestmentText(r));

  // Section 7: Suggested Prices
  const suggestSell   = Math.round(r.price * 1.03 / 50000) * 50000;     // 3% above estimate
  const monthlyRent   = calculateMonthlyRent(r);
  setText('rpSellPrice', formatIndianPrice(suggestSell));
  setText('rpRentPrice', `₹${monthlyRent.toLocaleString('en-IN')} / month`);
}

// ──────────────────────────────────────────────
//  Content Generators
// ──────────────────────────────────────────────

function generateStrengths(r) {
  const list = [];
  if (r.trend === 'Rising')           list.push(`${r.city} is a high-growth market with consistent annual appreciation, making it an ideal investment destination.`);
  if (r.nearby.includes('metro'))     list.push('Proximity to metro station significantly boosts property value, connectivity, and rental demand.');
  if (r.nearby.includes('school'))    list.push('Nearby reputed schools increase the property\'s appeal for families and long-term residents.');
  if (r.nearby.includes('hospital'))  list.push('Adjacency to a hospital adds a healthcare convenience premium, attractive to a wide tenant pool.');
  if (r.amenities.includes('gym'))    list.push('In-complex gym facility elevates lifestyle appeal and supports a premium rental bracket.');
  if (r.amenities.includes('swimmingPool')) list.push('Swimming pool is a premium amenity that directly enhances property market value by 5–8%.');
  if (r.amenities.includes('security'))     list.push('24/7 security provision is a strong selling point for both buyers and tenants, adding perceived value.');
  if (r.propAge <= 3)                list.push('Near-new or newly constructed property commands the highest market value with minimal depreciation.');
  if (r.furnishing === 'Fully Furnished') list.push('Fully furnished status reduces buyer or tenant investment, increasing marketability and rental premium.');
  if (r.floor > 3 && r.totalFloors >= 8) list.push('Higher floor placement offers better views and natural light, adding a floor premium to the listing price.');
  if (list.length < 3) list.push(`This ${r.propType.toLowerCase()} is well-positioned in ${r.city}, offering a strong combination of location, configuration, and amenities.`);
  return list;
}

function generateImprovements(r) {
  const list = [];
  if (r.propAge > 15)                 list.push('Building age exceeds 15 years — renovation of interiors and utilities can recover 8–12% of depreciated value.');
  if (!r.nearby.includes('metro'))    list.push('No metro station nearby limits connectivity premium. Consider highlighting alternative transport routes in listing.');
  if (!r.amenities.includes('gym'))   list.push('Adding a gym or fitness room to the complex can increase competitive positioning in the premium segment.');
  if (!r.amenities.includes('swimmingPool')) list.push('Properties with a swimming pool outperform by 5–8% in comparable searches. If feasible, adding one increases resale value.');
  if (r.furnishing === 'Unfurnished') list.push('Upgrading to semi-furnished or fully furnished could yield 10–20% higher rental returns and faster occupancy.');
  if (r.parking === 0)               list.push('Lack of dedicated parking reduces buyer interest in metro cities. Securing a parking allocation can improve value by 3–5%.');
  if (r.bedrooms <= 1)               list.push('1 BHK configurations have limited family demand. Adding a convertible study or workspace can increase buyer pool.');
  if (list.length < 2)               list.push('Minor cosmetic upgrades such as flooring, paint, and fixture replacements can add 3–5% to the asking price.');
  return list;
}

function generateMarketAnalysis(r) {
  const trendText = {
    Rising:  `${r.city}'s real estate market is in a strong upward cycle driven by IT sector expansion, infrastructure investment, and growing demand. Properties in this city have shown consistent appreciation of ${r.appreciation}% CAGR over the past 3 years.`,
    Stable:  `${r.city}'s market displays healthy stability with moderate price growth, reflecting balanced supply-demand dynamics. The city offers low-risk investment opportunities with steady returns and a ${r.appreciation}% expected appreciation.`,
    Falling: `${r.city}'s market is undergoing a cyclical correction. While current prices reflect lower demand, this presents a strategic buying opportunity. Analysts forecast a recovery phase with an estimated ${r.appreciation}% appreciation over 3 years.`,
  };
  return (trendText[r.trend] || trendText.Stable) +
    ` Average price per square foot in this area is ₹${r.baseRate.toLocaleString('en-IN')}, with rental yields averaging ${r.rentalYield}% annually. Comparable properties in a 2-km radius have shown transaction volumes increasing by 14% in the past quarter.`;
}

function generateInvestmentText(r) {
  const rating = r.investScore >= 80 ? 'Strong Buy' : r.investScore >= 65 ? 'Buy' : r.investScore >= 50 ? 'Hold' : 'Cautious';
  return `Based on our multi-factor analysis, this property receives a "${rating}" recommendation with an investment score of ${r.investScore}/100. ` +
    `The ${r.trend.toLowerCase()} market in ${r.city}, combined with ${r.amenities.length} amenities, ${r.nearby.length} nearby facilities, and a projected ${r.appreciation}% appreciation over 3 years, ` +
    `positions this property as a ${r.investScore >= 75 ? 'high-value' : 'moderate-value'} investment. ` +
    `The estimated rental yield of ${r.rentalYield}% annually provides a steady income stream while capital appreciation builds over time. ` +
    `We recommend a holding period of 3–5 years to maximize returns.`;
}

function getInvestmentRating(r) {
  if (r.investScore >= 82) return { rating: 'Strong Buy',  ratingText: 'Excellent investment opportunity with high growth potential',  ratingIcon: '🚀' };
  if (r.investScore >= 68) return { rating: 'Buy',          ratingText: 'Good investment with above-average returns expected',           ratingIcon: '✅' };
  if (r.investScore >= 55) return { rating: 'Hold',         ratingText: 'Moderate investment suitable for conservative portfolios',      ratingIcon: '⚖️' };
  return                          { rating: 'Cautious Buy', ratingText: 'Market conditions require careful due diligence before investing', ratingIcon: '⚠️' };
}

function calculateMonthlyRent(r) {
  const rentPerSqft = {
    Mumbai: 55, Delhi: 42, Bengaluru: 38, Hyderabad: 32,
    Chennai: 30, Pune: 33, Gurgaon: 45, Noida: 30,
    Kolkata: 22, Ahmedabad: 20, Other: 18,
  };
  const rate = rentPerSqft[r.city] || 20;
  let rent   = rate * r.area;
  if (r.furnishing === 'Fully Furnished')  rent *= 1.3;
  if (r.furnishing === 'Semi-Furnished')   rent *= 1.12;
  return Math.round(rent / 500) * 500;
}

// ──────────────────────────────────────────────
//  Save Report
// ──────────────────────────────────────────────

function saveReport() {
  const result = JSON.parse(localStorage.getItem('propai_currentResult') || 'null');
  if (!result) { showToast('No data to save.', 'error'); return; }

  const reports = JSON.parse(localStorage.getItem('propai_reports') || '[]');
  if (reports.find(r => r.id === result.id)) {
    showToast('Report already saved!', 'info'); return;
  }

  reports.push(result);
  localStorage.setItem('propai_reports', JSON.stringify(reports));
  updateSidebarBadge();
  showToast('✅ Report saved! View in Saved Reports.', 'success');
}

// ──────────────────────────────────────────────
//  PDF Download (using jsPDF)
// ──────────────────────────────────────────────

async function downloadPDF() {
  const result = JSON.parse(localStorage.getItem('propai_currentResult') || 'null');
  if (!result) { showToast('No report data available.', 'error'); return; }

  showToast('Generating PDF... Please wait.', 'info', 4000);

  // jsPDF is loaded from CDN
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210; // A4 width
  const margin = 18;

  // Helper: draw a colored rectangle
  const fillRect = (x, y, w, h, r, g, b) => {
    doc.setFillColor(r, g, b);
    doc.rect(x, y, w, h, 'F');
  };

  // ── Header ──
  fillRect(0, 0, W, 40, 26, 108, 243);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PropAI — AI Appraisal Report', margin, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${result.propType} | ${result.city}, ${result.state}`, margin, 23);
  doc.text(`Generated: ${result.date}  |  PropAI v3.2`, margin, 29);

  // ── Price Highlight ──
  fillRect(0, 40, W, 22, 0, 184, 122);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Estimated Price: ${formatIndianPrice(result.price)}`, margin, 52);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Range: ${formatIndianPrice(result.priceLow)} – ${formatIndianPrice(result.priceHigh)}   |   ${result.pricePerSqft.toLocaleString('en-IN')} per sq.ft`, margin, 58);

  let y = 72;
  doc.setTextColor(15, 23, 42);

  // ── Helper: section heading ──
  const sectionHead = (title, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 108, 243);
    doc.text(title, margin, y);
    doc.setDrawColor(26, 108, 243);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 1.5, W - margin, y + 1.5);
    doc.setTextColor(15, 23, 42);
    return y + 8;
  };

  // ── Helper: key-value row ──
  const kvRow = (key, value, y) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(key, margin, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 55, y);
    return y + 6;
  };

  // ── Section 1: Property Overview ──
  y = sectionHead('1. Property Overview', y);
  y = kvRow('Property Type:',  result.propType, y);
  y = kvRow('Location:',       `${result.city}, ${result.state}`, y);
  y = kvRow('Built-up Area:',  result.area.toLocaleString('en-IN') + ' sq.ft', y);
  y = kvRow('Configuration:',  `${result.bedrooms} Bed, ${result.bathrooms} Bath, ${result.parking} Parking`, y);
  y = kvRow('Furnishing:',     result.furnishing, y);
  y = kvRow('Property Age:',   result.propAge === 0 ? 'New' : result.propAge + ' years', y);
  y += 5;

  // ── Section 2: AI Valuation Metrics ──
  y = sectionHead('2. AI Valuation Metrics', y);

  // Metric boxes
  const metrics = [
    ['Confidence', result.confidence + '%'],
    ['Investment Score', result.investScore + '/100'],
    ['Appreciation (3Y)', '+' + result.appreciation + '%'],
    ['Rental Yield', result.rentalYield + '%'],
    ['Market Trend', result.trend],
    ['Liquidity', result.liquidity + '/100'],
  ];

  const boxW = (W - margin * 2 - 5 * 3) / 3;
  let bx = margin;
  metrics.forEach(([lbl, val], i) => {
    if (i > 0 && i % 3 === 0) { y += 18; bx = margin; }
    fillRect(bx, y, boxW, 14, 240, 244, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 108, 243);
    doc.text(val, bx + boxW / 2, y + 7, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(lbl, bx + boxW / 2, y + 12, { align: 'center' });
    bx += boxW + 3;
  });
  y += 24;

  // ── Section 3: Market Analysis ──
  y = sectionHead('3. Market Analysis', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const analysisText = generateMarketAnalysis(result);
  const wrapped = doc.splitTextToSize(analysisText, W - margin * 2);
  doc.text(wrapped, margin, y);
  y += wrapped.length * 5 + 5;

  // ── Section 4: Suggested Prices ──
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionHead('4. Suggested Prices', y);
  const suggestSell  = Math.round(result.price * 1.03 / 50000) * 50000;
  const monthlyRent  = calculateMonthlyRent(result);
  y = kvRow('Suggested Selling Price:', formatIndianPrice(suggestSell), y);
  y = kvRow('Suggested Monthly Rent:',  `₹${monthlyRent.toLocaleString('en-IN')} / month`, y);
  y = kvRow('Rental Yield (Annual):',   result.rentalYield + '%', y);
  y += 5;

  // ── Section 5: Investment Recommendation ──
  const { rating } = getInvestmentRating(result);
  y = sectionHead('5. Investment Recommendation', y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 184, 122);
  doc.text(rating, margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const investText = generateInvestmentText(result);
  const wrappedInv = doc.splitTextToSize(investText, W - margin * 2);
  doc.text(wrappedInv, margin, y);
  y += wrappedInv.length * 5 + 10;

  // ── Disclaimer ──
  fillRect(margin, y, W - margin * 2, 18, 255, 243, 199);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 110, 0);
  doc.text('Disclaimer:', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 80, 0);
  const disclaimer = 'This report is for informational and educational purposes only. Actual property values may vary. Consult a certified real estate professional before any investment decision.';
  const wrappedDisc = doc.splitTextToSize(disclaimer, W - margin * 2 - 6);
  doc.text(wrappedDisc, margin + 3, y + 10);

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('PropAI — Real Estate Intelligence Platform', margin, 290);
    doc.text(`Page ${p} of ${pageCount}`, W - margin, 290, { align: 'right' });
  }

  // ── Save ──
  const filename = `PropAI_Report_${result.city}_${Date.now()}.pdf`;
  doc.save(filename);
  showToast('PDF downloaded successfully!', 'success');
}

// ──────────────────────────────────────────────
//  Utilities
// ──────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatIndianPrice(value) {
  if (!value || isNaN(value)) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000)   return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
