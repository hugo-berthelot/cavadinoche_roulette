import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, freshDeck, shuffle, cardName, RANKS, SUITS } from '../js/domain/deck.js';

// Generateur deterministe : les tests ne doivent jamais dependre de Math.random.
function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test('le paquet contient 52 cartes distinctes', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((c) => `${c.label}-${c.suit}`)).size, 52);
});

test('13 rangs et 4 couleurs', () => {
  assert.equal(RANKS.length, 13);
  assert.equal(SUITS.length, 4);
});

test("l'As domine le Roi", () => {
  const ace = RANKS.find((r) => r.label === 'A');
  const king = RANKS.find((r) => r.label === 'R');
  assert.ok(ace.value > king.value);
});

test('le melange conserve exactement les memes cartes', () => {
  const deck = createDeck();
  const mixed = shuffle(deck, seededRng(42));
  assert.equal(mixed.length, 52);
  assert.deepEqual(
    mixed.map(cardName).sort(),
    deck.map(cardName).sort(),
  );
});

test('le melange ne modifie pas le paquet source', () => {
  const deck = createDeck();
  const before = deck.map(cardName).join(',');
  shuffle(deck, seededRng(7));
  assert.equal(deck.map(cardName).join(','), before);
});

test('a graine egale, melange identique', () => {
  const a = freshDeck(seededRng(123)).map(cardName).join(',');
  const b = freshDeck(seededRng(123)).map(cardName).join(',');
  assert.equal(a, b);
});

test('le melange rebat reellement les cartes', () => {
  const ordered = createDeck().map(cardName).join(',');
  const mixed = freshDeck(seededRng(99)).map(cardName).join(',');
  assert.notEqual(mixed, ordered);
});
