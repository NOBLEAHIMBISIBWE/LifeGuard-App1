import { useCallback, useEffect, useState } from "react";

export type Fix = { lat: number; lng: number; accuracy: number; at: number };
export type CoordinateSource = "gps" | "geocoded" | "manual" | "district_reference";

export type ResolvedCoordinates = {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  source: CoordinateSource | null;
};

export const UGANDA_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Kampala: { lat: 0.3476, lng: 32.5825 },
  Wakiso: { lat: 0.4044, lng: 32.4594 },
  Mukono: { lat: 0.3533, lng: 32.7553 },
  Jinja: { lat: 0.439, lng: 33.2032 },
  Gulu: { lat: 2.7724, lng: 32.2881 },
  Mbarara: { lat: -0.6072, lng: 30.6545 },
  Arua: { lat: 3.0201, lng: 30.9111 },
  Mbale: { lat: 1.0644, lng: 34.1794 },
  Kasese: { lat: 0.1833, lng: 30.0833 },
  Masaka: { lat: -0.3338, lng: 31.7341 },
  Hoima: { lat: 1.4331, lng: 31.3524 },
  "Fort Portal / Kabarole": { lat: 0.671, lng: 30.275 },
  Lira: { lat: 2.2499, lng: 32.8998 },
  Soroti: { lat: 1.7146, lng: 33.6111 },
  Kabale: { lat: -1.2486, lng: 29.9899 },
  Tororo: { lat: 0.6929, lng: 34.1809 },
  Entebbe: { lat: 0.0512, lng: 32.4637 },
  Other: { lat: 0.3476, lng: 32.5825 },
};

export function useLocation(watch = true) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Location not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFix({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          at: Date.now(),
        });
        setError(null);
        setLocating(false);
      },
      (e) => {
        setError(e.code === 1 ? "Location permission denied" : "Couldn't get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 },
    );
  }, []);

  useEffect(() => {
    if (!watch) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Location not supported on this device");
      return;
    }
    setLocating(true);
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setFix({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          at: Date.now(),
        });
        setError(null);
        setLocating(false);
      },
      (e) => {
        setError(e.code === 1 ? "Location permission denied" : "Couldn't get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [watch]);

  return { fix, error, locating, refresh };
}

export function getMapsApiKey(): string {
  if (typeof window !== "undefined") {
    return (
      (import.meta as unknown as { env: Record<string, string> }).env["VITE_GOOGLE_MAPS_API_KEY"] ||
      ""
    );
  }
  return process.env["VITE_GOOGLE_MAPS_API_KEY"] || "";
}

export function parseCoordinatesFromText(input?: string | null): {
  lat: number;
  lng: number;
} | null {
  if (!input) return null;
  const match = input.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function resolveReportCoordinates(options: {
  fix: Fix | null;
  locationText?: string;
  district?: string;
}): Promise<ResolvedCoordinates> {
  const { fix, locationText, district } = options;

  if (fix) {
    return {
      lat: fix.lat,
      lng: fix.lng,
      accuracy: fix.accuracy,
      source: "gps",
    };
  }

  const parsed = parseCoordinatesFromText(locationText);
  if (parsed) {
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      accuracy: null,
      source: "manual",
    };
  }

  const query = [locationText?.trim(), district?.trim(), "Uganda"].filter(Boolean).join(", ");
  const mapsKey = getMapsApiKey();

  if (mapsKey && query) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(mapsKey)}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
        };
        const loc = json.results?.[0]?.geometry?.location;
        if (typeof loc?.lat === "number" && typeof loc?.lng === "number") {
          return {
            lat: loc.lat,
            lng: loc.lng,
            accuracy: null,
            source: "geocoded",
          };
        }
      }
    } catch {
      /* fallback to district reference */
    }
  }

  if (locationText?.trim() && typeof fetch !== "undefined") {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      );
      clearTimeout(timeout);
      if (res.ok) {
        const list = (await res.json()) as Array<{ lat?: string; lon?: string }>;
        const first = list[0];
        if (first?.lat && first?.lon) {
          const lat = Number(first.lat);
          const lng = Number(first.lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            return {
              lat,
              lng,
              accuracy: null,
              source: "geocoded",
            };
          }
        }
      }
    } catch {
      /* fallback to district reference */
    }
  }

  const ref = (district && UGANDA_DISTRICT_COORDS[district]) ||
    UGANDA_DISTRICT_COORDS["Kampala"] || { lat: 0.3476, lng: 32.5825 };
  return {
    lat: ref.lat,
    lng: ref.lng,
    accuracy: null,
    source: "district_reference",
  };
}

export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "Unavailable";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export const mapEmbed = (lat: number, lng: number) => {
  const key = getMapsApiKey();
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=16`;
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`;
};

export const mapLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
