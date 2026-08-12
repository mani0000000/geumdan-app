import { NextRequest, NextResponse } from "next/server";

const palettes: Record<string, [string, string, string]> = {
  카페: ["#6F4E37", "#D7A86E", "☕"], 음식점: ["#B64035", "#F0A36D", "🍽"], 편의점: ["#146B4D", "#56C596", "24"],
  미용: ["#7E3A66", "#DB8AB8", "✦"], 학원: ["#264A73", "#6FA5E2", "A+"], 체육: ["#175D68", "#55B8B0", "●"],
  반려동물: ["#76532D", "#D5A45C", "🐾"], 종교: ["#4C4C72", "#9696C8", "+"], 생활서비스: ["#3F5068", "#8EA6C1", "◆"],
};

function escape(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!)); }

export async function GET(request: NextRequest) {
  const name = escape((request.nextUrl.searchParams.get("name") || "검단 매장").slice(0, 22));
  const category = escape((request.nextUrl.searchParams.get("category") || "생활서비스").slice(0, 12));
  const [dark, light, mark] = palettes[category] ?? palettes.생활서비스;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="405" viewBox="0 0 720 405"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-opacity=".2"/></filter></defs><rect width="720" height="405" rx="36" fill="url(#g)"/><circle cx="610" cy="72" r="150" fill="white" opacity=".08"/><circle cx="90" cy="380" r="175" fill="white" opacity=".06"/><rect x="58" y="56" width="112" height="112" rx="30" fill="white" opacity=".94" filter="url(#s)"/><text x="114" y="130" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="900" fill="${dark}">${escape(mark)}</text><text x="58" y="244" font-family="Arial,'Noto Sans KR',sans-serif" font-size="46" font-weight="900" fill="white">${name}</text><text x="60" y="292" font-family="Arial,'Noto Sans KR',sans-serif" font-size="23" font-weight="700" fill="white" opacity=".8">새샘프라자 · ${category}</text><text x="60" y="352" font-family="Arial,'Noto Sans KR',sans-serif" font-size="16" font-weight="700" fill="white" opacity=".58">매장 제공 사진 등록 전 업종 대표 이미지</text></svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
