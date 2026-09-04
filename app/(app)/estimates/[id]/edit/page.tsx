import { notFound } from "next/navigation";
import EstimateForm from "@/components/EstimateForm";
import { updateEstimate } from "@/lib/actions";
import { getEstimateDetail, getEstimateFormOptions, getEstimateSettings } from "@/lib/data";
export default async function EditEstimatePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const [estimate,options,settings]=await Promise.all([getEstimateDetail(id),getEstimateFormOptions(),getEstimateSettings()]);if(!estimate)notFound();return <><div className="page-head"><div><h1>見積編集</h1><p className="muted">{estimate.estimateNo}</p></div></div><EstimateForm estimate={estimate} options={options} settings={settings} action={updateEstimate}/></>;}
