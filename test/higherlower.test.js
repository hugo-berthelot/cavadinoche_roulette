import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, guess, cardsLeft, HIGHER, LOWER } from '../js/domain/higherlower.js';

const card = (value, suit = 'spades') => ({ value, label: String(value), suit, symbol: '♠', red: false });

// Etat force : on choisit les cartes pour verifier une regle precise,
// plutot que de dependre d'un melange.
function gameWith(current, deck, overrides = {}) {
  return {
    deck, current, turn: 0, playerCount: 2, sips: [0, 0],
    lastResult: null, round: 0, reshuffles: 0, ...overrides,
  };
}

test('la partie demarre avec une carte retournee et 51 restantes', () => {
  const game = createGame(2, () => 0.5);
  assert.ok(game.current);
  assert.equal(cardsLeft(game), 51);
  assert.deepEqual(game.sips, [0, 0]);
  assert.equal(game.turn, 0);
});

test('annoncer plus haut et tomber plus haut : aucune gorgee', () => {
  const next = guess(gameWith(card(7), [card(10)]), HIGHER);
  assert.equal(next.lastResult.correct, true);
  assert.deepEqual(next.sips, [0, 0]);
});

test('annoncer plus bas et tomber plus haut : une gorgee', () => {
  const next = guess(gameWith(card(7), [card(10)]), LOWER);
  assert.equal(next.lastResult.correct, false);
  assert.deepEqual(next.sips, [1, 0]);
});

test('annoncer plus bas et tomber plus bas : aucune gorgee', () => {
  const next = guess(gameWith(card(9), [card(3)]), LOWER);
  assert.equal(next.lastResult.correct, true);
  assert.deepEqual(next.sips, [0, 0]);
});

test('EGALITE = FAUX, le joueur boit (annonce haute)', () => {
  const next = guess(gameWith(card(8), [card(8, 'hearts')]), HIGHER);
  assert.equal(next.lastResult.tie, true);
  assert.equal(next.lastResult.correct, false);
  assert.deepEqual(next.sips, [1, 0]);
});

test('EGALITE = FAUX, le joueur boit (annonce basse)', () => {
  const next = guess(gameWith(card(8), [card(8, 'hearts')]), LOWER);
  assert.equal(next.lastResult.correct, false);
  assert.deepEqual(next.sips, [1, 0]);
});

test("l'As ne peut jamais etre depasse vers le haut", () => {
  const next = guess(gameWith(card(14), [card(13)]), HIGHER);
  assert.equal(next.lastResult.correct, false);
});

test('la gorgee tombe sur le joueur qui a joue, pas sur le suivant', () => {
  const next = guess(gameWith(card(5), [card(2)], { turn: 1 }), HIGHER);
  assert.deepEqual(next.sips, [0, 1]);
  assert.equal(next.lastResult.player, 1);
});

test('le tour alterne apres une bonne reponse comme apres une mauvaise', () => {
  const won = guess(gameWith(card(5), [card(9)]), HIGHER);
  assert.equal(won.turn, 1);
  const lost = guess(gameWith(card(5), [card(2)]), HIGHER);
  assert.equal(lost.turn, 1);
  assert.equal(guess(lost, HIGHER).turn, 0);
});

test('la carte tiree devient la carte courante', () => {
  const next = guess(gameWith(card(4), [card(11), card(2)]), HIGHER);
  assert.equal(next.current.value, 11);
  assert.equal(next.lastResult.previous.value, 4);
  assert.equal(cardsLeft(next), 1);
});

test('paquet epuise : un nouveau paquet melange prend le relais', () => {
  const next = guess(gameWith(card(6), []), HIGHER, () => 0.5);
  assert.ok(next.current);
  assert.equal(next.reshuffles, 1);
  assert.equal(cardsLeft(next), 51);
});

test('une partie longue reste coherente et remelange le paquet', () => {
  let game = createGame(2, Math.random);
  let wrongGuesses = 0;
  const wrongPerPlayer = [0, 0];

  for (let i = 0; i < 120; i++) {
    const player = game.turn;
    game = guess(game, i % 2 === 0 ? HIGHER : LOWER);
    if (!game.lastResult.correct) {
      wrongGuesses += 1;
      wrongPerPlayer[player] += 1;
    }
  }

  assert.equal(game.round, 120);
  assert.ok(game.reshuffles >= 1, 'le paquet doit avoir ete remelange au moins une fois');
  // Les gorgees comptees par le moteur doivent correspondre aux erreurs observees.
  assert.deepEqual(game.sips, wrongPerPlayer);
  assert.equal(game.sips[0] + game.sips[1], wrongGuesses);
});

test("l'etat precedent n'est jamais mute", () => {
  const before = gameWith(card(5), [card(2)]);
  const snapshot = JSON.stringify(before);
  guess(before, HIGHER);
  assert.equal(JSON.stringify(before), snapshot);
});

test('un choix invalide est refuse', () => {
  assert.throws(() => guess(gameWith(card(5), [card(2)]), 'peut-etre'), /Choix invalide/);
});
