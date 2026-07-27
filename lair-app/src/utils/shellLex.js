/** Shared shell-like tokenizing/pattern helpers used by both terminal-game components. */

export function tokenize(str) {
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const tokens = [];
  let m;
  while ((m = re.exec(str))) tokens.push(m[1] ?? m[2] ?? m[3]);
  return tokens;
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Converts a glob pattern (only '*' wildcard supported) into an anchored RegExp. */
export function globToRegex(pattern) {
  return new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
}
