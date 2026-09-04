// Moteur Higher/Lower. Pur : prend un etat, rend un nouvel etat. Aucun DOM.
//
// Regles retenues :
//  - le joueur actif annonce si la carte suivante sera plus haute ou plus basse
//  - se tromper coute 1 gorgee
//  - EGALITE = FAUX (le joueur boit)
//  - le tour alterne a chaque manche, quel que soit le resultat
//  - paquet epuise -> nouveau paquet melange automatiquement

import { freshDeck } from './deck.js';

export const HIGHER = 'higher';
export const LOWER = 'lower';

function draw(deck, rng) {
  // Paquet vide : on en remet un neuf plutot que d'interrompre la partie.
  const source = deck.length > 0 ? deck : freshDeck(rng);
  const reshuffled = deck.length === 0;
  return { card: source[0], rest: source.slice(1), reshuffled };
}

export function createGame(playerCount = 2, rng = Math.random) {
  const { card, rest } = draw(freshDeck(rng), rng);
  return {
    deck: rest,
    current: card,
    turn: 0,
    playerCount,
    sips: Array(playerCount).fill(0),
    lastResult: null,
    round: 0,
    reshuffles: 0,
  };
}

export function guess(game, choice, rng = Math.random) {
  if (choice !== HIGHER && choice !== LOWER) {
    throw new Error(`Choix invalide : ${choice}`);
  }
  const { card, rest, reshuffled } = draw(game.deck, rng);
  const tie = card.value === game.current.value;
  const correct = choice === HIGHER ? card.value > game.current.value : card.value < game.current.value;

  const sips = game.sips.slice();
  if (!correct) sips[game.turn] += 1;

  return {
    ...game,
    deck: rest,
    current: card,
    sips,
    turn: (game.turn + 1) % game.playerCount,
    round: game.round + 1,
    reshuffles: game.reshuffles + (reshuffled ? 1 : 0),
    lastResult: { choice, previous: game.current, drawn: card, correct, tie, player: game.turn },
  };
}

export function cardsLeft(game) {
  return game.deck.length;
}
