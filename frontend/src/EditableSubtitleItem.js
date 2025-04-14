import React, { useState } from 'react';

const EditableSubtitleItem = ({ subtitle, index, formatTime, updateSubtitle, seekToTime }) => {
  const [text, setText] = useState(subtitle.text);
  const [isEditing, setIsEditing] = useState(false);
  
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
  
  return (
    <div className="subtitle-item">
      <div className="subtitle-time" onClick={() => seekToTime(subtitle.start)}>
        {formatTime(subtitle.start)} - {formatTime(subtitle.end)}
      </div>
      
      <div 
        className="subtitle-text editable"
        onClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            value={text}
            onChange={handleTextChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="subtitle-textarea"
          />
        ) : (
          <div className="subtitle-content">
            {subtitle.text}
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