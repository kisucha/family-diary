import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/profile";
import { Profile } from "@prisma/client";

// ============================================================================
// BigInt JSON 직렬화 헬퍼
// ============================================================================

type ProfileSerialized = Omit<Profile, "id" | "userId"> & {
  id: string;
  userId: string;
  coreValues: string[];
};

function serializeProfile(profile: Profile): ProfileSerialized {
  return {
    ...profile,
    id: profile.id.toString(),
    userId: profile.userId.toString(),
    coreValues: Array.isArray(profile.coreValues)
      ? (profile.coreValues as string[])
      : [],
  };
}

// ============================================================================
// GET /api/profile
// 내 프로필 조회
// ============================================================================

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  return Response.json({ data: profile ? serializeProfile(profile) : null });
}

// ============================================================================
// PUT /api/profile
// 프로필 upsert
// ============================================================================

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "입력값이 올바르지 않습니다", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { personalMission, coreValues, rolesResponsibilities, longTermVision, bio } = parsed.data;
  const userId = BigInt(session.user.id);

  const profile = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      personalMission,
      coreValues: coreValues ?? [],
      rolesResponsibilities,
      longTermVision,
      bio,
    },
    update: {
      personalMission,
      coreValues: coreValues ?? [],
      rolesResponsibilities,
      longTermVision,
      bio,
    },
  });

  return Response.json({ data: serializeProfile(profile) });
}
