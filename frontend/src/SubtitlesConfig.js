import React, { useState, useEffect } from 'react';

// Adăugăm o listă de culori predefinite
const predefinedColors = {
  text: [
    { name: 'Alb', value: '#FFFFFF' },
    { name: 'Galben', value: '#FFFF00' },
    { name: 'Verde', value: '#00FF00' },
    { name: 'Cyan', value: '#00FFFF' },
    { name: 'Roz', value: '#FF00FF' },
    { name: 'Roșu', value: '#FF0000' },
    { name: 'Portocaliu', value: '#FFA500' },
  ],
  border: [
    { name: 'Negru', value: '#000000' },
    { name: 'Gri', value: '#333333' },
    { name: 'Albastru', value: '#000080' },
    { name: 'Verde', value: '#006400' },
    { name: 'Maro', value: '#8B4513' },
  ],
  highlight: [
    { name: 'Galben', value: '#FFFF00' },
    { name: 'Roșu', value: '#FF0000' },
    { name: 'Verde', value: '#39FF14' },
    { name: 'Albastru', value: '#00BFFF' },
    { name: 'Portocaliu', value: '#FF6600' },
    { name: 'Roz', value: '#FF69B4' },
  ]
};

const SubtitlesConfig = ({ subtitleStyle, handleStyleChange, compact = false }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [useCustomPosition, setUseCustomPosition] = useState(subtitleStyle.useCustomPosition || false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectare mobil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const toggleCustomPosition = () => {
    const newValue = !useCustomPosition;
    setUseCustomPosition(newValue);
    
    // Actualizăm starea globală
    const event = {
      target: {
        name: 'useCustomPosition',
        value: newValue
      }
    };
    handleStyleChange(event);
  };

  // Handler pentru toggles/checkboxes
  const handleToggleChange = (name) => {
    const newValue = !subtitleStyle[name];
    handleStyleChange({
      target: {
        name,
        value: newValue
      }
    });
  };

  // Handler pentru actualizarea poziției X și Y
  const handlePositionChange = (e) => {
    const { name, value } = e.target;
    handleStyleChange({
      target: {
        name,
        value: parseInt(value, 10)
      }
    });
  };

  // Handler pentru selectarea unei culori predefinite
  const handlePredefinedColorSelect = (name, colorValue) => {
    handleStyleChange({
      target: {
        name,
        value: colorValue
      }
    });
  };

  // Componentă pentru selectorul de culori predefinite
  const PredefinedColorSelector = ({ colorType, currentColor, colorName }) => {
    if (compact) {
      // Versiune compactă - doar 3-4 culori principale
      const limitedColors = predefinedColors[colorType].slice(0, compact ? 4 : 7);
      return (
        <div className="predefined-colors compact">
          <div className="color-swatches compact">
            {limitedColors.map((color, index) => (
              <div 
                key={index}
                className={`color-swatch compact ${currentColor === color.value ? 'selected' : ''}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
                onClick={() => handlePredefinedColorSelect(colorName, color.value)}
              ></div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="predefined-colors">
        <div className="color-swatches">
          {predefinedColors[colorType].map((color, index) => (
            <div 
              key={index}
              className={`color-swatch ${currentColor === color.value ? 'selected' : ''}`}
              style={{ backgroundColor: color.value }}
              title={color.name}
              onClick={() => handlePredefinedColorSelect(colorName, color.value)}
            ></div>
          ))}
        </div>
      </div>
    );
  };

  // Componenta pentru controale într-o grilă responsivă
  const ResponsiveStyleGrid = ({ children }) => (
    <div className={`style-grid ${isMobile ? 'mobile-grid' : ''} ${compact ? 'compact-grid' : ''}`}>
      {children}
    </div>
  );

  // Componentă pentru tab-uri mobile-friendly
  const MobileTabs = () => (
    <div className="style-tabs">
      <div className={`tab-buttons ${isMobile ? 'mobile-tabs' : ''} ${compact ? 'compact-tabs' : ''}`}>
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {compact ? 'Stil' : (isMobile ? '🎨 Stil' : 'Stil general')}
        </button>
        <button 
          className={`tab-button ${activeTab === 'highlight' ? 'active' : ''}`}
          onClick={() => setActiveTab('highlight')}
        >
          {compact ? 'Karaoke' : (isMobile ? '✨ Karaoke' : 'Karaoke')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`subtitle-style-controls ${compact ? 'compact' : ''}`}>
      {!compact && <h3>Stil subtitrare</h3>}
      
      <MobileTabs />
      
      {activeTab === 'general' && (
        <ResponsiveStyleGrid>
          <div className="style-item">
            <label>Font:</label>
            <select 
              name="fontFamily" 
              value={subtitleStyle.fontFamily} 
              onChange={handleStyleChange}
            >
              <option value="Arial">Arial</option>
              <option value="Bebas Neue">Bebas Neue</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Quicksand">Quicksand</option>
              {!compact && (
                <>
                  <option value="Comfortaa">Comfortaa</option>
                  <option value="Sans">Sans</option>
                  <option value="Serif">Serif</option>
                  <option value="Monospace">Monospace</option>
                  <option value="Verdana">Verdana</option>
                </>
              )}
            </select>
          </div>
          
          <div className="style-item">
            <label>Mărime:</label>
            <div className="range-input-container">
              <input 
                type="range" 
                name="fontSize" 
                min="12" 
                max="48" 
                value={subtitleStyle.fontSize} 
                onChange={handleStyleChange}
                className="range-input"
              />
              <span className="range-value">{subtitleStyle.fontSize}px</span>
            </div>
          </div>
          
          <div className="style-item">
            <label>Culoare:</label>
            <div className="color-selector">
              <input 
                type="color" 
                name="fontColor" 
                value={subtitleStyle.fontColor} 
                onChange={handleStyleChange}
                className="color-input"
              />
              <PredefinedColorSelector 
                colorType="text" 
                currentColor={subtitleStyle.fontColor} 
                colorName="fontColor" 
              />
            </div>
          </div>
          
          <div className="style-item">
            <label>Contur:</label>
            <div className="color-selector">
              <input 
                type="color" 
                name="borderColor" 
                value={subtitleStyle.borderColor} 
                onChange={handleStyleChange}
                className="color-input"
              />
              <PredefinedColorSelector 
                colorType="border" 
                currentColor={subtitleStyle.borderColor} 
                colorName="borderColor" 
              />
            </div>
          </div>
          
          <div className="style-item">
            <label>Grosime:</label>
            <div className="range-input-container">
              <input 
                type="range" 
                name="borderWidth" 
                min="0" 
                max="5" 
                step="0.5" 
                value={subtitleStyle.borderWidth} 
                onChange={handleStyleChange}
                className="range-input"
              />
              <span className="range-value">{subtitleStyle.borderWidth}px</span>
            </div>
          </div>
          
          <div className="style-item">
            <label>ALL CAPS:</label>
            <div className="toggle-switch">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={subtitleStyle.allCaps || false} 
                  onChange={() => handleToggleChange('allCaps')}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">
                {subtitleStyle.allCaps ? 'DA' : 'Nu'}
              </span>
            </div>
          </div>
          
          {!compact && (
            <div className="style-item">
              <label>Eliminare punctuație:</label>
              <div className="toggle-switch">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={subtitleStyle.removePunctuation || false} 
                    onChange={() => handleToggleChange('removePunctuation')}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label">
                  {subtitleStyle.removePunctuation ? 'DA' : 'Nu'}
                </span>
              </div>
            </div>
          )}
          
          <div className="style-item position-selector">
            <label>Poziție:</label>
            <div className="position-options">
              <div className="position-preset">
                <select 
                  name="position" 
                  value={subtitleStyle.position} 
                  onChange={handleStyleChange}
                  disabled={useCustomPosition}
                >
                  <option value="bottom">Jos</option>
                  <option value="top">Sus</option>
                  <option value="middle">Centru</option>
                  {!compact && (
                    <>
                      <option value="top-left">Sus-Stânga</option>
                      <option value="top-right">Sus-Dreapta</option>
                      <option value="bottom-left">Jos-Stânga</option>
                      <option value="bottom-right">Jos-Dreapta</option>
                    </>
                  )}
                </select>
              </div>
              
              <div className="position-toggle">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={useCustomPosition} 
                    onChange={toggleCustomPosition}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label">Manual</span>
              </div>
            </div>
          </div>
          
          {useCustomPosition && (
            <div className="style-item custom-position-controls">
              <label>Poziție manuală:</label>
              <div className="position-coordinates">
                <div className="coordinate-input">
                  <label>X:</label>
                  <input
                    type="number"
                    name="customX"
                    min="0"
                    max="100"
                    value={subtitleStyle.customX || 50}
                    onChange={handlePositionChange}
                    className="coordinate-field"
                  />
                  <span>%</span>
                </div>
                <div className="coordinate-input">
                  <label>Y:</label>
                  <input
                    type="number"
                    name="customY"
                    min="0"
                    max="100"
                    value={subtitleStyle.customY || 90}
                    onChange={handlePositionChange}
                    className="coordinate-field"
                  />
                  <span>%</span>
                </div>
              </div>
              {!compact && (
                <p className="help-text">
                  {isMobile 
                    ? 'Drag subtitrarea în video pentru poziționare.' 
                    : 'Drag subtitrarea în video pentru poziționare.'
                  }
                </p>
              )}
            </div>
          )}
          
          <div className="style-item">
            <label>Linii max:</label>
            <select 
              name="maxLines" 
              value={subtitleStyle.maxLines || 2} 
              onChange={handleStyleChange}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              {!compact && (
                <>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </>
              )}
            </select>
          </div>
          
          {!compact && (
            <div className="style-item">
              <label>Lățime max (%):</label>
              <div className="range-input-container">
                <input 
                  type="range" 
                  name="maxWidth" 
                  min="30" 
                  max="70" 
                  value={subtitleStyle.maxWidth || 50} 
                  onChange={handleStyleChange}
                  className="range-input"
                />
                <span className="range-value">{subtitleStyle.maxWidth || 50}%</span>
              </div>
            </div>
          )}
          
          <div className="style-item">
            <label>Cuvinte/linie:</label>
            <select 
              name="maxWordsPerLine" 
              value={subtitleStyle.maxWordsPerLine || 4} 
              onChange={handleStyleChange}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </ResponsiveStyleGrid>
      )}
      
      {activeTab === 'highlight' && (
        <ResponsiveStyleGrid>
          <div className="style-item">
            <label>Culoare evidențiere:</label>
            <div className="color-selector">
              <input 
                type="color" 
                name="currentWordColor" 
                value={subtitleStyle.currentWordColor || '#FFFF00'} 
                onChange={handleStyleChange}
                className="color-input"
              />
              <PredefinedColorSelector 
                colorType="highlight" 
                currentColor={subtitleStyle.currentWordColor} 
                colorName="currentWordColor" 
              />
            </div>
          </div>
          
          <div className="style-item">
            <label>Contur evidențiere:</label>
            <div className="color-selector">
              <input 
                type="color" 
                name="currentWordBorderColor" 
                value={subtitleStyle.currentWordBorderColor || '#000000'} 
                onChange={handleStyleChange}
                className="color-input"
              />
              <PredefinedColorSelector 
                colorType="border" 
                currentColor={subtitleStyle.currentWordBorderColor} 
                colorName="currentWordBorderColor" 
              />
            </div>
          </div>
          
          <div className="style-item karaoke-toggle">
            <label>Evidențiere cuvânt:</label>
            <div className="toggle-switch">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={subtitleStyle.useKaraoke === true} 
                  onChange={() => handleToggleChange('useKaraoke')}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">
                {subtitleStyle.useKaraoke === true ? 'DA' : 'Nu'}
              </span>
            </div>
            {!compact && (
              <p className="help-text">
                Evidențiază cuvintele pe măsură ce sunt pronunțate
              </p>
            )}
          </div>
        </ResponsiveStyleGrid>
      )}
      
      {/* REMOVED STYLE PREVIEW - No longer needed since effects are visible directly */}
    </div>
  );
};

export default SubtitlesConfig;