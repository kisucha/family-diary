"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setServerError(
          "이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요."
        );
        return;
      }

      // 로그인 성공 — callbackUrl 또는 대시보드로 이동
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setServerError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-3 pb-6">
        {/* 로고 영역 */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">
              FamilyPlanner
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              가족 전용 프랭클린 플래너
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
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
              className={errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white mt-2"
            disabled={isLoading}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        {/* 안내 문구 — 폐쇄형 서비스이므로 회원가입 링크 없음 */}
        <p className="mt-6 text-center text-xs text-slate-400">
          가족 구성원만 이용 가능한 서비스입니다.
          <br />
          가입은 관리자의 초대 링크를 통해서만 가능합니다.
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
