# Keyless Weather API

Vercel-ready serverless weather API using Open-Meteo. API key ki zarurat nahi hai.

## Endpoint

```text
GET /api/weather?city=Delhi
```

Optional query parameters:

```text
/api/weather?city=Delhi&days=6
/api/weather?city=London&days=10
/api/weather?city=Tokyo&days=3&language=en
```

- `city`: required city name
- `days`: forecast days, `1` se `16` tak; default `6`
- `language`: geocoding language; default `en`

Response me current weather, hourly forecast, daily forecast, wind, rain, UV index, sunrise/sunset aur units milte hain.

## Deploy on Vercel

1. Is repository ko GitHub par push karo.
2. Vercel me **Add New Project** se repository import karo.
3. Framework preset **Other** select karo.
4. Build command blank rakho.
5. Deploy karo.

Deploy hone ke baad:

```text
https://YOUR-DOMAIN.vercel.app/api/weather?city=Delhi
```

## Notes

- Is function me app-level rate limit nahi lagaya gaya.
- CDN caching ke liye response me `s-maxage=900` aur `stale-while-revalidate=3600` set hai.
- Open-Meteo ke free usage limits aur license ko follow karo.
- Public app me attribution rakho: `Weather data by Open-Meteo.com`.