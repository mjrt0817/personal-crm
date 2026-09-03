import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectGmailPanel from "@/components/ProjectGmailPanel";
import { getProjectHeader, getProjectGmailSummary } from "@/lib/data";

export default async function ProjectMailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, gmail] = await Promise.all([getProjectHeader(id), getProjectGmailSummary(id, 100)]);
  if (!project) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="small muted" href={`/projects/${id}?tab=activities`}>← 案件へ戻る</Link>
          <h1 style={{ marginTop: 8 }}>関連メール</h1>
          <p className="muted">{project.companyName} / {project.name}</p>
        </div>
      </div>
      <section className="card">
        <div className="card-body">
          <ProjectGmailPanel projectId={id} summary={gmail} showAllLink={false}/>
          <p className="small muted">Gmail本文全体はCRMへ保存せず、Gmail APIから取得した件名・ヘッダー・snippetとGmailへのリンクのみ保持します。</p>
        </div>
      </section>
    </>
  );
}
