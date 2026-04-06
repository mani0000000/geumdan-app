// 기상청 단기예보 + 초단기실황 API (data.go.kr)
// 키: NEXT_PUBLIC_BUS_API_KEY (동일한 data.go.kr 인증키)
// 검단신도시 격자 좌표: nx=54, ny=124 (인천 서구 당하동)
// fallback: Open-Meteo

const API_KEY = process.env.NEXT_PUBLIC_BUS_API_KEY ?? "";
const NX = 54;
const NY = 124;
const BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

export interface WeeklyDay {
  date: string;       // "03/29"
  dayLabel: string;   // "토"
  emoji: string;
  high: number;
  low: number;
  precipitation: number; // mm
  isToday: boolean;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  weatherCode: number;
  label: string;
  emoji: string;
  humidity: number;
  windSpeed: number;
  high: number;
  low: number;
  hourly: { hour: string; temp: number; emoji: string }[];
  yesterdayTemp: number | null;
  weekly: WeeklyDay[];
  pm10?: number | null;   // 미세먼지 µg/m³
  pm25?: number | null;   // 초미세먼지 µg/m³
  pm10Label?: string;
  pm25Label?: string;
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

// 강수형태(PTY) + 하늘상태(SKY) → label/emoji/weatherCode
function ptyToWeather(pty: number, sky: number): { label: string; emoji: string; code: number } {
  if (pty === 1) return { label: "비", emoji: "🌧️", code: 63 };
  if (pty === 2) return { label: "비/눈", emoji: "🌨️", code: 71 };
  if (pty === 3) return { label: "눈", emoji: "❄️", code: 73 };
  if (pty === 4) return { label: "소나기", emoji: "🌦️", code: 80 };
  if (pty === 5) return { label: "빗방울", emoji: "🌦️", code: 51 };
  if (pty === 6) return { label: "빗방울/눈날림", emoji: "🌨️", code: 71 };
  if (pty === 7) return { label: "눈날림", emoji: "🌨️", code: 71 };
  // 강수 없음 → 하늘상태
  if (sky === 1) return { label: "맑음", emoji: "☀️", code: 0 };
  if (sky === 3) return { label: "구름 많음", emoji: "⛅", code: 2 };
  if (sky === 4) return { label: "흐림", emoji: "☁️", code: 3 };
  return { label: "맑음", emoji: "☀️", code: 0 };
}

function pmLabel(value: number | null | undefined, type: "pm10" | "pm25"): string {
  if (value == null) return "";
  if (type === "pm10") {
    if (value <= 30) return "좋음";
    if (value <= 80) return "보통";
    if (value <= 150) return "나쁨";
    return "매우나쁨";
  } else {
    if (value <= 15) return "좋음";
    if (value <= 35) return "보통";
    if (value <= 75) return "나쁨";
    return "매우나쁨";
  }
}

// 기상청 단기예보 base_time: 0200/0500/0800/1100/1400/1700/2000/2300 중 최근 것
function getVilageBaseTime(): { date: string; time: string } {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 10); // 10분 lag
  const h = now.getHours();
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseH = baseTimes.filter(t => t <= h).pop() ?? 23;
  if (baseH === 23 && h < 2) {
    now.setDate(now.getDate() - 1);
    baseH = 23;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(baseH)}00`;
  return { date, time };
}

// 초단기실황 base_time: HH:30 (매 시간 30분에 발표)
function getUltraBaseTime(): { date: string; time: string } {
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  if (m < 30) {
    h -= 1;
    if (h < 0) { h = 23; now.setDate(now.getDate() - 1); }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(h)}30`;
  return { date, time };
}

async function fetchKmaCurrentWeather(): Promise<{
  temp: number; humidity: number; windSpeed: number; pty: number; sky: number;
} | null> {
  if (!API_KEY) return null;
  const { date, time } = getUltraBaseTime();
  const params = new URLSearchParams({
    serviceKey: API_KEY, pageNo: "1", numOfRows: "60",
    dataType: "JSON", base_date: date, base_time: time,
    nx: String(NX), ny: String(NY),
  });
  try {
    const res = await fetch(`${BASE}/getUltraSrtNcst?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const items: { category: string; obsrValue: string }[] =
      json?.response?.body?.items?.item ?? [];
    const get = (cat: string) => parseFloat(items.find(i => i.category === cat)?.obsrValue ?? "0") || 0;
    return {
      temp: get("T1H"),
      humidity: get("REH"),
      windSpeed: get("WSD"),
      pty: get("PTY"),
      sky: get("SKY"),  // 초단기실황에는 SKY 없음 (0으로 fallback)
    };
  } catch { return null; }
}

async function fetchKmaForecast(): Promise<{
  high: number; low: number;
  hourly: { hour: string; temp: number; sky: number; pty: number }[];
  weekly: { date: string; high: number; low: number; sky: number; pty: number; pop: number }[];
} | null> {
  if (!API_KEY) return null;
  const { date, time } = getVilageBaseTime();
  const params = new URLSearchParams({
    serviceKey: API_KEY, pageNo: "1", numOfRows: "1000",
    dataType: "JSON", base_date: date, base_time: time,
    nx: String(NX), ny: String(NY),
  });
  try {
    const res = await fetch(`${BASE}/getVilageFcst?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const items: { fcstDate: string; fcstTime: string; category: string; fcstValue: string }[] =
      json?.response?.body?.items?.item ?? [];
    if (items.length === 0) return null;

    const todayStr = date;
    // group by date+time
    const byDT: Record<string, Record<string, string>> = {};
    for (const it of items) {
      const key = `${it.fcstDate}_${it.fcstTime}`;
      if (!byDT[key]) byDT[key] = {};
      byDT[key][it.category] = it.fcstValue;
    }

    // Today's hourly (next 6h)
    const nowH = new Date().getHours();
    const hourly = Object.entries(byDT)
      .filter(([k]) => k.startsWith(todayStr))
      .map(([k, v]) => {
        const h = parseInt(k.split("_")[1]) / 100;
        return { hour: `${String(Math.floor(h)).padStart(2, "0")}:00`, temp: parseFloat(v["TMP"] ?? "0"), sky: parseInt(v["SKY"] ?? "1"), pty: parseInt(v["PTY"] ?? "0") };
      })
      .filter(h => parseInt(h.hour) >= nowH)
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(0, 6);

    // Daily: group by date for high/low
    const byDate: Record<string, { tmx?: number; tmn?: number; sky: number; pty: number; pop: number }> = {};
    for (const it of items) {
      if (!byDate[it.fcstDate]) byDate[it.fcstDate] = { sky: 1, pty: 0, pop: 0 };
      if (it.category === "TMX") byDate[it.fcstDate].tmx = parseFloat(it.fcstValue);
      if (it.category === "TMN") byDate[it.fcstDate].tmn = parseFloat(it.fcstValue);
      if (it.category === "SKY") byDate[it.fcstDate].sky = parseInt(it.fcstValue);
      if (it.category === "PTY") byDate[it.fcstDate].pty = parseInt(it.fcstValue);
      if (it.category === "POP") byDate[it.fcstDate].pop = Math.max(byDate[it.fcstDate].pop, parseInt(it.fcstValue));
    }

    const today = byDate[todayStr];
    const high = today?.tmx ?? 0;
    const low = today?.tmn ?? 0;

    const weekly = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({
        date: d,
        high: v.tmx ?? 0,
        low: v.tmn ?? 0,
        sky: v.sky,
        pty: v.pty,
        pop: v.pop,
      }))
      .filter(d => d.date >= todayStr)
      .slice(0, 7);

    return { high, low, hourly, weekly };
  } catch { return null; }
}

async function fetchAirQuality(): Promise<{ pm10: number | null; pm25: number | null }> {
  if (!API_KEY) return { pm10: null, pm25: null };
  // 에어코리아 인근 측정소: 검단 (없으면 인천서구)
  const params = new URLSearchParams({
    serviceKey: API_KEY, returnType: "json",
    numOfRows: "1", pageNo: "1",
    sidoName: "인천", ver: "1.0",
  });
  try {
    const res = await fetch(
      `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?${params}`
    );
    if (!res.ok) return { pm10: null, pm25: null };
    const json = await res.json();
    const items = json?.response?.body?.items ?? [];
    // 검단 또는 가장 가까운 인천 측정소
    const station = items.find((i: { stationName: string }) =>
      i.stationName.includes("검단") || i.stationName.includes("서구")
    ) ?? items[0];
    if (!station) return { pm10: null, pm25: null };
    const pm10 = parseInt(station.pm10Value) || null;
    const pm25 = parseInt(station.pm25Value) || null;
    return { pm10, pm25 };
  } catch { return { pm10: null, pm25: null }; }
}

// Open-Meteo fallback
async function fetchOpenMeteo(): Promise<WeatherData | null> {
  const WMO: Record<number, { label: string; emoji: string }> = {
    0: { label: "맑음", emoji: "☀️" }, 1: { label: "대체로 맑음", emoji: "🌤️" },
    2: { label: "구름 많음", emoji: "⛅" }, 3: { label: "흐림", emoji: "☁️" },
    45: { label: "안개", emoji: "🌫️" }, 48: { label: "안개", emoji: "🌫️" },
    51: { label: "이슬비", emoji: "🌦️" }, 53: { label: "이슬비", emoji: "🌦️" },
    61: { label: "가벼운 비", emoji: "🌧️" }, 63: { label: "비", emoji: "🌧️" },
    65: { label: "강한 비", emoji: "🌧️" }, 71: { label: "눈", emoji: "❄️" },
    73: { label: "눈", emoji: "❄️" }, 75: { label: "강한 눈", emoji: "❄️" },
    80: { label: "소나기", emoji: "🌦️" }, 95: { label: "뇌우", emoji: "⛈️" },
  };
  const wmo = (c: number) => WMO[c] ?? { label: "알 수 없음", emoji: "🌡️" };
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=37.5446&longitude=126.6861" +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum" +
      "&timezone=Asia%2FSeoul&forecast_days=7&past_days=1"
    );
    if (!res.ok) return null;
    const d = await res.json();
    const code: number = d.current.weather_code;
    const nowH = new Date().getHours();
    const yesterdayTemp = d.hourly?.temperature_2m?.[nowH] != null
      ? Math.round(d.hourly.temperature_2m[nowH] as number) : null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const hourly = (d.hourly.time as string[])
      .map((t: string, i: number) => ({ t, temp: Math.round(d.hourly.temperature_2m[i] as number), code: d.hourly.weather_code[i] as number }))
      .filter(h => h.t.startsWith(todayStr) && new Date(h.t).getHours() >= nowH)
      .slice(0, 6)
      .map(h => ({ hour: h.t.slice(11, 16), temp: h.temp, emoji: wmo(h.code).emoji }));
    const weekly: WeeklyDay[] = (d.daily.time as string[])
      .map((date: string, i: number) => {
        const d2 = new Date(date);
        return { date: `${d2.getMonth() + 1}/${d2.getDate()}`, dayLabel: DAY_KO[d2.getDay()], emoji: wmo(d.daily.weather_code[i] as number).emoji, high: Math.round(d.daily.temperature_2m_max[i] as number), low: Math.round(d.daily.temperature_2m_min[i] as number), precipitation: Math.round(d.daily.precipitation_sum[i] as number), isToday: date === todayStr };
      }).filter(day => new Date(`${new Date().getFullYear()}-${day.date.replace("/", "-")}`).getTime() >= new Date(todayStr).getTime()).slice(0, 7);
    return { temp: Math.round(d.current.temperature_2m as number), feelsLike: Math.round(d.current.apparent_temperature as number), weatherCode: code, label: wmo(code).label, emoji: wmo(code).emoji, humidity: Math.round(d.current.relative_humidity_2m as number), windSpeed: Math.round(d.current.wind_speed_10m as number), high: Math.round(d.daily.temperature_2m_max[1] as number), low: Math.round(d.daily.temperature_2m_min[1] as number), hourly, yesterdayTemp, weekly };
  } catch { return null; }
}

export async function fetchWeather(): Promise<WeatherData | null> {
  // 기상청 + 에어코리아 병렬 요청
  const [current, forecast, air] = await Promise.all([
    fetchKmaCurrentWeather(),
    fetchKmaForecast(),
    fetchAirQuality(),
  ]);

  // 기상청 데이터 사용 가능하면 조합
  if (current && forecast && forecast.high !== 0) {
    const { label, emoji, code } = ptyToWeather(current.pty, current.sky);

    // 어제 온도는 Open-Meteo에서 가져오기 (기상청은 과거 조회 복잡)
    let yesterdayTemp: number | null = null;
    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=37.5446&longitude=126.6861" +
        "&hourly=temperature_2m&timezone=Asia%2FSeoul&past_days=1&forecast_days=0"
      );
      if (res.ok) {
        const d = await res.json();
        const nowH = new Date().getHours();
        yesterdayTemp = d.hourly?.temperature_2m?.[nowH] != null
          ? Math.round(d.hourly.temperature_2m[nowH] as number) : null;
      }
    } catch { /* ignore */ }

    const hourly = forecast.hourly.map(h => {
      const { emoji: e } = ptyToWeather(h.pty, h.sky);
      return { hour: h.hour, temp: h.temp, emoji: e };
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const weekly: WeeklyDay[] = forecast.weekly.map(w => {
      const d2 = new Date(w.date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
      const { emoji: e } = ptyToWeather(w.pty, w.sky);
      return {
        date: `${d2.getMonth() + 1}/${d2.getDate()}`,
        dayLabel: DAY_KO[d2.getDay()],
        emoji: e,
        high: w.high,
        low: w.low,
        precipitation: w.pop,
        isToday: w.date === todayStr.replace(/-/g, ""),
      };
    });

    return {
      temp: Math.round(current.temp),
      feelsLike: Math.round(current.temp - (current.windSpeed * 0.7)), // 체감온도 근사
      weatherCode: code,
      label,
      emoji,
      humidity: current.humidity,
      windSpeed: Math.round(current.windSpeed * 10) / 10,
      high: forecast.high,
      low: forecast.low,
      hourly,
      yesterdayTemp,
      weekly,
      pm10: air.pm10,
      pm25: air.pm25,
      pm10Label: pmLabel(air.pm10, "pm10"),
      pm25Label: pmLabel(air.pm25, "pm25"),
    };
  }

  // fallback: Open-Meteo
  const fallback = await fetchOpenMeteo();
  if (fallback) {
    return { ...fallback, pm10: air.pm10, pm25: air.pm25, pm10Label: pmLabel(air.pm10, "pm10"), pm25Label: pmLabel(air.pm25, "pm25") };
  }
  return null;
}
