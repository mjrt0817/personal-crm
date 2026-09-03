-- Ver.1.1以降、案件種別はGoogle初回ログイン時に自動作成されます。
-- このファイルは手動投入が必要な環境向けの予備です。
-- <USER_UUID> を auth.users の自分のUUIDへ置換して実行してください。

insert into public.project_categories (user_id, name, sort_order) values
('<USER_UUID>', 'DX支援', 10),
('<USER_UUID>', 'ITコンサルティング', 20),
('<USER_UUID>', 'Webサイト制作', 30),
('<USER_UUID>', 'Webサイト保守', 40),
('<USER_UUID>', 'システム開発', 50),
('<USER_UUID>', '業務改善', 60),
('<USER_UUID>', 'IT導入支援', 70),
('<USER_UUID>', '研修・講師', 80),
('<USER_UUID>', 'その他', 90)
on conflict do nothing;
