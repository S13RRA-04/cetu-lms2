import { test, expect } from '@playwright/test';

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const USER_ID = 'scenario-drop-routing-user';

test('scenario-drop files populate Case File and Evidence but not Intel Library', async ({ page }) => {
  const user = {
    id: USER_ID,
    email: 'drop-routing@example.test',
    first_name: 'Drop',
    last_name: 'Tester',
    role: 'student',
    professional_role: 'special_agent',
  };
  const dropFile = {
    id: 'drop-file-1',
    title: 'Recovered Network Evidence',
    file_name: 'recovered-network-evidence.pdf',
    file_size: 4096,
    content_type: 'evidence',
    scenario_name: 'packet-heist',
    drop_number: 2,
    is_unlocked: true,
    download_url: 'https://example.test/recovered-network-evidence.pdf',
  };
  const libraryResource = {
    id: 'library-resource-1',
    title: 'General Reference Guide',
    file_name: 'general-reference.pdf',
    content_type: 'resource',
    drop_number: null,
    source_drop_number: null,
    is_unlocked: true,
    download_url: 'https://example.test/general-reference.pdf',
  };

  await page.addInitScript(({ learner }) => {
    localStorage.setItem('user', JSON.stringify(learner));
    localStorage.setItem('accessToken', 'playwright-access-token');
    localStorage.setItem(`pact_inducted_v1_${learner.id}`, '1');
  }, { learner: user });

  const api = 'http://localhost:5174/api/v1';
  await page.route(`${api}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${api}/auth/refresh`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ accessToken: 'refreshed-token', user }),
  }));
  await page.route(`${api}/courses/${COURSE_ID}/enrollment/me`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'routing-enrollment',
      cohort: { id: 'routing-cohort', name: 'Routing Cohort', target_revealed: false },
      squad: { id: 'routing-squad', number: 1, name: 'Routing Squad' },
    }),
  }));
  await page.route(`${api}/courses/${COURSE_ID}/assignments**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${api}/courses/${COURSE_ID}/campaign/drops**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${api}/courses/${COURSE_ID}/scenarios**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${api}/courses/${COURSE_ID}/course-content**`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([dropFile, libraryResource]),
  }));

  await page.goto('/scenarios');
  await expect(page.getByText('recovered-network-evidence.pdf')).toBeVisible();
  await expect(page.getByText('DROP 02 FILES')).toBeVisible();

  await page.goto('/course-content');
  await expect(page.getByText('General Reference Guide')).toBeVisible();
  await expect(page.getByText('Recovered Network Evidence')).toHaveCount(0);

  await page.locator('.evd-tab').click();
  await expect(page.getByText('SCENARIO DROP FILES — CASE FILE')).toBeVisible();
  await expect(page.getByText('Recovered Network Evidence')).toBeVisible();
});
