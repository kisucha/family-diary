import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ============================================================================
// GET /api/notes/list
// 작성된 일기 목록 반환 (날짜, 기분, 첫 줄 미리보기)
// ============================================================================

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  const notes = await prisma.note.findMany({
    where: {
      userId,
      content: { not: null },
    },
    select: {
      noteDate: true,
      content: true,
      mood: true,
    },
    orderBy: { noteDate: "desc" },
    take: 200,
  });

  const data = notes.map((n) => {
    const firstLine = n.content
      ? n.content.replace(/^#+\s*/gm, "").split("\n").find((l) => l.trim()) ?? ""
      : "";
    return {
      noteDate: n.noteDate instanceof Date
        ? n.noteDate.toISOString().split("T")[0]
        : String(n.noteDate),
      mood: n.mood,
      preview: firstLine.slice(0, 60),
    };
  });

  return Response.json({ data });
}
