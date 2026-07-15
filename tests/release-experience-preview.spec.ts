import { test, expect } from '@playwright/test';

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

test('instructor can open the squad and role release simulator', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const user = { id: 'instructor-1', email: 'instructor@example.test', role: 'instructor' };
  const drop = {
    id: 'drop-4', number: 4, title: 'Packet Heist — Drop 4', scenario_name: 'packet-heist',
    signal_enabled: false, vault_enabled: false,
    puzzles: [{
      id: 'puzzle-1', drop_id: 'drop-4', puzzle_type: 'cipher_wheel', enabled: true, order_index: 0,
      prompt: 'Decrypt the intercepted identifier.', answer: 'RESTON IT',
      config: { method: 'rot13', cipherText: 'ERFGBA VG' },
    }],
    is_unlocked: false,
  };
  const squads = [
    {
      squad_id: 'squad-1', squad_number: 1, victim_code: 'CYBERDYNE', challenges: 1, case_files: 1, packages: 0, total_files: 1,
      details: {
        challenges: [{ id: 'challenge-1', title: 'Cyber Analyst Tasking', role_filters: ['cyber_analyst'], victim_name: null }],
        case_files: [{ id: 'case-1', title: 'VPN Device Export', file_name: 'vpn.pdf' }],
        packages: [],
      },
    },
  ];

  await page.addInitScript((staff) => {
    localStorage.setItem('user', JSON.stringify(staff));
    localStorage.setItem('accessToken', 'playwright-access-token');
  }, user);

  const api = 'http://localhost:5174/api/v1';
  await page.route(`${api}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes(`/courses/${COURSE_ID}/campaign/drops/drop-4/release-preview`)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        drop: { id: drop.id, number: drop.number, title: drop.title, signal_enabled: false, vault_enabled: false, enabled_puzzles: [{ id: 'puzzle-1', puzzle_type: 'cipher_wheel', order_index: 0 }] },
        cohort: { id: 'cohort-1', name: 'PACT July 26' },
        shared: { challenges: 1, case_files: 1, packages: 0, details: squads[0].details },
        squads,
      }) });
    }
    if (url.includes(`/courses/${COURSE_ID}/campaign/drops/drop-4/puzzles`)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(drop.puzzles) });
    }
    if (url.includes(`/courses/${COURSE_ID}/campaign/drops`)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([drop]) });
    }
    if (url.includes(`/courses/${COURSE_ID}/cohorts`)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'cohort-1', name: 'PACT July 26' }]) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Content Gating' }).click();
  await page.getByRole('button', { name: 'Release Drops' }).click();
  await page.getByRole('button', { name: 'Manage' }).click();
  await page.getByRole('button', { name: 'Games' }).click();
  await page.waitForTimeout(250);
  expect(pageErrors).toEqual([]);
  await expect(page.locator('.route-error-details pre')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Game Layer' }).click();
  const gameSelector = page.getByLabel('Game type');
  await expect(gameSelector.locator('option')).toHaveCount(11);
  await expect(gameSelector.locator('option')).toHaveText([
    'Signal Hunt', 'Vault Lock',
    'Cipher Wheel — Caesar', 'Cipher Wheel — ROT13', 'Cipher Wheel — Atbash',
    'Log Grep — Authentication', 'Log Grep — Firewall', 'Log Grep — VPN',
    'Hash Match — MD5', 'Hash Match — SHA-1', 'Hash Match — SHA-256',
  ]);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByTitle('Close').click();
  await page.getByRole('button', { name: 'Preview Release' }).click();

  await expect(page.getByText('READ-ONLY RELEASE SIMULATOR')).toBeVisible();
  await expect(page.getByText('PERSONA COVERAGE MATRIX')).toBeVisible();
  await expect(page.getByRole('button', { name: /Cyber Analyst, Squad 1: 1 challenges, 1 case files/ })).toBeVisible();
  await page.getByRole('button', { name: /Cyber Analyst, Squad 1/ }).click();
  await page.getByRole('button', { name: /Walk Through as SQUAD 1.*Cyber Analyst/ }).click();
  await expect(page.getByRole('heading', { name: 'CIPHER WHEEL' })).toBeVisible();
  await expect(page.getByText('ERFGBA VG')).toBeVisible();
  await expect(page.getByText('RESTON IT')).toHaveCount(0);
  await expect(page.getByText('WORKBENCH OUTPUT')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
