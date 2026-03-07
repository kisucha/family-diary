"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, Moon, Dumbbell, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// 타입
// ============================================================================

interface SerializedEmotion {
  id: string;
  userId: string;
  checkinDate: string;
  primaryEmotion: string;
  emotionScore: number;
  physicalCondition: string | null;
  sleepQuality: number | null;
  sleepHours: number | null;
  exerciseMinutes: number | null;
  notes: string | null;
  isPublished: boolean;
}

interface EmotionCheckinSectionProps {
  date: string;
  initialCheckin: SerializedEmotion | null;
}

// ============================================================================
// 상수
// ============================================================================

interface EmotionOption {
  key: string;
  emoji: string;
  label: string;
  score: number;
}

const EMOTIONS: EmotionOption[] = [
  { key: "very_sad", emoji: "😢", label: "매우 우울", score: 1 },
  { key: "sad", emoji: "😟", label: "우울", score: 2 },
  { key: "neutral", emoji: "😐", label: "보통", score: 3 },
  { key: "happy", emoji: "😊", label: "좋음", score: 4 },
  { key: "very_happy", emoji: "😄", label: "매우 좋음", score: 5 },
];

// ============================================================================
// EmotionCheckinSection
// ============================================================================

export function EmotionCheckinSection({ date, initialCheckin }: EmotionCheckinSectionProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionOption | null>(
    initialCheckin
      ? (EMOTIONS.find((e) => e.key === initialCheckin.primaryEmotion) ?? null)
      : null
  );
  const [sleepHours, setSleepHours] = useState<string>(
    initialCheckin?.sleepHours?.toString() ?? ""
  );
  const [exerciseMinutes, setExerciseMinutes] = useState<string>(
    initialCheckin?.exerciseMinutes?.toString() ?? ""
  );
  const [notes, setNotes] = useState(initialCheckin?.notes ?? "");
  const [saved, setSaved] = useState(!!initialCheckin);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmotion) throw new Error("감정을 선택해주세요");
      const res = await fetch("/api/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          primaryEmotion: selectedEmotion.key,
          emotionScore: selectedEmotion.score,
          sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
          exerciseMinutes: exerciseMinutes ? parseInt(exerciseMinutes) : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      toast.success("감정 체크인이 저장되었습니다");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다");
    },
  });

  const handleEmotionSelect = (emotion: EmotionOption) => {
    setSelectedEmotion(emotion === selectedEmotion ? null : emotion);
    setSaved(false);
  };

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500" />
          오늘의 감정 체크인
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 감정 선택 */}
        <div>
          <Label className="text-xs text-slate-500 mb-2 block">오늘 기분은 어때요?</Label>
          <div className="flex gap-2">
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion.key}
                onClick={() => handleEmotionSelect(emotion)}
                title={emotion.label}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all flex-1 ${
                  selectedEmotion?.key === emotion.key
                    ? "bg-indigo-100 shadow-sm ring-2 ring-indigo-300"
                    : "hover:bg-slate-100 opacity-60 hover:opacity-100"
                }`}
              >
                <span className="text-2xl">{emotion.emoji}</span>
                <span className="text-[10px] text-slate-600 hidden sm:block">{emotion.label}</span>
              </button>
            ))}
          </div>
          {selectedEmotion && (
            <p className="text-xs text-indigo-600 mt-1.5 text-center">
              {selectedEmotion.emoji} {selectedEmotion.label}
            </p>
          )}
        </div>

        {/* 수면 & 운동 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
              <Moon className="h-3 w-3" />
              수면 시간 (시간)
            </Label>
            <Input
              type="number"
              value={sleepHours}
              onChange={(e) => { setSleepHours(e.target.value); setSaved(false); }}
              placeholder="예: 7.5"
              min={0}
              max={24}
              step={0.5}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
              <Dumbbell className="h-3 w-3" />
              운동 시간 (분)
            </Label>
            <Input
              type="number"
              value={exerciseMinutes}
              onChange={(e) => { setExerciseMinutes(e.target.value); setSaved(false); }}
              placeholder="예: 30"
              min={0}
              step={5}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* 한마디 */}
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">오늘 하루 한마디 (선택)</Label>
          <Textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="오늘 특별히 기억하고 싶은 것이 있다면..."
            rows={2}
            maxLength={1000}
            className="resize-none text-sm"
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!selectedEmotion || saveMutation.isPending}
            size="sm"
            variant={saved ? "outline" : "default"}
            className={saved ? "text-emerald-600 border-emerald-300" : ""}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? "저장 중..." : saved ? "저장됨" : "저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
