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
