import React, { useState, useEffect } from 'react';

// Adăugăm o listă de culori predefinite
const predefinedColors = {
  text: [
    { name: 'Alb', value: '#FFFFFF' },
    { name: 'Galben', value: '#FFFF00' },
    { name: 'Verde deschis', value: '#00FF00' },
    { name: 'Albastru deschis', value: '#00FFFF' },
    { name: 'Roz', value: '#FF00FF' },
    { name: 'Roșu', value: '#FF0000' },
    { name: 'Portocaliu', value: '#FFA500' },
  ],
  border: [
    { name: 'Negru', value: '#000000' },
    { name: 'Gri închis', value: '#333333' },
    { name: 'Albastru închis', value: '#000080' },
    { name: 'Verde închis', value: '#006400' },
    { name: 'Maro', value: '#8B4513' },
    { name: 'Transparent', value: '#00000000' },
  ],
  highlight: [
    { name: 'Galben', value: '#FFFF00' },
    { name: 'Roșu', value: '#FF0000' },
    { name: 'Verde neon', value: '#39FF14' },
    { name: 'Albastru neon', value: '#00BFFF' },
    { name: 'Portocaliu', value: '#FF6600' },
    { name: 'Roz', value: '#FF69B4' },
  ]
};

const SubtitlesConfig = ({ subtitleStyle, handleStyleChange }) => {
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
    <div className={`style-grid ${isMobile ? 'mobile-grid' : ''}`}>
      {children}
    </div>
  );

  // Componentă pentru tab-uri mobile-friendly
  const MobileTabs = () => (
    <div className="style-tabs">
      <div className={`tab-buttons ${isMobile ? 'mobile-tabs' : ''}`}>
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {isMobile ? 'Stil' : 'Stil general'}
        </button>
        <button 
          className={`tab-button ${activeTab === 'highlight' ? 'active' : ''}`}
          onClick={() => setActiveTab('highlight')}
        >
          {isMobile ? 'Evidențiere' : 'Evidențiere cuvinte'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="subtitle-style-controls">
      <h3>Stil subtitrare</h3>
      
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
              <option value="Bebas Neue">Bebas Neue (gros)</option>
              <option value="Montserrat">Montserrat (rotund)</option>
              <option value="Quicksand">Quicksand (rotund)</option>
              <option value="Comfortaa">Comfortaa (rotund)</option>
              <option value="Sans">Sans</option>
              <option value="Serif">Serif</option>
              <option value="Monospace">Monospace</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
          
          <div className="style-item">
            <label>Mărime font:</label>
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
            <label>Culoare text:</label>
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
            <label>Culoare contur:</label>
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
            <label>Grosime contur:</label>
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
                {subtitleStyle.allCaps ? 'ACTIVAT' : 'Dezactivat'}
              </span>
            </div>
          </div>
          
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
                {subtitleStyle.removePunctuation ? 'Activat' : 'Dezactivat'}
              </span>
            </div>
          </div>
          
          <div className="style-item position-selector">
            <label>Poziționare:</label>
            <div className="position-options">
              <div className="position-preset">
                <select 
                  name="position" 
                  value={subtitleStyle.position} 
                  onChange={handleStyleChange}
                  disabled={useCustomPosition}
                >
                  <option value="bottom">Jos (centrat)</option>
                  <option value="top">Sus (centrat)</option>
                  <option value="middle">Centru</option>
                  <option value="top-left">Sus-Stânga</option>
                  <option value="top-right">Sus-Dreapta</option>
                  <option value="bottom-left">Jos-Stânga</option>
                  <option value="bottom-right">Jos-Dreapta</option>
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
                <span className="toggle-label">
                  {isMobile ? 'Manual' : 'Poziție manuală'}
                </span>
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
              <p className="help-text">
                {isMobile 
                  ? 'Atingeți și trageți subtitrarea în previzualizare pentru poziționare.' 
                  : 'Trageți direct subtitrarea în previzualizare pentru poziționare.'
                }
              </p>
            </div>
          )}
          
          <div className="style-item">
            <label>Număr maxim de linii:</label>
            <select 
              name="maxLines" 
              value={subtitleStyle.maxLines || 2} 
              onChange={handleStyleChange}
            >
              <option value={1}>1 linie</option>
              <option value={2}>2 linii</option>
              <option value={3}>3 linii</option>
              <option value={4}>4 linii</option>
            </select>
          </div>
          
          <div className="style-item">
            <label>Lățime maximă (% din video):</label>
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
          
          <div className="style-item">
            <label>Cuvinte maxime per linie:</label>
            <select 
              name="maxWordsPerLine" 
              value={subtitleStyle.maxWordsPerLine || 4} 
              onChange={handleStyleChange}
            >
              <option value={1}>1 cuvânt</option>
              <option value={2}>2 cuvinte</option>
              <option value={3}>3 cuvinte</option>
              <option value={4}>4 cuvinte</option>
            </select>
          </div>
        </ResponsiveStyleGrid>
      )}
      
      {activeTab === 'highlight' && (
        <ResponsiveStyleGrid>
          <div className="style-item">
            <label>Culoare cuvânt curent:</label>
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
            <label>Culoare contur cuvânt curent:</label>
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
            <label>Activare evidențiere cuvânt curent:</label>
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
                {subtitleStyle.useKaraoke === true ? 'Activat' : 'Dezactivat'}
              </span>
            </div>
            <p className="help-text">
              {isMobile 
                ? 'Evidențiază cuvintele pe măsură ce sunt pronunțate'
                : 'Când este activat, cuvintele sunt evidențiate pe măsură ce sunt pronunțate'
              }
            </p>
          </div>
          
          <div className="style-info">
            <p>
              {isMobile 
                ? 'Efectul de evidențiere se numește "karaoke" și afișează fiecare cuvânt cu culoarea de evidențiere.'
                : 'Efectul de evidențiere cuvânt cu cuvânt este cunoscut și sub numele de "karaoke". Fiecare cuvânt va fi afișat cu culoarea și stilul de evidențiere pe măsură ce avansează timpul în videoclip.'
              }
            </p>
          </div>
        </ResponsiveStyleGrid>
      )}
      
      <div className="style-preview">
        <h4>Previzualizare stil:</h4>
        <div 
          className="subtitle-preview-box"
          style={{ backgroundColor: '#333' }}
        >
          <div 
            className="subtitle-preview-text"
            style={{
              fontFamily: subtitleStyle.fontFamily,
              fontSize: isMobile ? `${Math.max(14, subtitleStyle.fontSize * 0.7)}px` : `${subtitleStyle.fontSize}px`,
              color: subtitleStyle.fontColor,
              textShadow: subtitleStyle.borderWidth > 0 ? 
                `-${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor},
                 ${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor},
                -${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor},
                 ${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${subtitleStyle.borderColor}` 
                : 'none',
              position: 'absolute',
              textTransform: subtitleStyle.allCaps ? 'uppercase' : 'none',
              ...(useCustomPosition 
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
                  }),
              maxWidth: `${subtitleStyle.maxWidth || 70}%`
            }}
          >
            <span style={{
              fontFamily: subtitleStyle.fontFamily,
              color: subtitleStyle.fontColor
            }}>Exemplu de </span>
            <span style={{
              color: subtitleStyle.currentWordColor || '#FFFF00',
              textShadow: subtitleStyle.borderWidth > 0 ? 
                `-${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${subtitleStyle.currentWordBorderColor || '#000000'},
                 ${subtitleStyle.borderWidth}px -${subtitleStyle.borderWidth}px 0 ${subtitleStyle.currentWordBorderColor || '#000000'},
                -${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${subtitleStyle.currentWordBorderColor || '#000000'},
                 ${subtitleStyle.borderWidth}px ${subtitleStyle.borderWidth}px 0 ${subtitleStyle.currentWordBorderColor || '#000000'}` 
                : 'none',
              fontWeight: 'bold',
              transform: 'scale(1.05)',
              display: 'inline-block'
            }}>
              text
            </span>
            <span> pentru subtitrare</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Funcție utilă pentru a calcula culoarea contrastantă pentru text
function getContrastColor(hexColor) {
  // Verificăm dacă e un format hex valid
  if (!hexColor || hexColor === '') return '#FFFFFF';
  
  // Eliminăm # dacă există
  hexColor = hexColor.replace('#', '');
  
  // Păstrăm doar componenta RGB
  if (hexColor.length === 3) {
    hexColor = hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2];
  }
  
  // Calculăm luminozitatea
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Folosim formula de luminozitate perceptuală
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Alegem alb sau negru în funcție de luminozitate
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default SubtitlesConfig;