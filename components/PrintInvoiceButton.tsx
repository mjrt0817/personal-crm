"use client";

export default function PrintInvoiceButton() {
  return <button type="button" className="button primary" onClick={() => window.print()}>印刷 / PDF保存</button>;
}
