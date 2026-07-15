import { test, expect, Page } from '@playwright/test';

const API = 'http://localhost:5174/api/v1';
const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const ASSIGNMENT_ID = 'formatted-manual-assignment';
const LEARNER_ID = 'formatted-manual-learner';

const learner = {
  id: LEARNER_ID,
  email: 'formatted-learner@example.test',
  first_name: 'Format',
  last_name: 'Learner',
  role: 'student',
  professional_role: 'cyber_analyst',
};

const instructor = {
  id: 'formatted-manual-instructor',
  email: 'formatted-instructor@example.test',
  first_name: 'Format',
  last_name: 'Instructor',
  role: 'instructor',
};

const assignment = {
  id: ASSIGNMENT_ID,
  course_id: COURSE_ID,
  title: 'Formatted Incident Assessment',
  description: 'Document the evidence and explain the investigative conclusion.',
  type: 'challenge',
  grading_mode: 'individual',
  is_unlocked: true,
  is_published: true,
  max_score: 10,
  progress: 0,
  pending_count: 1,
  graded_count: 0,
  order_index: 1,
  questions: [{
    kind: 'prompt',
    text: 'Summarize the incident evidence.',
    points: 10,
    rubric: {
      keyElements: ['Identifies the affected system', 'Connects evidence to the conclusion'],
      commonErrors: ['States a conclusion without supporting evidence'],
    },
  }],
};

async function setBrowserUser(page: Page, user: typeof learner | typeof instructor) {
  await page.evaluate((nextUser) => {
    localStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('accessToken', 'formatted-flow-token');
    localStorage.setItem(`pact_inducted_v1_${nextUser.id}`, '1');
  }, user);
}

test('formatted learner response is submitted, graded by criteria, and reviewed by the learner', async ({ page }) => {
  let submissionContent = '';
  let grade: null | Record<string, unknown> = null;

  await page.addInitScript(({ user }) => {
    if (!localStorage.getItem('user')) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', 'formatted-flow-token');
      localStorage.setItem(`pact_inducted_v1_${user.id}`, '1');
    }
  }, { user: learner });

  // Catch-all is registered first because Playwright evaluates matching routes last-in-first-out.
  await page.route(`${API}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'refreshed-token' }),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/enrollment/me`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'formatted-enrollment', cohort: { id: 'formatted-cohort', name: 'Formatting Cohort' }, squad: null }),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(assignment),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/submissions/mine`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: submissionContent ? JSON.stringify({
      id: 'formatted-submission', assignment_id: ASSIGNMENT_ID, user_id: LEARNER_ID,
      content: submissionContent, progress: 100, status: grade ? 'graded' : 'submitted',
    }) : 'null',
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/submit`, async (route) => {
    submissionContent = route.request().postDataJSON().content;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'formatted-submission', status: 'submitted' }) });
  });
  await page.route(`${API}/courses/${COURSE_ID}/grades/me`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(grade ? [grade] : []),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments?limit=200&manage=1`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([{ ...assignment, pending_count: grade ? 0 : 1, graded_count: grade ? 1 : 0 }]),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/submissions`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: 'formatted-submission', assignment_id: ASSIGNMENT_ID, user_id: LEARNER_ID,
      content: submissionContent, progress: 100, status: grade ? 'graded' : 'submitted',
      submitted_at: '2026-07-14T20:00:00.000Z', student: learner,
    }]),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/grades`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(grade ? [grade] : []),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/grades/${LEARNER_ID}`, async (route) => {
    const body = route.request().postDataJSON();
    grade = { id: 'formatted-grade', assignment_id: ASSIGNMENT_ID, user_id: LEARNER_ID, max_score: 10, ...body };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(grade) });
  });

  // Learner creates and previews a formatted response.
  await page.goto(`/assignment/${ASSIGNMENT_ID}`);
  const editor = page.locator('.formatted-editor textarea');
  await expect(editor).toBeVisible({ timeout: 6_000 });
  await editor.fill('Redstone server');
  await editor.selectText();
  await page.getByRole('button', { name: 'Bold' }).click();
  await page.getByRole('button', { name: 'Insert table' }).click();
  await page.getByRole('button', { name: 'Insert columns' }).click();
  await editor.fill([
    '**Redstone server** showed unauthorized access.',
    '',
    '| Evidence | Finding |',
    '| --- | --- |',
    '| Login log | Unknown source IP |',
    '',
    ':::columns',
    ':::column',
    '*Observed:* suspicious login',
    ':::column',
    '*Conclusion:* investigate compromise',
    ':::',
  ].join('\n'));
  await page.getByText('Preview formatting').click();
  const preview = page.locator('.formatted-preview');
  await expect(preview.locator('strong')).toHaveText('Redstone server');
  await expect(preview.locator('table')).toContainText('Unknown source IP');
  await expect(preview.locator('.formatted-columns > div')).toHaveCount(2);

  await page.getByRole('button', { name: 'REVIEW SUBMISSION' }).click();
  await page.getByRole('button', { name: /CONFIRM.*TRANSMIT/ }).click();
  await expect.poll(() => submissionContent).toContain('**Redstone server**');

  // Instructor checks one criterion; the browser must submit the derived 5/10 score.
  await setBrowserUser(page, instructor);
  await page.goto('/admin');
  await page.getByRole('button', { name: /Pending/ }).click();
  await page.getByRole('button', { name: /Formatted Incident Assessment/ }).click();
  await page.getByRole('button', { name: /Format Learner/ }).click();
  await expect(page.locator('.admin-detail strong')).toHaveText('Redstone server');
  await page.getByLabel('Identifies the affected system').check();
  await expect(page.getByText('5', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Save Grade' }).click();
  await expect.poll(() => grade?.score).toBe(5);
  expect((grade?.promptScores as Record<string, { criteria: boolean[] }>)[0].criteria).toEqual([true, false]);

  // Learner reopens the graded challenge and sees formatting plus criterion-derived score.
  await setBrowserUser(page, learner);
  await page.goto(`/assignment/${ASSIGNMENT_ID}`);
  await expect(page.getByText('AFTER-ACTION ASSESSMENT')).toBeVisible({ timeout: 6_000 });
  await expect(page.locator('.formatted-text strong')).toHaveText('Redstone server');
  await expect(page.locator('.formatted-text table')).toContainText('Unknown source IP');
  await expect(page.locator('.formatted-text .formatted-columns > div')).toHaveCount(2);
  await expect(page.getByText('5 / 10')).toBeVisible();
});
