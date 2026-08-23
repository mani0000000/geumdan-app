"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Radio, Trophy } from "lucide-react";
import { fetchSportsAssets, fetchUpcomingSportsMatches, type SportsMatch } from "@/lib/db/sports";
import HomeWidgetHeader from "@/components/home/HomeWidgetHeader";

type LocalTeam = {
  id: string;
  dbCode: string;
  name: string;
  short: string;
  sport: string;
  color: string;
  soft: string;
  logo: string;
  venue: string;
  website: string;
  ticket: string;
};

const TEAMS: LocalTeam[] = [
  { id: "united", dbCode: "incheon_utd", name: "인천 유나이티드", short: "인천UTD", sport: "축구", color: "#1557B0", soft: "#EAF2FF", logo: "/images/sports/teams/incheon-united.svg", venue: "인천축구전용경기장", website: "https://www.incheonutd.com/", ticket: "https://www.incheonutd.com/ticket/ticket_intro.php" },
  { id: "landers", dbCode: "ssg_landers", name: "SSG 랜더스", short: "SSG", sport: "야구", color: "#CE0E2D", soft: "#FFF0F2", logo: "/images/sports/teams/ssg-landers.png", venue: "인천SSG랜더스필드", website: "https://www.ssglanders.com/", ticket: "https://www.ssglanders.com/game/ticket" },
  { id: "jumbos", dbCode: "daehan_jumpos", name: "대한항공 점보스", short: "대한항공", sport: "배구(남)", color: "#1676C3", soft: "#EAF7FF", logo: "/images/sports/teams/korean-air-jumbos.jpg", venue: "인천계양체육관", website: "https://www.kal-jumbos.co.kr/", ticket: "https://www.ticketlink.co.kr/sports/volleyball" },
  { id: "spiders", dbCode: "pink_spiders", name: "흥국생명 핑크스파이더스", short: "흥국생명", sport: "배구(여)", color: "#D71969", soft: "#FFF0F7", logo: "/images/sports/teams/pink-spiders.png", venue: "인천삼산월드체육관", website: "https://www.pinkspiders.co.kr/", ticket: "https://www.ticketlink.co.kr/sports/volleyball" },
  { id: "sbirds", dbCode: "shinhan_sbirds", name: "신한은행 에스버드", short: "신한은행", sport: "농구(여)", color: "#164194", soft: "#EEF3FF", logo: "/images/sports/teams/shinhan-sbirds.png", venue: "인천도원체육관", website: "https://www.sbirds.com/", ticket: "https://www.wkbl.or.kr/ticket/" },
];

const KBO_LOGO_ROOT = "https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/fixed";
const DEFAULT_OPPONENT_LOGOS: Record<string, string> = {
  LG: `${KBO_LOGO_ROOT}/emblem_LG.png`, "LG트윈스": `${KBO_LOGO_ROOT}/emblem_LG.png`,
  한화: `${KBO_LOGO_ROOT}/emblem_HH.png`, "한화이글스": `${KBO_LOGO_ROOT}/emblem_HH.png`,
  KIA: `${KBO_LOGO_ROOT}/emblem_HT.png`, "기아": `${KBO_LOGO_ROOT}/emblem_HT.png`, "KIA타이거즈": `${KBO_LOGO_ROOT}/emblem_HT.png`,
  삼성: `${KBO_LOGO_ROOT}/emblem_SS.png`, "삼성라이온즈": `${KBO_LOGO_ROOT}/emblem_SS.png`,
  NC: `${KBO_LOGO_ROOT}/emblem_NC.png`, "NC다이노스": `${KBO_LOGO_ROOT}/emblem_NC.png`,
  KT: `${KBO_LOGO_ROOT}/emblem_KT.png`, "KT위즈": `${KBO_LOGO_ROOT}/emblem_KT.png`,
  롯데: `${KBO_LOGO_ROOT}/emblem_LT.png`, "롯데자이언츠": `${KBO_LOGO_ROOT}/emblem_LT.png`,
  두산: `${KBO_LOGO_ROOT}/emblem_OB.png`, "두산베어스": `${KBO_LOGO_ROOT}/emblem_OB.png`,
  키움: `${KBO_LOGO_ROOT}/emblem_WO.png`, "키움히어로즈": `${KBO_LOGO_ROOT}/emblem_WO.png`,
  SSG: `${KBO_LOGO_ROOT}/emblem_SK.png`, "SSG랜더스": `${KBO_LOGO_ROOT}/emblem_SK.png`,
  서울: "https://www.incheonutd.com/img/2018/emb/md/K09.png",
  광주: "https://www.incheonutd.com/img/2018/emb/md/K22.png",
  포항: "https://www.incheonutd.com/img/2018/emb/md/K03.png",
  대전: "https://www.incheonutd.com/img/2018/emb/md/K10.png",
  안양: "https://www.incheonutd.com/img/2018/emb/md/K14.png",
  김천: "https://www.incheonutd.com/img/2018/emb/md/K35.png",
  울산: "https://www.incheonutd.com/img/2018/emb/md/K01.png",
  부천: "https://www.incheonutd.com/img/2018/emb/md/K26.png",
  전북: "https://www.incheonutd.com/img/2018/emb/md/K05.png",
  제주: "https://www.incheonutd.com/img/2018/emb/md/K04.png",
  강원: "https://www.incheonutd.com/img/2018/emb/md/K21.png",
  김포: "https://www.incheonutd.com/img/2018/emb/md/K29.png",
  한국도로공사: "https://upload.wikimedia.org/wikipedia/en/6/6a/Gyeongbuk_Gimcheon_Hi-pass.png",
  IBK기업은행: "https://upload.wikimedia.org/wikipedia/en/thumb/d/de/Hwaseong_IBK_Altos.svg/1280px-Hwaseong_IBK_Altos.svg.png",
  하나은행: "https://upload.wikimedia.org/wikipedia/en/0/08/Bucheon_KEB-HanaBank.png",
  KB스타즈: "https://upload.wikimedia.org/wikipedia/en/thumb/6/68/Cheongju_KB_Stars.svg/1280px-Cheongju_KB_Stars.svg.png",
};

const FALLBACK: Record<string, SportsMatch[]> = {
  united: [
    { id: "iu-last", sport: "축구", team_code: "incheon_utd", home_team: "인천", away_team: "안양", home_score: 0, away_score: 1, match_date: "2026-07-12T19:30:00+09:00", venue: "인천축구전용경기장", status: "finished", ticket_url: null, broadcast: null, sort_order: 0, active: true },
    { id: "iu-next", sport: "축구", team_code: "incheon_utd", home_team: "인천", away_team: "전북", home_score: null, away_score: null, match_date: "2026-07-18T19:30:00+09:00", venue: "인천축구전용경기장", status: "upcoming", ticket_url: "https://www.incheonutd.com/ticket/ticket_intro.php", broadcast: null, sort_order: 1, active: true },
    { id: "iu-next2", sport: "축구", team_code: "incheon_utd", home_team: "울산", away_team: "인천", home_score: null, away_score: null, match_date: "2026-07-21T19:30:00+09:00", venue: "울산문수축구경기장", status: "upcoming", ticket_url: null, broadcast: null, sort_order: 2, active: true },
  ],
  jumbos: [
    { id: "jumbos-2627-opener", sport: "배구", team_code: "daehan_jumpos", home_team: "대한항공", away_team: "현대캐피탈", home_score: null, away_score: null, match_date: "2026-10-31T14:00:00+09:00", venue: "인천계양체육관", status: "upcoming", ticket_url: "https://www.ticketlink.co.kr/sports/volleyball", broadcast: null, sort_order: 0, active: true },
  ],
  spiders: [
    { id: "spiders-2627-opener", sport: "배구", team_code: "pink_spiders", home_team: "흥국생명", away_team: "SOOP", home_score: null, away_score: null, match_date: "2026-11-01T16:00:00+09:00", venue: "인천삼산월드체육관", status: "upcoming", ticket_url: "https://www.ticketlink.co.kr/sports/volleyball", broadcast: null, sort_order: 0, active: true },
    { id: "ps-last", sport: "배구", team_code: "pink_spiders", home_team: "흥국생명", away_team: "한국도로공사", home_score: 0, away_score: 3, match_date: "2026-03-13T19:00:00+09:00", venue: "인천삼산월드체육관", status: "finished", ticket_url: null, broadcast: null, sort_order: 0, active: true },
    { id: "ps-last2", sport: "배구", team_code: "pink_spiders", home_team: "흥국생명", away_team: "IBK기업은행", home_score: 3, away_score: 2, match_date: "2026-03-10T19:00:00+09:00", venue: "인천삼산월드체육관", status: "finished", ticket_url: null, broadcast: null, sort_order: 1, active: true },
  ],
  sbirds: [
    { id: "sb-futures-0731", sport: "농구", team_code: "shinhan_sbirds", home_team: "우리은행", away_team: "신한은행", home_score: 59, away_score: 64, match_date: "2026-07-31T12:00:00+09:00", venue: "2026 WKBL 퓨처스리그", status: "finished", ticket_url: null, broadcast: "date-only", sort_order: 0, active: true },
    { id: "sb-futures-0730", sport: "농구", team_code: "shinhan_sbirds", home_team: "신한은행", away_team: "베트남", home_score: 105, away_score: 27, match_date: "2026-07-30T12:00:00+09:00", venue: "2026 WKBL 퓨처스리그", status: "finished", ticket_url: null, broadcast: "date-only", sort_order: 1, active: true },
    { id: "sb-last", sport: "농구", team_code: "shinhan_sbirds", home_team: "신한은행", away_team: "하나은행", home_score: 77, away_score: 53, match_date: "2026-04-01T19:00:00+09:00", venue: "인천도원체육관", status: "finished", ticket_url: null, broadcast: null, sort_order: 0, active: true },
    { id: "sb-last2", sport: "농구", team_code: "shinhan_sbirds", home_team: "신한은행", away_team: "KB스타즈", home_score: 77, away_score: 55, match_date: "2026-03-23T19:00:00+09:00", venue: "인천도원체육관", status: "finished", ticket_url: null, broadcast: null, sort_order: 1, active: true },
  ],
};

const STALE_MATCH_CUTOFF = Date.now() - 12 * 60 * 60 * 1000;

function dateLabel(value: string) {
  const d = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function TeamMark({ team, selected = false }: { team: LocalTeam; selected?: boolean }) {
  return (
    <span className="grid h-[60px] w-[60px] shrink-0 place-items-center overflow-visible rounded-[20px] bg-white p-2 shadow-[0_5px_18px_rgba(31,41,55,.10)] transition-all duration-200"
      style={{ boxShadow: selected ? `0 0 0 2px ${team.color}, 0 7px 20px ${team.color}2b` : undefined }}>
      <span className="relative block h-full w-full">
        <Image src={team.logo} alt={`${team.name} 로고`} fill sizes="44px" className="object-contain" />
      </span>
    </span>
  );
}

function normalizeTeamName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function resolveLocalTeam(name: string, selected: LocalTeam) {
  const normalized = normalizeTeamName(name);
  if (normalized === "인천" || normalized.includes(normalizeTeamName(selected.short))) return selected;
  return TEAMS.find((candidate) => {
    const aliases = [candidate.name, candidate.short, candidate.dbCode, candidate.id].map(value => value.replace(/\s+/g, "").toLowerCase());
    return aliases.some(alias => normalized.includes(alias) || alias.includes(normalized));
  });
}

function resolveOpponentLogo(name: string, logos: Record<string, string>) {
  const normalized = normalizeTeamName(name);
  const merged = { ...DEFAULT_OPPONENT_LOGOS, ...logos };
  const direct = Object.entries(merged).find(([alias]) => {
    const key = normalizeTeamName(alias);
    return normalized === key || normalized.includes(key) || key.includes(normalized);
  });
  return direct?.[1];
}

function MatchClub({ name, selected, align, opponentLogos }: { name: string; selected: LocalTeam; align: "left" | "right"; opponentLogos: Record<string, string> }) {
  const club = resolveLocalTeam(name, selected);
  const logo = club?.logo ?? resolveOpponentLogo(name, opponentLogos);
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 ${align === "left" ? "sm:items-start" : "sm:items-end"}`}>
      <span className="relative grid h-[62px] w-[62px] place-items-center overflow-hidden rounded-[20px] bg-white p-2 shadow-[0_8px_22px_rgba(0,0,0,.16)]">
        {logo ? (
          <span className="relative block h-full w-full"><Image src={logo} alt={`${name} 로고`} fill sizes="46px" className="object-contain" /></span>
        ) : (
          <Trophy size={25} className="text-[#98A2B3]" />
        )}
      </span>
      <p className="line-clamp-2 min-h-9 w-full text-center text-[14px] font-black leading-[18px] text-white">{name}</p>
    </div>
  );
}

function MiniClubMark({ name, selected, opponentLogos }: { name: string; selected: LocalTeam; opponentLogos: Record<string, string> }) {
  const club = resolveLocalTeam(name, selected);
  const logo = club?.logo ?? resolveOpponentLogo(name, opponentLogos);
  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[#F5F7FA] p-1">
      {logo ? (
        <span className="relative block h-full w-full"><Image src={logo} alt={`${name} 로고`} fill sizes="24px" className="object-contain" /></span>
      ) : (
        <Trophy size={13} className="text-[#B0B8C1]" />
      )}
    </span>
  );
}

export default function IncheonSports({ compact = false }: { compact?: boolean }) {
  const [selectedId, setSelectedId] = useState("united");
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [opponentLogos, setOpponentLogos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const team = TEAMS.find((item) => item.id === selectedId) ?? TEAMS[0];

  useEffect(() => {
    Promise.all([
      fetchUpcomingSportsMatches(120),
      fetch("/api/sports").then((response) => response.ok ? response.json() : { matches: [] }).then((json) => (json.matches ?? []) as SportsMatch[]).catch(() => [] as SportsMatch[]),
      fetchSportsAssets(),
    ]).then(([stored, official, assets]) => {
      setMatches([...official, ...stored]);
      setOpponentLogos(assets.awayTeamLogos);
      setLoading(false);
    });
  }, []);

  const teamMatches = useMemo(() => {
    const live = matches.filter((match) => match.team_code === team.dbCode || match.home_team.includes(team.short) || match.away_team.includes(team.short));
    const merged = [...(FALLBACK[team.id] ?? []), ...live];
    const seen = new Set<string>();
    return merged.filter((match) => {
      if ((match.status === "upcoming" || match.status === "live") && +new Date(match.match_date) < STALE_MATCH_CUTOFF) return false;
      const key = `${match.home_team}|${match.away_team}|${match.match_date.slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [matches, team]);
  const upcoming = teamMatches.filter((match) => match.status === "upcoming" || match.status === "live").sort((a, b) => +new Date(a.match_date) - +new Date(b.match_date));
  const finished = teamMatches.filter((match) => match.status === "finished").sort((a, b) => +new Date(b.match_date) - +new Date(a.match_date));
  const latestFinishedIsRecent = finished[0] && Date.now() - +new Date(finished[0].match_date) < 45 * 24 * 60 * 60 * 1000;
  const hero = upcoming[0] ?? ((!compact || latestFinishedIsRecent) ? finished[0] : undefined);

  return (
    <section className={compact ? "mb-5" : "pb-8"}>
      {compact ? (
        <HomeWidgetHeader title="우리 동네 스포츠" description="인천 연고팀의 다음 경기와 최근 결과" icon={Trophy}
          iconColor="#1557B0" iconBackground="#EAF2FF" href="/sports" />
      ) : (
        <div className="mb-3 px-5"><h2 className="text-[22px] font-black tracking-[-.04em] text-[#1d1d1f]">우리 동네 스포츠</h2></div>
      )}

      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-5 pb-4 pt-1" role="tablist" aria-label="인천 연고팀">
        {TEAMS.map((item) => {
          const selected = item.id === team.id;
          return (
            <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} role="tab" aria-selected={selected}
              className="flex min-w-[68px] flex-col items-center gap-1.5 pt-0.5 transition-transform active:scale-95">
              <TeamMark team={item} selected={selected}/>
              <span className="max-w-[72px] truncate text-[11px] font-black" style={{ color: selected ? item.color : "#6e6e73" }}>{item.short}</span>
              <span className="text-[10px] text-[#9a9aa0]">{item.sport}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-5 overflow-hidden rounded-[24px] text-white" style={{ backgroundColor: team.color }}>
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-black">{hero?.status === "finished" ? "최근 경기" : "다음 경기"}</span>
            {hero?.status === "live" && <span className="flex items-center gap-1 text-[11px] font-black"><Radio size={12}/> LIVE</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/72">{team.sport}</span>
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white p-1.5 shadow-sm">
              <span className="relative block h-full w-full"><Image src={team.logo} alt="" fill sizes="28px" className="object-contain" /></span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[138px] animate-pulse bg-white/5" />
        ) : hero ? (
          <div className="px-5 pb-4 pt-3">
            <div className="grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-center gap-2">
              <MatchClub name={hero.home_team} selected={team} align="left" opponentLogos={opponentLogos} />
              <div className="text-center">
                {hero.status === "finished" ? (
                  <p className="text-[30px] font-black tracking-[-.06em]">{hero.home_score} <span className="text-white/45">:</span> {hero.away_score}</p>
                ) : (
                  <><p className="text-[12px] font-bold text-white/70">{dateLabel(hero.match_date)}</p><p className="text-[26px] font-black tracking-[-.04em]">{timeLabel(hero.match_date)}</p></>
                )}
              </div>
              <MatchClub name={hero.away_team} selected={team} align="right" opponentLogos={opponentLogos} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/16 pt-3 text-[11px] font-bold text-white/76">
              <span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin size={13}/>{hero.venue || team.venue}</span>
              <div className="ml-3 flex shrink-0 items-center gap-1.5">
                <a href={team.website} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-2.5 py-1.5 font-black text-white">홈페이지</a>
                <a href={hero.ticket_url || team.ticket} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-1.5 font-black" style={{ color: team.color }}>예매</a>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-7">
            <p className="text-[17px] font-black">새 시즌 공식 일정 발표 대기</p>
            <p className="mt-1 text-[12px] text-white/72">지난 일정 대신 구단이 발표한 다음 경기만 표시합니다.</p>
            {finished[0] && <p className="mt-3 text-[11px] font-bold text-white/65">최근 경기 {dateLabel(finished[0].match_date)} · {finished[0].home_team} {finished[0].home_score}:{finished[0].away_score} {finished[0].away_team}</p>}
          </div>
        )}
      </div>

      {!compact && (
        <div className="mx-5 mt-5">
          <div className="mb-3 flex items-center gap-2"><CalendarDays size={18} color={team.color}/><h3 className="text-[17px] font-black text-[#1d1d1f]">일정과 결과</h3></div>
          <div className="overflow-hidden rounded-[20px] bg-white">
            {[...upcoming, ...finished].slice(0, 12).map((match, index) => (
              <div key={match.id} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t border-[#ececf0]" : ""}`}>
                <div className="w-12 shrink-0 text-center"><p className="text-[11px] font-bold text-[#86868b]">{dateLabel(match.match_date)}</p><p className="text-[13px] font-black text-[#1d1d1f]">{match.broadcast === "date-only" ? "결과" : timeLabel(match.match_date)}</p></div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <MiniClubMark name={match.home_team} selected={team} opponentLogos={opponentLogos} />
                    <p className="truncate text-[13px] font-black text-[#1d1d1f]">{match.home_team}</p>
                    <span className="shrink-0 text-[10px] font-black text-[#B0B8C1]">VS</span>
                    <MiniClubMark name={match.away_team} selected={team} opponentLogos={opponentLogos} />
                    <p className="truncate text-[13px] font-black text-[#1d1d1f]">{match.away_team}</p>
                  </div>
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-[#86868b]"><MapPin size={10}/>{match.venue || team.venue}</p>
                </div>
                {match.status === "finished" ? <span className="text-[17px] font-black" style={{ color: team.color }}>{match.home_score}:{match.away_score}</span> : <span className="rounded-full px-2.5 py-1 text-[11px] font-black" style={{ background: team.soft, color: team.color }}>예정</span>}
              </div>
            ))}
            {!teamMatches.length && <div className="px-5 py-10 text-center"><Trophy className="mx-auto text-[#c7c7cc]"/><p className="mt-3 text-[13px] font-bold text-[#86868b]">공식 일정 발표를 기다리고 있어요</p></div>}
          </div>
        </div>
      )}
    </section>
  );
}
