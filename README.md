# Cavadinoche

Un jeu à boire pour deux, sur un seul téléphone : la roulette décide de ce que
chacun boit, les cartes décident de qui boit.

Application web installable — rien à télécharger sur un store, un lien suffit.

## Le jeu

1. Les deux joueurs saisissent leur prénom.
2. Vous photographiez la carte des boissons du bar. L'application la lit et en
   sort une liste, que vous corrigez si besoin.
3. Chacun lance la roulette : le sort attribue sa boisson.
4. **Higher / Lower** : une carte est retournée, le joueur dont c'est le tour
   annonce si la suivante sera plus haute ou plus basse.

### Règles

| | |
|---|---|
| Bonne réponse | rien |
| Mauvaise réponse | 1 gorgée |
| Égalité | compte comme une mauvaise réponse — vous buvez |
| As | carte la plus forte |
| Tour | alterne à chaque manche, quel que soit le résultat |
| Paquet épuisé | un nouveau paquet est mélangé automatiquement |

À tout moment, chaque joueur peut relancer la roulette pour changer de boisson
depuis sa carte en haut de l'écran. La partie en cours n'est pas perdue :
gorgées, carte et tour restent en place.

## Jouer

Ouvrez l'adresse du site, puis **Ajouter à l'écran d'accueil** pour l'avoir en
plein écran avec son icône, comme une application.

Chargez-la une fois chez vous avant de sortir : elle met tout en cache et
fonctionne ensuite sans réseau, ce qui vaut mieux que de compter sur le wifi
d'un bar. Le premier scan télécharge le moteur de lecture (~4,8 Mo, une seule
fois).

Pas de carte sous la main pour essayer ? L'écran de la carte propose une
**carte de démo**.

## Ce qu'il y a sous le capot

HTML, CSS et JavaScript en modules natifs. Pas de framework, pas d'étape de
build : le déploiement est une copie de fichiers, et `index.html` s'ouvre
directement.

```
js/domain/      logique de jeu pure — aucune référence au DOM
js/ui/          un module par écran
js/ocr.js       lecture de la carte (Tesseract, hors-ligne)
js/state.js     store unique + rendu
vendor/         Tesseract embarqué
test/           tests unitaires + parcours navigateur
```

`js/domain/` ne touche ni au DOM ni au navigateur et reçoit son générateur
aléatoire en paramètre. C'est ce qui rend la logique testable sans navigateur
et reproductible à graine fixe — et réutilisable telle quelle si le jeu devait
un jour devenir une application native.

### La lecture de la carte

Une photo de carte prise de biais dans un bar sombre se lit mal. Deux mesures
font l'essentiel du travail :

- **Préparation de l'image** — mise à l'échelle, niveaux de gris, étirement de
  contraste sur les centiles extrêmes.
- **Filtrage par confiance** — les points de conduite entre le nom et le prix
  sont lus comme des mots fantômes ; Tesseract les note lui-même entre 0 et 40,
  quand un vrai nom de boisson est entre 84 et 96. On se fie à cette mesure
  plutôt qu'à des heuristiques sur les chaînes.

Et surtout : l'écran de relecture reste éditable. Si la lecture échoue, la
partie démarre quand même.

## Mise en ligne

Le workflow `.github/workflows/pages.yml` publie le dépôt tel quel sur GitHub
Pages à chaque poussée sur `main` — il n'y a rien à construire.

**Une seule action manuelle, la première fois :** activer Pages dans
*Settings → Pages → Source : GitHub Actions*. Le jeton du workflow peut
déployer sur un site Pages existant, mais pas en créer un : cela demande des
droits d'administration qu'il n'a pas.

## Développement

```bash
npm test          # logique de jeu, sans dépendance (node --test)
npm run serve     # sert le site sur http://localhost:8080
npm run test:e2e     # parcours complet dans un vrai navigateur (npm i d'abord)
npm run test:offline # vérifie qu'une partie se joue réseau coupé
```

Les parcours navigateur écrivent leurs captures dans `screenshots/`.

## Sécurité

L'application est entièrement locale : **aucune donnée ne quitte l'appareil**.

- Zéro requête réseau vers un tiers, à l'exécution comme au chargement. Vérifié
  en bloquant toute sortie hors de l'origine du site : l'OCR lit quand même les
  11 boissons d'une carte photographiée. La photo n'est jamais transmise.
- Zéro backend, zéro compte, zéro traceur. Rien n'est conservé entre deux
  sessions : ni `localStorage`, ni cookie, ni base locale.
- Le DOM est construit par nœuds, jamais par concaténation de HTML. Aucun
  `innerHTML`, `eval` ni `new Function` dans le code de l'application — ce qui
  compte, puisque les noms de boissons viennent de l'OCR et de la saisie libre.
- Tesseract est embarqué depuis npm, **identique bit pour bit** aux paquets
  publiés (`tesseract.js` 7.0.0, `tesseract.js-core` 7.0.0,
  `@tesseract.js-data/fra` 1.0.0). Le service worker ne met en cache que des
  ressources de la même origine.
- Les workflows appliquent le moindre privilège : lecture seule pour les tests,
  et pour la publication uniquement ce que GitHub Pages exige.
