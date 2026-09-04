import { el } from './dom.js';
import { go, update } from '../state.js';

// Cet ecran garde sa liste en local et ne redessine pas l'application a chaque
// frappe : un rendu global remettrait le curseur au debut du champ en cours
// d'edition. L'etat partage n'est mis a jour qu'a la validation.

export function reviewScreen(s) {
  const drinks = s.candidates.length > 0 ? s.candidates.slice() : [''];

  const list = el('div', { class: 'drinks' });
  const count = el('p', { class: 'count' });
  const next = el('button', { class: 'primary', text: 'Passer à la roulette' });

  const values = () => [...list.querySelectorAll('input')].map((i) => i.value.trim()).filter(Boolean);

  const refresh = () => {
    const n = values().length;
    count.textContent = n === 0
      ? 'Ajoute au moins 2 boissons.'
      : `${n} boisson${n > 1 ? 's' : ''} dans la roulette${n < 2 ? ' — il en faut 2 minimum' : ''}`;
    next.disabled = n < 2;
  };

  const addRow = (value = '', focus = false) => {
    const input = el('input', {
      type: 'text', value, placeholder: 'Nom de la boisson',
      maxLength: 40, autocomplete: 'off', oninput: refresh,
    });
    const row = el('div', { class: 'drink' },
      input,
      el('button', {
        type: 'button', text: '✕', 'aria-label': `Supprimer ${value || 'cette boisson'}`,
        onclick: () => { row.remove(); refresh(); },
      }),
    );
    list.append(row);
    if (focus) input.focus();
    refresh();
  };

  for (const drink of drinks) addRow(drink);

  next.addEventListener('click', () => {
    update({ drinks: values() });
    go('roulette', { roulette: { player: 0, fromGame: false, spinning: false, result: null } });
  });

  return el('div', { class: 'screen' },
    el('div', {},
      el('p', { class: 'eyebrow', text: 'Étape 3 sur 3' }),
      el('h1', { text: 'Vérifie la liste' }),
      el('p', { text: 'Corrige ce que la lecture a raté, supprime ce qui ne se boit pas.' }),
    ),
    el('div', { class: 'grow', style: 'justify-content:flex-start;overflow-y:auto' },
      list,
      el('button', { class: 'ghost', type: 'button', text: '+  Ajouter une boisson', onclick: () => addRow('', true) }),
    ),
    count,
    next,
    el('button', { class: 'link', text: 'Reprendre la carte', onclick: () => go('scan') }),
  );
}
