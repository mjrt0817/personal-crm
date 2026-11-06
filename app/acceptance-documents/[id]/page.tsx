import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getOrder,getAcceptance} from '@/lib/orders';
import AcceptancePaper from '@/components/AcceptancePaper';
import PrintEstimateButton from '@/components/PrintEstimateButton';
export default async function AcceptanceDocument({params}:{params:Promise<{id:string}>}){const {id}=await params;const order=await getOrder(id);if(!order)notFound();const record=order.status==='confirmed'?await getAcceptance(id):null;return <div className="invoice-document-shell"><div className="invoice-document-toolbar no-print"><Link className="button" href={`/orders/${id}/acceptance`}>← 納品・検収管理</Link><PrintEstimateButton/></div><AcceptancePaper order={order} record={record}/></div>;}
