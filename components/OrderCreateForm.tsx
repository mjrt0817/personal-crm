'use client';
import {useState} from 'react';
import {createSalesOrder} from '@/lib/order-actions';
import {webConditions,WEB_INSPECTION_TERMS,stageLabels,type AcceptanceCheck,type OrderConditions} from '@/lib/order-templates';
import SubmitButton from './SubmitButton';
const empty:OrderConditions={template_id:'',target_environments:'',change_terms:'',support_terms:'',outcome_terms:'',checklist:[]};
export default function OrderCreateForm({estimateId}:{estimateId:string}){
 const [selection,setSelection]=useState('');const [conditions,setConditions]=useState(empty);const [inspection,setInspection]=useState('');
 function apply(){if((inspection||conditions.checklist.length||conditions.target_environments)&&!window.confirm('現在の条件とチェック項目を、選んだテンプレートの内容に置き換えますか？'))return;
 if(selection==='website-v1'){setConditions(webConditions());setInspection(WEB_INSPECTION_TERMS);}else{setConditions(empty);setInspection('');}}
 function edit(index:number,patch:Partial<AcceptanceCheck>){setConditions({...conditions,checklist:conditions.checklist.map((x,i)=>i===index?{...x,...patch}:x)});}
 return <form action={createSalesOrder}>
 <div className="inset-section"><label className="field"><span>注文条件テンプレート</span><select value={selection} onChange={e=>setSelection(e.target.value)}><option value="">自由入力</option><option value="website-v1">Webサイト構築（標準）</option></select></label><button className="button" type="button" onClick={apply}>選んだテンプレートを反映</button><p className="small muted">反映後はすべて編集できます。注文書作成時に内容を固定します。検収は顧客の明示的な承認で完了とします。</p></div>
 <input type="hidden" name="estimate_id" value={estimateId}/><input type="hidden" name="template_id" value={conditions.template_id}/><input type="hidden" name="checklist_json" value={JSON.stringify(conditions.checklist)}/>
 <label className="field"><span>納期・提供期日 *</span><input name="delivery_date" type="date" required/></label><label className="field"><span>納品・提供場所 *</span><input name="delivery_place" required placeholder="例：顧客指定のサーバー上" maxLength={500}/></label>
 <label className="field"><span>支払条件 *</span><textarea name="payment_terms" required placeholder="例：納品月末締め、翌月末払い" maxLength={2000}/></label>
 <label className="field"><span>検収条件 *</span><textarea name="inspection_terms" value={inspection} onChange={e=>setInspection(e.target.value)} required rows={12} maxLength={5000}/><small>確認対象・時期・期間・不具合連絡・完了承認の方法を記載します。「7営業日」は編集可能な提案値です。</small></label>
 {([['target_environments','確認する端末・ブラウザ'],['change_terms','修正・追加変更の扱い'],['support_terms','検収後の不具合・保守の扱い'],['outcome_terms','成果保証の範囲']] as const).map(([key,label])=><label className="field" key={key}><span>{label}</span><textarea name={key} value={conditions[key]} onChange={e=>setConditions({...conditions,[key]:e.target.value})} rows={key==='target_environments'?3:5} maxLength={5000} required={conditions.template_id==='website-v1'}/></label>)}
 <div className="inset-section"><h3>別紙：納品・検収チェック項目</h3><p className="small muted">注文書PDFに別紙として掲載します。案件の対象に合わせて追加・修正・削除してください。最低1件が必要です。</p>
 {conditions.checklist.map((x,i)=><div key={x.id} className="check-editor-row"><select aria-label={`確認段階 ${i+1}`} value={x.stage} onChange={e=>edit(i,{stage:e.target.value as AcceptanceCheck['stage']})}>{Object.entries(stageLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><textarea aria-label={`チェック項目 ${i+1}`} value={x.label} onChange={e=>edit(i,{label:e.target.value})} required maxLength={600} rows={2}/><button type="button" className="button" aria-label={`項目 ${i+1} を削除`} onClick={()=>setConditions({...conditions,checklist:conditions.checklist.filter((_,j)=>i!==j)})}>削除</button></div>)}
 <button type="button" className="button" disabled={conditions.checklist.length>=80} onClick={()=>setConditions({...conditions,checklist:[...conditions.checklist,{id:crypto.randomUUID(),stage:'pre',label:'',status:'pending',note:''}]})}>＋ 確認項目を追加</button></div>
 <label className="check-field"><input type="checkbox" name="conditions_checked" required/> 条件・確認環境・別紙のチェック項目を、この案件の内容に合わせて確認しました</label><SubmitButton disabled={!conditions.checklist.length}>この見積を確定して注文書を作成</SubmitButton>
 </form>;
}
