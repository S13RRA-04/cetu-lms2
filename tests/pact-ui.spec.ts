import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const USER_ID   = 'user-test-1';

const MOCK_USER = {
  id:                USER_ID,
  email:             'test@cetu.edu',
  first_name:        'Test',
  last_name:         'Operator',
  role:              'student',
  professional_role: 'special_agent',
};

const MOCK_ENROLLMENT = {
  id:     'enroll-1',
  cohort: { id: 'cohort-1', name: 'Alpha Cohort', target_revealed: false },
  squad:  { id: 'squad-1', number: 1, name: 'Red Team' },
};

const MOCK_ASSIGNMENTS = [
  { id: 'a1', title: 'Day 1 Lecture', type: 'module',     is_unlocked: true,  progress: 0,   drop_number: 1, grading_mode: 'individual', questions: [] },
  { id: 'a2', title: 'Network Recon', type: 'module',     is_unlocked: true,  progress: 55,  drop_number: 1, grading_mode: 'individual', questions: [] },
  { id: 'a3', title: 'Squad Workshop',type: 'challenge',  is_unlocked: true,  progress: 0,   drop_number: 1, grading_mode: 'squad',      questions: [], description: 'Prepare squad answers on reconnaissance, enumeration, and lateral movement.' },
  { id: 'a4', title: 'Pre-Assessment',type: 'assessment', is_unlocked: true,  progress: 100, drop_number: 1, grading_mode: 'individual', questions: [] },
  { id: 'a5', title: 'Locked Module', type: 'module',     is_unlocked: false, progress: 0,   drop_number: 2, grading_mode: 'individual', questions: [] },
];

const MOCK_DROPS = [
  { id: 'drop-1', number: 1, title: 'Initial Access', is_unlocked: true,  narrative_intro: 'Command has authorized initial intelligence packages.' },
  { id: 'drop-2', number: 2, title: 'Lateral Movement', is_unlocked: false, narrative_intro: null },
];

const MOCK_GRADES = [
  { id: 'g1', score: '88', max_score: '100', graded_at: new Date().toISOString(), feedback: 'Well done.', Assignment: { title: 'Day 1 Lecture' } },
];

const MOCK_SCOREBOARD = [
  { userId: USER_ID,     firstName: 'Test',  lastName: 'Operator', totalScore: 88,  maxScore: 100 },
  { userId: 'user-2',   firstName: 'Alpha', lastName: 'Agent',    totalScore: 72,  maxScore: 100 },
];

const SS = 'test-results/screenshots';

async function setupAuth(page: Page, opts: { inducted?: boolean; role?: string } = {}) {
  const inducted = opts.inducted !== false; // default true
  const user     = { ...MOCK_USER, role: opts.role ?? 'student' };

  await page.addInitScript(({ u, userId, ind }) => {
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('accessToken', 'test-token-playwright');
    if (ind) localStorage.setItem(`pact_inducted_v1_${userId}`, '1');
  }, { u: user, userId: USER_ID, ind: inducted });

  const BASE = 'http://localhost:5174/api/v1';

  // Catch-all first (LIFO — specific routes registered after take priority)
  await page.route(`${BASE}/**`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route(`${BASE}/auth/refresh`, r =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'refreshed-token', user }) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/enrollment/me`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ENROLLMENT) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/assignments*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ASSIGNMENTS) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/cohorts/*/drops*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DROPS) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/grades/me`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GRADES) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/scoreboard`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SCOREBOARD) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/content*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/scenarios*`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
}

function ss(name: string) {
  fs.mkdirSync(SS, { recursive: true });
  return path.join(SS, `${name}.png`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Unauthenticated → redirect to /login
// ─────────────────────────────────────────────────────────────────────────────
test('Auth guard — redirects unauthenticated user to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.screenshot({ path: ss('01-login-redirect') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Login page — ops terminal UI present
// ─────────────────────────────────────────────────────────────────────────────
test('Login page — govt warning banner + PACT wordmark + form renders', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('.auth-banner')).toBeVisible();
  await expect(page.locator('.auth-banner')).toContainText('AUTHORIZED USE ONLY');

  await expect(page.locator('.auth-wordmark')).toBeVisible();
  await expect(page.locator('.auth-wordmark')).toContainText('PACT');

  await expect(page.locator('.auth-ident-badge')).toContainText('SECURE SYSTEM ACCESS');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toContainText('AUTHENTICATE');

  await expect(page.locator('.auth-class-bar')).toContainText('UNCLASSIFIED');

  await page.screenshot({ path: ss('02-login-page') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. InductionSequence fires for new student (not inducted)
// ─────────────────────────────────────────────────────────────────────────────
test('InductionSequence — renders for non-inducted student', async ({ page }) => {
  await setupAuth(page, { inducted: false });
  await page.goto('/');

  await expect(page.locator('.ind-root')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.ind-p0-title')).toContainText('TASK FORCE BRIEFING');

  await page.screenshot({ path: ss('03-induction-sequence') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Dashboard — ops shell renders with all major sections
// ─────────────────────────────────────────────────────────────────────────────
test('Dashboard — ops shell renders HUD, rail, and content pane', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.ops-left-rail')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.ops-right-pane')).toBeVisible();
  await expect(page.locator('.ops-hud')).toBeVisible();
  await expect(page.locator('.ops-hud-op')).toContainText('OPERATION BRKR');

  await page.screenshot({ path: ss('04-dashboard-shell') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. HUD — live clock shows a time string
// ─────────────────────────────────────────────────────────────────────────────
test('HUD — live clock displays time', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-hud-clock').waitFor({ timeout: 8000 });

  const clockText = await page.locator('.ops-hud-clock').textContent();
  console.log('Clock text:', clockText);
  expect(clockText).toMatch(/\d{2}:\d{2}:\d{2}/);

  await page.screenshot({ path: ss('05-hud-clock') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Squad theming — Squad 1 red CSS variable applied
// ─────────────────────────────────────────────────────────────────────────────
test('Squad theming — Squad 1 sets red --primary CSS variable', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-left-rail').waitFor({ timeout: 8000 });

  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  );
  console.log('--primary:', primary);
  // Squad 1 primary is #ef4444
  expect(primary.toLowerCase()).toContain('ef4444');

  await page.screenshot({ path: ss('06-squad-theming') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. PACT brand — visible in left rail with glow
// ─────────────────────────────────────────────────────────────────────────────
test('Left rail — PACT brand word visible with text-shadow glow', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-brand-word').waitFor({ timeout: 8000 });

  await expect(page.locator('.ops-brand-word')).toContainText('PACT');

  const shadow = await page.locator('.ops-brand-word').evaluate(el =>
    getComputedStyle(el).textShadow
  );
  console.log('Brand text-shadow:', shadow);
  expect(shadow).not.toBe('none');

  await page.screenshot({ path: ss('07-brand-glow') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Navigation items — all five present in left rail
// ─────────────────────────────────────────────────────────────────────────────
test('Left rail — nav items present (OPERATIONS, CASE FILE, INTEL LIBRARY, OPERATOR RECORD, STANDINGS)', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-nav').waitFor({ timeout: 8000 });

  const labels = await page.locator('.ops-nav-label').allTextContents();
  console.log('Nav labels:', labels);

  expect(labels).toContain('OPERATIONS');
  expect(labels).toContain('CASE FILE');
  expect(labels).toContain('INTEL LIBRARY');
  expect(labels).toContain('OPERATOR RECORD');
  expect(labels).toContain('STANDINGS');

  await page.screenshot({ path: ss('08-nav-items') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Navigation — active state on current route
// ─────────────────────────────────────────────────────────────────────────────
test('Navigation — OPERATIONS nav item is active on dashboard', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-nav').waitFor({ timeout: 8000 });

  const activeItem = page.locator('.ops-nav-active');
  await expect(activeItem).toBeVisible();
  await expect(activeItem.locator('.ops-nav-label')).toContainText('OPERATIONS');

  await page.screenshot({ path: ss('09-active-nav') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Dashboard stat strip — four counters rendered
// ─────────────────────────────────────────────────────────────────────────────
test('Dashboard — stat strip shows 4 counters', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-stat-strip').waitFor({ timeout: 8000 });

  const stats = page.locator('.ops-stat');
  await expect(stats).toHaveCount(4);

  const labels = await page.locator('.ops-stat-label').allTextContents();
  console.log('Stat labels:', labels);
  expect(labels).toContain('ISSUED');
  expect(labels).toContain('CLOSED');
  expect(labels).toContain('ACTIVE');
  expect(labels).toContain('CASE STATUS');

  await page.screenshot({ path: ss('10-stat-strip') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Dashboard — tasking rows render for unlocked assignments
// ─────────────────────────────────────────────────────────────────────────────
test('Dashboard — tasking rows render (4 unlocked assignments)', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-tasking-block').waitFor({ timeout: 8000 });

  const rows = page.locator('.ops-tasking-row');
  const count = await rows.count();
  console.log('Tasking row count:', count);
  expect(count).toBe(4); // a1-a4 unlocked, a5 locked

  await page.screenshot({ path: ss('11-tasking-rows') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Dashboard — completed assignment shows CLOSED badge
// ─────────────────────────────────────────────────────────────────────────────
test('Dashboard — 100% progress assignment shows CLOSED', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-tasking-block').waitFor({ timeout: 8000 });

  const doneBadge = page.locator('.ops-tasking-done-label');
  await expect(doneBadge).toBeVisible();
  await expect(doneBadge).toContainText('CLOSED');

  const doneRow = page.locator('.ops-tasking-done');
  await expect(doneRow).toBeVisible();

  await page.screenshot({ path: ss('12-closed-tasking') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Dashboard — progress track renders for in-progress assignment
// ─────────────────────────────────────────────────────────────────────────────
test('Dashboard — in-progress assignment shows progress bar', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-tasking-block').waitFor({ timeout: 8000 });

  const progFill = page.locator('.ops-tasking-prog-fill').first();
  await expect(progFill).toBeVisible();

  const width = await progFill.evaluate(el => (el as HTMLElement).style.width);
  console.log('Progress fill width:', width);
  expect(width).toBe('55%');

  await page.screenshot({ path: ss('13-progress-bar') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Navigation — route change updates active nav and loads page
// ─────────────────────────────────────────────────────────────────────────────
test('Navigation — clicking OPERATOR RECORD navigates to grades', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-nav').waitFor({ timeout: 8000 });

  await page.locator('.ops-nav-item').filter({ hasText: 'OPERATOR RECORD' }).click();
  await expect(page).toHaveURL(/\/grades/);
  await page.waitForLoadState('networkidle');

  const active = page.locator('.ops-nav-active');
  await expect(active.locator('.ops-nav-label')).toContainText('OPERATOR RECORD');

  await page.screenshot({ path: ss('14-grades-nav') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Grades page — renders with eyebrow and performance data
// ─────────────────────────────────────────────────────────────────────────────
test('Grades page — perf table row renders with score', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/grades');
  await page.waitForLoadState('networkidle');

  await page.locator('.ops-perf-table').waitFor({ timeout: 8000 });

  const rows = page.locator('.ops-perf-row');
  await expect(rows).toHaveCount(1);

  const score = await page.locator('.ops-perf-val').first().textContent();
  console.log('Grade score:', score);
  expect(score).toContain('88');

  await page.screenshot({ path: ss('15-grades-page') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Scoreboard — board entries render with name and bar
// ─────────────────────────────────────────────────────────────────────────────
test('Scoreboard — two entries, "YOU" chip on current user', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/scoreboard');
  await page.waitForLoadState('networkidle');

  await page.locator('.ops-board').waitFor({ timeout: 8000 });

  const entries = page.locator('.ops-board-entry');
  await expect(entries).toHaveCount(2);

  const youChip = page.locator('.ops-board-you');
  await expect(youChip).toBeVisible();
  await expect(youChip).toContainText('YOU');

  await page.screenshot({ path: ss('16-scoreboard') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Globe — canvas is present behind right pane
// ─────────────────────────────────────────────────────────────────────────────
test('Globe — canvas element present in ops-globe-bg', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-globe-bg').waitFor({ timeout: 8000 });

  const canvas = page.locator('.ops-globe-bg canvas').first();
  await expect(canvas).toBeAttached();

  const box = await canvas.boundingBox();
  expect(box!.width).toBeGreaterThan(200);

  await page.screenshot({ path: ss('17-globe-canvas') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Target card — renders in left rail (squad assigned, target not revealed)
// ─────────────────────────────────────────────────────────────────────────────
test('Target card — renders PENDING ASSIGNMENT for unrevealed target', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-target-card').waitFor({ timeout: 8000 });

  const header = page.locator('.ops-target-header');
  await expect(header).toContainText('PENDING ASSIGNMENT');

  await expect(page.locator('.ops-target-redacted')).toBeVisible();

  await page.screenshot({ path: ss('18-target-card') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Operator identity — name and role shown in left rail footer
// ─────────────────────────────────────────────────────────────────────────────
test('Operator identity — name visible in left rail', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.ops-operator').waitFor({ timeout: 8000 });

  await expect(page.locator('.ops-op-name')).toContainText('Test Operator');
  await expect(page.locator('.ops-op-role')).toContainText('OPERATOR');

  await page.screenshot({ path: ss('19-operator-identity') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Assignment page — access screen shows, then form loads
// ─────────────────────────────────────────────────────────────────────────────
test('Assignment page — renders module intro for unlocked assignment', async ({ page }) => {
  const BASE = 'http://localhost:5174/api/v1';
  const MOCK_ASSIGNMENT = { ...MOCK_ASSIGNMENTS[0], id: 'a1' };

  await setupAuth(page);
  await page.route(`${BASE}/courses/${COURSE_ID}/assignments/a1`, r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ASSIGNMENT) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/assignments/a1/submissions/mine`, r =>
    r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
  );

  await page.goto('/assignment/a1');
  await page.waitForLoadState('networkidle');

  // AccessingScreen fires first (~1.4s), then content
  await page.waitForTimeout(2000);
  await expect(page.locator('.assignment-page')).toBeVisible({ timeout: 6000 });

  await page.screenshot({ path: ss('20-assignment-page') });
});
