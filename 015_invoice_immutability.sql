-- Ver.3.0.3 発行済み請求書の不変性を保証
-- issued_snapshot_at が設定された後は、帳票に印字される内容を変更できないようにします。
-- 許可するのは状態（請求済/入金済/取消）と入金日、updated_at の更新です。

create or replace function public.prevent_issued_invoice_document_changes()
returns trigger
language plpgsql
as $$
begin
  if old.issued_snapshot_at is not null then
    if new.user_id is distinct from old.user_id
      or new.project_id is distinct from old.project_id
      or new.company_id is distinct from old.company_id
      or new.title is distinct from old.title
      or new.amount is distinct from old.amount
      or new.unit_quantity is distinct from old.unit_quantity
      or new.unit_price is distinct from old.unit_price
      or new.scheduled_invoice_date is distinct from old.scheduled_invoice_date
      or new.invoice_date is distinct from old.invoice_date
      or new.due_date is distinct from old.due_date
      or new.reference_no is distinct from old.reference_no
      or new.line_description is distinct from old.line_description
      or new.tax_rate is distinct from old.tax_rate
      or new.billing_name is distinct from old.billing_name
      or new.billing_postal_code is distinct from old.billing_postal_code
      or new.billing_address is distinct from old.billing_address
      or new.issuer_snapshot is distinct from old.issuer_snapshot
      or new.customer_snapshot is distinct from old.customer_snapshot
      or new.issued_snapshot_at is distinct from old.issued_snapshot_at
      or new.memo is distinct from old.memo
    then
      raise exception '発行済み請求書の帳票内容は変更できません。取消して新しい請求書を作成してください。';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_issued_invoice_document on public.project_invoices;
create trigger protect_issued_invoice_document
before update on public.project_invoices
for each row execute function public.prevent_issued_invoice_document_changes();

create or replace function public.prevent_issued_invoice_delete()
returns trigger
language plpgsql
as $$
begin
  if old.issued_snapshot_at is not null then
    raise exception '発行済み請求書は削除できません。取消として履歴を残してください。';
  end if;
  return old;
end;
$$;

drop trigger if exists protect_issued_invoice_delete on public.project_invoices;
create trigger protect_issued_invoice_delete
before delete on public.project_invoices
for each row execute function public.prevent_issued_invoice_delete();
