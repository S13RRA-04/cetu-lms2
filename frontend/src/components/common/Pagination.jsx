export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {start > 1 && <><button className="page-btn" onClick={() => onChange(1)}>1</button>{start > 2 && <span className="text-muted text-xs">…</span>}</>}
      {pages.map((p) => (
        <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      {end < totalPages && <><span className="text-muted text-xs">…</span><button className="page-btn" onClick={() => onChange(totalPages)}>{totalPages}</button></>}
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
