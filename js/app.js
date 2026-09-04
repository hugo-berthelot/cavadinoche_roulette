import { state, subscribe, render } from './state.js';
import { setupScreen } from './ui/setup.js';
import { scanScreen } from './ui/scan.js';
import { reviewScreen } from './ui/review.js';
import { rouletteScreen } from './ui/roulette.js';
import { gameScreen } from './ui/game.js';

const SCREENS = {
  setup: setupScreen,
  scan: scanScreen,
  review: reviewScreen,
  roulette: rouletteScreen,
  game: gameScreen,
};

const root = document.getElementById('app');

subscribe((s) => {
  root.replaceChildren(SCREENS[s.screen](s));
  window.scrollTo(0, 0);
});

// Empeche l'ecran de s'eteindre en pleine partie : le telephone passe de main
// en main, personne ne veut le rallumer a chaque manche. Non supporte partout,
// et revoque quand l'onglet passe en arriere-plan : on redemande au retour.
let wakeLock = null;
async function keepScreenAwake() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* refus ou batterie faible : sans consequence pour le jeu */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wakeLock?.released) keepScreenAwake();
});
keepScreenAwake();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
  });
}

render();
