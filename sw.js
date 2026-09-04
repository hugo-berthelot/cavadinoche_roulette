// Service worker : rend l'appli utilisable sans reseau une fois chargee.
// Le pari est simple -- on ouvre l'app une fois chez soi, elle marche ensuite
// dans un bar au wifi absent.

const VERSION = 'cavadinoche-v1';

// La coquille de l'app : petite, mise en cache des l'installation.
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/state.js', './js/ocr.js',
  './js/domain/deck.js', './js/domain/higherlower.js',
  './js/domain/roulette.js', './js/domain/menuparser.js',
  './js/ui/dom.js', './js/ui/setup.js', './js/ui/scan.js',
  './js/ui/review.js', './js/ui/roulette.js', './js/ui/game.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // addAll echoue en bloc si un seul fichier manque : on prefere une
      // installation partielle a un service worker qui ne s'installe jamais.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Cache d'abord : rien ici n'est dynamique, et les gros fichiers de l'OCR
  // ne doivent etre telecharges qu'une seule fois.
  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match('./index.html'))),
  );
});
