import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MembersClient } from "./components/MembersClient";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const familyId = BigInt(session.user.familyId);

  const members = await prisma.user.findMany({
    where: { familyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      colorTag: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const serialized = members.map((m) => ({
    ...m,
    id: m.id.toString(),
    lastLoginAt: m.lastLoginAt ? m.lastLoginAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <MembersClient
      initialMembers={serialized}
      currentUserId={session.user.id}
    />
  );
}
