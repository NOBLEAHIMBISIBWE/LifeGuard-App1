import { useEffect, useState } from "react";

export type Fix = { lat: number; lng: number; accuracy: number; at: number };

export function useLocation(watch = true) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!watch) return;
    if (!("geolocation" in navigator)) return setError("Location not supported on this device");
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setFix({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          at: Date.now(),
        });
        setError(null);
      },
      (e) => setError(e.code === 1 ? "Location permission denied" : "Couldn't get your location"),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [watch]);

  return { fix, error };
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

export const mapEmbed = (lat: number, lng: number) => {
  const key = getMapsApiKey();
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=16`;
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`;
};

export const mapLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
