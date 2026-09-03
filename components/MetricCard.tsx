export default function MetricCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note ? <div className="small muted">{note}</div> : null}
    </div>
  );
}
