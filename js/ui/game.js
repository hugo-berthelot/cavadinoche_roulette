import { el } from './dom.js';
import { go, update, state } from '../state.js';
import { guess, cardsLeft, HIGHER, LOWER } from '../domain/higherlower.js';

function cardNode(card) {
  return el('div', { class: `card${card.red ? ' card--red' : ''}`, 'aria-label': `${card.label} de ${card.symbol}` },
    el('div', { class: 'card__corner card__corner--tl', text: `${card.label}${card.symbol}` }),
    el('div', { style: 'text-align:center' },
      el('div', { class: 'card__rank', text: card.label }),
      el('div', { class: 'card__suit', text: card.symbol }),
    ),
    el('div', { class: 'card__corner card__corner--br', text: `${card.label}${card.symbol}` }),
  );
}

function playerCard(player, index, active) {
  return el('div', { class: `player player--p${index + 1}${active ? ' player--active' : ''}` },
    el('div', { class: 'player__name', text: player.name }),
    el('div', { class: 'player__drink', text: player.drink ?? '—' }),
    el('div', { class: 'player__sips', text: `${player.sips ?? 0} gorgée${(player.sips ?? 0) > 1 ? 's' : ''}` }),
    el('button', {
      class: 'link', text: 'Nouvelle boisson',
      onclick: () => go('roulette', {
        roulette: { player: index, fromGame: true, spinning: false, result: null },
      }),
    }),
  );
}

function verdict(result, players) {
  if (!result) {
    return el('div', { class: 'verdict' },
      el('div', { class: 'verdict__detail', text: 'Plus haute ou plus basse que celle affichée ?' }),
    );
  }
  const who = players[result.player]?.name ?? 'Le joueur';
  const title = result.correct
    ? 'Bien vu !'
    : result.tie ? 'Égalité — tu bois !' : 'Raté — tu bois !';
  const detail = `${result.previous.label}${result.previous.symbol} → ${result.drawn.label}${result.drawn.symbol}`
    + (result.correct ? '' : ` · ${who} boit une gorgée`);

  return el('div', { class: `verdict verdict--${result.correct ? 'ok' : 'wrong'}` },
    el('div', { class: 'verdict__title', text: title }),
    el('div', { class: 'verdict__detail', text: detail }),
  );
}

function guessButton(arrow, label, onclick) {
  return el('button', { class: 'subtle', onclick },
    el('span', { class: 'guess__arrow', 'aria-hidden': 'true', text: arrow }),
    el('span', { text: label }),
  );
}

export function gameScreen(s) {
  const game = s.game;
  const turn = game.turn;
  const players = s.players.map((p, i) => ({ ...p, sips: game.sips[i] }));
  const active = players[turn];

  const play = (choice) => {
    const next = guess(state.game, choice);
    update({ game: next });
  };

  return el('div', { class: 'screen' },
    el('div', { class: 'players' }, players.map((p, i) => playerCard(p, i, i === turn))),
    el('div', { class: 'grow stack' },
      cardNode(game.current),
      verdict(game.lastResult, players),
    ),
    el('p', { class: `turn${turn === 1 ? ' turn--p2' : ''}` },
      'Au tour de ', el('strong', { text: active.name }),
    ),
    el('div', { class: 'guess' },
      guessButton('▲', 'Plus haute', () => play(HIGHER)),
      guessButton('▼', 'Plus basse', () => play(LOWER)),
    ),
    el('p', { class: 'hint', text: `${cardsLeft(game)} cartes restantes · manche ${game.round + 1}` }),
  );
}
