"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TaskItem } from "./TaskItem";
import type { SerializedPlanItem } from "../page";

// ============================================================================
// SortableTaskItem — @dnd-kit 드래그 핸들 래퍼
// ============================================================================

interface SortableTaskItemProps {
  task: SerializedPlanItem;
  priority: "A" | "B" | "C";
  onToggle: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
  onPostpone: (task: SerializedPlanItem) => void;
}

export function SortableTaskItem({ task, priority, onToggle, onDelete, onPostpone }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="mt-2.5 flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/30 hover:text-muted-foreground rounded"
        aria-label="드래그하여 순서 변경"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* TaskItem */}
      <div className="flex-1 min-w-0">
        <TaskItem
          task={task}
          priority={priority}
          onToggle={onToggle}
          onDelete={onDelete}
          onPostpone={onPostpone}
        />
      </div>
    </div>
  );
}
