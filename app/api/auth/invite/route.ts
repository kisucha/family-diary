import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const inviteBodySchema = z.object({
  intendedRole: z.enum(["PARENT", "CHILD"]).optional().default("CHILD"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. 세션 확인 및 ADMIN 권한 검증
    const session = await auth();
    if (!session) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return Response.json(
        { error: "초대 토큰 생성은 관리자만 가능합니다." },
        { status: 403 }
      );
    }

    // 2. Body 파싱 및 검증
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = inviteBodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "요청 데이터가 올바르지 않습니다.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { intendedRole } = parsed.data;

    // 3. 64자 토큰 생성 (32 bytes hex)
    const token = crypto.randomBytes(32).toString("hex");

    // 4. 만료 시간: 현재 시각 + 48시간
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 5. DB에 토큰 저장
    const inviteToken = await prisma.inviteToken.create({
      data: {
        familyId: BigInt(session.user.familyId),
        createdByUserId: BigInt(session.user.id),
        token,
        intendedRole: intendedRole === "PARENT" ? "PARENT" : "CHILD",
        expiresAt,
      },
    });

    // 6. 초대 URL 구성
    const baseUrl =
      process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const inviteUrl = `${baseUrl}/register?token=${token}`;

    return Response.json(
      {
        data: {
          token: inviteToken.token,
          inviteUrl,
          expiresAt: inviteToken.expiresAt.toISOString(),
          intendedRole: inviteToken.intendedRole,
          id: inviteToken.id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/invite] 오류:", error);
    return Response.json(
      { error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
