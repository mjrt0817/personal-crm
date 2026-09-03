export default function SettingsPage() {
  return (
    <>
      <div className="page-head"><div><h1>設定</h1><p className="muted">案件種別、認証、今後の連携設定を配置します。</p></div></div>
      <section className="card">
        <div className="card-head"><h2>Ver.1 設定</h2></div>
        <div className="card-body">
          <div className="kv"><div className="k">認証</div><div>Google / Supabase Auth</div></div>
          <div className="kv"><div className="k">タイムゾーン</div><div>Asia/Tokyo</div></div>
          <div className="kv"><div className="k">クイックリンク</div><div>案件ごとに最大4件</div></div>
        </div>
      </section>
    </>
  );
}
