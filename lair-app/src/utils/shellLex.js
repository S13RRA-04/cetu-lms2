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

/**
 * Games keep real, case-sensitive filename semantics (that's the point —
 * transferable knowledge), but a bare "No such file or directory" is a
 * needless beginner trap when the only issue is wrong case. Given the
 * parent directory node actually looked up and the leaf name that failed,
 * returns a same-directory sibling name that matches case-insensitively
 * (or null), for callers to append as a "did you mean...?" hint.
 */
export function caseSuggestion(parentNode, leaf) {
  if (!parentNode || parentNode.type !== 'dir' || !leaf) return null;
  const match = Object.keys(parentNode.children || {}).find(
    (n) => n !== leaf && n.toLowerCase() === leaf.toLowerCase()
  );
  return match || null;
}

export function withCaseHint(message, suggestion) {
  return suggestion ? `${message} (did you mean '${suggestion}'? filenames are case-sensitive)` : message;
}

/** Virtual-filesystem node builders shared by every TerminalGame level-pack data file. */
export function dir(children) {
  return { type: 'dir', perms: 'drwxr-xr-x', children };
}

export function file(content, opts = {}) {
  return {
    type: 'file',
    perms: opts.perms ?? '-rw-r--r--',
    owner: opts.owner ?? 'analyst',
    hidden: opts.hidden ?? false,
    content,
  };
}
