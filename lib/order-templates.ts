export type CheckStage='pre'|'post'|'handover';
export type CheckStatus='pending'|'ok'|'issue'|'na';
export type AcceptanceCheck={id:string;stage:CheckStage;label:string;status:CheckStatus;note:string};
export type OrderConditions={template_id:string;target_environments:string;change_terms:string;support_terms:string;outcome_terms:string;checklist:AcceptanceCheck[]};
export const stageLabels:Record<CheckStage,string>={pre:'公開前',post:'公開後',handover:'引継ぎ'};
export const checkStatusLabels:Record<CheckStatus,string>={pending:'未確認',ok:'確認済み',issue:'要修正',na:'対象外'};
export const WEB_INSPECTION_TERMS=[
 '【確認対象】見積書・注文書および別途合意した仕様に記載するページ、掲載内容、機能を対象とし、別紙の納品・検収チェックリストで確認します。対象外の項目は理由を記録します。',
 '【確認時期】公開前に掲載内容・デザイン・基本動作を確認し、公開後に本番環境で表示・リンク・フォーム通知等を再確認します。',
 '【確認期間】注文者は、検収依頼と確認用URL・必要情報を受領後7営業日以内に確認結果を連絡します。期間内の確認が難しい場合は、期限までに申し出て延長期間を協議します。不具合は該当ページ・内容・確認環境をまとめて通知します。',
 '【修正と完了】合意内容との相違・動作不良について必要な修正と再確認を行い、注文者がメール、LINEまたは検収書等で明示的に承認した時点で検収完了とします。公開や期間経過だけでは検収完了としません。'
].join('\n');
const checks:Array<[CheckStage,string]>=[
 ['pre','合意したページ・セクション・機能が揃っている'],
 ['pre','文章・写真・料金・連絡先・営業時間について注文者が確認している'],
 ['pre','合意したPC・スマートフォン環境で表示と操作を確認している'],
 ['pre','内部・外部リンク、電話・LINE等の導線が正しい'],
 ['pre','フォームの必須入力・送信・通知・自動返信を合意した範囲で確認している'],
 ['pre','タイトル・説明文・OGP等を合意した範囲で設定している'],
 ['post','正式ドメイン・HTTPSで各ページと画像が表示される'],
 ['post','本番フォームのテスト送信が指定の通知先へ到達する'],
 ['post','本番の電話・LINE・外部サービスへのリンクが正しい'],
 ['post','公開用のnoindex・検索エンジン表示設定・canonical等を確認している'],
 ['post','アクセス解析・コンバージョン計測を合意した範囲で確認している'],
 ['handover','管理者権限・管理情報を合意した方法で引き継いでいる（パスワードは本票に記載しない）'],
 ['handover','更新方法・操作説明を合意した範囲で案内している'],
 ['handover','初期バックアップ・復旧方法・保守範囲を合意した範囲で確認している'],
 ['handover','修正事項が解消し、注文者の検収承認を記録できる状態である']
];
export function webChecklist():AcceptanceCheck[]{return checks.map(([stage,label],i)=>({id:`web-${i+1}`,stage,label,status:'pending',note:''}));}
export function webConditions():OrderConditions{return {
 template_id:'website-v1',target_environments:'PC：Google Chrome・Microsoft Edge／スマートフォン：iOS Safari・Android Chrome（確認時点の最新版。対象端末・OSは案件に合わせて合意）',
 change_terms:'合意した業務範囲・仕様との相違や制作に起因する動作不良は修正対象とします。承認後のデザイン変更、ページ追加、新機能、原稿差替え等の追加・変更依頼は、着手前に費用・納期への影響を協議して合意します。',
 support_terms:'検収後に判明した合意内容との相違・不具合は、原因と契約内容を確認して対応します。更新・運用・保守や新たな追加変更は別契約・別途見積とします。検収完了だけを理由に契約不適合に関する責任を一律に免除するものではありません。',
 outcome_terms:'検索順位、アクセス数、問い合わせ件数、売上等の成果は、別途明示的に合意した場合を除き保証対象としません。合意したSEO設定や計測機能の設定・動作は確認対象とします。',checklist:webChecklist()
};}
export function validateChecks(value:unknown,baseline=false):AcceptanceCheck[]{
 if(!Array.isArray(value)||!value.length||value.length>80)throw new Error('チェック項目は1〜80件にしてください。');
 const ids=new Set<string>();return value.map(x=>{
  if(!x||typeof x!=='object'||typeof x.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(x.id)||ids.has(x.id)||!['pre','post','handover'].includes(x.stage)||typeof x.label!=='string'||!x.label.trim()||x.label.length>600||!['pending','ok','issue','na'].includes(x.status)||typeof x.note!=='string'||x.note.length>2000)throw new Error('チェック項目の形式を確認してください。');
  ids.add(x.id);return {...x,label:x.label.trim(),...(baseline?{status:'pending',note:''}:{})} as AcceptanceCheck;
 });
}
export function readConditions(f:FormData):OrderConditions{
 let raw:unknown;try{raw=JSON.parse(String(f.get('checklist_json')||'[]'));}catch{throw new Error('チェックリストを確認してください。');}
 const template=String(f.get('template_id')||'');if(!['','website-v1'].includes(template))throw new Error('テンプレートを選び直してください。');
 const fields=['target_environments','change_terms','support_terms','outcome_terms'] as const;const conditions={template_id:template,checklist:validateChecks(raw,true)} as OrderConditions;
 for(const key of fields){conditions[key]=String(f.get(key)||'').trim();if(conditions[key].length>5000)throw new Error('条件は各5000文字以内にしてください。');}
 if(template==='website-v1'&&fields.some(k=>!conditions[k]))throw new Error('Webサイト構築の条件を入力してください。');return conditions;
}
