import { createClient } from "@supabase/supabase-js";

/**
 * 서버 사이드 전용 Supabase Admin 클라이언트
 *
 * - API Routes에서 Realtime Broadcast 발행 시 사용
 * - service_role key 사용 → RLS 우회 가능 (서버에서만 사용할 것)
 * - 이 파일은 절대 Client Component에서 import하지 말 것
 *   ("use client" 파일에서 import 시 service_role key가 브라우저에 노출됨)
 *
 * @example
 * // API Route에서 가족 이벤트 생성 후 Broadcast
 * import { supabaseAdmin } from "@/lib/supabase-admin";
 *
 * await supabaseAdmin.channel("family-events").send({
 *   type: "broadcast",
 *   event: "event-created",
 *   payload: newEvent,
 * });
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// service_role key가 없으면 anon key로 fallback
// (로컬 개발 환경에서 service_role 없이도 동작하도록)
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // 서버 사이드에서는 세션/토큰 관리 불필요
    persistSession: false,
    autoRefreshToken: false,
  },
});
