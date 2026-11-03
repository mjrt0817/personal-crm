import Link from 'next/link';
import { financeRows } from '@/lib/finance-server';
import { addExpense, uploadReceipt } from './actions';
import SubmitButton from '@/components/SubmitButton';
export default async function Expenses({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const [expenses,receipts]=await Promise.all([financeRows('expenses'),financeRows('expense_receipts')]);
 const filtered=expenses.filter(e=>(!p.start||e.expense_date>=p.start)&&(!p.end||e.expense_date<=p.end)&&(!p.vendor||e.vendor.toLowerCase().includes(p.vendor.toLowerCase()))&&(!p.min||Number(e.amount)>=Number(p.min))&&(!p.max||Number(e.amount)<=Number(p.max)));
 return <><h1>経費・領収書</h1><p><Link href="/finance">簡易PL・BS / 仕訳入力</Link> · <Link href="/api/export/expenses">経費元データCSV</Link></p>
 <p>税込・日本円・事業分のみを入力してください。外貨は円換算額と換算根拠を備考へ。登録後の訂正は仕訳画面で逆仕訳を追加します。</p>
 {p.error&&<p role="alert">{p.error}</p>}{p.saved&&<p role="status">保存しました。</p>}
 <form action={addExpense} className="card"><label>取引日<input type="date" name="date" required/></label><label>取引先<input name="vendor" maxLength={200} required placeholder="Google / OpenAIなど"/></label><label>分類<select name="category">{['GWS','ChatGPT','ドメイン','サーバー','その他'].map(x=><option key={x}>{x}</option>)}</select></label><label>事業分の税込額（円）<input name="amount" type="number" min="1" max="999999999" step="1" required/></label><label>支払方法<select name="settlement"><option value="cash">事業用現預金で支払済</option><option value="payable">未払・カード（後日決済仕訳が必要）</option><option value="owner">個人資金で立替</option></select></label><label>備考<textarea name="memo" maxLength={2000}/></label><SubmitButton>経費を登録</SubmitButton></form>
 <p>電子受領は元ファイルを保存してください。紙の撮影はスキャナ保存の要件確認まで原本を保管してください。Drive保存のみで法令適合や控除を保証しません。</p>
 <form><label>取引日から<input type="date" name="start" defaultValue={p.start}/></label><label>まで<input type="date" name="end" defaultValue={p.end}/></label><label>取引先<input name="vendor" defaultValue={p.vendor}/></label><label>金額下限<input type="number" name="min" min="0" defaultValue={p.min}/></label><label>上限<input type="number" name="max" min="0" defaultValue={p.max}/></label><button>組み合わせて検索</button></form>
 {filtered.sort((a,b)=>b.expense_date.localeCompare(a.expense_date)).map(e=><section className="card" key={e.id}><h2>{e.expense_date} / {e.vendor} / {Number(e.amount).toLocaleString()}円</h2><p>経費ID: {e.id}</p><p>{e.category} · {e.memo}</p>
 {receipts.filter(r=>r.expense_id===e.id).map(r=><p key={r.id}><a href={`https://drive.google.com/file/d/${encodeURIComponent(r.drive_file_id)}/view`} target="_blank" rel="noreferrer">{r.original_name}</a> ({r.source==='electronic'?'電子受領':'紙スキャン'})</p>)}
 <form action={uploadReceipt}><input type="hidden" name="expense_id" value={e.id}/><label>領収書（3MB以下）<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required/></label><select name="source"><option value="electronic">電子受領した原本</option><option value="paper_scan">紙を撮影・スキャン</option></select><SubmitButton>Google Driveに保存</SubmitButton></form></section>)}
 </>;
}
