"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GasStation } from "@/lib/types";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// ── FlyTo ─────────────────────────────────────────────────────
function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, 15, { duration: 1.0 }); }, [pos, map]);
  return null;
}

// ── 주유소 마커 아이콘 ────────────────────────────────────────
function gasMarkerIcon(s: GasStation, selected: boolean): L.DivIcon {
  const price = s.prices.gasoline;
  const bg    = selected ? s.brandColor : "white";
  const fg    = selected ? "white" : s.brandColor;
  const border = selected ? s.brandColor : "#d2d2d7";
  const shadow = selected
    ? `0 4px 16px ${s.brandColor}55, 0 2px 6px rgba(0,0,0,.25)`
    : "0 2px 8px rgba(0,0,0,.18)";

  return L.divIcon({
    className:   "",
    iconSize:    [60, 52] as [number, number],
    iconAnchor:  [30, 52] as [number, number],
    popupAnchor: [0, -54] as [number, number],
    html: `
<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
  <div style="
    background:${bg};
    border:2px solid ${border};
    border-radius:12px;
    padding:4px 8px 3px;
    box-shadow:${shadow};
    text-align:center;
    min-width:52px;
    transition:all .15s
  ">
    <div style="font-size:16px;line-height:1">⛽</div>
    <div style="font-size:9px;font-weight:800;color:${fg};margin-top:1px;white-space:nowrap">${s.brandShort}</div>
    ${price != null
      ? `<div style="font-size:10px;font-weight:900;color:${selected ? "rgba(255,255,255,.95)" : "#DC2626"};margin-top:1px;white-space:nowrap">${price.toLocaleString()}</div>`
      : `<div style="font-size:9px;color:${selected ? "rgba(255,255,255,.6)" : "#aeaeb2"}">가격 없음</div>`
    }
  </div>
  <div style="width:2px;height:7px;background:${border};border-radius:0 0 2px 2px"></div>
</div>`,
  });
}

// ── 내 위치 아이콘 ────────────────────────────────────────────
const myLocationIcon = L.divIcon({
  className:  "",
  iconSize:   [28, 28] as [number, number],
  iconAnchor: [14, 14] as [number, number],
  html: `<div style="width:28px;height:28px;background:#3182F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(49,130,246,.2),0 2px 8px rgba(0,0,0,.3)"></div>`,
});

// ── Props ─────────────────────────────────────────────────────
interface Props {
  stations:      GasStation[];
  selectedId:    string | null;
  onSelect:      (s: GasStation) => void;
  flyToStation?: GasStation | null;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function GasMapView({ stations, selectedId, onSelect, flyToStation }: Props) {
  const [myPos,    setMyPos]    = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTo,    setFlyTo]    = useState<[number, number] | null>(null);

  const center: [number, number] = [37.5480, 126.6720];

  useEffect(() => {
    if (flyToStation) setFlyTo([flyToStation.lat, flyToStation.lng]);
  }, [flyToStation]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setMyPos(pos);
        setFlyTo(pos);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <div className="w-full h-full overflow-hidden"
      style={{ position: "relative", isolation: "isolate" }}>

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <ZoomControl position="bottomleft" />

        {stations.map(s => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={gasMarkerIcon(s, selectedId === s.id)}
            eventHandlers={{ click: () => onSelect(s) }}
          />
        ))}

        {myPos && <Marker position={myPos} icon={myLocationIcon} />}
        {flyTo  && <FlyTo pos={flyTo} />}
      </MapContainer>

      {/* 내 위치 버튼 */}
      <button
        onClick={locate}
        disabled={locating}
        title="내 위치 찾기"
        style={{
          position: "absolute", bottom: 80, right: 16, zIndex: 1000,
          width: 46, height: 46, background: "white",
          border: myPos ? "2px solid #3182F6" : "1.5px solid #d2d2d7",
          borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: locating ? "wait" : "pointer",
        }}
      >
        {locating ? (
          <div style={{
            width: 18, height: 18,
            border: "2.5px solid #3182F6",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin .8s linear infinite",
          }} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={myPos ? "#3182F6" : "#6e6e73"} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill={myPos ? "#3182F6" : "none"} />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
            <circle cx="12" cy="12" r="7" strokeWidth="1.2" opacity=".35" />
          </svg>
        )}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
