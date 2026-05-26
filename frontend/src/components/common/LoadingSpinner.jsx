export default function LoadingSpinner({ fullPage }) {
  if (fullPage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
    </div>
  );
}
