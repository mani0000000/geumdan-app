import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
}

const sql = await readFile(
  "supabase/migrations/20260823100000_marts_authenticated_read.sql",
  "utf8",
);
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await db.rpc("exec_sql", { query: sql });

if (error) throw new Error(`마트 인증 조회 정책 적용 실패: ${error.message}`);
console.log("마트 인증 사용자 조회 정책 적용 완료");
