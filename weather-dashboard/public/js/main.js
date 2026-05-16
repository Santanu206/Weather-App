/**
 * Dynamic Weather Dashboard v2 — Main Frontend Logic
 * Modules: State, API, Renderers, Theme, Audio, Compare, Chat
 */

// ── DOM ─────────────────────────────────────────────────────
const dom = {
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    compareForm: document.getElementById('compare-form'),
    city1Input: document.getElementById('city1-input'),
    city2Input: document.getElementById('city2-input'),
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
    recsGrid: document.getElementById('recs-grid'),
    forecastCards: document.getElementById('forecast-cards'),
    compareCol1: document.getElementById('compare-col-1'),
    compareCol2: document.getElementById('compare-col-2'),
    audioToggle: document.getElementById('audio-toggle'),
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
    audioEnabled: false,
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
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function showLoading() {
    hide(dom.errorContainer); hide(dom.welcomeSection);
    hide(dom.weatherContent); hide(dom.compareContent);
    show(dom.loadingContainer);
}
function showError(msg) {
    hide(dom.loadingContainer); hide(dom.weatherContent);
    hide(dom.welcomeSection); hide(dom.compareContent);
    dom.errorText.textContent = msg; show(dom.errorContainer);
}
function showWeather() {
    hide(dom.loadingContainer); hide(dom.errorContainer);
    hide(dom.welcomeSection); hide(dom.compareContent);
    show(dom.weatherContent);
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
//  AMBIENT AUDIO ENGINE (Web Audio API — procedural)
// ═════════════════════════════════════════════════════════════
const AudioEngine = (() => {
    let ctx = null, masterGain = null, activeNodes = [], currentTheme = null;

    function init() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(ctx.destination);
    }

    function createNoise(seconds) {
        const sr = ctx.sampleRate;
        const buf = ctx.createBuffer(1, sr * seconds, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    function stopAll() {
        activeNodes.forEach(n => { try { n.stop(); } catch(e) {} try { n.disconnect(); } catch(e) {} });
        activeNodes = [];
    }

    function playRain() {
        const src = ctx.createBufferSource();
        src.buffer = createNoise(4); src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
        const g = ctx.createGain(); g.gain.value = 0.5;
        src.connect(lp).connect(hp).connect(g).connect(masterGain);
        src.start(); activeNodes.push(src);
    }

    function playWind() {
        const src = ctx.createBufferSource();
        src.buffer = createNoise(6); src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
        const g = ctx.createGain(); g.gain.value = 0.35;
        // LFO for modulation
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3;
        const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.15;
        lfo.connect(lfoGain).connect(g.gain);
        lfo.start();
        src.connect(lp).connect(g).connect(masterGain);
        src.start(); activeNodes.push(src, lfo);
    }

    function playBirds() {
        function chirp() {
            if (currentTheme !== 'clear') return;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 2000 + Math.random() * 2000;
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
            osc.connect(g).connect(masterGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
            setTimeout(chirp, 1000 + Math.random() * 3000);
        }
        chirp();
    }

    function playThunder() {
        playRain();
        function rumble() {
            if (currentTheme !== 'thunderstorm') return;
            const src = ctx.createBufferSource();
            src.buffer = createNoise(2);
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.6, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
            src.connect(lp).connect(g).connect(masterGain);
            src.start(); src.stop(ctx.currentTime + 2);
            setTimeout(rumble, 5000 + Math.random() * 10000);
        }
        setTimeout(rumble, 2000);
    }

    function playSnow() {
        const src = ctx.createBufferSource();
        src.buffer = createNoise(4); src.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
        const g = ctx.createGain(); g.gain.value = 0.08;
        src.connect(hp).connect(g).connect(masterGain);
        src.start(); activeNodes.push(src);
    }

    function playNight() {
        const src = ctx.createBufferSource();
        src.buffer = createNoise(4); src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 8;
        const g = ctx.createGain(); g.gain.value = 0.04;
        src.connect(bp).connect(g).connect(masterGain);
        src.start(); activeNodes.push(src);
    }

    function setTheme(theme, isDay) {
        if (!state.audioEnabled) return;
        init();
        if (theme === currentTheme) return;
        currentTheme = theme;
        stopAll();
        if (theme === 'rain') playRain();
        else if (theme === 'thunderstorm') playThunder();
        else if (theme === 'snow') playSnow();
        else if (theme === 'fog') playWind();
        else if (theme === 'clouds') playWind();
        else if (theme === 'clear' && isDay) playBirds();
        else if (theme === 'clear' && !isDay) playNight();
    }

    function toggle() {
        state.audioEnabled = !state.audioEnabled;
        dom.audioToggle.classList.toggle('active', state.audioEnabled);
        if (state.audioEnabled) {
            init();
            if (state.weatherData) setTheme(state.weatherData.current.theme, state.weatherData.current.is_day);
        } else {
            stopAll(); currentTheme = null;
        }
    }

    return { setTheme, toggle };
})();

// ═════════════════════════════════════════════════════════════
//  API LAYER
// ═════════════════════════════════════════════════════════════
async function fetchWeather(city, units) {
    const r = await fetch(`/api/weather?${new URLSearchParams({ city, units })}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Something went wrong.');
    return d;
}

async function fetchCompare(city1, city2, units) {
    const r = await fetch(`/api/compare?${new URLSearchParams({ city1, city2, units })}`);
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
    showLoading();
    try {
        const data = await fetchWeather(city, state.units);
        state.weatherData = data;
        renderCurrentWeather(data);
        renderRecs(data.recommendations);
        renderForecast(data.forecast);
        applyTheme(data.current.theme, data.current.is_day);
        AudioEngine.setTheme(data.current.theme, data.current.is_day);
        // Auto light/dark based on location time
        if (!localStorage.getItem('theme-mode-manual')) {
            setDarkMode(!data.current.is_day);
        }
        showWeather();
    } catch (err) { showError(err.message); }
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
    } catch (err) { showError(err.message); }
}

// ═════════════════════════════════════════════════════════════
//  CHAT
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

// Audio toggle
dom.audioToggle.addEventListener('click', () => AudioEngine.toggle());

// Chat
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
        const response = ChatBot.getResponse(msg, state.weatherData);
        addChatMsg(response, false);
    }, 300);
});

// ── Init ────────────────────────────────────────────────────
updateUnitLabels();
const savedMode = localStorage.getItem('theme-mode');
if (savedMode) setDarkMode(savedMode === 'dark');
