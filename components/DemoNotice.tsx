export default function DemoNotice({ show }: { show?: boolean }) {
  if (!show) return null;
  return <div className="notice">デモモードのため保存は行われません。Supabase接続後は同じ画面から実データを登録できます。</div>;
}
