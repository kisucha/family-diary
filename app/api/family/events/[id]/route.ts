import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ============================================================================
// DELETE /api/family/events/:id
// 가족 이벤트 삭제
// - 본인이 생성한 이벤트이거나 admin인 경우만 삭제 가능
// - 삭제 후 Supabase Broadcast 발행
// ============================================================================

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const eventId = BigInt(params.id);
  if (isNaN(Number(params.id)) || Number(params.id) <= 0) {
    return Response.json(
      { error: "올바르지 않은 이벤트 ID입니다" },
      { status: 400 }
    );
  }

  const userId = BigInt(session.user.id);
  const familyId = BigInt(session.user.familyId);
  const userRole = session.user.role; // "admin" | "parent" | "child"

  try {
    // 이벤트 존재 여부 및 소속 가족 확인
    const event = await prisma.familyEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        familyId: true,
        createdByUserId: true,
      },
    });

    if (!event) {
      return Response.json({ error: "이벤트를 찾을 수 없습니다" }, { status: 404 });
    }

    // 같은 가족의 이벤트인지 검증 (다른 가족의 이벤트 삭제 방지)
    if (event.familyId !== familyId) {
      return Response.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 삭제 권한 검증: 본인 생성 또는 admin만 가능
    const isOwner = event.createdByUserId === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isAdmin) {
      return Response.json(
        { error: "본인이 생성한 이벤트이거나 관리자만 삭제할 수 있습니다" },
        { status: 403 }
      );
    }

    await prisma.familyEvent.delete({ where: { id: eventId } });

    // Supabase Broadcast: 실제 Supabase URL이 설정된 경우에만 발행
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const isRealSupabase = supabaseUrl.includes(".supabase.co") && !supabaseUrl.includes("placeholder");
    if (isRealSupabase) {
      try {
        await supabaseAdmin
          .channel(`family-events-${familyId.toString()}`)
          .send({
            type: "broadcast",
            event: "event-changed",
            payload: { action: "deleted", eventId: eventId.toString() },
          });
      } catch (broadcastError) {
        console.warn("[DELETE /api/family/events/:id] Broadcast 실패:", broadcastError);
      }
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/family/events/:id] DB 오류:", error);
    return Response.json({ error: "이벤트 삭제에 실패했습니다" }, { status: 500 });
  }
}
