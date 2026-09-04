import test from 'node:test';
import assert from 'node:assert/strict';
import { spin, reelSequence } from '../js/domain/roulette.js';

const DRINKS = ['Mojito', 'Pinte', 'Spritz', 'Coca'];

test('le tirage rend toujours une boisson de la liste', () => {
  for (let i = 0; i < 500; i++) {
    assert.ok(DRINKS.includes(spin(DRINKS)));
  }
});

test('a graine egale, tirage identique', () => {
  assert.equal(spin(DRINKS, () => 0.7), spin(DRINKS, () => 0.7));
});

test('chaque boisson est atteignable', () => {
  assert.equal(spin(DRINKS, () => 0), 'Mojito');
  assert.equal(spin(DRINKS, () => 0.999999), 'Coca');
});

test('sur 2000 tirages, les quatre boissons sortent', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(spin(DRINKS));
  assert.equal(seen.size, DRINKS.length);
});

test('une liste vide est refusee plutot que de rendre undefined', () => {
  assert.throws(() => spin([]), /sans boisson/);
  assert.throws(() => spin(null), /sans boisson/);
});

test('une seule boisson : elle sort a tous les coups', () => {
  assert.equal(spin(['Eau']), 'Eau');
});

test("l'animation se termine sur la boisson tiree", () => {
  const seq = reelSequence(DRINKS, 'Spritz');
  assert.equal(seq.at(-1), 'Spritz');
  assert.ok(seq.length > DRINKS.length);
});
