import React, { useState, useEffect, useRef } from 'react';

const SubtitlePreview = ({ subtitles, currentTime, subtitleStyle, updatePosition }) => {
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const subtitleRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    // Găsește subtitrarea curentă în funcție de timpul video
    const activeSubtitle = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );
    
    setCurrentSubtitle(activeSubtitle);
  }, [subtitles, currentTime]);
  
  // Funcții pentru drag-and-drop
  const handleMouseDown = (e) => {
    if (!subtitleStyle.useCustomPosition) return;
    
    // Începem procesul de drag
    setIsDragging(true);
    
    // Prevenim comportamentul implicit
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging || !subtitleStyle.useCustomPosition || !containerRef.current) return;
    
    // Calculăm noua poziție procentuală bazată pe poziția mouse-ului relativ la container
    const container = containerRef.current.getBoundingClientRect();
    
    // Obținem dimensiunile efective ale player-ului video (nu ale containerului)
    const videoElement = containerRef.current.querySelector('video');
    const videoBounds = videoElement ? videoElement.getBoundingClientRect() : container;
    
    // Calculăm offseturile pentru a ține cont de marginile dintre container și video
    const videoOffsetX = videoBounds.left - container.left;
    const videoOffsetY = videoBounds.top - container.top;
    const videoWidth = videoBounds.width;
    const videoHeight = videoBounds.height;
    
    // Obținem poziția mouse-ului relativă la container
    const mouseX = e.clientX - container.left;
    const mouseY = e.clientY - container.top;
    
    // Verificăm dacă suntem în interiorul video-ului
    const isInsideVideo = 
      mouseX >= videoOffsetX && 
      mouseX <= videoOffsetX + videoWidth &&
      mouseY >= videoOffsetY && 
      mouseY <= videoOffsetY + videoHeight;
    
    if (isInsideVideo) {
      // Calculăm procentele în funcție de dimensiunile video-ului
      const x = ((mouseX - videoOffsetX) / videoWidth) * 100;
      const y = ((mouseY - videoOffsetY) / videoHeight) * 100;
      
      // Limităm coordonatele între 0 și 100 pentru a rămâne în cadrul video-ului
      const boundedX = Math.min(Math.max(0, x), 100);
      const boundedY = Math.min(Math.max(0, y), 100);
      
      // Actualizăm poziția în starea globală
      updatePosition(boundedX, boundedY);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
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
  
  // Formatează textul subtitrării în funcție de numărul maxim de linii
  const formattedText = formatSubtitleText(
    currentSubtitle.text, 
    subtitleStyle.maxLines || 3,
    subtitleStyle.maxWidth || 70,
    subtitleStyle.maxWordsPerLine || 4
  );
  
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
  
  return (
    <div 
      className="subtitle-container"
      ref={containerRef}
    >
      <div 
        ref={subtitleRef}
        className={`subtitle-overlay ${subtitleStyle.useCustomPosition ? 'draggable' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{
          position: 'absolute',
          ...positionStyle,
          maxWidth: `${subtitleStyle.maxWidth || 70}%`,
          textAlign: 'center',
          zIndex: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: subtitleStyle.useCustomPosition ? 'move' : 'default'
        }}
        onMouseDown={handleMouseDown}
      >
        <span
          style={{
            fontFamily: subtitleStyle.fontFamily,
            fontSize: `${subtitleStyle.fontSize}px`,
            color: subtitleStyle.fontColor,
            textShadow: subtitleStyle.borderWidth > 0 ? 
              `-${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor},
               ${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor},
              -${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor},
               ${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor}` 
              : 'none',
            whiteSpace: 'pre-line', // Păstrează întreruperile de linie
            lineHeight: '1.2'
          }}
        >
          {formattedText}
        </span>
      </div>
    </div>
  );
};

// Funcție pentru a formata textul pe mai multe linii în funcție de limitele specificate
const formatSubtitleText = (text, maxLines, maxWidth, maxWordsPerLine) => {
  if (!text) return '';
  
  // Împărțim textul în cuvinte
  const words = text.split(/\s+/);
  
  // Limităm la numărul maxim de cuvinte per linie
  maxWordsPerLine = maxWordsPerLine || 4;
  
  // Distribuim cuvintele pe linii
  const lines = [];
  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    // Luăm maxim maxWordsPerLine cuvinte pentru fiecare linie
    const lineWords = words.slice(i, i + maxWordsPerLine);
    lines.push(lineWords.join(' '));
    
    // Dacă am ajuns la numărul maxim de linii, oprim
    if (lines.length >= maxLines && i + maxWordsPerLine < words.length) {
      // Adăugăm restul cuvintelor la ultima linie
      const remainingWords = words.slice(i + maxWordsPerLine);
      lines[lines.length - 1] += ' ' + remainingWords.join(' ');
      break;
    }
  }
  
  // Combinăm liniile cu caractere de întrerupere linie
  return lines.join('\n');
};

export default SubtitlePreview;