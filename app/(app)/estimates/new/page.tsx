import EstimateForm from "@/components/EstimateForm";
import { createEstimate } from "@/lib/actions";
import { getEstimateFormOptions, getEstimateSettings } from "@/lib/data";
export default async function NewEstimatePage({searchParams}:{searchParams:Promise<{project_id?:string}>}){const q=await searchParams;const [options,settings]=await Promise.all([getEstimateFormOptions(),getEstimateSettings()]);return <><div className="page-head"><div><h1>見積作成</h1><p className="muted">明細・数量・単価から見積書を作成します。</p></div></div><EstimateForm options={options} settings={settings} action={createEstimate} defaultProjectId={q.project_id}/></>;}
