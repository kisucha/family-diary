import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { upsertNoteSchema } from "@/lib/validations/note";
import { Note } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type NoteSerialized = Omit<Note, "id" | "userId" | "noteDate"> & {
  id: string;
  userId: string;
  noteDate: string;
};

function serializeNote(note: Note): NoteSerialized {
  return {
    ...note,
    id: note.id.toString(),
    userId: note.userId.toString(),
    noteDate: note.noteDate instanceof Date
      ? note.noteDate.toISOString().split("T")[0]
      : String(note.noteDate),
  };
}

// ============================================================================
// GET /api/notes?date=YYYY-MM-DD
// 날짜별 메모 조회. 없으면 null 반환.
// ============================================================================

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  const targetDate = dateParam
    ? new Date(dateParam)
    : new Date(new Date().toISOString().split("T")[0]);

  if (isNaN(targetDate.getTime())) {
    return Response.json({ error: "유효하지 않은 날짜 형식입니다" }, { status: 400 });
  }

  const userId = BigInt(session.user.id);

  const note = await prisma.note.findUnique({
    where: { userId_noteDate: { userId, noteDate: targetDate } },
  });

  return Response.json({ data: note ? serializeNote(note) : null });
}

// ============================================================================
// POST /api/notes
// 메모 upsert (날짜당 1개, UNIQUE 제약)
// ============================================================================

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = upsertNoteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, content, mood, isPublished } = parsed.data;
  const userId = BigInt(session.user.id);
  const noteDate = new Date(date);

  const note = await prisma.note.upsert({
    where: { userId_noteDate: { userId, noteDate } },
    create: {
      userId,
      noteDate,
      content,
      mood,
      isPublished: isPublished ?? true,
    },
    update: {
      content,
      mood,
      isPublished,
    },
  });

  return Response.json({ data: serializeNote(note) }, { status: 201 });
}
