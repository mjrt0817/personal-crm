"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/lib/types";

function yen(value: number) {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

export default function ProjectPricingFields({ project }: { project?: Project }) {
  const [model, setModel] = useState(project?.pricingModel ?? "fixed");
  const [unitPrice, setUnitPrice] = useState(project?.unitPrice ?? 0);
  const [plannedUnits, setPlannedUnits] = useState(project?.plannedUnits ?? 1);
  const [completedUnits, setCompletedUnits] = useState(project?.completedUnits ?? 0);
  const unitLabel = project?.unitLabel ?? "回";

  const expected = useMemo(() => Math.max(0, unitPrice) * Math.max(0, plannedUnits), [unitPrice, plannedUnits]);
  const realized = useMemo(() => Math.max(0, unitPrice) * Math.max(0, completedUnits), [unitPrice, completedUnits]);

  return (
    <div className="pricing-fields">
      <label className="field">
        <span>金額管理方式</span>
        <select name="pricing_model" value={model} onChange={(e) => setModel(e.target.value as "fixed" | "unit")}>
          <option value="fixed">固定金額</option>
          <option value="unit">単価 × 回数・数量</option>
        </select>
      </label>

      {model === "fixed" ? (
        <div className="form-grid two">
          <label className="field"><span>見込金額</span><input type="number" name="expected_amount" min="0" step="1" defaultValue={project?.expectedAmount}/></label>
          <label className="field"><span>受注金額</span><input type="number" name="order_amount" min="0" step="1" defaultValue={project?.orderAmount}/></label>
        </div>
      ) : (
        <>
          <div className="form-grid four pricing-unit-grid">
            <label className="field"><span>単位</span><input name="unit_label" defaultValue={unitLabel} placeholder="回"/></label>
            <label className="field"><span>単価</span><input type="number" name="unit_price" min="0" step="1" value={unitPrice} onChange={(e)=>setUnitPrice(Number(e.target.value || 0))}/></label>
            <label className="field"><span>予定回数・数量</span><input type="number" name="planned_units" min="0" step="1" value={plannedUnits} onChange={(e)=>setPlannedUnits(Number(e.target.value || 0))}/></label>
            <label className="field"><span>実施済み回数・数量</span><input type="number" name="completed_units" min="0" step="1" value={completedUnits} onChange={(e)=>setCompletedUnits(Number(e.target.value || 0))}/></label>
          </div>
          <div className="pricing-preview">
            <div><span>予定売上</span><strong>{yen(expected)}</strong></div>
            <div><span>実施済み</span><strong>{yen(realized)}</strong></div>
            <div><span>残り</span><strong>{yen(Math.max(0, expected - realized))}</strong></div>
          </div>
          <p className="field-help">例：DXコンシェルジュは「単価 41,000円 × 予定3回」。2回で終了なら予定回数を2へ、5回に増えたら5へ変更できます。案件詳細から実施済み回数をワンクリックで増減できます。</p>
        </>
      )}
    </div>
  );
}
