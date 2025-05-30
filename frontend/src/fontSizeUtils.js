// frontend/src/fontSizeUtils.js
// Calculul consistent al mărimii fontului cu optimizări pentru dispozitive mobile
// EXTENDED pentru suport fonturi mari (până la 84px)

/**
 * Detectează dacă dispozitivul este mobil
 */
export const isMobileDevice = () => {
  return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Calculează mărimea fontului pentru video-ul final, ținând cont de dimensiunile video-ului
 * și de scalarea necesară pentru a păstra proporțiile corecte
 * EXTENDED: Suport pentru fonturi mari (84px) cu scalare inteligentă
 */
export const calculateVideoFontSize = (baseFontSize, videoWidth = 1280, videoHeight = 720) => {
  // Calculăm factorul de scalare bazat pe lățimea video-ului
  // Folosim 1920px ca referință (Full HD)
  const referenceWidth = 1920;
  let scalingFactor = Math.max(0.75, videoWidth / referenceWidth);
  
  // SPECIAL HANDLING pentru fonturi foarte mari (>60px)
  if (baseFontSize > 60) {
    // Pentru fonturi foarte mari, aplicăm un factor de scalare mai conservativ
    // pentru a evita subtitrările prea mari care ar acoperi tot video-ul
    scalingFactor = Math.max(0.6, scalingFactor * 0.85);
    console.log(`Large font detected (${baseFontSize}px), applying conservative scaling: ${scalingFactor}`);
  }
  
  // Adăugăm un bonus pentru dimensiuni mai mici pentru lizibilitate
  let sizeBonus = 0;
  if (videoWidth < 1280) {
    sizeBonus = baseFontSize > 48 ? 2 : 4; // Bonus mai mic pentru fonturi mari
  }
  
  // Pe mobil, adăugăm un bonus suplimentar pentru lizibilitate, dar limităm pentru fonturi mari
  let mobileBonus = 0;
  if (isMobileDevice()) {
    if (baseFontSize > 60) {
      mobileBonus = 0; // Fără bonus pe mobil pentru fonturi foarte mari
    } else if (baseFontSize > 40) {
      mobileBonus = 1; // Bonus redus pentru fonturi mari
    } else {
      mobileBonus = 2; // Bonus normal pentru fonturi mici
    }
  }
  
  // Calculăm dimensiunea finală
  const adjustedSize = Math.round(baseFontSize * scalingFactor) + sizeBonus + mobileBonus;
  
  // Asigurăm limitele minime și maxime
  const minSize = 18; // Minim pentru lizibilitate
  const maxSize = Math.min(120, videoHeight * 0.15); // Maxim 15% din înălțimea video-ului
  
  const finalSize = Math.max(minSize, Math.min(maxSize, adjustedSize));
  
  console.log(`Video font size: base=${baseFontSize}, width=${videoWidth}, factor=${scalingFactor}, bonus=${sizeBonus}, mobile=${mobileBonus}, final=${finalSize}, capped=${finalSize !== adjustedSize}`);
  
  return finalSize;
};

/**
 * Calculează mărimea fontului pentru previzualizare, să corespundă cu cea din video final
 * Această funcție va face previzualizarea să arate identic cu rezultatul final
 * EXTENDED: Suport inteligent pentru fonturi mari
 */
export const calculatePreviewFontSize = (baseFontSize, previewWidth = 640, videoWidth = 1280) => {
  // Calculăm dimensiunea care va fi folosită în video final
  const videoFontSize = calculateVideoFontSize(baseFontSize, videoWidth);
  
  // Scalăm pentru previzualizare proporțional cu lățimea previzualizării
  let previewScalingFactor = previewWidth / videoWidth;
  
  // Pentru fonturi foarte mari, aplicăm o scalare specială în preview
  if (baseFontSize > 60) {
    // Pentru fonturi mari, reducem puțin în preview pentru a nu fi prea dominante
    previewScalingFactor = previewScalingFactor * 0.8;
    console.log(`Large font preview scaling applied: ${previewScalingFactor}`);
  }
  
  // Pe mobil, ajustăm factorul de scalare pentru a compensa ecranul mai mic
  const adjustedPreviewScaling = isMobileDevice() ? 
    Math.max(0.7, previewScalingFactor * 1.1) : // Pe mobil, mărește puțin fontul pentru lizibilitate
    previewScalingFactor;
  
  // Calculăm dimensiunea finală pentru preview
  let previewFontSize = Math.round(videoFontSize * adjustedPreviewScaling);
  
  // Asigurăm limitele pentru preview
  const minPreviewSize = 12;
  const maxPreviewSize = isMobileDevice() ? 
    Math.min(60, window.innerWidth * 0.08) : // Pe mobil, maxim 8% din lățimea ecranului
    Math.min(80, previewWidth * 0.1); // Pe desktop, maxim 10% din lățimea containerului
    
  previewFontSize = Math.max(minPreviewSize, Math.min(maxPreviewSize, previewFontSize));
  
  console.log(`Preview font size: video_size=${videoFontSize}, preview_width=${previewWidth}, video_width=${videoWidth}, scaling=${previewScalingFactor}, adjusted=${adjustedPreviewScaling}, final=${previewFontSize}, mobile=${isMobileDevice()}`);
  
  return previewFontSize;
};

/**
 * Obține dimensiunile video-ului din elementul video
 * IMPROVED: Detectare mai bună a dimensiunilor pentru fonturi mari
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
 * IMPROVED: Suport pentru fonturi mari - ajustare poziție
 */
export const getMobileOptimalSubtitlePosition = (currentPosition, videoWidth, videoHeight, fontSize = 24) => {
  if (!isMobileDevice()) {
    return currentPosition;
  }
  
  // Pentru fonturi mari, ajustăm pozițiile pentru a evita suprapunerea cu controalele
  const isLargeFont = fontSize > 48;
  const fontSizeAdjustment = isLargeFont ? 5 : 0; // Mutăm cu 5% mai sus/jos pentru fonturi mari
  
  // Pe mobil, preferăm pozițiile care nu interferează cu controalele video
  const mobileOptimalPositions = {
    'bottom': { x: 50, y: Math.max(75, 85 - fontSizeAdjustment) }, // Mai sus pentru fonturi mari
    'top': { x: 50, y: Math.min(25, 15 + fontSizeAdjustment) },    // Mai jos pentru fonturi mari
    'middle': { x: 50, y: 45 }, // Centrat rămâne la fel
    'bottom-left': { x: 20, y: Math.max(75, 85 - fontSizeAdjustment) },
    'bottom-right': { x: 80, y: Math.max(75, 85 - fontSizeAdjustment) },
    'top-left': { x: 20, y: Math.min(25, 15 + fontSizeAdjustment) },
    'top-right': { x: 80, y: Math.min(25, 15 + fontSizeAdjustment) }
  };
  
  console.log(`Mobile position adjustment for font ${fontSize}px:`, {
    originalPosition: currentPosition,
    isLargeFont,
    fontSizeAdjustment,
    adjustedPosition: mobileOptimalPositions[currentPosition]
  });
  
  return mobileOptimalPositions[currentPosition] || { x: 50, y: 85 - fontSizeAdjustment };
};

/**
 * Calculează dimensiunea optimă pentru elementele de control pe mobil
 * EXTENDED: Suport pentru fonturi mari
 */
export const getMobileControlSize = (baseSize, fontSize = 24) => {
  if (!isMobileDevice()) {
    return baseSize;
  }
  
  // Pentru fonturi mari, mărește și controalele proporțional
  let mobileScaling = window.innerWidth < 480 ? 1.3 : 1.2;
  
  if (fontSize > 60) {
    mobileScaling += 0.2; // Controale mai mari pentru fonturi foarte mari
  } else if (fontSize > 40) {
    mobileScaling += 0.1; // Controale puțin mai mari pentru fonturi mari
  }
  
  return Math.round(baseSize * mobileScaling);
};

/**
 * Verifică dacă fontul este lizibil pe dimensiunea ecranului curent
 * IMPROVED: Calcul mai precis pentru fonturi mari
 */
export const isReadableOnScreen = (fontSize, textLength = 10) => {
  const screenWidth = window.innerWidth;
  
  // Pentru fonturi mari, folosim un factor de lățime diferit
  let charWidthFactor = 0.6;
  if (fontSize > 60) {
    charWidthFactor = 0.65; // Fonturi mari au caractere puțin mai late
  } else if (fontSize > 40) {
    charWidthFactor = 0.62;
  }
  
  const estimatedTextWidth = fontSize * textLength * charWidthFactor;
  
  // Pentru fonturi mari, permitem până la 85% din lățimea ecranului
  const maxWidthPercent = fontSize > 48 ? 0.85 : 0.8;
  
  // Textul trebuie să încapă confortabil pe ecran
  const isReadable = estimatedTextWidth <= screenWidth * maxWidthPercent;
  
  console.log(`Readability check: fontSize=${fontSize}, textLength=${textLength}, estimatedWidth=${estimatedTextWidth}, screenWidth=${screenWidth}, maxAllowed=${screenWidth * maxWidthPercent}, readable=${isReadable}`);
  
  return isReadable;
};

/**
 * Ajustează mărimea fontului pentru a fi lizibilă pe ecranul curent
 * EXTENDED: Suport inteligent pentru fonturi mari
 */
export const ensureReadableSize = (fontSize, textContent = '') => {
  if (!textContent) return fontSize;
  
  const maxWords = Math.max(...textContent.split('\n').map(line => line.split(' ').length));
  const avgWordsPerLine = maxWords || 4;
  
  let adjustedFontSize = fontSize;
  
  // Pentru fonturi foarte mari, verificăm mai atent lizibilitatea
  if (fontSize > 60) {
    // Pentru fonturi mari, folosim o verificare mai strictă
    while (adjustedFontSize > 24 && !isReadableOnScreen(adjustedFontSize, avgWordsPerLine * 5)) {
      adjustedFontSize -= 2; // Scădem cu pași mai mari pentru fonturi mari
    }
  } else {
    // Pentru fonturi normale, verificarea obișnuită
    while (adjustedFontSize > 12 && !isReadableOnScreen(adjustedFontSize, avgWordsPerLine * 6)) {
      adjustedFontSize -= 1;
    }
  }
  
  // Asigură mărimea minimă, dar permite dimensiuni mari dacă sunt lizibile
  const finalSize = Math.max(12, adjustedFontSize);
  
  if (finalSize !== fontSize) {
    console.log(`Font size adjusted for readability: ${fontSize}px -> ${finalSize}px`);
  }
  
  return finalSize;
};

/**
 * Calculează spacingul optim între linii pentru mobil
 * EXTENDED: Suport pentru fonturi mari
 */
export const getMobileLineHeight = (fontSize) => {
  if (!isMobileDevice()) {
    return 1.2; // Line height standard
  }
  
  // Pe mobil, ajustăm line height-ul bazat pe dimensiunea fontului
  let lineHeight = 1.2;
  
  if (fontSize > 60) {
    lineHeight = 1.1; // Line height mai mic pentru fonturi foarte mari
  } else if (fontSize > 40) {
    lineHeight = 1.15; // Line height puțin mai mic pentru fonturi mari
  } else if (fontSize < 20) {
    lineHeight = 1.4; // Line height mai mare pentru fonturi mici
  } else {
    lineHeight = 1.3; // Line height normal pentru fonturi medii
  }
  
  console.log(`Mobile line height for ${fontSize}px: ${lineHeight}`);
  
  return lineHeight;
};

/**
 * Obține configurația optimă pentru subtitrări pe mobil
 * EXTENDED: Configurare inteligentă pentru fonturi mari
 */
export const getMobileSubtitleConfig = (currentConfig) => {
  if (!isMobileDevice()) {
    return currentConfig;
  }
  
  const fontSize = currentConfig.fontSize || 24;
  
  // Pentru fonturi mari, ajustăm configurația
  let mobileConfig = {
    ...currentConfig,
    lineHeight: getMobileLineHeight(fontSize)
  };
  
  if (fontSize > 60) {
    // Pentru fonturi foarte mari
    mobileConfig = {
      ...mobileConfig,
      maxWordsPerLine: Math.min(currentConfig.maxWordsPerLine || 2, 2), // Max 2 cuvinte pentru fonturi mari
      maxWidth: Math.max(currentConfig.maxWidth || 70, 70), // Lățime mai mare pentru fonturi mari
      maxLines: Math.min(currentConfig.maxLines || 1, 1), // Preferăm 1 linie pentru fonturi mari
    };
  } else if (fontSize > 40) {
    // Pentru fonturi mari
    mobileConfig = {
      ...mobileConfig,
      maxWordsPerLine: Math.min(currentConfig.maxWordsPerLine || 3, 3), // Max 3 cuvinte
      maxWidth: Math.max(currentConfig.maxWidth || 60, 60), // Lățime optimă
      maxLines: Math.min(currentConfig.maxLines || 2, 2), // Max 2 linii
    };
  } else {
    // Pentru fonturi normale
    mobileConfig = {
      ...mobileConfig,
      maxWordsPerLine: Math.min(currentConfig.maxWordsPerLine || 3, 4), // Max 4 cuvinte
      maxWidth: Math.max(currentConfig.maxWidth || 50, 60), // Lățime standard
      maxLines: Math.min(currentConfig.maxLines || 2, 3), // Max 3 linii
    };
  }
  
  console.log(`Mobile subtitle config for ${fontSize}px:`, mobileConfig);
  
  return mobileConfig;
};

/**
 * Calculează factorul de scalare pentru animații și efecte vizuale
 * NEW: Pentru presetările cu fonturi mari
 */
export const getVisualEffectScale = (fontSize) => {
  // Pentru fonturi mari, mărește efectele vizuale proporțional
  if (fontSize > 60) {
    return 1.5; // Efecte mari pentru fonturi mari
  } else if (fontSize > 40) {
    return 1.2; // Efecte medii pentru fonturi mari
  } else {
    return 1.0; // Efecte normale pentru fonturi normale
  }
};

/**
 * Determină dacă fontul este considerat "mare" și necesită handling special
 * NEW: Helper function pentru presetări
 */
export const isLargeFont = (fontSize) => {
  return fontSize > 48;
};

/**
 * Determină dacă fontul este considerat "foarte mare" și necesită restricții speciale
 * NEW: Helper function pentru presetări extreme
 */
export const isExtraLargeFont = (fontSize) => {
  return fontSize > 64;
};

/**
 * Calculează padding-ul optim pentru containerul de subtitrări bazat pe mărimea fontului
 * NEW: Pentru presetările cu dimensiuni variate
 */
export const calculateOptimalPadding = (fontSize, isMobile = false) => {
  let basePadding = isMobile ? 16 : 12;
  
  if (fontSize > 60) {
    basePadding = isMobile ? 24 : 20; // Padding mai mare pentru fonturi mari
  } else if (fontSize > 40) {
    basePadding = isMobile ? 20 : 16; // Padding mediu pentru fonturi mari
  }
  
  return {
    horizontal: basePadding,
    vertical: Math.round(basePadding * 0.75)
  };
};