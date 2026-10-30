import {notFound} from "next/navigation";
import ContractInvoiceForm from "@/components/ContractInvoiceForm";
import {getCompanyBase,getContractsForCompanyBilling} from "@/lib/data";
export default async function Page({searchParams}:{searchParams:Promise<{company_id?:string}>}){
  const q=await searchParams; const companyId=q.company_id; if(!companyId) return notFound();
  const [company,contracts]=await Promise.all([getCompanyBase(companyId),getContractsForCompanyBilling(companyId)]);
  if(!company) return notFound();
  return <><div className="page-head"><div><h1>契約をまとめて請求</h1><p className="muted">{company.name}</p></div></div><ContractInvoiceForm company={company} contracts={contracts}/></>;
}
