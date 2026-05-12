"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// ── 핀 + 건물 카드 마커 HTML 생성 ──────────────────────────────
function buildingPinHTML(
  name: string,
  hasData: boolean,
  selected: boolean,
  dimmed: boolean,
): string {
  const opacity = dimmed ? 0.28 : 1;
  const accent  = selected ? "#0058b0" : hasData ? "#0071e3" : "#94A3B8";
  const ringBg  = selected ? "#0058b0" : "white";
  const ringFg  = selected ? "white" : accent;
  const ringBd  = selected ? "transparent" : accent;
  const labelBg = selected ? "#0058b0" : "white";
  const labelFg = selected ? "white" : "#1d1d1f";
  const labelBd = selected ? "transparent" : "rgba(0,0,0,0.08)";
  const shortName = name.length > 10 ? name.slice(0, 10) + "…" : name;

  // 핀 SVG: 둥근 머리 + 뾰족한 꼬리
  const pinSVG = `
    <svg width="44" height="52" viewBox="0 0 44 52" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,.22))">
      <defs>
        <linearGradient id="g${selected ? "s" : hasData ? "h" : "n"}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${selected ? "#0079f0" : hasData ? "#3691f0" : "#A8B3C2"}"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <path d="M22 50C22 50 4 28 4 18 A18 18 0 0 1 40 18 C40 28 22 50 22 50Z"
        fill="url(#g${selected ? "s" : hasData ? "h" : "n"})"/>
      <circle cx="22" cy="18" r="11" fill="${ringBg}" stroke="${ringBd}" stroke-width="1.5"/>
      <!-- Building2 icon paths (lucide) scaled into the circle -->
      <g transform="translate(13.5, 9.5) scale(0.71)" stroke="${ringFg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/>
        <path d="M10 10h4"/>
        <path d="M10 14h4"/>
        <path d="M10 18h4"/>
      </g>
    </svg>
  `;

  return `
<div style="display:inline-flex;flex-direction:column;align-items:center;opacity:${opacity};cursor:pointer">
  ${pinSVG}
  <div style="background:${labelBg};color:${labelFg};font-size:13px;font-weight:700;padding:4px 10px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.18);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;text-align:center;margin-top:-4px;border:1px solid ${labelBd};letter-spacing:-0.2px">${shortName}</div>
</div>`;
}

function buildingMarkerIcon(
  name: string,
  hasData: boolean,
  selected: boolean,
  dimmed: boolean,
) {
  return L.divIcon({
    className:   "",
    iconSize:    [120, 78] as [number, number],
    iconAnchor:  [60, 50]  as [number, number],
    popupAnchor: [0, -52]  as [number, number],
    html: buildingPinHTML(name, hasData, selected, dimmed),
  });
}

// ── 내 위치 아이콘 ────────────────────────────────────────────
const myLocationIcon = L.divIcon({
  className:  "",
  iconSize:   [28, 28] as [number, number],
  iconAnchor: [14, 14] as [number, number],
  html: `<div style="width:28px;height:28px;background:#0071e3;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(49,130,246,.2),0 2px 8px rgba(0,0,0,.3)"></div>`,
});

// ── FlyTo ─────────────────────────────────────────────────────
function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, 16, { duration: 1.2 }); }, [pos, map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────
interface NearbyBuilding {
  id:      string;
  name:    string;
  lat:     number;
  lng:     number;
  floors:  number;
  stores:  number;
  hasData: boolean;
}

interface Props {
  buildings:  NearbyBuilding[];
  selectedId: string | null;
  onSelect:   (id: string) => void;
  dimmedIds:  Set<string>;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function StoreMapView({ buildings, selectedId, onSelect, dimmedIds }: Props) {
  const [myPos,    setMyPos]    = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTo,    setFlyTo]    = useState<[number, number] | null>(null);

  const center: [number, number] = [37.593, 126.710];

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
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {buildings.map(b => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={buildingMarkerIcon(b.name, b.hasData, selectedId === b.id, dimmedIds.has(b.id))}
            eventHandlers={{ click: () => onSelect(b.id) }}
          />
        ))}

        {myPos && (
          <Marker position={myPos} icon={myLocationIcon} />
        )}

        {flyTo && <FlyTo pos={flyTo} />}
      </MapContainer>

      {/* 내 위치 버튼 (Crosshair 스타일) */}
      <button
        onClick={locate}
        disabled={locating}
        title="내 위치 찾기"
        style={{
          position: "absolute",
          bottom: 80,
          right: 16,
          zIndex: 1000,
          width: 46,
          height: 46,
          background: "white",
          border: myPos ? "2px solid #0071e3" : "1.5px solid #d2d2d7",
          borderRadius: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: locating ? "wait" : "pointer",
        }}
      >
        {locating ? (
          <div style={{
            width: 18, height: 18,
            border: "2.5px solid #0071e3",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={myPos ? "#0071e3" : "#6e6e73"} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            {/* lucide Crosshair icon */}
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
            <circle cx="12" cy="12" r="2.5" fill={myPos ? "#0071e3" : "transparent"} />
          </svg>
        )}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
