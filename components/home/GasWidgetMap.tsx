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

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, 15, { duration: 0.8 }); }, [pos, map]);
  return null;
}

function gasIcon(s: GasStation, selected: boolean): L.DivIcon {
  const price = s.prices.gasoline;
  const bg    = selected ? s.brandColor : "white";
  const fg    = selected ? "white" : s.brandColor;
  const bd    = selected ? s.brandColor : "#d2d2d7";
  const shadow = selected
    ? `0 3px 12px ${s.brandColor}55,0 1px 4px rgba(0,0,0,.25)`
    : "0 1px 6px rgba(0,0,0,.15)";

  return L.divIcon({
    className:   "",
    iconSize:    [58, 48] as [number, number],
    iconAnchor:  [29, 48] as [number, number],
    html: `
<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
  <div style="background:${bg};border:1.5px solid ${bd};border-radius:10px;padding:3px 7px 2px;box-shadow:${shadow};text-align:center;min-width:48px">
    <div style="font-size:14px;line-height:1.1">⛽</div>
    <div style="font-size:8.5px;font-weight:800;color:${fg};white-space:nowrap">${s.brandShort}</div>
    ${price != null
      ? `<div style="font-size:9.5px;font-weight:900;color:${selected ? "rgba(255,255,255,.92)" : "#DC2626"};white-space:nowrap">${price.toLocaleString()}</div>`
      : `<div style="font-size:8px;color:${selected ? "rgba(255,255,255,.5)" : "#c7c7cc"}">—</div>`
    }
  </div>
  <div style="width:2px;height:5px;background:${bd}"></div>
</div>`,
  });
}

const myIcon = L.divIcon({
  className:  "",
  iconSize:   [22, 22] as [number, number],
  iconAnchor: [11, 11] as [number, number],
  html: `<div style="width:22px;height:22px;background:#3182F6;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 5px rgba(49,130,246,.18),0 2px 6px rgba(0,0,0,.25)"></div>`,
});

interface Props {
  stations:   GasStation[];
  selectedId: string | null;
  onSelect:   (s: GasStation) => void;
  myPos?:     [number, number] | null;
  flyTo?:     [number, number] | null;
}

export default function GasWidgetMap({ stations, selectedId, onSelect, myPos, flyTo }: Props) {
  const center: [number, number] = [37.5480, 126.6720];

  return (
    <div className="w-full h-full overflow-hidden" style={{ position: "relative", isolation: "isolate" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <ZoomControl position="bottomleft" />

        {stations.map(s => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={gasIcon(s, selectedId === s.id)}
            eventHandlers={{ click: () => onSelect(s) }}
          />
        ))}

        {myPos && <Marker position={myPos} icon={myIcon} />}
        {flyTo  && <FlyTo pos={flyTo} />}
      </MapContainer>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
