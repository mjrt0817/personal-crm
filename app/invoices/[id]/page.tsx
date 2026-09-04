import Link from "next/link";
import { notFound } from "next/navigation";
import PrintInvoiceButton from "@/components/PrintInvoiceButton";
import { getInvoiceDocumentData } from "@/lib/data";

function yen(value:number){ return `¥${Math.round(value).toLocaleString("ja-JP")}`; }
function date(value?:string){ return value ? value.replaceAll("-", "/") : "—"; }

export default async function InvoiceDocumentPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const doc=await getInvoiceDocumentData(id);
  if(!doc) notFound();
  const {invoice,project,issuer,customer,taxAmount,subtotal}=doc;
  const qty=invoice.unitQuantity;
  const unitPrice=invoice.unitPrice;
  const line=invoice.lineDescription || invoice.title || project.name;
  return <div className="invoice-document-shell">
    <div className="invoice-document-toolbar no-print">
      <Link className="button" href={`/projects/${invoice.projectId}/billing`}>← 請求管理へ</Link>
      <div className="row-actions">
        <Link className="button" href={`/billing/${invoice.id}/edit`}>編集</Link>
        <PrintInvoiceButton/>
      </div>
    </div>
    <main className="invoice-paper">
      <header className="invoice-doc-header">
        <div>
          <h1>請 求 書</h1>
          <div className="invoice-doc-customer">
            <div className="invoice-customer-name">{customer.name || invoice.companyName || "取引先"} 御中</div>
            {customer.postalCode && <div>〒{customer.postalCode}</div>}
            {customer.address && <div>{customer.address}</div>}
          </div>
        </div>
        <div className="invoice-doc-meta">
          <div><span>請求書番号</span><strong>{invoice.referenceNo || "未採番"}</strong></div>
          <div><span>発行日</span><strong>{date(invoice.invoiceDate || invoice.scheduledInvoiceDate)}</strong></div>
          <div><span>支払期限</span><strong>{date(invoice.dueDate)}</strong></div>
        </div>
      </header>

      <section className="invoice-doc-parties">
        <div className="invoice-doc-message">
          <p>下記の通りご請求申し上げます。</p>
          <div className="invoice-total-box"><span>ご請求金額</span><strong>{yen(invoice.amount)}</strong></div>
        </div>
        <div className="invoice-issuer">
          <strong>{issuer.name || "発行者情報未設定"}</strong>
          {issuer.postalCode && <div>〒{issuer.postalCode}</div>}
          {issuer.address && <div>{issuer.address}</div>}
          {issuer.phone && <div>TEL：{issuer.phone}</div>}
          {issuer.email && <div>{issuer.email}</div>}
          {issuer.registrationNumber && <div>登録番号：{issuer.registrationNumber}</div>}
        </div>
      </section>

      <table className="invoice-lines">
        <thead><tr><th>品目</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
        <tbody><tr><td>{line}</td><td>{qty != null ? `${qty}${project.unitLabel ?? ""}` : "1"}</td><td>{unitPrice != null ? yen(unitPrice) : "—"}</td><td>{yen(invoice.amount)}</td></tr></tbody>
      </table>

      <section className="invoice-totals">
        <div></div>
        <dl>
          <div><dt>税抜相当額</dt><dd>{yen(subtotal)}</dd></div>
          <div><dt>消費税（{invoice.taxRate ?? 0}%・内税）</dt><dd>{yen(taxAmount)}</dd></div>
          <div className="grand"><dt>合計</dt><dd>{yen(invoice.amount)}</dd></div>
        </dl>
      </section>

      {(issuer.bankName || issuer.bankAccountNumber) && <section className="invoice-bank">
        <h2>お振込先</h2>
        <div>{[issuer.bankName,issuer.bankBranch].filter(Boolean).join(" ")}</div>
        <div>{[issuer.bankAccountType,issuer.bankAccountNumber].filter(Boolean).join(" ")}</div>
        {issuer.bankAccountName && <div>口座名義：{issuer.bankAccountName}</div>}
      </section>}

      {(issuer.paymentNote || invoice.memo) && <section className="invoice-notes">
        {issuer.paymentNote && <p>{issuer.paymentNote}</p>}
        {invoice.memo && <p>{invoice.memo}</p>}
      </section>}

      {!issuer.name && <div className="invoice-warning no-print">設定 → 請求書設定で発行者情報を入力してください。</div>}
    </main>
  </div>;
}
