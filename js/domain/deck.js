// Jeu de 52 cartes. Aucune reference au DOM : ce module tourne aussi sous node.

export const SUITS = [
  { id: 'spades', symbol: '♠', label: 'Pique', red: false },
  { id: 'hearts', symbol: '♥', label: 'Coeur', red: true },
  { id: 'diamonds', symbol: '♦', label: 'Carreau', red: true },
  { id: 'clubs', symbol: '♣', label: 'Trefle', red: false },
];

// As haut : sa valeur (14) domine le Roi (13).
export const RANKS = [
  { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' },
  { value: 5, label: '5' }, { value: 6, label: '6' }, { value: 7, label: '7' },
  { value: 8, label: '8' }, { value: 9, label: '9' }, { value: 10, label: '10' },
  { value: 11, label: 'V' }, { value: 12, label: 'D' }, { value: 13, label: 'R' },
  { value: 14, label: 'A' },
];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ value: rank.value, label: rank.label, suit: suit.id, symbol: suit.symbol, red: suit.red });
    }
  }
  return deck;
}

// Fisher-Yates. Le rng est injecte pour rendre le melange deterministe en test.
export function shuffle(cards, rng = Math.random) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function freshDeck(rng = Math.random) {
  return shuffle(createDeck(), rng);
}

export function cardName(card) {
  return `${card.label}${card.symbol}`;
}
