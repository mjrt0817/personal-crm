import Link from "next/link";
import GoogleLoginButton from "./GoogleLoginButton";

export default function LoginPage() {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">CRM</div>
        <h1>業務管理</h1>
        <p className="muted">自分用のSFA・CRM・案件・タスク管理</p>
        {demo ? (
          <>
            <Link className="button primary" href="/dashboard">デモ画面を開く</Link>
            <div className="demo-note">現在はデモモードです。Supabase設定後にGoogleログインへ切り替えられます。</div>
          </>
        ) : <GoogleLoginButton />}
      </div>
    </main>
  );
}
