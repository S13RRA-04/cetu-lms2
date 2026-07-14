export function guessContentType(filename) {
  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop();

  // File format is the strongest signal for instructional materials. A PDF
  // whose subject happens to include "evidence" is still a handout.
  if (['pptx', 'ppt'].includes(ext)) return 'slides';
  if (['pdf', 'docx', 'doc'].includes(ext)) return 'handout';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'form';

  if (lower.includes('brief') || lower.includes('bulletin')) return 'briefing';
  if (lower.includes('eviden') || lower.includes('artifact') || lower.includes('log') || lower.includes('ioc')) return 'evidence';
  if (lower.includes('intel') || lower.includes('report') || lower.includes('analysis')) return 'intel_report';
  return 'resource';
}
