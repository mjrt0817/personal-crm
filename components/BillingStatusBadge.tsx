import type { BillingStatus } from "@/lib/types";

const labels: Record<BillingStatus,string> = { planned:"未請求", invoiced:"請求済", paid:"入金済", cancelled:"取消" };
const classes: Record<BillingStatus,string> = { planned:"orange", invoiced:"blue", paid:"green", cancelled:"" };
export default function BillingStatusBadge({status,overdue}:{status:BillingStatus;overdue?:boolean}) {
  if (overdue) return <span className="badge red">入金期限超過</span>;
  return <span className={`badge ${classes[status]}`}>{labels[status]}</span>;
}
