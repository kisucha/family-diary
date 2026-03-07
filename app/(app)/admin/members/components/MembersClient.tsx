"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCog, Shield, User, Baby } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// 타입
// ============================================================================

type UserRole = "ADMIN" | "PARENT" | "CHILD";

interface SerializedMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  colorTag: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface MembersClientProps {
  initialMembers: SerializedMember[];
  currentUserId: string;
}

// ============================================================================
// 헬퍼
// ============================================================================

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "관리자",
  PARENT: "부모",
  CHILD: "자녀",
};

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  ADMIN: Shield,
  PARENT: User,
  CHILD: Baby,
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  PARENT: "bg-blue-100 text-blue-700 border-blue-200",
  CHILD: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "없음";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// MembersClient
// ============================================================================

export function MembersClient({ initialMembers, currentUserId }: MembersClientProps) {
  const queryClient = useQueryClient();
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});

  const { data } = useQuery<{ data: SerializedMember[] }>({
    queryKey: ["adminMembers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/members");
      if (!res.ok) throw new Error();
      return res.json();
    },
    initialData: { data: initialMembers },
  });

  const members = data?.data ?? [];

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: object }) => {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "변경에 실패했습니다");
      }
      return res.json();
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["adminMembers"] });
      setPendingUpdates((prev) => ({ ...prev, [id]: false }));
      toast.success("구성원 정보가 변경되었습니다");
    },
    onError: (err: Error, { id }) => {
      setPendingUpdates((prev) => ({ ...prev, [id]: false }));
      toast.error(err.message);
    },
  });

  const handleRoleChange = (member: SerializedMember, role: UserRole) => {
    if (role === member.role) return;
    setPendingUpdates((prev) => ({ ...prev, [member.id]: true }));
    patchMutation.mutate({ id: member.id, payload: { role } });
  };

  const handleToggleActive = (member: SerializedMember) => {
    setPendingUpdates((prev) => ({ ...prev, [member.id]: true }));
    patchMutation.mutate({ id: member.id, payload: { isActive: !member.isActive } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <UserCog className="h-5 w-5 text-slate-600" />
        <h2 className="text-lg font-semibold text-slate-800">구성원 관리</h2>
        <span className="text-sm text-slate-400">({members.length}명)</span>
      </div>

      <div className="space-y-3">
        {members.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role];
          const isSelf = member.id === currentUserId;
          const isPending = pendingUpdates[member.id];

          return (
            <Card
              key={member.id}
              className={`border ${!member.isActive ? "opacity-60 bg-slate-50" : "border-slate-200"}`}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: member.colorTag ?? "#e2e8f0" }}
                    >
                      <RoleIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold text-slate-800">
                          {member.name}
                        </CardTitle>
                        {isSelf && (
                          <span className="text-[10px] text-slate-400">(나)</span>
                        )}
                        {!member.isActive && (
                          <Badge variant="outline" className="text-[10px] text-slate-500">비활성</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* 역할 뱃지 + 변경 Select */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${ROLE_BADGE[member.role]}`}
                    >
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    {!isSelf && (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member, v as UserRole)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">관리자</SelectItem>
                          <SelectItem value="PARENT">부모</SelectItem>
                          <SelectItem value="CHILD">자녀</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>최근 로그인: {formatDate(member.lastLoginAt)}</span>
                  <span>가입일: {formatDate(member.createdAt)}</span>
                  {!isSelf && (
                    <button
                      onClick={() => handleToggleActive(member)}
                      disabled={isPending}
                      className={`text-xs font-medium transition-colors ${
                        member.isActive
                          ? "text-rose-500 hover:text-rose-700"
                          : "text-emerald-600 hover:text-emerald-800"
                      }`}
                    >
                      {member.isActive ? "비활성화" : "활성화"}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
