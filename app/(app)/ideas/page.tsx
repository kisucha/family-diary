import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { IdeaMemo } from "@prisma/client";
import { IdeasClient } from "./components/IdeasClient";

export type SerializedIdea = {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: unknown;
  colorTag: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

function serializeIdea(item: IdeaMemo): SerializedIdea {
  return {
    ...item,
    id: item.id.toString(),
    userId: item.userId.toString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export default async function IdeasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = BigInt(session.user.id);

  const ideas = await prisma.ideaMemo.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <IdeasClient initialIdeas={ideas.map(serializeIdea)} />
  );
}
