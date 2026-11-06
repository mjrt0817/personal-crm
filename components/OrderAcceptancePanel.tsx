import Link from 'next/link';
import {getAcceptance,type SalesOrder} from '@/lib/orders';
import {startAcceptance} from '@/lib/order-actions';
import {webChecklist} from '@/lib/order-templates';
import SubmitButton from './SubmitButton';
export default async function OrderAcceptancePanel({order}:{order:SalesOrder}){
 const a=order.status==='confirmed'?await getAcceptance(order.id):null;const hasTemplate=Boolean(order.checklist_template?.length);
 return <section className="card" style={{marginTop:18}}><div className="card-head"><h2>納品・検収</h2><span className="badge">{a?.completed_date?'検収完了':a?'確認中':'未開始'}</span></div><div className="card-body">
 {a?<><p>{a.completed_date?`検収完了日：${a.completed_date} ／ 承認者：${a.approved_by}`:`確認済み ${a.items.filter(x=>x.status==='ok').length} ／ 要修正 ${a.items.filter(x=>x.status==='issue').length} ／ 未確認 ${a.items.filter(x=>x.status==='pending').length} ／ 対象外 ${a.items.filter(x=>x.status==='na').length}`}</p><Link className="button primary" href={`/orders/${order.id}/acceptance`}>チェック結果・承認記録</Link></>:order.status==='confirmed'?<form action={startAcceptance}><input type="hidden" name="order_id" value={order.id}/>{!hasTemplate&&<><input type="hidden" name="checklist_json" value={JSON.stringify(webChecklist())}/><p className="muted">この注文書には作成時のチェック項目がありません。Webサイト構築用の標準項目を運用記録として追加します。署名済み注文書の条件は変更されません。</p><label><input type="checkbox" name="legacy_confirmed" required/> 既存の注文条件を変更せず、対象外の項目は理由を記録することを確認しました</label></>}<div style={{marginTop:12}}><SubmitButton>チェック結果の記録を開始</SubmitButton></div></form>:<p className="muted">受注確定後に、公開前・公開後・引継ぎのチェック結果と顧客の承認を記録できます。</p>}
 <div style={{marginTop:14}}><Link className="button" href={`/acceptance-documents/${order.id}`} target="_blank">納品・検収チェックリスト / PDF</Link></div><p className="small muted">注文書の署名は発注の承認です。納品後の検収承認は別に記録します。検収完了によって請求書を自動作成することはありません。</p></div></section>;
}
