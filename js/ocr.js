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

// Tesseract lit beaucoup mieux une image nette, grise et a la bonne echelle
// qu'une photo de telephone brute. Sur une carte prise de biais dans la
// pénombre, cette preparation fait la difference entre une liste exploitable et
// une bouillie de caracteres -- c'est le poste ou l'effort rapporte le plus.
const TARGET_LONG_SIDE = 2000;

async function preprocess(file) {
  const bitmap = await createImageBitmap(file);
  // Ni trop petit (l'OCR perd les details), ni trop grand (une photo de 12 Mpx
  // ferait ramer le telephone pour rien).
  const scale = TARGET_LONG_SIDE / Math.max(bitmap.width, bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;

  // Passage en niveaux de gris, en conservant l'histogramme au passage.
  const histogram = new Uint32Array(256);
  for (let i = 0; i < pixels.length; i += 4) {
    const grey = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114) | 0;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = grey;
    histogram[grey] += 1;
  }

  // Etirement de contraste sur les centiles extremes : une photo sombre ou
  // sur-exposee retrouve du noir franc et du blanc franc sans ecraser le texte.
  const total = width * height;
  const cut = total * 0.02;
  let low = 0; let high = 255; let seen = 0;
  for (let v = 0; v < 256; v++) { seen += histogram[v]; if (seen > cut) { low = v; break; } }
  seen = 0;
  for (let v = 255; v >= 0; v--) { seen += histogram[v]; if (seen > cut) { high = v; break; } }
  const span = Math.max(1, high - low);

  for (let i = 0; i < pixels.length; i += 4) {
    const stretched = Math.max(0, Math.min(255, ((pixels[i] - low) * 255) / span)) | 0;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = stretched;
  }
  ctx.putImageData(image, 0, 0);

  return canvas;
}

// Sur une carte, les points de conduite entre le nom et le prix sont lus comme
// des mots fantomes ("senc", "seccsscscne", "verse"). Tesseract les signale
// lui-meme : ces mots sortent entre 0 et 40 de confiance, la ou un vrai nom de
// boisson est entre 84 et 96. On se fie a cette mesure plutot qu'a des
// heuristiques sur les chaines.
const MIN_WORD_CONFIDENCE = 50;

function confidentLines(data) {
  const lines = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const kept = (line.words ?? [])
          .filter((word) => word.confidence >= MIN_WORD_CONFIDENCE)
          .map((word) => word.text);
        if (kept.length > 0) lines.push(kept.join(' '));
      }
    }
  }
  return lines;
}

/** Rend le texte lu sur l'image. Le decoupage en boissons revient au parser. */
export async function readMenu(file, onProgress) {
  const worker = await getWorker(onProgress);
  let source = file;
  try {
    source = await preprocess(file);
  } catch {
    // Preparation impossible (format exotique, memoire) : on tente l'original
    // plutot que d'abandonner la lecture.
  }
  const { data } = await worker.recognize(source, {}, { blocks: true });
  const lines = confidentLines(data);
  // Si le detail par mot manque, on retombe sur le texte brut : mieux vaut une
  // liste a nettoyer a la main qu'un ecran vide.
  return lines.length > 0 ? lines.join('\n') : (data.text ?? '');
}

/** Prepare le moteur en tache de fond, sans bloquer ni faire echouer l'appli. */
export function warmUp() {
  getWorker().catch(() => {});
}
