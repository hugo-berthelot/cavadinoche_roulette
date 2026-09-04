import { el } from './dom.js';
import { go, update } from '../state.js';

export function setupScreen(state) {
  const names = [state.players[0]?.name ?? '', state.players[1]?.name ?? ''];

  const start = el('button', {
    class: 'primary', disabled: true, type: 'submit',
    text: 'Choisir les boissons',
  });

  const refresh = () => {
    start.disabled = !(names[0].trim() && names[1].trim());
  };

  const field = (index, label, placeholder) => el('div', { class: `field field--p${index + 1}` },
    el('label', { for: `player-${index}`, text: label }),
    el('input', {
      type: 'text', id: `player-${index}`, value: names[index],
      placeholder, autocomplete: 'off', maxLength: 20,
      oninput: (e) => { names[index] = e.target.value; refresh(); },
    }),
  );

  const form = el('form', {
    class: 'screen',
    onsubmit: (e) => {
      e.preventDefault();
      update({
        players: names.map((name) => ({ name: name.trim(), drink: null, sips: 0 })),
      });
      go('scan');
    },
  },
    el('div', {},
      el('p', { class: 'eyebrow', text: 'Cavadinoche' }),
      el('h1', { text: 'Qui joue ?' }),
      el('p', { text: 'Deux joueurs, un seul téléphone. Vous vous le passerez à chaque manche.' }),
    ),
    el('div', { class: 'grow' },
      field(0, 'Joueur 1', 'Ton prénom'),
      field(1, 'Joueur 2', 'Son prénom'),
    ),
    start,
  );

  refresh();
  return form;
}
