import assert from 'node:assert/strict';
import { deduplicateNewsArticles, isSameNewsIssue } from '../lib/news/deduplicate.mjs';

const article = (title, publishedAt = '2026-07-06T03:00:00Z', source = '테스트뉴스') => ({
  id: `${source}-${title}`,
  title,
  source,
  publishedAt,
  url: `https://example.com/${encodeURIComponent(title)}`,
});

assert.equal(
  isSameNewsIssue(
    article('검단신도시 첫 더샵 브랜드…4억대 대단지'),
    article("검단신도시 첫 '더샵' 브랜드… 4억대 대단지", '2026-07-06T05:00:00Z', '다른뉴스'),
  ),
  true,
  '따옴표와 띄어쓰기만 다른 제목은 같은 기사로 묶어야 한다',
);

assert.equal(
  isSameNewsIssue(
    article('김진규 검단구청장 과밀학급 해소 위해 인천교육청 찾았다'),
    article('인천 검단구, 교육청에 과밀학급·통학안전 개선 요청', '2026-07-06T04:00:00Z'),
  ),
  true,
  '같은 교육 협의 보도자료는 표현이 달라도 한 이슈여야 한다',
);

assert.equal(
  isSameNewsIssue(
    article('인천시, 검단 AA7블록 육아친화 특화주택 공모 선정', '2026-07-10T04:00:00Z'),
    article('검단 신혼부부 특화주택 80호 조성', '2026-07-01T04:00:00Z'),
  ),
  true,
  '같은 특화주택 선정 이슈는 핵심 개념으로 묶어야 한다',
);

assert.equal(
  isSameNewsIssue(
    article('인천 원당동 디에트르더힐아파트 76㎡ 5억8500만원에 거래'),
    article('인천 원당동 예미지 트리플에듀 아파트 76㎡ 6억원에 거래', '2026-07-06T03:20:00Z'),
  ),
  false,
  '지역과 면적이 같아도 다른 아파트 거래는 합치면 안 된다',
);

assert.equal(
  isSameNewsIssue(
    article('더샵 검단레이크파크 1순위 평균 7대1 경쟁률 기록'),
    article('더샵 검단레이크파크 정당계약 14일부터 진행', '2026-07-07T03:00:00Z'),
  ),
  false,
  '같은 단지라도 청약 결과와 계약 일정은 서로 다른 기사다',
);

const mixed = [
  article('검단신도시 첫 더샵 브랜드…4억대 대단지'),
  article("검단신도시 첫 '더샵' 브랜드… 4억대 대단지", '2026-07-06T05:00:00Z', '다른뉴스'),
  article('검단 M6659 광역급행버스 운행 개시'),
  article('검단구 교육청과 과밀학급·통학안전 개선 협의'),
];

assert.equal(deduplicateNewsArticles(mixed, { limit: 10 }).length, 3);
console.log('news deduplication tests passed');
