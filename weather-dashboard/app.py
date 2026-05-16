"""
Dynamic Weather Dashboard v2 — Flask Backend (Open-Meteo)
Extended data, recommender engine, city comparison.
"""

from datetime import datetime
from flask import Flask, jsonify, render_template, request
import requests as http_requests

app = Flask(__name__, static_folder='public', static_url_path='')

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_PARAMS = [
    "temperature_2m", "relative_humidity_2m", "apparent_temperature",
    "weather_code", "wind_speed_10m", "wind_direction_10m",
    "wind_gusts_10m", "is_day", "precipitation", "rain",
    "snowfall", "cloud_cover", "pressure_msl",
]
HOURLY_PARAMS = ["uv_index", "visibility", "dew_point_2m"]
DAILY_PARAMS = [
    "weather_code", "temperature_2m_max", "temperature_2m_min",
    "sunrise", "sunset", "uv_index_max", "precipitation_sum",
    "precipitation_probability_max", "wind_speed_10m_max",
    "wind_gusts_10m_max", "sunshine_duration", "daylight_duration",
]

WMO_CODES = {
    0: ("Clear Sky", "clear", "clear"),
    1: ("Mainly Clear", "clear", "clear"),
    2: ("Partly Cloudy", "partly-cloudy", "clouds"),
    3: ("Overcast", "cloudy", "clouds"),
    45: ("Foggy", "fog", "fog"), 48: ("Rime Fog", "fog", "fog"),
    51: ("Light Drizzle", "drizzle", "rain"),
    53: ("Moderate Drizzle", "drizzle", "rain"),
    55: ("Dense Drizzle", "drizzle", "rain"),
    56: ("Freezing Drizzle", "drizzle", "rain"),
    57: ("Heavy Freezing Drizzle", "drizzle", "rain"),
    61: ("Slight Rain", "rain", "rain"),
    63: ("Moderate Rain", "rain", "rain"),
    65: ("Heavy Rain", "heavy-rain", "rain"),
    66: ("Freezing Rain", "rain", "rain"),
    67: ("Heavy Freezing Rain", "heavy-rain", "rain"),
    71: ("Slight Snowfall", "snow", "snow"),
    73: ("Moderate Snowfall", "snow", "snow"),
    75: ("Heavy Snowfall", "snow", "snow"),
    77: ("Snow Grains", "snow", "snow"),
    80: ("Light Showers", "rain", "rain"),
    81: ("Moderate Showers", "rain", "rain"),
    82: ("Violent Showers", "heavy-rain", "rain"),
    85: ("Light Snow Showers", "snow", "snow"),
    86: ("Heavy Snow Showers", "snow", "snow"),
    95: ("Thunderstorm", "thunderstorm", "thunderstorm"),
    96: ("Thunderstorm with Hail", "thunderstorm", "thunderstorm"),
    99: ("Severe Thunderstorm", "thunderstorm", "thunderstorm"),
}


def _wmo(code):
    desc, icon, theme = WMO_CODES.get(code, ("Unknown", "cloudy", "clouds"))
    return {"description": desc, "icon": icon, "theme": theme}


def _wind_dir(deg):
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
            "S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round(deg / 22.5) % 16] if deg is not None else "N"


def _fmt_time(iso):
    try:
        return datetime.fromisoformat(iso).strftime("%I:%M %p")
    except (ValueError, TypeError):
        return "--"


def _geocode(city):
    try:
        r = http_requests.get(GEOCODING_URL,
            params={"name": city, "count": 1, "language": "en", "format": "json"},
            timeout=10)
        r.raise_for_status()
        results = r.json().get("results")
        if not results:
            return None, (jsonify({"error": f'City "{city}" not found.'}), 404)
        loc = results[0]
        return {"lat": loc["latitude"], "lon": loc["longitude"],
                "name": loc.get("name", city),
                "country": loc.get("country_code", ""),
                "admin": loc.get("admin1", "")}, None
    except http_requests.exceptions.RequestException:
        return None, (jsonify({"error": "Geocoding service unavailable."}), 503)


def _fetch_weather(location, units):
    temp_unit = "celsius" if units == "metric" else "fahrenheit"
    wind_unit = "kmh" if units == "metric" else "mph"
    try:
        r = http_requests.get(FORECAST_URL, params={
            "latitude": location["lat"], "longitude": location["lon"],
            "current": ",".join(CURRENT_PARAMS),
            "hourly": ",".join(HOURLY_PARAMS),
            "daily": ",".join(DAILY_PARAMS),
            "temperature_unit": temp_unit, "wind_speed_unit": wind_unit,
            "timezone": "auto", "forecast_days": 6,
        }, timeout=10)
        r.raise_for_status()
        return r.json(), None
    except http_requests.exceptions.RequestException:
        return None, (jsonify({"error": "Weather service unavailable."}), 503)


def _clean_weather(raw, location, units):
    cur = raw.get("current", {})
    hourly = raw.get("hourly", {})
    daily = raw.get("daily", {})
    wmo = _wmo(cur.get("weather_code", 0))
    is_day = bool(cur.get("is_day", 1))
    t_unit = "°C" if units == "metric" else "°F"
    s_unit = "km/h" if units == "metric" else "mph"

    # Extract current hour from hourly arrays
    cur_time = cur.get("time", "")
    h_times = hourly.get("time", [])
    try:
        hi = h_times.index(cur_time)
    except (ValueError, IndexError):
        hi = 0

    uv = hourly.get("uv_index", [0])[hi] if hourly.get("uv_index") else 0
    vis = hourly.get("visibility", [10000])[hi] if hourly.get("visibility") else 10000
    dew = hourly.get("dew_point_2m", [0])[hi] if hourly.get("dew_point_2m") else 0

    # Daily today (index 0)
    d0 = {k: (daily[k][0] if daily.get(k) and len(daily[k]) > 0 else None)
           for k in DAILY_PARAMS}

    # Forecast (skip today)
    times = daily.get("time", [])
    forecast = []
    for i in range(1, min(len(times), 6)):
        dw = _wmo(daily["weather_code"][i])
        dt = datetime.strptime(times[i], "%Y-%m-%d")
        forecast.append({
            "date": dt.strftime("%a, %b %d"),
            "temp_max": round(daily["temperature_2m_max"][i], 1),
            "temp_min": round(daily["temperature_2m_min"][i], 1),
            "icon": dw["icon"], "description": dw["description"],
            "precip_prob": daily.get("precipitation_probability_max", [0] * 6)[i],
            "precip_sum": round(daily.get("precipitation_sum", [0] * 6)[i], 1),
        })

    sunshine_hrs = round((d0.get("sunshine_duration") or 0) / 3600, 1)
    daylight_hrs = round((d0.get("daylight_duration") or 0) / 3600, 1)

    return {
        "location": {"city": location["name"],
                      "country": location["country"],
                      "admin": location["admin"]},
        "current": {
            "temp": round(cur.get("temperature_2m", 0), 1),
            "feels_like": round(cur.get("apparent_temperature", 0), 1),
            "humidity": cur.get("relative_humidity_2m", 0),
            "wind_speed": round(cur.get("wind_speed_10m", 0), 1),
            "wind_direction": _wind_dir(cur.get("wind_direction_10m")),
            "wind_gusts": round(cur.get("wind_gusts_10m", 0), 1),
            "precipitation": round(cur.get("precipitation", 0), 1),
            "rain": round(cur.get("rain", 0), 1),
            "snowfall": round(cur.get("snowfall", 0), 1),
            "cloud_cover": cur.get("cloud_cover", 0),
            "pressure": round(cur.get("pressure_msl", 1013), 1),
            "uv_index": round(uv or 0, 1),
            "visibility": round((vis or 10000) / 1000, 1),
            "dew_point": round(dew or 0, 1),
            "description": wmo["description"],
            "icon": wmo["icon"], "theme": wmo["theme"],
            "is_day": is_day,
            "temp_unit": t_unit, "speed_unit": s_unit,
        },
        "daily": {
            "sunrise": _fmt_time(d0.get("sunrise") or ""),
            "sunset": _fmt_time(d0.get("sunset") or ""),
            "uv_index_max": round(d0.get("uv_index_max") or 0, 1),
            "precip_sum": round(d0.get("precipitation_sum") or 0, 1),
            "precip_prob": d0.get("precipitation_probability_max") or 0,
            "wind_max": round(d0.get("wind_speed_10m_max") or 0, 1),
            "gusts_max": round(d0.get("wind_gusts_10m_max") or 0, 1),
            "sunshine_hours": sunshine_hrs,
            "daylight_hours": daylight_hrs,
        },
        "forecast": forecast,
    }


# ═══════════════════════════════════════════════════════════════
#  RECOMMENDER ENGINE
# ═══════════════════════════════════════════════════════════════

def _recommend(data, units):
    c = data["current"]
    d = data["daily"]
    recs = []
    m = units == "metric"
    temp, feels = c["temp"], c["feels_like"]
    hum, wind = c["humidity"], c["wind_speed"]
    gusts, uv = c["wind_gusts"], c["uv_index"]
    rain, snow = c["rain"], c["snowfall"]
    vis, pp = c["visibility"], d["precip_prob"]

    # Thresholds
    T = (0, 10, 18, 25, 32, 40) if m else (32, 50, 64, 77, 90, 104)
    W = (20, 40, 62) if m else (12, 25, 39)

    def add(cat, icon, title, msg, sev="info"):
        recs.append({"category": cat, "icon": icon, "title": title,
                      "message": msg, "severity": sev})

    # ── Clothing ──
    if feels < T[0]:
        add("clothing", "🧥", "Bundle Up!",
            f"Feels like {feels}{c['temp_unit']}. Heavy winter layers, gloves, and a scarf are essential.", "warning")
    elif feels < T[1]:
        add("clothing", "🧣", "Warm Layers Needed",
            f"Feels like {feels}{c['temp_unit']}. Wear a warm jacket and layers.", "caution")
    elif feels < T[2]:
        add("clothing", "🧥", "Light Jacket Weather",
            "A light jacket or sweater will keep you comfortable.", "info")
    elif feels < T[3]:
        add("clothing", "👕", "Perfect Conditions",
            "Light, comfortable clothing is ideal today.", "info")
    elif feels < T[4]:
        add("clothing", "🩳", "Dress Light & Stay Cool",
            "Wear breathable, light-colored clothing. Keep water handy.", "caution")
    else:
        add("clothing", "🥵", "Extreme Heat Alert",
            f"Dangerously hot at {feels}{c['temp_unit']}. Minimize outdoor exposure.", "warning")

    # ── UV ──
    if uv >= 8:
        add("uv", "☀️", "Very High UV",
            f"UV Index {uv}. SPF 50+, sunglasses, hat. Avoid midday sun.", "warning")
    elif uv >= 6:
        add("uv", "🧴", "High UV — Sunscreen Needed",
            f"UV Index {uv}. Apply SPF 30+ and seek shade during peak hours.", "caution")
    elif uv >= 3:
        add("uv", "😎", "Moderate UV",
            f"UV Index {uv}. Consider sunscreen for extended outdoor time.", "info")

    # ── Precipitation ──
    if rain > 0:
        add("rain", "☂️", "Rain Right Now",
            "It's raining. Grab an umbrella and waterproof shoes.", "caution")
    elif pp > 60:
        add("rain", "🌂", "Rain Very Likely",
            f"{pp}% chance of rain today. Definitely take an umbrella.", "caution")
    elif pp > 30:
        add("rain", "🌤️", "Possible Rain",
            f"{pp}% chance of rain. An umbrella might come in handy.", "info")

    if snow > 0:
        add("snow", "❄️", "Snowfall Active",
            "Snow is falling. Waterproof boots recommended. Drive carefully.", "warning")

    # ── Wind ──
    if gusts > W[2] or wind > W[2]:
        add("wind", "🌪️", "Dangerous Winds",
            f"Gusts up to {gusts} {c['speed_unit']}. Stay indoors if possible.", "warning")
    elif wind > W[1]:
        add("wind", "💨", "Strong Winds",
            f"Winds at {wind} {c['speed_unit']}. Secure loose objects.", "caution")
    elif wind > W[0]:
        add("wind", "🍃", "Breezy Conditions",
            "A noticeable breeze. Great for kite flying!", "info")

    # ── Visibility ──
    if vis < 0.5:
        add("visibility", "🌫️", "Very Low Visibility",
            "Dense fog. Drive with extreme caution and use fog lights.", "warning")
    elif vis < 2:
        add("visibility", "😶‍🌫️", "Reduced Visibility",
            f"Visibility at {vis} km. Use caution while driving.", "caution")

    # ── Health ──
    if hum > 80 and temp > T[3]:
        add("health", "🥵", "Oppressive Humidity",
            f"Humidity {hum}% with warm temps. Risk of heat exhaustion.", "caution")
    elif hum < 20:
        add("health", "💧", "Very Dry Air",
            f"Humidity only {hum}%. Use moisturizer, stay hydrated.", "info")

    if c["pressure"] < 1000:
        add("health", "📉", "Low Pressure System",
            "Low atmospheric pressure may trigger headaches in sensitive individuals.", "info")

    # ── Activity ──
    no_precip = rain == 0 and snow == 0 and pp < 30
    mild = T[2] <= temp <= T[3]
    calm = wind < W[1]

    if no_precip and mild and calm:
        add("activity", "🏃", "Perfect for Outdoors!",
            "Ideal conditions for jogging, cycling, or a park visit.", "info")
    elif no_precip and calm and temp > T[1]:
        add("activity", "🚶", "Good for a Walk",
            "Decent conditions for a stroll. Enjoy the fresh air.", "info")
    elif not no_precip or not calm:
        add("activity", "🏠", "Indoor Day",
            "Consider indoor activities today — reading, gym, or a movie.", "info")

    # ── Travel ──
    issues = []
    if vis < 2: issues.append("low visibility")
    if wind > W[1]: issues.append("strong winds")
    if rain > 0 or snow > 0: issues.append("precipitation")
    if feels < T[0] or feels > T[4]: issues.append("extreme temperature")

    if len(issues) >= 2:
        add("travel", "⚠️", "Travel Caution",
            f"Multiple concerns: {', '.join(issues)}. Plan trips carefully.", "warning")
    elif len(issues) == 1:
        add("travel", "🚗", "Travel Advisory",
            f"Note: {issues[0]} may affect travel plans.", "caution")
    else:
        add("travel", "✈️", "Great Travel Conditions",
            "Clear conditions. Safe and pleasant for travel.", "info")

    return recs


# ═══════════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/weather")
def get_weather():
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "Please provide a city name."}), 400
    units = request.args.get("units", "metric")
    location, err = _geocode(city)
    if err: return err
    raw, err = _fetch_weather(location, units)
    if err: return err
    data = _clean_weather(raw, location, units)
    data["recommendations"] = _recommend(data, units)
    return jsonify(data), 200


@app.route("/api/compare")
def compare_weather():
    city1 = request.args.get("city1", "").strip()
    city2 = request.args.get("city2", "").strip()
    if not city1 or not city2:
        return jsonify({"error": "Provide both city1 and city2."}), 400
    units = request.args.get("units", "metric")
    loc1, err = _geocode(city1)
    if err: return err
    loc2, err = _geocode(city2)
    if err: return err
    raw1, err = _fetch_weather(loc1, units)
    if err: return err
    raw2, err = _fetch_weather(loc2, units)
    if err: return err
    d1 = _clean_weather(raw1, loc1, units)
    d2 = _clean_weather(raw2, loc2, units)
    d1["recommendations"] = _recommend(d1, units)
    d2["recommendations"] = _recommend(d2, units)
    return jsonify({"city1": d1, "city2": d2}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
