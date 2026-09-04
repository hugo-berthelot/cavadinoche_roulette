// Store central. Un seul objet d'etat, un seul point de rendu.
//
// Tout ce qui doit survivre a un changement d'ecran vit ici -- c'est ce qui
// permet a un joueur de repartir a la roulette en pleine partie et de revenir
// sans perdre le paquet, les gorgees ni le tour en cours.

const listeners = new Set();

export const state = {
  screen: 'setup',        // setup | scan | review | roulette | game
  players: [],            // [{ name, drink, sips }]
  drinks: [],
  candidates: [],         // sortie de l'OCR, avant validation
  pasting: false,         // sous-ecran de saisie manuelle de la carte
  game: null,             // etat du moteur Higher/Lower
  roulette: {
    player: 0,            // quel joueur fait tourner
    fromGame: false,      // retour au jeu, ou chainage initial vers la partie
    spinning: false,
    result: null,
  },
  ocr: { busy: false, progress: 0, error: null },
};

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function render() {
  for (const listener of listeners) listener(state);
}

// Fusionne une modification puis redessine. Toutes les mutations passent par
// ici, pour qu'aucun ecran n'ait a se souvenir de rafraichir l'affichage.
export function update(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  render();
}

export function go(screen, patch = {}) {
  update({ screen, ...patch });
}
