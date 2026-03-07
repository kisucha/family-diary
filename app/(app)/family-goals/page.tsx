import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FamilyGoalsClient } from "./components/FamilyGoalsClient";

export default async function FamilyGoalsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const familyId = BigInt(session.user.familyId);

  const [goals, members] = await Promise.all([
    prisma.familyGoal.findMany({
      where: { familyId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { familyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedGoals = goals.map((g) => {
    const { contributorUserIds, ...rest } = g;
    return {
      ...rest,
      id: g.id.toString(),
      familyId: g.familyId.toString(),
      createdByUserId: g.createdByUserId.toString(),
      periodStartDate: g.periodStartDate instanceof Date
        ? g.periodStartDate.toISOString().split("T")[0]
        : String(g.periodStartDate),
      periodEndDate: g.periodEndDate instanceof Date
        ? g.periodEndDate.toISOString().split("T")[0]
        : String(g.periodEndDate),
      createdBy: { id: g.createdBy.id.toString(), name: g.createdBy.name },
      contributorUserIds: Array.isArray(contributorUserIds)
        ? (contributorUserIds as string[])
        : null,
    };
  });

  const serializedMembers = members.map((m) => ({
    id: m.id.toString(),
    name: m.name,
  }));

  return (
    <FamilyGoalsClient
      initialGoals={serializedGoals}
      userId={session.user.id}
      userRole={session.user.role}
      familyMembers={serializedMembers}
    />
  );
}
