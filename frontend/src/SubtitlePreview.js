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
  const subtitleRef = useRef(null);
  const containerRef = useRef(null);
  const editTextareaRef = useRef(null);
  
  // Monitorizează dimensiunile video-ului pentru calculul consistent al mărimii fontului
  useEffect(() => {
    const updateVideoSize = () => {
      if (containerRef.current) {
        const videoElement = containerRef.current.querySelector('video');
        if (videoElement) {
          const dimensions = getVideoActualDimensions(videoElement);
          setActualVideoSize(dimensions);
          console.log('Video dimensions updated:', dimensions);
        }
      }
    };
    
    // Actualizează dimensiunile la încărcarea video-ului și la resize
    updateVideoSize();
    window.addEventListener('resize', updateVideoSize);
    
    // Verifică periodic dacă video-ul s-a încărcat
    const checkVideoInterval = setInterval(updateVideoSize, 1000);
    
    return () => {
      window.removeEventListener('resize', updateVideoSize);
      clearInterval(checkVideoInterval);
    };
  }, []);
  
  // Calculează mărimea fontului pentru previzualizare care să corespundă cu video-ul final
  const getPreviewFontSize = () => {
    const baseFontSize = subtitleStyle.fontSize || 24;
    const previewWidth = containerRef.current ? 
      containerRef.current.querySelector('video')?.clientWidth || 640 : 640;
    
    const calculatedSize = calculatePreviewFontSize(baseFontSize, previewWidth, actualVideoSize.width);
    console.log(`Preview font size: base=${baseFontSize}, preview_width=${previewWidth}, video_width=${actualVideoSize.width}, result=${calculatedSize}`);
    return calculatedSize;
  };
  
  // Formatează textul subtitrării în funcție de numărul maxim de linii și cuvinte per linie
  const formatSubtitleText = (text) => {
    if (!text) return { lines: [], allWords: [] };
    
    // Aplicăm ALL CAPS dacă este activat
    let processedText = text;
    if (subtitleStyle.allCaps) {
      processedText = processedText.toUpperCase();
    }
    
    // Eliminăm semnele de punctuație dacă este selectat
    if (subtitleStyle.removePunctuation) {
      processedText = processedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      processedText = processedText.replace(/\s{2,}/g, " "); // eliminăm spațiile multiple
    }
    
    // Împărțim textul în cuvinte
    const allWords = processedText.split(/\s+/).filter(word => word.length > 0);
    
    // Obținem limitele din stilul subtitrării
    const maxWordsPerLine = parseInt(subtitleStyle.maxWordsPerLine || 3, 10); 
    const maxLines = parseInt(subtitleStyle.maxLines || 1, 10);
    
    // Distribuim cuvintele pe linii
    const lines = [];
    
    // Ia câte maxWordsPerLine cuvinte la fiecare linie
    for (let i = 0; i < allWords.length && lines.length < maxLines; i += maxWordsPerLine) {
      const lineWords = allWords.slice(i, i + maxWordsPerLine);
      lines.push(lineWords.join(' '));
    }
    
    // Dacă avem mai multe cuvinte decât încap în maxLines cu maxWordsPerLine,
    // restul le adăugăm la ultima linie
    if (allWords.length > maxLines * maxWordsPerLine && lines.length === maxLines) {
      const extraWords = allWords.slice(maxLines * maxWordsPerLine);
      if (extraWords.length > 0) {
        lines[maxLines - 1] += ' ' + extraWords.join(' ');
      }
    }
    
    return { lines, allWords };
  };
  
  // Evidențiază cuvântul curent în funcție de timpul de redare
  useEffect(() => {
    // Găsește subtitrarea curentă în funcție de timpul video
    const activeSubtitle = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );
    
    if (activeSubtitle !== currentSubtitle) {
      setCurrentSubtitle(activeSubtitle);
      if (activeSubtitle && !isEditing) {
        setEditText(activeSubtitle.text);
        
        // Resetăm cuvântul evidențiat la schimbarea subtitrării
        setCurrentWordIndex(0);
        
        // Formatăm textul subtitrării
        const formattedResult = formatSubtitleText(activeSubtitle.text);
        setFormattedDisplay(formattedResult);
      }
    } else if (activeSubtitle && formattedDisplay.allWords.length > 0 && subtitleStyle.useKaraoke === true) {
      // Actualizăm cuvântul curent bazat pe timp doar dacă subtitrarea e aceeași și useKaraoke este activat
      const duration = activeSubtitle.end - activeSubtitle.start;
      const relativeTime = currentTime - activeSubtitle.start;
      const wordDuration = duration / formattedDisplay.allWords.length;
      
      // Calculăm indexul cuvântului curent
      const wordIndex = Math.min(
        Math.floor(relativeTime / wordDuration),
        formattedDisplay.allWords.length - 1
      );
      
      if (wordIndex !== currentWordIndex && wordIndex >= 0) {
        setCurrentWordIndex(wordIndex);
      }
    }
  }, [subtitles, currentTime, isEditing, subtitleStyle.allCaps, subtitleStyle.removePunctuation, subtitleStyle.maxWordsPerLine, subtitleStyle.maxLines, subtitleStyle.useKaraoke]);
  
  // Acest efect re-formatează textul când se schimbă opțiunile de stil
  useEffect(() => {
    if (currentSubtitle) {
      const formattedResult = formatSubtitleText(currentSubtitle.text);
      setFormattedDisplay(formattedResult);
    }
  }, [subtitleStyle.allCaps, subtitleStyle.removePunctuation, subtitleStyle.maxWordsPerLine, subtitleStyle.maxLines]);
  
  // Funcția pentru a genera elementele JSX pentru cuvinte
  const renderLines = () => {
    if (!currentSubtitle || formattedDisplay.lines.length === 0) return null;
    
    // Calculăm mărimea fontului pentru previzualizare
    const previewFontSize = getPreviewFontSize();
    
    // Afișează fiecare linie, respectând limitele de cuvinte pe linie
    return formattedDisplay.lines.map((line, lineIndex) => {
      // Împărțim linia în cuvinte individuale
      const lineWords = line.split(/\s+/).filter(w => w.length > 0);
      
      // Calculăm indexul global al primului cuvânt din această linie
      let globalWordIndex = 0;
      for (let i = 0; i < lineIndex; i++) {
        globalWordIndex += formattedDisplay.lines[i].split(/\s+/).filter(w => w.length > 0).length;
      }
      
      // Construim JSX pentru fiecare cuvânt din această linie
      const wordElements = lineWords.map((word, wordIndex) => {
        // Verificăm dacă evidențierea cuvintelor este activată
        const isCurrentWord = subtitleStyle.useKaraoke === true && 
                         (globalWordIndex + wordIndex) === currentWordIndex;
        
        return (
          <span
            key={`word-${lineIndex}-${wordIndex}`}
            className={`subtitle-word ${isCurrentWord ? 'highlighted' : ''}`}
            style={{
              color: isCurrentWord ? subtitleStyle.currentWordColor : subtitleStyle.fontColor,
              fontWeight: isCurrentWord ? 'bold' : 'normal',
              fontSize: `${previewFontSize}px`, // Folosim mărimea calculată pentru consistență
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
      
      // Adăugăm spații între cuvinte
      const lineWithSpaces = [];
      for (let i = 0; i < wordElements.length; i++) {
        lineWithSpaces.push(wordElements[i]);
        if (i < wordElements.length - 1) {
          lineWithSpaces.push(<span key={`space-${lineIndex}-${i}`}> </span>);
        }
      }
      
      // Returnăm linia completă
      return (
        <div key={`line-${lineIndex}`} className="subtitle-line">
          {lineWithSpaces}
        </div>
      );
    });
  };
  
  // Funcție pentru a începe drag fără a necesita checkbox
  const handleMouseDown = (e) => {
    if (isEditing) return;
    
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
  
  // Handler pentru click pe subtitrare (începe editarea)
  const handleSubtitleClick = () => {
    if (!currentSubtitle || isDragging) return;
    
    setIsEditing(true);
    setEditText(currentSubtitle.text);
  };
  
  // Handler pentru modificarea textului în modul editare
  const handleTextChange = (e) => {
    setEditText(e.target.value);
  };
  
  // Handler pentru salvarea modificărilor
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
  
  // Handler pentru când utilizatorul apasă tastele în câmpul de editare
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(currentSubtitle?.text || '');
    }
  };
  
  // Focus automat când se intră în modul de editare
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
    }
  }, [isEditing]);
  
  // Adăugăm și eliminăm event listenerii pentru mouse move și up
  useEffect(() => {
    if (isDragging) {
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
  }, [isDragging]);
  
  // Dacă nu există subtitrare activă pentru timpul curent, nu afișăm nimic
  if (!currentSubtitle) return null;
  
  // Calculăm stilul poziției în funcție de setările utilizatorului
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
  
  // Calculăm mărimea fontului pentru previzualizare
  const previewFontSize = getPreviewFontSize();
  
  return (
    <div 
      className="subtitle-container"
      ref={containerRef}
    >
      <div 
        ref={subtitleRef}
        className={`subtitle-overlay ${isDragging ? 'dragging' : ''}`}
        style={{
          position: 'absolute',
          ...positionStyle,
          maxWidth: `${subtitleStyle.maxWidth || 50}%`,
          width: 'auto',
          textAlign: 'center',
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: isEditing ? 'text' : 'move',
          wordBreak: 'break-word'
        }}
        onMouseDown={handleMouseDown}
        onClick={isEditing ? undefined : handleSubtitleClick}
      >
        {isEditing ? (
          // Interfață de editare
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
                fontSize: `${previewFontSize}px`, // Folosim mărimea calculată și pentru editare
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: subtitleStyle.fontColor,
                border: `1px solid ${subtitleStyle.fontColor}`,
                padding: '5px',
                borderRadius: '3px',
                minHeight: '60px',
                resize: 'none'
              }}
            />
            <div className="edit-instructions">
              Apasă Enter pentru a salva sau Esc pentru a anula
            </div>
          </div>
        ) : (
          // Afișare normală subtitrare
          <div
            style={{
              fontFamily: subtitleStyle.fontFamily,
              fontSize: `${previewFontSize}px`, // Folosim mărimea calculată pentru consistență
              color: subtitleStyle.fontColor,
              lineHeight: '1.2',
              textTransform: subtitleStyle.allCaps ? 'uppercase' : 'none',
              maxWidth: '100%'
            }}
          >
            {renderLines()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitlePreview;