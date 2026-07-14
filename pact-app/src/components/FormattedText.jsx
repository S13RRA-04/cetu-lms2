import { Fragment, useRef } from 'react';

function inline(text) {
  const parts = String(text ?? '').split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Table({ lines }) {
  const rows = lines.map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
  const body = /^\s*:?-{3,}/.test(rows[1]?.[0] ?? '') ? rows.slice(2) : rows.slice(1);
  return <div className="formatted-table-wrap"><table className="formatted-table"><thead><tr>{rows[0].map((c, i) => <th key={i}>{inline(c)}</th>)}</tr></thead><tbody>{body.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody></table></div>;
}

export function FormattedText({ value, emptyText = 'No response recorded' }) {
  if (!String(value ?? '').trim()) return <span className="formatted-empty">{emptyText}</span>;
  const lines = String(value).split('\n');
  const nodes = [];
  for (let i = 0; i < lines.length;) {
    if (lines[i].includes('|') && lines[i + 1]?.match(/^\s*\|?\s*:?-{3,}/)) {
      const table = [];
      while (i < lines.length && lines[i].includes('|')) table.push(lines[i++]);
      nodes.push(<Table key={`t${i}`} lines={table} />);
      continue;
    }
    if (lines[i].trim() === ':::columns') {
      const columns = [];
      let current = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') {
        if (lines[i].trim() === ':::column') { if (current.length) columns.push(current); current = []; }
        else current.push(lines[i]);
        i++;
      }
      if (current.length) columns.push(current);
      i++;
      nodes.push(<div className="formatted-columns" key={`c${i}`}>{columns.map((col, j) => <div key={j}>{col.map((line, k) => <p key={k}>{inline(line)}</p>)}</div>)}</div>);
      continue;
    }
    const line = lines[i++];
    if (/^[-*]\s+/.test(line)) nodes.push(<div className="formatted-list-item" key={`l${i}`}>• {inline(line.replace(/^[-*]\s+/, ''))}</div>);
    else nodes.push(line ? <p key={`p${i}`}>{inline(line)}</p> : <br key={`b${i}`} />);
  }
  return <div className="formatted-text">{nodes}</div>;
}

export function FormattedTextEditor({ value, onChange, placeholder, rows = 6, required = false, className = '' }) {
  const ref = useRef(null);
  const insert = (before, after = before, fallback = 'text') => {
    const el = ref.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  const template = (text) => {
    const el = ref.current;
    const start = el.selectionStart;
    onChange(`${value.slice(0, start)}${text}${value.slice(el.selectionEnd)}`);
    requestAnimationFrame(() => el.focus());
  };
  return <div className={`formatted-editor ${className}`}>
    <div className="formatted-toolbar" aria-label="Formatting tools">
      <button type="button" onClick={() => insert('**', '**')} aria-label="Bold"><strong>B</strong></button>
      <button type="button" onClick={() => insert('*', '*')} aria-label="Italic"><em>I</em></button>
      <button type="button" onClick={() => template('\n| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n')} aria-label="Insert table">TABLE</button>
      <button type="button" onClick={() => template('\n:::columns\n:::column\nLeft column\n:::column\nRight column\n:::\n')} aria-label="Insert columns">COLUMNS</button>
      <span>Markdown formatting</span>
    </div>
    <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} required={required} />
    <details className="formatted-preview"><summary>Preview formatting</summary><FormattedText value={value} /></details>
  </div>;
}
