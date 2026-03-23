"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const registerSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요.").max(100, "이름은 100자 이하여야 합니다."),
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
      .max(100, "비밀번호는 100자 이하여야 합니다."),
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요."),
    telegramBotToken: z.string().max(200).optional().or(z.literal("")),
    telegramChatId: z.string().max(50).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  token: string;
}

export default function RegisterForm({ token }: RegisterFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: values.name,
          email: values.email,
          password: values.password,
          telegramBotToken: values.telegramBotToken || undefined,
          telegramChatId: values.telegramChatId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        // HTTP 상태 코드별 사용자 친화적 메시지
        const message: Record<number, string> = {
          400: json.error ?? "입력값을 다시 확인해주세요.",
          404: "유효하지 않은 초대 토큰입니다. 관리자에게 문의해주세요.",
          409: json.error ?? "이미 사용된 초대 토큰이거나 이미 가입된 이메일입니다.",
          410: "만료된 초대 토큰입니다. 관리자에게 새 초대 링크를 요청해주세요.",
          500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
        setServerError(message[res.status] ?? json.error ?? "알 수 없는 오류가 발생했습니다.");
        return;
      }

      // 회원가입 성공 — 로그인 페이지로 이동 (성공 메시지 파라미터 포함)
      router.push("/login?registered=1");
    } catch {
      setServerError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">
              가족 구성원 등록
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              FamilyPlanner에 오신 것을 환영합니다
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* 서버 에러 메시지 */}
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          {/* 이름 */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-700">
              이름
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              autoComplete="name"
              disabled={isLoading}
              {...register("name")}
              className={errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* 이메일 */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="family@example.com"
              autoComplete="email"
              disabled={isLoading}
              {...register("email")}
              className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-700">
              비밀번호
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="8자 이상 입력하세요"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("password")}
              className={errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="space-y-1.5">
            <Label htmlFor="passwordConfirm" className="text-slate-700">
              비밀번호 확인
            </Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("passwordConfirm")}
              className={
                errors.passwordConfirm ? "border-red-400 focus-visible:ring-red-400" : ""
              }
            />
            {errors.passwordConfirm && (
              <p className="text-xs text-red-500">{errors.passwordConfirm.message}</p>
            )}
          </div>

          {/* 텔레그램 알림 (선택) */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3">
              텔레그램 알림 설정 <span className="text-slate-400">(선택 — 나중에 프로필에서도 설정 가능)</span>
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="telegramBotToken" className="text-slate-700">
                  Bot Token
                </Label>
                <Input
                  id="telegramBotToken"
                  type="text"
                  placeholder="예: 8144690567:AAEwfpQ..."
                  disabled={isLoading}
                  {...register("telegramBotToken")}
                />
                {errors.telegramBotToken && (
                  <p className="text-xs text-red-500">{errors.telegramBotToken.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telegramChatId" className="text-slate-700">
                  Chat ID
                </Label>
                <Input
                  id="telegramChatId"
                  type="text"
                  placeholder="예: 8673958851"
                  disabled={isLoading}
                  {...register("telegramChatId")}
                />
                {errors.telegramChatId && (
                  <p className="text-xs text-red-500">{errors.telegramChatId.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* 가입 버튼 */}
          <Button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white mt-2"
            disabled={isLoading}
          >
            {isLoading ? "가입 처리 중..." : "가족 구성원으로 가입"}
          </Button>
        </form>

        {/* 로그인 링크 */}
        <p className="mt-6 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <a
            href="/login"
            className="text-slate-700 font-medium underline underline-offset-4 hover:text-slate-900"
          >
            로그인
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
