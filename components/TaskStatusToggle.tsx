"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatusQuick } from "@/lib/actions";
import type { TaskStatus } from "@/lib/types";

export default function TaskStatusToggle({
  id,
  status,
  projectId
}: {
  id: string;
  status: TaskStatus;
  projectId?: string;
}) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const completed = localStatus === "completed";

  function toggle() {
    const previous = localStatus;
    const next: "todo" | "completed" = completed ? "todo" : "completed";
    setLocalStatus(next);
    startTransition(async () => {
      try {
        await setTaskStatusQuick(id, next, projectId);
        router.refresh();
      } catch {
        setLocalStatus(previous);
      }
    });
  }

  return (
    <button
      type="button"
      className={`task-check ${completed ? "done" : ""} ${isPending ? "pending" : ""}`}
      title={completed ? "未完了に戻す" : "完了にする"}
      aria-label={completed ? "未完了に戻す" : "完了にする"}
      aria-pressed={completed}
      onClick={toggle}
      disabled={isPending}
    />
  );
}
