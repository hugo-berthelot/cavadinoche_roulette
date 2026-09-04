// Lecture de la carte des boissons par OCR (Tesseract), 100 % dans le
// navigateur. La bibliotheque est vendoree dans vendor/tesseract/ plutot que
// chargee depuis un CDN : l'app doit fonctionner sur le wifi d'un bar, voire
// pas de reseau du tout une fois mise en cache.
//
// Le chargement est paresseux : ce sont plusieurs mega-octets, inutile de les
// payer pour quelqu'un qui joue avec la carte de demo.

const BASE = new URL('../vendor/tesseract/', import.meta.url).href;
const LANG = 'fra';

let libraryPromise = null;
let workerPromise = null;

function loadLibrary() {
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const script = document.createElement('script');
    script.src = `${BASE}tesseract.min.js`;
    script.onload = () => (window.Tesseract
      ? resolve(window.Tesseract)
      : reject(new Error('Tesseract chargé mais introuvable.')));
    script.onerror = () => reject(new Error("Le moteur de lecture n'a pas pu être chargé."));
    document.head.append(script);
  }).catch((error) => {
    libraryPromise = null; // laisse une nouvelle tentative possible
    throw error;
  });
  return libraryPromise;
}

function getWorker(onProgress) {
  if (workerPromise) return workerPromise;
  workerPromise = loadLibrary()
    .then((Tesseract) => Tesseract.createWorker(LANG, 1, {
      workerPath: `${BASE}worker.min.js`,
      corePath: BASE,
      langPath: BASE,
      // La preparation du moteur represente le gros de l'attente au premier
      // usage : on la remonte comme une progression 0 -> 40 %.
      logger: (m) => onProgress?.(m.status === 'recognizing text' ? m.progress : m.progress * 0.4),
    }))
    .catch((error) => {
      workerPromise = null;
      throw error;
    });
  return workerPromise;
}

/** Rend le texte brut lu sur l'image. Le decoupage en boissons revient au parser. */
export async function readMenu(file, onProgress) {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(file);
  return data.text ?? '';
}

/** Prepare le moteur en tache de fond, sans bloquer ni faire echouer l'appli. */
export function warmUp() {
  getWorker().catch(() => {});
}
