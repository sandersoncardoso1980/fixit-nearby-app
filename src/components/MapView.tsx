import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { Profile } from "@/lib/types";
import { distanceKm, formatKm } from "@/lib/geo";

function providerIcon(p: Profile) {
  const initials = p.full_name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div style="width:40px;height:40px;border-radius:9999px;overflow:hidden;border:3px solid ${
      p.is_online ? "oklch(0.62 0.15 155)" : "oklch(0.6 0.02 262)"
    };box-shadow:0 6px 16px -6px rgba(0,0,0,.5);background:#fff;display:grid;place-items:center;font:600 12px sans-serif;color:#333">${
      p.avatar_url
        ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover" alt=""/>`
        : initials
    }</div>`,
  });
}

const meIcon = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:oklch(0.44 0.16 274);border:3px solid #fff;box-shadow:0 0 0 6px oklch(0.44 0.16 274 / .2)"></div>`,
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function MapView({
  center,
  radiusKm,
  providers,
  onSelect,
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
  providers: Profile[];
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={center.lat} lng={center.lng} />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "oklch(0.44 0.16 274)", fillOpacity: 0.07, weight: 1.5 }}
      />
      <Marker position={[center.lat, center.lng]} icon={meIcon} />
      {providers.map((p) =>
        p.latitude != null && p.longitude != null ? (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={providerIcon(p)}>
            <Popup>
              <div className="min-w-40 space-y-1">
                <p className="text-sm font-semibold">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.rating_avg.toFixed(1)} ★ · {formatKm(distanceKm(center, { lat: p.latitude, lng: p.longitude }))}
                </p>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="mt-1 w-full cursor-pointer rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                >
                  Ver perfil
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
