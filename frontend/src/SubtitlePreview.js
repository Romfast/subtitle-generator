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
  
  // Monitorizează dimensiunile și poziția video-ului
  useEffect(() => {
    const updateVideoInfo = () => {
      if (containerRef.current) {
        const videoElement = containerRef.current.querySelector('video');
        if (videoElement) {
          const dimensions = getVideoActualDimensions(videoElement);
          setActualVideoSize(dimensions);
          
          // Pe mobil, calculăm poziția exactă a video-ului pe ecran
          if (isMobileDevice) {
            const rect = videoElement.getBoundingClientRect();
            setVideoRect(rect);
          }
          
          console.log('Video info updated:', { dimensions, isMobile: isMobileDevice });
        }
      }
    };
    
    updateVideoInfo();
    
    // Update mai frecvent pe mobil
    const interval = setInterval(updateVideoInfo, isMobileDevice ? 500 : 2000);
    window.addEventListener('resize', updateVideoInfo);
    window.addEventListener('scroll', updateVideoInfo);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateVideoInfo);
      window.removeEventListener('scroll', updateVideoInfo);
    };
  }, [isMobileDevice]);
  
  // Calculează mărimea fontului pentru previzualizare
  const getPreviewFontSize = () => {
    const baseFontSize = subtitleStyle.fontSize || 24;
    const previewWidth = containerRef.current ? 
      containerRef.current.querySelector('video')?.clientWidth || 640 : 640;
    
    // Pe mobil, mărește ușor fontul pentru lizibilitate
    const mobileBonus = isMobileDevice ? 4 : 0;
    const calculatedSize = calculatePreviewFontSize(baseFontSize, previewWidth, actualVideoSize.width) + mobileBonus;
    return Math.max(16, calculatedSize);
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
  
  // Re-formatează textul când se schimbă stilul
  useEffect(() => {
    if (currentSubtitle) {
      const formattedResult = formatSubtitleText(currentSubtitle.text);
      setFormattedDisplay(formattedResult);
    }
  }, [subtitleStyle.allCaps, subtitleStyle.removePunctuation, subtitleStyle.maxWordsPerLine, subtitleStyle.maxLines]);
  
  // Calculează poziția pentru mobile (fixed positioning)
  const getMobilePosition = (customX, customY) => {
    if (!videoRect || !isMobileDevice) return { x: customX, y: customY };
    
    // Convertim procentajele în coordonate absolute pe ecran
    const x = videoRect.left + (videoRect.width * customX / 100);
    const y = videoRect.top + (videoRect.height * customY / 100);
    
    return { 
      x: Math.max(20, Math.min(x, window.innerWidth - 20)), 
      y: Math.max(40, Math.min(y, window.innerHeight - 60))
    };
  };
  
  // Convertește coordonatele absolute înapoi în procente
  const convertToPercentage = (absoluteX, absoluteY) => {
    if (!videoRect || !isMobileDevice) return { x: 50, y: 90 };
    
    const x = ((absoluteX - videoRect.left) / videoRect.width) * 100;
    const y = ((absoluteY - videoRect.top) / videoRect.height) * 100;
    
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
              fontWeight: isCurrentWord ? 'bold' : 'normal',
              fontSize: `${previewFontSize}px`,
              textShadow: subtitleStyle.borderWidth > 0 ? 
                `-${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor},
                 ${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor},
                -${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor},
                 ${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${isCurrentWord ? subtitleStyle.currentWordBorderColor : subtitleStyle.borderColor}` 
                : 'none',
              display: 'inline-block',
              padding: '0 2px',
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
        <div key={`line-${lineIndex}`} className="subtitle-line">
          {lineWithSpaces}
        </div>
      );
    });
  };
  
  // Touch events pentru mobil
  const handleTouchStart = (e) => {
    if (isEditing) return;
    
    const touch = e.touches[0];
    setTouchStartPosition({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging || !videoRect) return;
    
    const touch = e.touches[0];
    const percentage = convertToPercentage(touch.clientX, touch.clientY);
    updatePosition(percentage.x, percentage.y, true);
    
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosition.y);
    
    // Nu permitem editarea pe mobil prin tap
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
  
  // Calculăm poziția finală
  let finalStyle = {};
  
  if (isMobileDevice && videoRect) {
    // Pe mobil folosim fixed positioning pentru a fi deasupra controalelor video
    const mobilePos = getMobilePosition(
      subtitleStyle.customX || 50, 
      subtitleStyle.customY || 85 // Default mai sus pe mobil
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
          maxWidth: `${subtitleStyle.maxWidth || 50}%`,
          minWidth: isMobileDevice ? '120px' : 'auto',
          width: 'auto',
          textAlign: 'center',
          backgroundColor: isMobileDevice ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)',
          padding: isMobileDevice ? '12px 16px' : '8px 12px',
          borderRadius: isMobileDevice ? '12px' : '6px',
          cursor: isEditing ? 'text' : 'move',
          wordBreak: 'break-word',
          minHeight: isMobileDevice ? '48px' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isMobileDevice ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
          border: isDragging && isMobileDevice ? '2px solid rgba(102, 126, 234, 0.8)' : 'none',
          transition: isDragging ? 'none' : 'all 0.3s ease'
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
              lineHeight: isMobileDevice ? '1.4' : '1.3',
              textTransform: subtitleStyle.allCaps ? 'uppercase' : 'none',
              maxWidth: '100%',
              textAlign: 'center',
              fontWeight: isMobileDevice ? '600' : '500'
            }}
          >
            {renderLines()}
          </div>
        )}
        
        {/* Indicator pentru mobil */}
        {isMobileDevice && !isEditing && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '20px',
            height: '20px',
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            pointerEvents: 'none',
            opacity: isDragging ? 1 : 0.8,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'opacity 0.3s ease'
          }}>
            ⤢
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitlePreview;