import type { FormOptions, Project } from "@/lib/types";

const statuses = [
  ["consultation","相談"],["hearing","ヒアリング"],["preparing","提案準備"],["proposed","提案済"],["considering","検討中"],
  ["ordered","受注"],["in_progress","対応中"],["on_hold","保留"],["completed","完了"],["lost","失注"]
];

export default function ProjectForm({ project, options, action }: { project?: Project; options: FormOptions; action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="form-card">
      {project && <input type="hidden" name="id" value={project.id}/>} 
      <div className="form-section">
        <h2>基本情報</h2>
        <div className="form-grid two">
          <label className="field"><span>案件名 *</span><input name="name" required defaultValue={project?.name}/></label>
          <label className="field"><span>取引先 *</span><select name="company_id" required defaultValue={project?.companyId ?? ""}><option value="">選択してください</option>{options.companies.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="field"><span>主担当者</span><select name="primary_contact_id" defaultValue={project?.contactId ?? ""}><option value="">未設定</option>{options.contacts.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="field"><span>案件種別</span><select name="category_id" defaultValue={project?.categoryId ?? ""}><option value="">未設定</option>{options.categories.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="field"><span>ステータス</span><select name="status" defaultValue={project?.status ?? "consultation"}>{statuses.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field"><span>優先度</span><select name="priority" defaultValue={project?.priority ?? "medium"}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        </div>
        <label className="field"><span>案件概要</span><textarea name="description" rows={4} defaultValue={project?.description}/></label>
      </div>

      <div className="form-section">
        <h2>次にやること</h2>
        <div className="form-grid two">
          <label className="field"><span>次回アクション</span><input name="next_action" defaultValue={project?.nextAction}/></label>
          <label className="field"><span>期限</span><input type="datetime-local" name="next_action_due" defaultValue={project?.nextActionDue}/></label>
        </div>
      </div>

      <div className="form-section">
        <h2>日程</h2>
        <div className="form-grid three">
          <label className="field"><span>相談日</span><input type="date" name="inquiry_date" defaultValue={project?.inquiryDate}/></label>
          <label className="field"><span>提案予定日</span><input type="date" name="proposal_date" defaultValue={project?.proposalDate}/></label>
          <label className="field"><span>受注日</span><input type="date" name="order_date" defaultValue={project?.orderDate}/></label>
          <label className="field"><span>開始日</span><input type="date" name="start_date" defaultValue={project?.startDate}/></label>
          <label className="field"><span>納期</span><input type="date" name="due_date" defaultValue={project?.dueDate}/></label>
          <label className="field"><span>完了日</span><input type="date" name="completed_date" defaultValue={project?.completedDate}/></label>
        </div>
      </div>

      <div className="form-section">
        <h2>金額・メモ</h2>
        <div className="form-grid two">
          <label className="field"><span>見込金額</span><input type="number" name="expected_amount" min="0" step="1" defaultValue={project?.expectedAmount}/></label>
          <label className="field"><span>受注金額</span><input type="number" name="order_amount" min="0" step="1" defaultValue={project?.orderAmount}/></label>
        </div>
        <label className="field"><span>案件メモ</span><textarea name="memo" rows={5} defaultValue={project?.memo}/></label>
      </div>

      <div className="form-actions"><a href={project ? `/projects/${project.id}` : "/projects"} className="button">キャンセル</a><button type="submit" className="button primary">保存</button></div>
    </form>
  );
}
