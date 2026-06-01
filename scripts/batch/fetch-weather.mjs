#!/usr/bin/env node
/**
 * fetch-weather.mjs — 기상청 API → Supabase weather_cache 저장
 * 30분마다 GitHub Actions에서 실행
 *
 * 환경변수:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   DATA_GO_KR_API_KEY (기상청 API 키)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const KMA_KEY      = process.env.DATA_GO_KR_API_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY 환경변수 필요');
  process.exit(1);
}

// ── 기상청 격자 (검단신도시) ──────────────────────────────────
const NX = 54;
const NY = 124;

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function kmaWeather(sky, pty) {
  if (pty === 1 || pty === 5) return { label: '비',       emoji: '🌧️' };
  if (pty === 2 || pty === 6) return { label: '비/눈',   emoji: '🌨️' };
  if (pty === 3 || pty === 7) return { label: '눈',       emoji: '❄️'  };
  if (pty === 4)               return { label: '소나기',  emoji: '🌦️' };
  if (sky === 1) return { label: '맑음',       emoji: '☀️'  };
  if (sky === 3) return { label: '구름 많음',  emoji: '⛅'  };
  if (sky === 4) return { label: '흐림',       emoji: '☁️'  };
  return { label: '맑음', emoji: '☀️' };
}

function pmLabel(v, type) {
  if (v == null) return '';
  if (type === 'pm10') {
    if (v <= 30) return '좋음'; if (v <= 80) return '보통';
    if (v <= 150) return '나쁨'; return '매우나쁨';
  }
  if (v <= 15) return '좋음'; if (v <= 35) return '보통';
  if (v <= 75) return '나쁨'; return '매우나쁨';
}

// 기상청 base_time 계산
function getNcstBaseTime(now) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  let h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  if (m < 40) h = (h - 1 + 24) % 24;
  const baseDate = m < 40 && h === 23
    ? new Date(kst.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '')
    : kst.toISOString().slice(0, 10).replace(/-/g, '');
  return { baseDate, baseTime: String(h).padStart(2, '0') + '40' };
}

function getFcstBaseTime(now) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const h = kst.getUTCHours();
  const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseH = BASE_HOURS.filter(bh => bh <= h).pop() ?? 23;
  let dateStr = kst.toISOString().slice(0, 10).replace(/-/g, '');
  if (baseH === 23 && h < 23) {
    const prev = new Date(kst.getTime() - 24 * 3600 * 1000);
    dateStr = prev.toISOString().slice(0, 10).replace(/-/g, '');
    baseH = 23;
  }
  return { baseDate: dateStr, baseTime: String(baseH).padStart(2, '0') + '00' };
}

async function fetchKMA() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const todayKST = kst.toISOString().slice(0, 10).replace(/-/g, '');
  const nowH = kst.getUTCHours();

  const { baseDate: ncstDate, baseTime: ncstTime } = getNcstBaseTime(now);
  const { baseDate: fcstDate, baseTime: fcstTime } = getFcstBaseTime(now);

  const base = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';
  const p = extra => new URLSearchParams({
    serviceKey: KMA_KEY, dataType: 'JSON', numOfRows: '500', pageNo: '1',
    nx: String(NX), ny: String(NY), ...extra,
  }).toString();

  const [ncstRes, fcstRes, airRes] = await Promise.all([
    fetch(`${base}/getUltraSrtNcst?${p({ base_date: ncstDate, base_time: ncstTime })}`),
    fetch(`${base}/getVilageFcst?${p({ base_date: fcstDate, base_time: fcstTime })}`),
    fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5'),
  ]);

  if (!ncstRes.ok || !fcstRes.ok) throw new Error(`기상청 HTTP ${ncstRes.status}/${fcstRes.status}`);

  const ncst = await ncstRes.json();
  const fcst = await fcstRes.json();
  const air  = airRes.ok ? await airRes.json() : null;

  const ncstItems = ncst?.response?.body?.items?.item ?? [];
  const get = cat => parseFloat(ncstItems.find(i => i.category === cat)?.obsrValue ?? '0');

  const temp      = Math.round(get('T1H'));
  const humidity  = Math.round(get('REH'));
  const windSpeed = Math.round(get('WSD'));
  const sky       = Math.round(get('SKY'));
  const pty       = Math.round(get('PTY'));
  const { label, emoji } = kmaWeather(sky, pty);

  const fcstItems = fcst?.response?.body?.items?.item ?? [];

  // 시간별 예보
  const hourlyMap = new Map();
  for (const item of fcstItems) {
    if (item.fcstDate !== todayKST) continue;
    const h = parseInt(item.fcstTime.slice(0, 2), 10);
    if (h < nowH) continue;
    const cur = hourlyMap.get(item.fcstTime) ?? { sky: 1, pty: 0, tmp: temp };
    if (item.category === 'SKY') cur.sky = parseInt(item.fcstValue, 10);
    if (item.category === 'PTY') cur.pty = parseInt(item.fcstValue, 10);
    if (item.category === 'TMP') cur.tmp = Math.round(parseFloat(item.fcstValue));
    hourlyMap.set(item.fcstTime, cur);
  }
  const hourly = Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)
    .map(([time, v]) => ({ hour: time.slice(0, 2) + ':00', temp: v.tmp, emoji: kmaWeather(v.sky, v.pty).emoji }));

  // 일별 예보
  const dailyMap = new Map();
  for (const item of fcstItems) {
    const d = item.fcstDate;
    const cur = dailyMap.get(d) ?? { sky: [], pty: [], tmx: -99, tmn: 99, pcp: 0 };
    if (item.category === 'SKY') cur.sky.push(parseInt(item.fcstValue, 10));
    if (item.category === 'PTY') cur.pty.push(parseInt(item.fcstValue, 10));
    if (item.category === 'TMX') cur.tmx = Math.round(parseFloat(item.fcstValue));
    if (item.category === 'TMN') cur.tmn = Math.round(parseFloat(item.fcstValue));
    if (item.category === 'PCP' && item.fcstValue !== '강수없음')
      cur.pcp += parseFloat(item.fcstValue.replace('mm', '')) || 0;
    dailyMap.set(d, cur);
  }
  const todayData = dailyMap.get(todayKST);
  const high = todayData?.tmx !== -99 ? todayData?.tmx ?? temp : temp;
  const low  = todayData?.tmn !== 99  ? todayData?.tmn ?? temp : temp;

  const weekly = Array.from(dailyMap.entries())
    .filter(([d]) => d >= todayKST)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 7)
    .map(([dateStr, v]) => {
      const d2 = new Date(`${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}T00:00:00+09:00`);
      const mainSky = v.sky.length > 0 ? Math.round(v.sky.reduce((a, b) => a + b, 0) / v.sky.length) : 1;
      const mainPty = v.pty.find(p => p > 0) ?? 0;
      return {
        date: `${d2.getMonth()+1}/${d2.getDate()}`,
        dayLabel: DAY_KO[d2.getDay()],
        emoji: kmaWeather(mainSky, mainPty).emoji,
        high: v.tmx !== -99 ? v.tmx : temp,
        low:  v.tmn !== 99  ? v.tmn : temp,
        precipitation: Math.round(v.pcp),
        isToday: dateStr === todayKST,
      };
    });

  const pm10 = air?.current?.pm10 != null ? Math.round(air.current.pm10) : null;
  const pm25 = air?.current?.pm2_5 != null ? Math.round(air.current.pm2_5) : null;

  return {
    temp, feelsLike: temp,
    weatherCode: sky * 10 + pty,
    label, emoji, humidity, windSpeed, high, low, hourly,
    yesterdayTemp: null,
    weekly, pm10, pm25,
    pm10Label: pmLabel(pm10, 'pm10'),
    pm25Label: pmLabel(pm25, 'pm25'),
    source: '기상청',
    fetchedAt: new Date().toISOString(),
  };
}

// Open-Meteo 폴백
async function fetchOpenMeteo() {
  const WMO = { 0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'❄️',80:'🌦️',95:'⛈️' };
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.5446&longitude=126.6861&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FSeoul&forecast_days=7&past_days=1';
  const [res, airRes] = await Promise.all([
    fetch(url),
    fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5'),
  ]);
  if (!res.ok) throw new Error('Open-Meteo 실패');
  const d = await res.json();
  const air = airRes.ok ? await airRes.json() : null;
  const code = d.current.weather_code;
  const nowH = new Date().getHours();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = d.daily.time.findIndex(t => t === todayStr);
  const pm10 = air?.current?.pm10 != null ? Math.round(air.current.pm10) : null;
  const pm25 = air?.current?.pm2_5 != null ? Math.round(air.current.pm2_5) : null;
  const hourly = d.hourly.time
    .map((t, i) => ({ t, temp: Math.round(d.hourly.temperature_2m[i]), code: d.hourly.weather_code[i] }))
    .filter(h => h.t.startsWith(todayStr) && new Date(h.t).getHours() >= nowH)
    .slice(0, 6).map(h => ({ hour: h.t.slice(11, 16), temp: h.temp, emoji: WMO[h.code] ?? '🌡️' }));
  const weekly = d.daily.time
    .map((date, i) => {
      const d2 = new Date(date + 'T00:00:00');
      return { date: `${d2.getMonth()+1}/${d2.getDate()}`, dayLabel: DAY_KO[d2.getDay()], emoji: WMO[d.daily.weather_code[i]] ?? '🌡️', high: Math.round(d.daily.temperature_2m_max[i]), low: Math.round(d.daily.temperature_2m_min[i]), precipitation: Math.round(d.daily.precipitation_sum[i]), isToday: date === todayStr };
    }).filter((_, i) => i >= todayIdx).slice(0, 7);
  return { temp: Math.round(d.current.temperature_2m), feelsLike: Math.round(d.current.apparent_temperature), weatherCode: code, label: '날씨', emoji: WMO[code] ?? '🌡️', humidity: Math.round(d.current.relative_humidity_2m), windSpeed: Math.round(d.current.wind_speed_10m), high: Math.round(d.daily.temperature_2m_max[todayIdx] ?? 0), low: Math.round(d.daily.temperature_2m_min[todayIdx] ?? 0), hourly, yesterdayTemp: null, weekly, pm10, pm25, pm10Label: pmLabel(pm10, 'pm10'), pm25Label: pmLabel(pm25, 'pm25'), source: 'Open-Meteo', fetchedAt: new Date().toISOString() };
}

// Supabase 저장
async function saveToSupabase(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/weather_cache`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ data, source: data.source, fetched_at: data.fetchedAt }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase 저장 실패: ${res.status} ${err}`);
  }
}

// 오래된 데이터 정리 (3일 이상)
async function cleanupOld() {
  const cutoff = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/weather_cache?fetched_at=lt.${cutoff}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
}

// ── 메인 ─────────────────────────────────────────────────────
console.log('🌤  날씨 데이터 수집 시작...');
const t0 = Date.now();

let data;
if (KMA_KEY) {
  try {
    data = await fetchKMA();
    console.log(`  ✓ 기상청: ${data.temp}°C ${data.emoji} ${data.label}`);
  } catch (e) {
    console.warn('  ⚠️  기상청 실패, Open-Meteo 폴백:', e.message);
    data = await fetchOpenMeteo();
    console.log(`  ✓ Open-Meteo: ${data.temp}°C`);
  }
} else {
  data = await fetchOpenMeteo();
  console.log(`  ✓ Open-Meteo (키 없음): ${data.temp}°C`);
}

await saveToSupabase(data);
await cleanupOld();

console.log(`✅ 완료 (${Date.now() - t0}ms): ${data.source} ${data.temp}°C ${data.emoji}`);
