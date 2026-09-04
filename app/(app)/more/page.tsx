import Link from "next/link";
const items=[
  ["🧾","見積","/estimates","見積書の作成・案件化"],
  ["📊","売上・見込","/pipeline","商談・受注・売上パイプライン"],
  ["💴","請求・入金","/billing","請求予定・入金・期限超過"],
  ["🏢","取引先","/companies","取引先・担当者"],
  ["🎯","優先アクション","/focus","今日・今週の対応候補"],
  ["🤖","AI参謀","/assistant","AI機能（必要な時に利用）"],
  ["🔍","全体検索","/search","取引先・案件・活動を検索"],
  ["⚙","設定","/settings","Google連携・帳票・バックアップ"]
];
export default function MorePage(){return <><div className="page-head"><div><h1>その他</h1><p className="muted">業務管理の各機能へ移動します。</p></div></div><div className="more-menu-grid">{items.map(([icon,label,href,note])=><Link key={href} className="more-menu-card" href={href}><span className="more-menu-icon">{icon}</span><div><strong>{label}</strong><div className="small muted">{note}</div></div><span className="more-menu-arrow">›</span></Link>)}</div></>}
