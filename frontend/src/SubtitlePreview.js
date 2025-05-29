import React, { useState, useEffect, useRef } from 'react';
import { calculatePreviewFontSize, getVideoActualDimensions } from './fontSizeUtils';

const SubtitlePreview = ({ subtitles, currentTime, subtitleStyle, updatePosition, updateSubtitle }) => {
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [formattedDisplay, setFormattedDisplay] = useState({ lines: [], allWords: [] });
  const [actualVideoSize, setActualVideoSize] = useState({ width: 1280, height: 720 });
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [touchStartPosition, setTouchStartPosition] = useState({ x: 0, y: 0 });
  const [videoRect, setVideoRect] = useState(null);
  const [dragStartTime, setDragStartTime] = useState(0);
  const subtitleRef = useRef(null);
  const containerRef = useRef(null);
  const editTextareaRef = useRef(null);
  
  // Detectează dacă este dispozitiv mobil/touch
  useEffect(() => {
    const checkMobileDevice = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobileDevice(isTouchDevice || isSmallScreen);
    };
    
    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    
    return () => {
      window.removeEventListener('resize', checkMobileDevice);
    };
  }, []);
  
  // Monitorizează dimensiunile și poziția video-ului - FIX COMPLET MOBIL
  useEffect(() => {
    const updateVideoInfo = () => {
      if (containerRef.current) {
        const videoElement = containerRef.current.querySelector('video');
        if (videoElement) {
          const rect = videoElement.getBoundingClientRect();
          
          let actualVideoRect = rect;
          
          if (isMobileDevice) {
            // Pe mobil, calculăm dimensiunile corecte bazate pe viewport
            const viewportWidth = window.innerWidth;
            const aspectRatio = 16 / 9;
            const calculatedHeight = viewportWidth / aspectRatio;
            
            // Folosim cea mai mică valoare pentru a nu depăși limitele
            const maxHeight = window.innerHeight * 0.6; // max 60vh
            const finalHeight = Math.min(calculatedHeight, maxHeight, rect.height || calculatedHeight);
            
            actualVideoRect = {
              left: 0,
              top: rect.top,
              width: viewportWidth,
              height: finalHeight,
              right: viewportWidth,
              bottom: rect.top + finalHeight
            };
          }
          
          setVideoRect(actualVideoRect);
          setActualVideoSize({ 
            width: actualVideoRect.width, 
            height: actualVideoRect.height 
          });
          
          console.log('Video info updated:', { 
            originalRect: rect,
            actualVideoRect,
            isMobile: isMobileDevice,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          });
        }
      }
    };
    
    updateVideoInfo();
    
    // Update frecvent pe mobil
    const interval = setInterval(updateVideoInfo, isMobileDevice ? 300 : 2000);
    const events = ['resize', 'scroll', 'orientationchange', 'load'];
    
    events.forEach(event => {
      window.addEventListener(event, updateVideoInfo, { passive: true });
    });
    
    return () => {
      clearInterval(interval);
      events.forEach(event => {
        window.removeEventListener(event, updateVideoInfo);
      });
    };
  }, [isMobileDevice]);
  
  // Calculează mărimea fontului pentru previzualizare - FIX PENTRU SINCRONIZARE CU CONFIGURARI
  const getPreviewFontSize = () => {
    const baseFontSize = subtitleStyle.fontSize || 24;
    
    // Pe mobil, folosim direct mărimea din configurări pentru a reflecta setările utilizatorului
    if (isMobileDevice) {
      // Multiplicator pentru mobil pentru vizibilitate, dar păstrăm proporționalitatea
      const mobileFactor = window.innerWidth < 480 ? 0.85 : 0.9; // Slightly smaller on very small screens
      return Math.max(16, Math.round(baseFontSize * mobileFactor));
    }
    
    // Pe desktop, calculăm proporțional cu dimensiunea containerului video
    const previewWidth = containerRef.current ? 
      containerRef.current.querySelector('video')?.clientWidth || 640 : 640;
    
    // Factor de scalare bazat pe lățimea previzualizării față de 1920px (referință)
    const scalingFactor = Math.max(0.6, previewWidth / 1920);
    
    // Aplicăm factorul de scalare la mărimea de bază
    const scaledSize = baseFontSize * scalingFactor;
    
    // Asigurăm o mărime minimă pentru lizibilitate
    const finalSize = Math.max(14, Math.round(scaledSize));
    
    console.log('Preview font size calculation:', {
      baseFontSize,
      previewWidth,
      scalingFactor,
      scaledSize,
      finalSize,
      isMobile: isMobileDevice
    });
    
    return finalSize;
  };
  
  // Formatează textul subtitrării
  const formatSubtitleText = (text) => {
    if (!text) return { lines: [], allWords: [] };
    
    let processedText = text;
    if (subtitleStyle.allCaps) {
      processedText = processedText.toUpperCase();
    }
    
    if (subtitleStyle.removePunctuation) {
      processedText = processedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      processedText = processedText.replace(/\s{2,}/g, " ");
    }
    
    const allWords = processedText.split(/\s+/).filter(word => word.length > 0);
    const maxWordsPerLine = parseInt(subtitleStyle.maxWordsPerLine || 3, 10); 
    const maxLines = parseInt(subtitleStyle.maxLines || 1, 10);
    
    const lines = [];
    for (let i = 0; i < allWords.length && lines.length < maxLines; i += maxWordsPerLine) {
      const lineWords = allWords.slice(i, i + maxWordsPerLine);
      lines.push(lineWords.join(' '));
    }
    
    if (allWords.length > maxLines * maxWordsPerLine && lines.length === maxLines) {
      const extraWords = allWords.slice(maxLines * maxWordsPerLine);
      if (extraWords.length > 0) {
        lines[maxLines - 1] += ' ' + extraWords.join(' ');
      }
    }
    
    return { lines, allWords };
  };
  
  // Evidențiază cuvântul curent
  useEffect(() => {
    const activeSubtitle = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );
    
    if (activeSubtitle !== currentSubtitle) {
      setCurrentSubtitle(activeSubtitle);
      if (activeSubtitle && !isEditing) {
        setEditText(activeSubtitle.text);
        setCurrentWordIndex(0);
        const formattedResult = formatSubtitleText(activeSubtitle.text);
        setFormattedDisplay(formattedResult);
      }
    } else if (activeSubtitle && formattedDisplay.allWords.length > 0 && subtitleStyle.useKaraoke === true) {
      const duration = activeSubtitle.end - activeSubtitle.start;
      const relativeTime = currentTime - activeSubtitle.start;
      const wordDuration = duration / formattedDisplay.allWords.length;
      
      const wordIndex = Math.min(
        Math.floor(relativeTime / wordDuration),
        formattedDisplay.allWords.length - 1
      );
      
      if (wordIndex !== currentWordIndex && wordIndex >= 0) {
        setCurrentWordIndex(wordIndex);
      }
    }
  }, [subtitles, currentTime, isEditing, subtitleStyle.allCaps, subtitleStyle.removePunctuation, subtitleStyle.maxWordsPerLine, subtitleStyle.maxLines, subtitleStyle.useKaraoke]);
  
  // Re-formatează textul când se schimbă stilul - EXTENDED cu poziționare
  useEffect(() => {
    if (currentSubtitle) {
      const formattedResult = formatSubtitleText(currentSubtitle.text);
      setFormattedDisplay(formattedResult);
      
      // Force re-render când se schimbă stilul - acum include toate opțiunile de poziționare
      console.log('Subtitle style changed, re-rendering with:', {
        fontSize: subtitleStyle.fontSize,
        fontFamily: subtitleStyle.fontFamily,
        fontColor: subtitleStyle.fontColor,
        position: subtitleStyle.position,
        useCustomPosition: subtitleStyle.useCustomPosition,
        customX: subtitleStyle.customX,
        customY: subtitleStyle.customY,
        previewFontSize: getPreviewFontSize()
      });
    }
  }, [
    currentSubtitle,
    subtitleStyle.allCaps, 
    subtitleStyle.removePunctuation, 
    subtitleStyle.maxWordsPerLine, 
    subtitleStyle.maxLines,
    subtitleStyle.fontSize,        
    subtitleStyle.fontFamily,      
    subtitleStyle.fontColor,       
    subtitleStyle.borderColor,     
    subtitleStyle.borderWidth,     
    subtitleStyle.useCustomPosition, // CRITICAL: Re-render on position mode change
    subtitleStyle.customX,         // CRITICAL: Re-render on X change
    subtitleStyle.customY,         // CRITICAL: Re-render on Y change  
    subtitleStyle.position,        // CRITICAL: Re-render on preset position change
    actualVideoSize.width,         
    isMobileDevice                 
  ]);
  
  // Calculează poziția pentru mobile (fixed positioning) - IMPROVED RANGE
  const getMobilePosition = (customX, customY) => {
    if (!videoRect || !isMobileDevice) return { x: customX, y: customY };
    
    // Convertim procentajele în coordonate absolute pe ecran
    // Pe mobil, video-ul ocupă toată lățimea ecranului
    const x = (window.innerWidth * customX / 100);
    const y = videoRect.top + (videoRect.height * customY / 100);
    
    // Margini de siguranță reduse pentru mai multă libertate
    const margin = 10;
    const maxX = window.innerWidth - margin;
    const maxY = window.innerHeight - margin;
    
    return { 
      x: Math.max(margin, Math.min(x, maxX)), 
      y: Math.max(videoRect.top + margin, Math.min(y, videoRect.bottom - margin))
    };
  };
  
  // Convertește coordonatele absolute înapoi în procente - IMPROVED RANGE
  const convertToPercentage = (absoluteX, absoluteY) => {
    if (!videoRect || !isMobileDevice) return { x: 50, y: 90 };
    
    // Pe mobil, calculăm bazat pe lățimea completă a ecranului
    const x = (absoluteX / window.innerWidth) * 100;
    const y = ((absoluteY - videoRect.top) / videoRect.height) * 100;
    
    // Permitem întreaga gamă de valori
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  };
  
  // Renderează liniile cu cuvinte
  const renderLines = () => {
    if (!currentSubtitle || formattedDisplay.lines.length === 0) return null;
    
    const previewFontSize = getPreviewFontSize();
    
    return formattedDisplay.lines.map((line, lineIndex) => {
      const lineWords = line.split(/\s+/).filter(w => w.length > 0);
      let globalWordIndex = 0;
      
      for (let i = 0; i < lineIndex; i++) {
        globalWordIndex += formattedDisplay.lines[i].split(/\s+/).filter(w => w.length > 0).length;
      }
      
      const wordElements = lineWords.map((word, wordIndex) => {
        const isCurrentWord = subtitleStyle.useKaraoke === true && 
                         (globalWordIndex + wordIndex) === currentWordIndex;
        
        return (
          <span
            key={`word-${lineIndex}-${wordIndex}`}
            className={`subtitle-word ${isCurrentWord ? 'highlighted' : ''}`}
            style={{
              color: isCurrentWord ? subtitleStyle.currentWordColor : subtitleStyle.fontColor,
              fontWeight: isCurrentWord ? 'bold' : (isMobileDevice ? '600' : 'normal'),
              fontSize: `${previewFontSize}px`,
              textShadow: subtitleStyle.borderWidth > 0 ? 
                `-${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor},
                 ${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor},
                -${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor},
                 ${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor}` 
                : 'none',
              display: 'inline-block',
              padding: isMobileDevice ? '0 3px' : '0 2px',
              transform: isCurrentWord ? 'scale(1.05)' : 'scale(1)',
              transition: 'color 0.2s, transform 0.2s'
            }}
          >
            {word}
          </span>
        );
      });
      
      const lineWithSpaces = [];
      for (let i = 0; i < wordElements.length; i++) {
        lineWithSpaces.push(wordElements[i]);
        if (i < wordElements.length - 1) {
          lineWithSpaces.push(<span key={`space-${lineIndex}-${i}`}> </span>);
        }
      }
      
      return (
        <div key={`line-${lineIndex}`} className="subtitle-line" style={{
          lineHeight: isMobileDevice ? '1.4' : '1.3'
        }}>
          {lineWithSpaces}
        </div>
      );
    });
  };
  
  // Touch events pentru mobil - îmbunătățite pentru toate dimensiunile
  const handleTouchStart = (e) => {
    if (isEditing) return;
    
    const touch = e.touches[0];
    setTouchStartPosition({ x: touch.clientX, y: touch.clientY });
    setDragStartTime(Date.now());
    setIsDragging(true);
    
    // Previne scrolling-ul paginii
    e.preventDefault();
    e.stopPropagation();
    
    // Adăugă feedback haptic pe dispozitivele compatibile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    
    // Pentru mobile și desktop mic - calculează poziția relativ la viewport
    if (isMobileDevice || window.innerWidth <= 1024) {
      const percentage = convertToPercentage(touch.clientX, touch.clientY);
      updatePosition(percentage.x, percentage.y, true);
    } else {
      // Pentru desktop mare - calculează poziția relativ la containerul video
      if (videoRect) {
        const x = ((touch.clientX - videoRect.left) / videoRect.width) * 100;
        const y = ((touch.clientY - videoRect.top) / videoRect.height) * 100;
        
        const boundedX = Math.min(Math.max(0, x), 100);
        const boundedY = Math.min(Math.max(0, y), 100);
        
        updatePosition(boundedX, boundedY, true);
      }
    }
    
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosition.y);
    const dragDuration = Date.now() - dragStartTime;
    
    // Detectăm dacă a fost o mișcare de drag sau un tap
    const wasSwipe = deltaX > 10 || deltaY > 10;
    const wasLongPress = dragDuration > 300;
    
    // Feedback haptic la sfârșitul drag-ului
    if (wasSwipe && navigator.vibrate) {
      navigator.vibrate(30);
    }
    
    setIsDragging(false);
    e.preventDefault();
    e.stopPropagation();
  };
  
  // Mouse events pentru desktop - îmbunătățit pentru ecrane mici
  const handleMouseDown = (e) => {
    if (isEditing) return;
    
    // Pe touch devices sau ecrane mici, folosim touch events
    if (isMobileDevice || window.innerWidth <= 1024) return;
    
    if (e.button === 2 || e.detail === 2) {
      e.preventDefault();
      handleSubtitleClick();
      return;
    }
    
    setIsDragging(true);
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    // Pe touch devices sau ecrane mici, nu procesăm mouse events
    if (isMobileDevice || window.innerWidth <= 1024) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const videoElement = containerRef.current.querySelector('video');
    const videoBounds = videoElement ? videoElement.getBoundingClientRect() : container;
    
    const videoOffsetX = videoBounds.left - container.left;
    const videoOffsetY = videoBounds.top - container.top;
    const videoWidth = videoBounds.width;
    const videoHeight = videoBounds.height;
    
    const mouseX = e.clientX - container.left;
    const mouseY = e.clientY - container.top;
    
    const isInsideVideo = 
      mouseX >= videoOffsetX && 
      mouseX <= videoOffsetX + videoWidth &&
      mouseY >= videoOffsetY && 
      mouseY <= videoOffsetY + videoHeight;
    
    if (isInsideVideo) {
      const x = ((mouseX - videoOffsetX) / videoWidth) * 100;
      const y = ((mouseY - videoOffsetY) / videoHeight) * 100;
      
      const boundedX = Math.min(Math.max(0, x), 100);
      const boundedY = Math.min(Math.max(0, y), 100);
      
      updatePosition(boundedX, boundedY, true);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Editare (doar pe desktop)
  const handleSubtitleClick = () => {
    if (!currentSubtitle || isDragging || isMobileDevice) return;
    
    setIsEditing(true);
    setEditText(currentSubtitle.text);
  };
  
  const handleTextChange = (e) => {
    setEditText(e.target.value);
  };
  
  const handleSaveEdit = () => {
    if (!currentSubtitle) return;
    
    const currentIndex = subtitles.findIndex(
      sub => sub.start === currentSubtitle.start && sub.end === currentSubtitle.end
    );
    
    if (currentIndex !== -1 && editText !== currentSubtitle.text) {
      updateSubtitle(currentIndex, editText);
    }
    
    setIsEditing(false);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(currentSubtitle?.text || '');
    }
  };
  
  // Focus pentru editare
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
    }
  }, [isEditing]);
  
  // Event listeners pentru mouse (doar pe desktop mare)
  useEffect(() => {
    if (isDragging && !isMobileDevice && window.innerWidth > 1024) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMobileDevice]);
  
  // Nu afișa nimic dacă nu există subtitrare activă
  if (!currentSubtitle) return null;
  
  // Calculează poziția finală - FIX COMPLET PENTRU TOATE PLATFORMELE
  let finalStyle = {};
  
  if (isMobileDevice && videoRect) {
    // Pe mobil folosim fixed positioning pentru a fi deasupra controalelor video
    let mobileX, mobileY;
    
    if (subtitleStyle.useCustomPosition) {
      // Poziționare personalizată
      mobileX = subtitleStyle.customX || 50;
      mobileY = subtitleStyle.customY || 80;
    } else {
      // Poziționare predefinită - convertim în coordonate pentru mobil
      const positionMap = {
        'top': { x: 50, y: 10 },
        'top-20': { x: 50, y: 20 },
        'top-30': { x: 50, y: 30 },
        'top-40': { x: 50, y: 40 },
        'middle': { x: 50, y: 50 },
        'bottom-40': { x: 50, y: 60 },
        'bottom-30': { x: 50, y: 70 },
        'bottom-20': { x: 50, y: 80 },
        'bottom': { x: 50, y: 90 },
        'top-left': { x: 10, y: 10 },
        'top-right': { x: 90, y: 10 },
        'bottom-left': { x: 10, y: 90 },
        'bottom-right': { x: 90, y: 90 }
      };
      
      const coords = positionMap[subtitleStyle.position] || { x: 50, y: 90 };
      mobileX = coords.x;
      mobileY = coords.y;
    }
    
    const mobilePos = getMobilePosition(mobileX, mobileY);
    
    finalStyle = {
      position: 'fixed',
      left: `${mobilePos.x}px`,
      top: `${mobilePos.y}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
    };
  } else {
    // Pe desktop folosim positioning normal - FIX ÎMBUNĂTĂȚIT
    const positionStyle = subtitleStyle.useCustomPosition
      ? {
          left: `${subtitleStyle.customX || 50}%`,
          top: `${subtitleStyle.customY || 90}%`,
          transform: 'translate(-50%, -50%)'
        }
      : {
          // FIX: Poziționare predefinită îmbunătățită cu mapare completă
          top: (() => {
            switch(subtitleStyle.position) {
              case 'top': return '10%';
              case 'top-20': return '20%';
              case 'top-30': return '30%';
              case 'top-40': return '40%';
              case 'middle': return '50%';
              case 'bottom-40': return '60%';
              case 'bottom-30': return '70%';
              case 'bottom-20': return '80%';
              case 'bottom': return '90%';
              case 'top-left': return '10%';
              case 'top-right': return '10%';
              case 'bottom-left': return '90%';
              case 'bottom-right': return '90%';
              default: return '90%';
            }
          })(),
          left: (() => {
            switch(subtitleStyle.position) {
              case 'top-left':
              case 'bottom-left': 
                return '10%';
              case 'top-right':
              case 'bottom-right': 
                return '90%';
              default: 
                return '50%';
            }
          })(),
          transform: (() => {
            switch(subtitleStyle.position) {
              case 'top-left':
              case 'bottom-left': 
                return 'translate(0, -50%)';
              case 'top-right':
              case 'bottom-right': 
                return 'translate(-100%, -50%)';
              default: 
                return 'translate(-50%, -50%)';
            }
          })()
        };
    
    finalStyle = {
      position: 'absolute',
      ...positionStyle,
      zIndex: 20,
    };
  }
  
  const previewFontSize = getPreviewFontSize();
  
  return (
    <div 
      className="subtitle-container"
      ref={containerRef}
    >
      <div 
        ref={subtitleRef}
        className={`subtitle-overlay ${isDragging ? 'dragging' : ''} ${isMobileDevice ? 'mobile-mode' : ''}`}
        style={{
          ...finalStyle,
          maxWidth: isMobileDevice ? '90%' : `${subtitleStyle.maxWidth || 50}%`,
          minWidth: isMobileDevice ? '120px' : 'auto',
          width: 'auto',
          textAlign: 'center',
          backgroundColor: isMobileDevice ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          padding: isMobileDevice ? '16px 20px' : '8px 12px',
          borderRadius: isMobileDevice ? '16px' : '6px',
          cursor: isEditing ? 'text' : 'move',
          wordBreak: 'break-word',
          minHeight: isMobileDevice ? '52px' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isMobileDevice ? '0 8px 32px rgba(0, 0, 0, 0.6)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
          border: isDragging && isMobileDevice ? '3px solid rgba(102, 126, 234, 0.8)' : 'none',
          transition: isDragging ? 'none' : 'all 0.3s ease',
          backdropFilter: isMobileDevice ? 'blur(12px)' : 'blur(4px)',
          // Prevent user selection on mobile
          userSelect: isMobileDevice ? 'none' : 'auto',
          WebkitUserSelect: isMobileDevice ? 'none' : 'auto',
          // Optimize for touch
          touchAction: isMobileDevice ? 'none' : 'auto'
        }}
        onMouseDown={(!isMobileDevice && window.innerWidth > 1024) ? handleMouseDown : undefined}
        onClick={(!isMobileDevice && window.innerWidth > 1024 && !isEditing) ? handleSubtitleClick : undefined}
        onTouchStart={(isMobileDevice || window.innerWidth <= 1024) ? handleTouchStart : undefined}
        onTouchMove={(isMobileDevice || window.innerWidth <= 1024) ? handleTouchMove : undefined}
        onTouchEnd={(isMobileDevice || window.innerWidth <= 1024) ? handleTouchEnd : undefined}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isEditing ? (
          // Editare (doar pe desktop)
          <div className="subtitle-edit-overlay" onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={editTextareaRef}
              value={editText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="subtitle-edit-textarea"
              style={{
                fontFamily: subtitleStyle.fontFamily,
                fontSize: `${previewFontSize}px`,
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: subtitleStyle.fontColor,
                border: `1px solid ${subtitleStyle.fontColor}`,
                padding: '8px',
                borderRadius: '6px',
                minHeight: '60px',
                resize: 'none'
              }}
            />
            <div className="edit-instructions">
              Apasă Enter pentru a salva sau Esc pentru a anula
            </div>
          </div>
        ) : (
          // Afișare normală
          <div
            style={{
              fontFamily: subtitleStyle.fontFamily,
              fontSize: `${previewFontSize}px`,
              color: subtitleStyle.fontColor,
              lineHeight: isMobileDevice ? '1.5' : '1.3',
              textTransform: subtitleStyle.allCaps ? 'uppercase' : 'none',
              maxWidth: '100%',
              textAlign: 'center',
              fontWeight: isMobileDevice ? '600' : '500',
              textShadow: isMobileDevice ? 
                `2px 2px 4px rgba(0, 0, 0, 0.8)` : 
                `1px 1px 2px rgba(0, 0, 0, 0.5)`
            }}
          >
            {renderLines()}
          </div>
        )}
        
        {/* Indicator pentru mobil - îmbunătățit */}
        {isMobileDevice && !isEditing && (
          <div style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            width: '24px',
            height: '24px',
            backgroundColor: isDragging ? 'rgba(16, 185, 129, 0.9)' : 'rgba(102, 126, 234, 0.9)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: 'white',
            pointerEvents: 'none',
            opacity: isDragging ? 1 : 0.8,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            {isDragging ? '✓' : '⤢'}
          </div>
        )}
        
        {/* Indicator de drag activ pe mobil */}
        {isMobileDevice && isDragging && (
          <div style={{
            position: 'absolute',
            bottom: '-32px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(16, 185, 129, 0.9)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            Poziționare...
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitlePreview;