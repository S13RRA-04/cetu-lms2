import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const MOCK_USER = {
  id: 'user-test-1',
  email: 'test@cetu.edu',
  first_name: 'Test',
  last_name: 'Operator',
  role: 'student',
};

const MOCK_ENROLLMENT_SQUAD1 = {
  id: 'enroll-1',
  cohort: { id: 'cohort-1', name: 'Alpha Cohort' },
  squad: {
    id: 'squad-1',
    number: 1,
    name: 'Red Team',
    students: [{ id: 'user-test-1', first_name: 'Test', last_name: 'Operator' }],
  },
};

const MOCK_ASSIGNMENTS = [
  { id: 'a1', title: 'Day 1 Lecture 1', type: 'module',     is_unlocked: true, is_published: true, order_index: 1,  progress: 0,   grading_mode: 'individual', questions: [] },
  { id: 'a2', title: 'Day 1 Lecture 2', type: 'module',     is_unlocked: true, is_published: true, order_index: 2,  progress: 50,  grading_mode: 'individual', questions: [] },
  { id: 'a3', title: 'Day 1 Workshop',  type: 'challenge',  is_unlocked: true, is_published: true, order_index: 3,  progress: 0,   grading_mode: 'squad',      questions: [], description: 'Prepare squad answers on reconnaissance, enumeration, and initial access.' },
  { id: 'a4', title: 'Day 2 Workshop',  type: 'challenge',  is_unlocked: true, is_published: true, order_index: 4,  progress: 100, grading_mode: 'squad',      questions: [] },
  { id: 'a5', title: 'Pre-test',        type: 'assessment', is_unlocked: true, is_published: true, order_index: 10, progress: 0,   grading_mode: 'individual', questions: [] },
];

const SS_DIR = 'test-results/screenshots';

async function setupAuth(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', 'test-token-abc');
  }, MOCK_USER);

  // Routes use full-origin to avoid matching /src/api/*.js Vite module files.
  // Playwright matches LIFO — register catch-all FIRST so specific routes (registered last) take priority.
  const BASE = 'http://localhost:5174/api/v1';
  await page.route(`${BASE}/**`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/grades/me`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/scoreboard`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/assignments*`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ASSIGNMENTS) })
  );
  await page.route(`${BASE}/courses/${COURSE_ID}/enrollment/me`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ENROLLMENT_SQUAD1) })
  );
}

function ss(name: string) {
  fs.mkdirSync(SS_DIR, { recursive: true });
  return path.join(SS_DIR, `${name}.png`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Globe: canvas renders with non-zero dimensions
// ─────────────────────────────────────────────────────────────────────────────
test('Globe — WebGL canvas renders', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const canvas = page.locator('.globe-bg canvas');
  await expect(canvas).toBeVisible({ timeout: 8000 });

  const box = await canvas.boundingBox();
  expect(box!.width, 'canvas width > 400px').toBeGreaterThan(400);
  expect(box!.height, 'canvas height > 400px').toBeGreaterThan(400);

  await page.waitForTimeout(1200); // let Three.js render several frames
  await page.screenshot({ path: ss('01-globe-renders'), fullPage: false });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Globe: has bright pixels — not a featureless dark blob
// ─────────────────────────────────────────────────────────────────────────────
test('Globe — not a black blob (has bright pixels)', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('.globe-bg canvas').waitFor({ timeout: 8000 });
  await page.waitForTimeout(1500);

  // react-globe.gl uses preserveDrawingBuffer:false so canvas.toDataURL() always returns blank.
  // Use Playwright's OS compositor screenshot instead — it captures what actually rendered on screen.
  const globeShot = await page.locator('.globe-bg').screenshot();
  // A blank/all-black region compresses to <8KB; a rendered globe with textures/arcs is much larger.
  const shotKB = globeShot.byteLength / 1024;
  console.log(`Globe screenshot size: ${shotKB.toFixed(1)} KB`);
  expect(shotKB, `Globe screenshot too small (${shotKB.toFixed(1)}KB) — likely blank`).toBeGreaterThan(30);
  await page.screenshot({ path: ss('02-globe-not-black-blob') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sidebar: dark glass background (not white)
// ─────────────────────────────────────────────────────────────────────────────
test('Sidebar — dark glass background applied', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.app-sidebar').waitFor();

  const bg = await page.locator('.app-sidebar').evaluate(el =>
    getComputedStyle(el).backgroundColor
  );
  console.log('Sidebar bg:', bg);

  // Must not be white or near-white
  const isWhite = /rgba?\(25[0-9],\s*25[0-9],\s*25[0-9]/.test(bg);
  expect(isWhite, `Sidebar should not be white; got: ${bg}`).toBe(false);

  await page.screenshot({ path: ss('03-sidebar-dark-glass') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sidebar: squad-1 red tint applied via inline style
// ─────────────────────────────────────────────────────────────────────────────
test('Sidebar — squad-1 red tint in inline style', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.app-sidebar').waitFor();

  const style = await page.locator('.app-sidebar').getAttribute('style');
  console.log('Sidebar inline style:', style);

  expect(style, 'inline style should be set').toBeTruthy();
  // Squad 1 primary is #ff073a — the red channel (255) should appear in the rgba value
  expect(style).toMatch(/rgba?\(\s*255/i);

  await page.screenshot({ path: ss('04-sidebar-squad-tint') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Sidebar brand text glows with squad color
// ─────────────────────────────────────────────────────────────────────────────
test('Sidebar — PACT brand text has text-shadow', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');

  const shadow = await page.locator('.sidebar-brand-text').evaluate(el =>
    getComputedStyle(el).textShadow
  );
  console.log('Brand text-shadow:', shadow);
  expect(shadow).not.toBe('none');

  await page.screenshot({ path: ss('05-brand-glow') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Mission group: collapses and expands with CSS class toggling
// ─────────────────────────────────────────────────────────────────────────────
test('Mission groups — collapse / expand toggles CSS classes', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');

  const btn   = page.locator('.sidebar-group-btn').first();
  const items = page.locator('.sidebar-group-items').first();
  await btn.waitFor();

  // Initially all groups expanded
  await expect(items).toHaveClass(/expanded/);
  await expect(btn).not.toHaveClass(/collapsed/);

  // Collapse
  await btn.click();
  await expect(btn).toHaveClass(/collapsed/);
  await expect(items).not.toHaveClass(/expanded/);
  await page.screenshot({ path: ss('06a-group-collapsed') });

  // Re-expand
  await btn.click();
  await expect(btn).not.toHaveClass(/collapsed/);
  await expect(items).toHaveClass(/expanded/);
  await page.screenshot({ path: ss('06b-group-expanded') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Chevron rotates: 90° expanded, 0° collapsed
// ─────────────────────────────────────────────────────────────────────────────
test('Mission groups — chevron rotates on collapse', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');

  const btn     = page.locator('.sidebar-group-btn').first();
  const chevron = btn.locator('.sidebar-chevron');
  await btn.waitFor();

  const expandedTransform = await chevron.evaluate(el => getComputedStyle(el).transform);
  console.log('Expanded chevron transform:', expandedTransform);

  await btn.click();
  await page.waitForTimeout(400); // let the 280ms CSS transition settle
  const collapsedTransform = await chevron.evaluate(el => getComputedStyle(el).transform);
  console.log('Collapsed chevron transform:', collapsedTransform);

  // The transforms must differ (rotation changed)
  expect(expandedTransform).not.toBe(collapsedTransform);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Active link: border-left non-transparent when link is active
// ─────────────────────────────────────────────────────────────────────────────
test('Nav links — active state has colored left border', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/grades');
  await page.locator('.sidebar-link.active').waitFor({ timeout: 5000 });

  const borderColor = await page.locator('.sidebar-link.active').evaluate(el =>
    getComputedStyle(el).borderLeftColor
  );
  console.log('Active link border-left-color:', borderColor);

  const isTransparent = borderColor === 'rgba(0, 0, 0, 0)' || borderColor === 'transparent';
  expect(isTransparent, `Active link should have colored border; got: ${borderColor}`).toBe(false);

  await page.screenshot({ path: ss('08-active-link') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Page transition: .page-transition element present after navigation
// ─────────────────────────────────────────────────────────────────────────────
test('Page transition — wrapper present on route change', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.locator('.page-transition').waitFor({ timeout: 5000 });

  // Navigate to a different route
  await page.locator('a[href="/grades"]').click();
  await expect(page.locator('.page-transition')).toBeVisible();

  // Navigate back
  await page.locator('a[href="/"]').click();
  await expect(page.locator('.page-transition')).toBeVisible();

  await page.screenshot({ path: ss('09-page-transition') });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Progress bars render on assignments with progress > 0
// ─────────────────────────────────────────────────────────────────────────────
test('Assignment items — progress bar renders for partial progress', async ({ page }) => {
  await setupAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // a2 has 50% progress, a4 has 100%
  const bars = page.locator('.sidebar-a-progress');
  await bars.first().waitFor({ timeout: 5000 });
  const count = await bars.count();
  expect(count, 'Should have 2 progress bars (50% and 100%)').toBe(2);

  const width = await bars.first().evaluate(el => (el as HTMLElement).style.width);
  console.log('First progress bar width:', width);
  expect(width).toBe('50%');

  await page.screenshot({ path: ss('10-progress-bars') });
});
