import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateProgress } from '../api/lair.js';
import { dir } from '../utils/shellLex.js';
import { displayPath, completeToken, makeReadOnlyCommands, runPipeline } from '../utils/readOnlyShell.js';

const BASIC_COMMANDS = ['pwd', 'ls', 'cd', 'cat', 'less', 'more', 'head', 'tail', 'file', 'grep', 'find', 'whoami', 'hint', 'accuse', 'clear', 'help'];
const ADVANCED_COMMANDS = [...BASIC_COMMANDS, 'sort', 'uniq', 'wc', 'cut', 'diff', 'stat'];

const BASIC_HELP =
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
  '  hint                reveal the next investigative hint\n' +
  '  accuse <name>       name who you believe deleted the case file\n' +
  '  clear               clear the screen';

const ADVANCED_HELP =
  BASIC_HELP +
  '\n\nCommands can be chained with a pipe, e.g. grep "x" file | sort | uniq -c\n' +
  '  sort [-n] [-r]        sort piped lines (numerically / reversed)\n' +
  '  uniq [-c]              collapse adjacent duplicate lines (count with -c) — usually after sort\n' +
  '  wc [-l] [-w] [-c]      count lines/words/characters of piped text\n' +
  '  cut -d <delim> -f <N>  extract field N from piped delimited lines\n' +
  '  diff <fileA> <fileB>   show lines that differ between two files\n' +
  '  stat <path>             show a file\'s permissions, owner, size, and modified time';

export default function InvestigationGame({
  assignmentId, color, initialState, onComplete,
  tree, hostname, user, culprit, culpritAliases, keyEvidence, hints,
  commandSet = 'basic',
}) {
  const isAdvanced = commandSet === 'advanced';
  const COMMANDS = isAdvanced ? ADVANCED_COMMANDS : BASIC_COMMANDS;
  const HELP_TEXT = isAdvanced ? ADVANCED_HELP : BASIC_HELP;
  const homeSegs = useMemo(() => ['home', user], [user]);
  const fs = useMemo(() => dir({ home: dir({ [user]: tree }) }), [tree, user]);
  const shell = useMemo(() => makeReadOnlyCommands({ fs, homeSegs, user }), [fs, homeSegs, user]);

  const [cwd, setCwd] = useState(homeSegs);
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [hintIndex, setHintIndex] = useState(0);
  const [evidenceViewed, setEvidenceViewed] = useState(() => new Set(initialState?.evidenceViewed ?? []));
  const [wrongAttempts, setWrongAttempts] = useState(initialState?.wrongAttempts ?? 0);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const historyPosRef = useRef(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const initedRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const appendLine = useCallback((line) => setOutput((prev) => [...prev, line]), []);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    if (evidenceViewed.size > 0) {
      appendLine({ type: 'sys', text: `Resuming — ${evidenceViewed.size} piece(s) of evidence already reviewed.` });
    }
    appendLine({ type: 'sys', text: `Connected to ${hostname} as ${user}.` });
    appendLine({ type: 'out', text:
      'The Meridian Bank case file vanished from this workstation overnight. Everything relevant is ' +
      'somewhere under your home directory — nothing is locked behind a fixed order. Start with ' +
      'case-file/brief.txt. Type "help" for commands, "hint" if you get stuck, and "accuse <name>" once ' +
      'you\'re confident.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [output]);

  const nextHint = useCallback(() => {
    const idx = Math.min(hintIndex, hints.length - 1);
    setHintIndex((i) => i + 1);
    return `Hint: ${hints[idx]}`;
  }, [hintIndex, hints]);

  const recordEvidence = useCallback((paths) => {
    if (!paths || !paths.length) return;
    // cat/head/tail/non-recursive-grep report the full absolute path (home-
    // prefixed, e.g. "home/intern/case-file/brief.txt"); recursive grep
    // reports paths relative to whatever the student typed as the search
    // root. KEY_EVIDENCE is always written home-relative ("case-file/
    // brief.txt") — strip the home prefix here so both shapes match it.
    const homePrefix = homeSegs.join('/') + '/';
    setEvidenceViewed((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const raw of paths) {
        const p = raw.startsWith(homePrefix) ? raw.slice(homePrefix.length) : raw;
        if (keyEvidence.includes(p) && !next.has(p)) { next.add(p); changed = true; }
      }
      if (!changed) return prev;
      const pct = Math.round((next.size / keyEvidence.length) * 100);
      updateProgress(assignmentId, pct, { evidenceViewed: [...next], wrongAttempts }).catch(() => {});
      return next;
    });
  }, [assignmentId, keyEvidence, wrongAttempts, homeSegs]);

  const cmdAccuse = useCallback((argsStr) => {
    const name = argsStr.trim().toLowerCase();
    if (!name) return { err: 'usage: accuse <name>' };
    const isCorrect = culpritAliases.some((a) => a.toLowerCase() === name) || name === culprit.toLowerCase();
    if (!isCorrect) {
      setWrongAttempts((n) => n + 1);
      return { err: `That doesn't hold up against the evidence. Keep investigating — "hint" if you want a nudge.` };
    }
    appendLine({
      type: 'ok',
      text: `\n✓ CASE CLOSED — ${evidenceViewed.size}/${keyEvidence.length} pieces of key evidence reviewed, ${wrongAttempts} earlier accusation(s) before this one.`,
    });
    setFinished(true);
    onComplete?.({
      accused: name,
      wrongAttempts,
      evidenceViewed: [...evidenceViewed],
      totalKeyEvidence: keyEvidence.length,
      elapsedSeconds: elapsed,
    });
    return { out: '' };
  }, [culprit, culpritAliases, evidenceViewed, wrongAttempts, keyEvidence.length, onComplete, elapsed, appendLine]);

  const runCommand = useCallback((raw) => {
    const trimmed = raw.trim();
    appendLine({ type: 'cmd', text: `${user}@${hostname}:${displayPath(cwd, homeSegs)}$ ${raw}` });
    if (!trimmed) return;
    setHistory((h) => [...h, raw]);
    historyPosRef.current = -1;

    if (isAdvanced && trimmed.includes('|')) {
      const result = runPipeline(trimmed, shell, cwd);
      if (result?.out) appendLine({ type: 'out', text: result.out });
      if (result?.err) appendLine({ type: 'err', text: result.err });
      if (result?.readPaths) recordEvidence(result.readPaths);
      return;
    }

    const spaceIdx = trimmed.indexOf(' ');
    const cmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const argsStr = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

    let result;
    switch (cmd) {
      case 'pwd':    result = { out: '/' + cwd.join('/') }; break;
      case 'ls':     result = shell.cmdLs(argsStr, cwd); break;
      case 'cd': {
        const r = shell.cmdCd(argsStr, cwd);
        if (r.err) result = r;
        else { setCwd(r.newCwd); result = { out: '' }; }
        break;
      }
      case 'cat': case 'less': case 'more': result = shell.cmdCat(argsStr, cwd); break;
      case 'head':   result = shell.cmdHeadTail('head', argsStr, cwd); break;
      case 'tail':   result = shell.cmdHeadTail('tail', argsStr, cwd); break;
      case 'file':   result = shell.cmdFile(argsStr, cwd); break;
      case 'grep':   result = shell.cmdGrep(argsStr, cwd); break;
      case 'find':   result = shell.cmdFind(argsStr, cwd); break;
      case 'diff':   result = isAdvanced ? shell.cmdDiff(argsStr, cwd) : { err: `bash: diff: command not found` }; break;
      case 'stat':   result = isAdvanced ? shell.cmdStat(argsStr, cwd) : { err: `bash: stat: command not found` }; break;
      case 'sort': case 'uniq': case 'wc': case 'cut':
        result = isAdvanced
          ? { err: `${cmd}: expects piped input, e.g. cat file | ${cmd}` }
          : { err: `bash: ${cmd}: command not found` };
        break;
      case 'whoami': result = { out: user }; break;
      case 'help':   result = { out: HELP_TEXT }; break;
      case 'hint':   result = { out: nextHint() }; break;
      case 'accuse': result = cmdAccuse(argsStr); break;
      case 'clear':  setOutput([]); return;
      default:       result = { err: `bash: ${cmd}: command not found` };
    }

    if (result?.out) appendLine({ type: 'out', text: result.out });
    if (result?.err) appendLine({ type: 'err', text: result.err });
    if (result?.readPaths) recordEvidence(result.readPaths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd, homeSegs, hostname, user, appendLine, shell, nextHint, cmdAccuse, recordEvidence, isAdvanced]);

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

  const pct = Math.round((evidenceViewed.size / keyEvidence.length) * 100);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="term-wrap" style={{ '--term-accent': color }}>
      <div className="term-toolbar">
        <div className="term-dots"><span /><span /><span /></div>
        <div className="term-title">
          {user}@{hostname} — Investigation: {Math.min(evidenceViewed.size, keyEvidence.length)}/{keyEvidence.length} evidence · {mm}:{ss}
        </div>
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
            <span className="term-prompt">{user}@{hostname}:{displayPath(cwd, homeSegs)}$</span>
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
