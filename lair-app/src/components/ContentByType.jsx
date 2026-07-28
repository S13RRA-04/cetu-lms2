import { useState } from 'react';

export const CONTENT_TYPE_META = {
  slides:   { label: 'Slides',    icon: '◈' },
  handout:  { label: 'Handouts',  icon: '◇' },
  agenda:   { label: 'Agenda',    icon: '⬡' },
  form:     { label: 'Forms',     icon: '◉' },
  resource: { label: 'Resources', icon: '◆' },
};

const TYPE_ORDER = ['agenda', 'slides', 'handout', 'resource', 'form'];

// Resource titles carry a "[Tier] Title" convention (see project memory) —
// no schema field for difficulty, so tier is parsed from the title prefix.
const TIER_PREFIX = /^\[(.+?)\]\s*/;
const TIER_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

function splitTier(title) {
  const m = title.match(TIER_PREFIX);
  return m ? { tier: m[1], title: title.slice(m[0].length) } : { tier: null, title };
}

function ContentRow({ item }) {
  const url = item.download_url ?? item.url;
  const { title } = splitTier(item.title);
  return (
    <a className="content-type-row" href={url} target="_blank" rel="noopener noreferrer">
      <span className="content-type-row-title">{title}</span>
      {item.description && <span className="content-type-row-desc">{item.description}</span>}
      <span className="content-type-row-action">{item.r2_key || url?.includes('.') ? '↓' : '↗'}</span>
    </a>
  );
}

function TierGroup({ tier, items, isOpen, onToggle }) {
  return (
    <div className="tier-group">
      <button className="tier-group-header" onClick={onToggle}>
        <span className="tier-group-label">{tier}</span>
        <span className="content-type-count">{items.length}</span>
        <span className={`course-day-chevron${isOpen ? ' open' : ''}`}>›</span>
      </button>
      {isOpen && (
        <div className="content-type-items">
          {items.map((item) => <ContentRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

export default function ContentByType({ items }) {
  const [collapsed, setCollapsed] = useState({});
  const [collapsedTiers, setCollapsedTiers] = useState({});

  const groups = TYPE_ORDER
    .map((type) => ({ type, items: items.filter((i) => i.content_type === type) }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  const toggle = (type) => setCollapsed((c) => ({ ...c, [type]: !c[type] }));
  const toggleTier = (key) => setCollapsedTiers((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="content-by-type">
      {groups.map(({ type, items: groupItems }) => {
        const meta = CONTENT_TYPE_META[type] ?? CONTENT_TYPE_META.resource;
        const isOpen = !collapsed[type];

        const tiered = type === 'resource' && groupItems.some((i) => splitTier(i.title).tier);
        let tierGroups = null;
        if (tiered) {
          const byTier = new Map();
          for (const item of groupItems) {
            const tier = splitTier(item.title).tier ?? 'Other';
            if (!byTier.has(tier)) byTier.set(tier, []);
            byTier.get(tier).push(item);
          }
          const orderedTiers = [...TIER_ORDER, ...[...byTier.keys()].filter((t) => !TIER_ORDER.includes(t))];
          tierGroups = orderedTiers.filter((t) => byTier.has(t)).map((t) => ({ tier: t, items: byTier.get(t) }));
        }

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
              tierGroups ? (
                <div className="tier-group-list">
                  {tierGroups.map(({ tier, items: tierItems }) => (
                    <TierGroup
                      key={tier}
                      tier={tier}
                      items={tierItems}
                      isOpen={!collapsedTiers[`${type}:${tier}`]}
                      onToggle={() => toggleTier(`${type}:${tier}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="content-type-items">
                  {groupItems.map((item) => <ContentRow key={item.id} item={item} />)}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
