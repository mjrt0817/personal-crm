import { notFound } from "next/navigation";
import InvoiceForm from "@/components/InvoiceForm";
import { createProjectInvoice } from "@/lib/actions";
import { getCompanyBase, getInvoiceSettings, getProjectBase, getProjectBillingSummary } from "@/lib/data";

export default async function NewInvoicePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const project=await getProjectBase(id);
  if(!project || !project.companyId) notFound();
  const [summary,company,settings]=await Promise.all([getProjectBillingSummary(id),getCompanyBase(project.companyId),getInvoiceSettings()]);
  if(!company) notFound();
  return <><div className="page-head"><div><h1>請求予定を追加</h1><p className="muted">{project.companyName} / {project.name}</p></div></div><InvoiceForm project={project} company={company} settings={settings} summary={summary} action={createProjectInvoice}/></>;
}
