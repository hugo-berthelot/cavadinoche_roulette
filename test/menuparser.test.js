import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, parseText, DEMO_MENU } from '../js/domain/menuparser.js';

test('retire les prix en fin de ligne, toutes formes confondues', () => {
  assert.deepEqual(
    parse(['Mojito 9,00 €', 'Pinte 6.50', 'Demi 4€50', 'Spritz € 8', 'Cidre 7 EUR']),
    ['Mojito', 'Pinte', 'Demi', 'Spritz', 'Cidre'],
  );
});

test('retire les points de conduite', () => {
  assert.deepEqual(parse(['Pinte de blonde .......... 6,50 €']), ['Pinte de blonde']);
});

test('retire les puces et numerotations de liste', () => {
  assert.deepEqual(parse(['- Mojito', '• Spritz', '1) Kir', '— Punch']), ['Mojito', 'Spritz', 'Kir', 'Punch']);
});

test('ne mutile pas les noms qui contiennent des chiffres', () => {
  // Le piege : "1664" et "51" sont des noms, pas des prix.
  assert.deepEqual(parse(['1664 Blonde 5,00 €', 'Pastis 51', 'Ricard 45']), ['1664 Blonde', 'Pastis 51', 'Ricard 45']);
});

test('jette les titres de rubrique, meme sur plusieurs mots', () => {
  assert.deepEqual(parse(['CARTE DES BOISSONS', 'NOS BIÈRES', 'Boissons chaudes', 'Mojito']), ['Mojito']);
});

test('conserve les noms qui commencent par un mot de rubrique', () => {
  assert.deepEqual(parse(['Vin rouge', 'Cocktail maison', 'Bière du moment']), ['Vin rouge', 'Cocktail maison', 'Bière du moment']);
});

test('jette les lignes sans lettre', () => {
  assert.deepEqual(parse(['12,00', '---', '***', '4 €', 'Mojito']), ['Mojito']);
});

test('jette les lignes trop courtes ou trop longues', () => {
  const tresLongue = 'Cocktail signature de la maison servi dans un verre glace avec menthe';
  assert.deepEqual(parse(['ab', tresLongue, 'Gin']), ['Gin']);
});

test('deduplique sans tenir compte de la casse ni des accents', () => {
  assert.deepEqual(
    parse(['Mojito', 'MOJITO', 'mojito', 'Rhum arrangé', 'Rhum arrange', 'RHUM ARRANGÉ']),
    ['Mojito', 'Rhum arrangé'],
  );
});

test('un mot de rubrique seul est traite comme un titre, pas comme une boisson', () => {
  // Sur une carte, une ligne "BIÈRES" ou "Vins" annonce une rubrique.
  // L'ecran de relecture permet de la rajouter a la main si besoin.
  assert.deepEqual(parse(['Bière', 'Vins', 'Mojito']), ['Mojito']);
});

test('plafonne la liste a 40 boissons', () => {
  const beaucoup = Array.from({ length: 100 }, (_, i) => `Boisson numero ${i}`);
  assert.equal(parse(beaucoup).length, 40);
});

test('ne casse pas sur une entree vide, nulle ou absente', () => {
  assert.deepEqual(parse([]), []);
  assert.deepEqual(parse(null), []);
  assert.deepEqual(parse(undefined), []);
  assert.deepEqual(parseText(''), []);
  assert.deepEqual(parseText(null), []);
});

test('parseText decoupe le texte colle en lignes', () => {
  assert.deepEqual(parseText('Mojito 8,00\r\nSpritz 9,00\n\nKir 6,00'), ['Mojito', 'Spritz', 'Kir']);
});

test('cas realiste : une carte de bar entiere', () => {
  const carte = `CARTE DES BOISSONS

BIÈRES
Pinte de blonde .......... 6,50 €
Demi ..................... 4€50
IPA artisanale ........... 7,00 €

COCKTAILS
Mojito ................... 9,00 €
Spritz ................... 8,50 €
Mojito ................... 9,00 €

L'abus d'alcool est dangereux pour la santé, à consommer avec modération`;

  assert.deepEqual(parseText(carte), [
    'Pinte de blonde', 'Demi', 'IPA artisanale', 'Mojito', 'Spritz',
  ]);
});

test('la carte de demo est utilisable telle quelle', () => {
  assert.ok(DEMO_MENU.length >= 2);
  assert.deepEqual(parse(DEMO_MENU), DEMO_MENU);
});
