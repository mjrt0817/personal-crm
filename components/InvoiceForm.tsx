"use client";

import { useMemo, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import type { Project, ProjectBillingSummary, ProjectInvoice } from "@/lib/types";

const statuses = [
  ["planned", "未請求（予定）"],
  ["invoiced", "請求済"],
  ["paid", "入金済"],
  ["cancelled", "取消"]
] as const;

function todayJst() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function InvoiceForm({
  project,
  summary,
  invoice,
  action
}: {
  project: Project;
  summary?: ProjectBillingSummary;
  invoice?: ProjectInvoice;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const unitMode = project.pricingModel === "unit";
  const initialQty = invoice?.unitQuantity ?? (unitMode ? (summary?.suggestedUnits ?? 0) : 0);
  const initialUnitPrice = invoice?.unitPrice ?? (project.unitPrice ?? 0);
  const initialAmount = invoice?.amount ?? (summary?.suggestedAmount ?? 0);
  const [quantity, setQuantity] = useState(initialQty);
  const [unitPrice, setUnitPrice] = useState(initialUnitPrice);
  const [amount, setAmount] = useState(initialAmount);
  const calculated = useMemo(() => Math.max(0, quantity) * Math.max(0, unitPrice), [quantity, unitPrice]);
  const isNew = !invoice;

  function updateQty(value: number) {
    setQuantity(value);
    setAmount(Math.round(Math.max(0, value) * Math.max(0, unitPrice)));
  }
  function updateUnitPrice(value: number) {
    setUnitPrice(value);
    setAmount(Math.round(Math.max(0, quantity) * Math.max(0, value)));
  }

  return (
    <form action={action} className="form-card invoice-form">
      {invoice && <input type="hidden" name="id" value={invoice.id}/>} 
      <input type="hidden" name="project_id" value={project.id}/>
      <input type="hidden" name="return_to" value={`/projects/${project.id}/billing`}/>

      <div className="form-section">
        <h2>請求情報</h2>
        <div className="form-grid two">
          <label className="field"><span>請求名 *</span><input name="title" required defaultValue={invoice?.title ?? `${project.name} 請求`}/></label>
          <label className="field"><span>状態</span><select name="status" defaultValue={invoice?.status ?? "planned"}>{statuses.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>

        {unitMode && (
          <>
            <div className="billing-suggestion">
              <div><span>実施済み</span><strong>{project.completedUnits ?? 0}{project.unitLabel ?? "回"}</strong></div>
              <div><span>請求割当済み</span><strong>{summary?.allocatedUnits ?? 0}{project.unitLabel ?? "回"}</strong></div>
              <div><span>今回の候補</span><strong>{summary?.suggestedUnits ?? 0}{project.unitLabel ?? "回"}</strong></div>
            </div>
            <div className="form-grid three">
              <label className="field"><span>今回の回数・数量</span><input type="number" name="unit_quantity" min="0" step="0.01" value={quantity} onChange={(e)=>updateQty(Number(e.target.value || 0))}/></label>
              <label className="field"><span>単価</span><input type="number" name="unit_price" min="0" step="1" value={unitPrice} onChange={(e)=>updateUnitPrice(Number(e.target.value || 0))}/></label>
              <label className="field"><span>請求額 *</span><input type="number" name="amount" min="0" step="1" value={amount} onChange={(e)=>setAmount(Number(e.target.value || 0))}/><small>回数×単価：{Math.round(calculated).toLocaleString("ja-JP")}円</small></label>
            </div>
          </>
        )}

        {!unitMode && (
          <div className="form-grid two">
            <label className="field"><span>請求額 *</span><input type="number" name="amount" min="0" step="1" value={amount} onChange={(e)=>setAmount(Number(e.target.value || 0))}/></label>
            {isNew && summary && <div className="field billing-hint"><span>未割当の売上</span><strong>{summary.unallocatedAmount.toLocaleString("ja-JP")}円</strong><small>今回の候補額を初期入力しています。</small></div>}
          </div>
        )}
      </div>

      <div className="form-section">
        <h2>日付</h2>
        <div className="form-grid four">
          <label className="field"><span>請求予定日</span><input type="date" name="scheduled_invoice_date" defaultValue={invoice?.scheduledInvoiceDate ?? (isNew ? todayJst() : undefined)}/></label>
          <label className="field"><span>請求日</span><input type="date" name="invoice_date" defaultValue={invoice?.invoiceDate}/><small>請求済へ変更時、未入力なら当日を自動設定</small></label>
          <label className="field"><span>支払期限</span><input type="date" name="due_date" defaultValue={invoice?.dueDate}/></label>
          <label className="field"><span>入金日</span><input type="date" name="paid_date" defaultValue={invoice?.paidDate}/><small>入金済へ変更時、未入力なら当日を自動設定</small></label>
        </div>
      </div>

      <div className="form-section">
        <h2>管理情報</h2>
        <div className="form-grid two">
          <label className="field"><span>請求書番号・管理番号</span><input name="reference_no" defaultValue={invoice?.referenceNo}/></label>
          <label className="field"><span>取引先</span><input value={project.companyName} disabled/></label>
        </div>
        <label className="field"><span>メモ</span><textarea name="memo" rows={4} defaultValue={invoice?.memo}/></label>
      </div>

      <div className="form-actions"><a href={`/projects/${project.id}/billing`} className="button">キャンセル</a><SubmitButton>保存</SubmitButton></div>
    </form>
  );
}
