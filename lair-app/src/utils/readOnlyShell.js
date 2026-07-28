/**
 * Shared read-only shell engine for TerminalGame.jsx and InvestigationGame.jsx
 * (any component that lets a student browse a virtual filesystem with real
 * Linux commands but can't mutate it). Extracted from TerminalGame.jsx once
 * a second component needed the identical parser — see project memory.
 *
 * `makeReadOnlyCommands` is a factory, not a hook: it closes over an
 * immutable `{ fs, homeSegs, user }` for the render it's called in and
 * returns plain command functions. `cmdCd` can't call `setCwd` itself (it
 * doesn't own that state), so it returns `{ newCwd }` on success instead of
 * mutating anything — the caller applies it.
 */
import { tokenize, escapeRegex, caseSuggestion, withCaseHint } from './shellLex.js';

export function parseFlags(argsStr) {
  const tokens = tokenize(argsStr);
  let all = false, long = false, ignoreCase = false, recursive = false, nFlag = null;
  const rest = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('-') && t !== '-') {
      if (t === '-n') { nFlag = parseInt(tokens[++i], 10); continue; }
      for (const ch of t.slice(1)) {
        if (ch === 'a') all = true;
        else if (ch === 'l') long = true;
        else if (ch === 'i') ignoreCase = true;
        else if (ch === 'r' || ch === 'R') recursive = true;
      }
    } else {
      rest.push(t);
    }
  }
  return { all, long, ignoreCase, recursive, nFlag, rest };
}

export function resolvePath(cwdSegs, argPath, homeSegs) {
  if (!argPath || argPath === '~') return [...homeSegs];
  let segs = argPath.startsWith('/') ? [] : [...cwdSegs];
  for (const part of argPath.split('/').filter(Boolean)) {
    if (part === '.') continue;
    else if (part === '..') segs.pop();
    else segs.push(part);
  }
  return segs;
}

export function lookup(fsRoot, segs) {
  let node = fsRoot;
  for (const seg of segs) {
    if (!node || node.type !== 'dir' || !node.children || !(seg in node.children)) return null;
    node = node.children[seg];
  }
  return node;
}

export function readable(node, user) {
  const p = node.perms;
  return (node.owner === user && p[1] === 'r') || p[7] === 'r';
}

export function displayPath(segs, homeSegs) {
  if (segs.length >= homeSegs.length && homeSegs.every((s, i) => segs[i] === s)) {
    const rest = segs.slice(homeSegs.length);
    return '~' + (rest.length ? '/' + rest.join('/') : '');
  }
  return '/' + segs.join('/');
}

/** Tab-completion: matches child names of the resolved directory portion of `partial` against its leaf prefix. */
export function completeToken(fsRoot, cwdSegs, partial, homeSegs) {
  const lastSlash = partial.lastIndexOf('/');
  const dirPart  = lastSlash === -1 ? '' : partial.slice(0, lastSlash);
  const leafPart = lastSlash === -1 ? partial : partial.slice(lastSlash + 1);
  const dirSegs  = dirPart ? resolvePath(cwdSegs, dirPart, homeSegs) : cwdSegs;
  const dirNode  = lookup(fsRoot, dirSegs);
  if (!dirNode || dirNode.type !== 'dir') return null;
  const names = Object.keys(dirNode.children || {})
    .filter((n) => (leafPart.startsWith('.') || !n.startsWith('.')) && n.startsWith(leafPart));
  if (!names.length) return null;
  let lcp = names[0];
  for (const n of names.slice(1)) {
    let i = 0;
    while (i < lcp.length && i < n.length && lcp[i] === n[i]) i++;
    lcp = lcp.slice(0, i);
  }
  const single = names.length === 1;
  const suffix = single ? (dirNode.children[names[0]].type === 'dir' ? '/' : ' ') : '';
  const prefix = dirPart ? `${dirPart}/` : '';
  return { replacement: prefix + (single ? names[0] : lcp) + suffix, matches: names };
}

export function makeReadOnlyCommands({ fs, homeSegs, user }) {
  function suggest(cwdSegs, name) {
    const segs = resolvePath(cwdSegs, name, homeSegs);
    const parent = lookup(fs, segs.slice(0, -1));
    return caseSuggestion(parent, segs[segs.length - 1]);
  }

  function cmdLs(argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const pathArg = flags.rest[0];
    const targetSegs = pathArg ? resolvePath(cwdSegs, pathArg, homeSegs) : cwdSegs;
    const node = lookup(fs, targetSegs);
    if (!node) return { err: withCaseHint(`ls: cannot access '${pathArg}': No such file or directory`, suggest(cwdSegs, pathArg)) };
    if (node.type !== 'dir') return { out: pathArg || '.' };
    const entries = Object.entries(node.children || {})
      .filter(([, n]) => flags.all || !n.hidden)
      .sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return { out: '' };
    if (flags.long) {
      return {
        out: entries
          .map(([name, n]) => `${n.perms} 1 ${n.owner} ${n.owner} ${String((n.content || '').length).padStart(6)} Jul 24 03:14 ${name}`)
          .join('\n'),
      };
    }
    return { out: entries.map(([name]) => name).join('  ') };
  }

  function cmdCd(argsStr, cwdSegs) {
    const arg = argsStr.trim();
    const targetSegs = resolvePath(cwdSegs, arg || '~', homeSegs);
    const node = lookup(fs, targetSegs);
    if (!node) return { err: withCaseHint(`bash: cd: ${arg}: No such file or directory`, suggest(cwdSegs, arg)) };
    if (node.type !== 'dir') return { err: `bash: cd: ${arg}: Not a directory` };
    return { newCwd: targetSegs };
  }

  function cmdCat(argsStr, cwdSegs) {
    const names = tokenize(argsStr);
    if (!names.length) return { err: 'usage: cat <file> [file2 ...]' };
    const outs = [];
    const readPaths = [];
    for (const name of names) {
      const segs = resolvePath(cwdSegs, name, homeSegs);
      const node = lookup(fs, segs);
      if (!node) { outs.push(withCaseHint(`cat: ${name}: No such file or directory`, suggest(cwdSegs, name))); continue; }
      if (node.type === 'dir') { outs.push(`cat: ${name}: Is a directory`); continue; }
      if (!readable(node, user)) { outs.push(`cat: ${name}: Permission denied`); continue; }
      outs.push(node.content.replace(/\n$/, ''));
      readPaths.push(segs.join('/'));
    }
    return { out: outs.join('\n'), readPaths };
  }

  function cmdHeadTail(mode, argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const name = flags.rest[0];
    if (!name) return { err: `usage: ${mode} [-n N] <file>` };
    const segs = resolvePath(cwdSegs, name, homeSegs);
    const node = lookup(fs, segs);
    if (!node) return { err: withCaseHint(`${mode}: cannot open '${name}' (No such file or directory)`, suggest(cwdSegs, name)) };
    if (node.type === 'dir') return { err: `${mode}: error reading '${name}': Is a directory` };
    if (!readable(node, user)) return { err: `${mode}: cannot open '${name}' (Permission denied)` };
    const n = Number.isInteger(flags.nFlag) ? flags.nFlag : 10;
    const lines = node.content.replace(/\n$/, '').split('\n');
    const slice = mode === 'head' ? lines.slice(0, n) : lines.slice(-n);
    return { out: slice.join('\n'), readPaths: [segs.join('/')] };
  }

  function cmdFile(argsStr, cwdSegs) {
    const name = argsStr.trim();
    if (!name) return { err: 'usage: file <path>' };
    const node = lookup(fs, resolvePath(cwdSegs, name, homeSegs));
    if (!node) return { err: withCaseHint(`${name}: cannot open (No such file or directory)`, suggest(cwdSegs, name)) };
    return { out: node.type === 'dir' ? `${name}: directory` : `${name}: ASCII text` };
  }

  function cmdGrep(argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const [pattern, name] = flags.rest;
    if (!pattern) return { err: 'usage: grep [-i] [-r] "<pattern>" <file|dir>' };
    const re = new RegExp(escapeRegex(pattern), flags.ignoreCase ? 'i' : '');

    if (flags.recursive) {
      const startArg = name || '.';
      const startNode = lookup(fs, resolvePath(cwdSegs, startArg, homeSegs));
      if (!startNode) return { err: withCaseHint(`grep: ${startArg}: No such file or directory`, suggest(cwdSegs, startArg)) };
      const results = [];
      const readPaths = [];
      (function walk(node, displayPathStr) {
        if (node.type === 'dir') {
          for (const [childName, child] of Object.entries(node.children || {})) {
            walk(child, displayPathStr === '.' ? childName : `${displayPathStr}/${childName}`);
          }
          return;
        }
        if (!readable(node, user)) return;
        let matched = false;
        for (const line of node.content.split('\n')) {
          if (re.test(line)) { results.push(`${displayPathStr}:${line}`); matched = true; }
        }
        if (matched) readPaths.push(displayPathStr);
      })(startNode, startArg);
      return { out: results.join('\n'), readPaths };
    }

    if (!name) return { err: 'usage: grep [-i] "<pattern>" <file>' };
    const segs = resolvePath(cwdSegs, name, homeSegs);
    const node = lookup(fs, segs);
    if (!node) return { err: withCaseHint(`grep: ${name}: No such file or directory`, suggest(cwdSegs, name)) };
    if (node.type === 'dir') return { err: `grep: ${name}: Is a directory (use -r to search recursively)` };
    if (!readable(node, user)) return { err: `grep: ${name}: Permission denied` };
    const matches = node.content.split('\n').filter((l) => re.test(l));
    return { out: matches.join('\n'), readPaths: matches.length ? [segs.join('/')] : [] };
  }

  function cmdFind(argsStr, cwdSegs) {
    const tokens = tokenize(argsStr);
    let path = '.', pattern = null;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '-name') pattern = tokens[++i];
      else if (!tokens[i].startsWith('-')) path = tokens[i];
    }
    if (!pattern) return { err: 'usage: find <path> -name "<pattern>"' };
    const startNode = lookup(fs, resolvePath(cwdSegs, path, homeSegs));
    if (!startNode) return { err: withCaseHint(`find: '${path}': No such file or directory`, suggest(cwdSegs, path)) };
    const regex = new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*') + '$');
    const results = [];
    const rootDisplay = path === '' ? '.' : path.replace(/\/$/, '');
    (function walk(node, displayPathStr) {
      if (node.type !== 'dir') return;
      for (const [name, child] of Object.entries(node.children || {})) {
        const childDisplay = displayPathStr === '.' ? name : `${displayPathStr}/${name}`;
        if (regex.test(name)) results.push(childDisplay);
        walk(child, childDisplay);
      }
    })(startNode, rootDisplay);
    return { out: results.join('\n') };
  }

  return { cmdLs, cmdCd, cmdCat, cmdHeadTail, cmdFile, cmdGrep, cmdFind };
}
