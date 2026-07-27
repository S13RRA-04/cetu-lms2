import { useCallback, useEffect, useRef, useState } from 'react';
import { TASKS } from '../data/speedrunTasks.js';
import { updateProgress } from '../api/lair.js';
import { tokenize, globToRegex, caseSuggestion, withCaseHint } from '../utils/shellLex.js';

const HOST = 'sift-scratch';
const USER = 'analyst';

const COMMANDS = ['pwd', 'ls', 'cd', 'cat', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'echo', 'whoami', 'hint', 'skip', 'clear', 'help'];

const HELP_TEXT =
  'Available commands:\n' +
  '  pwd / ls [-a] [-l] / cd <path>\n' +
  '  cat <file>\n' +
  '  touch <file>            create an empty file\n' +
  '  mkdir [-p] <path>        create a directory (parents with -p)\n' +
  '  rm [-r] <path|pattern>   remove a file (or matching files, with a * wildcard)\n' +
  '  cp <src> <dst>           copy a file\n' +
  '  mv <src> <dst>           move / rename a file\n' +
  '  chmod <mode> <path>      set permissions, e.g. chmod 755 script.sh\n' +
  '  echo <text> > <file>     write text to a file (>> appends)\n' +
  '  hint                     reveal a hint for the current task\n' +
  '  skip                     give up on this task and move to the next\n' +
  '  clear                    clear the screen';

function cloneTree(node) {
  if (node.type === 'dir') {
    const children = {};
    for (const [k, v] of Object.entries(node.children || {})) children[k] = cloneTree(v);
    return { type: 'dir', perms: node.perms, children };
  }
  return { type: 'file', perms: node.perms, content: node.content };
}

function resolvePath(cwdSegs, argPath) {
  if (!argPath) return [...cwdSegs];
  let segs = argPath.startsWith('/') ? [] : [...cwdSegs];
  for (const part of argPath.split('/').filter(Boolean)) {
    if (part === '.') continue;
    else if (part === '..') segs.pop();
    else segs.push(part);
  }
  return segs;
}

function lookup(root, segs) {
  let node = root;
  for (const seg of segs) {
    if (!node || node.type !== 'dir' || !node.children || !(seg in node.children)) return null;
    node = node.children[seg];
  }
  return node;
}

/** Tab-completion: matches child names of the resolved directory portion of `partial` against its leaf prefix. */
function completeToken(fsRoot, cwdSegs, partial) {
  const lastSlash = partial.lastIndexOf('/');
  const dirPart  = lastSlash === -1 ? '' : partial.slice(0, lastSlash);
  const leafPart = lastSlash === -1 ? partial : partial.slice(lastSlash + 1);
  const dirSegs  = dirPart ? resolvePath(cwdSegs, dirPart) : cwdSegs;
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

function octalToPerms(mode, isDir) {
  const map = { 7: 'rwx', 6: 'rw-', 5: 'r-x', 4: 'r--', 3: '-wx', 2: '-w-', 1: '--x', 0: '---' };
  return (isDir ? 'd' : '-') + [...mode].map((d) => map[Number(d)]).join('');
}

function evalCheck(check, fsRoot) {
  const segsOf = (p) => (p === '.' || p === '' ? [] : p.split('/').filter(Boolean));
  switch (check.check) {
    case 'exists': {
      const node = lookup(fsRoot, segsOf(check.path));
      if (!node) return false;
      return check.type ? node.type === check.type : true;
    }
    case 'missing':
      return !lookup(fsRoot, segsOf(check.path));
    case 'perm-equals': {
      const node = lookup(fsRoot, segsOf(check.path));
      return !!node && node.perms === check.perms;
    }
    case 'content-equals-literal': {
      const node = lookup(fsRoot, segsOf(check.path));
      return !!node && node.type === 'file' && node.content.replace(/\n$/, '') === check.content;
    }
    case 'content-equals-path': {
      const a = lookup(fsRoot, segsOf(check.path));
      const b = lookup(fsRoot, segsOf(check.equalsPath));
      return !!a && !!b && a.type === 'file' && b.type === 'file' && a.content === b.content;
    }
    case 'none-match': {
      const dirNode = lookup(fsRoot, segsOf(check.path));
      if (!dirNode || dirNode.type !== 'dir') return false;
      const re = globToRegex(check.pattern);
      return Object.keys(dirNode.children).every((n) => !re.test(n));
    }
    default:
      return false;
  }
}

function allChecksPass(task, fsRoot) {
  return task.checks.every((c) => evalCheck(c, fsRoot));
}

export default function SpeedrunArena({ assignmentId, color, initialState, onComplete }) {
  const startIndex = Math.min(
    Math.max(0, Number.isInteger(initialState?.taskIndex) ? initialState.taskIndex : 0),
    TASKS.length - 1
  );

  const [taskIndex, setTaskIndex] = useState(startIndex);
  const [cwd, setCwd] = useState([]);
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [hintCounts, setHintCounts] = useState({});
  const [solvedCount, setSolvedCount] = useState(initialState?.solvedCount ?? 0);
  const [skippedCount, setSkippedCount] = useState(initialState?.skippedCount ?? 0);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const historyPosRef = useRef(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const initedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const fsRootRef = useRef(cloneTree(TASKS[startIndex].setup));

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const appendLine = useCallback((line) => setOutput((prev) => [...prev, line]), []);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    if (startIndex > 0) appendLine({ type: 'sys', text: `Resuming at Task ${startIndex + 1}/${TASKS.length}` });
    appendLine({ type: 'sys', text: `Connected to ${HOST} as ${USER}. Type "help" if you get stuck.` });
    appendLine({ type: 'out', text: TASKS[startIndex].prompt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [output]);

  const nextHint = useCallback((task) => {
    const used = hintCounts[task.id] ?? 0;
    const idx = Math.min(used, task.hints.length - 1);
    setHintCounts((h) => ({ ...h, [task.id]: used + 1 }));
    return `Hint: ${task.hints[idx]}`;
  }, [hintCounts]);

  const goToTask = useCallback((index, solvedDelta, skippedDelta) => {
    const newSolved = solvedCount + solvedDelta;
    const newSkipped = skippedCount + skippedDelta;
    setSolvedCount(newSolved);
    setSkippedCount(newSkipped);

    if (index >= TASKS.length) {
      appendLine({
        type: 'ok',
        text: `\n✓ DRILL COMPLETE — ${newSolved}/${TASKS.length} solved, ${newSkipped} skipped, ${elapsed}s elapsed.`,
      });
      setFinished(true);
      onComplete?.({
        tasksSolved: newSolved,
        tasksSkipped: newSkipped,
        totalTasks: TASKS.length,
        elapsedSeconds: elapsed,
      });
      return;
    }

    fsRootRef.current = cloneTree(TASKS[index].setup);
    setCwd([]);
    setTaskIndex(index);
    appendLine({ type: 'out', text: TASKS[index].prompt });

    const pct = Math.round((index / TASKS.length) * 100);
    updateProgress(assignmentId, pct, { taskIndex: index, solvedCount: newSolved, skippedCount: newSkipped }).catch(() => {});
  }, [appendLine, assignmentId, elapsed, onComplete, solvedCount, skippedCount]);

  function suggest(cwdSegs, name) {
    const segs = resolvePath(cwdSegs, name);
    const parent = lookup(fsRootRef.current, segs.slice(0, -1));
    return caseSuggestion(parent, segs[segs.length - 1]);
  }

  function cmdPwd(cwdSegs) { return { out: '/' + cwdSegs.join('/') }; }

  function cmdLs(argsStr, cwdSegs) {
    const tokens = tokenize(argsStr);
    const flagTokens = tokens.filter((t) => t.startsWith('-'));
    const pathArg = tokens.find((t) => !t.startsWith('-'));
    const all = flagTokens.some((t) => t.includes('a'));
    const long = flagTokens.some((t) => t.includes('l'));
    const targetSegs = pathArg ? resolvePath(cwdSegs, pathArg) : cwdSegs;
    const node = lookup(fsRootRef.current, targetSegs);
    if (!node) return { err: withCaseHint(`ls: cannot access '${pathArg}': No such file or directory`, suggest(cwdSegs, pathArg)) };
    if (node.type !== 'dir') return { out: pathArg || '.' };
    const entries = Object.entries(node.children || {})
      .filter(([name]) => all || !name.startsWith('.'))
      .sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return { out: '' };
    if (long) {
      return { out: entries.map(([name, n]) => `${n.perms} 1 analyst analyst ${String((n.content || '').length).padStart(6)} Jul 26 09:00 ${name}`).join('\n') };
    }
    return { out: entries.map(([name]) => name).join('  ') };
  }

  function cmdCd(argsStr, cwdSegs) {
    const arg = argsStr.trim();
    const targetSegs = arg ? resolvePath(cwdSegs, arg) : [];
    const node = lookup(fsRootRef.current, targetSegs);
    if (!node) return { err: withCaseHint(`bash: cd: ${arg}: No such file or directory`, suggest(cwdSegs, arg)) };
    if (node.type !== 'dir') return { err: `bash: cd: ${arg}: Not a directory` };
    setCwd(targetSegs);
    return { out: '' };
  }

  function cmdCat(argsStr, cwdSegs) {
    const names = tokenize(argsStr);
    if (!names.length) return { err: 'usage: cat <file>' };
    const outs = [];
    for (const name of names) {
      const node = lookup(fsRootRef.current, resolvePath(cwdSegs, name));
      if (!node) { outs.push(withCaseHint(`cat: ${name}: No such file or directory`, suggest(cwdSegs, name))); continue; }
      if (node.type === 'dir') { outs.push(`cat: ${name}: Is a directory`); continue; }
      outs.push(node.content.replace(/\n$/, ''));
    }
    return { out: outs.join('\n') };
  }

  function cmdTouch(argsStr, cwdSegs) {
    const names = tokenize(argsStr);
    if (!names.length) return { err: 'usage: touch <file>' };
    for (const name of names) {
      const segs = resolvePath(cwdSegs, name);
      const parent = lookup(fsRootRef.current, segs.slice(0, -1));
      const leaf = segs[segs.length - 1];
      if (!parent || parent.type !== 'dir') return { err: `touch: cannot touch '${name}': No such file or directory` };
      if (!parent.children[leaf]) parent.children[leaf] = { type: 'file', perms: '-rw-r--r--', content: '' };
    }
    return { out: '' };
  }

  function cmdMkdir(argsStr, cwdSegs) {
    const tokens = tokenize(argsStr);
    const hasP = tokens.includes('-p');
    const targetPath = tokens.find((t) => !t.startsWith('-'));
    if (!targetPath) return { err: 'usage: mkdir [-p] <path>' };
    const segs = resolvePath(cwdSegs, targetPath);
    if (!hasP) {
      const parent = lookup(fsRootRef.current, segs.slice(0, -1));
      const leaf = segs[segs.length - 1];
      if (!parent || parent.type !== 'dir') return { err: `mkdir: cannot create directory '${targetPath}': No such file or directory` };
      if (parent.children[leaf]) return { err: `mkdir: cannot create directory '${targetPath}': File exists` };
      parent.children[leaf] = { type: 'dir', perms: 'drwxr-xr-x', children: {} };
    } else {
      let node = fsRootRef.current;
      for (const seg of segs) {
        if (!node.children[seg]) node.children[seg] = { type: 'dir', perms: 'drwxr-xr-x', children: {} };
        node = node.children[seg];
        if (node.type !== 'dir') return { err: `mkdir: cannot create directory '${targetPath}': Not a directory` };
      }
    }
    return { out: '' };
  }

  function cmdRm(argsStr, cwdSegs) {
    const tokens = tokenize(argsStr);
    const recursive = tokens.some((t) => t.startsWith('-') && t.includes('r'));
    const targets = tokens.filter((t) => !t.startsWith('-'));
    if (!targets.length) return { err: 'usage: rm [-r] <path|pattern>' };
    const errs = [];
    for (const target of targets) {
      const segs = resolvePath(cwdSegs, target);
      const parent = lookup(fsRootRef.current, segs.slice(0, -1));
      const leafPattern = segs[segs.length - 1];
      if (!parent || parent.type !== 'dir') { errs.push(`rm: cannot remove '${target}': No such file or directory`); continue; }
      if (leafPattern.includes('*')) {
        const re = globToRegex(leafPattern);
        const names = Object.keys(parent.children).filter((n) => re.test(n));
        if (!names.length) { errs.push(`rm: no matches for '${target}'`); continue; }
        for (const n of names) {
          if (parent.children[n].type === 'dir' && !recursive) { errs.push(`rm: cannot remove '${n}': Is a directory`); continue; }
          delete parent.children[n];
        }
      } else {
        const node = parent.children[leafPattern];
        if (!node) { errs.push(withCaseHint(`rm: cannot remove '${target}': No such file or directory`, suggest(cwdSegs, target))); continue; }
        if (node.type === 'dir' && !recursive) { errs.push(`rm: cannot remove '${target}': Is a directory`); continue; }
        delete parent.children[leafPattern];
      }
    }
    return errs.length ? { err: errs.join('\n') } : { out: '' };
  }

  function cmdCp(argsStr, cwdSegs) {
    const [src, dstArg] = tokenize(argsStr);
    if (!src || !dstArg) return { err: 'usage: cp <src> <dst>' };
    const srcNode = lookup(fsRootRef.current, resolvePath(cwdSegs, src));
    if (!srcNode) return { err: withCaseHint(`cp: cannot stat '${src}': No such file or directory`, suggest(cwdSegs, src)) };
    if (srcNode.type === 'dir') return { err: `cp: -r not specified; omitting directory '${src}'` };
    let dstSegs = resolvePath(cwdSegs, dstArg);
    const dstExisting = lookup(fsRootRef.current, dstSegs);
    if (dstExisting && dstExisting.type === 'dir') dstSegs = [...dstSegs, src.split('/').pop()];
    const parent = lookup(fsRootRef.current, dstSegs.slice(0, -1));
    const leaf = dstSegs[dstSegs.length - 1];
    if (!parent || parent.type !== 'dir') return { err: `cp: cannot create '${dstArg}': No such file or directory` };
    parent.children[leaf] = { type: 'file', perms: srcNode.perms, content: srcNode.content };
    return { out: '' };
  }

  function cmdMv(argsStr, cwdSegs) {
    const [src, dstArg] = tokenize(argsStr);
    if (!src || !dstArg) return { err: 'usage: mv <src> <dst>' };
    const srcSegs = resolvePath(cwdSegs, src);
    const srcParent = lookup(fsRootRef.current, srcSegs.slice(0, -1));
    const srcLeaf = srcSegs[srcSegs.length - 1];
    const srcNode = srcParent && srcParent.children[srcLeaf];
    if (!srcNode) return { err: withCaseHint(`mv: cannot stat '${src}': No such file or directory`, suggest(cwdSegs, src)) };
    let dstSegs = resolvePath(cwdSegs, dstArg);
    const dstExisting = lookup(fsRootRef.current, dstSegs);
    if (dstExisting && dstExisting.type === 'dir') dstSegs = [...dstSegs, srcLeaf];
    const parent = lookup(fsRootRef.current, dstSegs.slice(0, -1));
    const leaf = dstSegs[dstSegs.length - 1];
    if (!parent || parent.type !== 'dir') return { err: `mv: cannot move to '${dstArg}': No such file or directory` };
    parent.children[leaf] = srcNode;
    delete srcParent.children[srcLeaf];
    return { out: '' };
  }

  function cmdChmod(argsStr, cwdSegs) {
    const [mode, target] = tokenize(argsStr);
    if (!mode || !target || !/^[0-7]{3}$/.test(mode)) return { err: 'usage: chmod <octal-mode> <path>' };
    const node = lookup(fsRootRef.current, resolvePath(cwdSegs, target));
    if (!node) return { err: withCaseHint(`chmod: cannot access '${target}': No such file or directory`, suggest(cwdSegs, target)) };
    node.perms = octalToPerms(mode, node.type === 'dir');
    return { out: '' };
  }

  function cmdEcho(rawArgs, cwdSegs) {
    const appendIdx = rawArgs.indexOf('>>');
    const overwriteIdx = rawArgs.indexOf('>');
    let mode = null, textPart = rawArgs, target = null;
    if (appendIdx !== -1) { mode = 'append'; textPart = rawArgs.slice(0, appendIdx); target = rawArgs.slice(appendIdx + 2).trim(); }
    else if (overwriteIdx !== -1) { mode = 'overwrite'; textPart = rawArgs.slice(0, overwriteIdx); target = rawArgs.slice(overwriteIdx + 1).trim(); }
    if (!mode || !target) return { err: 'usage: echo <text> > <file>  (or >> to append)' };
    let text = textPart.trim();
    const mDouble = text.match(/^"(.*)"$/), mSingle = text.match(/^'(.*)'$/);
    if (mDouble) text = mDouble[1]; else if (mSingle) text = mSingle[1];
    const segs = resolvePath(cwdSegs, target);
    const parent = lookup(fsRootRef.current, segs.slice(0, -1));
    const leaf = segs[segs.length - 1];
    if (!parent || parent.type !== 'dir') return { err: `bash: ${target}: No such file or directory` };
    const existing = parent.children[leaf];
    if (existing && existing.type === 'dir') return { err: `bash: ${target}: Is a directory` };
    const newContent = mode === 'append' ? `${(existing?.content ?? '').replace(/\n$/, '')}\n${text}\n` : `${text}\n`;
    parent.children[leaf] = { type: 'file', perms: existing?.perms ?? '-rw-r--r--', content: newContent };
    return { out: '' };
  }

  const runCommand = useCallback((raw) => {
    const trimmed = raw.trim();
    appendLine({ type: 'cmd', text: `analyst@${HOST}:/${cwd.join('/')}$ ${raw}` });
    if (!trimmed) return;
    setHistory((h) => [...h, raw]);
    historyPosRef.current = -1;

    const spaceIdx = trimmed.indexOf(' ');
    const cmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const argsStr = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
    const task = TASKS[taskIndex];

    if (cmd === 'clear') { setOutput([]); return; }
    if (cmd === 'skip') { goToTask(taskIndex + 1, 0, 1); return; }

    let result;
    switch (cmd) {
      case 'pwd':   result = cmdPwd(cwd); break;
      case 'ls':    result = cmdLs(argsStr, cwd); break;
      case 'cd':    result = cmdCd(argsStr, cwd); break;
      case 'cat':   result = cmdCat(argsStr, cwd); break;
      case 'touch': result = cmdTouch(argsStr, cwd); break;
      case 'mkdir': result = cmdMkdir(argsStr, cwd); break;
      case 'rm':    result = cmdRm(argsStr, cwd); break;
      case 'cp':    result = cmdCp(argsStr, cwd); break;
      case 'mv':    result = cmdMv(argsStr, cwd); break;
      case 'chmod': result = cmdChmod(argsStr, cwd); break;
      case 'echo':  result = cmdEcho(argsStr, cwd); break;
      case 'whoami':result = { out: USER }; break;
      case 'help':  result = { out: HELP_TEXT }; break;
      case 'hint':  result = { out: nextHint(task) }; break;
      default:      result = { err: `bash: ${cmd}: command not found` };
    }

    if (result?.out) appendLine({ type: 'out', text: result.out });
    if (result?.err) appendLine({ type: 'err', text: result.err });

    if (!finished && allChecksPass(task, fsRootRef.current)) {
      appendLine({ type: 'ok', text: `✓ Task ${taskIndex + 1} solved: ${task.title}` });
      goToTask(taskIndex + 1, 1, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd, taskIndex, finished, appendLine, nextHint, goToTask]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { runCommand(input); setInput(''); }
    else if (e.key === 'ArrowUp') {
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
      const result = completeToken(fsRootRef.current, cwd, partial);
      if (!result) return;
      setInput(head + result.replacement);
      if (result.matches.length > 1) appendLine({ type: 'sys', text: result.matches.join('  ') });
    }
  };

  const task = TASKS[taskIndex];
  const pct = Math.round((taskIndex / TASKS.length) * 100);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="term-wrap" style={{ '--term-accent': color }}>
      <div className="term-toolbar">
        <div className="term-dots"><span /><span /><span /></div>
        <div className="term-title">analyst@{HOST} — Task {taskIndex + 1}/{TASKS.length}: {task.title}</div>
        <div className="speedrun-timer">{mm}:{ss}</div>
      </div>

      <div className="term-progress-track">
        <div className="term-progress-fill" style={{ width: `${finished ? 100 : pct}%` }} />
      </div>

      <div className="speedrun-scoreboard">
        <span className="speedrun-solved">✓ {solvedCount} solved</span>
        <span className="speedrun-skipped">⤼ {skippedCount} skipped</span>
      </div>

      <div className="term-screen" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
        {output.map((line, i) => (
          <div key={i} className={`term-line term-line-${line.type}`}>{line.text}</div>
        ))}
        {!finished && (
          <div className="term-input-row">
            <span className="term-prompt">analyst@{HOST}:/{cwd.join('/')}$</span>
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
