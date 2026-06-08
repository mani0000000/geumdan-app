export type OutdoorType = "해루질" | "민물낚시" | "바다낚시";

export interface OutdoorSpot {
  id: string;
  type: OutdoorType;
  name: string;
  area: string;
  distKm: number;
  driveMin: number;
  species: string[];
  safety: number;
  tips: string;
  seasonal: string;
  regulation: string | null;
  boat: boolean;
  lat: number;
  lng: number;
}

export const OUTDOOR_SPOTS: OutdoorSpot[] = [
  { id: "h1", type: "해루질", name: "영종도 마시안해변",  area: "영종도",  distKm: 25, driveMin: 35, species: ["백합", "바지락", "소라"],          safety: 5, tips: "갯벌체험장·장비대여 완비. 가족 체험 최적.",         seasonal: "4~10월", regulation: null,                    boat: false, lat: 37.4985, lng: 126.4622 },
  { id: "h2", type: "해루질", name: "강화도 동막해변",    area: "강화도",  distKm: 30, driveMin: 40, species: ["바지락", "박하지", "꽃게", "소라"], safety: 5, tips: "수도권 최고 명소. 2025 갯벌놀이터 조성.",       seasonal: "4~10월", regulation: "꽃게 6/21~8/20 금어기",  boat: false, lat: 37.6046, lng: 126.3896 },
  { id: "h3", type: "해루질", name: "강화도 마니산해변",  area: "강화도",  distKm: 45, driveMin: 55, species: ["바지락", "소라", "골뱅이"],          safety: 4, tips: "한적한 환경. 편의시설 부족, 물·음식 준비 필수.", seasonal: "4~10월", regulation: null,                    boat: false, lat: 37.5456, lng: 126.3815 },
  { id: "h4", type: "해루질", name: "장봉도 갯벌",        area: "장봉도",  distKm: 50, driveMin: 80, species: ["소라", "낙지", "박하지", "꽃게"],    safety: 3, tips: "삼목선착장→장봉도 배 40분. 조과 최고.",         seasonal: "5~9월",  regulation: "낙지 5/11~6/30 금어기", boat: true,  lat: 37.5862, lng: 126.3382 },
  { id: "h5", type: "해루질", name: "영흥도 십리포해변",  area: "영흥도",  distKm: 70, driveMin: 80, species: ["바지락", "동죽", "소라"],            safety: 4, tips: "넓은 갯벌, 여유롭게 체험 가능.",                seasonal: "4~10월", regulation: "바지락 5/1~6/30 금어기", boat: false, lat: 37.2543, lng: 126.4879 },
  { id: "f1", type: "민물낚시", name: "검단수로",          area: "검단",    distKm:  5, driveMin: 10, species: ["붕어", "배스", "가물치", "장어", "메기"], safety: 5, tips: "무료·주차 가능. 검단에서 가장 가까운 포인트.", seasonal: "연중",   regulation: "금어기 4/20~6/10",     boat: false, lat: 37.5636, lng: 126.6985 },
  { id: "f2", type: "민물낚시", name: "계양 굴포천",       area: "계양",    distKm: 12, driveMin: 15, species: ["붕어", "잉어", "배스"],              safety: 5, tips: "무료. 도심 접근성 최고.",                         seasonal: "연중",   regulation: null,                    boat: false, lat: 37.5441, lng: 126.7241 },
  { id: "f3", type: "바다낚시", name: "영종도 을왕리",     area: "영종도",  distKm: 32, driveMin: 40, species: ["우럭", "망둥어", "감성돔", "장어"],   safety: 4, tips: "원투·루어낚시. 방파제 포인트 다수.",             seasonal: "4~11월", regulation: null,                    boat: false, lat: 37.4752, lng: 126.4013 },
  { id: "f4", type: "바다낚시", name: "무의도 갯바위",     area: "영종도",  distKm: 40, driveMin: 50, species: ["광어", "농어", "갑오징어", "쭈꾸미"], safety: 4, tips: "무의대교 연결. 11개 갯바위 포인트. 루어낚시 인기.", seasonal: "4~11월", regulation: null,                    boat: false, lat: 37.4271, lng: 126.4094 },
  { id: "f5", type: "바다낚시", name: "장봉도 갯바위",     area: "장봉도",  distKm: 50, driveMin: 80, species: ["우럭", "감성돔", "광어", "농어"],    safety: 3, tips: "배편 이용 필요. 조용하고 한적.",                  seasonal: "4~11월", regulation: null,                    boat: true,  lat: 37.5862, lng: 126.3382 },
];
