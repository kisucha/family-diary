"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================================
// Props
// ============================================================================

interface CalendarRealtimeProps {
  /**
   * familyId — 채널 네이밍에 사용.
   * undefined인 경우 와일드카드 패턴으로 전체 family-events 채널을 구독.
   * 현재 구현에서는 서버에서 `family-events-{familyId}` 채널로 Broadcast를
   * 발행하므로, 클라이언트는 동일한 채널명을 구독해야 한다.
   * familyId를 Client Component에 노출하려면 page.tsx에서 props로 전달하거나
   * 세션에서 읽어올 수 있다. 여기서는 공통 패턴 채널로 단순화.
   */
  familyId?: string;
  onEventChanged: () => void;
}

// ============================================================================
// CalendarRealtime
//
// UI 없이 Supabase Realtime Broadcast 구독만 담당하는 사이드이펙트 컴포넌트.
// 'event-changed' 이벤트 수신 시 onEventChanged 콜백을 호출한다.
// TanStack Query의 invalidateQueries는 CalendarClient에서 처리.
// ============================================================================

export function CalendarRealtime({ familyId, onEventChanged }: CalendarRealtimeProps) {
  // onEventChanged가 렌더마다 새 참조가 되더라도 채널을 재구독하지 않도록 ref로 보관
  const onEventChangedRef = useRef(onEventChanged);
  onEventChangedRef.current = onEventChanged;

  useEffect(() => {
    // 채널명: familyId가 있으면 특정 채널, 없으면 공통 패턴
    // 서버에서 `family-events-{familyId}` 로 broadcast를 발행하므로
    // 같은 패턴의 채널명으로 구독한다.
    const channelName = familyId
      ? `family-events-${familyId}`
      : "family-events-realtime";

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          // 자신이 보낸 broadcast도 수신할지 여부 (false = 타인 것만)
          self: false,
        },
      },
    });

    channel
      .on("broadcast", { event: "event-changed" }, () => {
        // 이벤트 변경 알림 수신 → 콜백 호출 (CalendarClient에서 invalidateQueries)
        onEventChangedRef.current();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // 구독 성공 — 개발 환경에서만 로그
          if (process.env.NODE_ENV === "development") {
            console.log(`[CalendarRealtime] 채널 구독 완료: ${channelName}`);
          }
        }
        if (status === "CHANNEL_ERROR") {
          console.error(`[CalendarRealtime] 채널 오류: ${channelName}`);
        }
      });

    // cleanup: 컴포넌트 언마운트 또는 familyId 변경 시 채널 제거
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId]); // familyId가 바뀔 때만 재구독

  // 이 컴포넌트는 UI를 렌더링하지 않는다
  return null;
}
