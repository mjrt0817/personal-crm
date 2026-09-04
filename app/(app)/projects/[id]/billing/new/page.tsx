import { notFound } from "next/navigation";
import InvoiceForm from "@/components/InvoiceForm";
import { createProjectInvoice } from "@/lib/actions";
import { getProjectBase, getProjectBillingSummary } from "@/lib/data";

export default async function NewInvoicePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const [project,summary]=await Promise.all([getProjectBase(id),getProjectBillingSummary(id)]);
  if(!project) notFound();
  return <><div className="page-head"><div><h1>請求予定を追加</h1><p className="muted">{project.companyName} / {project.name}</p></div></div><InvoiceForm project={project} summary={summary} action={createProjectInvoice}/></>;
}
