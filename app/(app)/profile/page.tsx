import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditClient } from "./components/ProfileEditClient";

// ============================================================================
// Profile Page — Server Component
// ============================================================================

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = BigInt(session.user.id);

  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  const serializedProfile = profile
    ? {
        ...profile,
        id: profile.id.toString(),
        userId: profile.userId.toString(),
        coreValues: Array.isArray(profile.coreValues)
          ? (profile.coreValues as string[])
          : [],
      }
    : null;

  return (
    <ProfileEditClient
      initialProfile={serializedProfile}
      userName={session.user.name ?? ""}
      userRole={session.user.role ?? "CHILD"}
    />
  );
}
