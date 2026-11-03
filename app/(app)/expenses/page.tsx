import Link from "next/link";
import { financeRows } from "@/lib/finance-server";
import { addExpense, uploadReceipt } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const settlements: Record<string, string> = {
  cash: "事業用現預金で支払済", payable: "未払・カード", owner: "個人資金で立替",
};

export default async function Expenses({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const [expenses, receipts] = await Promise.all([financeRows("expenses"), financeRows("expense_receipts")]);
  const filtered = expenses.filter(e =>
    (!p.start || e.expense_date >= p.start) && (!p.end || e.expense_date <= p.end) &&
    (!p.vendor || e.vendor.toLowerCase().includes(p.vendor.toLowerCase())) &&
    (!p.min || Number(e.amount) >= Number(p.min)) && (!p.max || Number(e.amount) <= Number(p.max))
  ).sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const receiptIds = new Set(receipts.map(r => r.expense_id));
  const missing = filtered.filter(e => !receiptIds.has(e.id)).length;
  const searching = Boolean(p.start || p.end || p.vendor || p.min || p.max);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());

  return <div className="expense-page">
    <div className="page-head">
      <div><h1>経費・領収書</h1><p className="muted">経費を登録してから、領収書をGoogle Driveに保存できます。</p></div>
      <div className="expense-toolbar">
        <Link href="/finance" className="button">簡易PL・BS</Link>
        <Link href="/api/export/expenses" prefetch={false} className="button">CSV出力</Link>
      </div>
    </div>
    {p.error && <div className="notice error-notice" role="alert">{p.error}</div>}
    {p.saved && <div className="notice success-notice" role="status">保存しました。領収書は下の登録済み一覧から追加できます。</div>}

    <form action={addExpense} className="form-card expense-entry">
      <div className="form-section">
        <div className="expense-section-title"><h2>経費を登録</h2><span className="small muted">＊ 必須項目</span></div>
        <div className="form-grid two">
          <label className="field"><span>取引日 ＊</span><input type="date" name="date" defaultValue={today} required /></label>
          <label className="field"><span>取引先 ＊</span><input name="vendor" maxLength={200} required placeholder="例：Google、OpenAI" /></label>
          <label className="field"><span>分類</span><select name="category">{["GWS", "ChatGPT", "ドメイン", "サーバー", "その他"].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="field"><span>金額（税込・円）＊</span><input name="amount" type="number" min="1" max="999999999" step="1" inputMode="numeric" placeholder="例：3,000 → 3000 と入力" required /><small className="muted">事業に使った分の日本円額を入力</small></label>
          <label className="field"><span>支払方法</span><select name="settlement">{Object.entries(settlements).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select><small className="muted">未払・カードの決済は、後日「仕訳入力」で登録します。</small></label>
          <label className="field"><span>備考（任意）</span><textarea name="memo" rows={2} maxLength={2000} placeholder="利用月、用途、外貨の換算根拠など" /></label>
        </div>
      </div>
      <div className="form-actions expense-entry-actions"><span className="small muted">領収書は登録後に追加できます</span><SubmitButton>経費を登録</SubmitButton></div>
    </form>

    <section className="card expense-records" aria-labelledby="expense-records-title">
      <div className="card-head"><h2 id="expense-records-title">登録済みの経費</h2><span className="badge">{filtered.length}件{searching ? " / 検索結果" : " / 全期間"}</span></div>
      <div className="card-body">
        <form className="expense-filter">
          <div className="form-grid three">
            <label className="field"><span>取引先で検索</span><input name="vendor" defaultValue={p.vendor} placeholder="取引先名の一部" /></label>
            <label className="field"><span>取引日（開始）</span><input type="date" name="start" defaultValue={p.start} /></label>
            <label className="field"><span>取引日（終了）</span><input type="date" name="end" defaultValue={p.end} /></label>
          </div>
          <details className="expense-details" open={Boolean(p.min || p.max)}><summary>金額で絞り込む</summary><div className="form-grid two expense-details-body">
            <label className="field"><span>金額の下限（円）</span><input type="number" name="min" min="0" defaultValue={p.min} placeholder="指定なし" /></label>
            <label className="field"><span>金額の上限（円）</span><input type="number" name="max" min="0" defaultValue={p.max} placeholder="指定なし" /></label>
          </div></details>
          <div className="expense-filter-actions"><button className="button primary" type="submit">検索する</button><Link href="/expenses" className="button">条件をクリア</Link></div>
        </form>
        <div className="expense-results-summary"><span>{searching ? "検索結果" : "全期間"}の登録額 <strong>{total.toLocaleString()}円</strong></span><span className="small muted">領収書未登録 {missing}件 · 訂正仕訳はこの合計に含みません</span></div>
        {!filtered.length && <div className="expense-empty"><strong>{searching ? "条件に一致する経費はありません" : "まだ経費が登録されていません"}</strong><p className="muted">{searching ? "検索条件を変更するか、条件をクリアしてください。" : "上のフォームから、最初の経費を登録しましょう。"}</p></div>}
        <div className="expense-list">{filtered.map(e => {
          const attached = receipts.filter(r => r.expense_id === e.id);
          return <article className="expense-record" key={e.id}>
            <div className="expense-record-heading"><div><div className="small muted">{e.expense_date} · {e.category}</div><h3>{e.vendor}</h3></div><strong className="expense-amount">{Number(e.amount).toLocaleString()}<span>円</span></strong></div>
            <div className="expense-record-meta"><span className="badge">{settlements[e.settlement]}</span><span className={`badge ${attached.length ? "green" : "orange"}`}>{attached.length ? `領収書 ${attached.length}件` : "領収書未登録"}</span></div>
            {e.memo && <p className="expense-memo small">{e.memo}</p>}
            {attached.length > 0 && <ul className="expense-receipts">{attached.map(r => <li key={r.id}><a href={`https://drive.google.com/file/d/${encodeURIComponent(r.drive_file_id)}/view`} target="_blank" rel="noreferrer">{r.original_name} ↗</a><span className="small muted">{r.source === "electronic" ? "電子受領" : "紙スキャン"}</span></li>)}</ul>}
            <details className="expense-details"><summary>領収書を追加</summary><form action={uploadReceipt} className="expense-details-body">
              <input type="hidden" name="expense_id" value={e.id} />
              <div className="form-grid two">
                <label className="field"><span>領収書ファイル</span><input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required /><small className="muted">PDF・JPEG・PNG / 3MB以下</small></label>
                <label className="field"><span>受け取った形式</span><select name="source"><option value="electronic">電子受領した原本</option><option value="paper_scan">紙を撮影・スキャン</option></select></label>
              </div><div className="expense-toolbar"><SubmitButton>Google Driveに保存</SubmitButton></div>
            </form></details>
            <details className="expense-details expense-record-id"><summary>登録IDを確認</summary><p className="small expense-details-body">{e.id}</p></details>
          </article>;
        })}</div>
      </div>
    </section>
    <details className="expense-guidance"><summary>保存・訂正について</summary><div className="small muted">
      <p>電子受領した領収書は元ファイルを保存してください。紙を撮影した場合は、スキャナ保存の要件確認まで紙原本を保管してください。Drive保存だけで法令適合や控除を保証するものではありません。</p>
      <p>外貨は円換算額と換算根拠を備考に記録してください。登録後の訂正は、<Link href="/finance" className="link-text">仕訳入力</Link>で元の登録IDを記録して逆仕訳を追加します。</p>
    </div></details>
  </div>;
}
