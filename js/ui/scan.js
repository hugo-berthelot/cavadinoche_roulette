import { el } from './dom.js';
import { go, update, state } from '../state.js';
import { parseText, DEMO_MENU } from '../domain/menuparser.js';
import { readMenu } from '../ocr.js';

function toReview(drinks) {
  update({ candidates: drinks, pasting: false, ocr: { busy: false, progress: 0, error: null } });
  go('review');
}

async function runOcr(file) {
  update({ ocr: { busy: true, progress: 0, error: null } });
  try {
    const text = await readMenu(file, (progress) => {
      update({ ocr: { ...state.ocr, progress: Math.max(0, Math.min(1, progress || 0)) } });
    });
    const drinks = parseText(text);
    if (drinks.length === 0) {
      // On bascule quand meme sur la relecture : mieux vaut une liste vide a
      // completer a la main qu'un cul-de-sac.
      update({ ocr: { busy: false, progress: 0, error: "Rien de lisible sur la photo. Ajoute les boissons à la main." } });
      toReview([]);
      return;
    }
    toReview(drinks);
  } catch (error) {
    update({ ocr: { busy: false, progress: 0, error: error.message || 'La lecture a échoué.' } });
  }
}

function pasteScreen() {
  const area = el('textarea', {
    placeholder: 'Colle ou tape la carte, une boisson par ligne…\n\nMojito 9,00 €\nPinte de blonde 6,50 €',
  });
  return el('div', { class: 'screen' },
    el('div', {},
      el('p', { class: 'eyebrow', text: 'Étape 2 sur 3' }),
      el('h1', { text: 'La carte' }),
      el('p', { text: 'Les prix et les titres de rubrique seront retirés automatiquement.' }),
    ),
    el('div', { class: 'grow' }, area),
    el('button', {
      class: 'primary',
      text: 'Continuer',
      onclick: () => toReview(parseText(area.value)),
    }),
    el('button', { class: 'link', text: 'Retour', onclick: () => update({ pasting: false }) }),
  );
}

export function scanScreen(s) {
  if (s.pasting) return pasteScreen();

  const photoInput = el('input', {
    type: 'file', accept: 'image/*', capture: 'environment',
    class: 'sr-only',
    onchange: (e) => { const file = e.target.files?.[0]; if (file) runOcr(file); },
  });

  if (s.ocr.busy) {
    const percent = Math.round(s.ocr.progress * 100);
    return el('div', { class: 'screen' },
      el('div', {},
        el('p', { class: 'eyebrow', text: 'Étape 2 sur 3' }),
        el('h1', { text: 'Lecture de la carte…' }),
      ),
      el('div', { class: 'grow stack' },
        el('div', { class: 'progress' }, el('div', { style: `width:${percent}%` })),
        el('p', { class: 'hint', text: `${percent} %` }),
        el('p', { class: 'hint', text: 'Le premier scan est le plus long : le moteur de lecture se met en place.' }),
      ),
    );
  }

  return el('div', { class: 'screen' },
    el('div', {},
      el('p', { class: 'eyebrow', text: 'Étape 2 sur 3' }),
      el('h1', { text: 'La carte des boissons' }),
      el('p', { text: 'Photographie la carte du bar. Tu pourras corriger la liste juste après.' }),
    ),
    el('div', { class: 'grow stack' },
      s.ocr.error && el('div', { class: 'error', text: s.ocr.error }),
      photoInput,
      el('button', { class: 'primary', text: '📷  Photographier la carte', onclick: () => photoInput.click() }),
      el('button', { class: 'subtle', text: '⌨️  Écrire la carte à la main', onclick: () => update({ pasting: true }) }),
      el('button', {
        class: 'ghost',
        text: '🎲  Utiliser une carte de démo',
        onclick: () => toReview(DEMO_MENU.slice()),
      }),
    ),
    el('button', { class: 'link', text: 'Changer les joueurs', onclick: () => go('setup') }),
  );
}
