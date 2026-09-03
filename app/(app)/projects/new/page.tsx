import ProjectForm from '@/components/ProjectForm';
import { createProject } from '@/lib/actions';
import { getFormOptions } from '@/lib/data';
export default async function Page(){ const options=await getFormOptions(); return <><div className="page-head"><div><h1>案件登録</h1><p className="muted">必要最低限から登録できます。</p></div></div><ProjectForm options={options} action={createProject}/></> }
