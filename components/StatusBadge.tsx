import { statusLabel } from "@/lib/mock-data";
import type { ProjectStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const color = status === "in_progress" ? "blue" : status === "completed" ? "green" : "";
  return <span className={`badge ${color}`}>{statusLabel[status] ?? status}</span>;
}
