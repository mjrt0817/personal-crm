export const accounts = {cash:'現預金',receivable:'売掛金',payable:'未払金',capital:'元入金・事業主勘定',revenue:'売上',expense:'経費'} as const;
export type Account = keyof typeof accounts;
export type Entry = {entry_date:string; debit:Account; credit:Account; amount:number; memo:string};
export type Expense = {id:string; expense_date:string; vendor:string; category:string; amount:number; settlement:'cash'|'payable'|'owner'; memo:string};
export function expenseEntry(e:Expense):Entry {
 return {entry_date:e.expense_date,debit:'expense',credit:e.settlement==='owner'?'capital':e.settlement,amount:Number(e.amount),memo:`${e.vendor} / ${e.category}`};
}
export function reports(entries:Entry[], year:number) {
 const balances:Record<Account,number>={cash:0,receivable:0,payable:0,capital:0,revenue:0,expense:0};
 let revenue=0,expense=0;
 for(const e of entries) {
  if(e.entry_date>=`${year+1}-01-01`) continue;
  const amount=Number(e.amount);
  balances[e.debit]+=amount; balances[e.credit]-=amount;
  if(e.entry_date>=`${year}-01-01`) {
   revenue+=(e.credit==='revenue'?amount:0)-(e.debit==='revenue'?amount:0);
   expense+=(e.debit==='expense'?amount:0)-(e.credit==='expense'?amount:0);
  }
 }
 const assets=balances.cash+balances.receivable;
 const liabilities=0-balances.payable;
 const equity=-balances.capital-balances.revenue-balances.expense;
 return {balances,revenue,expense,profit:revenue-expense,assets,liabilities,equity,difference:assets-liabilities-equity};
}
export function validDate(s:string) {return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function validAmount(n:number) {return Number.isSafeInteger(n)&&n>0&&n<=999999999;}
