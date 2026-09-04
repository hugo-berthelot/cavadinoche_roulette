import { el } from './dom.js';
import { go, update, state } from '../state.js';
import { spin, reelSequence } from '../domain/roulette.js';
import { createGame } from '../domain/higherlower.js';

// L'animation s'ecrit directement dans le DOM plutot que de passer par l'etat
// global : faire un rendu complet 30 fois de suite pour un defilement serait
// absurde. Seul le resultat final remonte dans l'etat.

function animate(reel, value, sequence, done) {
  reel.classList.add('reel--spinning');
  let i = 0;
  const step = () => {
    value.textContent = sequence[i];
    i += 1;
    if (i < sequence.length) {
      // Ralentissement progressif : le pas s'allonge vers la fin.
      const t = i / sequence.length;
      setTimeout(step, 40 + t * t * 260);
    } else {
      reel.classList.remove('reel--spinning');
      reel.classList.add('reel--done');
      done();
    }
  };
  step();
}

export function rouletteScreen(s) {
  const { player, fromGame } = s.roulette;
  const name = s.players[player]?.name ?? `Joueur ${player + 1}`;
  const current = s.players[player]?.drink;

  const value = el('div', { class: 'reel__value', text: current ?? '?' });
  const reel = el('div', { class: `reel${current ? ' reel--done' : ''}` }, value);

  const actions = el('div', { class: 'stack' });
  const spinButton = el('button', { class: 'primary', text: current ? 'Relancer' : 'Lancer la roulette' });

  const keep = () => {
    if (fromGame) return go('game');
    if (player === 0) {
      return go('roulette', { roulette: { player: 1, fromGame: false, spinning: false, result: null } });
    }
    update({ game: state.game ?? createGame(state.players.length) });
    go('game');
  };

  const keepButton = el('button', { class: 'subtle', text: 'Garder cette boisson', onclick: keep });

  const backLink = fromGame
    ? el('button', { class: 'link', text: 'Revenir au jeu sans changer', onclick: () => go('game') })
    : null;

  const doSpin = () => {
    spinButton.disabled = true;
    keepButton.disabled = true;
    reel.classList.remove('reel--done');
    const result = spin(s.drinks);
    animate(reel, value, reelSequence(s.drinks, result), () => {
      // Quitter l'ecran pendant le defilement ne doit pas changer la boisson :
      // sinon "Revenir au jeu sans changer" ferait exactement le contraire de
      // ce qu'il annonce, une fois l'animation terminee dans le vide.
      if (state.screen !== 'roulette' || state.roulette !== s.roulette) return;
      commitLocally(result);
    });
  };

  // `s` est l'objet d'etat lui-meme : on y ecrit le resultat sans declencher de
  // rendu global, qui effacerait l'affichage obtenu par l'animation.
  const commitLocally = (result) => {
    s.players[player].drink = result;
    s.roulette.result = result;
    spinButton.disabled = false;
    spinButton.textContent = 'Relancer';
    keepButton.disabled = false;
    keepButton.focus();
  };

  spinButton.addEventListener('click', doSpin);
  actions.append(spinButton, keepButton);
  keepButton.disabled = !current;

  return el('div', { class: 'screen' },
    el('div', {},
      el('p', { class: 'eyebrow', text: fromGame ? 'Changement de boisson' : `Joueur ${player + 1} sur ${s.players.length}` }),
      el('h1', { text: `${name}, ta boisson` }),
      el('p', { text: 'Le sort décide. Tu peux relancer autant que tu veux.' }),
    ),
    el('div', { class: 'grow' }, reel),
    actions,
    backLink,
  );
}
