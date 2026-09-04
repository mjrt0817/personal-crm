import { notFound } from "next/navigation";
import InvoiceForm from "@/components/InvoiceForm";
import { deleteProjectInvoice, updateProjectInvoice } from "@/lib/actions";
import { getCompanyBase, getInvoiceDetail, getInvoiceSettings, getProjectBase, getProjectBillingSummary } from "@/lib/data";

export default async function EditInvoicePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const invoice=await getInvoiceDetail(id);
  if(!invoice) notFound();
  const project=await getProjectBase(invoice.projectId);
  if(!project || !project.companyId) notFound();
  const [summary,company,settings]=await Promise.all([getProjectBillingSummary(invoice.projectId),getCompanyBase(project.companyId),getInvoiceSettings()]);
  if(!company) notFound();
  return <>
    <div className="page-head"><div><h1>請求情報を編集</h1><p className="muted">{project.companyName} / {project.name}</p></div></div>
    <InvoiceForm project={project} company={company} settings={settings} summary={summary} invoice={invoice} action={updateProjectInvoice}/>
    <section className="card danger-zone-card" style={{marginTop:18}}><div className="card-body row-actions"><div className="grow"><strong>この請求記録を削除</strong><div className="small muted">誤登録した場合のみ使用してください。通常は「取消」を推奨します。</div></div><form action={deleteProjectInvoice}><input type="hidden" name="id" value={invoice.id}/><input type="hidden" name="project_id" value={project.id}/><input type="hidden" name="return_to" value={`/projects/${project.id}/billing`}/><button className="button danger">削除</button></form></div></section>
  </>;
}
