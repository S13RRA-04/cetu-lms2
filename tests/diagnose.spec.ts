import { test } from '@playwright/test';

test('diagnose page load', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];
  page.on('console', m => logs.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', e => errors.push(e.message));

  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ id:'u1', email:'t@t.com', first_name:'Test', last_name:'User', role:'student' }));
    localStorage.setItem('accessToken', 'tok');
  });
  // Anchor to origin/api/v1 to avoid catching /src/api/*.js Vite source files
  await page.route('http://localhost:5174/api/v1/**', r =>
    r.fulfill({ status:200, body:'[]', contentType:'application/json' })
  );

  await page.goto('/');
  await page.waitForTimeout(3000);

  const html = await page.content();
  console.log('=HAS_SIDEBAR=', html.includes('app-sidebar'));
  console.log('=HAS_CANVAS=',  html.includes('<canvas'));
  console.log('=ROOT_HTML=',   html.slice(html.indexOf('<body'), html.indexOf('<body')+600));
  
  console.log('=LOGS=', logs.slice(0,10).join('\n'));
  console.log('=ERRORS=', errors.join('\n'));
  
  await page.screenshot({ path: 'test-results/diagnose.png' });
});
