// Prepara la imatge de portada al navegador: retall «cover» a 16:7 i compressió.
// Així es pugen fitxers petits (< 1 MB) i amb la mida exacta que es mostra.
// La imatge pot ser un fitxer o una captura d'una pestanya oberta; la captura es fa al navegador
// i no s'envia enlloc fins que l'usuari desa el formulari.

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 525;
const MIN_WIDTH = 600;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 900 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const ATTEMPTS = [
  ['image/webp', 0.85],
  ['image/webp', 0.72],
  ['image/jpeg', 0.85],
  ['image/jpeg', 0.7],
  ['image/jpeg', 0.55],
];

export class ImageError extends Error {}

function decode(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

// toBlob és asíncron i, en alguns navegadors o entorns, pot no respondre mai:
// si triga massa, es fa servir toDataURL (síncron) perquè la interfície no es quedi bloquejada.
function toBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(blob);
    };
    const timer = setTimeout(() => finish(dataUrlToBlob(canvas.toDataURL(type, quality))), 3000);
    canvas.toBlob(finish, type, quality);
  });
}

/** Retorna { blob, type, extension } o llança ImageError amb un missatge per a l'usuari. */
export async function prepareCoverImage(file) {
  if (!file) throw new ImageError('No s\'ha seleccionat cap fitxer.');
  if (!ACCEPTED.includes(file.type)) throw new ImageError('Format no admès. Fes servir JPG, PNG o WebP.');
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('La imatge és massa gran (màxim 15 MB).');

  let source;
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
    source = await Promise.race([decode(file), timeout]);
  } catch {
    throw new ImageError("No s'ha pogut llegir la imatge. Prova amb un altre fitxer.");
  }
  return encodeCover(source);
}

/**
 * Demana a l'usuari que triï una pestanya (pot ser una que ja tingui oberta) i en fa la portada.
 * Retorna null si l'usuari cancel·la; llança ImageError si no es pot capturar.
 */
export async function captureTabCover() {
  const frame = await captureTab();
  // En una captura de pantalla, la part de dalt (capçalera, títol) és la més representativa.
  return frame ? encodeCover(frame, { alignTop: true }) : null;
}

/** La captura de pestanyes només existeix als navegadors d'ordinador. */
export function canCaptureTab() {
  return Boolean(navigator.mediaDevices?.getDisplayMedia);
}

function nextFrame(video) {
  return new Promise((resolve) => {
    if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(() => resolve());
    else requestAnimationFrame(() => resolve());
  });
}

// S'ha de cridar directament des del clic: el navegador exigeix una acció de l'usuari.
async function captureTab() {
  const controller = 'CaptureController' in window ? new CaptureController() : undefined;
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: false,
      controller,
      selfBrowserSurface: 'exclude', // no es pot triar el mateix formulari
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude', // ni la pantalla sencera
    });
  } catch (error) {
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') return null;
    console.error(error);
    throw new ImageError("No s'ha pogut iniciar la captura. Prova-ho amb Chrome o Edge d'ordinador.");
  }

  try {
    // Sense això, el navegador salta a la pestanya capturada i l'usuari perd el formulari de vista.
    controller?.setFocusBehavior?.('no-focus-change');
  } catch {
    // Alguns navegadors no ho permeten: no és greu.
  }

  try {
    const [track] = stream.getVideoTracks();
    const surface = track?.getSettings().displaySurface;
    if (surface && surface !== 'browser') {
      throw new ImageError("Tria una pestanya del navegador, no una finestra ni la pantalla sencera. Funciona amb Chrome i Edge d'ordinador.");
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
      await Promise.race([nextFrame(video), timeout]);
    }
    if (!video.videoWidth) throw new ImageError("No s'ha pogut capturar la pestanya. Torna-ho a provar.");

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function encodeCover(source, { alignTop = false } = {}) {
  const width = source.width;
  const height = source.height;
  if (width < MIN_WIDTH) throw new ImageError(`La imatge és massa petita: ha de fer com a mínim ${MIN_WIDTH} píxels d'amplada.`);

  // Retall (centrat o des de dalt) que omple tot el format de la portada.
  const scale = Math.max(COVER_WIDTH / width, COVER_HEIGHT / height);
  const cropWidth = COVER_WIDTH / scale;
  const cropHeight = COVER_HEIGHT / scale;
  const sx = (width - cropWidth) / 2;
  const sy = alignTop ? 0 : (height - cropHeight) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff'; // fons per a PNG amb transparència
  ctx.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT);
  ctx.drawImage(source, sx, sy, cropWidth, cropHeight, 0, 0, COVER_WIDTH, COVER_HEIGHT);
  source.close?.();

  for (const [type, quality] of ATTEMPTS) {
    const blob = await toBlob(canvas, type, quality);
    // Si el navegador no sap codificar WebP, retorna PNG: passem a JPEG.
    if (blob && blob.type === type && blob.size <= MAX_OUTPUT_BYTES) {
      return { blob, type, extension: type === 'image/webp' ? 'webp' : 'jpg' };
    }
  }
  throw new ImageError("No s'ha pogut comprimir prou la imatge. Prova amb una altra.");
}
