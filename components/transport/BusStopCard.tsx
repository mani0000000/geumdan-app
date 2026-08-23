"use client";

import { useState } from "react";
import {
  Accessibility,
  Bus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Navigation,
  RefreshCw,
  Star,
  Zap,
} from "lucide-react";
import { formatBusDestination, type BusArrival } from "@/lib/api/bus";
import { busRouteTheme } from "@/lib/transport/bus-theme";

type BusStopCardProps = {
  stopName: string;
  distanceLabel?: string;
  contextLabel?: string;
  stationNo?: string;
  arrivals: BusArrival[];
  destinationFallbacks?: Record<string, string>;
  loading?: boolean;
  favorite?: boolean;
  compact?: boolean;
  expanded?: boolean;
  maxVisible?: number;
  onToggleFavorite?: () => void;
  onToggleExpanded?: () => void;
  onRefresh?: () => void;
  onSelectArrival?: (arrival: BusArrival) => void;
};

function usefulDestination(arrival: BusArrival, fallback?: string) {
  const formatted = formatBusDestination(arrival.destination);
  const normalized = formatted.replace(/\s/g, "");
  if (
    !normalized ||
    normalized === "종점" ||
    normalized === "운행중" ||
    normalized.includes("노선운행중") ||
    normalized.includes("실시간도착정보") ||
    normalized.includes("도착정보없음") ||
    normalized.includes("방향미상")
  ) {
    if (fallback) return formatBusDestination(fallback);
    return arrival.isScheduled ? "운행 노선" : "노선 운행 중";
  }
  return formatted;
}

function arrivalMeta(arrival: BusArrival) {
  if (arrival.isScheduled || arrival.arrivalMin < 0) {
    return { label: "배차 대기", sub: "접근 차량 없음", tone: "text-[#475467]", wash: "bg-[#F2F4F7]", node: "border-[#98A2B3]" };
  }
  if (arrival.arrivalMin <= 1) {
    return { label: "곧 도착", sub: "탑승 준비", tone: "text-[#E5484D]", wash: "bg-[#FFF1F1]", node: "border-[#E5484D]" };
  }
  if (arrival.arrivalMin <= 5) {
    return { label: `${arrival.arrivalMin}분`, sub: "도착 예정", tone: "text-[#F07A00]", wash: "bg-[#FFF7E8]", node: "border-[#F79009]" };
  }
  return { label: `${arrival.arrivalMin}분`, sub: "도착 예정", tone: "text-[#2563EB]", wash: "bg-[#F1F6FF]", node: "border-[#2563EB]" };
}

function BusArrivalRow({
  arrival,
  compact,
  destinationFallback,
  onSelect,
}: {
  arrival: BusArrival;
  compact: boolean;
  destinationFallback?: string;
  onSelect?: () => void;
}) {
  const meta = arrivalMeta(arrival);
  const routeTheme = busRouteTheme(arrival.routeNo);
  const routeLabel = arrival.isExpress
    ? arrival.routeNo.replace(/^급행\s*/u, "") || arrival.routeNo
    : arrival.routeNo;
  const position = arrival.isScheduled || arrival.arrivalMin < 0
    ? "현재 접근 중인 차량 없음"
    : arrival.remainingStops > 0
      ? `${arrival.remainingStops}정류장 전`
      : "정류장 진입";
  const progress = arrival.isScheduled || arrival.arrivalMin < 0
    ? 18
    : Math.max(14, Math.min(90, 100 - arrival.remainingStops * 8));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative grid w-full items-center text-left transition-colors active:bg-[#F8FAFC] ${
        compact
          ? "min-h-[76px] grid-cols-[56px_minmax(0,1fr)_76px] gap-3 px-3"
          : "min-h-[94px] grid-cols-[18px_64px_minmax(0,1fr)_70px] gap-2.5 px-4"
      }`}
    >
      {!compact && (
        <span className="relative flex h-full items-center justify-center" aria-hidden="true">
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#D7E1EF]" />
          <span className={`relative z-10 h-3.5 w-3.5 rounded-full border-[2.5px] bg-white ${meta.node}`} />
        </span>
      )}

      <span
        className={`flex shrink-0 flex-col items-center justify-center px-1 text-center text-white shadow-[0_7px_16px_rgba(15,23,42,0.12)] ${compact ? "h-12 rounded-[14px]" : "h-12 rounded-[13px]"}`}
        style={{ backgroundColor: routeTheme.color }}
      >
        <span className={`${routeLabel.length > 5 ? "text-[10px]" : compact ? "text-[14px]" : "text-[16px]"} font-black leading-none tracking-[-0.04em]`}>
          {routeLabel}
        </span>
        <span className="mt-1 text-[8px] font-extrabold leading-none text-white/75">{routeTheme.kind}</span>
      </span>

      <span className="min-w-0 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`truncate font-black tracking-[-0.03em] text-[#182230] ${compact ? "text-[12px]" : "text-[14px]"}`}>
            {usefulDestination(arrival, destinationFallback)}
          </span>
          {arrival.isExpress && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-[#FFC9B8] bg-[#FFF4EF] px-1.5 py-0.5 text-[9px] font-black text-[#D92D20]">
              <Zap size={8} /> 급행
            </span>
          )}
          {arrival.isLowFloor && <Accessibility size={13} className="shrink-0 text-[#2563EB]" aria-label="저상버스" />}
        </span>
        <span className="mt-1 block truncate text-[10px] font-semibold text-[#667085]">
          {position}{arrival.isLowFloor ? " · 저상" : ""}
        </span>
        {!compact && (
          <span className="mt-2 flex items-center gap-1.5" aria-hidden="true">
            <Bus size={11} className="shrink-0" style={{ color: routeTheme.color }} />
            <span className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E4E7EC]">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, backgroundColor: routeTheme.color }} />
            </span>
          </span>
        )}
      </span>

      <span className={`flex flex-col items-end justify-center px-2 ${compact ? `min-h-[54px] rounded-[15px] border border-black/[0.035] ${meta.wash}` : "min-h-[58px]"}`}>
        <span className={`whitespace-nowrap font-black tracking-[-0.055em] ${meta.tone} ${compact ? "text-[16px]" : "text-[22px]"}`}>{meta.label}</span>
        <span className="mt-0.5 whitespace-nowrap text-[9px] font-semibold text-[#98A2B3]">{meta.sub}</span>
      </span>
    </button>
  );
}

export function BusStopCard({
  stopName,
  distanceLabel,
  contextLabel,
  stationNo,
  arrivals,
  destinationFallbacks,
  loading = false,
  favorite = false,
  compact = false,
  expanded,
  maxVisible = 2,
  onToggleFavorite,
  onToggleExpanded,
  onRefresh,
  onSelectArrival,
}: BusStopCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expanded ?? internalExpanded;
  const visible = isExpanded ? arrivals : arrivals.slice(0, maxVisible);
  const hasLiveArrivals = arrivals.some(arrival => !arrival.isScheduled && arrival.arrivalMin >= 0);
  const canExpand = arrivals.length > maxVisible;
  const toggleExpanded = () => {
    if (onToggleExpanded) onToggleExpanded();
    else setInternalExpanded(value => !value);
  };

  return (
    <article className={`overflow-hidden bg-white ${compact ? "rounded-[22px] border border-[#E6EAF0] shadow-[0_8px_24px_rgba(15,23,42,0.055)]" : "rounded-[24px] border border-[#DFE5EE] shadow-[0_12px_30px_rgba(15,23,42,0.065)]"}`}>
      <header className={`flex items-center gap-3 ${compact ? "px-3.5 py-3" : "px-4 py-4"}`}>
        <span className={`flex shrink-0 items-center justify-center rounded-[15px] bg-[#EEF4FF] text-[#2563EB] ${compact ? "h-10 w-10" : "h-12 w-12"}`}>
          <Bus size={compact ? 18 : 21} strokeWidth={2.3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-black tracking-[-0.04em] text-[#182230] ${compact ? "text-[15px]" : "text-[18px]"}`}>{stopName}</span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#667085]">
            <Navigation size={10} className="shrink-0 text-[#2563EB]" />
            {distanceLabel && <span className="shrink-0 font-black text-[#2563EB]">{distanceLabel}</span>}
            {!compact && contextLabel && <span className="truncate">{contextLabel}</span>}
            {!compact && stationNo && <span className="truncate">정류장 {stationNo}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {onRefresh && (
            <button type="button" onClick={onRefresh} disabled={loading} className="rounded-full p-2 text-[#98A2B3] active:bg-[#F2F4F7]" aria-label={`${stopName} 새로고침`}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          )}
          {onToggleFavorite && (
            <button type="button" onClick={onToggleFavorite} className="rounded-full p-2 active:bg-[#F2F4F7]" aria-label={`${stopName} 즐겨찾기 ${favorite ? "해제" : "추가"}`}>
              <Star size={19} className={favorite ? "fill-[#FFB800] text-[#FFB800]" : "text-[#98A2B3]"} />
            </button>
          )}
        </span>
      </header>

      <div className="mx-4 border-t border-[#EAECF0]" />
      <div className={`flex items-center gap-2 px-4 ${compact ? "py-2.5" : "py-3"}`}>
        <Clock3 size={compact ? 17 : 19} className="shrink-0 text-[#F79009]" />
        <span className={`font-black tracking-[-0.035em] text-[#182230] ${compact ? "text-[13px]" : "text-[16px]"}`}>{hasLiveArrivals ? (compact ? "도착 예정" : "곧 오는 버스") : "이 정류장 운행 노선"}</span>
        <span className="text-[11px] font-semibold text-[#98A2B3]">{arrivals.length}개 노선</span>
        {canExpand && (
          <span className="ml-auto text-[10px] font-bold text-[#98A2B3]">
            {isExpanded ? `전체 ${arrivals.length}개` : `우선 ${Math.min(maxVisible, arrivals.length)}개`}
          </span>
        )}
      </div>

      <div className={`mx-3 overflow-hidden rounded-[18px] border border-[#EEF1F5] bg-white transition-[max-height] duration-300 ease-out ${canExpand ? "" : "mb-4"}`}>
        {loading ? (
          <div className="divide-y divide-[#EAECF0]">
            {[0, 1, 2].slice(0, compact ? 2 : 3).map(index => (
              <div key={index} className={`grid animate-pulse items-center gap-2.5 px-4 ${compact ? "min-h-[76px] grid-cols-[56px_minmax(0,1fr)_76px]" : "min-h-[94px] grid-cols-[18px_64px_minmax(0,1fr)_70px]"}`}>
                {!compact && <span className="h-3 w-3 rounded-full bg-[#DCE7FA]" />}
                <span className={`${compact ? "h-12 rounded-[13px]" : "h-10 rounded-[11px]"} bg-[#E4EBF6]`} />
                <span className="space-y-2"><span className="block h-3 w-3/4 rounded bg-[#E9EDF3]" /><span className="block h-2 w-full rounded bg-[#F0F2F5]" /></span>
                <span className="h-14 rounded-[15px] bg-[#EEF2F7]" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex min-h-[112px] flex-col items-center justify-center px-4 text-center">
            <span className="text-[13px] font-bold text-[#667085]">운행 정보를 확인하고 있어요</span>
            <span className="mt-1 text-[11px] text-[#98A2B3]">잠시 후 다시 갱신해 주세요</span>
          </div>
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {visible.map((arrival, index) => (
              <BusArrivalRow
                key={`${arrival.routeId}-${arrival.routeNo}-${index}`}
                arrival={arrival}
                compact={compact}
                destinationFallback={destinationFallbacks?.[arrival.routeNo]}
                onSelect={() => onSelectArrival?.(arrival)}
              />
            ))}
          </div>
        )}
      </div>

      {canExpand && (
        <div className="px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[13px] border border-[#DCE4F0] bg-[#F8FAFD] text-[12px] font-extrabold text-[#2563EB] transition-colors active:bg-[#EEF4FF]"
          >
            {isExpanded ? (
              <>
                접기
                <ChevronUp size={15} />
              </>
            ) : (
              <>
                나머지 {arrivals.length - maxVisible}개 노선 더보기
                <ChevronDown size={15} />
              </>
            )}
          </button>
        </div>
      )}
    </article>
  );
}

export function NearbyBusStopCard({
  stopName,
  distanceLabel,
  stationNo,
  routeCount,
  nextArrival,
  selected = false,
  onClick,
}: {
  stopName: string;
  distanceLabel: string;
  stationNo?: string;
  routeCount: number;
  nextArrival?: BusArrival;
  selected?: boolean;
  onClick: () => void;
}) {
  const next = nextArrival ? arrivalMeta(nextArrival) : null;
  const routeTheme = nextArrival ? busRouteTheme(nextArrival.routeNo) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[82px] w-full items-center gap-3 rounded-[18px] border px-3.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition-all active:scale-[0.99] ${selected ? "border-[#8CB4FF] bg-[#F3F7FF] ring-2 ring-[#2563EB]/10" : "border-[#DFE5EE] bg-white"}`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
        style={{ backgroundColor: routeTheme?.wash ?? "#EEF4FF", color: routeTheme?.color ?? "#2563EB" }}
      >
        <Bus size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-black tracking-[-0.03em] text-[#182230]">{stopName}</span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-[#667085]">
          <Navigation size={9} className="shrink-0 text-[#2563EB]" />
          <span className="shrink-0 font-black text-[#2563EB]">{distanceLabel}</span>
          <span className="truncate">· 정류장 {stationNo ?? "확인 중"} · {routeCount}노선</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {nextArrival && routeTheme ? (
          <span
            className="rounded-full border px-2 py-1 text-[10px] font-black"
            style={{ borderColor: routeTheme.border, backgroundColor: routeTheme.wash, color: routeTheme.dark }}
          >
            {nextArrival.routeNo} · {routeTheme.kind}
          </span>
        ) : (
          <span className="rounded-full border border-[#DDE3EC] bg-white px-2 py-1 text-[10px] font-black text-[#667085]">{routeCount}개 노선</span>
        )}
        {next && <span className={`text-[13px] font-black tracking-[-0.04em] ${next.tone}`}>{next.label}</span>}
      </span>
      <ChevronRight size={16} className="shrink-0 text-[#98A2B3]" />
    </button>
  );
}
