import { supabase } from "@/lib/supabase";

export type BenefitInstrumentType = "credit_card" | "debit_card" | "telecom" | "membership";

export interface BenefitInstrument {
  id: string;
  user_id: string;
  instrument_type: BenefitInstrumentType;
  issuer_key: string;
  issuer_name: string;
  product_name: string;
  nickname: string;
  active: boolean;
  created_at: string;
}

export interface MerchantBenefitOffer {
  id: number;
  provider_key: string;
  provider_name: string;
  instrument_type: BenefitInstrumentType;
  merchant_patterns: string[];
  benefit_title: string;
  benefit_detail: string;
  source_url: string;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface CardProduct {
  key: string;
  issuerName: string;
  name: string;
  type: BenefitInstrumentType;
  imageUrl?: string;
  theme: string;
  annualFee: string;
  performance: string;
  summary: string;
  sourceUrl: string;
  benefits: Array<{ title: string; detail: string; patterns: string[] }>;
  detailId?: number;
  detailSource?: "naver" | "gorilla";
  catalogSource?: string;
}

export const MEMBERSHIP_PRODUCTS: CardProduct[] = [
  { key:"skt_membership",issuerName:"SK텔레콤",name:"T멤버십",type:"telecom",theme:"linear-gradient(135deg,#5B2CFF,#00D4A8)",annualFee:"무료",performance:"회원 등급·제휴처별 조건",summary:"편의점·카페·베이커리 등 생활 제휴 혜택",sourceUrl:"https://www.tworld.co.kr/poc/html/product/TS3.html",benefits:[{title:"검단 제휴 매장 혜택",detail:"CU·세븐일레븐·파리바게뜨·뚜레쥬르·메가MGC커피 등",patterns:["CU","세븐일레븐","파리바게뜨","뚜레쥬르","메가MGC커피","메가커피","폴바셋"]}]},
  { key:"kt_membership",issuerName:"KT",name:"KT 멤버십",type:"telecom",theme:"linear-gradient(135deg,#111827,#E11D48)",annualFee:"무료",performance:"등급·포인트 및 제휴처별 조건",summary:"영화·외식·카페·편의점 제휴 혜택",sourceUrl:"https://membership.kt.com/",benefits:[{title:"KT 제휴 매장 할인",detail:"이용 전 KT 멤버십 앱에서 당일 제휴 조건을 확인하세요",patterns:["GS25","스타벅스","CGV","롯데시네마","메가박스","뚜레쥬르"]}]},
  { key:"lgu_membership",issuerName:"LG U+",name:"U+멤버십",type:"telecom",theme:"linear-gradient(135deg,#7A184B,#E6007E)",annualFee:"무료",performance:"등급·제휴처별 조건",summary:"생활 제휴와 VIP 콕 혜택",sourceUrl:"https://www.lguplus.com/benefit-membership/membership",benefits:[{title:"U+ 제휴 매장 혜택",detail:"U+멤버십 앱의 현재 제휴처와 이용 조건을 확인하세요",patterns:["GS25","파리바게뜨","CGV","메가박스"]}]},
  { key:"membership_cjone",issuerName:"CJ",name:"CJ ONE",type:"membership",theme:"linear-gradient(135deg,#FF5A36,#7C3AED)",annualFee:"무료",performance:"브랜드별 적립·사용 조건",summary:"올리브영·CGV·뚜레쥬르 등 CJ 브랜드 포인트",sourceUrl:"https://www.cjone.com/",benefits:[{title:"CJ ONE 포인트 적립·사용",detail:"브랜드 및 회원 등급별 적립률 적용",patterns:["올리브영","CGV","뚜레쥬르","빕스"]}]},
  { key:"membership_lpoint",issuerName:"롯데",name:"L.POINT",type:"membership",theme:"linear-gradient(135deg,#5D20D2,#E834A6)",annualFee:"무료",performance:"롯데 제휴사별 적립 조건",summary:"롯데 계열 쇼핑·영화·외식 통합 포인트",sourceUrl:"https://www.lpoint.com/",benefits:[{title:"L.POINT 적립·사용",detail:"롯데 제휴 매장에서 결제 전 적립 가능 여부를 확인하세요",patterns:["롯데마트","롯데시네마","세븐일레븐","롯데리아","엔제리너스"]}]},
  { key:"membership_happypoint",issuerName:"SPC",name:"해피포인트",type:"membership",theme:"linear-gradient(135deg,#F97316,#FACC15)",annualFee:"무료",performance:"브랜드별 적립·쿠폰 조건",summary:"파리바게뜨·배스킨라빈스·던킨 등 SPC 혜택",sourceUrl:"https://www.happypointcard.com/",benefits:[{title:"해피포인트 적립·쿠폰",detail:"SPC 브랜드별 적립률과 프로모션 적용",patterns:["파리바게뜨","배스킨라빈스","던킨","파스쿠찌","쉐이크쉑"]}]},
  { key:"membership_shinsegae",issuerName:"신세계",name:"신세계포인트",type:"membership",theme:"linear-gradient(135deg,#111827,#9CA3AF)",annualFee:"무료",performance:"제휴사별 적립 조건",summary:"이마트·신세계 계열 통합 포인트",sourceUrl:"https://www.shinsegaepoint.com/",benefits:[{title:"신세계포인트 적립·사용",detail:"이마트·신세계 계열 제휴처 기준",patterns:["이마트","이마트에브리데이","노브랜드","스타벅스"]}]},
  { key:"membership_okcashbag",issuerName:"SK플래닛",name:"OK캐쉬백",type:"membership",theme:"linear-gradient(135deg,#E11D48,#F97316)",annualFee:"무료",performance:"제휴처별 적립 조건",summary:"전국 온·오프라인 제휴 포인트",sourceUrl:"https://www.okcashbag.com/",benefits:[{title:"OK캐쉬백 적립·사용",detail:"매장별 적립 및 사용 가능 여부 확인",patterns:["@all"]}]},
  { key:"membership_hpoint",issuerName:"현대백화점그룹",name:"H.Point",type:"membership",theme:"linear-gradient(135deg,#111827,#334155)",annualFee:"무료",performance:"제휴 브랜드별 조건",summary:"현대백화점그룹 통합 멤버십",sourceUrl:"https://www.h-point.co.kr/",benefits:[{title:"H.Point 적립·사용",detail:"현대백화점그룹 제휴 브랜드 기준",patterns:["현대백화점","현대그린푸드"]}]},
  { key:"membership_gsnpoint",issuerName:"GS",name:"GS&POINT",type:"membership",theme:"linear-gradient(135deg,#0C8CE9,#16A34A)",annualFee:"무료",performance:"GS 제휴처별 조건",summary:"GS25·GS더프레시 등 GS 통합 포인트",sourceUrl:"https://www.gsnpoint.com/",benefits:[{title:"GS&POINT 적립·사용",detail:"GS 계열 제휴 매장별 조건 적용",patterns:["GS25","GS더프레시","GS THE FRESH"]}]},
  { key:"membership_starbucks",issuerName:"스타벅스",name:"스타벅스 리워드",type:"membership",theme:"linear-gradient(135deg,#006241,#009B72)",annualFee:"무료",performance:"등록 스타벅스 카드 이용 조건",summary:"별 적립과 회원 등급별 리워드",sourceUrl:"https://www.starbucks.co.kr/msr/index.do",benefits:[{title:"스타벅스 리워드",detail:"등록된 스타벅스 카드 결제 시 별 적립",patterns:["스타벅스"]}]},
  { key:"membership_oliveyoung",issuerName:"CJ올리브영",name:"올리브 멤버스",type:"membership",theme:"linear-gradient(135deg,#82C341,#A3D65C)",annualFee:"무료",performance:"등급·행사별 조건",summary:"올리브영 구매 적립과 회원 쿠폰",sourceUrl:"https://www.oliveyoung.co.kr/",benefits:[{title:"올리브영 멤버십 혜택",detail:"회원 등급별 적립과 쿠폰 적용",patterns:["올리브영"]}]},
  { key:"membership_cgv",issuerName:"CJ CGV",name:"CGV 멤버십",type:"membership",theme:"linear-gradient(135deg,#B91C1C,#F97316)",annualFee:"무료",performance:"CJ ONE 회원 기준",summary:"영화 관람 포인트와 등급 혜택",sourceUrl:"https://www.cgv.co.kr/user/mycgv/",benefits:[{title:"CGV·CJ ONE 혜택",detail:"영화 관람 및 매점 이용 조건 확인",patterns:["CGV"]}]},
  { key:"membership_megabox",issuerName:"메가박스",name:"메가박스 멤버십",type:"membership",theme:"linear-gradient(135deg,#24145F,#6D28D9)",annualFee:"무료",performance:"회원 등급별 조건",summary:"영화 관람 포인트와 생일·등급 혜택",sourceUrl:"https://www.megabox.co.kr/benefit/membership",benefits:[{title:"메가박스 포인트·쿠폰",detail:"회원 등급 및 영화별 조건 적용",patterns:["메가박스"]}]},
  { key:"membership_lottecinema",issuerName:"롯데컬처웍스",name:"롯데시네마 멤버십",type:"membership",theme:"linear-gradient(135deg,#7F1D1D,#EF4444)",annualFee:"무료",performance:"L.POINT 회원 기준",summary:"영화 관람 L.POINT 적립과 쿠폰",sourceUrl:"https://www.lottecinema.co.kr/",benefits:[{title:"롯데시네마 멤버십 혜택",detail:"L.POINT 적립 및 이벤트 조건 적용",patterns:["롯데시네마"]}]},
];

export const CARD_PRODUCTS: CardProduct[] = [
  {
    key: "card_shinhan_mrlife", issuerName: "신한카드", name: "신한카드 Mr.Life", type: "credit_card",
    imageUrl: "https://www.shinhancard.com/pconts/static/images/card/plate/AUAARH_00_v_f_d.png",
    theme: "linear-gradient(135deg,#101B32,#4875D1)", annualFee: "공식 상품 페이지 확인", performance: "전월 30만원 이상",
    summary: "생활비와 시간대별 소비에 집중한 할인 카드",
    sourceUrl: "https://www.shinhancard.com/pconts/html/card/apply/credit/1187937_2207.html",
    benefits: [
      { title: "편의점·병원·약국 10% 할인", detail: "365일 24시간 적용. 실적 구간별 통합 할인한도 적용", patterns: ["@category:편의점", "@category:병원/약국"] },
      { title: "야간 음식점·카페 10% 할인", detail: "오후 9시~오전 9시 대상 업종 이용 시 적용", patterns: ["@category:음식점", "@category:카페"] },
      { title: "주말 대형마트 10% 할인", detail: "주말 대상 할인마트 이용 시 월 한도 내 적용", patterns: ["@category:마트"] },
    ],
  },
  {
    key: "card_kb_mywish", issuerName: "KB국민카드", name: "My WE:SH 카드", type: "credit_card",
    theme: "linear-gradient(145deg,#5639D9,#9B83FF)", annualFee: "국내·해외 15,000원", performance: "전월 실적 조건 적용",
    summary: "음식·편의점과 선택 생활영역을 할인",
    sourceUrl: "https://card.kbcard.com/CRD/DVIEW/HCAMCXPRICAC0076?mainCC=a",
    benefits: [
      { title: "음식점·편의점 10% 할인", detail: "KB국민카드 업종 분류 및 월 할인한도 기준", patterns: ["@category:음식점", "@category:편의점"] },
      { title: "커피 5% 선택 할인", detail: "먹는데/노는데 진심 선택 서비스에 따라 적용", patterns: ["@category:카페"] },
      { title: "미용실·스포츠 5% 선택 할인", detail: "관리에 진심 선택 시 대상 업종 적용", patterns: ["@category:미용", "@category:헬스/운동"] },
    ],
  },
  {
    key: "card_hyundai_m", issuerName: "현대카드", name: "현대카드M", type: "credit_card",
    imageUrl: "https://img.hyundaicard.com/docfiles/resources/pc/images/detail/bg_top_me4.png",
    theme: "linear-gradient(135deg,#1A1A1A,#5C5C5C)", annualFee: "국내·Visa/Amex 30,000원", performance: "전월 50만원 이상",
    summary: "기본 적립과 온라인쇼핑·외식 우대 적립",
    sourceUrl: "https://www.hyundaicard.com/cpc/cr/CPCCR0201_01.hc?cardWcd=ME4",
    benefits: [
      { title: "국내외 가맹점 1.5% M포인트", detail: "전월 50만원 이상, 적립 한도 제한 없음", patterns: ["@all"] },
      { title: "일반음식점 5% M포인트", detail: "전월 100만원 이상, 대상 영역 통합 월 1만 M포인트 한도", patterns: ["@category:음식점"] },
    ],
  },
  {
    key: "card_lotte_loca12", issuerName: "롯데카드", name: "LOCA LIKIT 1.2", type: "credit_card",
    theme: "linear-gradient(135deg,#101114,#484B53)", annualFee: "국내·해외 10,000원", performance: "전월 실적 없음",
    summary: "오프라인 어디서나 동일한 기본 할인",
    sourceUrl: "https://m.lottecard.co.kr/front/card/basic/credit/info/likit1.2/",
    benefits: [
      { title: "국내 가맹점 1.2% 할인", detail: "실적조건과 할인한도 없이 결제일 할인", patterns: ["@all"] },
    ],
  },
  {
    key: "card_nh_zgm", issuerName: "NH농협카드", name: "zgm 할인카드", type: "credit_card",
    imageUrl: "https://card.nonghyup.com/content/imgs/shopmall/pro_img/card/F107831.png",
    theme: "linear-gradient(135deg,#172A45,#28A878)", annualFee: "국내 27,000원부터", performance: "혜택별 조건 적용",
    summary: "전 가맹점 기본 할인과 생활비 할인",
    sourceUrl: "https://card.nonghyup.com/servlet/IpCc2021R.act?CD_WRS_SQNO=90010515",
    benefits: [
      { title: "국내 가맹점 1% 할인", detail: "생활할인과 중복 시 더 큰 혜택 적용", patterns: ["@all"] },
    ],
  },
  {
    key: "card_hana_wonder_free", issuerName: "하나카드", name: "원더카드 2.0 FREE+", type: "credit_card",
    theme: "linear-gradient(135deg,#009490,#00BFA6)", annualFee: "19,900원", performance: "혜택 조합별 조건 적용",
    summary: "기본 할인에 배달·온라인 생활혜택을 조합",
    sourceUrl: "https://www.hanacard.co.kr/OPI41000000D.web?CD_PD_SEQ=16947&mID=PI41016947P&schID=pcd",
    benefits: [
      { title: "국내외 가맹점 0.8% 할인", detail: "기본 청구할인 기준", patterns: ["@all"] },
      { title: "배달 4% 할인", detail: "배달의민족·요기요·쿠팡이츠 대상", patterns: ["배달의민족", "요기요", "쿠팡이츠"] },
    ],
  },
];

export async function fetchCardProducts(type?: "credit_card" | "debit_card"): Promise<CardProduct[]> {
  try {
    const response = await fetch(`/api/card-catalog${type ? `?type=${type}` : ""}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("catalog unavailable");
    const payload = await response.json();
    const remote = Array.isArray(payload.items) ? payload.items as CardProduct[] : [];
    const unique = new Map<string, CardProduct>();
    for (const card of [...remote, ...CARD_PRODUCTS]) if (!unique.has(card.key)) unique.set(card.key, card);
    return [...unique.values()];
  } catch { return CARD_PRODUCTS.filter(card => !type || card.type === type); }
}

export async function fetchCardProductDetail(detailId: number, detailSource?: CardProduct["detailSource"]): Promise<CardProduct | null> {
  try {
    const response = await fetch(`/api/card-catalog?detailId=${detailId}${detailSource ? `&detailSource=${detailSource}` : ""}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.item as CardProduct;
  } catch { return null; }
}

const LOCAL_KEY = "geumdan_benefit_wallet";

function localRead(): BenefitInstrument[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as BenefitInstrument[]; } catch { return []; }
}

export function getCachedBenefitInstruments(): BenefitInstrument[] { return localRead(); }

export function getStaticMerchantBenefitOffers(): MerchantBenefitOffer[] {
  return [...CARD_PRODUCTS, ...MEMBERSHIP_PRODUCTS].flatMap((card, cardIndex) => card.benefits.map((benefit, benefitIndex) => ({
    id: -1000 - cardIndex * 10 - benefitIndex,
    provider_key: card.key, provider_name: card.name, instrument_type: card.type,
    merchant_patterns: benefit.patterns, benefit_title: benefit.title,
    benefit_detail: `${benefit.detail} · ${card.performance}`, source_url: card.sourceUrl,
  })));
}
function localWrite(rows: BenefitInstrument[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch { /* private mode */ }
}

export async function fetchMyBenefitInstruments(): Promise<BenefitInstrument[]> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session?.user) return localRead();
  const { data, error } = await supabase.from("user_benefit_instruments").select("*").eq("active", true).order("created_at", { ascending: false });
  if (error) return localRead();
  const rows = (data ?? []) as BenefitInstrument[];
  localWrite(rows);
  return rows;
}

export async function addBenefitInstrument(input: Pick<BenefitInstrument, "instrument_type" | "issuer_key" | "issuer_name" | "product_name" | "nickname">) {
  const { data: auth } = await supabase.auth.getSession();
  const user = auth.session?.user;
  if (!user) throw new Error("login_required");
  const { data, error } = await supabase.from("user_benefit_instruments").upsert({ ...input, user_id: user.id, active: true, updated_at: new Date().toISOString() }, { onConflict: "user_id,instrument_type,issuer_key,product_name" }).select().single();
  if (error) {
    const fallback: BenefitInstrument = { ...input, id: crypto.randomUUID(), user_id: user.id, active: true, created_at: new Date().toISOString() };
    localWrite([fallback, ...localRead().filter(item => !(item.issuer_key === fallback.issuer_key && item.product_name === fallback.product_name))]);
    return fallback;
  }
  const row = data as BenefitInstrument;
  localWrite([row, ...localRead().filter(item => item.id !== row.id)]);
  return row;
}

export async function removeBenefitInstrument(id: string) {
  const { error } = await supabase.from("user_benefit_instruments").delete().eq("id", id);
  if (error && !localRead().some(item => item.id === id)) throw error;
  localWrite(localRead().filter(item => item.id !== id));
}

export async function fetchMerchantBenefitOffers(): Promise<MerchantBenefitOffer[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data }, catalog] = await Promise.all([
    supabase.from("merchant_benefit_offers").select("*").eq("active", true).or(`ends_at.is.null,ends_at.gte.${today}`).order("sort_order"),
    fetchCardProducts(),
  ]);
  const rows = (data ?? []) as MerchantBenefitOffer[];
  const cardOffers: MerchantBenefitOffer[] = [...catalog, ...MEMBERSHIP_PRODUCTS].flatMap((card, cardIndex) => card.benefits.map((benefit, benefitIndex) => ({
    id: -1000 - cardIndex * 10 - benefitIndex,
    provider_key: card.key,
    provider_name: card.name,
    instrument_type: card.type,
    merchant_patterns: benefit.patterns,
    benefit_title: benefit.title,
    benefit_detail: `${benefit.detail} · ${card.performance}`,
    source_url: card.sourceUrl,
  })));
  if (rows.length) return [...rows, ...cardOffers.filter(item => !rows.some(row => row.provider_key === item.provider_key && row.benefit_title === item.benefit_title))];
  return [...cardOffers,
    { id: -1, provider_key: "skt_membership", provider_name: "T멤버십", instrument_type: "telecom", merchant_patterns: ["CU", "세븐일레븐"], benefit_title: "편의점 최대 10% 할인", benefit_detail: "등급과 상품에 따라 1,000원당 최대 100원 할인. 결제 전 공식 앱에서 확인하세요.", source_url: "https://www.tworld.co.kr/poc/html/product/TS3.html" },
    { id: -2, provider_key: "skt_membership", provider_name: "T멤버십", instrument_type: "telecom", merchant_patterns: ["파리바게뜨", "뚜레쥬르"], benefit_title: "베이커리 최대 15% 할인", benefit_detail: "브랜드와 회원 등급별 할인율이 다릅니다.", source_url: "https://www.tworld.co.kr/poc/html/product/TS3.html" },
    { id: -3, provider_key: "skt_membership", provider_name: "T멤버십", instrument_type: "telecom", merchant_patterns: ["메가MGC커피", "메가커피"], benefit_title: "메가MGC커피 10~20% 혜택", benefit_detail: "VIP 20%, GOLD·SILVER 10% 기준. 공식 페이지에서 적용 조건을 확인하세요.", source_url: "https://sktmembership.tworld.co.kr/mps/pc-bff/benefitbrand/detail.do?brandId=5393" },
  ];
}

export function matchMerchantBenefits<T extends { id: string; name: string; buildingName?: string; thumbnail_url?: string | null }>(
  instruments: BenefitInstrument[], offers: MerchantBenefitOffer[], stores: T[],
) {
  const keys = new Set(instruments.map(item => item.issuer_key));
  const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
  return offers.filter(offer => keys.has(offer.provider_key)).flatMap(offer =>
    stores.filter(store => offer.merchant_patterns.some(pattern => {
      if (pattern === "@all") return true;
      if (pattern.startsWith("@category:")) return normalize(String((store as T & { category?: string }).category ?? "")) === normalize(pattern.slice(10));
      return normalize(store.name).includes(normalize(pattern));
    }))
      .map(store => ({ offer, store })),
  ).filter((item, index, all) => all.findIndex(other => other.offer.id === item.offer.id && other.store.id === item.store.id) === index);
}

export const BENEFIT_ISSUERS: Record<BenefitInstrumentType, Array<{ key: string; name: string }>> = {
  credit_card: ["신한카드","삼성카드","KB국민카드","현대카드","롯데카드","우리카드","하나카드","NH농협카드","BC카드"].map(name => ({ key: `card_${name}`, name })),
  debit_card: ["신한카드","KB국민카드","우리카드","하나카드","NH농협카드","카카오뱅크","토스뱅크"].map(name => ({ key: `debit_${name}`, name })),
  telecom: [{ key: "skt_membership", name: "SKT T멤버십" }, { key: "kt_membership", name: "KT 멤버십" }, { key: "lgu_membership", name: "LG U+ 멤버십" }],
  membership: ["CJ ONE","L.POINT","해피포인트","신세계포인트","OK캐쉬백","H.Point"].map(name => ({ key: `membership_${name}`, name })),
};
