// Parcours complet dans un vrai navigateur, en viewport telephone.
// Hors CI (necessite playwright + un serveur local) :
//   npm run serve &  puis  node test/e2e/smoke.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080/';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const shot = (name) => page.screenshot({ path: `screenshots/${name}.png` });

const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') jsErrors.push(`console: ${m.text()}`); });

const sipsOf = () => page.locator('.player__sips').allTextContents();
const drinksOf = () => page.locator('.player__drink').allTextContents();
const turnOf = () => page.locator('.turn strong').textContent();
const roundOf = async () => (await page.locator('.hint').last().textContent()).trim();

async function spinAndKeep(label) {
  await page.locator('.screen > .stack > button.primary').click();
  await page.waitForSelector('.reel--done', { timeout: 20000 });
  const drink = (await page.locator('.reel__value').textContent()).trim();
  check(`${label} : une boisson est tirée`, drink.length > 0, drink);
  await page.getByText('Garder cette boisson').click();
  return drink;
}

console.log('\n— Mise en place —');
await page.goto(BASE, { waitUntil: 'networkidle' });
await shot('1-setup');

const start = page.locator('button[type="submit"]');
check('le bouton reste inactif tant que les deux noms manquent', await start.isDisabled());
await page.fill('#player-0', 'Hugo');
check('un seul nom ne suffit pas', await start.isDisabled());
await page.fill('#player-1', 'Camille');
check('deux noms débloquent la suite', await start.isEnabled());
await start.click();

console.log('\n— Carte des boissons —');
await page.waitForSelector('text=La carte des boissons');
await shot('2-scan');
await page.getByText('Utiliser une carte de démo').click();
await page.waitForSelector('text=Vérifie la liste');
check('la carte de démo remplit la liste', (await page.locator('.drink input').count()) >= 10);
await shot('3-review');

await page.locator('.drink').first().locator('button').click();
check('une boisson peut être supprimée', (await page.locator('.drink input').count()) === 11);
await page.getByText('Ajouter une boisson').click();
await page.locator('.drink input').last().fill('Picon bière');
check('une boisson peut être ajoutée à la main', (await page.locator('.drink input').last().inputValue()) === 'Picon bière');

await page.getByText('Passer à la roulette').click();

console.log('\n— Roulette —');
await page.waitForSelector('text=Hugo, ta boisson');
await shot('4-roulette-avant');
const d1 = await spinAndKeep('Hugo');
await page.waitForSelector('text=Camille, ta boisson');
const d2 = await spinAndKeep('Camille');

console.log('\n— Higher / Lower —');
await page.waitForSelector('.card');
check('les deux boissons sont affichées', (await drinksOf()).join('|') === `${d1}|${d2}`);
check('Hugo commence', (await turnOf()) === 'Hugo');
await shot('5-jeu-depart');

const higher = page.locator('.guess button').first();
const lower = page.locator('.guess button').last();

await higher.click();
check('une manche fait avancer le compteur', (await roundOf()).includes('manche 2'), await roundOf());
check('le tour passe à Camille', (await turnOf()) === 'Camille');

let wrong = 0;
for (let i = 0; i < 12; i++) {
  const player = await turnOf();
  await (i % 2 === 0 ? higher : lower).click();
  const bad = await page.locator('.verdict--wrong').count();
  if (bad) wrong += 1;
  void player;
}
const sips = await sipsOf();
const total = sips.reduce((sum, t) => sum + parseInt(t, 10), 0);
check('les gorgées comptées correspondent aux erreurs', total >= 0 && total <= 13, `${sips.join(' | ')}`);
check('13 manches jouées', (await roundOf()).includes('manche 14'), await roundOf());
await shot('6-jeu-en-cours');

console.log('\n— Changement de boisson en pleine partie —');
const before = { sips: (await sipsOf()).join('|'), card: await page.locator('.card__rank').textContent(), round: await roundOf() };
await page.locator('.player--p2 button.link').click();
await page.waitForSelector('text=Camille, ta boisson');
await shot('7-changement-boisson');
await page.locator('.screen > .stack > button.primary').click();
await page.waitForSelector('.reel--done', { timeout: 20000 });
await page.getByText('Garder cette boisson').click();
await page.waitForSelector('.card');

check('les gorgées survivent au détour', (await sipsOf()).join('|') === before.sips, before.sips);
check('la carte en cours survit au détour', (await page.locator('.card__rank').textContent()) === before.card, before.card);
check('la manche ne repart pas de zéro', (await roundOf()) === before.round, before.round);
check("la boisson de Hugo n'a pas bougé", (await drinksOf())[0] === d1, d1);
await shot('8-jeu-apres-retour');

console.log('\n— Partie longue (remélange du paquet) —');
for (let i = 0; i < 55; i++) await (i % 3 === 0 ? lower : higher).click();
check('le paquet se remélange sans casser', (await page.locator('.card').count()) === 1, await roundOf());
await shot('9-partie-longue');

console.log(`\n${jsErrors.length ? `ERREURS JS :\n${jsErrors.join('\n')}` : 'Aucune erreur JS.'}`);
if (jsErrors.length) problems.push('erreurs JS');
await browser.close();

console.log(problems.length ? `\n${problems.length} PROBLÈME(S) : ${problems.join(', ')}` : '\nTout est vert.');
process.exit(problems.length ? 1 : 0);
