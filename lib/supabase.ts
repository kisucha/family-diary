import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다."
  );
}

/**
 * 브라우저용 Supabase 클라이언트 싱글톤
 *
 * - Client Components 에서 Realtime 구독 (family_events)에 사용
 * - anon key 사용 — RLS 정책으로 접근 제어
 * - 싱글톤 패턴: 여러 컴포넌트에서 import해도 단일 인스턴스 공유
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // NextAuth.js가 인증을 담당하므로 Supabase Auth는 비활성화
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/** family_events 테이블의 Realtime 채널 구독 헬퍼 타입 */
export type FamilyEventPayload = {
  id: number;
  family_id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  event_type: string;
  attendee_user_ids: number[] | null;
  color: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
};
