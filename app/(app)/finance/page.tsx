import Link from 'next/link';
import { financeRows } from '@/lib/finance-server';
import { accounts, expenseEntry, reports, type Entry, type Expense } from '@/lib/finance';
import { addEntry } from '../expenses/actions';
import SubmitButton from '@/components/SubmitButton';
export default async function Finance({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams, year=Number(p.year??new Date().getFullYear());
 if(!Number.isInteger(year)||year<2000||year>2100)return <p>年度は2000〜2100で指定してください。</p>;
 const [expenses,journals]=await Promise.all([financeRows('expenses'),financeRows('finance_entries')]);
 const entries:Entry[]=[...expenses.map(e=>expenseEntry(e as Expense)),...journals as Entry[]];
 const r=reports(entries,year),yen=(n:number)=>`${n.toLocaleString()}円`;
 return <><h1>簡易PL・BS（管理用・税込）</h1><Link href="/expenses">経費・領収書へ</Link><form><label>年<input type="number" name="year" defaultValue={year} min={2000} max={2100}/></label><button>表示</button></form>
 <p>経費と下記の手動仕訳が対象です。請求・入金は自動計上しません。期首残高、売上、回収、カード決済、資産・減価償却等の未入力があれば不完全です。申告用決算書ではありません。</p>
 <section className="card"><h2>{year}年 損益計算書</h2><p>売上 {yen(r.revenue)} / 経費 {yen(r.expense)} / 損益 {yen(r.profit)}</p></section>
 <section className="card"><h2>{year}年12月31日 貸借対照表</h2><p>現預金 {yen(r.balances.cash)} / 売掛金 {yen(r.balances.receivable)}</p><p>資産合計 {yen(r.assets)} / 未払金 {yen(r.liabilities)} / 純資産（累積損益含む）{yen(r.equity)}</p><p>貸借差額 {yen(r.difference)}（ゼロでも網羅性は保証されません）</p></section>
 <h2>仕訳追加・訂正</h2><p>開始時の残高は開始日で登録。未払経費の決済は「借方：未払金 / 貸方：現預金」。訂正は元仕訳と同額で貸借を反転して追加し、備考に元のIDを記録してください。経費登録分を再び経費仕訳にしないでください。</p>
 <form action={addEntry} className="card"><label>日付<input type="date" name="date" required/></label>{['debit','credit'].map((side,i)=><label key={side}>{i===0?'借方':'貸方'}<select name={side}>{Object.entries(accounts).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>)}<label>金額（円）<input type="number" name="amount" min="1" max="999999999" required/></label><label>根拠・訂正対象ID<textarea name="memo" required maxLength={2000}/></label><SubmitButton>仕訳を追加</SubmitButton></form>
 <h2>手動仕訳履歴</h2>{journals.map(j=><p key={j.id}>{j.entry_date} {j.id} / {accounts[j.debit as keyof typeof accounts]} → {accounts[j.credit as keyof typeof accounts]} / {yen(Number(j.amount))} / {j.memo}</p>)}
 </>;
}
