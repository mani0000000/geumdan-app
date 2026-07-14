const LOW_INFORMATION_TOKENS = new Set([
  '인천', '검단', '서구', '신도시', '지역', '관련', '대해', '대한', '위해', '통해',
  '기자', '뉴스', '공식', '첫', '오늘', '이번', '최근', '본격', '예정', '진행', '시작',
  '새로운', '나선다', '밝혔다', '전했다', '속도', '시대', '도약', '관심', '기대감',
  '아파트', '주택', '분양', '청약', '거래', '공급', '조성', '선정', '사업', '공모',
  '대단지', '인프라', '확충', '개선', '요청', '논의', '해소', '지원', '확보', '기록',
]);

const PARTICLE_SUFFIXES = [
  '으로부터', '에서는', '에게서', '으로는', '이라고', '라며', '까지', '부터', '에서',
  '에게', '으로', '에는', '에도', '이며', '하고', '보다', '처럼', '만큼', '은', '는',
  '이', '가', '을', '를', '의', '에', '와', '과', '로', '도', '만',
];

const TOPIC_PATTERNS = {
  education: /교육|학교|학급|교실|통학|학생|학부모|교육청|교육감/,
  housing: /아파트|주택|분양|청약|입주|임대|부동산|재건축|재개발|전세|매매|가구/,
  transport: /지하철|버스|교통|철도|호선|gtx|노선|개통|운행|환승|역세권/,
  government: /출범|구청|행정|구청장|취임|조직개편|자치구|공무원/,
  family: /육아|돌봄|보육|어린이|아이\s*키우|신혼부부|키즈/,
  development: /착공|준공|개발|공원|산업단지|도시계획|인프라|공사|사업/,
  safety: /사고|화재|안전|범죄|경찰|소방|재난|위험|환경피해|폐기물/,
  commerce: /상가|마트|매장|개점|오픈|맛집|카페|쇼핑|소상공인/,
};

const CONCEPT_PATTERNS = [
  ['교육협의', /교육청|교육감|교육현안|교육\s*협력/],
  ['과밀학급', /과밀\s*학급|학급\s*과밀|교실\s*부족|콩나물\s*교실/],
  ['통학안전', /통학\s*안전|안전\s*위협|통학로/],
  ['육아지원', /육아|보육|아이\s*키우|돌봄|신혼부부/],
  ['특화주택', /특화\s*주택|특화\s*공공|공공\s*임대|임대\s*주택|아이\s*키우.*집|집.*돌봄/],
  ['철도연장', /철도\s*연장|지하철\s*연장|검단\s*연장선|5호선\s*연장/],
  ['광역버스', /광역\s*버스|광역급행|m\s*\d{4}/i],
  ['행정출범', /검단구.*출범|자치구.*출범|구청장.*취임/],
  ['분양청약', /분양|청약|특별공급|잔여\s*세대|경쟁률/],
];

const PHASE_PATTERNS = [
  ['selection', /공모|선정|국비.*확보/],
  ['contract', /정당\s*계약|계약\s*진행|계약\s*일정/],
  ['subscription_result', /경쟁률|청약.*마감|평균\s*\d+(?:\.\d+)?\s*대|최고\s*\d+(?:\.\d+)?\s*대/],
  ['special_supply', /특별\s*공급|특공/],
  ['sale_launch', /분양\s*(돌입|시작|중)|견본\s*주택|잔여\s*세대/],
  ['move_in', /입주\s*(시작|본격|예정)|입주\s*물량/],
  ['construction', /착공|준공/],
  ['transaction', /거래|신고가|매매/],
  ['opening', /개통|운행\s*개시/],
  ['meeting', /교육청|교육감|교육현안/],
];

function decodeEntities(value = '') {
  let decoded = String(value);
  for (let index = 0; index < 2; index += 1) {
    decoded = decoded
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;|&#34;/gi, '"')
      .replace(/&apos;|&#39;/gi, "'")
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&');
  }
  return decoded.replace(/<[^>]+>/g, ' ');
}

function normalizeLocalToken(token) {
  if (/^인천(광역)?시?$/.test(token)) return '인천';
  if (/^검단(신도시|구)?$/.test(token)) return '검단';
  if (/^(인천시?)?교육청$/.test(token)) return '교육청';
  return token;
}

function normalizeToken(rawToken) {
  let token = normalizeLocalToken(rawToken.toLocaleLowerCase('ko-KR').normalize('NFKC'));
  const stemRules = [
    [/^선정/, '선정'], [/^조성/, '조성'], [/^공급/, '공급'], [/^확보/, '확보'],
    [/^출범/, '출범'], [/^취임/, '취임'], [/^개통/, '개통'], [/^운행/, '운행'],
    [/^돌파/, '돌파'], [/^요청/, '요청'], [/^건의/, '건의'], [/^논의/, '논의'],
    [/^해소/, '해소'], [/^개선/, '개선'], [/^분양/, '분양'], [/^청약/, '청약'],
  ];
  for (const [pattern, stem] of stemRules) {
    if (pattern.test(token)) return stem;
  }
  for (const suffix of PARTICLE_SUFFIXES) {
    if (token.length >= suffix.length + 2 && token.endsWith(suffix)) {
      token = token.slice(0, -suffix.length);
      break;
    }
  }
  return normalizeLocalToken(token);
}

export function normalizeNewsHeadline(title = '') {
  return decodeEntities(title)
    .normalize('NFKC')
    .replace(/\[[^\]]{1,24}\]/g, ' ')
    .replace(/\([^)]{1,18}\)/g, ' ')
    .replace(/[‘’“”'"`´]/g, '')
    .replace(/[^0-9a-zA-Z가-힣]+/g, ' ')
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenData(title) {
  const normalized = normalizeNewsHeadline(title);
  const rawTokens = normalized.match(/[가-힣]{2,}|[a-z]{2,}|\d+(?:\.\d+)?(?:억|만|호|년|개|곳|대|배|명|가구|원|시간|선)?/g) ?? [];
  const all = new Set(rawTokens.map(normalizeToken).filter(token => token.length >= 2));
  const meaningful = new Set([...all].filter(token => !LOW_INFORMATION_TOKENS.has(token) && !/^\d/.test(token)));
  const decodedTitle = decodeEntities(title).normalize('NFKC');
  const concepts = new Set();
  for (const [concept, pattern] of CONCEPT_PATTERNS) {
    if (pattern.test(decodedTitle)) {
      concepts.add(concept);
      meaningful.add(concept);
    }
  }
  const phases = new Set(
    PHASE_PATTERNS.filter(([, pattern]) => pattern.test(decodedTitle)).map(([phase]) => phase),
  );
  const topics = new Set(
    Object.entries(TOPIC_PATTERNS)
      .filter(([, pattern]) => pattern.test(decodedTitle))
      .map(([topic]) => topic),
  );
  return { normalized, all, meaningful, concepts, phases, topics };
}

function intersectionSize(first, second) {
  let count = 0;
  for (const value of first) if (second.has(value)) count += 1;
  return count;
}

function ngrams(value, size = 3) {
  const compact = value.replace(/\s+/g, '');
  if (!compact) return new Set();
  if (compact.length <= size) return new Set([compact]);
  const result = new Set();
  for (let index = 0; index <= compact.length - size; index += 1) {
    result.add(compact.slice(index, index + size));
  }
  return result;
}

function diceCoefficient(first, second) {
  if (first.size === 0 || second.size === 0) return 0;
  return (2 * intersectionSize(first, second)) / (first.size + second.size);
}

function publishedTime(article) {
  const value = article.publishedAt ?? article.published_at ?? '';
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function numericTokens(value) {
  return new Set(
    (normalizeNewsHeadline(value).match(/\d+(?:\.\d+)?/g) ?? [])
      .map(Number)
      .filter(number => Number.isFinite(number) && number !== 1),
  );
}

function propertyKey(value) {
  const tokens = normalizeNewsHeadline(value).split(' ').filter(Boolean);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.endsWith('아파트') && token.length > 5) return token.slice(0, -3);
    if (token === '아파트' && index > 0) return tokens[index - 1];
  }
  return '';
}

function numbersAreCompatible(first, second) {
  if (first.size === 0 || second.size === 0) return true;
  let compatible = 0;
  for (const firstNumber of first) {
    if ([...second].some(secondNumber => {
      const scale = Math.max(Math.abs(firstNumber), Math.abs(secondNumber), 1);
      return Math.abs(firstNumber - secondNumber) / scale <= 0.04;
    })) compatible += 1;
  }
  return compatible / Math.min(first.size, second.size) >= 0.5;
}

export function isSameNewsIssue(first, second, options = {}) {
  const maxHours = options.maxHours ?? 96;
  const firstData = tokenData(first.title);
  const secondData = tokenData(second.title);
  if (!firstData.normalized || !secondData.normalized) return false;
  if (firstData.normalized === secondData.normalized) return true;

  const shorter = firstData.normalized.length <= secondData.normalized.length ? firstData.normalized : secondData.normalized;
  const longer = shorter === firstData.normalized ? secondData.normalized : firstData.normalized;
  if (shorter.length >= 14 && longer.includes(shorter) && shorter.length / longer.length >= 0.56) return true;

  const firstProperty = propertyKey(first.title);
  const secondProperty = propertyKey(second.title);
  if (
    firstProperty && secondProperty
    && !firstProperty.includes(secondProperty)
    && !secondProperty.includes(firstProperty)
    && firstData.phases.has('transaction')
    && secondData.phases.has('transaction')
  ) return false;

  const firstTime = publishedTime(first);
  const secondTime = publishedTime(second);
  const hoursApart = firstTime && secondTime ? Math.abs(firstTime - secondTime) / 3_600_000 : 0;

  const sharedMeaningful = intersectionSize(firstData.meaningful, secondData.meaningful);
  const sharedConcepts = intersectionSize(firstData.concepts, secondData.concepts);
  const sharedPhases = intersectionSize(firstData.phases, secondData.phases);
  const sharedAll = intersectionSize(firstData.all, secondData.all);
  const sharedTopics = intersectionSize(firstData.topics, secondData.topics);
  const meaningfulDice = diceCoefficient(firstData.meaningful, secondData.meaningful);
  const headlineDice = diceCoefficient(ngrams(firstData.normalized), ngrams(secondData.normalized));
  const firstNumbers = numericTokens(first.title);
  const secondNumbers = numericTokens(second.title);
  const conflictingNumbers = !numbersAreCompatible(firstNumbers, secondNumbers);

  if (firstData.phases.size > 0 && secondData.phases.size > 0 && sharedPhases === 0) return false;
  if (sharedConcepts >= 2 && sharedPhases >= 1 && hoursApart <= 30 * 24) return true;
  if (sharedConcepts >= 2 && hoursApart <= 14 * 24) return true;
  if (hoursApart > maxHours) return false;
  if (sharedConcepts >= 2 && hoursApart <= maxHours) return true;
  if (conflictingNumbers && headlineDice < 0.9) return false;
  if (headlineDice >= 0.72) return true;
  if (sharedMeaningful >= 3 && meaningfulDice >= 0.42) return true;
  if (!conflictingNumbers && sharedMeaningful >= 2 && (meaningfulDice >= 0.48 || headlineDice >= 0.34)) return true;
  if (hoursApart <= 36 && sharedMeaningful >= 2) return true;
  if (hoursApart <= 18 && sharedMeaningful >= 1 && sharedAll >= 3 && sharedTopics >= 1) return true;
  return false;
}

function representativeScore(article, newestTimestamp) {
  const titleLength = normalizeNewsHeadline(article.title).length;
  const source = String(article.source ?? '').toLocaleLowerCase('ko-KR');
  const url = String(article.url ?? '').toLocaleLowerCase('ko-KR');
  const summary = decodeEntities(article.summary ?? '').replace(/https?:\/\/\S+/g, ' ').trim();
  const timestamp = publishedTime(article);
  let score = 0;
  if (article.thumbnail) score += 5;
  if (!/(네이트|v\.daum|다음|네이버뉴스|news\.google)/.test(`${source} ${url}`)) score += 2;
  if (titleLength >= 22 && titleLength <= 72) score += 2;
  if (summary.length >= 45 && !summary.includes(article.title)) score += 2;
  if (timestamp && newestTimestamp && newestTimestamp - timestamp <= 12 * 3_600_000) score += 1;
  return score;
}

export function clusterNewsArticles(articles, options = {}) {
  const ordered = [...articles].sort((first, second) => publishedTime(second) - publishedTime(first));
  const clusters = [];

  for (const article of ordered) {
    let matchingCluster = null;
    for (const cluster of clusters) {
      if (isSameNewsIssue(article, cluster.article, options)) {
        matchingCluster = cluster;
        break;
      }
    }

    if (!matchingCluster) {
      clusters.push({ article, members: [article], newestTimestamp: publishedTime(article) });
      continue;
    }

    matchingCluster.members.push(article);
    const currentScore = representativeScore(matchingCluster.article, matchingCluster.newestTimestamp);
    const candidateScore = representativeScore(article, matchingCluster.newestTimestamp);
    if (candidateScore > currentScore) matchingCluster.article = article;
  }

  return clusters;
}

export function deduplicateNewsArticles(articles, options = {}) {
  const limit = options.limit ?? articles.length;
  const maxPerSource = options.maxPerSource ?? 3;
  const representatives = clusterNewsArticles(articles, options).map(cluster => cluster.article);
  if (representatives.length <= limit) return representatives;

  const selected = [];
  const deferred = [];
  const sourceCounts = new Map();
  for (const article of representatives) {
    const source = String(article.source ?? '기타').trim().toLocaleLowerCase('ko-KR');
    const count = sourceCounts.get(source) ?? 0;
    if (count >= maxPerSource) {
      deferred.push(article);
      continue;
    }
    selected.push(article);
    sourceCounts.set(source, count + 1);
    if (selected.length === limit) return selected;
  }
  return [...selected, ...deferred].slice(0, limit);
}
