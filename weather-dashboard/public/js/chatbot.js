/**
 * Weather Chatbot — Rule-based weather assistant
 * Uses current weather state to provide contextual answers.
 */

const ChatBot = (() => {
    const patterns = [
        {
            match: /\b(hi|hello|hey|howdy|greetings)\b/i,
            respond: () => "Hello! 👋 Ask me anything about the weather — clothing advice, UV index, travel safety, or even compare two cities!"
        },
        {
            match: /\b(bye|goodbye|thanks|thank you|thx)\b/i,
            respond: () => "You're welcome! Stay safe out there! 🌤️"
        },
        {
            match: /\b(umbrella|rain|raining|rainy|precipitation|wet)\b/i,
            respond: (d) => {
                if (!d) return "Search for a city first so I can check rain conditions!";
                const c = d.current, day = d.daily;
                if (c.rain > 0) return `☂️ Yes, it's currently raining (${c.rain} mm). Definitely take an umbrella!`;
                if (day.precip_prob > 60) return `🌂 No rain right now, but there's a ${day.precip_prob}% chance today. I'd take an umbrella.`;
                if (day.precip_prob > 30) return `🌤️ There's a ${day.precip_prob}% chance of rain. Maybe keep one handy just in case.`;
                return "☀️ No rain expected today! You can leave the umbrella at home.";
            }
        },
        {
            match: /\b(wear|clothing|clothes|dress|outfit|jacket|coat)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first and I'll give you clothing advice!";
                const f = d.current.feels_like, u = d.current.temp_unit;
                const isC = u === "°C";
                if (f < (isC ? 0 : 32)) return `🧥 It feels like ${f}${u} — bundle up! Heavy coat, gloves, scarf, and warm boots.`;
                if (f < (isC ? 10 : 50)) return `🧣 At ${f}${u}, wear a warm jacket with layers underneath.`;
                if (f < (isC ? 18 : 64)) return `🧥 ${f}${u} — a light jacket or sweater should be perfect.`;
                if (f < (isC ? 25 : 77)) return `👕 ${f}${u} — comfortable! Light clothing is all you need.`;
                if (f < (isC ? 32 : 90)) return `🩳 It's warm at ${f}${u}. Light, breathable clothing and stay hydrated!`;
                return `🥵 Extremely hot at ${f}${u}! Minimal clothing, plenty of water, and stay in shade.`;
            }
        },
        {
            match: /\b(uv|sunscreen|sunburn|spf|sun protection)\b/i,
            respond: (d) => {
                if (!d) return "Search a city to check UV levels!";
                const uv = d.current.uv_index;
                if (uv >= 8) return `☀️ UV Index is ${uv} — VERY HIGH! Apply SPF 50+, wear sunglasses & a hat. Avoid 10am-4pm sun.`;
                if (uv >= 6) return `🧴 UV Index is ${uv} — High. Apply SPF 30+, seek shade during peak hours.`;
                if (uv >= 3) return `😎 UV Index is ${uv} — Moderate. Sunscreen recommended for extended outdoor time.`;
                return `✅ UV Index is ${uv} — Low. No special sun protection needed.`;
            }
        },
        {
            match: /\b(wind|windy|gust|breeze)\b/i,
            respond: (d) => {
                if (!d) return "Search a city to check wind conditions!";
                const w = d.current.wind_speed, g = d.current.wind_gusts, u = d.current.speed_unit, dir = d.current.wind_direction;
                return `💨 Wind: ${w} ${u} from ${dir} with gusts up to ${g} ${u}. ${g > 50 ? "⚠️ Strong gusts — secure loose items!" : "Manageable conditions."}`;
            }
        },
        {
            match: /\b(humid|humidity|muggy|sticky)\b/i,
            respond: (d) => {
                if (!d) return "Search a city to check humidity!";
                const h = d.current.humidity;
                if (h > 80) return `💦 Humidity is ${h}% — very muggy. It may feel uncomfortable outdoors.`;
                if (h > 60) return `💧 Humidity is ${h}% — moderate. You might feel a bit sticky.`;
                if (h < 20) return `🏜️ Humidity is only ${h}% — very dry. Use moisturizer and stay hydrated.`;
                return `✅ Humidity is ${h}% — comfortable range!`;
            }
        },
        {
            match: /\b(pressure|barometer|barometric)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                const p = d.current.pressure;
                return `📊 Pressure: ${p} hPa. ${p < 1000 ? "Low pressure — possible storms or weather changes." : p > 1025 ? "High pressure — stable, clear conditions likely." : "Normal range."}`;
            }
        },
        {
            match: /\b(visibility|fog|see|visible|clear)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                const v = d.current.visibility;
                if (v < 1) return `🌫️ Visibility is only ${v} km — dense fog. Drive very carefully!`;
                if (v < 5) return `😶‍🌫️ Visibility: ${v} km — somewhat reduced. Use caution while driving.`;
                return `👁️ Visibility: ${v} km — clear conditions!`;
            }
        },
        {
            match: /\b(snow|snowing|snowy|blizzard|frost|freeze)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                const s = d.current.snowfall;
                if (s > 0) return `❄️ Snow is falling (${s} cm/h)! Wear warm waterproof boots and drive slowly.`;
                return "🌤️ No snow currently. Enjoy!";
            }
        },
        {
            match: /\b(forecast|tomorrow|week|next|upcoming)\b/i,
            respond: (d) => {
                if (!d) return "Search a city to see the forecast!";
                const f = d.forecast;
                if (!f || f.length === 0) return "No forecast data available.";
                let msg = "📅 Upcoming forecast:\n";
                f.forEach(day => { msg += `• ${day.date}: ${day.description}, ${day.temp_max}°/${day.temp_min}°\n`; });
                return msg;
            }
        },
        {
            match: /\b(outdoor|exercise|jog|run|walk|hike|sport|activity|activities)\b/i,
            respond: (d) => {
                if (!d) return "Search a city and I'll assess outdoor conditions!";
                const c = d.current, isC = c.temp_unit === "°C";
                const nice = c.rain === 0 && c.snowfall === 0 && c.wind_speed < (isC ? 40 : 25);
                const mild = c.temp > (isC ? 10 : 50) && c.temp < (isC ? 30 : 86);
                if (nice && mild) return "🏃 Great conditions for outdoor activities! Go for a jog, bike ride, or hike.";
                if (nice) return "🚶 Conditions are OK but watch the temperature. Dress accordingly.";
                return "🏠 Not ideal for outdoor activities right now. Consider indoor exercise.";
            }
        },
        {
            match: /\b(compare|versus|vs|difference|better)\b/i,
            respond: () => "📊 Use the **Compare** tab at the top to compare two cities side by side! I'll show weather, forecasts, and recommendations for both."
        },
        {
            match: /\b(temp|temperature|hot|cold|warm|cool|degree)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                const c = d.current;
                return `🌡️ Current: ${c.temp}${c.temp_unit} (feels like ${c.feels_like}${c.temp_unit}). ${c.description}.`;
            }
        },
        {
            match: /\b(sunrise|sunset|dawn|dusk|daylight)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                return `🌅 Sunrise: ${d.daily.sunrise} | 🌇 Sunset: ${d.daily.sunset} | ☀️ ${d.daily.sunshine_hours}h of sunshine today.`;
            }
        },
        {
            match: /\b(cloud|cloudy|overcast|sky)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                return `☁️ Cloud cover: ${d.current.cloud_cover}%. ${d.current.cloud_cover > 80 ? "Mostly cloudy skies." : d.current.cloud_cover > 40 ? "Partly cloudy." : "Mostly clear skies!"}`;
            }
        },
        {
            match: /\b(dew|dew point|moisture)\b/i,
            respond: (d) => {
                if (!d) return "Search a city first!";
                const dp = d.current.dew_point;
                return `💧 Dew point: ${dp}${d.current.temp_unit}. ${dp > 20 ? "Feels muggy." : dp > 10 ? "Comfortable moisture levels." : "Dry air."}`;
            }
        },
        {
            match: /\b(help|what can you|commands|features)\b/i,
            respond: () => "I can answer questions about:\n• 🌡️ Temperature & feels like\n• ☂️ Rain & umbrella needs\n• 👕 Clothing suggestions\n• ☀️ UV index & sun safety\n• 💨 Wind conditions\n• 🌫️ Visibility & fog\n• 📅 Forecast summary\n• 🏃 Activity suitability\n• 📊 City comparison\n\nJust ask naturally!"
        },
    ];

    const fallbacks = [
        "I'm not sure about that. Try asking about temperature, rain, UV, wind, or clothing!",
        "Hmm, I didn't catch that. Ask me about the weather — like 'Do I need an umbrella?' 🌂",
        "I specialize in weather questions! Try 'What should I wear?' or 'Is it good for a run?'",
    ];

    let fallbackIdx = 0;

    function getResponse(input, weatherData) {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return "Go ahead, ask me something! 😊";

        for (const p of patterns) {
            if (p.match.test(trimmed)) {
                return p.respond(weatherData);
            }
        }

        fallbackIdx = (fallbackIdx + 1) % fallbacks.length;
        return fallbacks[fallbackIdx];
    }

    return { getResponse };
})();
