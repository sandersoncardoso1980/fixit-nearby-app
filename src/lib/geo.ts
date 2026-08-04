export const DEFAULT_CENTER = { lat: -23.5613, lng: -46.6565 };

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number | null; lng: number | null },
): number {
  if (b.lat == null || b.lng == null) return Number.POSITIVE_INFINITY;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function brl(value: number | null | undefined): string {
  if (value == null) return "a combinar";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
