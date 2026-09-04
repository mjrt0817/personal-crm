"use client";

import { useMemo, useState } from "react";
import type { EstimateFormOptions } from "@/lib/types";

export default function EstimatePartyFields({
  options,
  companyId,
  contactId,
  projectId,
  onCompanyChange
}: {
  options: EstimateFormOptions;
  companyId?: string;
  contactId?: string;
  projectId?: string;
  onCompanyChange?: (companyId: string) => void;
}) {
  const [company, setCompany] = useState(companyId ?? "");
  const [contact, setContact] = useState(contactId ?? "");
  const [project, setProject] = useState(projectId ?? "");
  const contacts = useMemo(() => options.contacts.filter((x) => x.companyId === company), [options.contacts, company]);
  const projects = useMemo(() => options.projects.filter((x) => x.companyId === company), [options.projects, company]);

  function changeCompany(value: string) {
    setCompany(value);
    if (!options.contacts.some((x) => x.id === contact && x.companyId === value)) setContact("");
    if (!options.projects.some((x) => x.id === project && x.companyId === value)) setProject("");
    onCompanyChange?.(value);
  }

  return (
    <>
      <label className="field"><span>取引先 *</span><select name="company_id" required value={company} onChange={(e)=>changeCompany(e.target.value)}><option value="">選択してください</option>{options.companies.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="field"><span>担当者</span><select name="contact_id" value={contact} onChange={(e)=>setContact(e.target.value)} disabled={!company}><option value="">未設定</option>{contacts.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select><small>{company ? `${contacts.length}名` : "取引先を選択すると候補を表示します"}</small></label>
      <label className="field"><span>既存案件へ紐付け</span><select name="project_id" value={project} onChange={(e)=>setProject(e.target.value)} disabled={!company}><option value="">案件化前 / 未設定</option>{projects.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select><small>採用時に案件へ金額・単価を反映できます。</small></label>
    </>
  );
}
