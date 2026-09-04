"use client";

import { useMemo, useState } from "react";
import type { FormOptions } from "@/lib/types";

export default function ProjectPartyFields({
  options,
  companyId,
  contactId
}: {
  options: FormOptions;
  companyId?: string;
  contactId?: string;
}) {
  const initialCompanyId = companyId ?? "";
  const initialContactIsValid = Boolean(
    contactId && options.contacts.some((contact) => contact.id === contactId && contact.companyId === initialCompanyId)
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [selectedContactId, setSelectedContactId] = useState(initialContactIsValid ? contactId ?? "" : "");

  const companyContacts = useMemo(
    () => options.contacts.filter((contact) => contact.companyId === selectedCompanyId),
    [options.contacts, selectedCompanyId]
  );

  function handleCompanyChange(nextCompanyId: string) {
    setSelectedCompanyId(nextCompanyId);
    const stillBelongs = options.contacts.some(
      (contact) => contact.id === selectedContactId && contact.companyId === nextCompanyId
    );
    if (!stillBelongs) setSelectedContactId("");
  }

  return (
    <>
      <label className="field">
        <span>取引先 *</span>
        <select
          name="company_id"
          required
          value={selectedCompanyId}
          onChange={(event) => handleCompanyChange(event.target.value)}
        >
          <option value="">選択してください</option>
          {options.companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>主担当者</span>
        <select
          name="primary_contact_id"
          value={selectedContactId}
          onChange={(event) => setSelectedContactId(event.target.value)}
          disabled={!selectedCompanyId}
        >
          <option value="">{selectedCompanyId ? "未設定" : "先に取引先を選択"}</option>
          {companyContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>{contact.name}</option>
          ))}
        </select>
        {selectedCompanyId && companyContacts.length === 0 && (
          <small className="muted">この取引先には担当者が登録されていません。</small>
        )}
      </label>
    </>
  );
}
