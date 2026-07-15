export default function PreRangeBriefing({ briefing }) {
  if (!briefing) return null;
  return (
    <article className="pre-range-briefing">
      <header className="pre-range-header">
        <div><div className="pre-range-kicker">COMMAND AUTHORIZATION · KCR</div><h2>{briefing.title}</h2></div>
        <div className="pre-range-duration">{briefing.duration_minutes} MIN</div>
      </header>
      <section><h3>Operating expectations</h3><ul>{briefing.expectations.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="pre-range-rules"><h3>Range rules</h3><ul>{briefing.range_rules.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section>
        <h3>How performance is graded</h3>
        <p className="pre-range-note">Every criterion is scored 0–3. A 2 is the capable-practitioner standard; a 3 reflects distinguished performance.</p>
        <div className="pre-range-criteria">{briefing.grading.criteria.map((criterion, index) => (
          <div key={criterion.name} className="pre-range-criterion"><span><b>{index + 1}. {criterion.name}</b><small>{criterion.description}</small></span><strong>{criterion.weight === 1 ? 'STANDARD' : `×${criterion.weight} WEIGHT`}</strong></div>
        ))}</div>
        <div className="pre-range-scale">{briefing.grading.scale.map((level) => <div key={level.score}><strong>{level.score}</strong><span>{level.label}</span></div>)}</div>
      </section>
    </article>
  );
}
