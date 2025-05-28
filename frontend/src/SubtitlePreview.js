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
  
  // Calculează mărimea fontului pentru previzualizare - optimizată pentru mobil REACTIVE
  const getPreviewFontSize = () => {
    const baseFontSize = subtitleStyle.fontSize || 24;
    const previewWidth = containerRef.current ? 
      containerRef.current.querySelector('video')?.clientWidth || 640 : 640;
    
    // Pe mobil, mărește fontul pentru lizibilitate și adaptează la viewport
    let mobileBonus = 0;
    if (isMobileDevice) {
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 480) {
        mobileBonus = 8; // Pentru telefoane foarte mici
      } else if (viewportWidth < 768) {
        mobileBonus = 6; // Pentru telefoane obișnuite
      } else {
        mobileBonus = 4; // Pentru tablete
      }
    }
    
    const calculatedSize = calculatePreviewFontSize(baseFontSize, previewWidth, actualVideoSize.width) + mobileBonus;
    const minSize = isMobileDevice ? 20 : 16; // Mărime minimă mai mare pe mobil
    const finalSize = Math.max(minSize, calculatedSize);
    
    console.log('Font size calculation:', {
      baseFontSize,
      previewWidth,
      actualVideoWidth: actualVideoSize.width,
      mobileBonus,
      calculatedSize,
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
  
  // Re-formatează textul când se schimbă stilul - EXTENDED
  useEffect(() => {
    if (currentSubtitle) {
      const formattedResult = formatSubtitleText(currentSubtitle.text);
      setFormattedDisplay(formattedResult);
      
      // Force re-render când se schimbă stilul
      console.log('Subtitle style changed, re-rendering with:', {
        fontSize: subtitleStyle.fontSize,
        fontFamily: subtitleStyle.fontFamily,
        fontColor: subtitleStyle.fontColor,
        allCaps: subtitleStyle.allCaps
      });
    }
  }, [
    currentSubtitle,
    subtitleStyle.allCaps, 
    subtitleStyle.removePunctuation, 
    subtitleStyle.maxWordsPerLine, 
    subtitleStyle.maxLines,
    subtitleStyle.fontSize,        // ADDED
    subtitleStyle.fontFamily,      // ADDED  
    subtitleStyle.fontColor,       // ADDED
    subtitleStyle.borderColor,     // ADDED
    subtitleStyle.borderWidth,     // ADDED
    subtitleStyle.useCustomPosition, // ADDED
    subtitleStyle.customX,         // ADDED
    subtitleStyle.customY          // ADDED
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
  
  // Touch events pentru mobil - îmbunătățite
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
    if (!isDragging || !videoRect) return;
    
    const touch = e.touches[0];
    const percentage = convertToPercentage(touch.clientX, touch.clientY);
    
    // Debug pentru mobil
    console.log('Touch move:', {
      touchX: touch.clientX,
      touchY: touch.clientY,
      percentageX: percentage.x,
      percentageY: percentage.y,
      videoRect,
      screenWidth: window.innerWidth
    });
    
    updatePosition(percentage.x, percentage.y, true);
    
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
  
  // Mouse events pentru desktop
  const handleMouseDown = (e) => {
    if (isEditing || isMobileDevice) return;
    
    if (e.button === 2 || e.detail === 2) {
      e.preventDefault();
      handleSubtitleClick();
      return;
    }
    
    setIsDragging(true);
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current || isMobileDevice) return;
    
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
  
  // Event listeners pentru mouse (desktop)
  useEffect(() => {
    if (isDragging && !isMobileDevice) {
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
  
  // Calculăm poziția finală - optimizată pentru mobil
  let finalStyle = {};
  
  if (isMobileDevice && videoRect) {
    // Pe mobil folosim fixed positioning pentru a fi deasupra controalelor video
    const mobilePos = getMobilePosition(
      subtitleStyle.customX || 50, 
      subtitleStyle.customY || 80 // Default mai sus pe mobil pentru a evita controalele
    );
    
    finalStyle = {
      position: 'fixed',
      left: `${mobilePos.x}px`,
      top: `${mobilePos.y}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: 9999, // Foarte mare pentru mobil
    };
  } else {
    // Pe desktop folosim positioning normal
    const positionStyle = subtitleStyle.useCustomPosition
      ? {
          left: `${subtitleStyle.customX || 50}%`,
          top: `${subtitleStyle.customY || 90}%`,
          transform: 'translate(-50%, -50%)'
        }
      : {
          top: subtitleStyle.position.includes('top') ? '10%' : 
               subtitleStyle.position.includes('middle') ? '50%' : 
               '85%',
          left: subtitleStyle.position.includes('left') ? '10%' : 
                subtitleStyle.position.includes('right') ? '90%' : 
                '50%',
          transform: `translate(${subtitleStyle.position.includes('left') ? '0' : 
                                subtitleStyle.position.includes('right') ? '-100%' : 
                                '-50%'}, -50%)`
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
        onMouseDown={!isMobileDevice ? handleMouseDown : undefined}
        onClick={(!isMobileDevice && !isEditing) ? handleSubtitleClick : undefined}
        onTouchStart={isMobileDevice ? handleTouchStart : undefined}
        onTouchMove={isMobileDevice ? handleTouchMove : undefined}
        onTouchEnd={isMobileDevice ? handleTouchEnd : undefined}
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