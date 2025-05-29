import React, { useState, useRef, useEffect } from 'react';

const EditableSubtitleItem = ({ 
  subtitle, 
  index, 
  formatTime, 
  updateSubtitle, 
  seekToTime, 
  isActive, 
  subtitleStyle, 
  compact = false, 
  showTimeAndDuration = true  // NEW PROP: controls layout type
}) => {
  const [text, setText] = useState(subtitle.text);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef(null);
  
  // Detectare mobil
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Actualizăm starea locală când se schimbă subtitrarea din exterior
  useEffect(() => {
    if (!isEditing) {
      setText(subtitle.text);
    }
  }, [subtitle.text, isEditing]);
  
  // Focus automat la intrarea în modul de editare
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      if (isMobile) {
        // Pe mobil, scroll la textarea pentru vizibilitate
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
      } else {
        textareaRef.current.select();
      }
    }
  }, [isEditing, isMobile]);
  
  // Handler pentru modificarea textului
  const handleTextChange = (e) => {
    setText(e.target.value);
  };
  
  // Handler pentru salvarea modificărilor când utilizatorul apasă Enter sau pierde focusul
  const handleSave = () => {
    if (text !== subtitle.text) {
      updateSubtitle(index, text);
    }
    setIsEditing(false);
  };
  
  // Handler pentru când utilizatorul apasă tastele
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setText(subtitle.text);
      setIsEditing(false);
    }
  };
  
  // Handler pentru navigarea la timpul subtitrării
  const handleSeek = (e) => {
    e.stopPropagation();
    seekToTime(subtitle.start);
    
    // Feedback haptic pe mobil
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };
  
  // Handler pentru intrarea în modul editare
  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    
    // Feedback haptic pe mobil
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  // Formatăm text pentru afișare - respectă numărul maxim de cuvinte per linie
  const formatDisplayText = (text) => {
    if (!text) return '';
    
    // Aplicăm ALL CAPS dacă este activat
    let processedText = text;
    if (subtitleStyle?.allCaps) {
      processedText = processedText.toUpperCase();
    }
    
    // Eliminăm semnele de punctuație dacă este activat
    if (subtitleStyle?.removePunctuation) {
      processedText = processedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      processedText = processedText.replace(/\s{2,}/g, " "); // eliminăm spațiile multiple
    }
    
    // Împărțim textul în cuvinte
    const words = processedText.split(/\s+/).filter(word => word.length > 0);
    const maxWordsPerLine = Math.max(1, Math.min(subtitleStyle?.maxWordsPerLine || 3, 4)); // între 1 și 4 cuvinte
    const maxLines = Math.max(1, subtitleStyle?.maxLines || 1); // minim 1 linie
    
    // Distribuim cuvintele pe linii
    const lines = [];
    let remainingWords = [...words];
    
    for (let lineIdx = 0; lineIdx < maxLines && remainingWords.length > 0; lineIdx++) {
      // Ia maxim maxWordsPerLine cuvinte pentru linia curentă
      const lineWords = remainingWords.slice(0, maxWordsPerLine);
      lines.push(lineWords.join(' '));
      
      // Elimină cuvintele deja folosite
      remainingWords = remainingWords.slice(maxWordsPerLine);
    }
    
    // Dacă mai există cuvinte rămase și am atins numărul maxim de linii,
    // adaugă restul la ultima linie
    if (remainingWords.length > 0 && lines.length === maxLines) {
      lines[maxLines - 1] += ' ' + remainingWords.join(' ');
    }
    
    // Combinăm liniile cu caractere de întrerupere linie
    return lines.join('\n');
  };
  
  // Calculăm durata pentru afișare
  const duration = Math.round((subtitle.end - subtitle.start) * 10) / 10;
  
  // ========== LAYOUT SIMPLIFICAT PENTRU LISTA COMPACTA ========== 
  if (!showTimeAndDuration) {
    // Layout simplificat: doar textul editabil (timpul e afișat separat)
    return (
      <div 
        className={`subtitle-text-only-item ${isActive ? 'active' : ''} ${isMobile ? 'mobile-item' : ''}`}
        style={{ 
          position: 'relative',
          width: '100%',
          padding: '4px 0'
        }}
      >
        {/* Doar zona de text editabilă */}
        <div 
          className={`subtitle-text editable ${isActive ? 'current' : ''} ${isMobile ? 'mobile-text' : ''}`}
          onClick={!isEditing ? handleEditClick : undefined}
          style={{
            cursor: isEditing ? 'text' : 'pointer',
            width: '100%',
            padding: isMobile ? '8px 12px' : '6px 8px',
            borderRadius: '6px',
            backgroundColor: isEditing ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
            border: isEditing ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
            transition: 'all 0.2s ease',
            fontSize: compact ? (isMobile ? '0.8rem' : '0.75rem') : (isMobile ? '0.85rem' : '0.8rem')
          }}
        >
          {isEditing ? (
            <div className="subtitle-edit-container" style={{ width: '100%' }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={`subtitle-textarea ${isMobile ? 'mobile-textarea' : ''}`}
                style={{
                  width: '100%',
                  minHeight: isMobile ? '60px' : '50px',
                  padding: isMobile ? '8px' : '6px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  fontSize: isMobile ? '0.85rem' : '0.8rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                  lineHeight: '1.3'
                }}
                placeholder="Introduceți textul subtitrării..."
              />
              <div 
                className="edit-instructions"
                style={{
                  fontSize: isMobile ? '0.7rem' : '0.65rem',
                  color: '#64748b',
                  marginTop: '2px',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}
              >
                {isMobile 
                  ? 'Atingeți în afara pentru a salva' 
                  : 'Enter pentru salvare • Esc pentru anulare'
                }
              </div>
            </div>
          ) : (
            <div className="subtitle-content" style={{ width: '100%' }}>
              <pre 
                className="subtitle-formatted-text"
                style={{
                  margin: 0,
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: isMobile ? '1.3' : '1.2',
                  color: isActive ? '#1e293b' : '#374151',
                  fontWeight: isActive ? '600' : '500'
                }}
              >
                {formatDisplayText(subtitle.text)}
              </pre>
            </div>
          )}
        </div>
        
        {/* Indicator pentru numărul de cuvinte pe mobil */}
        {isMobile && !isEditing && (
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              right: '4px',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              fontSize: '0.6rem',
              padding: '1px 4px',
              borderRadius: '6px',
              fontWeight: '600',
              border: '1px solid rgba(102, 126, 234, 0.2)'
            }}
          >
            {subtitle.text.split(' ').length}w
          </div>
        )}
      </div>
    );
  }
  
  // ========== LAYOUT COMPLET ORIGINAL ========== 
  return (
    <div className={`subtitle-item ${isActive ? 'active' : ''} ${isMobile ? 'mobile-item' : ''}`}>
      {/* Coloana timp - clicabilă pentru seek */}
      <div 
        className={`subtitle-time ${isMobile ? 'mobile-time' : ''}`} 
        onClick={handleSeek}
        style={{
          cursor: 'pointer',
          fontSize: isMobile ? '0.75rem' : '0.8rem',
          color: isActive ? '#667eea' : '#64748b',
          fontWeight: isActive ? '700' : '600',
          padding: isMobile ? '4px 8px' : '4px',
          borderRadius: '6px',
          backgroundColor: isActive ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
          transition: 'all 0.2s ease',
          textAlign: 'center',
          lineHeight: isMobile ? '1.2' : '1.3',
          minHeight: isMobile ? '32px' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={isMobile ? 'Atingeți pentru a sări la acest moment' : 'Clic pentru a sări la acest moment'}
      >
        <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
          {formatTime(subtitle.start)}
          <br />
          {formatTime(subtitle.end)}
        </div>
      </div>
      
      {/* Coloana text - editabilă */}
      <div 
        className={`subtitle-text editable ${isActive ? 'current' : ''} ${isMobile ? 'mobile-text' : ''}`}
        onClick={!isEditing ? handleEditClick : undefined}
        style={{
          cursor: isEditing ? 'text' : 'pointer',
          flex: 1,
          minWidth: 0,
          padding: isMobile ? '8px 12px' : '8px',
          borderRadius: '8px',
          backgroundColor: isEditing ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
          border: isEditing ? '2px solid rgba(102, 126, 234, 0.3)' : '2px solid transparent',
          transition: 'all 0.2s ease'
        }}
      >
        {isEditing ? (
          <div className="subtitle-edit-container" style={{ width: '100%' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={`subtitle-textarea ${isMobile ? 'mobile-textarea' : ''}`}
              style={{
                width: '100%',
                minHeight: isMobile ? '80px' : '60px',
                padding: isMobile ? '12px' : '8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                fontSize: isMobile ? '0.9rem' : '0.85rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                lineHeight: '1.4'
              }}
              placeholder="Introduceți textul subtitrării..."
            />
            <div 
              className="edit-instructions"
              style={{
                fontSize: isMobile ? '0.75rem' : '0.7rem',
                color: '#64748b',
                marginTop: '4px',
                textAlign: 'center',
                fontStyle: 'italic'
              }}
            >
              {isMobile 
                ? 'Atingeți în afara pentru a salva' 
                : 'Enter pentru salvare • Esc pentru anulare'
              }
            </div>
          </div>
        ) : (
          <div className="subtitle-content" style={{ width: '100%' }}>
            <pre 
              className="subtitle-formatted-text"
              style={{
                margin: 0,
                fontSize: compact ? (isMobile ? '0.8rem' : '0.75rem') : (isMobile ? '0.85rem' : '0.8rem'),
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: isMobile ? '1.4' : '1.3',
                color: isActive ? '#1e293b' : '#374151',
                fontWeight: isActive ? '600' : '500'
              }}
            >
              {formatDisplayText(subtitle.text)}
            </pre>
          </div>
        )}
      </div>
      
      {/* Coloana durată */}
      <div 
        className={`subtitle-duration ${isMobile ? 'mobile-duration' : ''}`}
        style={{
          fontSize: isMobile ? '0.75rem' : '0.8rem',
          color: isActive ? '#667eea' : '#64748b',
          fontWeight: '600',
          textAlign: 'center',
          padding: isMobile ? '4px' : '4px 8px',
          minWidth: isMobile ? '35px' : '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          backgroundColor: isActive ? 'rgba(102, 126, 234, 0.1)' : 'transparent'
        }}
        title={`Durata: ${duration} secunde`}
      >
        {duration}s
      </div>
      
      {/* Indicator activ pe mobil */}
      {isMobile && isActive && (
        <div 
          style={{
            position: 'absolute',
            left: '-4px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '4px',
            height: '60%',
            backgroundColor: '#667eea',
            borderRadius: '0 4px 4px 0',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
          }}
        />
      )}
      
      {/* Badge pentru numărul de cuvinte pe mobil */}
      {isMobile && !isEditing && (
        <div 
          style={{
            position: 'absolute',
            top: '4px',
            right: '8px',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            color: '#667eea',
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: '8px',
            fontWeight: '600',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}
        >
          {subtitle.text.split(' ').length}w
        </div>
      )}
    </div>
  );
};

export default EditableSubtitleItem;