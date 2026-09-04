// Verifie la promesse du README : charger l'app une fois, puis jouer sans reseau.
// Le service worker exige une origine sure : localhost convient.
//   npm run serve &  puis  node test/e2e/offline.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL ?? 'http://localhost:8080/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15000 })
  .then(() => console.log('  ok   le service worker a pris la main'))
  .catch(async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const ok = await page.evaluate(() => navigator.serviceWorker.controller !== null);
    console.log(`${ok ? '  ok  ' : ' FAIL '} service worker actif après rechargement`);
  });

// Laisse le pre-cache se terminer, puis coupe le reseau pour de bon.
await page.waitForTimeout(1500);
await ctx.setOffline(true);
console.log('\n--- réseau coupé ---');

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
const title = await page.locator('h1').textContent();
console.log(`${title === 'Qui joue ?' ? '  ok  ' : ' FAIL '} l'app se lance hors-ligne — "${title}"`);

await page.fill('#player-0', 'Hugo');
await page.fill('#player-1', 'Camille');
await page.click('button[type="submit"]');
await page.getByText('Utiliser une carte de démo').click();
await page.getByText('Passer à la roulette').click();
await page.locator('.screen > .stack > button.primary').click();
await page.waitForSelector('.reel--done', { timeout: 20000 });
await page.getByText('Garder cette boisson').click();
await page.locator('.screen > .stack > button.primary').click();
await page.waitForSelector('.reel--done', { timeout: 20000 });
await page.getByText('Garder cette boisson').click();
await page.waitForSelector('.card');
await page.locator('.guess button').first().click();
const round = (await page.locator('.hint').last().textContent()).trim();
console.log(`${round.includes('manche 2') ? '  ok  ' : ' FAIL '} une partie complète se joue hors-ligne — ${round}`);
await page.screenshot({ path: 'screenshots/offline.png' });
await browser.close();
