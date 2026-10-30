import {notFound} from "next/navigation";
import ContractForm from "@/components/ContractForm";
import {updateContract} from "@/lib/actions";
import {getContract,getContractFormOptions} from "@/lib/data";
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const [contract,options]=await Promise.all([getContract(id),getContractFormOptions()]);
  if(!contract) return notFound();
  return <><div className="page-head"><div><h1>契約を編集</h1><p className="muted">{contract.companyName} / {contract.name}</p></div></div><ContractForm options={options} contract={contract} action={updateContract}/></>;
}
