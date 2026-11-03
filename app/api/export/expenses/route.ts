import { financeRows,financeClient } from '@/lib/finance-server';
import { toCsv } from '@/lib/backup';
export async function GET(){
 await financeClient();
 try{
  const [expenses,receipts,journals]=await Promise.all([financeRows('expenses'),financeRows('expense_receipts'),financeRows('finance_entries')]);
  const rows=expenses.map(e=>({種別:'経費元データ',識別子:`expense:${e.id}`,日付:e.expense_date,取引先:e.vendor,分類:e.category,税込事業分円:e.amount,支払区分:e.settlement,借方:'',貸方:'',備考:e.memo,証憑:receipts.filter(r=>r.expense_id===e.id).map(r=>`https://drive.google.com/file/d/${r.drive_file_id}/view SHA256:${r.sha256}`).join('\n'),要確認:'会計側で勘定科目・税区分・計上日を確認。手動仕訳と重複取込しない'}));
  rows.push(...journals.map(j=>({種別:'手動仕訳参考',識別子:`journal:${j.id}`,日付:j.entry_date,取引先:'',分類:'',税込事業分円:j.amount,支払区分:'',借方:j.debit,貸方:j.credit,備考:j.memo,証憑:'',要確認:'経費元データとの重複を確認。ベンダー専用取込形式ではありません'})));
  return new Response(rows.length?toCsv(rows):'\uFEFF種別,識別子,日付\r\n',{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="personal-crm-expenses.csv"','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }catch{return new Response('エクスポートに失敗しました',{status:500});}
}
