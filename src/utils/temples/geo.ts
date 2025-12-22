import { isNativeWebView, requestFromNative } from "@/utils/nativeBridge";

export type LatLng = { latitude: number; longitude: number };

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export async function getUserLocation(): Promise<LatLng> {
  if (isNativeWebView()) {
    const loc = await requestFromNative<LatLng>({ type: "location:getCurrentPosition" });
    if (!loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
      throw new Error("Geolocation unavailable");
    }
    return loc;
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation unavailable");
  }

  return new Promise<LatLng>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
