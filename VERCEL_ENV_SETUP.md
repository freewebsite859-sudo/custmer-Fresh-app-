# Vercel Environment Variable Setup

## Add Google Geolocation API Key to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project **custmer-fresh-app**
3. Go to **Settings** → **Environment Variables**
4. Add the following variable:

| Key | Value |
|---|---|
| `VITE_GOOGLE_GEOLOCATION_API_KEY` | `AIzaSyA-Gcqz5-iQbqm0vPfk98ONrtAENUX3dTk` |

5. Select **Production**, **Preview**, and **Development** environments
6. Click **Save**
7. Go to **Deployments** → Latest deployment → **Redeploy**

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
