// Transforme les lignes brutes de l'OCR en une liste de boissons exploitable.
// Module pur : testable sous node, sans navigateur.
//
// L'OCR d'une carte de bar est bruite par nature (prix colles, points de
// conduite, en-tetes de rubrique). On nettoie ce qu'on sait nettoyer, on jette
// ce qui n'a manifestement pas la forme d'un nom de boisson, et on laisse
// l'ecran de relecture corriger le reste : ce parser n'a pas besoin d'etre
// parfait, il a besoin de ne jamais bloquer la partie.

const MAX_DRINKS = 40;
const MIN_LENGTH = 3;
const MAX_LENGTH = 40;

// Vocabulaire des titres de rubrique. Une ligne est rejetee quand TOUS ses
// mots en font partie : "CARTE DES BOISSONS" et "NOS BIERES" degagent, tandis
// que "Vin rouge" ou "Cocktail maison" sont conserves.
const HEADER_WORDS = new Set([
  'carte', 'cartes', 'menu', 'menus', 'boisson', 'boissons', 'drinks',
  'tarif', 'tarifs', 'prix', 'aperitif', 'aperitifs', 'digestif', 'digestifs',
  'cocktail', 'cocktails', 'soft', 'softs', 'biere', 'bieres', 'vin', 'vins',
  'alcool', 'alcools', 'spiritueux', 'pression', 'bouteille', 'bouteilles',
  'chaude', 'chaudes', 'fraiche', 'fraiches', 'happy', 'hour', 'suite',
  'nos', 'notre', 'la', 'le', 'les', 'des', 'du', 'de', 'a', 'au', 'aux',
  'et', 'sans', 'avec',
]);

function isHeader(line) {
  const words = normalizeKey(line).split(' ').filter(Boolean);
  return words.length > 0 && words.every((word) => HEADER_WORDS.has(word));
}

// Un prix en fin de ligne, sous les formes croisees sur les cartes francaises.
// Chaque motif exige un marqueur (symbole monetaire ou centimes) : sans cela on
// amputerait "Pastis 51" ou "1664" de leur nom.
const PRICE_PATTERNS = [
  /\s*\d{1,3}\s*€\s*\d{2}\s*$/,                          // 4€50
  /\s*(?:€|EUR|euros?)\s*\d{1,3}(?:[.,]\d{1,2})?\s*$/i, // € 6,50
  /\s*\d{1,3}(?:[.,]\d{1,2})?\s*(?:€|EUR|euros?)\s*$/i,  // 6,50 €
  /\s*\d{1,3}[.,]\d{2}\s*$/,                             // 6,50
  // Quand l'OCR ecarte le montant mais garde la devise, il reste un "EUR"
  // orphelin en fin de ligne. Une devise seule n'est jamais un nom de boisson.
  /\s*(?:€|EUR|euros?)\s*$/i,                             // "Spritz EUR"
];

function stripAccents(value) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeKey(value) {
  return stripAccents(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function cleanLine(raw) {
  let line = String(raw).normalize('NFC');
  line = line.replace(/\s*[.·…]{2,}\s*/g, ' ');   // points de conduite
  line = line.replace(/^[\s\-–—•*·|]+/, '');       // puces
  line = line.replace(/^\d{1,2}[.)]\s+/, '');      // "1) Mojito" mais pas "1664"
  line = line.replace(/\s+/g, ' ').trim();

  // Un prix peut en cacher un autre ("Pinte 5,00 €").
  let previous;
  do {
    previous = line;
    for (const pattern of PRICE_PATTERNS) line = line.replace(pattern, '');
    line = line.replace(/[\s\-–—:|]+$/, '').trim();
  } while (line !== previous);

  return dropTrailingNoise(line);
}

// L'OCR transforme volontiers les points de conduite en caracteres fantaisistes
// colles au prix : "Jus de pomme .….……….Êä3,50 EUR" laisse un "Êä" une fois le
// prix retire. On enleve donc les fragments de fin qui ne ressemblent a rien :
// tres courts, sans lettre latine de base ni chiffre. Le dernier mot restant
// est toujours conserve, pour ne jamais vider une ligne par exces de zele.
function dropTrailingNoise(line) {
  const words = line.split(' ');
  while (words.length > 1) {
    const last = words[words.length - 1];
    if (last.length <= 3 && !/[a-z0-9]/i.test(last)) words.pop();
    else break;
  }
  return words.join(' ').trim();
}

function isPlausibleDrink(line) {
  if (line.length < MIN_LENGTH || line.length > MAX_LENGTH) return false;
  if (!/\p{L}/u.test(line)) return false;              // que des chiffres/symboles
  if (isHeader(line)) return false;                    // rubrique, pas boisson
  return true;
}

export function parse(lines) {
  const seen = new Set();
  const drinks = [];

  for (const raw of lines ?? []) {
    const line = cleanLine(raw);
    if (!isPlausibleDrink(line)) continue;

    const key = normalizeKey(line);
    if (seen.has(key)) continue;
    seen.add(key);

    drinks.push(line);
    if (drinks.length >= MAX_DRINKS) break;
  }

  return drinks;
}

export function parseText(text) {
  return parse(String(text ?? '').split(/\r?\n/));
}

export const DEMO_MENU = [
  'Pinte de blonde', 'Demi de blonde', 'IPA artisanale', 'Bière ambrée',
  'Mojito', 'Spritz', 'Gin tonic', 'Rhum arrangé',
  'Verre de rouge', 'Verre de blanc', 'Coca-Cola', 'Limonade artisanale',
];
