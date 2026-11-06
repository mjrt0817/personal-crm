import Link from 'next/link';
import {getEstimateOrders,orderLabels} from '@/lib/orders';
import OrderCreateForm from './OrderCreateForm';
import type {Estimate} from '@/lib/types';

export default async function EstimateOrderHandoff({estimate}:{estimate:Estimate}){
 const orders=await getEstimateOrders(estimate.id);const active=orders.some(o=>o.status!=='cancelled');const allowed=['sent','accepted'].includes(estimate.status);
 return <section className="card"><div className="card-head"><h2>注文書・電子サインへ</h2></div><div className="card-body"><p className="muted">見積の内容を固定して注文書を作成します。締結ぱっとで署名完了後、受注を確定します。</p>{orders.map(o=><p key={o.id}><Link href={`/orders/${o.id}`}>{o.order_no} ／ {orderLabels[o.status as keyof typeof orderLabels]}</Link></p>)}
 {active?<div className="notice">注文書を作成済みです。以後の操作は注文・受注管理で行ってください。</div>:orders.length?<div className="notice">取消済みの注文書があります。見積をコピーして再作成してください。</div>:allowed?<OrderCreateForm estimateId={estimate.id}/>:<div className="notice">有効期限内の「送付済」見積から注文書を作成できます。下書きは編集画面で送付済みにしてください。</div>}</div></section>;
}
