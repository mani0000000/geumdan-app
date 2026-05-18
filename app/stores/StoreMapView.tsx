"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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

type Dir = "N" | "E" | "S" | "W";

// bearing(0~360) → 사진 방향 버킷
function bearingToDir(bearing: number): Dir {
  const b = ((bearing % 360) + 360) % 360;
  if (b >= 315 || b < 45) return "N";
  if (b < 135) return "E";
  if (b < 225) return "S";
  return "W";
}

interface DirectionPhotos {
  north: string | null;
  south: string | null;
  east:  string | null;
  west:  string | null;
}

function photoForDir(photos: DirectionPhotos | undefined, dir: Dir): string | null {
  if (!photos) return null;
  if (dir === "N") return photos.north;
  if (dir === "E") return photos.east;
  if (dir === "S") return photos.south;
  return photos.west;
}

// 마커 내부 콘텐츠는 --cbearing CSS 변수로 일괄 역회전(지도 회전 시 항상 똑바로)
const counterRot =
  "transform:rotate(var(--cbearing,0deg)) scale(var(--cscale,1));transform-origin:bottom center;transition:transform .12s linear";

// ── 사진 카드 마커 (해당 방향 로드뷰 사진) ───────────────────
function photoMarkerHTML(name: string, url: string, selected: boolean, dimmed: boolean): string {
  const opacity = dimmed ? 0.28 : 1;
  const shortName = name.length > 10 ? name.slice(0, 10) + "…" : name;
  const size = 60;
  const border = selected ? "#0071e3" : "white";
  const ring = selected ? ",0 0 0 4px rgba(0,113,227,.28)" : "";
  const labelBg = selected ? "#0058b0" : "white";
  const labelFg = selected ? "white" : "#1d1d1f";
  const labelBd = selected ? "transparent" : "rgba(0,0,0,0.08)";
  return `
<div style="--cscale:${selected ? 1.08 : 1};${counterRot};display:inline-flex;flex-direction:column;align-items:center;opacity:${opacity};cursor:pointer">
  <div style="position:relative;width:${size}px;height:${size}px;border-radius:14px;overflow:hidden;border:3px solid ${border};box-shadow:0 4px 12px rgba(0,0,0,.32)${ring};background:#e5e7eb">
    <img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
    <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:24px;background:linear-gradient(135deg,#0071e3,#1849A3);color:rgba(255,255,255,.85)">🏢</div>
  </div>
  <div style="margin-top:3px;background:${labelBg};color:${labelFg};font-size:12px;font-weight:700;padding:3px 9px;border-radius:9px;box-shadow:0 3px 10px rgba(0,0,0,.18);white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;text-align:center;border:1px solid ${labelBd};letter-spacing:-0.2px">${shortName}</div>
</div>`;
}

// ── 핀 + 건물 카드 마커 HTML 생성 (사진 없을 때) ──────────────
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
<div style="--cscale:${selected ? 1.08 : 1};${counterRot};display:inline-flex;flex-direction:column;align-items:center;opacity:${opacity};cursor:pointer">
  ${pinSVG}
  <div style="background:${labelBg};color:${labelFg};font-size:13px;font-weight:700;padding:4px 10px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.18);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;text-align:center;margin-top:-4px;border:1px solid ${labelBd};letter-spacing:-0.2px">${shortName}</div>
</div>`;
}

function buildingMarkerIcon(
  b: NearbyBuilding,
  selected: boolean,
  dimmed: boolean,
  dir: Dir,
) {
  const photo = photoForDir(b.photos, dir);

  if (photo) {
    return L.divIcon({
      className:   "",
      iconSize:    [130, 90] as [number, number],
      iconAnchor:  [65, 66]  as [number, number],
      popupAnchor: [0, -66]  as [number, number],
      html: photoMarkerHTML(b.name, photo, selected, dimmed),
    });
  }

  return L.divIcon({
    className:   "",
    iconSize:    [120, 78] as [number, number],
    iconAnchor:  [60, 50]  as [number, number],
    popupAnchor: [0, -52]  as [number, number],
    html: buildingPinHTML(b.name, b.hasData, selected, dimmed),
  });
}

// ── 내 위치 아이콘 ────────────────────────────────────────────
const myLocationIcon = L.divIcon({
  className:  "",
  iconSize:   [28, 28] as [number, number],
  iconAnchor: [14, 14] as [number, number],
  html: `<div style="${counterRot};width:28px;height:28px;background:#0071e3;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(49,130,246,.2),0 2px 8px rgba(0,0,0,.3)"></div>`,
});

// ── FlyTo ─────────────────────────────────────────────────────
function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, 16, { duration: 1.2 }); }, [pos, map]);
  return null;
}

// 지도 컨테이너에 --cbearing 변수 노출 (마커 일괄 역회전용)
function BearingVar({ bearing }: { bearing: number }) {
  const map = useMap();
  useEffect(() => {
    map.getContainer().style.setProperty("--cbearing", `${bearing}deg`);
  }, [map, bearing]);
  return null;
}

// ── 데스크탑/수동 회전 (deviceorientation 없을 때 Shift+드래그) ─
function ManualRotate({
  active,
  bearingRef,
  onBearing,
}: {
  active: boolean;
  bearingRef: React.MutableRefObject<number>;
  onBearing: (b: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    let dragging = false;
    let startAngle = 0;
    let startBearing = 0;

    const center = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const angleAt = (x: number, y: number) => {
      const c = center();
      return (Math.atan2(y - c.y, x - c.x) * 180) / Math.PI;
    };

    const down = (e: PointerEvent) => {
      if (!active && !e.shiftKey) return;
      dragging = true;
      startAngle = angleAt(e.clientX, e.clientY);
      startBearing = bearingRef.current;
      map.dragging.disable();
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const d = angleAt(e.clientX, e.clientY) - startAngle;
      onBearing(((startBearing - d) % 360 + 360) % 360);
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      map.dragging.enable();
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [map, active, bearingRef, onBearing]);

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
  photos?: DirectionPhotos;
}

interface Props {
  buildings:        NearbyBuilding[];
  selectedId:       string | null;
  onSelect:         (id: string) => void;
  dimmedIds:        Set<string>;
  onBearingChange?: (bearing: number) => void;
}

// deviceorientation 이벤트 → 나침반 heading(0~360, 북=0, 시계방향)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function headingFromEvent(e: any): number | null {
  if (typeof e.webkitCompassHeading === "number") {
    return ((e.webkitCompassHeading % 360) + 360) % 360;
  }
  if (typeof e.alpha === "number") {
    let h = 360 - e.alpha;
    const so =
      (typeof screen !== "undefined" && screen.orientation && screen.orientation.angle) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).orientation as number) ||
      0;
    h = (h + so) % 360;
    return (h + 360) % 360;
  }
  return null;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function StoreMapView({
  buildings,
  selectedId,
  onSelect,
  dimmedIds,
  onBearingChange,
}: Props) {
  const [myPos,    setMyPos]    = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTo,    setFlyTo]    = useState<[number, number] | null>(null);

  const [bearing, setBearingState] = useState(0);
  const [mode, setMode] = useState<"north" | "follow" | "manual">("north");
  const bearingRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastTick = useRef(0);

  const center: [number, number] = [37.593, 126.710];

  // bearing 갱신 (100ms throttle)
  function setBearing(b: number, immediate = false) {
    const v = ((b % 360) + 360) % 360;
    bearingRef.current = v;
    const now = Date.now();
    if (!immediate && now - lastTick.current < 100) return;
    lastTick.current = now;
    setBearingState(v);
    onBearingChange?.(v);
  }

  // 시각 회전: 래퍼 div를 -bearing 만큼 회전 (마커는 CSS 변수로 역보정)
  useEffect(() => {
    if (wrapRef.current) {
      wrapRef.current.style.transform = `rotate(${-bearing}deg)`;
    }
  }, [bearing]);

  const dir = useMemo(() => bearingToDir(bearing), [bearing]);

  // dir / 선택 / dimmed 변경 시에만 마커 아이콘 재생성
  const markers = useMemo(
    () =>
      buildings.map(b => (
        <Marker
          key={b.id}
          position={[b.lat, b.lng]}
          icon={buildingMarkerIcon(b, selectedId === b.id, dimmedIds.has(b.id), dir)}
          eventHandlers={{ click: () => onSelect(b.id) }}
        />
      )),
    [buildings, selectedId, dimmedIds, dir, onSelect],
  );

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

  // deviceorientation 구독 (follow 모드)
  useEffect(() => {
    if (mode !== "follow") return;
    let gotEvent = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = (ev: any) => {
      gotEvent = true;
      const h = headingFromEvent(ev);
      if (h != null) setBearing(h);
    };
    window.addEventListener("deviceorientationabsolute", wrapped, true);
    window.addEventListener("deviceorientation", wrapped, true);

    // 1.8초 내 이벤트 없으면 수동 모드로 폴백 (데스크탑 등)
    const fb = window.setTimeout(() => {
      if (!gotEvent) setMode("manual");
    }, 1800);

    return () => {
      window.clearTimeout(fb);
      window.removeEventListener("deviceorientationabsolute", wrapped, true);
      window.removeEventListener("deviceorientation", wrapped, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 나침반 버튼 탭
  async function toggleCompass() {
    if (mode !== "north") {
      setMode("north");
      setBearing(0, true);
      return;
    }
    // iOS 13+ 권한 요청
    const DOE = typeof window !== "undefined"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? ((window as any).DeviceOrientationEvent as any)
      : undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        if (res !== "granted") { setMode("manual"); return; }
      } catch { setMode("manual"); return; }
    }
    setMode(typeof window !== "undefined" && "DeviceOrientationEvent" in window ? "follow" : "manual");
  }

  const compassActive = mode !== "north";

  return (
    <div className="w-full h-full overflow-hidden"
      style={{ position: "relative", isolation: "isolate" }}>

      {/* 회전 래퍼: 코너 노출 방지를 위해 뷰포트보다 크게 */}
      <div
        ref={wrapRef}
        style={{
          position: "absolute",
          inset: "-22%",
          transformOrigin: "center center",
          transition: "transform .25s ease",
          willChange: "transform",
        }}
      >
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

          {markers}

          {myPos && <Marker position={myPos} icon={myLocationIcon} />}
          {flyTo && <FlyTo pos={flyTo} />}

          <BearingVar bearing={bearing} />
          <ManualRotate active={mode === "manual"} bearingRef={bearingRef} onBearing={(b) => setBearing(b)} />
        </MapContainer>
      </div>

      {/* 나침반 버튼 (내 위치 버튼 위) */}
      <button
        onClick={toggleCompass}
        title={compassActive ? "북쪽으로 정렬" : "나침반 회전"}
        style={{
          position: "absolute",
          bottom: 134,
          right: 16,
          zIndex: 1000,
          width: 46,
          height: 46,
          background: "white",
          border: compassActive ? "2px solid #0071e3" : "1.5px solid #d2d2d7",
          borderRadius: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <div style={{
          transform: `rotate(${bearing}deg)`,
          transition: "transform .12s linear",
          display: "flex",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <polygon points="12,3 8.5,13 12,11 15.5,13"
              fill={compassActive ? "#F04452" : "#6e6e73"} />
            <polygon points="12,21 8.5,11 12,13 15.5,11"
              fill={compassActive ? "#0071e3" : "#c7c7cc"} />
            <circle cx="12" cy="12" r="1.6" fill="#1d1d1f" />
          </svg>
        </div>
        {compassActive && (
          <span style={{
            position: "absolute", top: 3, right: 5,
            fontSize: 8, fontWeight: 800, color: "#F04452",
          }}>N</span>
        )}
      </button>

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
