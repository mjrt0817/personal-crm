import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { updateContact } from "@/lib/actions";
import { getContactDetail } from "@/lib/data";

export default async function ContactEditPage({
  params
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id: companyId, contactId } = await params;
  const contact = await getContactDetail(contactId, companyId);
  if (!contact) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="small muted" href={`/companies/${companyId}#contacts`}>← 取引先へ戻る</Link>
          <h1 style={{ marginTop: 8 }}>担当者編集</h1>
          <p className="muted">{contact.companyName} / {contact.name}</p>
        </div>
      </div>

      <form action={updateContact} className="form-card form-padded">
        <input type="hidden" name="id" value={contact.id}/>
        <input type="hidden" name="company_id" value={contact.companyId}/>

        <div className="form-grid two">
          <label className="field"><span>氏名 *</span><input name="name" required defaultValue={contact.name}/></label>
          <label className="field"><span>部署</span><input name="department" defaultValue={contact.department ?? ""}/></label>
          <label className="field"><span>役職</span><input name="position" defaultValue={contact.position ?? ""}/></label>
          <label className="field"><span>メール</span><input type="email" name="email" defaultValue={contact.email ?? ""}/></label>
          <label className="field"><span>電話</span><input type="tel" name="phone" defaultValue={contact.phone ?? ""}/></label>
          <label className="field"><span>携帯電話</span><input type="tel" name="mobile" defaultValue={contact.mobile ?? ""}/></label>
        </div>

        <label className="field"><span>メモ</span><textarea name="memo" rows={4} defaultValue={contact.memo ?? ""}/></label>

        <div className="form-actions">
          <Link className="button" href={`/companies/${companyId}#contacts`}>キャンセル</Link>
          <SubmitButton pendingLabel="保存中…">変更を保存</SubmitButton>
        </div>
      </form>
    </>
  );
}
