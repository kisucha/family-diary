"use client";

import { useState, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookHeart, Star, Briefcase, Eye, Save, X, Plus, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ExportSection } from "./ExportSection";

// ============================================================================
// 타입
// ============================================================================

interface SerializedProfile {
  id: string;
  userId: string;
  personalMission: string | null;
  coreValues: string[];
  rolesResponsibilities: string | null;
  longTermVision: string | null;
  bio: string | null;
  avatarUrl: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramNotifyPlans: boolean;
  telegramNotifyEvents: boolean;
  telegramNotifyIncomplete: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ProfileEditClientProps {
  initialProfile: SerializedProfile | null;
  userName: string;
  userRole: string;
}

// ============================================================================
// ProfileEditClient
// ============================================================================

export function ProfileEditClient({
  initialProfile,
  userName,
  userRole,
}: ProfileEditClientProps) {
  const queryClient = useQueryClient();

  const [personalMission, setPersonalMission] = useState(
    initialProfile?.personalMission ?? ""
  );
  const [coreValues, setCoreValues] = useState<string[]>(
    initialProfile?.coreValues ?? []
  );
  const [rolesResponsibilities, setRolesResponsibilities] = useState(
    initialProfile?.rolesResponsibilities ?? ""
  );
  const [longTermVision, setLongTermVision] = useState(
    initialProfile?.longTermVision ?? ""
  );
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [telegramBotToken, setTelegramBotToken] = useState(
    initialProfile?.telegramBotToken ?? ""
  );
  const [telegramChatId, setTelegramChatId] = useState(
    initialProfile?.telegramChatId ?? ""
  );
  const [telegramNotifyPlans, setTelegramNotifyPlans] = useState(
    initialProfile?.telegramNotifyPlans ?? true
  );
  const [telegramNotifyEvents, setTelegramNotifyEvents] = useState(
    initialProfile?.telegramNotifyEvents ?? true
  );
  const [telegramNotifyIncomplete, setTelegramNotifyIncomplete] = useState(
    initialProfile?.telegramNotifyIncomplete ?? true
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalMission: personalMission || undefined,
          coreValues,
          rolesResponsibilities: rolesResponsibilities || undefined,
          longTermVision: longTermVision || undefined,
          bio: bio || undefined,
          telegramBotToken: telegramBotToken || null,
          telegramChatId: telegramChatId || null,
          telegramNotifyPlans,
          telegramNotifyEvents,
          telegramNotifyIncomplete,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("프로필이 저장되었습니다");
    },
    onError: () => {
      toast.error("저장에 실패했습니다");
    },
  });

  // 태그 추가
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || coreValues.includes(trimmed) || coreValues.length >= 10) return;
    setCoreValues([...coreValues, trimmed]);
    setTagInput("");
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag: string) => {
    setCoreValues(coreValues.filter((v) => v !== tag));
  };

  const handleTestNotification = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error("Bot Token과 Chat ID를 먼저 입력하세요");
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramBotToken,
          chatId: telegramChatId,
          notifyPlans: telegramNotifyPlans,
          notifyEvents: telegramNotifyEvents,
          notifyIncomplete: telegramNotifyIncomplete,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "발송 실패");
      }
      toast.success("테스트 메시지가 발송되었습니다!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "발송에 실패했습니다");
    } finally {
      setIsSendingTest(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN": return "관리자";
      case "PARENT": return "부모";
      case "CHILD": return "자녀";
      default: return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-rose-100 text-rose-700 border-rose-200";
      case "PARENT": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "CHILD": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-foreground">프로필</h1>
          </div>
          <p className="text-sm text-slate-500">
            개인 사명서, 핵심 가치관, 역할 정보를 관리합니다.
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {saveMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>

      {/* 기본 정보 카드 (읽기 전용) */}
      <Card className="border border-slate-200">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-indigo-600">
                {(userName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-lg font-semibold text-foreground">{userName}</p>
              <Badge
                variant="outline"
                className={`text-xs border ${getRoleBadgeClass(userRole)}`}
              >
                {getRoleLabel(userRole)}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <Label className="text-xs text-slate-500">한줄 소개</Label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="나를 한 줄로 표현해보세요"
              maxLength={500}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 사명서 카드 */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <BookHeart className="h-4 w-4 text-indigo-500" />
            개인 사명서
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            나는 누구인가, 무엇을 위해 살아가는가를 정의하는 핵심 문장
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={personalMission}
            onChange={(e) => setPersonalMission(e.target.value)}
            placeholder='예: "나는 가족과 함께 성장하며, 사랑과 지혜로 세상에 기여한다."'
            rows={4}
            maxLength={2000}
            className="resize-none text-sm"
          />
          <p className="text-right text-xs text-slate-400 mt-1">
            {personalMission.length}/2000
          </p>
        </CardContent>
      </Card>

      {/* 핵심 가치관 카드 */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            핵심 가치관
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            내가 중요시하는 삶의 원칙들 (최대 10개)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 태그 입력 */}
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="가치관 입력 후 Enter"
              maxLength={50}
              disabled={coreValues.length >= 10}
              className="flex-1 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              disabled={!tagInput.trim() || coreValues.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* 태그 목록 */}
          {coreValues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {coreValues.map((value) => (
                <Badge
                  key={value}
                  variant="outline"
                  className="text-sm px-3 py-1 bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5"
                >
                  {value}
                  <button
                    onClick={() => removeTag(value)}
                    className="hover:text-amber-900 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {coreValues.length === 0 && (
            <p className="text-sm text-slate-400">
              아직 핵심 가치관을 입력하지 않았습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 역할과 책임 카드 */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-500" />
            역할과 책임
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            가정, 직장, 사회에서 내가 맡은 역할과 책임
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rolesResponsibilities}
            onChange={(e) => setRolesResponsibilities(e.target.value)}
            placeholder={"예:\n• 아버지로서: 자녀와 매일 30분 대화\n• 직장인으로서: 팀원들을 성장시키는 리더\n• 지역사회에서: 멘토링 프로그램 참여"}
            rows={5}
            maxLength={3000}
            className="resize-none text-sm"
          />
          <p className="text-right text-xs text-slate-400 mt-1">
            {rolesResponsibilities.length}/3000
          </p>
        </CardContent>
      </Card>

      {/* 장기 비전 카드 */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-500" />
            장기 비전
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            5년, 10년 후 내가 이루고 싶은 모습
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={longTermVision}
            onChange={(e) => setLongTermVision(e.target.value)}
            placeholder="10년 후 나는 어떤 삶을 살고 있을까요?"
            rows={4}
            maxLength={2000}
            className="resize-none text-sm"
          />
          <p className="text-right text-xs text-slate-400 mt-1">
            {longTermVision.length}/2000
          </p>
        </CardContent>
      </Card>

      {/* 하단 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {saveMutation.isPending ? "저장 중..." : "저장하기"}
        </Button>
      </div>

      {/* 텔레그램 알림 설정 카드 */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Send className="h-4 w-4 text-sky-500" />
            텔레그램 알림 설정
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            매일 오전 8시에 오늘의 계획, 가족 일정, 미완료 태스크를 텔레그램으로 받습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Bot Token</Label>
            <Input
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="예: 8144690567:AAEwfpQLTy..."
              maxLength={200}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Chat ID</Label>
            <Input
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="예: 8673958851"
              maxLength={50}
              className="font-mono text-sm"
            />
          </div>
          {/* 알림 항목 선택 */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium pt-1">받을 알림 선택</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-plans"
                checked={telegramNotifyPlans}
                onCheckedChange={(v) => setTelegramNotifyPlans(!!v)}
              />
              <label htmlFor="notify-plans" className="text-sm text-slate-700 cursor-pointer">
                🔴 오늘의 계획 (A/B/C 태스크)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-events"
                checked={telegramNotifyEvents}
                onCheckedChange={(v) => setTelegramNotifyEvents(!!v)}
              />
              <label htmlFor="notify-events" className="text-sm text-slate-700 cursor-pointer">
                📆 이번 주 가족 일정
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-incomplete"
                checked={telegramNotifyIncomplete}
                onCheckedChange={(v) => setTelegramNotifyIncomplete(!!v)}
              />
              <label htmlFor="notify-incomplete" className="text-sm text-slate-700 cursor-pointer">
                ⚠️ 미완료 태스크 (최근 7일)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs text-slate-400 flex-1">
              저장 버튼을 눌러야 텔레그램 설정이 저장됩니다
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              disabled={isSendingTest || !telegramBotToken || !telegramChatId}
              className="shrink-0"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isSendingTest ? "발송 중..." : "테스트 발송"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 데이터 내보내기 */}
      <ExportSection />
    </div>
  );
}
