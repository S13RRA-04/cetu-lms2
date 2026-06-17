import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function SubmissionSuccess({
  assignment,
  submission = null,
  color,
  label = 'FIELD REPORT TRANSMITTED',
  subtext = 'Command has received your report. Stand by for after-action assessment.',
}) {
  return (
    <motion.div
      className="ap-success-root"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="ap-success-stamp">TRANSMISSION CONFIRMED</div>
      <div className="ap-success-title">{label}</div>
      <div className="ap-success-sub">{subtext}</div>
      <div className="ap-success-meta">
        <div className="ap-success-meta-row">
          <span className="ap-success-meta-key">TASKING</span>
          <span className="ap-success-meta-val">{assignment.title}</span>
        </div>
        <div className="ap-success-meta-row">
          <span className="ap-success-meta-key">TYPE</span>
          <span className="ap-success-meta-val" style={{ color }}>
            {assignment.type?.toUpperCase()}
          </span>
        </div>
        {assignment.drop_number != null && (
          <div className="ap-success-meta-row">
            <span className="ap-success-meta-key">DROP</span>
            <span className="ap-success-meta-val">DROP {assignment.drop_number}</span>
          </div>
        )}
        {submission?.squad && (
          <div className="ap-success-meta-row">
            <span className="ap-success-meta-key">SQUAD</span>
            <span className="ap-success-meta-val">
              Squad {submission.squad.number}
              {submission.squad.name ? ` — ${submission.squad.name}` : ''}
            </span>
          </div>
        )}
        <div className="ap-success-meta-row">
          <span className="ap-success-meta-key">TIMESTAMP</span>
          <span className="ap-success-meta-val">{new Date().toLocaleString()}</span>
        </div>
      </div>
      <Link to="/" className="ap-success-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        RETURN TO OPERATIONS CENTER
      </Link>
    </motion.div>
  );
}
