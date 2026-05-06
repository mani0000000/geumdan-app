"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Bell, Shield, FileText as FileIcon,
  Bus, Train, MapPin, Star, X, Pencil, MessageSquare,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import {
  getOrCreateUserId, getUserProfile, type UserProfile,
} from "@/lib/db/userdata";
import {
  getFavoritePlaces, removeFavoritePlace, type FavoritePlace,
} from "@/lib/db/placeFavorites";
import packageJson from "../../package.json";

const APP_VERSION = packageJson.version;

interface FavStop {
  id: string;
  name: string;
}

interface FavSubway {
  id: string;
  name: string;
  line?: string;
  lineColor?: string;
}

interface MyPost {
  id: string;
  title: string;
  category: string;
  created_at: string;
  comment_count: number;
  like_count: number;
}

function loadFavStops(): FavStop[] {
  if (typeof window === "undefined") return [];
  try {
    const ids: string[] = JSON.parse(localStorage.getItem("favStops") ?? "[]");
    const meta: Record<string, { name?: string }> =
      JSON.parse(localStorage.getItem("favStops_meta") ?? "{}");
    return ids.map(id => ({ id, name: meta[id]?.name ?? id }));
  } catch {
    return [];
  }
}

function loadFavSubways(): FavSubway[] {
  if (typeof window === "undefined") return [];
  try {
    const ids: string[] = JSON.parse(localStorage.getItem("favSubways") ?? "[]");
    const meta: Record<string, { name?: string; line?: string; lineColor?: string }> =
      JSON.parse(localStorage.getItem("favSubways_meta") ?? "{}");
    return ids.map(id => ({
      id,
      name: meta[id]?.name ?? id,
      line: meta[id]?.line,
      lineColor: meta[id]?.lineColor,
    }));
  } catch {
    return [];
  }
}

function saveFavStopIds(ids: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("favStops", JSON.stringify(ids));
  }
}

function saveFavSubwayIds(ids: string[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("favSubways", JSON.stringify(ids));
  }
}

function deleteFavMeta(metaKey: string, id: string) {
  if (typeof window === "undefined") return;
  try {
    const map = JSON.parse(localStorage.getItem(metaKey) ?? "{}");
    delete map[id];
    localStorage.setItem(metaKey, JSON.stringify(map));
  } catch {}
}

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uid, setUid] = useState<string>("");
  const [favStops, setFavStops] = useState<FavStop[]>([]);
  const [favSubways, setFavSubways] = useState<FavSubway[]>([]);
  const [favPlaces, setFavPlaces] = useState<FavoritePlace[]>([]);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);

  const refreshTransport = useCallback(() => {
    setFavStops(loadFavStops());
    setFavSubways(loadFavSubways());
  }, []);

  const refreshPlaces = useCallback(async () => {
    setFavPlaces(await getFavoritePlaces());
  }, []);

  const refreshMyPosts = useCallback(async (userId: string) => {
    if (!userId) return setMyPosts([]);
    try {
      const { data } = await supabase
        .from("community_posts")
        .select("id,title,category,created_at,comment_count,like_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setMyPosts((data ?? []) as MyPost[]);
    } catch {
      setMyPosts([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getOrCreateUserId();
      setUid(id);
      const p = await getUserProfile();
      setProfile(p);
      refreshTransport();
      await Promise.all([refreshPlaces(), refreshMyPosts(id)]);
    })();
  }, [refreshTransport, refreshPlaces, refreshMyPosts]);

  function removeStop(id: string) {
    const next = favStops.filter(s => s.id !== id);
    setFavStops(next);
    saveFavStopIds(next.map(s => s.id));
    deleteFavMeta("favStops_meta", id);
  }

  function removeSubway(id: string) {
    const next = favSubways.filter(s => s.id !== id);
    setFavSubways(next);
    saveFavSubwayIds(next.map(s => s.id));
    deleteFavMeta("favSubways_meta", id);
  }

  async function handleRemovePlace(placeId: string) {
    await removeFavoritePlace(placeId);
    setFavPlaces(prev => prev.filter(f => f.place_id !== placeId));
  }

  const nickname = profile?.nickname ?? "검단주민";
  const dong = profile?.dong ?? "당하동";
  const joinedAt = profile?.joined_at ?? new Date().toISOString().slice(0, 7);
  const uidShort = uid ? uid.slice(0, 8) : "--------";

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="마이페이지" />

      {/* 프로필 카드 */}
      <section className="mx-4 mt-4 mb-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0071e3] to-[#38BDF8] flex items-center justify-center text-white text-[26px] font-black shrink-0">
            {nickname.slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold text-[#1d1d1f] truncate">{nickname}</h2>
            </div>
            <p className="text-[12px] text-[#86868b] mt-0.5 font-mono">#{uidShort}</p>
            <p className="text-[12px] text-[#6e6e73] mt-0.5">
              {dong} · {joinedAt.slice(0, 7)} 가입
            </p>
          </div>
          <button
            onClick={() => router.push("/mypage/edit/")}
            className="shrink-0 h-9 px-3 border border-gray-200 rounded-lg text-[13px] text-[#424245] font-medium active:bg-gray-50 flex items-center gap-1"
          >
            <Pencil size={13} />
            <span>수정</span>
          </button>
        </div>
      </section>

      {/* 즐겨찾기 — 교통 */}
      <section className="mx-4 mb-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star size={15} className="text-[#FBBF24] fill-[#FBBF24]" />
            <h3 className="text-[15px] font-bold text-[#1d1d1f]">즐겨찾는 교통</h3>
          </div>
          <button
            onClick={() => router.push("/transport/")}
            className="text-[12px] text-[#0071e3] font-medium active:opacity-60"
          >
            전체보기
          </button>
        </div>

        {/* 버스정류장 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Bus size={13} className="text-[#3B5BDB]" />
            <span className="text-[12px] font-bold text-[#6e6e73]">버스정류장</span>
            <span className="text-[11px] text-[#86868b]">{favStops.length}</span>
          </div>
          {favStops.length === 0 ? (
            <p className="text-[12px] text-[#86868b] py-2">즐겨찾는 정류장이 없어요</p>
          ) : (
            <div className="space-y-1.5">
              {favStops.map(stop => (
                <div
                  key={stop.id}
                  className="flex items-center bg-gray-50 rounded-lg px-3 py-2.5"
                >
                  <button
                    onClick={() => router.push("/transport/?tab=버스")}
                    className="flex-1 flex items-center gap-2 text-left active:opacity-60"
                  >
                    <Bus size={14} className="text-[#3B5BDB] shrink-0" />
                    <span className="text-[14px] text-[#1d1d1f] truncate">{stop.name}</span>
                  </button>
                  <button
                    onClick={() => removeStop(stop.id)}
                    className="p-1 ml-2 text-[#86868b] active:opacity-60"
                    aria-label="즐겨찾기 해제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 지하철역 */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Train size={13} className="text-[#7048E8]" />
            <span className="text-[12px] font-bold text-[#6e6e73]">지하철역</span>
            <span className="text-[11px] text-[#86868b]">{favSubways.length}</span>
          </div>
          {favSubways.length === 0 ? (
            <p className="text-[12px] text-[#86868b] py-2">즐겨찾는 지하철역이 없어요</p>
          ) : (
            <div className="space-y-1.5">
              {favSubways.map(st => (
                <div
                  key={st.id}
                  className="flex items-center bg-gray-50 rounded-lg px-3 py-2.5"
                >
                  <button
                    onClick={() => router.push("/transport/?tab=지하철")}
                    className="flex-1 flex items-center gap-2 text-left active:opacity-60"
                  >
                    <Train size={14} className="text-[#7048E8] shrink-0" />
                    <span className="text-[14px] text-[#1d1d1f] truncate">{st.name}</span>
                    {st.line && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: st.lineColor ?? "#86868b" }}
                      >
                        {st.line}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => removeSubway(st.id)}
                    className="p-1 ml-2 text-[#86868b] active:opacity-60"
                    aria-label="즐겨찾기 해제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 즐겨찾기 — 가볼만한 곳 */}
      <section className="mx-4 mb-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin size={15} className="text-[#F04452]" />
            <h3 className="text-[15px] font-bold text-[#1d1d1f]">가볼만한 곳</h3>
            <span className="text-[12px] text-[#86868b]">{favPlaces.length}</span>
          </div>
          <button
            onClick={() => router.push("/transport/?tab=가볼만한곳")}
            className="text-[12px] text-[#0071e3] font-medium active:opacity-60"
          >
            전체보기
          </button>
        </div>
        {favPlaces.length === 0 ? (
          <p className="px-4 pb-4 text-[12px] text-[#86868b]">즐겨찾는 장소가 없어요</p>
        ) : (
          <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
            {favPlaces.map(p => (
              <div
                key={p.place_id}
                className="relative bg-gray-50 rounded-lg overflow-hidden border border-gray-100"
              >
                <button
                  onClick={() => router.push("/transport/?tab=가볼만한곳")}
                  className="w-full text-left active:opacity-80"
                >
                  <div className="relative h-24 bg-gradient-to-br from-[#9CA3AF] to-[#D1D5DB]">
                    {p.place_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.place_image_url}
                        alt={p.place_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin size={28} className="text-white opacity-60" />
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-[12px] font-bold text-[#1d1d1f] truncate leading-tight">
                      {p.place_name}
                    </p>
                    {p.place_area && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#e8f1fd] text-[#0071e3]">
                          {p.place_area}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleRemovePlace(p.place_id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center active:opacity-60 backdrop-blur-sm"
                  aria-label="즐겨찾기 해제"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 커뮤니티 내 글 */}
      <section className="mx-4 mb-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={15} className="text-[#7048E8]" />
            <h3 className="text-[15px] font-bold text-[#1d1d1f]">커뮤니티 내 글</h3>
            <span className="text-[12px] text-[#86868b]">{myPosts.length}</span>
          </div>
          <button
            onClick={() => router.push("/community/")}
            className="text-[12px] text-[#0071e3] font-medium active:opacity-60"
          >
            커뮤니티
          </button>
        </div>
        {myPosts.length === 0 ? (
          <p className="px-4 pb-4 text-[12px] text-[#86868b]">작성한 글이 없어요</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {myPosts.map(post => (
              <button
                key={post.id}
                onClick={() => router.push(`/community/detail?id=${post.id}`)}
                className="w-full px-4 py-3 flex items-start gap-2.5 text-left active:bg-gray-50"
              >
                <span className="text-[11px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                  {post.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#86868b]">
                    <span>{post.created_at?.slice(0, 10)}</span>
                    <span>·</span>
                    <span>♥ {post.like_count ?? 0}</span>
                    <span>·</span>
                    <span>💬 {post.comment_count ?? 0}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[#d2d2d7] mt-1.5 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 설정 */}
      <section className="mx-4 mb-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <h3 className="px-4 pt-4 pb-2 text-[13px] font-bold text-[#6e6e73]">설정</h3>
        <div className="divide-y divide-gray-100">
          <button
            onClick={() => router.push("/notifications/")}
            className="w-full flex items-center px-4 py-3.5 active:bg-gray-50"
          >
            <Bell size={17} className="text-[#0071e3] mr-3" />
            <span className="flex-1 text-[14px] text-[#1d1d1f] text-left">알림 설정</span>
            <ChevronRight size={15} className="text-[#d2d2d7]" />
          </button>
          <a
            href="https://geumdan.app/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center px-4 py-3.5 active:bg-gray-50"
          >
            <Shield size={17} className="text-[#6e6e73] mr-3" />
            <span className="flex-1 text-[14px] text-[#1d1d1f] text-left">개인정보 처리방침</span>
            <ChevronRight size={15} className="text-[#d2d2d7]" />
          </a>
          <a
            href="https://geumdan.app/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center px-4 py-3.5 active:bg-gray-50"
          >
            <FileIcon size={17} className="text-[#6e6e73] mr-3" />
            <span className="flex-1 text-[14px] text-[#1d1d1f] text-left">이용약관</span>
            <ChevronRight size={15} className="text-[#d2d2d7]" />
          </a>
          <div className="flex items-center px-4 py-3.5">
            <span className="flex-1 text-[14px] text-[#6e6e73] text-left">앱 버전</span>
            <span className="text-[13px] text-[#86868b] font-mono">v{APP_VERSION}</span>
          </div>
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
