const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`;
const INNERTUBE_CONTEXT = {
  client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'ko', gl: 'KR' },
};

export const YOUTUBE_TOPIC_GROUPS = [
  {
    id: 'news',
    label: '소식',
    queries: [
      '검단신도시 최신 소식', '검단신도시 근황', '검단구 소식', '인천 서구 검단 뉴스',
      '검단신도시 개발', '검단신도시 준공', '검단신도시 행사', '검단신도시 축제',
      '검단구청 오늘 소식', '검단신도시 이번주 뉴스', '검단 아라동 지역 소식',
      '검단 원당동 당하동 소식', '검단 신규 시설 개장', '검단 주민 생활 정보',
    ],
  },
  {
    id: 'food',
    label: '맛집',
    queries: [
      '검단신도시 맛집 최신', '검단 맛집', '아라동 맛집', '원당동 맛집',
      '당하동 맛집', '마전동 맛집', '검단신도시 고기집', '검단신도시 데이트 맛집',
      '검단신도시 신규 맛집', '검단 혼밥 맛집', '검단 가족 외식', '검단 점심 맛집',
      '검단 야식 술집', '검단 배달 맛집 리뷰',
    ],
  },
  {
    id: 'cafe',
    label: '카페',
    queries: [
      '검단신도시 카페 최신', '검단 카페', '아라동 카페', '검단신도시 대형카페',
      '검단신도시 브런치 카페', '검단 디저트 카페',
      '검단 베이커리 카페', '검단 신상 카페', '검단 아이랑 카페', '검단 데이트 카페',
    ],
  },
  {
    id: 'places',
    label: '가볼만한 곳',
    queries: [
      '검단신도시 가볼만한 곳', '검단호수공원', '검단신도시 공원 산책',
      '검단 아라뱃길', '검단 드림파크', '검단신도시 나들이',
      '검단 주말 나들이', '검단 아이와 가볼만한 곳', '검단 야경 산책',
      '검단 계양천 산책', '검단 캠핑 피크닉', '인천 서구 검단 여행',
    ],
  },
  {
    id: 'transport',
    label: '교통',
    queries: [
      '검단신도시 교통 최신', '검단신도시 지하철', '검단신도시 5호선',
      '검단 아라역', '검단신도시 버스', '검단신도시 출퇴근',
      '검단호수공원역', '신검단중앙역', '검단 김포 교통',
      '검단 광역버스 노선',
    ],
  },
  {
    id: 'realestate',
    label: '부동산',
    queries: [
      '검단신도시 아파트 최신', '검단신도시 부동산', '검단신도시 입주',
      '검단신도시 분양', '검단신도시 임장', '검단 아파트 시세',
      '검단신도시 실거주 후기', '검단 아파트 단지 비교',
    ],
  },
  {
    id: 'family',
    label: '아이·가족',
    queries: [
      '검단신도시 아이랑', '검단 키즈카페', '검단신도시 학교',
      '검단신도시 학원', '검단 가족 나들이',
      '검단 육아 정보', '검단 어린이 체험', '검단 초등학생 주말',
      '검단 도서관 프로그램', '검단 가족 행사',
    ],
  },
  {
    id: 'shopping',
    label: '상가·쇼핑',
    queries: [
      '검단신도시 상가', '검단신도시 신규 오픈', '검단신도시 쇼핑',
      '검단신도시 마트', '검단신도시 병원 약국', '검단 상권',
      '검단 새로 생긴 매장', '검단 편의시설', '검단 전통시장', '검단 쇼핑몰',
    ],
  },
  {
    id: 'life',
    label: '동네생활',
    queries: [
      '검단신도시 브이로그 최신', '검단신도시 일상', '검단신도시 산책',
      '검단신도시 후기', '검단신도시 동네생활', '인천 검단 생활',
      '검단 주민 브이로그', '검단 이사 후기', '검단 주말 일상', '검단 동네 탐방',
    ],
  },
  {
    id: 'culture',
    label: '문화·행사',
    queries: [
      '검단 문화 행사', '검단신도시 공연', '검단 축제 플리마켓', '검단 전시 체험',
      '검단 주민센터 프로그램', '검단 도서관 행사', '검단 버스킹', '인천 서구 검단 문화',
    ],
  },
  {
    id: 'health',
    label: '운동·건강',
    queries: [
      '검단신도시 운동', '검단 헬스장', '검단 수영장', '검단 러닝 코스',
      '검단 필라테스 요가', '검단 배드민턴', '검단 체육센터', '검단 건강 생활',
    ],
  },
  {
    id: 'education',
    label: '교육',
    queries: [
      '검단신도시 교육', '검단 학교 소식', '검단 학원가', '검단 초등학교',
      '검단 중학교 고등학교', '검단 진학 정보', '검단 청소년 프로그램',
    ],
  },
  {
    id: 'pet',
    label: '반려생활',
    queries: [
      '검단 반려견 산책', '검단 애견카페', '검단 동물병원', '검단 강아지 놀이터',
      '검단 반려동물', '인천 서구 애견 동반',
    ],
  },
  {
    id: 'deals',
    label: '할인·신규오픈',
    queries: [
      '검단신도시 할인 행사', '검단신도시 오픈 이벤트', '검단 신규 오픈 매장',
      '검단 마트 할인', '검단 쿠폰 이벤트', '검단 팝업스토어',
      '검단신도시 세일', '검단 이번주 행사',
    ],
  },
  {
    id: 'community',
    label: '취미·모임',
    queries: [
      '검단 주민 모임', '검단 동호회', '검단 플리마켓', '검단 원데이클래스',
      '검단 취미 생활', '검단 주민 프로그램', '검단 봉사 활동', '검단 청년 모임',
    ],
  },
];

const LOCAL_KEYWORDS = [
  '검단신도시', '검단', '검단구', '아라동', '원당동', '당하동', '마전동',
  '불로동', '왕길동', '오류동', '금곡동', '대곡동', '검단아라', '아라역',
  '검단호수공원', '완정', '드림로', '인천서구', '인천 서구',
];

const TOPIC_KEYWORDS = {
  food: ['맛집', '먹방', '식당', '고기', '밥집', '술집', '데이트', '브런치', '샤브', '국밥', '파스타'],
  cafe: ['카페', '커피', '디저트', '베이커리', '브런치', '대형카페'],
  news: ['소식', '뉴스', '근황', '개발', '준공', '착공', '행사', '축제', '개통', '출범', '구청장', '행정', '재정'],
  places: ['공원', '산책', '가볼만', '나들이', '여행', '호수공원', '아라뱃길', '드림파크'],
  transport: ['교통', '버스', '지하철', '역', '5호선', '노선', '출퇴근'],
  realestate: ['부동산', '아파트', '분양', '입주', '청약', '시세', '임장', '단지', '매매', '전세', '월세', '매물', '당첨', '계약', '잔여세대'],
  family: ['아이', '가족', '키즈', '학교', '학원', '어린이', '육아'],
  shopping: ['상가', '쇼핑', '마트', '병원', '약국', '오픈', '매장', '상권'],
  life: ['일상', '브이로그', '동네', '생활', '리뷰', '후기', '산책'],
  culture: ['문화', '공연', '축제', '행사', '플리마켓', '전시', '체험', '버스킹'],
  health: ['운동', '헬스', '수영', '러닝', '필라테스', '요가', '체육', '배드민턴', '댄스'],
  education: ['교육', '학교', '학원', '초등학교', '중학교', '고등학교', '진학', '청소년'],
  pet: ['반려', '애견', '강아지', '고양이', '동물병원', '펫'],
  deals: ['할인', '세일', '쿠폰', '이벤트', '신규오픈', '오픈', '팝업', '증정'],
  community: ['모임', '동호회', '플리마켓', '클래스', '취미', '봉사', '주민', '청년'],
};

const TRUSTED_CHANNEL_HINTS = [
  'B tv 뉴스', 'OBS뉴스', 'YTN', '연합뉴스', 'KBS', 'MBC', 'SBS', 'JTBC',
  '인천시', '인천광역시', '인천 서구', '서구청', '국토교통부', 'LH', 'iH',
];

function compact(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, '');
}

export function parseRelativeTime(text = '') {
  const now = Date.now();
  if (!text || /방금|just now/i.test(text)) return new Date(now).toISOString();
  const m = String(text).match(/(\d+)\s*(초|분|시간|일|주|달|개월|년|second|minute|hour|day|week|month|year)/i);
  if (!m) return new Date(now).toISOString();
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const msMap = {
    초: 1e3, second: 1e3,
    분: 6e4, minute: 6e4,
    시간: 36e5, hour: 36e5,
    일: 864e5, day: 864e5,
    주: 6048e5, week: 6048e5,
    달: 2592e6, 개월: 2592e6, month: 2592e6,
    년: 31536e6, year: 31536e6,
  };
  return new Date(now - n * (msMap[unit] ?? 864e5)).toISOString();
}

function parseCount(text = '') {
  const raw = String(text).replace(/,/g, '').trim();
  const m = raw.match(/([\d.]+)\s*(만|천|억|K|M)?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === '억') return Math.round(n * 100000000);
  if (unit === '만') return Math.round(n * 10000);
  if (unit === '천') return Math.round(n * 1000);
  if (unit === 'k') return Math.round(n * 1000);
  if (unit === 'm') return Math.round(n * 1000000);
  return Math.round(n);
}

function viewCountFromRenderer(vr) {
  return vr?.viewCountText?.simpleText
    ?? vr?.shortViewCountText?.simpleText
    ?? vr?.viewCountText?.runs?.map(r => r.text).join('')
    ?? '';
}

function channelIdFromRenderer(vr) {
  return vr?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    ?? vr?.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    ?? vr?.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer
      ?.navigationEndpoint?.browseEndpoint?.browseId
    ?? null;
}

function descriptionFromRenderer(vr) {
  return (vr?.descriptionSnippet?.runs ?? []).map(r => r.text ?? '').join('');
}

function localScore(video) {
  const haystack = compact(`${video.title} ${video.channel_name} ${video.description ?? ''}`);
  if ((haystack.includes('검단산') || haystack.includes('검단산역')) && !haystack.includes('검단신도시') && !haystack.includes('인천')) {
    return -100;
  }
  let score = 0;
  for (const keyword of LOCAL_KEYWORDS) {
    if (haystack.includes(compact(keyword))) score += keyword.includes('검단') ? 18 : 8;
  }
  if (haystack.includes('김포') && haystack.includes('검단')) score += 4;
  if (haystack.includes('계양') && haystack.includes('검단')) score += 4;
  return Math.min(score, 60);
}

function qualityPenalty(video) {
  const haystack = compact(`${video.title} ${video.description ?? ''}`);
  let penalty = 0;
  if (/010[-\s]?\d{3,4}[-\s]?\d{4}/.test(video.title) || haystack.includes('매물번호') || haystack.includes('분양문의')) penalty -= 90;
  if (haystack.includes('빌라매매') || haystack.includes('신축빌라') || haystack.includes('상가주택') || haystack.includes('토지f')) penalty -= 90;
  if (haystack.includes('분양권') || haystack.includes('매수타이밍') || haystack.includes('잔여세대') || haystack.includes('계약전꼭') || haystack.includes('당첨발표')) penalty -= 46;
  if (haystack.includes('충격') || haystack.includes('대박') || haystack.includes('폭등임박')) penalty -= 36;
  if (haystack.includes('개표') || haystack.includes('투표지') || haystack.includes('부정선거')) penalty -= 24;
  if (haystack.includes('검단산') || haystack.includes('하남검단')) penalty -= 50;
  return penalty;
}

function isHardRejected(video) {
  const haystack = compact(`${video.title} ${video.description ?? ''}`);
  return /010[-\s]?\d{3,4}[-\s]?\d{4}/.test(video.title)
    || haystack.includes('매물번호')
    || haystack.includes('분양문의')
    || haystack.includes('빌라매매')
    || haystack.includes('신축빌라')
    || haystack.includes('상가주택')
    || haystack.includes('토지f')
    || haystack.includes('잔여세대')
    || haystack.includes('계약전꼭')
    || haystack.includes('당첨발표')
    || haystack.includes('청약당첨');
}

function freshnessScore(video) {
  const ts = video.published_at ? new Date(video.published_at).getTime() : 0;
  if (!Number.isFinite(ts) || ts <= 0) return 0;
  const days = (Date.now() - ts) / 86400000;
  if (days <= 30) return 28;
  if (days <= 90) return 23;
  if (days <= 180) return 17;
  if (days <= 365) return 10;
  if (days <= 730) return 3;
  return -18;
}

function topicScore(video) {
  const keywords = TOPIC_KEYWORDS[video.topic] ?? [];
  const haystack = compact(`${video.title} ${video.description ?? ''} ${video.query ?? ''}`);
  return keywords.reduce((sum, keyword) => sum + (haystack.includes(compact(keyword)) ? 4 : 0), 0);
}

function subscriberScore(video) {
  const subs = Number(video.subscriber_count ?? 0);
  if (subs >= 500000) return 26;
  if (subs >= 100000) return 22;
  if (subs >= 50000) return 18;
  if (subs >= 10000) return 13;
  if (subs >= 3000) return 8;
  if (TRUSTED_CHANNEL_HINTS.some(name => video.channel_name.includes(name))) return 16;
  return 0;
}

function viewScore(video) {
  const views = parseCount(video.view_count_text);
  if (views >= 100000) return 8;
  if (views >= 30000) return 6;
  if (views >= 10000) return 4;
  if (views >= 3000) return 2;
  return 0;
}

function inferTopic(video) {
  const haystack = compact(`${video.title} ${video.description ?? ''}`);
  if (TRUSTED_CHANNEL_HINTS.some(name => video.channel_name.includes(name))) return 'news';
  let bestTopic = video.topic ?? 'life';
  let bestScore = 0;
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.reduce((sum, keyword) => sum + (haystack.includes(compact(keyword)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestTopic = topic;
      bestScore = score;
    }
  }
  return bestTopic;
}

export function scoreVideo(video) {
  return localScore(video) + freshnessScore(video) + topicScore(video) + subscriberScore(video) + viewScore(video) + qualityPenalty(video);
}

export function rankAndFilterVideos(videos, { minScore = 38, limit = 240 } = {}) {
  const seen = new Set();
  const ranked = videos
    .filter(video => video.video_id && !seen.has(video.video_id) && (seen.add(video.video_id), true))
    .map(video => {
      const withTopic = { ...video, topic: inferTopic(video) };
      return { ...withTopic, local_score: localScore(withTopic), relevance_score: scoreVideo(withTopic) };
    })
    .filter(video => {
      const ageDays = (Date.now() - new Date(video.published_at ?? 0).getTime()) / 86400000;
      return !isHardRejected(video)
        && video.local_score >= 18
        && video.relevance_score >= minScore
        && Number.isFinite(ageDays)
        && ageDays <= 550;
    })
    .sort((a, b) => {
      const aDate = new Date(a.published_at ?? 0).getTime();
      const bDate = new Date(b.published_at ?? 0).getTime();
      const dateDiff = bDate - aDate;
      if (Math.abs(dateDiff) > 1000 * 60 * 60 * 24 * 7) return dateDiff;
      const scoreDiff = b.relevance_score - a.relevance_score;
      if (scoreDiff !== 0) return scoreDiff;
      return dateDiff;
    });

  // 한 주제나 한 채널이 전체 목록을 독점하지 않도록 주제별 라운드로빈과
  // 채널 상한을 함께 적용한다. 각 버킷 내부 순서는 최신·연관도 순을 유지한다.
  const buckets = new Map();
  for (const video of ranked) {
    if (!buckets.has(video.topic)) buckets.set(video.topic, []);
    buckets.get(video.topic).push(video);
  }
  const result = [];
  const channelCounts = new Map();
  let added = true;
  while (result.length < limit && added) {
    added = false;
    for (const bucket of buckets.values()) {
      while (bucket.length) {
        const video = bucket.shift();
        const channelCount = channelCounts.get(video.channel_name) ?? 0;
        if (channelCount >= 4) continue;
        result.push(video);
        channelCounts.set(video.channel_name, channelCount + 1);
        added = true;
        break;
      }
      if (result.length >= limit) break;
    }
  }
  return result;
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)),
  ]);
}

function parseSearchPayload(data, topic, query) {
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];
  const videos = [];
  let continuationToken = null;

  for (const section of contents) {
    if (section?.continuationItemRenderer) {
      continuationToken =
        section.continuationItemRenderer?.continuationEndpoint
          ?.continuationCommand?.token ?? null;
      continue;
    }
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const vr = item?.videoRenderer;
      if (!vr?.videoId) continue;
      const publishedText = vr.publishedTimeText?.simpleText ?? '';
      const channelName = vr.ownerText?.runs?.[0]?.text ?? 'YouTube';
      videos.push({
        video_id: vr.videoId,
        title: vr.title?.runs?.[0]?.text ?? '검단 영상',
        channel_name: channelName,
        channel_id: channelIdFromRenderer(vr),
        thumbnail: `https://img.youtube.com/vi/${vr.videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${vr.videoId}`,
        published_at: parseRelativeTime(publishedText),
        published_text: publishedText,
        view_count_text: viewCountFromRenderer(vr),
        description: descriptionFromRenderer(vr),
        topic,
        query,
      });
    }
  }
  return { videos, continuationToken };
}

function parseContinuationPayload(data, topic, query) {
  const items =
    data?.onResponseReceivedCommands?.[0]
      ?.appendContinuationItemsAction?.continuationItems ?? [];
  const videos = [];
  for (const section of items) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const vr = item?.videoRenderer;
      if (!vr?.videoId) continue;
      const publishedText = vr.publishedTimeText?.simpleText ?? '';
      videos.push({
        video_id: vr.videoId,
        title: vr.title?.runs?.[0]?.text ?? '검단 영상',
        channel_name: vr.ownerText?.runs?.[0]?.text ?? 'YouTube',
        channel_id: channelIdFromRenderer(vr),
        thumbnail: `https://img.youtube.com/vi/${vr.videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${vr.videoId}`,
        published_at: parseRelativeTime(publishedText),
        published_text: publishedText,
        view_count_text: viewCountFromRenderer(vr),
        description: descriptionFromRenderer(vr),
        topic,
        query,
      });
    }
  }
  return videos;
}

async function fetchQuery(query, topic) {
  const res = await withTimeout(
    fetch(INNERTUBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ context: INNERTUBE_CONTEXT, query }),
    }),
    15000,
    `search:${query}`
  );
  if (!res.ok) throw new Error(`innertube HTTP ${res.status}`);
  return parseSearchPayload(await res.json(), topic, query);
}

async function fetchContinuation(token, topic, query) {
  const res = await withTimeout(
    fetch(INNERTUBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ context: INNERTUBE_CONTEXT, continuation: token }),
    }),
    15000,
    `continuation:${query}`
  );
  if (!res.ok) throw new Error(`continuation HTTP ${res.status}`);
  return parseContinuationPayload(await res.json(), topic, query);
}

async function enrichSubscribers(videos, youtubeApiKey) {
  if (!youtubeApiKey) return videos;
  const channelIds = [...new Set(videos.map(v => v.channel_id).filter(Boolean))].slice(0, 400);
  if (channelIds.length === 0) return videos;
  const stats = new Map();

  for (let i = 0; i < channelIds.length; i += 50) {
    const ids = channelIds.slice(i, i + 50);
    try {
      const params = new URLSearchParams({
        part: 'statistics',
        id: ids.join(','),
        key: youtubeApiKey,
      });
      const res = await withTimeout(fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`), 9000, 'channel-stats');
      if (!res.ok) continue;
      const json = await res.json();
      for (const item of json.items ?? []) {
        stats.set(item.id, Number(item.statistics?.subscriberCount ?? 0));
      }
    } catch (e) {
      console.warn('  ⚠️ 채널 구독자 수집 실패:', e.message);
    }
  }

  return videos.map(video => ({
    ...video,
    subscriber_count: video.channel_id ? stats.get(video.channel_id) ?? null : null,
  }));
}

export async function fetchCuratedYouTubeVideos({
  youtubeApiKey = '',
  minScore = 38,
  limit = 360,
  includeContinuation = true,
  queriesPerTopic = 8,
} = {}) {
  const rotation = Math.floor(Date.now() / 3600000);
  const queryItems = YOUTUBE_TOPIC_GROUPS.flatMap((group, groupIndex) => {
    const count = Math.min(queriesPerTopic, group.queries.length);
    const offset = (rotation + groupIndex * 3) % group.queries.length;
    return Array.from({ length: count }, (_, index) => ({
      query: group.queries[(offset + index) % group.queries.length],
      topic: group.id,
    }));
  });
  console.log(`  검색 풀 ${YOUTUBE_TOPIC_GROUPS.reduce((sum, group) => sum + group.queries.length, 0)}개 중 ${queryItems.length}개 순환 실행`);

  const buckets = [];
  const continuations = [];
  for (let i = 0; i < queryItems.length; i += 6) {
    const batch = queryItems.slice(i, i + 6);
    const results = await Promise.allSettled(batch.map(item => fetchQuery(item.query, item.topic)));
    results.forEach((result, idx) => {
      const item = batch[idx];
      if (result.status === 'fulfilled') {
        buckets.push(result.value.videos);
        if (result.value.continuationToken) {
          continuations.push({ token: result.value.continuationToken, topic: item.topic, query: item.query });
        }
        console.log(`  ✓ ${item.query}: ${result.value.videos.length}개`);
      } else {
        console.warn(`  ⚠️ 쿼리 실패: ${item.query}`);
      }
    });
    if (i + 6 < queryItems.length) await new Promise(resolve => setTimeout(resolve, 350));
  }

  if (includeContinuation && continuations.length > 0) {
    const priorityContinuations = continuations.slice(0, 42);
    for (let i = 0; i < priorityContinuations.length; i += 6) {
      const batch = priorityContinuations.slice(i, i + 6);
      const results = await Promise.allSettled(batch.map(item => fetchContinuation(item.token, item.topic, item.query)));
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          buckets.push(result.value);
        } else {
          console.warn(`  ⚠️ 2페이지 실패: ${batch[idx].query}`);
        }
      });
      if (i + 6 < priorityContinuations.length) await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  const interleaved = [];
  const maxRounds = Math.max(...buckets.map(bucket => bucket.length), 0);
  for (let round = 0; round < maxRounds; round++) {
    for (const bucket of buckets) {
      if (bucket[round]) interleaved.push(bucket[round]);
    }
  }

  const enriched = await enrichSubscribers(interleaved, youtubeApiKey);
  return rankAndFilterVideos(enriched, { minScore, limit });
}

export function toCacheVideo(video, index = 0) {
  return {
    id: `yt-${index}`,
    videoId: video.video_id,
    title: video.title,
    channelName: video.channel_name,
    channelId: video.channel_id ?? undefined,
    thumbnail: video.thumbnail,
    url: video.url,
    publishedAt: video.published_at,
    topic: video.topic,
    query: video.query,
    subscriberCount: video.subscriber_count ?? undefined,
    viewCountText: video.view_count_text ?? undefined,
    relevanceScore: video.relevance_score,
  };
}

export function toSupabaseRow(video, fetchedAt) {
  return {
    video_id: video.video_id,
    title: video.title,
    channel_name: video.channel_name,
    channel_id: video.channel_id ?? null,
    thumbnail: video.thumbnail,
    url: video.url,
    published_at: video.published_at,
    topic: video.topic,
    query: video.query,
    subscriber_count: video.subscriber_count ?? null,
    view_count_text: video.view_count_text ?? null,
    relevance_score: video.relevance_score,
    fetched_at: fetchedAt,
  };
}
