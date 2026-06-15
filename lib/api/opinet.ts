// 오피넷(OPINET) 좌표 유틸 — 서버 전용
//
// 오피넷 aroundAll.do 는 WGS84(위경도)가 아닌 KATEC 좌표계를 사용한다.
// 검단신도시 중심 좌표(WGS84)를 KATEC 으로 변환해 /api/gas 에서 사용한다.
// 변환식: Abridged Molodensky(WGS84→Bessel 1841 한국) + TM(KATEC) 정변환.

import { GEUMDAN_CENTER } from "@/lib/geumdan";

const D2R = Math.PI / 180;

const WGS_A = 6378137.0;
const WGS_F = 1 / 298.257223563;
const BES_A = 6377397.155;
const BES_F = 1 / 299.1528128;
const DX = -146.43;
const DY = 507.89;
const DZ = 681.46;

const K_LAT0 = 38.0 * D2R;
const K_LON0 = 128.0 * D2R;
const K_SCALE = 0.9999;
const K_FE = 400000.0;
const K_FN = 600000.0;

export function wgs84ToKatec(lat: number, lng: number): { x: number; y: number } {
  const phi = lat * D2R;
  const lam = lng * D2R;

  const a = WGS_A;
  const f = WGS_F;
  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);

  const da = BES_A - WGS_A;
  const df = BES_F - WGS_F;

  const sinp = Math.sin(phi);
  const cosp = Math.cos(phi);
  const sinl = Math.sin(lam);
  const cosl = Math.cos(lam);

  const Rn = a / Math.sqrt(1 - e2 * sinp * sinp);
  const Rm = (a * (1 - e2)) / Math.pow(1 - e2 * sinp * sinp, 1.5);

  const dphi =
    (-DX * sinp * cosl -
      DY * sinp * sinl +
      DZ * cosp +
      (da * (Rn * e2 * sinp * cosp)) / a +
      df * (Rm * (a / b) + Rn * (b / a)) * sinp * cosp) /
    Rm;
  const dlam = (-DX * sinl + DY * cosl) / (Rn * cosp);

  const bLat = phi + dphi;
  const bLon = lam + dlam;

  const ba = BES_A;
  const bb = ba * (1 - BES_F);
  const be2 = (ba * ba - bb * bb) / (ba * ba);
  const ep2 = (ba * ba - bb * bb) / (bb * bb);

  const sb = Math.sin(bLat);
  const cb = Math.cos(bLat);
  const tb = Math.tan(bLat);

  const N = ba / Math.sqrt(1 - be2 * sb * sb);
  const T = tb * tb;
  const C = ep2 * cb * cb;
  const A = cb * (bLon - K_LON0);

  const e = be2;
  const mer = (p: number) =>
    ba *
    ((1 - e / 4 - (3 * e * e) / 64 - (5 * e * e * e) / 256) * p -
      ((3 * e) / 8 + (3 * e * e) / 32 + (45 * e * e * e) / 1024) *
        Math.sin(2 * p) +
      ((15 * e * e) / 256 + (45 * e * e * e) / 1024) * Math.sin(4 * p) -
      ((35 * e * e * e) / 3072) * Math.sin(6 * p));
  const M = mer(bLat);
  const M0 = mer(K_LAT0);

  const x =
    K_FE +
    K_SCALE *
      N *
      (A +
        ((1 - T + C) * A * A * A) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120);
  const y =
    K_FN +
    K_SCALE *
      (M -
        M0 +
        N *
          tb *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) /
              720));

  return { x: Math.round(x), y: Math.round(y) };
}

export const GEUMDAN_KATEC = wgs84ToKatec(
  GEUMDAN_CENTER.lat,
  GEUMDAN_CENTER.lng,
);

/**
 * KATEC → WGS84 역변환
 * 정역방향(wgs84ToKatec)의 역연산: 역 TM 투영 + 역 Molodensky
 */
export function katecToWgs84(kx: number, ky: number): { lat: number; lng: number } | null {
  if (!kx || !ky || kx < 100000 || kx > 700000 || ky < 200000 || ky > 1000000) return null;

  const a = BES_A, f = BES_F;
  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const ep2 = (a * a - b * b) / (b * b);

  // 역 TM: (kx,ky) → Bessel (bLat, bLon)
  const x1 = (kx - K_FE) / K_SCALE;
  const y1 = (ky - K_FN) / K_SCALE;

  const c0 = 1 - e2/4 - 3*e2**2/64 - 5*e2**3/256;
  const c2 = 3*e2/8 + 3*e2**2/32 + 45*e2**3/1024;
  const c4 = 15*e2**2/256 + 45*e2**3/1024;
  const c6 = 35*e2**3/3072;
  const M0 = a * (c0*K_LAT0 - c2*Math.sin(2*K_LAT0) + c4*Math.sin(4*K_LAT0) - c6*Math.sin(6*K_LAT0));

  const M1 = M0 + y1;
  const mu = M1 / (a * c0);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3*e1/2 - 27*e1**3/32) * Math.sin(2*mu)
    + (21*e1**2/16 - 55*e1**4/32) * Math.sin(4*mu)
    + (151*e1**3/96) * Math.sin(6*mu)
    + (1097*e1**4/512) * Math.sin(8*mu);

  const sp1 = Math.sin(phi1), cp1 = Math.cos(phi1), tp1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sp1 * sp1);
  const T1 = tp1 * tp1;
  const C1 = ep2 * cp1 * cp1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sp1 * sp1, 1.5);
  const D = x1 / N1;

  const bLat = phi1 - (N1 * tp1 / R1) * (
    D**2/2
    - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*ep2) * D**4 / 24
    + (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*ep2 - 3*C1**2) * D**6 / 720
  );
  const bLon = K_LON0 + (
    D - (1 + 2*T1 + C1) * D**3 / 6
    + (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*ep2 + 24*T1**2) * D**5 / 120
  ) / cp1;

  // 역 Molodensky: Bessel → WGS84 (역방향 이동량)
  const sb = Math.sin(bLat), cb = Math.cos(bLat);
  const sl = Math.sin(bLon), cl = Math.cos(bLon);
  const Rn2 = a / Math.sqrt(1 - e2 * sb * sb);
  const Rm2 = a * (1 - e2) / Math.pow(1 - e2 * sb * sb, 1.5);

  const iDX = -DX; // 146.43
  const iDY = -DY; // -507.89
  const iDZ = -DZ; // -681.46
  const iDa = WGS_A - BES_A;
  const iDf = WGS_F - BES_F;

  const dphi = (
    -iDX * sb * cl - iDY * sb * sl + iDZ * cb
    + iDa * (Rn2 * e2 * sb * cb) / a
    + iDf * (Rm2 * (a / b) + Rn2 * (b / a)) * sb * cb
  ) / Rm2;
  const dlam = (-iDX * sl + iDY * cl) / (Rn2 * cb);

  const lat = (bLat + dphi) / D2R;
  const lng = (bLon + dlam) / D2R;
  if (lat < 33 || lat > 41 || lng < 124 || lng > 131) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// 검단+김포 커버를 위한 다중 검색 중심점 (WGS84)
export const SCAN_CENTERS = [
  { lat: 37.545, lng: 126.686, label: "인천 서구(구검단)" },
  { lat: 37.593, lng: 126.712, label: "검단신도시(신)" },
  { lat: 37.620, lng: 126.718, label: "김포시" },
] as const;
