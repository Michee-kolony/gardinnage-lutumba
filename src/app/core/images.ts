// Mêmes formats et limite que le backend (middleware/upload.js) : toutes les
// images courantes sauf le GIF.
export const TAILLE_MAX_IMAGE = 20 * 1024 * 1024; // 20 Mo

const EXTENSIONS_IMAGE = ['.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.webp', '.avif', '.heic', '.heif', '.bmp', '.tif', '.tiff'];
const TYPES_IMAGE = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

// Valeur de l'attribut accept des <input type="file"> (les extensions couvrent
// les navigateurs qui ne connaissent pas le type MIME du HEIC, par exemple)
export const FORMATS_IMAGE_ACCEPT = [...EXTENSIONS_IMAGE, ...TYPES_IMAGE].join(',');
export const FORMATS_IMAGE_LIBELLE = 'JPEG, PNG, WEBP, AVIF, HEIC, BMP ou TIFF (GIF refusé), 20 Mo max.';

// Renvoie un message d'erreur si l'image n'est pas acceptée, ou null si tout est bon
export function verifierImage(file: File): string | null {
  const nom = file.name.toLowerCase();
  const extension = nom.includes('.') ? nom.slice(nom.lastIndexOf('.')) : '';
  if (file.type === 'image/gif' || extension === '.gif') {
    return `« ${file.name} » : le format GIF n'est pas accepté.`;
  }
  if (!TYPES_IMAGE.includes(file.type) && !EXTENSIONS_IMAGE.includes(extension)) {
    return `« ${file.name} » : format non accepté (${FORMATS_IMAGE_LIBELLE})`;
  }
  if (file.size > TAILLE_MAX_IMAGE) {
    return `« ${file.name} » dépasse 20 Mo.`;
  }
  return null;
}
