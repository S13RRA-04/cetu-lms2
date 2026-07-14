import { test, expect } from '@playwright/test';

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const USER_ID = 'vault-paste-user';
const DROP_ID = 'drop-cipher-paste';
const ANSWER = 'CORRECT HORSE BATTERY STAPLE!';

test('learner pastes a cipher answer with Ctrl+V and completes the drop launch flow', async ({ page, context }) => {
  const user = {
    id: USER_ID,
    email: 'vault-paste@example.test',
    first_name: 'Vault',
    last_name: 'Tester',
    role: 'student',
    professional_role: 'special_agent',
  };
  const drop = {
    id: DROP_ID,
    number: 2,
    title: 'Cipher Paste Exercise',
    is_unlocked: true,
    vault_enabled: true,
    vault_hint: 'Recover and submit the complete passphrase.',
    narrative_intro: 'The encrypted drop is ready for learner review.',
    updatedAt: '2026-07-14T18:30:00.000Z',
  };

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://localhost:5174',
  });

  await page.addInitScript(({ learner }) => {
    localStorage.setItem('user', JSON.stringify(learner));
    localStorage.setItem('accessToken', 'playwright-access-token');
    localStorage.setItem(`pact_inducted_v1_${learner.id}`, '1');
  }, { learner: user });

  const api = 'http://localhost:5174/api/v1';
  await page.route(`${api}/**`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route(`${api}/auth/refresh`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ accessToken: 'refreshed-playwright-token', user }),
  }));
  await page.route(`${api}/courses/${COURSE_ID}/enrollment/me`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'vault-enrollment',
      cohort: { id: 'vault-cohort', name: 'Vault Test Cohort', target_revealed: false },
      squad: { id: 'vault-squad', number: 1, name: 'Vault Squad' },
    }),
  }));
  await page.route(`${api}/courses/${COURSE_ID}/assignments**`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route(`${api}/courses/${COURSE_ID}/campaign/drops**`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([drop]),
  }));
  await page.route(`${api}/courses/${COURSE_ID}/scenarios**`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));

  let submittedPin: string | undefined;
  await page.route(`${api}/courses/${COURSE_ID}/campaign/drops/${DROP_ID}/verify-pin`, async (route) => {
    submittedPin = route.request().postDataJSON().pin;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: submittedPin === ANSWER }),
    });
  });

  await page.goto('/');

  const input = page.getByLabel('Vault access code');
  await expect(input).toBeVisible({ timeout: 8_000 });
  await page.evaluate((answer) => navigator.clipboard.writeText(answer), ANSWER);
  await input.focus();
  await page.keyboard.press('Control+V');

  await expect(input).toHaveValue(ANSWER);
  await expect(page.getByText('Paste supported: Ctrl/Cmd+V or mobile Paste')).toBeVisible();

  await page.keyboard.press('Enter');
  await expect.poll(() => submittedPin).toBe(ANSWER);
  await expect(page.getByText(/VAULT UNLOCKED/)).toBeVisible();

  const acknowledge = page.getByRole('button', { name: /ACKNOWLEDGE TRANSMISSION/ });
  await expect(acknowledge).toBeVisible({ timeout: 9_000 });
  await acknowledge.click();

  await expect(page.locator('.ops-left-rail')).toBeVisible({ timeout: 8_000 });
  await expect.poll(() => page.evaluate(
    ({ userId, dropId }) => localStorage.getItem(`pact_vault_v1_${userId}_${dropId}`),
    { userId: USER_ID, dropId: DROP_ID },
  )).toBe('1');
});
