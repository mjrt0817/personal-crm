import test from 'node:test';
import assert from 'node:assert/strict';
import {expenseEntry,reports,validDate,validAmount} from '../lib/finance.ts';
test('opening balances, accrual, payment, owner expense, reversal, and year boundary',()=>{
 const expense=(amount,settlement,date='2026-03-01')=>expenseEntry({amount,settlement,expense_date:date,vendor:'OpenAI',category:'ChatGPT'});
 const entry=(entry_date,debit,credit,amount)=>({entry_date,debit,credit,amount,memo:'test'});
 const entries=[entry('2025-01-01','cash','capital',100000),entry('2026-01-10','receivable','revenue',50000),entry('2026-02-01','cash','receivable',50000),expense(10000,'payable'),entry('2026-04-01','payable','cash',10000),expense(2000,'owner'),expense(3000,'cash'),entry('2026-05-01','cash','expense',3000),expense(9000,'cash','2027-01-01')];
 const r=reports(entries,2026);
 assert.equal(r.revenue,50000);assert.equal(r.expense,12000);assert.equal(r.profit,38000);
 assert.equal(r.assets,140000);assert.equal(r.liabilities,0);assert.equal(r.equity,140000);assert.equal(r.difference,0);
 assert.equal(reports(entries,2025).profit,0);
 assert.equal(reports(entries,2027).profit,-9000);
});
test('invalid dates and fractional, unsafe or nonpositive yen amounts rejected',()=>{
 for(const d of ['2026-02-29','2026-13-01','2026-01-32','foo','2026-1-1'])assert.equal(validDate(d),false);
 assert.equal(validDate('2028-02-29'),true);
 for(const n of [0,-1,0.5,Infinity,NaN,1000000000])assert.equal(validAmount(n),false);
 assert.equal(validAmount(999999999),true);
});
