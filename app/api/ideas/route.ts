import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createIdeaSchema } from "@/lib/validations/idea";
import { IdeaMemo } from "@prisma/client";

function serializeIdea(item: IdeaMemo) {
  return {
    ...item,
    id: item.id.toString(),
    userId: item.userId.toString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// GET /api/ideas?category=&search=&page=1
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const userId = BigInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const ideas = await prisma.ideaMemo.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { content: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return Response.json({ data: ideas.map(serializeIdea) });
}

// POST /api/ideas
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }
  const userId = BigInt(session.user.id);
  const body = await request.json();
  const parsed = createIdeaSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const idea = await prisma.ideaMemo.create({
    data: {
      userId,
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      category: parsed.data.category ?? null,
      tags: parsed.data.tags ?? undefined,
      colorTag: parsed.data.colorTag ?? null,
      isPinned: parsed.data.isPinned ?? false,
    },
  });

  return Response.json({ data: serializeIdea(idea) }, { status: 201 });
}
