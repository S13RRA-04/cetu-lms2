import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateProgress } from '../api/lair.js';
import { tokenize, escapeRegex, caseSuggestion, withCaseHint, dir } from '../utils/shellLex.js';

const COMMANDS = ['pwd', 'ls', 'cd', 'cat', 'less', 'more', 'head', 'tail', 'file', 'grep', 'find', 'whoami', 'hint', 'clear', 'help'];

const HELP_TEXT =
  'Available commands:\n' +
  '  pwd                 print working directory\n' +
  '  ls [-a] [-l]        list directory contents\n' +
  '  cd <path>           change directory\n' +
  '  cat <file>          print file contents\n' +
  '  head/tail [-n N] f  print first/last N lines of a file\n' +
  '  less / more <file>  same as cat here\n' +
  '  file <path>         report whether a path is a file or directory\n' +
  '  grep [-i] [-r] "p" f   search a file (or, with -r, a whole directory tree) for lines matching pattern p\n' +
  '  find <path> -name "pattern"   search a tree for matching names\n' +
  '  whoami              print current user\n' +
  '  hint                reveal a hint for the current objective\n' +
  '  clear               clear the screen';

function parseFlags(argsStr) {
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

function resolvePath(cwdSegs, argPath, homeSegs) {
  if (!argPath || argPath === '~') return [...homeSegs];
  let segs = argPath.startsWith('/') ? [] : [...cwdSegs];
  for (const part of argPath.split('/').filter(Boolean)) {
    if (part === '.') continue;
    else if (part === '..') segs.pop();
    else segs.push(part);
  }
  return segs;
}

function lookup(fsRoot, segs) {
  let node = fsRoot;
  for (const seg of segs) {
    if (!node || node.type !== 'dir' || !node.children || !(seg in node.children)) return null;
    node = node.children[seg];
  }
  return node;
}

/** Tab-completion: matches child names of the resolved directory portion of `partial` against its leaf prefix. */
function completeToken(fsRoot, cwdSegs, partial, homeSegs) {
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

function readable(node, user) {
  const p = node.perms;
  return (node.owner === user && p[1] === 'r') || p[7] === 'r';
}

function displayPath(segs, homeSegs) {
  if (segs.length >= homeSegs.length && homeSegs.every((s, i) => segs[i] === s)) {
    const rest = segs.slice(homeSegs.length);
    return '~' + (rest.length ? '/' + rest.join('/') : '');
  }
  return '/' + segs.join('/');
}

function buildFs(levels, levelIndex, homeSegs) {
  const caseChildren = {};
  for (let i = 0; i <= levelIndex && i < levels.length; i++) {
    caseChildren[levels[i].id] = levels[i].tree;
  }
  let root = dir(caseChildren);
  for (let i = homeSegs.length - 1; i >= 0; i--) {
    root = dir({ [homeSegs[i]]: root });
  }
  return root;
}

export default function TerminalGame({ assignmentId, color, initialState, onComplete, levels, hostname, user }) {
  const homeSegs = ['home', user];
  const startLevel = Math.min(
    Math.max(0, Number.isInteger(initialState?.levelIndex) ? initialState.levelIndex : 0),
    levels.length - 1
  );

  const [levelIndex, setLevelIndex] = useState(startLevel);
  const [cwd, setCwd] = useState([...homeSegs, levels[startLevel].id]);
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [hintCounts, setHintCounts] = useState({});
  const [finished, setFinished] = useState(false);

  const historyPosRef = useRef(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const initedRef = useRef(false);

  const fs = useMemo(() => buildFs(levels, levelIndex, homeSegs), [levels, levelIndex, homeSegs.join('/')]);

  const appendLine = useCallback((line) => {
    setOutput((prev) => [...prev, line]);
  }, []);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    const level = levels[startLevel];
    if (startLevel > 0) {
      appendLine({ type: 'sys', text: `Resuming at Level ${startLevel + 1}: ${level.title}` });
    }
    appendLine({ type: 'sys', text: `Connected to ${hostname} as ${user}.` });
    appendLine({ type: 'out', text: level.briefing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [output]);

  const nextHint = useCallback((level) => {
    const used = hintCounts[level.id] ?? 0;
    const idx = Math.min(used, level.hints.length - 1);
    setHintCounts((h) => ({ ...h, [level.id]: used + 1 }));
    return `Hint: ${level.hints[idx]}`;
  }, [hintCounts]);

  const completeCurrentLevel = useCallback((currentLevel, currentIndex) => {
    const next = currentIndex + 1;
    if (next >= levels.length) {
      appendLine({ type: 'ok', text: `\n✓ CASE CLOSED — all ${levels.length} pieces of evidence recovered on ${hostname}.` });
      setFinished(true);
      onComplete?.({
        levelsCompleted: levels.length,
        totalLevels: levels.length,
        markersFound: levels.map((l) => l.marker),
      });
      return;
    }
    const nextLevel = levels[next];
    appendLine({ type: 'ok', text: `✓ Evidence recovered: ${currentLevel.marker}. Advancing to Level ${next + 1}: ${nextLevel.title}.` });
    appendLine({ type: 'out', text: nextLevel.briefing });
    setLevelIndex(next);
    setCwd([...homeSegs, nextLevel.id]);
    const pct = Math.round((next / levels.length) * 100);
    updateProgress(assignmentId, pct, { levelIndex: next }).catch(() => {});
  }, [appendLine, assignmentId, onComplete, levels, hostname, homeSegs.join('/')]);

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
    setCwd(targetSegs);
    return { out: '' };
  }

  function cmdCat(argsStr, cwdSegs) {
    const names = tokenize(argsStr);
    if (!names.length) return { err: 'usage: cat <file> [file2 ...]' };
    const outs = [];
    for (const name of names) {
      const node = lookup(fs, resolvePath(cwdSegs, name, homeSegs));
      if (!node) { outs.push(withCaseHint(`cat: ${name}: No such file or directory`, suggest(cwdSegs, name))); continue; }
      if (node.type === 'dir') { outs.push(`cat: ${name}: Is a directory`); continue; }
      if (!readable(node, user)) { outs.push(`cat: ${name}: Permission denied`); continue; }
      outs.push(node.content.replace(/\n$/, ''));
    }
    return { out: outs.join('\n') };
  }

  function cmdHeadTail(mode, argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const name = flags.rest[0];
    if (!name) return { err: `usage: ${mode} [-n N] <file>` };
    const node = lookup(fs, resolvePath(cwdSegs, name, homeSegs));
    if (!node) return { err: withCaseHint(`${mode}: cannot open '${name}' (No such file or directory)`, suggest(cwdSegs, name)) };
    if (node.type === 'dir') return { err: `${mode}: error reading '${name}': Is a directory` };
    if (!readable(node, user)) return { err: `${mode}: cannot open '${name}' (Permission denied)` };
    const n = Number.isInteger(flags.nFlag) ? flags.nFlag : 10;
    const lines = node.content.replace(/\n$/, '').split('\n');
    const slice = mode === 'head' ? lines.slice(0, n) : lines.slice(-n);
    return { out: slice.join('\n') };
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
      (function walk(node, displayPathStr) {
        if (node.type === 'dir') {
          for (const [childName, child] of Object.entries(node.children || {})) {
            walk(child, displayPathStr === '.' ? childName : `${displayPathStr}/${childName}`);
          }
          return;
        }
        if (!readable(node, user)) return;
        for (const line of node.content.split('\n')) {
          if (re.test(line)) results.push(`${displayPathStr}:${line}`);
        }
      })(startNode, startArg);
      return { out: results.join('\n') };
    }

    if (!name) return { err: 'usage: grep [-i] "<pattern>" <file>' };
    const node = lookup(fs, resolvePath(cwdSegs, name, homeSegs));
    if (!node) return { err: withCaseHint(`grep: ${name}: No such file or directory`, suggest(cwdSegs, name)) };
    if (node.type === 'dir') return { err: `grep: ${name}: Is a directory (use -r to search recursively)` };
    if (!readable(node, user)) return { err: `grep: ${name}: Permission denied` };
    const matches = node.content.split('\n').filter((l) => re.test(l));
    return { out: matches.join('\n') };
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

  const runCommand = useCallback((raw) => {
    const trimmed = raw.trim();
    appendLine({ type: 'cmd', text: `analyst@${hostname}:${displayPath(cwd, homeSegs)}$ ${raw}` });
    if (!trimmed) return;
    setHistory((h) => [...h, raw]);
    historyPosRef.current = -1;

    const spaceIdx = trimmed.indexOf(' ');
    const cmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const argsStr = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
    const level = levels[levelIndex];

    let result;
    switch (cmd) {
      case 'pwd':    result = { out: '/' + cwd.join('/') }; break;
      case 'ls':     result = cmdLs(argsStr, cwd); break;
      case 'cd':     result = cmdCd(argsStr, cwd); break;
      case 'cat': case 'less': case 'more': result = cmdCat(argsStr, cwd); break;
      case 'head':   result = cmdHeadTail('head', argsStr, cwd); break;
      case 'tail':   result = cmdHeadTail('tail', argsStr, cwd); break;
      case 'file':   result = cmdFile(argsStr, cwd); break;
      case 'grep':   result = cmdGrep(argsStr, cwd); break;
      case 'find':   result = cmdFind(argsStr, cwd); break;
      case 'whoami': result = { out: user }; break;
      case 'help':   result = { out: HELP_TEXT }; break;
      case 'hint':   result = { out: nextHint(level) }; break;
      case 'clear':  setOutput([]); return;
      default:       result = { err: `bash: ${cmd}: command not found` };
    }

    if (result?.out) appendLine({ type: 'out', text: result.out });
    if (result?.err) appendLine({ type: 'err', text: result.err });

    if (!finished) {
      const combined = `${result?.out ?? ''}\n${result?.err ?? ''}`;
      if (combined.includes(level.marker)) {
        completeCurrentLevel(level, levelIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd, levelIndex, finished, appendLine, nextHint, completeCurrentLevel, fs]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const pos = historyPosRef.current < 0 ? history.length - 1 : Math.max(0, historyPosRef.current - 1);
      historyPosRef.current = pos;
      setInput(history[pos] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPosRef.current < 0) return;
      const pos = historyPosRef.current + 1;
      if (pos >= history.length) { historyPosRef.current = -1; setInput(''); }
      else { historyPosRef.current = pos; setInput(history[pos]); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const hasSpace = input.includes(' ');
      if (!hasSpace) {
        const matches = COMMANDS.filter((c) => c.startsWith(input));
        if (matches.length === 1) setInput(`${matches[0]} `);
        else if (matches.length > 1) appendLine({ type: 'sys', text: matches.join('  ') });
        return;
      }
      const lastSpace = input.lastIndexOf(' ');
      const head = input.slice(0, lastSpace + 1);
      const partial = input.slice(lastSpace + 1);
      const result = completeToken(fs, cwd, partial, homeSegs);
      if (!result) return;
      setInput(head + result.replacement);
      if (result.matches.length > 1) appendLine({ type: 'sys', text: result.matches.join('  ') });
    }
  };

  const level = levels[levelIndex];
  const pct = Math.round((levelIndex / levels.length) * 100);

  return (
    <div className="term-wrap" style={{ '--term-accent': color }}>
      <div className="term-toolbar">
        <div className="term-dots"><span /><span /><span /></div>
        <div className="term-title">analyst@{hostname} — Level {levelIndex + 1}/{levels.length}: {level.title}</div>
      </div>

      <div className="term-progress-track">
        <div className="term-progress-fill" style={{ width: `${finished ? 100 : pct}%` }} />
      </div>

      <div className="term-screen" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
        {output.map((line, i) => (
          <div key={i} className={`term-line term-line-${line.type}`}>{line.text}</div>
        ))}
        {!finished && (
          <div className="term-input-row">
            <span className="term-prompt">analyst@{hostname}:{displayPath(cwd, homeSegs)}$</span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <span className="term-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
