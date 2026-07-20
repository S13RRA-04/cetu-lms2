import { useState } from 'react';

export const CONTENT_TYPE_META = {
  slides:   { label: 'Slides',    icon: '◈' },
  handout:  { label: 'Handouts',  icon: '◇' },
  agenda:   { label: 'Agenda',    icon: '⬡' },
  form:     { label: 'Forms',     icon: '◉' },
  resource: { label: 'Resources', icon: '◆' },
};

const TYPE_ORDER = ['agenda', 'slides', 'handout', 'resource', 'form'];

export default function ContentByType({ items }) {
  const [collapsed, setCollapsed] = useState({});

  const groups = TYPE_ORDER
    .map((type) => ({ type, items: items.filter((i) => i.content_type === type) }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  const toggle = (type) => setCollapsed((c) => ({ ...c, [type]: !c[type] }));

  return (
    <div className="content-by-type">
      {groups.map(({ type, items: groupItems }) => {
        const meta = CONTENT_TYPE_META[type] ?? CONTENT_TYPE_META.resource;
        const isOpen = !collapsed[type];
        return (
          <div key={type} className="content-type-group glass-card">
            <button className="content-type-header" onClick={() => toggle(type)}>
              <span className="content-type-heading">
                <span>{meta.icon}</span> {meta.label}
              </span>
              <span className="content-type-count">{groupItems.length}</span>
              <span className={`course-day-chevron${isOpen ? ' open' : ''}`}>›</span>
            </button>
            {isOpen && (
              <div className="content-type-items">
                {groupItems.map((item) => {
                  const url = item.download_url ?? item.url;
                  return (
                    <a key={item.id} className="content-type-row" href={url} target="_blank" rel="noopener noreferrer">
                      <span className="content-type-row-title">{item.title}</span>
                      {item.description && <span className="content-type-row-desc">{item.description}</span>}
                      <span className="content-type-row-action">{item.r2_key || url?.includes('.') ? '↓' : '↗'}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
