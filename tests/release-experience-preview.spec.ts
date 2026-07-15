import { test, expect } from '@playwright/test';

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

test('instructor can open the squad and role release simulator', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const user = { id: 'instructor-1', email: 'instructor@example.test', role: 'instructor' };
  const drop = {
    id: 'drop-4', number: 4, title: 'Packet Heist — Drop 4', scenario_name: 'packet-heist',
    signal_enabled: false, vault_enabled: true, vault_hint: 'Decrypt the identifier', vault_pin: 'RESTON IT',
    puzzles: [], is_unlocked: false,
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
        drop: { id: drop.id, number: drop.number, title: drop.title, signal_enabled: false, vault_enabled: true, enabled_puzzles: [] },
        cohort: { id: 'cohort-1', name: 'PACT July 26' },
        shared: { challenges: 1, case_files: 1, packages: 0, details: squads[0].details },
        squads,
      }) });
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
  await page.getByRole('button', { name: 'Preview Release' }).click();

  await expect(page.getByText('READ-ONLY RELEASE SIMULATOR')).toBeVisible();
  await expect(page.getByText('PERSONA COVERAGE MATRIX')).toBeVisible();
  await expect(page.getByRole('button', { name: /Cyber Analyst, Squad 1: 1 challenges, 1 case files/ })).toBeVisible();
  await page.getByRole('button', { name: /Cyber Analyst, Squad 1/ }).click();
  await page.getByRole('button', { name: /Walk Through as SQUAD 1.*Cyber Analyst/ }).click();
  await expect(page.getByText('ENCRYPTED EVIDENCE VAULT')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
