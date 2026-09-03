import Link from "next/link";
import type { ActionCandidate } from "@/lib/action-center";

function toneClass(tone: ActionCandidate["tone"]) {
  if (tone === "red") return "red";
  if (tone === "orange") return "orange";
  if (tone === "blue") return "blue";
  if (tone === "green") return "green";
  return "";
}

function fmt(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleString("ja-JP", { timeZone:"Asia/Tokyo", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function ActionCandidateRow({ item, compact = false }: { item: ActionCandidate; compact?: boolean }) {
  const due = fmt(item.dueAt);
  return (
    <div className={`list-row action-candidate-row ${compact ? "compact" : ""}`}>
      <span className={`badge ${toneClass(item.tone)}`}>{item.badge}</span>
      <div className="grow">
        <div className="list-title">{item.title}</div>
        <div className="small muted action-reason">{item.reason}</div>
        <div className="small muted action-context">
          {[item.companyName, item.projectName].filter(Boolean).join(" / ") || "全体"}
          {due ? ` ・ ${due}` : ""}
        </div>
      </div>
      <Link className="button" href={item.href}>開く</Link>
    </div>
  );
}
