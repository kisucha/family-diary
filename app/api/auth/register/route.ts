import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  token: z.string().min(1, "초대 토큰이 필요합니다."),
  name: z.string().min(1, "이름을 입력해주세요.").max(100, "이름은 100자 이하여야 합니다."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
    .max(100, "비밀번호는 100자 이하여야 합니다."),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Body 파싱
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "요청 본문을 파싱할 수 없습니다." },
        { status: 400 }
      );
    }

    // 2. Zod 검증
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "입력값이 올바르지 않습니다.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { token, name, email, password } = parsed.data;

    // 3. 토큰 검증 Step 1 — 존재 여부
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
    });
    if (!inviteToken) {
      return Response.json(
        { error: "유효하지 않은 초대 토큰입니다." },
        { status: 404 }
      );
    }

    // 4. 토큰 검증 Step 2 — 이미 사용된 토큰
    if (inviteToken.usedAt !== null) {
      return Response.json(
        { error: "이미 사용된 초대 토큰입니다." },
        { status: 409 }
      );
    }

    // 5. 토큰 검증 Step 3 — 만료 여부
    if (inviteToken.expiresAt < new Date()) {
      return Response.json(
        { error: "만료된 초대 토큰입니다. 관리자에게 새 초대 링크를 요청해주세요." },
        { status: 410 }
      );
    }

    // 6. 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return Response.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }

    // 7. 비밀번호 해시 (saltRounds: 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // 8. 트랜잭션: 사용자 생성 + 프로필 생성 + 토큰 사용 처리
    const newUser = await prisma.$transaction(async (tx) => {
      // 8-1. 사용자 생성
      const user = await tx.user.create({
        data: {
          familyId: inviteToken.familyId,
          email,
          passwordHash,
          name,
          // InviteRole(PARENT/CHILD) → UserRole(PARENT/CHILD) 매핑
          role: inviteToken.intendedRole === "PARENT" ? "PARENT" : "CHILD",
          isActive: true,
        },
      });

      // 8-2. 빈 프로필 생성 (1:1 관계 초기화)
      await tx.profile.create({
        data: {
          userId: user.id,
        },
      });

      // 8-3. 초대 토큰 사용 처리
      await tx.inviteToken.update({
        where: { id: inviteToken.id },
        data: {
          usedAt: new Date(),
          usedByUserId: user.id,
        },
      });

      return user;
    });

    // 9. 응답 (BigInt → string 직렬화)
    return Response.json(
      {
        data: {
          user: {
            id: newUser.id.toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register] 오류:", error);
    return Response.json(
      { error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
