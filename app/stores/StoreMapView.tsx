"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from "react-leaflet";
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

// ── 3D 건물 마커 HTML 생성 ────────────────────────────────────
function building3DHTML(
  name: string,
  floors: number,
  hasData: boolean,
  selected: boolean,
  dimmed: boolean,
): string {
  const fw  = 34;               // 전면 폭
  const ox  = 14;               // 3D 깊이 x-offset
  const oy  = 7;                // 3D 깊이 y-offset
  const h   = Math.max(20, Math.min(10 + floors * 9, 58)); // 층수 비례 높이
  const px  = 2;                // 전면 좌상단 x
  const py  = oy + 4;          // 전면 좌상단 y (상단 roof 영역 확보)

  // 전면 꼭짓점
  const fTL = [px, py] as const;
  const fTR = [px + fw, py] as const;
  const fBR = [px + fw, py + h] as const;
  const fBL = [px, py + h] as const;
  // 후면 꼭짓점 (offset)
  const bTL = [px + ox, py - oy] as const;
  const bTR = [px + fw + ox, py - oy] as const;
  const bBR = [px + fw + ox, py + h - oy] as const;

  // 색상
  const front = selected ? "#0058b0" : hasData ? "#0071e3" : "#9CA3AF";
  const side  = selected ? "#103B7A" : hasData ? "#1849A3" : "#6B7280";
  const top   = selected ? "#93C5FD" : hasData ? "#BFDBFE" : "#E5E7EB";
  const winC  = "rgba(255,255,255,0.55)";

  // 창문 (층수만큼, 최대 4줄)
  const wRows = Math.min(floors, 4);
  const wGap  = h / (wRows + 1);
  const wh    = 4;
  let windows = "";
  for (let r = 0; r < wRows; r++) {
    for (let c = 0; c < 2; c++) {
      const wx = px + 4 + c * 13;
      const wy = py + wGap * (r + 0.5) - wh / 2;
      windows += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="9" height="${wh}" rx="1.5" fill="${winC}"/>`;
    }
  }

  // 문
  const doorX = (px + px + fw) / 2 - 4;
  const doorY = py + h - 10;

  // 지붕 꼭대기 삼각형 (건물 강조)
  const roofPeak = [px + fw / 2 + ox / 2, py - oy - 6] as const;
  const roofLeft = bTL;
  const roofRight = bTR;

  const svgW = px + fw + ox + 2;
  const svgH = py + h + 2;

  const opacity = dimmed ? 0.22 : 1;
  const shortName = name.length > 8 ? name.slice(0, 8) + "…" : name;
  const labelBg = selected ? "#0058b0" : "white";
  const labelColor = selected ? "white" : "#1d1d1f";

  return `
<div style="display:inline-flex;flex-direction:column;align-items:center;opacity:${opacity};cursor:pointer">
  <svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" overflow="visible">
    <!-- 지붕 삼각형 -->
    <polygon points="${roofLeft[0]},${roofLeft[1]} ${roofPeak[0]},${roofPeak[1]} ${roofRight[0]},${roofRight[1]}" fill="${top}" opacity="0.7"/>
    <!-- 우측 측면 -->
    <polygon points="${fTR[0]},${fTR[1]} ${bTR[0]},${bTR[1]} ${bBR[0]},${bBR[1]} ${fBR[0]},${fBR[1]}" fill="${side}"/>
    <!-- 전면 -->
    <rect x="${fTL[0]}" y="${fTL[1]}" width="${fw}" height="${h}" fill="${front}"/>
    <!-- 상단 면 -->
    <polygon points="${fTL[0]},${fTL[1]} ${bTL[0]},${bTL[1]} ${bTR[0]},${bTR[1]} ${fTR[0]},${fTR[1]}" fill="${top}"/>
    <!-- 창문 -->
    ${windows}
    <!-- 문 -->
    <rect x="${doorX.toFixed(1)}" y="${doorY.toFixed(1)}" width="8" height="10" rx="1.5" fill="${side}" opacity="0.7"/>
    <!-- 층수 표시 (전면 우상단) -->
    <text x="${(fTR[0] - 2).toFixed(1)}" y="${(fTL[1] + 11).toFixed(1)}" font-size="8" font-weight="800" fill="rgba(255,255,255,0.9)" text-anchor="end">${floors}F</text>
  </svg>
  <div style="background:${labelBg};color:${labelColor};font-size:10px;font-weight:700;padding:2px 7px;border-radius:7px;box-shadow:0 2px 8px rgba(0,0,0,.22);white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis;text-align:center;margin-top:2px;border:${selected ? "none" : "1px solid #d2d2d7"}">${shortName}</div>
</div>`;
}

function buildingMarkerIcon(
  name: string,
  floors: number,
  hasData: boolean,
  selected: boolean,
  dimmed: boolean,
) {
  const oy  = 7;
  const h   = Math.max(20, Math.min(10 + floors * 9, 58));
  const py  = oy + 4;
  const svgH = py + h + 2;
  const totalW = 90;
  const totalH = svgH + 22;

  return L.divIcon({
    className:   "",
    iconSize:    [totalW, totalH]   as [number, number],
    iconAnchor:  [totalW / 2, svgH] as [number, number],
    popupAnchor: [0, -(svgH + 4)]   as [number, number],
    html: building3DHTML(name, floors, hasData, selected, dimmed),
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
        <ZoomControl position="bottomleft" />

        {buildings.map(b => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={buildingMarkerIcon(b.name, b.floors, b.hasData, selectedId === b.id, dimmedIds.has(b.id))}
            eventHandlers={{ click: () => onSelect(b.id) }}
          />
        ))}

        {myPos && (
          <Marker position={myPos} icon={myLocationIcon} />
        )}

        {flyTo && <FlyTo pos={flyTo} />}
      </MapContainer>

      {/* 내 위치 버튼 */}
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
            <circle cx="12" cy="12" r="3" fill={myPos ? "#0071e3" : "none"} />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
            <circle cx="12" cy="12" r="7" strokeWidth="1.2" opacity=".35" />
          </svg>
        )}
      </button>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
