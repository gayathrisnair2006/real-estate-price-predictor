/**
 * prediction.js
 * Handles the property prediction form:
 * – Renders amenity checkboxes
 * – Tracks form completion
 * – Runs the AI price calculation engine
 * – Shows the animated loading screen
 * – Passes results to result.html
 */

// ──────────────────────────────────────────────
//  Constants: Amenities & Nearby Facilities
// ──────────────────────────────────────────────

const AMENITIES = [
  { id: 'lift',        label: 'Lift / Elevator',  icon: '🛗', bonus: 0.04 },
  { id: 'security',    label: '24/7 Security',     icon: '🛡️', bonus: 0.03 },
  { id: 'powerBackup', label: 'Power Backup',      icon: '⚡', bonus: 0.02 },
  { id: 'gym',         label: 'Gym / Fitness',     icon: '🏋️', bonus: 0.035 },
  { id: 'swimmingPool',label: 'Swimming Pool',     icon: '🏊', bonus: 0.05 },
  { id: 'garden',      label: 'Garden / Park',     icon: '🌳', bonus: 0.03 },
  { id: 'clubhouse',   label: 'Clubhouse',         icon: '🏛️', bonus: 0.025 },
  { id: 'cctv',        label: 'CCTV Surveillance', icon: '📹', bonus: 0.02 },
  { id: 'intercom',    label: 'Intercom',          icon: '📞', bonus: 0.01 },
];

const NEARBY = [
  { id: 'school',   label: 'School',       icon: '🏫', bonus: 0.04 },
  { id: 'hospital', label: 'Hospital',     icon: '🏥', bonus: 0.035 },
  { id: 'metro',    label: 'Metro Station',icon: '🚇', bonus: 0.06 },
  { id: 'mall',     label: 'Shopping Mall',icon: '🛍️', bonus: 0.03 },
  { id: 'highway',  label: 'Highway',      icon: '🛣️', bonus: 0.025 },
  { id: 'airport',  label: 'Airport',      icon: '✈️', bonus: 0.02 },
];

// City base rates (₹ per sq.ft) – Tier 1/2/3 city pricing
const CITY_RATES = {
  Mumbai:     11500,
  Delhi:      9500,
  Bengaluru:  8800,
  Hyderabad:  7200,
  Chennai:    7000,
  Pune:       7500,
  Gurgaon:    9000,
  Noida:      6800,
  Kolkata:    5800,
  Ahmedabad:  5200,
  Jaipur:     4800,
  Chandigarh: 5500,
  Lucknow:    4200,
  Kochi:      5600,
  Bhopal:     4000,
  Nagpur:     4100,
  Surat:      4500,
  Coimbatore: 4600,
  Other:      4000,
};

// Market trend modifiers by city
const CITY_TRENDS = {
  Mumbai: 'Rising', Delhi: 'Rising', Bengaluru: 'Rising',
  Hyderabad: 'Rising', Gurgaon: 'Rising', Noida: 'Rising',
  Pune: 'Rising', Chennai: 'Stable', Kochi: 'Stable',
  Kolkata: 'Stable', Ahmedabad: 'Stable', Other: 'Stable',
};

// ──────────────────────────────────────────────
//  Selection State – use JS Sets so state is
//  never corrupted by browser checkbox events
// ──────────────────────────────────────────────

/** Tracks which amenity IDs are currently selected */
const selectedAmenities = new Set();

/** Tracks which nearby facility IDs are currently selected */
const selectedNearby = new Set();

// ──────────────────────────────────────────────
//  DOM Initialization
// ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderAmenities();
  renderNearby();
  setupDragDrop();
});

/**
 * Render amenity tiles.
 * Uses <div> (NOT <label>) to prevent the browser from
 * double-firing a click on the hidden checkbox, which was
 * causing immediate deselection on scroll / window blur.
 */
function renderAmenities() {
  const grid = document.getElementById('amenitiesGrid');
  if (!grid) return;
  grid.innerHTML = AMENITIES.map(a => `
    <div class="amenity-check"
         id="amenity-tile-${a.id}"
         role="checkbox"
         aria-checked="false"
         tabindex="0"
         onclick="toggleAmenityTile('${a.id}', 'amenity')"
         onkeydown="if(event.key==='Enter'||event.key===' ')toggleAmenityTile('${a.id}','amenity')">
      <span class="amenity-icon">${a.icon}</span>
      <span class="amenity-label">${a.label}</span>
      <span class="amenity-tick" id="tick-${a.id}" style="margin-left:auto;display:none;color:var(--primary);font-size:0.75rem;">
        <i class="fa-solid fa-circle-check"></i>
      </span>
    </div>
  `).join('');
}

/**
 * Render nearby facility tiles.
 * Same <div>-based approach as amenities.
 */
function renderNearby() {
  const grid = document.getElementById('nearbyGrid');
  if (!grid) return;
  grid.innerHTML = NEARBY.map(n => `
    <div class="amenity-check"
         id="nearby-tile-${n.id}"
         role="checkbox"
         aria-checked="false"
         tabindex="0"
         onclick="toggleAmenityTile('${n.id}', 'nearby')"
         onkeydown="if(event.key==='Enter'||event.key===' ')toggleAmenityTile('${n.id}','nearby')">
      <span class="amenity-icon">${n.icon}</span>
      <span class="amenity-label">${n.label}</span>
      <span class="amenity-tick" id="neartick-${n.id}" style="margin-left:auto;display:none;color:var(--primary);font-size:0.75rem;">
        <i class="fa-solid fa-circle-check"></i>
      </span>
    </div>
  `).join('');
}

/**
 * Toggle a single amenity or nearby tile.
 * State is stored purely in JS Sets – completely
 * independent of DOM checkbox state.
 *
 * @param {string} id   – The amenity/nearby ID (e.g. 'gym', 'metro')
 * @param {'amenity'|'nearby'} type
 */
function toggleAmenityTile(id, type) {
  const isAmenity  = type === 'amenity';
  const targetSet  = isAmenity ? selectedAmenities : selectedNearby;
  const tileId     = isAmenity ? `amenity-tile-${id}` : `nearby-tile-${id}`;
  const tickId     = isAmenity ? `tick-${id}` : `neartick-${id}`;

  const tile = document.getElementById(tileId);
  const tick = document.getElementById(tickId);
  if (!tile) return;

  if (targetSet.has(id)) {
    // ── Deselect ──
    targetSet.delete(id);
    tile.classList.remove('checked');
    tile.setAttribute('aria-checked', 'false');
    if (tick) tick.style.display = 'none';
  } else {
    // ── Select ──
    targetSet.add(id);
    tile.classList.add('checked');
    tile.setAttribute('aria-checked', 'true');
    if (tick) tick.style.display = 'inline';
  }

  updateChecklist();
}

// ──────────────────────────────────────────────
//  Form Completion Checklist
// ──────────────────────────────────────────────

function updateChecklist() {
  const checks = {
    'chk-type':      !!document.getElementById('propType')?.value,
    'chk-city':      !!document.getElementById('city')?.value && !!document.getElementById('state')?.value,
    'chk-area':      !!document.getElementById('area')?.value && Number(document.getElementById('area')?.value) > 0,
    // Read from JS Sets – always accurate regardless of scroll/window state
    'chk-amenities': (selectedAmenities.size + selectedNearby.size) > 0,
  };

  let doneCount = 0;
  for (const [id, isDone] of Object.entries(checks)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (isDone) {
      el.classList.add('done');
      el.querySelector('.check-icon').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      doneCount++;
    } else {
      el.classList.remove('done');
      el.querySelector('.check-icon').innerHTML = '<i class="fa-solid fa-circle"></i>';
    }
  }

  const pct = Math.round((doneCount / Object.keys(checks).length) * 100);
  const fillEl = document.getElementById('progressFill');
  const pctEl  = document.getElementById('progressPct');
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl)  pctEl.textContent  = pct + '%';
}

// ──────────────────────────────────────────────
//  Image Upload
// ──────────────────────────────────────────────

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size must be under 5 MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('uploadPreview');
    if (preview) {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    }
    const area = document.getElementById('uploadArea');
    if (area) {
      area.querySelector('.file-upload-icon').innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--secondary);"></i>';
      area.querySelector('.file-upload-text').textContent = 'Image uploaded successfully!';
      area.querySelector('.file-upload-sub').textContent  = file.name;
    }
    showToast('Property image uploaded!', 'success');
  };
  reader.readAsDataURL(file);
}

/** Drag & drop setup for upload area */
function setupDragDrop() {
  const area = document.getElementById('uploadArea');
  if (!area) return;

  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // Simulate input change
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('propImage');
      if (input) {
        input.files = dt.files;
        handleImageUpload({ target: input });
      }
    }
  });
}

// ──────────────────────────────────────────────
//  Prediction Start – Loading Animation
// ──────────────────────────────────────────────

/** Validates the form, shows loading overlay, then runs AI engine */
function startPrediction() {
  // Validate required fields
  const propType = document.getElementById('propType')?.value;
  const city     = document.getElementById('city')?.value;
  const state    = document.getElementById('state')?.value;
  const areaVal  = Number(document.getElementById('area')?.value);

  if (!propType) { showToast('Please select a Property Type.', 'error'); return; }
  if (!city)     { showToast('Please select a City.', 'error'); return; }
  if (!state)    { showToast('Please select a State.', 'error'); return; }
  if (!areaVal || areaVal < 100) { showToast('Please enter a valid Area (minimum 100 sq.ft).', 'error'); return; }

  // Gather all form data
  const formData = gatherFormData();

  // Show loading overlay
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';

  // Animate loading steps
  animateLoadingSteps(() => {
    // Calculate AI prediction
    const result = calculatePrediction(formData);

    // Save current prediction to localStorage
    localStorage.setItem('propai_currentResult', JSON.stringify(result));
    localStorage.setItem('propai_currentForm',   JSON.stringify(formData));

    // Redirect to result page
    window.location.href = 'result.html';
  });
}

// ──────────────────────────────────────────────
//  Gather Form Data
// ──────────────────────────────────────────────

function gatherFormData() {
  // ── Read selections from JS Sets (always correct, immune to scroll/blur) ──
  const amenities = Array.from(selectedAmenities);  // e.g. ['gym', 'lift', 'pool']
  const nearby    = Array.from(selectedNearby);     // e.g. ['metro', 'school']

  return {
    propType:    document.getElementById('propType')?.value   || 'Apartment',
    city:        document.getElementById('city')?.value       || 'Other',
    state:       document.getElementById('state')?.value      || '',
    address:     document.getElementById('address')?.value    || '',
    area:        Number(document.getElementById('area')?.value)       || 1000,
    bedrooms:    Number(document.getElementById('bedrooms')?.value)   || 2,
    bathrooms:   Number(document.getElementById('bathrooms')?.value)  || 2,
    parking:     Number(document.getElementById('parking')?.value)    || 1,
    propAge:     Number(document.getElementById('propAge')?.value)    || 0,
    floor:       Number(document.getElementById('floor')?.value)      || 1,
    totalFloors: Number(document.getElementById('totalFloors')?.value) || 5,
    furnishing:  document.getElementById('furnishing')?.value  || 'Unfurnished',
    amenities,   // from selectedAmenities Set
    nearby,      // from selectedNearby Set
    date:        new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    id:          'rpt_' + Date.now(),
  };
}

// ──────────────────────────────────────────────
//  AI Price Calculation Engine
// ──────────────────────────────────────────────

/**
 * Calculates property price using multi-factor AI simulation.
 *
 * Formula:
 *   Base Price = Area × City Base Rate
 *   + BHK Premium
 *   + Bathroom Premium
 *   + Parking Bonus
 *   + Furnishing Bonus
 *   + Amenity Bonuses
 *   + Nearby Facility Bonuses
 *   - Age Depreciation
 *   + Floor Premium
 *   × Market Trend Multiplier
 *
 * @param {object} fd – Form data object
 * @returns {object} Complete prediction result
 */
function calculatePrediction(fd) {
  const baseRate = CITY_RATES[fd.city] || 4000; // ₹ per sq.ft

  // 1. Base Price
  let price = fd.area * baseRate;

  // 2. BHK Premium (each bedroom adds 4% to price)
  price += price * (fd.bedrooms * 0.04);

  // 3. Bathroom Premium
  price += price * (fd.bathrooms * 0.015);

  // 4. Parking Bonus
  price += price * (fd.parking * 0.02);

  // 5. Furnishing Bonus
  const furnBonus = { 'Unfurnished': 0, 'Semi-Furnished': 0.05, 'Fully Furnished': 0.12 };
  price += price * (furnBonus[fd.furnishing] || 0);

  // 6. Amenity Bonuses
  const amenBonusMap = Object.fromEntries(AMENITIES.map(a => [a.id, a.bonus]));
  for (const a of fd.amenities) {
    price += price * (amenBonusMap[a] || 0.02);
  }

  // 7. Nearby Facility Bonuses
  const nearBonusMap = Object.fromEntries(NEARBY.map(n => [n.id, n.bonus]));
  for (const n of fd.nearby) {
    price += price * (nearBonusMap[n] || 0.02);
  }

  // 8. Age Depreciation (max 30% for 30+ year old buildings)
  if (fd.propAge > 0) {
    const depRate = Math.min(fd.propAge * 0.012, 0.30);
    price -= price * depRate;
  }

  // 9. Floor Premium (higher floors in tall buildings = premium)
  if (fd.totalFloors >= 5 && fd.floor > 1) {
    const floorRatio = fd.floor / fd.totalFloors;
    price += price * (floorRatio * 0.06);
  }

  // 10. Property Type Multiplier
  const typeMult = {
    'Apartment': 1.0, 'Villa': 1.35, 'Independent House': 1.15,
    'Commercial': 1.25, 'Land': 0.6,
  };
  price *= (typeMult[fd.propType] || 1.0);

  // 11. Market Trend Multiplier (slight upward bias for rising cities)
  const trend = CITY_TRENDS[fd.city] || 'Stable';
  const trendMult = { Rising: 1.05, Stable: 1.0, Falling: 0.94 };
  price *= trendMult[trend];

  // Round to nearest 50,000
  price = Math.round(price / 50000) * 50000;

  // ── Derived Metrics ──

  // Price range: ±8% for high confidence, ±15% for lower
  const confidenceBase = calculateConfidence(fd);
  const rangePct = confidenceBase >= 88 ? 0.08 : 0.13;
  const priceLow  = Math.round(price * (1 - rangePct) / 50000) * 50000;
  const priceHigh = Math.round(price * (1 + rangePct) / 50000) * 50000;

  // Investment Score (0–100)
  const investScore = calculateInvestScore(fd, trend);

  // Future Appreciation (%) – 3-year estimate
  const appreciation = calculateAppreciation(fd.city, trend);

  // Rental Yield (% per year)
  const rentalYield = calculateRentalYield(fd, price);

  // Liquidity Score (0–100)
  const liquidity = calculateLiquidity(fd, trend);

  // Value breakdown (for pie chart)
  const breakdown = calculateBreakdown(fd, price, baseRate);

  // Quarter-wise price trend (last 6 quarters, ₹ per sqft)
  const quarterTrend = generateQuarterTrend(baseRate, trend);

  return {
    // Identity
    id:         fd.id,
    date:       fd.date,
    propType:   fd.propType,
    city:       fd.city,
    state:      fd.state,
    address:    fd.address,
    area:       fd.area,
    bedrooms:   fd.bedrooms,
    bathrooms:  fd.bathrooms,
    parking:    fd.parking,
    propAge:    fd.propAge,
    floor:      fd.floor,
    totalFloors:fd.totalFloors,
    furnishing: fd.furnishing,
    amenities:  fd.amenities,
    nearby:     fd.nearby,

    // Prediction
    price,
    priceLow,
    priceHigh,
    pricePerSqft: Math.round(price / fd.area),
    confidence:   confidenceBase,
    trend,
    investScore,
    appreciation,
    rentalYield,
    liquidity,
    breakdown,
    quarterTrend,
    baseRate,
  };
}

// ── Sub-calculators ────────────────────────────

/** Confidence score based on data completeness & city coverage */
function calculateConfidence(fd) {
  let score = 75; // Base
  if (fd.area)         score += 5;
  if (fd.propAge >= 0) score += 2;
  if (fd.address)      score += 3;
  if (fd.amenities.length > 0) score += 4;
  if (fd.nearby.length > 0)    score += 4;
  if (CITY_RATES[fd.city])     score += 5; // Known city = higher confidence
  score += Math.min(fd.amenities.length + fd.nearby.length, 6); // More data = more confidence
  return Math.min(score, 97);
}

/** Investment score (0–100) */
function calculateInvestScore(fd, trend) {
  let score = 50;
  if (trend === 'Rising')  score += 20;
  if (trend === 'Stable')  score += 5;
  if (trend === 'Falling') score -= 10;
  score += Math.min(fd.nearby.length * 5, 20);    // Nearby = +5 each (max 20)
  score += Math.min(fd.amenities.length * 2, 10);  // Amenities = +2 each (max 10)
  if (fd.propAge < 5)  score += 5;
  if (fd.propAge > 20) score -= 5;
  if (fd.furnishing === 'Fully Furnished') score += 3;
  return Math.min(Math.max(score, 30), 98);
}

/** Future appreciation estimate (%, 3-yr CAGR) */
function calculateAppreciation(city, trend) {
  const baseMap = {
    'Rising': { min: 9, max: 18 },
    'Stable': { min: 5, max: 9 },
    'Falling': { min: 1, max: 5 },
  };
  const range = baseMap[trend] || baseMap.Stable;
  // Add randomness based on city string
  const seed = city.charCodeAt(0) % 10;
  return parseFloat((range.min + (range.max - range.min) * (seed / 10)).toFixed(1));
}

/** Rental yield estimate (%) */
function calculateRentalYield(fd, price) {
  // Base annual rent estimation
  const monthlyRentPerSqft = {
    Mumbai: 55, Delhi: 42, Bengaluru: 38, Hyderabad: 32,
    Chennai: 30, Pune: 33, Gurgaon: 45, Noida: 30,
    Kolkata: 22, Ahmedabad: 20, Other: 18,
  };
  const ratePerSqft = monthlyRentPerSqft[fd.city] || 20;
  let monthlyRent   = ratePerSqft * fd.area;

  // Furnishing bump
  if (fd.furnishing === 'Fully Furnished')  monthlyRent *= 1.3;
  if (fd.furnishing === 'Semi-Furnished')   monthlyRent *= 1.12;

  const annualRent  = monthlyRent * 12;
  const yield_pct   = parseFloat(((annualRent / price) * 100).toFixed(2));
  return Math.min(Math.max(yield_pct, 1.5), 6.5);
}

/** Liquidity score (0–100) */
function calculateLiquidity(fd, trend) {
  let score = 50;
  if (trend === 'Rising')  score += 20;
  if (fd.propType === 'Apartment') score += 10;
  if (fd.propType === 'Land')      score -= 10;
  if (fd.nearby.includes('metro')) score += 10;
  if (fd.nearby.includes('mall'))  score += 5;
  return Math.min(Math.max(score, 25), 95);
}

/** Property value breakdown (for pie chart) */
function calculateBreakdown(fd, totalPrice, baseRate) {
  const landValue    = Math.round(fd.area * baseRate * 0.4);
  const constrValue  = Math.round(fd.area * 2500); // Avg construction cost
  const locationPrem = Math.round(totalPrice * 0.12);
  const amenityPrem  = Math.round(fd.amenities.length * totalPrice * 0.02);
  const marketPrem   = totalPrice - landValue - constrValue - locationPrem - amenityPrem;

  return {
    'Land Value':        Math.max(landValue, 0),
    'Construction':      Math.max(constrValue, 0),
    'Location Premium':  Math.max(locationPrem, 0),
    'Amenity Value':     Math.max(amenityPrem, 0),
    'Market Premium':    Math.max(marketPrem, 0),
  };
}

/** Generate 6-quarter price trend data */
function generateQuarterTrend(baseRate, trend) {
  const multipliers = trend === 'Rising'
    ? [0.86, 0.89, 0.92, 0.95, 0.97, 1.0]
    : trend === 'Stable'
    ? [0.94, 0.95, 0.96, 0.98, 0.99, 1.0]
    : [1.06, 1.04, 1.02, 1.01, 1.0, 0.98];

  return multipliers.map(m => Math.round(baseRate * m));
}

// ──────────────────────────────────────────────
//  Loading Animation Steps
// ──────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Collecting property information...',
  'Analyzing market trends...',
  'Comparing similar properties...',
  'Calculating location premium...',
  'Generating AI appraisal report...',
];

function animateLoadingSteps(onComplete) {
  let step = 0;
  const totalSteps = LOADING_MESSAGES.length;
  const stepDuration = 850; // ms per step

  // Reset steps
  for (let i = 0; i < totalSteps; i++) {
    const el = document.getElementById(`lstep-${i}`);
    if (el) { el.className = 'loading-step'; }
  }

  const msgEl = document.getElementById('loadingMessage');
  const pctEl = document.getElementById('loadingPct');

  function nextStep() {
    if (step > 0) {
      // Mark previous as done
      const prev = document.getElementById(`lstep-${step - 1}`);
      if (prev) prev.className = 'loading-step done';
    }
    if (step < totalSteps) {
      const cur = document.getElementById(`lstep-${step}`);
      if (cur) cur.className = 'loading-step active';
      if (msgEl) msgEl.textContent = LOADING_MESSAGES[step];
      if (pctEl)  pctEl.textContent = Math.round(((step + 1) / totalSteps) * 100) + '%';
      step++;
      setTimeout(nextStep, stepDuration);
    } else {
      // All done
      const lastEl = document.getElementById(`lstep-${totalSteps - 1}`);
      if (lastEl) lastEl.className = 'loading-step done';
      if (msgEl) msgEl.textContent = 'Prediction complete! Redirecting...';
      setTimeout(onComplete, 600);
    }
  }

  nextStep();
}
