import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NoteEditorClient } from "./components/NoteEditorClient";
import { todayKST } from "@/lib/utils";

// ============================================================================
// Notes Page — Server Component
// ============================================================================

export default async function NotesPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = BigInt(session.user.id);

  const dateParam = searchParams.date;
  const today = todayKST();
  const targetDateStr = dateParam ?? today;
  const targetDate = new Date(targetDateStr);

  const [note, checkin] = await Promise.all([
    prisma.note.findUnique({
      where: { userId_noteDate: { userId, noteDate: targetDate } },
    }),
    prisma.emotionCheckin.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: targetDate } },
    }),
  ]);

  const serializedNote = note
    ? {
        ...note,
        id: note.id.toString(),
        userId: note.userId.toString(),
        noteDate: note.noteDate instanceof Date
          ? note.noteDate.toISOString().split("T")[0]
          : String(note.noteDate),
      }
    : null;

  const serializedCheckin = checkin
    ? {
        id: checkin.id.toString(),
        userId: checkin.userId.toString(),
        checkinDate: checkin.checkinDate instanceof Date
          ? checkin.checkinDate.toISOString().split("T")[0]
          : String(checkin.checkinDate),
        primaryEmotion: checkin.primaryEmotion,
        emotionScore: checkin.emotionScore,
        physicalCondition: checkin.physicalCondition,
        sleepQuality: checkin.sleepQuality,
        sleepHours: checkin.sleepHours !== null ? Number(checkin.sleepHours) : null,
        exerciseMinutes: checkin.exerciseMinutes,
        notes: checkin.notes,
        isPublished: checkin.isPublished,
      }
    : null;

  return (
    <NoteEditorClient
      initialDate={targetDateStr}
      initialNote={serializedNote}
      initialCheckin={serializedCheckin}
    />
  );
}
