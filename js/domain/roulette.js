// Tirage de la roulette. Le rng est injecte pour rendre le tirage testable.
// L'animation de defilement vit dans l'UI : ici, uniquement le resultat.

export function spin(drinks, rng = Math.random) {
  if (!Array.isArray(drinks) || drinks.length === 0) {
    throw new Error('Impossible de lancer la roulette sans boisson.');
  }
  return drinks[Math.floor(rng() * drinks.length)];
}

// Suite de noms pour l'animation : on fait defiler la liste puis on atterrit
// sur le resultat, pour que la derniere valeur affichee soit bien celle tiree.
export function reelSequence(drinks, result, steps = 28) {
  const seq = [];
  for (let i = 0; i < steps; i++) seq.push(drinks[i % drinks.length]);
  seq.push(result);
  return seq;
}
