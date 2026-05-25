<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-style-protection -->
# UI 스타일 보호 규칙

## 핵심 UI 파일 — 절대 롤백 금지

아래 파일들은 디자인 히스토리가 복잡하여 잘못 머지되면 구버전으로 롤백되기 쉽다.
**이 파일들을 변경할 때는 반드시 git diff로 변경 내용을 검토한 후 스테이지하라.**

| 파일 | 보호 이유 |
|------|-----------|
| `components/layout/BottomNav.tsx` | 솔리드 아이콘 + Tailwind 글래스모피즘 + SuggestFAB 포함 버전 유지 |
| `app/stores/page.tsx` | 바텀시트 제거 후 최신 매장 리스트 UI |
| `app/stores/StoreMapView.tsx` | 나침반 회전 + 방향별 사진 마커 포함 버전 유지 |
| `app/mypage/page.tsx` | 활동점수·저장 기능 포함 최신 버전 유지 |

## 현재 BottomNav 디자인 기준

- 아이콘: `Store`(상가), `MessageCircle`(소식), `Home`(홈·center), `Navigation`(교통), `User`(MY)
- 상가·소식은 활성 시 솔리드 SVG 아이콘 사용 (`StoreSolid`, `MessageCircleSolid`)
- 활성 탭 색상: **검정** (`text-black`), 비활성: `text-[#8e8e93]`
- 홈 탭만 파란 원형 배경 (`bg-[#2563EB]`)
- Tailwind 클래스 기반, `backdrop-blur-[28px]` 글래스모피즘 `rounded-[36px]`
- `/stores` 경로에서 `SuggestFAB` 렌더링

## 작업 전 필수 확인 절차

1. 새 작업 브랜치 시작 전: `git pull origin main --rebase`
2. 스테이징 전: `git diff -- <파일>` 으로 반드시 변경 내용 확인
3. 위 보호 파일에 의도치 않은 변경이 포함되어 있으면: `git restore <파일>`
4. 브랜치 merge/PR 전: 위 4개 파일이 main HEAD와 일치하는지 확인

## 반복 롤백 원인

- worktree 에서 작업 후 merge 시 구버전 스테이징 상태가 남는 경우
- `git index.lock` 이 남아 있는 경우 → `rm -f .git/index.lock` 으로 제거 가능 (0바이트 스테일 락만)
- 브랜치 분기점이 주요 디자인 커밋보다 이전인 상태에서 스테이징하는 경우
<!-- END:ui-style-protection -->
