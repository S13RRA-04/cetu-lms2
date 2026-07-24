import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, HOSTNAME, USER, dir } from '../data/terminalGameLevels.js';
import { updateProgress } from '../api/lair.js';

const HOME_SEGS = ['home', 'analyst'];

const HELP_TEXT =
  'Available commands:\n' +
  '  pwd                 print working directory\n' +
  '  ls [-a] [-l]        list directory contents\n' +
  '  cd <path>           change directory\n' +
  '  cat <file>          print file contents\n' +
  '  head/tail [-n N] f  print first/last N lines of a file\n' +
  '  less / more <file>  same as cat here\n' +
  '  file <path>         report whether a path is a file or directory\n' +
  '  grep [-i] "p" f     search a file for lines matching pattern p\n' +
  '  find <path> -name "pattern"   search a tree for matching names\n' +
  '  whoami              print current user\n' +
  '  hint                reveal a hint for the current objective\n' +
  '  clear               clear the screen';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(str) {
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const tokens = [];
  let m;
  while ((m = re.exec(str))) tokens.push(m[1] ?? m[2] ?? m[3]);
  return tokens;
}

function parseFlags(argsStr) {
  const tokens = tokenize(argsStr);
  let all = false, long = false, ignoreCase = false, nFlag = null;
  const rest = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith('-') && t !== '-') {
      if (t === '-n') { nFlag = parseInt(tokens[++i], 10); continue; }
      for (const ch of t.slice(1)) {
        if (ch === 'a') all = true;
        else if (ch === 'l') long = true;
        else if (ch === 'i') ignoreCase = true;
      }
    } else {
      rest.push(t);
    }
  }
  return { all, long, ignoreCase, nFlag, rest };
}

function resolvePath(cwdSegs, argPath) {
  if (!argPath || argPath === '~') return [...HOME_SEGS];
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

function readable(node) {
  const p = node.perms;
  return (node.owner === USER && p[1] === 'r') || p[7] === 'r';
}

function displayPath(segs) {
  if (segs.length >= 2 && segs[0] === 'home' && segs[1] === 'analyst') {
    const rest = segs.slice(2);
    return '~' + (rest.length ? '/' + rest.join('/') : '');
  }
  return '/' + segs.join('/');
}

function buildFs(levelIndex) {
  const caseChildren = {};
  for (let i = 0; i <= levelIndex && i < LEVELS.length; i++) {
    caseChildren[LEVELS[i].id] = LEVELS[i].tree;
  }
  return dir({ home: dir({ analyst: dir(caseChildren) }) });
}

export default function TerminalGame({ assignmentId, color, initialState, onComplete }) {
  const startLevel = Math.min(
    Math.max(0, Number.isInteger(initialState?.levelIndex) ? initialState.levelIndex : 0),
    LEVELS.length - 1
  );

  const [levelIndex, setLevelIndex] = useState(startLevel);
  const [cwd, setCwd] = useState([...HOME_SEGS, LEVELS[startLevel].id]);
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [hintCounts, setHintCounts] = useState({});
  const [finished, setFinished] = useState(false);

  const historyPosRef = useRef(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const initedRef = useRef(false);

  const fs = useMemo(() => buildFs(levelIndex), [levelIndex]);

  const appendLine = useCallback((line) => {
    setOutput((prev) => [...prev, line]);
  }, []);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    const level = LEVELS[startLevel];
    if (startLevel > 0) {
      appendLine({ type: 'sys', text: `Resuming at Level ${startLevel + 1}: ${level.title}` });
    }
    appendLine({ type: 'sys', text: `Connected to ${HOSTNAME} as ${USER}.` });
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
    if (next >= LEVELS.length) {
      appendLine({ type: 'ok', text: `\n✓ CASE CLOSED — all ${LEVELS.length} indicators of compromise recovered on ${HOSTNAME}.` });
      setFinished(true);
      onComplete?.({
        levelsCompleted: LEVELS.length,
        totalLevels: LEVELS.length,
        markersFound: LEVELS.map((l) => l.marker),
      });
      return;
    }
    const nextLevel = LEVELS[next];
    appendLine({ type: 'ok', text: `✓ Evidence recovered: ${currentLevel.marker}. Advancing to Level ${next + 1}: ${nextLevel.title}.` });
    appendLine({ type: 'out', text: nextLevel.briefing });
    setLevelIndex(next);
    setCwd([...HOME_SEGS, nextLevel.id]);
    const pct = Math.round((next / LEVELS.length) * 100);
    updateProgress(assignmentId, pct, { levelIndex: next }).catch(() => {});
  }, [appendLine, assignmentId, onComplete]);

  function cmdLs(argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const pathArg = flags.rest[0];
    const targetSegs = pathArg ? resolvePath(cwdSegs, pathArg) : cwdSegs;
    const node = lookup(fs, targetSegs);
    if (!node) return { err: `ls: cannot access '${pathArg}': No such file or directory` };
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
    const targetSegs = resolvePath(cwdSegs, arg || '~');
    const node = lookup(fs, targetSegs);
    if (!node) return { err: `bash: cd: ${arg}: No such file or directory` };
    if (node.type !== 'dir') return { err: `bash: cd: ${arg}: Not a directory` };
    setCwd(targetSegs);
    return { out: '' };
  }

  function cmdCat(argsStr, cwdSegs) {
    const names = tokenize(argsStr);
    if (!names.length) return { err: 'usage: cat <file> [file2 ...]' };
    const outs = [];
    for (const name of names) {
      const node = lookup(fs, resolvePath(cwdSegs, name));
      if (!node) { outs.push(`cat: ${name}: No such file or directory`); continue; }
      if (node.type === 'dir') { outs.push(`cat: ${name}: Is a directory`); continue; }
      if (!readable(node)) { outs.push(`cat: ${name}: Permission denied`); continue; }
      outs.push(node.content.replace(/\n$/, ''));
    }
    return { out: outs.join('\n') };
  }

  function cmdHeadTail(mode, argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const name = flags.rest[0];
    if (!name) return { err: `usage: ${mode} [-n N] <file>` };
    const node = lookup(fs, resolvePath(cwdSegs, name));
    if (!node) return { err: `${mode}: cannot open '${name}' (No such file or directory)` };
    if (node.type === 'dir') return { err: `${mode}: error reading '${name}': Is a directory` };
    if (!readable(node)) return { err: `${mode}: cannot open '${name}' (Permission denied)` };
    const n = Number.isInteger(flags.nFlag) ? flags.nFlag : 10;
    const lines = node.content.replace(/\n$/, '').split('\n');
    const slice = mode === 'head' ? lines.slice(0, n) : lines.slice(-n);
    return { out: slice.join('\n') };
  }

  function cmdFile(argsStr, cwdSegs) {
    const name = argsStr.trim();
    if (!name) return { err: 'usage: file <path>' };
    const node = lookup(fs, resolvePath(cwdSegs, name));
    if (!node) return { err: `${name}: cannot open (No such file or directory)` };
    return { out: node.type === 'dir' ? `${name}: directory` : `${name}: ASCII text` };
  }

  function cmdGrep(argsStr, cwdSegs) {
    const flags = parseFlags(argsStr);
    const [pattern, name] = flags.rest;
    if (!pattern || !name) return { err: 'usage: grep [-i] "<pattern>" <file>' };
    const node = lookup(fs, resolvePath(cwdSegs, name));
    if (!node) return { err: `grep: ${name}: No such file or directory` };
    if (node.type === 'dir') return { err: `grep: ${name}: Is a directory` };
    if (!readable(node)) return { err: `grep: ${name}: Permission denied` };
    const re = new RegExp(escapeRegex(pattern), flags.ignoreCase ? 'i' : '');
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
    const startNode = lookup(fs, resolvePath(cwdSegs, path));
    if (!startNode) return { err: `find: '${path}': No such file or directory` };
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
    appendLine({ type: 'cmd', text: `analyst@${HOSTNAME}:${displayPath(cwd)}$ ${raw}` });
    if (!trimmed) return;
    setHistory((h) => [...h, raw]);
    historyPosRef.current = -1;

    const spaceIdx = trimmed.indexOf(' ');
    const cmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const argsStr = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
    const level = LEVELS[levelIndex];

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
      case 'whoami': result = { out: USER }; break;
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
    }
  };

  const level = LEVELS[levelIndex];
  const pct = Math.round((levelIndex / LEVELS.length) * 100);

  return (
    <div className="term-wrap" style={{ '--term-accent': color }}>
      <div className="term-toolbar">
        <div className="term-dots"><span /><span /><span /></div>
        <div className="term-title">analyst@{HOSTNAME} — Level {levelIndex + 1}/{LEVELS.length}: {level.title}</div>
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
            <span className="term-prompt">analyst@{HOSTNAME}:{displayPath(cwd)}$</span>
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
