import { test, expect } from '@playwright/test';

const API = 'http://localhost:5174/api/v1';
const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

test('squad standings show graded assignments out of currently available assignments', async ({ page }) => {
  const user = {
    id: 'scoreboard-progress-user', email: 'scoreboard@example.test',
    first_name: 'Score', last_name: 'Tester', role: 'student', professional_role: 'cyber_analyst',
  };
  await page.addInitScript(({ learner }) => {
    localStorage.setItem('user', JSON.stringify(learner));
    localStorage.setItem('accessToken', 'scoreboard-test-token');
    localStorage.setItem(`pact_inducted_v1_${learner.id}`, '1');
  }, { learner: user });

  await page.route(`${API}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/courses/${COURSE_ID}/enrollment/me`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'enrollment', cohort: { id: 'cohort', name: 'Test Cohort' }, squad: { id: 'squad-3', number: 3 } }),
  }));
  await page.route(`${API}/courses/${COURSE_ID}/scoreboard`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${API}/courses/${COURSE_ID}/squad-scoreboard`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ squadId: 'squad-3', squadNumber: 3, totalScore: 714, maxScore: 1046, graded: 7, available: 11 }]),
  }));

  await page.goto('/scoreboard');
  await page.getByRole('button', { name: 'SQUADS' }).click();

  const row = page.locator('.ops-board-entry');
  await expect(row).toContainText('68%');
  await expect(row).toContainText('7/11 graded');
});
