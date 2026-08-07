# Vercel Environment Variable Setup

## Add Google Maps / Geocoding API Key to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project **custmer-fresh-app**
3. Go to **Settings** → **Environment Variables**
4. Add the following variable (the app reads this exact name):

| Key | Value |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyA-Gcqz5-iQbqm0vPfk98ONrtAENUX3dTk` |

> ⚠️ The variable **must** be named `VITE_GOOGLE_MAPS_API_KEY`. The older
> `VITE_GOOGLE_GEOLOCATION_API_KEY` name is **not** read by the current code
> and is only kept as an optional fallback — always set
> `VITE_GOOGLE_MAPS_API_KEY`.

5. Select **Production**, **Preview**, and **Development** environments
6. Click **Save**
7. Go to **Deployments** → Latest **Production** deployment → **Redeploy**
   (Vite inlines `VITE_*` variables at build time, so a redeploy is required
   for the key to take effect in production).

## What This Enables

- **Real-time GPS location** tracking using device GPS
- **Google Geolocation API fallback** when GPS is unavailable (cell tower/Wi-Fi)
- **Reverse geocoding** to convert coordinates to human-readable addresses
- **Live accuracy indicator** showing GPS precision in meters

## How It Works

1. User clicks "Use My Current Location"
2. Browser requests GPS permission
3. GPS coordinates are obtained (or Google API fallback)
4. Coordinates are reverse-geocoded to get area/city/address
5. Location is saved and used for nearby salon recommendations
