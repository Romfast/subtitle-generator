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
  showTimeAndDuration = true
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
      
      // UX FIX #5: Haptic feedback for successful save
      if (isMobile && navigator.vibrate) {
        navigator.vibrate(100); // Single long vibration for save confirmation
      }
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
  
  // Handler pentru navigarea la timpul subtitrării - DOAR PE DESKTOP
  const handleSeek = (e) => {
    e.stopPropagation();
    
    // FIX #1: Pe mobil nu navigăm la timpul subtitrării
    if (isMobile) {
      return;
    }
    
    seekToTime(subtitle.start);
    
    // Feedback haptic pe mobil (dacă se dorește în viitor)
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };
  
  // Handler pentru intrarea în modul editare
  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    
    // UX FIX #5: Enhanced haptic feedback
    if (isMobile && navigator.vibrate) {
      navigator.vibrate([50, 25, 50]); // Double tap pattern for edit mode
    }
  };
  
  // Handler pentru click pe container - FIX #1: Diferit pentru mobile vs desktop
  const handleContainerClick = (e) => {
    e.stopPropagation();
    
    if (isMobile) {
      // Pe mobil, doar editare - nu seek
      if (!isEditing) {
        handleEditClick(e);
      }
    } else {
      // Pe desktop, seek la timp
      if (!isEditing) {
        handleSeek(e);
      }
    }
  };
  
  // Formatăm text pentru afișare - calculare automată cuvinte pe linii
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
    
    // FIX #9: Calculare automată cuvinte pe linii
    const words = processedText.split(/\s+/).filter(word => word.length > 0);
    const maxLines = Math.max(1, subtitleStyle?.maxLines || 2);
    
    // Estimăm că un cuvânt mediu are ~6 caractere
    const avgWordLength = 6;
    const maxCharsPerLine = Math.floor((70 * 40) / 100); // 70% din ~40 caractere per linie la rezoluție standard
    const maxWordsPerLine = Math.max(2, Math.floor(maxCharsPerLine / avgWordLength));
    
    // Distribuim cuvintele pe linii
    const lines = [];
    let remainingWords = [...words];
    
    for (let lineIdx = 0; lineIdx < maxLines && remainingWords.length > 0; lineIdx++) {
      // Calculăm câte cuvinte încap pe linia curentă
      let lineWords = [];
      let currentLineLength = 0;
      
      while (remainingWords.length > 0 && lineWords.length < maxWordsPerLine) {
        const nextWord = remainingWords[0];
        const wouldBeLength = currentLineLength + (lineWords.length > 0 ? 1 : 0) + nextWord.length;
        
        if (wouldBeLength <= maxCharsPerLine || lineWords.length === 0) {
          lineWords.push(remainingWords.shift());
          currentLineLength = wouldBeLength;
        } else {
          break;
        }
      }
      
      if (lineWords.length > 0) {
        lines.push(lineWords.join(' '));
      }
    }
    
    // Dacă mai există cuvinte rămase și am atins numărul maxim de linii,
    // adaugă restul la ultima linie
    if (remainingWords.length > 0 && lines.length === maxLines) {
      lines[maxLines - 1] += ' ' + remainingWords.join(' ');
    }
    
    // Combinăm liniile cu caractere de întrerupere linie
    return lines.join('\n');
  };
  
  // FIX #1: Layout simplificat pentru mobil - fără timp
  if (isMobile) {
    return (
      <div 
        className={`subtitle-mobile-item ${isActive ? 'active' : ''}`}
        style={{ 
          position: 'relative',
          width: '100%',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          backgroundColor: isActive ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
          cursor: 'pointer'
        }}
        onClick={handleContainerClick}
      >
        {/* Doar zona de text editabilă pe mobil */}
        <div style={{
          width: '100%',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {isEditing ? (
            <div style={{ width: '100%' }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: '1.4'
                }}
                placeholder="Introduceți textul subtitrării..."
              />
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '4px',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Atingeți în afara pentru a salva
              </div>
            </div>
          ) : (
            <pre style={{
              margin: 0,
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.4',
              color: isActive ? '#1e293b' : '#374151',
              fontWeight: isActive ? '600' : '500',
              width: '100%'
            }}>
              {formatDisplayText(subtitle.text)}
            </pre>
          )}
        </div>
        
        {/* Indicator pentru numărul de cuvinte pe mobil */}
        {!isEditing && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            color: '#667eea',
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: '600',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            {subtitle.text.split(' ').length}w
          </div>
        )}
      </div>
    );
  }
  
  // Layout complet pentru desktop
  if (!showTimeAndDuration) {
    // Layout simplificat pentru lista compactă desktop
    return (
      <div 
        className={`subtitle-text-only-item ${isActive ? 'active' : ''}`}
        style={{ 
          position: 'relative',
          width: '100%',
          padding: '8px 0'
        }}
      >
        <div 
          className={`subtitle-text editable ${isActive ? 'current' : ''}`}
          onClick={!isEditing ? handleEditClick : undefined}
          style={{
            cursor: isEditing ? 'text' : 'pointer',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: isEditing ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
            border: isEditing ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
            transition: 'all 0.2s ease',
            fontSize: '0.8rem'
          }}
        >
          {isEditing ? (
            <div style={{ width: '100%' }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                  lineHeight: '1.3'
                }}
                placeholder="Introduceți textul subtitrării..."
              />
              <div style={{
                fontSize: '0.65rem',
                color: '#64748b',
                marginTop: '2px',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Enter pentru salvare • Esc pentru anulare
              </div>
            </div>
          ) : (
            <pre style={{
              margin: 0,
              fontSize: 'inherit',
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.3',
              color: isActive ? '#1e293b' : '#374151',
              fontWeight: isActive ? '600' : '500'
            }}>
              {formatDisplayText(subtitle.text)}
            </pre>
          )}
        </div>
      </div>
    );
  }
  
  // SCHIMBAT: Layout complet pentru desktop cu doar timp start și text (fără timp sfârșit și durată)
  return (
    <div 
      className={`subtitle-item ${isActive ? 'active' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr', // SCHIMBAT: doar 2 coloane în loc de 3
        gap: '12px',
        padding: '12px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        alignItems: 'center',
        transition: 'all 0.2s ease',
        backgroundColor: isActive ? 'rgba(102, 126, 234, 0.05)' : 'transparent'
      }}
    >
      {/* Coloana timp start - clicabilă pentru seek */}
      <div 
        className="subtitle-time" 
        onClick={handleSeek}
        style={{
          cursor: 'pointer',
          fontSize: '0.75rem',
          color: isActive ? '#667eea' : '#64748b',
          fontWeight: isActive ? '700' : '600',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: isActive ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
          transition: 'all 0.2s ease',
          textAlign: 'center',
          lineHeight: '1.2'
        }}
        title="Clic pentru a sări la acest moment"
      >
        {formatTime(subtitle.start)} {/* SCHIMBAT: doar timpul de start */}
      </div>
      
      {/* Coloana text - editabilă */}
      <div 
        className={`subtitle-text editable ${isActive ? 'current' : ''}`}
        onClick={!isEditing ? handleEditClick : undefined}
        style={{
          cursor: isEditing ? 'text' : 'pointer',
          flex: 1,
          minWidth: 0,
          padding: '8px',
          borderRadius: '8px',
          backgroundColor: isEditing ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
          border: isEditing ? '2px solid rgba(102, 126, 234, 0.3)' : '2px solid transparent',
          transition: 'all 0.2s ease'
        }}
      >
        {isEditing ? (
          <div style={{ width: '100%' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                lineHeight: '1.4'
              }}
              placeholder="Introduceți textul subtitrării..."
            />
            <div style={{
              fontSize: '0.7rem',
              color: '#64748b',
              marginTop: '4px',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              Enter pentru salvare • Esc pentru anulare
            </div>
          </div>
        ) : (
          <pre style={{
            margin: 0,
            fontSize: '0.8rem',
            fontFamily: 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.3',
            color: isActive ? '#1e293b' : '#374151',
            fontWeight: isActive ? '600' : '500'
          }}>
            {formatDisplayText(subtitle.text)}
          </pre>
        )}
      </div>
      
      {/* ELIMINAT: Coloana durată */}
    </div>
  );
};

export default EditableSubtitleItem;