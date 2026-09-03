import SubmitButton from "@/components/SubmitButton";
import type { CompanyDetail } from "@/lib/types";

export default function CompanyForm({ company, action }: { company?: CompanyDetail; action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="form-card">
      {company && <input type="hidden" name="id" value={company.id}/>} 
      <div className="form-section">
        <h2>基本情報</h2>
        <div className="form-grid two">
          <label className="field"><span>取引先名 *</span><input name="name" required defaultValue={company?.name}/></label>
          <label className="field"><span>種別</span><select name="company_type" defaultValue={company?.companyType ?? "corporation"}><option value="corporation">法人</option><option value="individual">個人</option><option value="organization">団体</option><option value="other">その他</option></select></label>
          <label className="field"><span>業種</span><input name="industry" defaultValue={company?.industry}/></label>
          <label className="field"><span>郵便番号</span><input name="postal_code" defaultValue={company?.postalCode}/></label>
          <label className="field"><span>電話番号</span><input name="phone" inputMode="tel" defaultValue={company?.phone}/></label>
          <label className="field"><span>代表メール</span><input type="email" name="email" defaultValue={company?.email}/></label>
        </div>
        <label className="field"><span>住所</span><input name="address" defaultValue={company?.address}/></label>
        <label className="field"><span>Webサイト</span><input type="url" name="website_url" placeholder="https://" defaultValue={company?.websiteUrl}/></label>
        <label className="field"><span>メモ</span><textarea name="memo" rows={5} defaultValue={company?.memo}/></label>
      </div>
      <div className="form-actions"><a href={company ? `/companies/${company.id}` : "/companies"} className="button">キャンセル</a><SubmitButton>保存</SubmitButton></div>
    </form>
  );
}
