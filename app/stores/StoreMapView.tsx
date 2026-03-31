"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Next.js 정적 빌드에서 Leaflet 기본 아이콘 경로 수정
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// ── 건물 마커 아이콘 ──────────────────────────────────────────
function buildingIcon(hasData: boolean, selected: boolean) {
  const bg   = selected ? "#1B64DA" : hasData ? "#3182F6" : "#8B95A1";
  const size = selected ? 44 : 36;
  return L.divIcon({
    className:   "",
    iconAnchor:  [size / 2, size] as [number, number],
    popupAnchor: [0, -size - 4] as [number, number],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px">
        <div style="
          width:${size}px;height:${size}px;
          background:${bg};
          border-radius:50% 50% 50% 4px;
          transform:rotate(-45deg);
          border:2.5px solid white;
          box-shadow:0 3px 10px rgba(0,0,0,.28);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.38)}px;line-height:1">🏢</span>
        </div>
      </div>`,
  });
}

// ── 내 위치 마커 아이콘 ───────────────────────────────────────
const myLocationIcon = L.divIcon({
  className:  "",
  iconAnchor: [14, 14] as [number, number],
  html: `
    <div style="
      width:28px;height:28px;
      background:#3182F6;border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 0 6px rgba(49,130,246,.2),0 2px 8px rgba(0,0,0,.3);
    "></div>`,
});

// ── 위치 변경 시 지도 자동 이동 ───────────────────────────────
function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, 16, { duration: 1.2 }); }, [pos, map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────
interface NearbyBuilding {
  id:       string;
  name:     string;
  address:  string;
  lat:      number;
  lng:      number;
  floors:   number;
  stores:   number;
  km:       number;
  hasData:  boolean;
}

interface Props {
  buildings: NearbyBuilding[];
  selectedId: string | null;
  onSelect:   (id: string) => void;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function StoreMapView({ buildings, selectedId, onSelect }: Props) {
  const [myPos,    setMyPos]    = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTo,    setFlyTo]    = useState<[number, number] | null>(null);

  const center: [number, number] = [37.5448, 126.6863];

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

  function distLabel(km: number) {
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  }

  return (
    <div className="w-full overflow-hidden"
      style={{ height: "100%", position: "relative" }}>

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        {/* OpenStreetMap 타일 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 줌 버튼 — 왼쪽 아래 */}
        <ZoomControl position="bottomleft" />

        {/* 건물 마커 */}
        {buildings.map(b => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={buildingIcon(b.hasData, selectedId === b.id)}
            eventHandlers={{ click: () => onSelect(b.id) }}
          >
            <Popup closeButton={false}>
              <div style={{ minWidth: 150, padding: "2px 0" }}>
                <p style={{ fontWeight: 800, fontSize: 14, color: "#191F28", marginBottom: 3 }}>{b.name}</p>
                <p style={{ fontSize: 12, color: "#8B95A1", marginBottom: 4 }}>{b.address}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#4E5968" }}>{b.floors}층 · {b.stores}개 매장</span>
                  <span style={{ fontSize: 11, color: "#3182F6", fontWeight: 700 }}>{distLabel(b.km)}</span>
                </div>
                {b.hasData && (
                  <p style={{ fontSize: 11, color: "#3182F6", fontWeight: 600, marginTop: 6,
                    background: "#EBF3FE", padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
                    📍 층별 지도 보기
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 내 위치 마커 + 반경 원 */}
        {myPos && (
          <>
            <Marker position={myPos} icon={myLocationIcon}>
              <Popup closeButton={false}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#3182F6" }}>📍 내 현재 위치</p>
              </Popup>
            </Marker>
            <Circle
              center={myPos}
              radius={80}
              pathOptions={{ color: "#3182F6", fillColor: "#3182F6", fillOpacity: 0.1, weight: 1.5 }}
            />
          </>
        )}

        {/* 위치 확인 시 자동 이동 */}
        {flyTo && <FlyTo pos={flyTo} />}
      </MapContainer>

      {/* 내 위치 찾기 버튼 — 지도 위 절대 위치 */}
      <button
        onClick={locate}
        disabled={locating}
        title="내 위치 찾기"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 1000,
          width: 44,
          height: 44,
          background: "white",
          border: myPos ? "2px solid #3182F6" : "1.5px solid #E5E8EB",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: locating ? "wait" : "pointer",
        }}
      >
        {locating ? (
          <div style={{
            width: 18, height: 18,
            border: "2.5px solid #3182F6",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={myPos ? "#3182F6" : "#8B95A1"} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill={myPos ? "#3182F6" : "none"} />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
            <circle cx="12" cy="12" r="7" strokeWidth="1.2" opacity=".35" />
          </svg>
        )}
      </button>

      {/* 스피너 CSS */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
