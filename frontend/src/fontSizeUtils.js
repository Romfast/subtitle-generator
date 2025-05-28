// frontend/src/fontSizeUtils.js
// Creați acest fișier nou pentru calculul consistent al mărimii fontului

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
  
  // Calculăm dimensiunea finală (minim 18px pentru lizibilitate)
  const adjustedSize = Math.max(18, Math.round(baseFontSize * scalingFactor) + sizeBonus);
  
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
  const previewFontSize = Math.max(12, Math.round(videoFontSize * previewScalingFactor));
  
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
  
  return { width: videoWidth, height: videoHeight };
};