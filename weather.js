const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const currentFields = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
].join(",");

const hourlyFields = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
].join(",");

const dailyFields = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "uv_index_max",
  "precipitation_sum",
  "rain_sum",
  "showers_sum",
  "snowfall_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
].join(",");

const weatherDescriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function descriptionForWeatherCode(code) {
  return weatherDescriptions[code] || "Unknown";
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function numberQueryValue(value, fallback) {
  const parsed = Number(firstQueryValue(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function zipHourly(hourly) {
  if (!hourly?.time) return [];

  return hourly.time.map((time, index) => ({
    time,
    temperature: hourly.temperature_2m?.[index] ?? null,
    relative_humidity: hourly.relative_humidity_2m?.[index] ?? null,
    dew_point: hourly.dew_point_2m?.[index] ?? null,
    feels_like: hourly.apparent_temperature?.[index] ?? null,
    rain_chance: hourly.precipitation_probability?.[index] ?? null,
    precipitation: hourly.precipitation?.[index] ?? null,
    rain: hourly.rain?.[index] ?? null,
    showers: hourly.showers?.[index] ?? null,
    snowfall: hourly.snowfall?.[index] ?? null,
    weather_code: hourly.weather_code?.[index] ?? null,
    condition: descriptionForWeatherCode(hourly.weather_code?.[index]),
    cloud_cover: hourly.cloud_cover?.[index] ?? null,
    visibility: hourly.visibility?.[index] ?? null,
    wind_speed: hourly.wind_speed_10m?.[index] ?? null,
    wind_direction: hourly.wind_direction_10m?.[index] ?? null,
    wind_gusts: hourly.wind_gusts_10m?.[index] ?? null,
    uv_index: hourly.uv_index?.[index] ?? null,
  }));
}

function zipDaily(daily) {
  if (!daily?.time) return [];

  return daily.time.map((date, index) => ({
    date,
    weather_code: daily.weather_code?.[index] ?? null,
    condition: descriptionForWeatherCode(daily.weather_code?.[index]),
    temperature: {
      min: daily.temperature_2m_min?.[index] ?? null,
      max: daily.temperature_2m_max?.[index] ?? null,
      feels_like_min: daily.apparent_temperature_min?.[index] ?? null,
      feels_like_max: daily.apparent_temperature_max?.[index] ?? null,
    },
    sunrise: daily.sunrise?.[index] ?? null,
    sunset: daily.sunset?.[index] ?? null,
    uv_index_max: daily.uv_index_max?.[index] ?? null,
    precipitation: {
      total: daily.precipitation_sum?.[index] ?? null,
      rain: daily.rain_sum?.[index] ?? null,
      showers: daily.showers_sum?.[index] ?? null,
      snowfall: daily.snowfall_sum?.[index] ?? null,
      chance: daily.precipitation_probability_max?.[index] ?? null,
    },
    wind: {
      speed_max: daily.wind_speed_10m_max?.[index] ?? null,
      gusts_max: daily.wind_gusts_10m_max?.[index] ?? null,
      direction: daily.wind_direction_10m_dominant?.[index] ?? null,
    },
  }));
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=900, stale-while-revalidate=3600",
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    sendJson(res, 405, {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Sirf GET request allowed hai.",
      },
    });
    return;
  }

  const city = String(firstQueryValue(req.query?.city) || "").trim();

  if (!city) {
    sendJson(res, 400, {
      success: false,
      error: {
        code: "CITY_REQUIRED",
        message: "City query required hai. Example: /api/weather?city=Delhi",
      },
    });
    return;
  }

  if (city.length > 100) {
    sendJson(res, 400, {
      success: false,
      error: {
        code: "CITY_TOO_LONG",
        message: "City name 100 characters se chhota hona chahiye.",
      },
    });
    return;
  }

  const requestedDays = numberQueryValue(req.query?.days, 6);
  const forecastDays = Math.min(16, Math.max(1, Math.round(requestedDays)));
  const language = String(firstQueryValue(req.query?.language) || "en");

  try {
    const geocodingParams = new URLSearchParams({
      name: city,
      count: "1",
      language,
      format: "json",
    });

    const geocodingResponse = await fetch(
      `${OPEN_METEO_GEOCODING_URL}?${geocodingParams}`,
      {
        headers: {
          "User-Agent": "keyless-weather-api/1.0",
        },
      },
    );

    if (!geocodingResponse.ok) {
      throw new Error(`Geocoding request failed with ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();
    const location = geocodingData.results?.[0];

    if (!location) {
      sendJson(res, 404, {
        success: false,
        error: {
          code: "CITY_NOT_FOUND",
          message: `Weather data nahi mila: ${city}`,
        },
      });
      return;
    }

    const forecastParams = new URLSearchParams({
      latitude: Number(location.latitude).toFixed(4),
      longitude: Number(location.longitude).toFixed(4),
      timezone: "auto",
      forecast_days: String(forecastDays),
      current: currentFields,
      hourly: hourlyFields,
      daily: dailyFields,
    });

    const forecastResponse = await fetch(
      `${OPEN_METEO_FORECAST_URL}?${forecastParams}`,
      {
        headers: {
          "User-Agent": "keyless-weather-api/1.0",
        },
      },
    );

    if (!forecastResponse.ok) {
      throw new Error(`Forecast request failed with ${forecastResponse.status}`);
    }

    const forecast = await forecastResponse.json();
    const currentCode = forecast.current?.weather_code;

    sendJson(res, 200, {
      success: true,
      source: "Open-Meteo",
      attribution: "Weather data by Open-Meteo.com",
      request: {
        city,
        forecast_days: forecastDays,
        timezone: forecast.timezone,
      },
      location: {
        name: location.name,
        country: location.country,
        country_code: location.country_code,
        region: location.admin1 || null,
        latitude: forecast.latitude,
        longitude: forecast.longitude,
        elevation: forecast.elevation,
      },
      current: {
        ...forecast.current,
        condition: descriptionForWeatherCode(currentCode),
        units: forecast.current_units,
      },
      hourly: {
        units: forecast.hourly_units,
        data: zipHourly(forecast.hourly),
      },
      daily: {
        units: forecast.daily_units,
        data: zipDaily(forecast.daily),
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Weather API error:", error);
    sendJson(res, 502, {
      success: false,
      error: {
        code: "WEATHER_PROVIDER_ERROR",
        message: "Weather provider se data lene me problem hui.",
      },
    });
  }
};