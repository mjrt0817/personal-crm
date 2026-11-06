import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getOrder,getAcceptance} from '@/lib/orders';
import {todayJst} from '@/lib/order-domain';
import OrderAcceptancePanel from '@/components/OrderAcceptancePanel';
import AcceptanceForm from '@/components/AcceptanceForm';
export default async function AcceptancePage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){
 const {id}=await params;const query=await searchParams;const o=await getOrder(id);if(!o)notFound();const record=o.status==='confirmed'?await getAcceptance(id):null;
 return <><div className="page-head"><div><Link href={`/orders/${id}`}>← 注文・受注管理</Link><h1>納品・検収チェックリスト</h1><p>{o.order_no} ／ {o.snapshot.estimate.title} ／ {o.snapshot.customer.name}</p></div><Link className="button" href={`/acceptance-documents/${id}`} target="_blank">チェックリスト / PDF</Link></div>{query.saved&&<div className="notice success-notice">チェック結果を保存しました。</div>}
 <section className="card"><div className="card-head"><h2>合意した検収条件</h2></div><div className="card-body" style={{whiteSpace:'pre-wrap'}}>{o.inspection_terms}{o.target_environments&&<p>確認環境：{o.target_environments}</p>}</div></section>
 <section className="card" style={{marginTop:18}}><div className="card-body">{record?<AcceptanceForm record={record} today={todayJst()}/>:<OrderAcceptancePanel order={o}/>}</div></section></>;
}
