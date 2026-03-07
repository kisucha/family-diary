"use client";

import { useState } from "react";
import { Settings, Copy, Check, UserPlus, Link2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// 타입 정의
// ============================================================================

type InviteRole = "PARENT" | "CHILD";

interface GeneratedInvite {
  token: string;
  inviteUrl: string;
  expiresAt: string;
  intendedRole: string;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

function getRoleLabel(role: string): string {
  switch (role) {
    case "PARENT": return "부모";
    case "CHILD": return "자녀";
    default: return role;
  }
}

function formatExpiresAt(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ============================================================================
// InvitePage Client Component
// ============================================================================

export default function AdminInvitePage() {
  const [selectedRole, setSelectedRole] = useState<InviteRole>("CHILD");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  // 초대 토큰 생성 요청
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intendedRole: selectedRole }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "초대 토큰 생성에 실패했습니다.");
        return;
      }

      setResult(json.data as GeneratedInvite);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 클립보드 복사
  const handleCopy = async () => {
    if (!result?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      // 2초 후 복사 상태 초기화
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 실패 시 fallback
      const el = document.createElement("textarea");
      el.value = result.inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-900">초대 링크 생성</h1>
        </div>
        <p className="text-sm text-slate-500">
          가족 구성원에게 전달할 가입 초대 링크를 생성합니다.
          초대 링크는 생성 후 48시간 동안 유효합니다.
        </p>
      </div>

      {/* 생성 폼 카드 */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-500" />
            초대 설정
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            초대할 가족 구성원의 역할을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 역할 선택 */}
          <div className="space-y-2">
            <Label htmlFor="role-select" className="text-sm font-medium text-slate-700">
              역할 선택
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as InviteRole)}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue placeholder="역할을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARENT">
                  <div className="flex items-center gap-2">
                    <span>부모</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                      PARENT
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="CHILD">
                  <div className="flex items-center gap-2">
                    <span>자녀</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      CHILD
                    </Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {selectedRole === "PARENT"
                ? "부모 역할: 가족 이벤트 생성, 공지사항 작성 등 대부분의 기능 사용 가능"
                : "자녀 역할: 개인 플래너, 캘린더 조회 등 기본 기능 사용 가능"}
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 생성 버튼 */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                생성 중...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                초대 링크 생성
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 생성 결과 카드 */}
      {result && (
        <Card className="border border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              초대 링크가 생성되었습니다
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              아래 링크를 가족 구성원에게 공유하세요. 링크는 한 번만 사용 가능합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 링크 표시 + 복사 */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">초대 URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-700 break-all font-mono">
                    {result.inviteUrl}
                  </p>
                </div>
                <Button
                  onClick={handleCopy}
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  className={
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                      : "flex-shrink-0"
                  }
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      복사
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* 메타 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">역할</Label>
                <Badge
                  variant="outline"
                  className={
                    result.intendedRole === "PARENT"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }
                >
                  {getRoleLabel(result.intendedRole)}
                </Badge>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">만료 시각</Label>
                <p className="text-xs text-slate-700">{formatExpiresAt(result.expiresAt)}</p>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <p className="text-xs text-amber-800 leading-relaxed">
                이 링크는 48시간 후 자동으로 만료됩니다.
                사용되지 않은 링크는 재생성이 필요합니다.
                링크를 안전한 경로(가족 채팅 등)로만 공유하세요.
              </p>
            </div>

            {/* 새 링크 생성 버튼 */}
            <Button
              onClick={() => {
                setResult(null);
                setCopied(false);
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              새 초대 링크 생성
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
