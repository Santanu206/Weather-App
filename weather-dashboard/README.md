<div align="center">
  <h1>⛅ Dynamic Weather Dashboard</h1>
  <p>
    <strong>A modern, interactive, and intelligent weather application with dynamic themes, ambient audio, and a built-in AI assistant.</strong>
  </p>
  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a>
  </p>
</div>

---

## 🌟 Overview

The **Dynamic Weather Dashboard** is a feature-rich, full-stack weather application designed to provide users with comprehensive, real-time meteorological data in an aesthetically stunning interface. Going beyond simple temperature displays, it includes a smart recommendation engine, side-by-side city comparisons, procedural ambient soundscapes, and an interactive weather chatbot.

## ✨ Key Features

- **📊 Comprehensive Live Data:** Real-time metrics including 'feels like' temperature, humidity, wind (speed/gusts/direction), UV index, atmospheric pressure, visibility, dew point, and cloud cover.
- **🎯 Smart Recommender Engine:** Context-aware suggestions for clothing, UV protection, outdoor activity suitability, and health/travel advisories based on precise thresholds.
- **⚖️ City Comparison Mode:** Compare the weather of two different cities side-by-side to plan trips or just out of curiosity.
- **🤖 Interactive Chat Assistant:** A rule-based chatbot that contextualizes the current weather data to answer conversational questions like "Do I need an umbrella?" or "Is it good for a run?".
- **🎶 Procedural Ambient Audio:** An advanced Web Audio API integration that procedurally generates relaxing, weather-appropriate soundscapes (e.g., rain, wind, birds, thunder, snow).
- **🎨 Dynamic Theming:** The application automatically adjusts its color palette and theme (Light/Dark) based on the current weather condition and time of day.
- **📅 5-Day Forecast:** Detailed upcoming weather predictions to help you plan ahead.
- **⚙️ Unit Toggles:** Seamless switching between Metric (°C, km/h) and Imperial (°F, mph) units.

## 🛠 Tech Stack

### Backend
- **[Python 3](https://www.python.org/) & [Flask](https://flask.palletsprojects.com/):** Serves the API routes and orchestrates data fetching and parsing.
- **[Requests](https://pypi.org/project/requests/):** For asynchronous communication with external APIs.

### Frontend
- **HTML5 & CSS3:** Semantic markup with a beautiful, responsive, glassmorphism-inspired design.
- **Vanilla JavaScript:** Powers the interactive UI, API calls, Chatbot logic, and Web Audio API engine.
- **Fonts:** Custom typography using Google Fonts (*Outfit* and *Inter*).

### External APIs
- **[Open-Meteo API](https://open-meteo.com/):** Reliable, free geocoding and weather forecasting data without API keys.

## 📁 Project Structure

```text
weather-dashboard/
├── app.py                  # Main Flask application and backend logic
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (if any)
├── static/
│   ├── css/
│   │   └── style.css       # Core styling and dynamic themes
│   └── js/
│       ├── main.js         # Frontend controllers, API calls, and Audio Engine
│       └── chatbot.js      # Rule-based weather assistant logic
└── templates/
    └── index.html          # Main dashboard view
```

## 🚀 Installation & Setup

Follow these steps to get the project up and running on your local machine:

**1. Clone the repository**
```bash
git clone https://github.com/your-username/weather-dashboard.git
cd weather-dashboard
```

**2. Create a virtual environment (Recommended)**
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
```

**4. Run the application**
```bash
python app.py
```

**5. Open in your browser**
Navigate to `http://localhost:5000` to view the dashboard!

## 💡 Usage

- **Single Search:** Enter a city name in the top search bar to get its current weather, recommendations, and forecast.
- **Compare Cities:** Click the **Compare** tab to view side-by-side data for two different locations.
- **Chat Assistant:** Click the floating chat bubble `💬` in the bottom right to ask the assistant for personalized advice based on the current location's weather.
- **Ambient Audio:** Click the audio toggle icon in the top right to enable/disable procedural background sounds matching the current weather.
- **Change Units:** Use the toggle switch in the top right to flip between Metric and Imperial units.

---

<div align="center">
  <p>Built with ❤️ and Python.</p>
</div>
