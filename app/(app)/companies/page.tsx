import Link from "next/link";
import { getCompanies } from "@/lib/data";

export default async function CompaniesPage() {
  const companies = await getCompanies();
  return (
    <>
      <div className="page-head">
        <div><h1>取引先</h1><p className="muted">取引先情報と進行中案件を確認します。</p></div>
        <Link href="/companies/new" className="button primary">＋ 取引先</Link>
      </div>
      <section className="card table-wrap">
        <table>
          <thead><tr><th>取引先</th><th>業種</th><th>対応中案件</th><th>最終接触</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}><td><Link href={`/companies/${c.id}`}><strong>{c.name}</strong></Link></td><td>{c.industry}</td><td>{c.activeProjects}</td><td>{c.lastContact}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
