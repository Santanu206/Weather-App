/**
 * Dynamic Weather Dashboard v2 — Main Frontend Logic
 * Modules: State, API (with timeout), Renderers, Theme, Compare, Chat
 */

// ── DOM ─────────────────────────────────────────────────────
const dom = {
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    autocompleteDropdown: document.getElementById('autocomplete-dropdown'),
    autocompleteWrapper: document.getElementById('autocomplete-wrapper'),
    compareForm: document.getElementById('compare-form'),
    city1Input: document.getElementById('city1-input'),
    city1Dropdown: document.getElementById('city1-dropdown'),
    city1Wrapper: document.getElementById('city1-wrapper'),
    city2Input: document.getElementById('city2-input'),
    city2Dropdown: document.getElementById('city2-dropdown'),
    city2Wrapper: document.getElementById('city2-wrapper'),
    unitToggle: document.getElementById('unit-toggle'),
    errorContainer: document.getElementById('error-container'),
    errorText: document.getElementById('error-text'),
    loadingContainer: document.getElementById('loading-container'),
    welcomeSection: document.getElementById('welcome-section'),
    weatherContent: document.getElementById('weather-content'),
    compareContent: document.getElementById('compare-content'),
    cityName: document.getElementById('city-name'),
    cityMeta: document.getElementById('city-meta'),
    currentIcon: document.getElementById('current-icon'),
    tempValue: document.getElementById('temp-value'),
    tempUnit: document.getElementById('temp-unit'),
    conditionText: document.getElementById('condition-text'),
    currentDetails: document.getElementById('current-details'),
    recsSection: document.getElementById('recs-section'),
    recsGrid: document.getElementById('recs-grid'),
    forecastSection: document.getElementById('forecast-section'),
    forecastCards: document.getElementById('forecast-cards'),
    compareCol1: document.getElementById('compare-col-1'),
    compareCol2: document.getElementById('compare-col-2'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    tabSingle: document.getElementById('tab-single'),
    tabCompare: document.getElementById('tab-compare'),
    chatFab: document.getElementById('chat-fab'),
    chatPanel: document.getElementById('chat-panel'),
    chatClose: document.getElementById('chat-close'),
    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-input-form'),
    chatInput: document.getElementById('chat-input'),
};

// ── State ───────────────────────────────────────────────────
const state = {
    currentCity: '',
    units: 'metric',
    mode: 'single',
    weatherData: null,
    isDarkMode: true,
};

// ── Icons ───────────────────────────────────────────────────
const ICONS = {
    'clear':         { day: '☀️', night: '🌙' },
    'partly-cloudy': { day: '⛅', night: '☁️' },
    'cloudy':        { day: '☁️', night: '☁️' },
    'fog':           { day: '🌫️', night: '🌫️' },
    'drizzle':       { day: '🌦️', night: '🌧️' },
    'rain':          { day: '🌧️', night: '🌧️' },
    'heavy-rain':    { day: '⛈️', night: '⛈️' },
    'snow':          { day: '🌨️', night: '🌨️' },
    'thunderstorm':  { day: '⛈️', night: '⛈️' },
};

function getEmoji(key, isDay = true) {
    const e = ICONS[key] || ICONS['cloudy'];
    return isDay ? e.day : e.night;
}

// ── UI Helpers ──────────────────────────────────────────────
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

function showLoading() {
    hide(dom.errorContainer); hide(dom.welcomeSection);
    hide(dom.weatherContent); hide(dom.compareContent);
    show(dom.loadingContainer);
}

function showError(msg) {
    hide(dom.loadingContainer); hide(dom.weatherContent);
    hide(dom.welcomeSection); hide(dom.compareContent);
    dom.errorText.textContent = msg;
    show(dom.errorContainer);
}

function showWeather() {
    hide(dom.loadingContainer); hide(dom.errorContainer);
    hide(dom.welcomeSection); hide(dom.compareContent);
    show(dom.weatherContent);
    // Conditionally reveal sections only after data is available
    show(dom.recsSection);
    show(dom.forecastSection);
}

function showCompare() {
    hide(dom.loadingContainer); hide(dom.errorContainer);
    hide(dom.welcomeSection); hide(dom.weatherContent);
    show(dom.compareContent);
}

function updateUnitLabels() {
    document.querySelectorAll('.unit-label').forEach(l =>
        l.classList.toggle('active', l.dataset.unit === state.units));
}

// ═════════════════════════════════════════════════════════════
//  THEME ENGINE
// ═════════════════════════════════════════════════════════════
function applyTheme(themeKey, isDay) {
    const classes = document.body.className.split(' ').filter(c => !c.startsWith('theme-'));
    let tc = themeKey === 'clear' ? (isDay ? 'theme-clear-day' : 'theme-clear-night') : `theme-${themeKey}`;
    document.body.className = [...classes, tc].join(' ');
}

function setDarkMode(dark) {
    state.isDarkMode = dark;
    document.body.classList.toggle('dark-mode', dark);
    document.body.classList.toggle('light-mode', !dark);
    dom.themeIcon.textContent = dark ? '🌙' : '☀️';
    localStorage.setItem('theme-mode', dark ? 'dark' : 'light');
}

// ═════════════════════════════════════════════════════════════
//  API LAYER — with timeout and proper error messages
// ═════════════════════════════════════════════════════════════

const FETCH_TIMEOUT_MS = 8000;

/**
 * Wraps fetch() with an AbortController-based timeout.
 * Rejects with a user-friendly Error if the request takes too long.
 */
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timerId);
        return response;
    } catch (err) {
        clearTimeout(timerId);
        if (err.name === 'AbortError') {
            throw new Error(
                'Weather service is currently unreachable. Please try searching for a specific city.'
            );
        }
        throw new Error(
            'Weather service is currently unreachable. Please try searching for a specific city.'
        );
    }
}

async function fetchWeather(city, units) {
    const r = await fetchWithTimeout(
        `/api/weather?${new URLSearchParams({ city, units })}`,
        FETCH_TIMEOUT_MS
    );
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Something went wrong.');
    return d;
}

async function fetchCompare(city1, city2, units) {
    const r = await fetchWithTimeout(
        `/api/compare?${new URLSearchParams({ city1, city2, units })}`,
        FETCH_TIMEOUT_MS
    );
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Something went wrong.');
    return d;
}

// ═════════════════════════════════════════════════════════════
//  RENDERERS
// ═════════════════════════════════════════════════════════════

const DETAIL_FIELDS = [
    { key: 'feels_like', icon: '🌡️', label: 'Feels Like', fmt: (v, c) => `${v}${c.temp_unit}` },
    { key: 'humidity', icon: '💧', label: 'Humidity', fmt: v => `${v}%` },
    { key: 'wind_speed', icon: '💨', label: 'Wind', fmt: (v, c) => `${v} ${c.speed_unit} ${c.wind_direction}` },
    { key: 'wind_gusts', icon: '🌬️', label: 'Gusts', fmt: (v, c) => `${v} ${c.speed_unit}` },
    { key: 'uv_index', icon: '☀️', label: 'UV Index', fmt: v => `${v}` },
    { key: 'pressure', icon: '📊', label: 'Pressure', fmt: v => `${v} hPa` },
    { key: 'visibility', icon: '👁️', label: 'Visibility', fmt: v => `${v} km` },
    { key: 'dew_point', icon: '💦', label: 'Dew Point', fmt: (v, c) => `${v}${c.temp_unit}` },
    { key: 'cloud_cover', icon: '☁️', label: 'Cloud Cover', fmt: v => `${v}%` },
    { key: 'precipitation', icon: '🌧️', label: 'Precipitation', fmt: v => `${v} mm` },
];

function renderDetails(container, current, daily) {
    const allFields = [
        ...DETAIL_FIELDS,
        { key: '_sunrise', icon: '🌅', label: 'Sunrise', fmt: () => daily.sunrise },
        { key: '_sunset', icon: '🌇', label: 'Sunset', fmt: () => daily.sunset },
        { key: '_sunshine', icon: '🌞', label: 'Sunshine', fmt: () => `${daily.sunshine_hours}h` },
        { key: '_precip_prob', icon: '🌂', label: 'Rain Prob', fmt: () => `${daily.precip_prob}%` },
    ];
    container.innerHTML = allFields.map(f => {
        const val = f.key.startsWith('_') ? null : current[f.key];
        const display = f.fmt(val, current);
        return `<div class="detail-item"><span class="detail-icon">${f.icon}</span><div><span class="detail-label">${f.label}</span><span class="detail-value">${display}</span></div></div>`;
    }).join('');
}

function renderCurrentWeather(data) {
    const { location, current, daily } = data;
    dom.cityName.textContent = location.city;
    dom.cityMeta.textContent = [location.admin, location.country].filter(Boolean).join(', ');
    dom.currentIcon.textContent = getEmoji(current.icon, current.is_day);
    dom.conditionText.textContent = current.description;
    dom.tempValue.textContent = current.temp;
    dom.tempUnit.textContent = current.temp_unit;
    renderDetails(dom.currentDetails, current, daily);
}

function renderRecs(recs, container) {
    container = container || dom.recsGrid;
    container.innerHTML = recs.map((r, i) =>
        `<div class="rec-card sev-${r.severity}" style="animation-delay:${i * 0.06}s">
            <span class="rec-icon">${r.icon}</span>
            <div class="rec-body"><div class="rec-title">${r.title}</div><div class="rec-msg">${r.message}</div></div>
        </div>`
    ).join('');
}

function renderForecast(forecast, container) {
    container = container || dom.forecastCards;
    container.innerHTML = forecast.map(day =>
        `<div class="forecast-card">
            <span class="forecast-date">${day.date}</span>
            <span class="forecast-icon">${getEmoji(day.icon, true)}</span>
            <span class="forecast-desc">${day.description}</span>
            <div class="forecast-temps"><span class="high">${day.temp_max}°</span><span class="low">${day.temp_min}°</span></div>
            ${day.precip_prob > 0 ? `<span class="forecast-precip">💧 ${day.precip_prob}%</span>` : ''}
        </div>`
    ).join('');
}

// ── Compare column renderer ──
function renderCompareCol(data, col) {
    const { location, current, daily, forecast, recommendations } = data;
    col.innerHTML = `
        <div class="glass-card">
            <div class="current-top">
                <div class="current-location"><h2 class="city-name">${location.city}</h2><p class="city-meta">${[location.admin, location.country].filter(Boolean).join(', ')}</p></div>
                <div class="current-icon">${getEmoji(current.icon, current.is_day)}</div>
            </div>
            <div class="current-body">
                <div class="temp-block"><span class="temp-value">${current.temp}</span><span class="temp-unit">${current.temp_unit}</span></div>
                <p class="condition-text">${current.description}</p>
            </div>
            <div class="current-details"></div>
        </div>
        <div class="recs-section"><h3 class="section-title">🎯 Recommendations</h3><div class="recs-grid"></div></div>
        <div class="forecast-section"><h3 class="section-title">📅 Forecast</h3><div class="forecast-cards"></div></div>`;
    renderDetails(col.querySelector('.current-details'), current, daily);
    renderRecs(recommendations, col.querySelector('.recs-grid'));
    renderForecast(forecast, col.querySelector('.forecast-cards'));
}

// ═════════════════════════════════════════════════════════════
//  SEARCH HANDLERS
// ═════════════════════════════════════════════════════════════
async function searchCity(city) {
    if (!city) return;
    state.currentCity = city;
    // Hide sections before loading so they don't show stale headings
    hide(dom.recsSection);
    hide(dom.forecastSection);
    showLoading();
    try {
        const data = await fetchWeather(city, state.units);
        state.weatherData = data;
        renderCurrentWeather(data);
        renderRecs(data.recommendations);
        renderForecast(data.forecast);
        applyTheme(data.current.theme, data.current.is_day);
        // Auto light/dark based on location time
        if (!localStorage.getItem('theme-mode-manual')) {
            setDarkMode(!data.current.is_day);
        }
        showWeather();
    } catch (err) {
        showError(err.message);
    }
}

async function compareCities(c1, c2) {
    showLoading();
    try {
        const data = await fetchCompare(c1, c2, state.units);
        renderCompareCol(data.city1, dom.compareCol1);
        renderCompareCol(data.city2, dom.compareCol2);
        // Use city1 theme
        applyTheme(data.city1.current.theme, data.city1.current.is_day);
        state.weatherData = data.city1;
        showCompare();
    } catch (err) {
        showError(err.message);
    }
}

// ═════════════════════════════════════════════════════════════
//  CHAT — decoupled from dashboard state
// ═════════════════════════════════════════════════════════════
function addChatMsg(text, isUser) {
    const div = document.createElement('div');
    div.className = `chat-msg ${isUser ? 'user' : 'bot'}`;
    div.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

// ═════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═════════════════════════════════════════════════════════════

// Search
dom.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const city = dom.cityInput.value.trim();
    if (city) searchCity(city);
});

// Compare
dom.compareForm.addEventListener('submit', e => {
    e.preventDefault();
    const c1 = dom.city1Input.value.trim(), c2 = dom.city2Input.value.trim();
    if (c1 && c2) compareCities(c1, c2);
});

// Unit toggle
dom.unitToggle.addEventListener('change', () => {
    state.units = dom.unitToggle.checked ? 'imperial' : 'metric';
    updateUnitLabels();
    if (state.mode === 'single' && state.currentCity) searchCity(state.currentCity);
});

// Mode tabs
dom.tabSingle.addEventListener('click', () => {
    state.mode = 'single';
    dom.tabSingle.classList.add('active'); dom.tabCompare.classList.remove('active');
    show(dom.searchForm); hide(dom.compareForm);
    hide(dom.compareContent);
    if (state.weatherData) showWeather(); else { hide(dom.weatherContent); show(dom.welcomeSection); }
});
dom.tabCompare.addEventListener('click', () => {
    state.mode = 'compare';
    dom.tabCompare.classList.add('active'); dom.tabSingle.classList.remove('active');
    hide(dom.searchForm); show(dom.compareForm);
    hide(dom.weatherContent); show(dom.welcomeSection);
});

// Theme toggle
dom.themeToggle.addEventListener('click', () => {
    localStorage.setItem('theme-mode-manual', '1');
    setDarkMode(!state.isDarkMode);
});

// Chat — chatbot initialises independently, regardless of dashboard state
dom.chatFab.addEventListener('click', () => {
    const open = dom.chatPanel.classList.contains('hidden');
    dom.chatPanel.classList.toggle('hidden', !open);
    if (open) dom.chatInput.focus();
});
dom.chatClose.addEventListener('click', () => hide(dom.chatPanel));
dom.chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const msg = dom.chatInput.value.trim();
    if (!msg) return;
    addChatMsg(msg, true);
    dom.chatInput.value = '';
    setTimeout(() => {
        // Pass weatherData from state — will be null if dashboard hasn't loaded,
        // chatbot handles null gracefully with its own fallback messages.
        const response = ChatBot.getResponse(msg, state.weatherData);
        addChatMsg(response, false);
    }, 300);
});

// ── Init ────────────────────────────────────────────────────
updateUnitLabels();
const savedMode = localStorage.getItem('theme-mode');
if (savedMode) setDarkMode(savedMode === 'dark');

// ═════════════════════════════════════════════════════════════
//  AUTOCOMPLETE MODULE  (reusable factory)
// ═════════════════════════════════════════════════════════════

const GEOCODE_API          = 'https://geocoding-api.open-meteo.com/v1/search';
const AC_DEBOUNCE_MS       = 300;
const AC_MIN_CHARS         = 2;
const AC_MAX_RESULTS       = 7;

/** Generic debounce utility */
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Factory: wires autocomplete behaviour to a specific input + dropdown pair.
 *
 * @param {HTMLInputElement}  inputEl    - The text input to listen on
 * @param {HTMLUListElement}  dropdownEl - The <ul> to populate
 * @param {HTMLElement}       wrapperEl  - Outer wrapper (used for click-outside)
 * @param {function(string)}  onSelect   - Called with the city name when chosen
 * @returns {{ close: function }} - Object exposing a close() method
 */
function createAutocomplete(inputEl, dropdownEl, wrapperEl, onSelect) {
    let activeIdx = -1;

    function items() {
        return [...dropdownEl.querySelectorAll('.autocomplete-item:not(.no-results):not(.loading)')];
    }
    function setActive(idx) {
        const els = items();
        els.forEach(el => el.classList.remove('active'));
        activeIdx = idx;
        if (idx >= 0 && idx < els.length) {
            els[idx].classList.add('active');
            els[idx].scrollIntoView({ block: 'nearest' });
        }
    }

    function open()  { dropdownEl.classList.remove('hidden'); }
    function close() { dropdownEl.classList.add('hidden'); dropdownEl.innerHTML = ''; activeIdx = -1; }

    function showLoading() {
        dropdownEl.innerHTML = `
            <li class="autocomplete-item loading">
                <span class="autocomplete-spinner"></span>
                Searching cities…
            </li>`;
        open();
    }

    function renderResults(results) {
        activeIdx = -1;
        if (!results.length) {
            dropdownEl.innerHTML = `<li class="autocomplete-item no-results">🔍 No cities found</li>`;
            open(); return;
        }
        dropdownEl.innerHTML = results.map((r, i) => {
            const city       = r.name         || '';
            const admin      = r.admin1        || '';
            const country    = r.country_code  || '';
            const countryFull = r.country      || '';
            const region     = [admin, countryFull].filter(Boolean).join(', ');
            return `
                <li class="autocomplete-item"
                    role="option" id="ac-item-${inputEl.id}-${i}"
                    data-city="${city.replace(/"/g, '&quot;')}" tabindex="-1">
                    <span class="item-text">
                        <span class="item-city">${city}</span>
                        ${region ? `<span class="item-region">${region}</span>` : ''}
                    </span>
                    ${country ? `<span class="item-country">${country}</span>` : ''}
                </li>`;
        }).join('');
        open();
        dropdownEl.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('mousedown', e => {
                e.preventDefault();
                const city = item.dataset.city;
                if (city) { inputEl.value = city; close(); onSelect(city); }
            });
        });
    }

    async function fetchSuggestions(query) {
        if (query.length < AC_MIN_CHARS) { close(); return; }
        showLoading();
        try {
            const url = `${GEOCODE_API}?name=${encodeURIComponent(query)}&count=${AC_MAX_RESULTS}&language=en&format=json`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            renderResults(data.results || []);
        } catch { close(); }
    }

    /* Keyboard navigation */
    inputEl.addEventListener('keydown', e => {
        const els = items();
        if (!els.length || dropdownEl.classList.contains('hidden')) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(activeIdx < els.length - 1 ? activeIdx + 1 : 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(activeIdx > 0 ? activeIdx - 1 : els.length - 1);
        } else if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            const city = els[activeIdx].dataset.city;
            if (city) { inputEl.value = city; close(); onSelect(city); }
        } else if (e.key === 'Escape') {
            close();
        }
    });

    const debouncedFetch = debounce(v => fetchSuggestions(v.trim()), AC_DEBOUNCE_MS);
    inputEl.addEventListener('input', e => {
        const val = e.target.value;
        if (val.trim().length < AC_MIN_CHARS) { close(); return; }
        debouncedFetch(val);
    });
    inputEl.addEventListener('blur', () => setTimeout(close, 150));
    return { close };
}

/* ── Instantiate the three autocomplete instances ── */
const acSingle = createAutocomplete(dom.cityInput, dom.autocompleteDropdown, dom.autocompleteWrapper, city => searchCity(city));
const acCity1  = createAutocomplete(dom.city1Input, dom.city1Dropdown, dom.city1Wrapper, city => { dom.city1Input.value = city; });
const acCity2  = createAutocomplete(dom.city2Input, dom.city2Dropdown, dom.city2Wrapper, city => { dom.city2Input.value = city; });

document.addEventListener('click', e => {
    if (!dom.autocompleteWrapper.contains(e.target)) acSingle.close();
    if (dom.city1Wrapper && !dom.city1Wrapper.contains(e.target)) acCity1.close();
    if (dom.city2Wrapper && !dom.city2Wrapper.contains(e.target)) acCity2.close();
});
dom.searchForm.addEventListener('submit', () => acSingle.close(), { capture: true });
dom.compareForm.addEventListener('submit', () => { acCity1.close(); acCity2.close(); }, { capture: true });

// ═════════════════════════════════════════════════════════════
//  FEATURED CITIES — live weather cards on the landing page
// ═════════════════════════════════════════════════════════════

const FEATURED_CITIES = [
    // Indian cities
    'Mumbai', 'Delhi', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad',
    // World cities
    'London', 'New York', 'Tokyo', 'Paris', 'Dubai', 'Sydney',
];

async function loadFeaturedCities() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    const results = await Promise.allSettled(
        FEATURED_CITIES.map(city => fetchWeather(city, 'metric'))
    );

    grid.innerHTML = results.map((res, i) => {
        if (res.status === 'rejected') {
            return `<div class="featured-card" style="justify-content:center;align-items:center;color:var(--text-muted);font-size:.8rem;text-align:center">${FEATURED_CITIES[i]}<br>Unavailable</div>`;
        }
        const { location, current } = res.value;
        const emoji = getEmoji(current.icon, current.is_day);
        return `
        <div class="featured-card" data-city="${location.city}" tabindex="0" role="button" aria-label="View weather for ${location.city}">
            <div class="fc-top">
                <div>
                    <div class="fc-city">${location.city}</div>
                    <div style="font-size:.7rem;color:var(--text-muted);margin-top:1px">${location.admin ? location.admin + ', ' : ''}${location.country}</div>
                </div>
                <span class="fc-country">${location.country}</span>
            </div>
            <div class="fc-icon">${emoji}</div>
            <div class="fc-temp">${current.temp}<span class="fc-unit">${current.temp_unit}</span></div>
            <div class="fc-desc">${current.description}</div>
            <div class="fc-meta">
                <span>💧 ${current.humidity}%</span>
                <span>💨 ${current.wind_speed} km/h</span>
                <span>🔆 UV ${current.uv_index}</span>
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.featured-card[data-city]').forEach(card => {
        const go = () => {
            const city = card.dataset.city;
            dom.cityInput.value = city;
            if (state.mode === 'compare') dom.tabSingle.click();
            searchCity(city);
        };
        card.addEventListener('click', go);
        card.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
}

loadFeaturedCities();
