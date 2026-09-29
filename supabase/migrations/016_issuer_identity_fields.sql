-- Ver.3.0.4 発行者の「屋号」と「氏名」を分離
-- 既存の issuer_name は互換用に残し、既存値は屋号へ移行します。

alter table public.invoice_settings
  add column if not exists issuer_trade_name text,
  add column if not exists issuer_person_name text;

update public.invoice_settings
set issuer_trade_name = nullif(issuer_name, '')
where issuer_trade_name is null
  and nullif(issuer_name, '') is not null;

comment on column public.invoice_settings.issuer_trade_name is '請求書・見積書に表示する屋号／事業者名';
comment on column public.invoice_settings.issuer_person_name is '請求書・見積書に表示する発行者氏名';
