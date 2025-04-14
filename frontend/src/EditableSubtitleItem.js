import React, { useState, useRef, useEffect } from 'react';

const EditableSubtitleItem = ({ subtitle, index, formatTime, updateSubtitle, seekToTime, isActive, subtitleStyle }) => {
  const [text, setText] = useState(subtitle.text);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);
  
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
      textareaRef.current.select();
    }
  }, [isEditing]);
  
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
  const handleSeek = () => {
    seekToTime(subtitle.start);
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
    const words = processedText.split(/\s+/);
    const maxWordsPerLine = subtitleStyle?.maxWordsPerLine || 4;
    
    // Distribuim cuvintele pe linii
    const lines = [];
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      const lineWords = words.slice(i, i + maxWordsPerLine);
      lines.push(lineWords.join(' '));
    }
    
    // Combinăm liniile cu caractere de întrerupere linie
    return lines.join('\n');
  };
  
  return (
    <div className={`subtitle-item ${isActive ? 'active' : ''}`}>
      <div className="subtitle-time" onClick={handleSeek}>
        {formatTime(subtitle.start)} - {formatTime(subtitle.end)}
      </div>
      
      <div 
        className={`subtitle-text editable ${isActive ? 'current' : ''}`}
        onClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="subtitle-textarea"
          />
        ) : (
          <div className="subtitle-content">
            <pre className="subtitle-formatted-text">
              {formatDisplayText(subtitle.text)}
            </pre>
            <span className="edit-hint">Clic pentru editare</span>
          </div>
        )}
      </div>
      
      <div className="subtitle-duration">
        {Math.round((subtitle.end - subtitle.start) * 10) / 10}s
      </div>
    </div>
  );
};

export default EditableSubtitleItem;