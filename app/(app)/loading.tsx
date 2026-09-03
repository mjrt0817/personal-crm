export default function AppLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div className="loading-bar" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
      <span className="sr-only">読み込み中</span>
    </div>
  );
}
