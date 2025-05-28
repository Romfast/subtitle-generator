// frontend/src/fontSizeUtils.js
// Calculul consistent al mărimii fontului cu optimizări pentru dispozitive mobile

/**
 * Detectează dacă dispozitivul este mobil
 */
export const isMobileDevice = () => {
  return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Calculează mărimea fontului pentru video-ul final, ținând cont de dimensiunile video-ului
 * și de scalarea necesară pentru a păstra proporțiile corecte
 */
export const calculateVideoFontSize = (baseFontSize, videoWidth = 1280, videoHeight = 720) => {
  // Calculăm factorul de scalare bazat pe lățimea video-ului
  // Folosim 1920px ca referință (Full HD)
  const referenceWidth = 1920;
  const scalingFactor = Math.max(0.75, videoWidth / referenceWidth);
  
  // Adăugăm un bonus pentru dimensiuni mai mici pentru lizibilitate
  const sizeBonus = videoWidth < 1280 ? 4 : 0;
  
  // Pe mobil, adăugăm un bonus suplimentar pentru lizibilitate
  const mobileBonus = isMobileDevice() ? 2 : 0;
  
  // Calculăm dimensiunea finală (minim 18px pentru lizibilitate)
  const adjustedSize = Math.max(18, Math.round(baseFontSize * scalingFactor) + sizeBonus + mobileBonus);
  
  console.log(`Video font size: base=${baseFontSize}, width=${videoWidth}, factor=${scalingFactor}, bonus=${sizeBonus}, mobile=${mobileBonus}, final=${adjustedSize}`);
  
  return adjustedSize;
};

/**
 * Calculează mărimea fontului pentru previzualizare, să corespundă cu cea din video final
 * Această funcție va face previzualizarea să arate identic cu rezultatul final
 */
export const calculatePreviewFontSize = (baseFontSize, previewWidth = 640, videoWidth = 1280) => {
  // Calculăm dimensiunea care va fi folosită în video final
  const videoFontSize = calculateVideoFontSize(baseFontSize, videoWidth);
  
  // Scalăm pentru previzualizare proporțional cu lățimea previzualizării
  const previewScalingFactor = previewWidth / videoWidth;
  
  // Pe mobil, ajustăm factorul de scalare pentru a compensa ecranul mai mic
  const adjustedPreviewScaling = isMobileDevice() ? 
    Math.max(0.8, previewScalingFactor * 1.2) : // Pe mobil, mărește puțin fontul pentru lizibilitate
    previewScalingFactor;
  
  const previewFontSize = Math.max(12, Math.round(videoFontSize * adjustedPreviewScaling));
  
  console.log(`Preview font size: video_size=${videoFontSize}, preview_width=${previewWidth}, video_width=${videoWidth}, scaling=${previewScalingFactor}, adjusted=${adjustedPreviewScaling}, final=${previewFontSize}, mobile=${isMobileDevice()}`);
  
  return previewFontSize;
};

/**
 * Obține dimensiunile video-ului din elementul video
 */
export const getVideoActualDimensions = (videoElement) => {
  if (!videoElement) return { width: 1280, height: 720 };
  
  // Încercăm să obținem dimensiunile reale ale video-ului
  const videoWidth = videoElement.videoWidth || videoElement.clientWidth || 1280;
  const videoHeight = videoElement.videoHeight || videoElement.clientHeight || 720;
  
  // Pe mobil, ajustăm dimensiunile pentru a reflecta mai bine experiența utilizatorului
  if (isMobileDevice()) {
    // Dacă video-ul se afișează în full-width pe mobil, folosim lățimea ecranului
    const screenWidth = window.innerWidth;
    if (videoElement.clientWidth >= screenWidth * 0.9) {
      const aspectRatio = videoHeight / videoWidth;
      return { 
        width: screenWidth, 
        height: Math.round(screenWidth * aspectRatio) 
      };
    }
  }
  
  return { width: videoWidth, height: videoHeight };
};

/**
 * Calculează poziția optimă pentru subtitrări pe dispozitive mobile
 */
export const getMobileOptimalSubtitlePosition = (currentPosition, videoWidth, videoHeight) => {
  if (!isMobileDevice()) {
    return currentPosition;
  }
  
  // Pe mobil, preferăm pozițiile care nu interferează cu controalele video
  const mobileOptimalPositions = {
    'bottom': { x: 50, y: 85 }, // Puțin mai sus pentru a evita controalele
    'top': { x: 50, y: 15 },    // Puțin mai jos pentru a evita notch-ul
    'middle': { x: 50, y: 45 }, // Centrat, dar evită mijlocul exact
    'bottom-left': { x: 20, y: 85 },
    'bottom-right': { x: 80, y: 85 },
    'top-left': { x: 20, y: 15 },
    'top-right': { x: 80, y: 15 }
  };
  
  return mobileOptimalPositions[currentPosition] || { x: 50, y: 85 };
};

/**
 * Calculează dimensiunea optimă pentru elementele de control pe mobil
 */
export const getMobileControlSize = (baseSize) => {
  if (!isMobileDevice()) {
    return baseSize;
  }
  
  // Pe mobil, mărește dimensiunea pentru touch-ul mai ușor
  const mobileScaling = window.innerWidth < 480 ? 1.3 : 1.2;
  return Math.round(baseSize * mobileScaling);
};

/**
 * Verifică dacă fontul este lizibil pe dimensiunea ecranului curent
 */
export const isReadableOnScreen = (fontSize, textLength = 10) => {
  const screenWidth = window.innerWidth;
  const estimatedTextWidth = fontSize * textLength * 0.6; // Aproximativ 0.6 factor pentru lățimea caracterelor
  
  // Textul trebuie să încapă confortabil pe ecran (maxim 80% din lățime)
  return estimatedTextWidth <= screenWidth * 0.8;
};

/**
 * Ajustează mărimea fontului pentru a fi lizibilă pe ecranul curent
 */
export const ensureReadableSize = (fontSize, textContent = '') => {
  if (!textContent) return fontSize;
  
  const maxWords = Math.max(...textContent.split('\n').map(line => line.split(' ').length));
  const avgWordsPerLine = maxWords || 4;
  
  // Verifică dacă fontul este lizibil
  while (fontSize > 12 && !isReadableOnScreen(fontSize, avgWordsPerLine * 6)) {
    fontSize -= 1;
  }
  
  // Asigură mărimea minimă
  return Math.max(12, fontSize);
};

/**
 * Calculează spacingul optim între linii pentru mobil
 */
export const getMobileLineHeight = (fontSize) => {
  if (!isMobileDevice()) {
    return 1.2; // Line height standard
  }
  
  // Pe mobil, mărim puțin line height-ul pentru lizibilitate
  return Math.max(1.3, 1.2 + (fontSize < 20 ? 0.2 : 0.1));
};

/**
 * Obține configurația optimă pentru subtitrări pe mobil
 */
export const getMobileSubtitleConfig = (currentConfig) => {
  if (!isMobileDevice()) {
    return currentConfig;
  }
  
  return {
    ...currentConfig,
    // Pe mobil, preferăm mai puține cuvinte pe linie pentru lizibilitate
    maxWordsPerLine: Math.min(currentConfig.maxWordsPerLine || 3, 3),
    // Lățimea maximă puțin mai mare pe mobil pentru a folosi spațiul disponibil
    maxWidth: Math.max(currentConfig.maxWidth || 50, 60),
    // Numărul de linii poate fi puțin mai mare pe mobil
    maxLines: Math.min(currentConfig.maxLines || 2, 3),
    // Line height optimizat pentru mobil
    lineHeight: getMobileLineHeight(currentConfig.fontSize || 24)
  };
};