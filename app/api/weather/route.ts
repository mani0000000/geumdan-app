// 기상청 단기예보 + 초단기실황 API 서버 프록시
// CORS 제한 우회: 클라이언트에서 직접 호출 불가 → 서버 라우트 경유
// 검단신도시 KMA 격자좌표: nx=56, ny=127
// API 키: DATA_GO_KR_API_KEY (환경변수)

import { NextResponse } from 'next/server';

const KMA_KEY = process.env.DATA_GO_KR_API_KEY;
const KMA_FCST = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
const AIR_BASE = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc';
const NX = 56;
const NY = 127;
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function skyPtyInfo(sky: number, pty: number): { label: string; emoji: string } {
  if (pty === 1) return { label: '비', emoji: '🌧️' };
  if (pty === 2) return { label: '비/눈', emoji: '🌨️' };
  if (pty === 3) return { label: '눈', emoji: '❄️' };
  if (pty === 4) return { label: '소나기', emoji: '🌦️' };
  if (sky === 1) return { label: '맑음', emoji: '☀️' };
  if (sky === 3) return { label: '구름많음', emoji: '⛅' };
  if (sky === 4) return { label: '흐림', emoji: '☁️' };
  return { label: '맑음', emoji: '☀️' };
}

// 체감온도 근사: 기온 + 바람(풍속) + 습도
function calcFeelsLike(temp: number, humidity: number, windMps: number): number {
  const windKph = windMps * 3.6;
  if (temp < 10 && windKph > 4.8) {
    // 바람체감
    const wc = 13.12 + 0.6215 * temp - 11.37 * Math.pow(windKph, 0.16) + 0.3965 * temp * Math.pow(windKph, 0.16);
    return Math.round(wc);
  }
  if (temp >= 27 && humidity >= 40) {
    // 열지수
    const hi = -8.78469 + 1.61139 * temp + 2.3385 * humidity
      - 0.14611 * temp * humidity - 0.012308 * temp * temp
      - 0.016424 * humidity * humidity + 0.002211 * temp * temp * humidity
      + 0.00072546 * temp * humidity * humidity
      - 3.582e-6 * temp * temp * humidity * humidity;
    return Math.round(hi);
  }
  return Math.round(temp);
}

// KST 현재시각 (UTC+9)
function kstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
function kstDateStr(d: Date): string {
  return (
    String(d.getUTCFullYear()) +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0')
  );
}

// 초단기실황 base_date/base_time (매시 40분 발표)
function getUltraBaseTime(): { baseDate: string; baseTime: string } {
  const kst = kstNow();
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  let baseH = m < 40 ? h - 1 : h;
  let dateKst = kst;
  if (baseH < 0) {
    baseH = 23;
    dateKst = new Date(kst.getTime() - 86400000);
  }
  return { baseDate: kstDateStr(dateKst), baseTime: String(baseH).padStart(2, '0') + '00' };
}

// 단기예보 base_date/base_time (02·05·08·11·14·17·20·23시 발표, 10분 지연)
function getFcstBaseTime(): { baseDate: string; baseTime: string } {
  const kst = kstNow();
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  const curMin = h * 60 + m;
  const HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseH = -1;
  for (let i = HOURS.length - 1; i >= 0; i--) {
    if (curMin >= HOURS[i] * 60 + 10) { baseH = HOURS[i]; break; }
  }
  let dateKst = kst;
  if (baseH < 0) { baseH = 23; dateKst = new Date(kst.getTime() - 86400000); }
  return { baseDate: kstDateStr(dateKst), baseTime: String(baseH).padStart(2, '0') + '00' };
}

// 기상청 초단기실황 (현재 기온/습도/풍속/강수형태)
async function fetchUltraRealtime(): Promise<{
  temp: number; humidity: number; windSpeed: number; pty: number;
} | null> {
  if (!KMA_KEY) return null;
  const { baseDate, baseTime } = getUltraBaseTime();
  const params = `pageNo=1&numOfRows=10&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${NX}&ny=${NY}`;
  try {
    const res = await fetch(
      `${KMA_FCST}/getUltraSrtNcst?serviceKey=${KMA_KEY}&${params}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.response?.body?.items?.item;
    if (!raw) return null;
    const items = Array.isArray(raw) ? raw : [raw];
    const map: Record<string, string> = {};
    for (const it of items) map[it.category] = it.obsrValue;
    return {
      temp: parseFloat(map.T1H ?? '0'),
      humidity: parseInt(map.REH ?? '50'),
      windSpeed: parseFloat(map.WSD ?? '0'),
      pty: parseInt(map.PTY ?? '0'),
    };
  } catch { return null; }
}

// 기상청 단기예보 (시간별/일별 예보 3일)
async function fetchShortFcst(): Promise<Array<{
  fcstDate: string; fcstTime: string; category: string; fcstValue: string;
}> | null> {
  if (!KMA_KEY) return null;
  const { baseDate, baseTime } = getFcstBaseTime();
  const params = `pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${NX}&ny=${NY}`;
  try {
    const res = await fetch(
      `${KMA_FCST}/getVilageFcst?serviceKey=${KMA_KEY}&${params}`,
      { cache: 'no-store', signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.response?.body?.items?.item;
    if (!raw) return null;
    return Array.isArray(raw) ? raw : [raw];
  } catch { return null; }
}

// 에어코리아 실시간 (인천 서구 PM10/PM2.5)
async function fetchAirKorea(): Promise<{ pm10: number | null; pm25: number | null }> {
  if (!KMA_KEY) return { pm10: null, pm25: null };
  const params = `returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent('인천')}&ver=1.0`;
  try {
    const res = await fetch(
      `${AIR_BASE}/getCtprvnRltmMesureDnsty?serviceKey=${KMA_KEY}&${params}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return { pm10: null, pm25: null };
    const json = await res.json();
    const items = json?.response?.body?.items as Array<{
      stationName: string; pm10Value: string; pm25Value: string;
    }> | undefined;
    if (!items || !Array.isArray(items)) return { pm10: null, pm25: null };
    // 인천 서구 측정소 우선 (가정동, 원창동, 신현동)
    const PREF = ['가정동', '원창동', '신현동', '서구'];
    const best = items.find(it => PREF.some(p => (it.stationName ?? '').includes(p))) ?? items[0];
    if (!best) return { pm10: null, pm25: null };
    const pm10v = parseInt(best.pm10Value);
    const pm25v = parseInt(best.pm25Value);
    return {
      pm10: isNaN(pm10v) ? null : pm10v,
      pm25: isNaN(pm25v) ? null : pm25v,
    };
  } catch { return { pm10: null, pm25: null }; }
}

// Open-Meteo 폴백 (기상청 API 키 없거나 실패 시)
async function fetchOpenMeteoFallback() {
  const url = [
    'https://api.open-meteo.com/v1/forecast',
    '?latitude=37.5446&longitude=126.6861',
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    '&hourly=temperature_2m,weather_code',
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    '&timezone=Asia%2FSeoul&forecast_days=7&past_days=1',
  ].join('');
  const airUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5';

  const [res, airRes] = await Promise.all([
    fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) }),
    fetch(airUrl, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).catch(() => null),
  ]);
  if (!res.ok) return null;
  const d = await res.json();
  const airJson = airRes?.ok ? await airRes.json().catch(() => null) : null;

  const WMO: Record<number, { label: string; emoji: string }> = {
    0: { label: '맑음', emoji: '☀️' }, 1: { label: '대체로 맑음', emoji: '🌤️' },
    2: { label: '구름 많음', emoji: '⛅' }, 3: { label: '흐림', emoji: '☁️' },
    45: { label: '안개', emoji: '🌫️' }, 48: { label: '안개', emoji: '🌫️' },
    51: { label: '이슬비', emoji: '🌦️' }, 61: { label: '가벼운 비', emoji: '🌧️' },
    63: { label: '비', emoji: '🌧️' }, 65: { label: '강한 비', emoji: '🌧️' },
    71: { label: '가벼운 눈', emoji: '🌨️' }, 73: { label: '눈', emoji: '❄️' },
    80: { label: '소나기', emoji: '🌦️' }, 95: { label: '뇌우', emoji: '⛈️' },
  };
  const wmo = (c: number) => WMO[c] ?? { label: '알 수 없음', emoji: '🌡️' };

  const kst = kstNow();
  const todayStr = kstDateStr(kst);
  const nowH = kst.getUTCHours();
  const code: number = d.current.weather_code;

  const yesterdayTemp: number | null =
    d.hourly?.temperature_2m?.[nowH] != null
      ? Math.round(d.hourly.temperature_2m[nowH] as number) : null;

  const hourly = (d.hourly.time as string[])
    .map((t: string, i: number) => ({ t, temp: Math.round(d.hourly.temperature_2m[i] as number), code: d.hourly.weather_code[i] as number }))
    .filter(h => h.t.startsWith(`${todayStr.slice(0,4)}-${todayStr.slice(4,6)}-${todayStr.slice(6,8)}`) && new Date(h.t).getHours() >= nowH)
    .slice(0, 6)
    .map(h => ({ hour: h.t.slice(11, 16), temp: h.temp, emoji: wmo(h.code).emoji }));

  const todayIdx = (d.daily.time as string[]).findIndex((t: string) => {
    const dd = new Date(t + 'T00:00:00+09:00');
    return (
      dd.getFullYear() === kst.getUTCFullYear() &&
      dd.getMonth() === kst.getUTCMonth() &&
      dd.getDate() === kst.getUTCDate()
    );
  });
  const high = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_max[todayIdx] as number) : 0;
  const low  = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_min[todayIdx] as number) : 0;

  const weekly = (d.daily.time as string[])
    .map((date: string, i: number) => {
      const d2 = new Date(date + 'T00:00:00+09:00');
      return {
        date: `${d2.getMonth() + 1}/${d2.getDate()}`,
        dayLabel: DAY_KO[d2.getDay()],
        emoji: wmo(d.daily.weather_code[i] as number).emoji,
        high: Math.round(d.daily.temperature_2m_max[i] as number),
        low: Math.round(d.daily.temperature_2m_min[i] as number),
        precipitation: Math.round(d.daily.precipitation_sum[i] as number),
        isToday: i === todayIdx,
      };
    })
    .filter((_, i) => i >= Math.max(0, todayIdx))
    .slice(0, 7);

  const pm10 = airJson?.current?.pm10 != null ? Math.round(airJson.current.pm10 as number) : null;
  const pm25 = airJson?.current?.pm2_5 != null ? Math.round(airJson.current.pm2_5 as number) : null;
  const pmLbl = (v: number | null, t: 'pm10' | 'pm25') => {
    if (v == null) return '';
    if (t === 'pm10') { if (v <= 30) return '좋음'; if (v <= 80) return '보통'; if (v <= 150) return '나쁨'; return '매우나쁨'; }
    if (v <= 15) return '좋음'; if (v <= 35) return '보통'; if (v <= 75) return '나쁨'; return '매우나쁨';
  };

  return {
    temp: Math.round(d.current.temperature_2m as number),
    feelsLike: Math.round(d.current.apparent_temperature as number),
    weatherCode: code,
    label: wmo(code).label,
    emoji: wmo(code).emoji,
    humidity: Math.round(d.current.relative_humidity_2m as number),
    windSpeed: Math.round(d.current.wind_speed_10m as number),
    high, low, hourly, yesterdayTemp, weekly,
    pm10, pm25, pm10Label: pmLbl(pm10, 'pm10'), pm25Label: pmLbl(pm25, 'pm25'),
    source: 'openmeteo',
  };
}

function pmLabel(v: number | null, type: 'pm10' | 'pm25'): string {
  if (v == null) return '';
  if (type === 'pm10') { if (v <= 30) return '좋음'; if (v <= 80) return '보통'; if (v <= 150) return '나쁨'; return '매우나쁨'; }
  if (v <= 15) return '좋음'; if (v <= 35) return '보통'; if (v <= 75) return '나쁨'; return '매우나쁨';
}

export async function GET() {
  const [realtime, fcstItems, air] = await Promise.all([
    fetchUltraRealtime(),
    fetchShortFcst(),
    fetchAirKorea(),
  ]);

  if (!realtime || !fcstItems || fcstItems.length === 0) {
    // 기상청 실패 → Open-Meteo 폴백
    try {
      const fallback = await fetchOpenMeteoFallback();
      if (fallback) return NextResponse.json(fallback);
    } catch { /* ignore */ }
    return NextResponse.json({ error: 'weather_unavailable' }, { status: 503 });
  }

  const kst = kstNow();
  const todayStr = kstDateStr(kst);
  const nowH = kst.getUTCHours();

  // 예보 데이터 구조화: date → time → {category: value}
  const fcstMap: Record<string, Record<string, Record<string, string>>> = {};
  for (const it of fcstItems) {
    if (!fcstMap[it.fcstDate]) fcstMap[it.fcstDate] = {};
    if (!fcstMap[it.fcstDate][it.fcstTime]) fcstMap[it.fcstDate][it.fcstTime] = {};
    fcstMap[it.fcstDate][it.fcstTime][it.category] = it.fcstValue;
  }

  // 오늘 최고/최저 기온 (TMX/TMN 또는 TMP 범위로)
  const todayTimes = fcstMap[todayStr] ?? {};
  let todayHigh = -999, todayLow = 999;
  for (const cats of Object.values(todayTimes)) {
    const tmx = parseFloat(cats.TMX ?? 'NaN');
    const tmn = parseFloat(cats.TMN ?? 'NaN');
    const tmp = parseFloat(cats.TMP ?? 'NaN');
    if (!isNaN(tmx) && tmx > todayHigh) todayHigh = tmx;
    if (!isNaN(tmn) && tmn < todayLow) todayLow = tmn;
    if (!isNaN(tmp)) { if (tmp > todayHigh) todayHigh = tmp; if (tmp < todayLow) todayLow = tmp; }
  }
  if (todayHigh === -999) todayHigh = realtime.temp;
  if (todayLow === 999) todayLow = realtime.temp;

  // 현재 시각 예보 SKY (실황 PTY가 더 정확)
  const nowTimeStr = String(nowH).padStart(2, '0') + '00';
  const currentFcst = todayTimes[nowTimeStr] ?? {};
  const sky = parseInt(currentFcst.SKY ?? '1');
  const pty = realtime.pty;
  const { label, emoji } = skyPtyInfo(sky, pty);

  // 시간별 예보 (현재 시각부터 6개)
  const allHours: { t: string; date: string; time: string; temp: number; sky: number; pty: number }[] = [];
  for (const [date, times] of Object.entries(fcstMap)) {
    for (const [time, cats] of Object.entries(times)) {
      const tmp = parseFloat(cats.TMP ?? 'NaN');
      if (isNaN(tmp)) continue;
      allHours.push({
        t: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}`,
        date, time,
        temp: Math.round(tmp),
        sky: parseInt(cats.SKY ?? '1'),
        pty: parseInt(cats.PTY ?? '0'),
      });
    }
  }
  allHours.sort((a, b) => a.t.localeCompare(b.t));

  const hourly = allHours
    .filter(h => (h.date === todayStr && parseInt(h.time.slice(0, 2)) >= nowH) || h.date > todayStr)
    .slice(0, 6)
    .map(h => ({ hour: h.time.slice(0, 2) + ':' + h.time.slice(2, 4), temp: h.temp, emoji: skyPtyInfo(h.sky, h.pty).emoji }));

  // 일별 예보 (오늘부터 3일)
  const sortedDates = [...new Set(Object.keys(fcstMap))].sort();
  const weekly = sortedDates
    .filter(d => d >= todayStr)
    .slice(0, 3)
    .map(date => {
      const times = fcstMap[date] ?? {};
      let high = -999, low = 999;
      let skySum = 0, skyCount = 0;
      let hasPty = false, domPty = 0, maxPop = 0;
      for (const cats of Object.values(times)) {
        const tmp = parseFloat(cats.TMP ?? 'NaN');
        if (!isNaN(tmp)) { if (tmp > high) high = tmp; if (tmp < low) low = tmp; }
        const tmx = parseFloat(cats.TMX ?? 'NaN');
        const tmn = parseFloat(cats.TMN ?? 'NaN');
        if (!isNaN(tmx) && tmx > high) high = tmx;
        if (!isNaN(tmn) && tmn < low) low = tmn;
        const sk = parseInt(cats.SKY ?? '0');
        if (sk > 0) { skySum += sk; skyCount++; }
        const pt = parseInt(cats.PTY ?? '0');
        if (pt > 0) { hasPty = true; domPty = pt; }
        const pop = parseInt(cats.POP ?? '0');
        if (pop > maxPop) maxPop = pop;
      }
      if (high === -999) high = realtime.temp;
      if (low === 999) low = realtime.temp;
      const avgSky = skyCount > 0 ? Math.round(skySum / skyCount) : 1;
      const info = skyPtyInfo(avgSky, hasPty ? domPty : 0);
      const d = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+09:00`);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        dayLabel: DAY_KO[d.getDay()],
        emoji: info.emoji,
        high: Math.round(high),
        low: Math.round(low),
        precipitation: maxPop,
        isToday: date === todayStr,
      };
    });

  return NextResponse.json({
    temp: Math.round(realtime.temp),
    feelsLike: calcFeelsLike(realtime.temp, realtime.humidity, realtime.windSpeed),
    weatherCode: pty > 0 ? (pty === 1 ? 61 : pty === 3 ? 73 : pty === 4 ? 80 : 71) : (sky === 1 ? 0 : sky === 3 ? 2 : 3),
    label,
    emoji,
    humidity: realtime.humidity,
    windSpeed: Math.round(realtime.windSpeed * 10) / 10,
    high: Math.round(todayHigh),
    low: Math.round(todayLow),
    hourly,
    yesterdayTemp: null,
    weekly,
    pm10: air.pm10,
    pm25: air.pm25,
    pm10Label: pmLabel(air.pm10, 'pm10'),
    pm25Label: pmLabel(air.pm25, 'pm25'),
    source: 'kma',
  });
}
