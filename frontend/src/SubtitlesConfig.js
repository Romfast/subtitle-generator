import React, { useState, useEffect } from 'react';
import './SubtitlesConfig.css'; // Import the enhanced styles

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

// DEMO PRESETS - sincronizate cu App.js
const DEMO_PRESETS = {
  'cinema_classic': {
    name: 'Cinema Clasic',
    description: 'Stil clasic de cinema cu font mare și contur pronunțat',
    icon: '🎬',
    style: {
      fontSize: 28,
      fontFamily: 'Bebas Neue',
      fontColor: '#FFFFFF',
      borderColor: '#000000',
      borderWidth: 3,
      position: 'bottom',
      useCustomPosition: false,
      customX: 50,
      customY: 90,
      allCaps: true,
      removePunctuation: false,
      useKaraoke: false,
      maxLines: 1,
      maxWordsPerLine: 3,
      currentWordColor: '#FFFF00',
      currentWordBorderColor: '#000000'
    }
  },
  'modern_minimal': {
    name: 'Modern Minimal',
    description: 'Design modern și minimalist cu evidențiere subtilă',
    icon: '✨',
    style: {
      fontSize: 22,
      fontFamily: 'Montserrat',
      fontColor: '#F8F9FA',
      borderColor: '#1A1A1A',
      borderWidth: 1,
      position: 'bottom-20',
      useCustomPosition: false,
      customX: 50,
      customY: 80,
      allCaps: false,
      removePunctuation: false,
      useKaraoke: true,
      maxLines: 2,
      maxWordsPerLine: 4,
      currentWordColor: '#10B981',
      currentWordBorderColor: '#064E3B'
    }
  },
  'gaming_style': {
    name: 'Gaming Style',
    description: 'Stil vibrant pentru gaming cu efecte speciale',
    icon: '🎮',
    style: {
      fontSize: 26,
      fontFamily: 'Quicksand',
      fontColor: '#00FFFF',
      borderColor: '#FF0080',
      borderWidth: 2,
      position: 'bottom-30',
      useCustomPosition: false,
      customX: 50,
      customY: 70,
      allCaps: true,
      removePunctuation: true,
      useKaraoke: true,
      maxLines: 1,
      maxWordsPerLine: 3,
      currentWordColor: '#FFFF00',
      currentWordBorderColor: '#FF0080'
    }
  },
  'elegant_serif': {
    name: 'Elegant Serif',
    description: 'Stil elegant și rafinat pentru documentare',
    icon: '📖',
    style: {
      fontSize: 24,
      fontFamily: 'Comfortaa',
      fontColor: '#FFFBEB',
      borderColor: '#7C2D12',
      borderWidth: 2,
      position: 'bottom',
      useCustomPosition: false,
      customX: 50,
      customY: 90,
      allCaps: false,
      removePunctuation: false,
      useKaraoke: false,
      maxLines: 2,
      maxWordsPerLine: 4,
      currentWordColor: '#FCD34D',
      currentWordBorderColor: '#7C2D12'
    }
  }
};

const SubtitlesConfig = ({ subtitleStyle, handleStyleChange, compact = false }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [useCustomPosition, setUseCustomPosition] = useState(subtitleStyle.useCustomPosition || false);
  const [isMobile, setIsMobile] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

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

  // Încarcă presetările la pornire
  useEffect(() => {
    loadPresets();
  }, []);

  // Funcții pentru presetări
  const loadPresets = () => {
    try {
      // În mediul Claude artifacts, localStorage nu este disponibil
      // Folosim o soluție de fallback cu variabile în memorie
      if (typeof localStorage !== 'undefined') {
        const savedPresets = localStorage.getItem('subtitlePresets');
        if (savedPresets) {
          setPresets(JSON.parse(savedPresets));
        }
      } else {
        // Fallback pentru Claude artifacts - presetări demo convertite
        const demoPresets = Object.entries(DEMO_PRESETS).map(([key, preset], index) => ({
          id: index + 1,
          name: preset.name,
          description: preset.description,
          style: preset.style,
          createdAt: new Date().toISOString(),
          isDemo: true
        }));
        setPresets(demoPresets);
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) {
      window.alert('Vă rugăm să introduceți un nume pentru presetare');
      return;
    }

    const newPreset = {
      id: Date.now(),
      name: presetName.trim(),
      style: { ...subtitleStyle },
      createdAt: new Date().toISOString(),
      isDemo: false
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('subtitlePresets', JSON.stringify(updatedPresets));
        window.alert(`Presetarea "${newPreset.name}" a fost salvată cu succes!`);
      } else {
        window.alert(`Presetarea "${newPreset.name}" a fost salvată temporar!`);
      }
      setPresetName('');
      setShowSavePreset(false);
    } catch (error) {
      console.error('Error saving preset:', error);
      window.alert('Eroare la salvarea presetării');
    }
  };

  const loadPreset = (preset) => {
    // Aplică toate setările din presetare
    Object.keys(preset.style).forEach(key => {
      handleStyleChange({
        target: {
          name: key,
          value: preset.style[key]
        }
      });
    });
    
    // Actualizează și starea locală pentru poziționare personalizată
    setUseCustomPosition(preset.style.useCustomPosition || false);
    
    window.alert(`Presetarea "${preset.name}" a fost aplicată!`);
  };

  // Aplică preset demo direct
  const applyDemoPreset = (presetKey) => {
    const preset = DEMO_PRESETS[presetKey];
    if (preset) {
      // Aplică toate setările din presetare
      Object.keys(preset.style).forEach(key => {
        handleStyleChange({
          target: {
            name: key,
            value: preset.style[key]
          }
        });
      });
      
      // Actualizează și starea locală pentru poziționare personalizată
      setUseCustomPosition(preset.style.useCustomPosition || false);
      
      // Nu afișăm alert pentru preseturile demo pentru o experiență mai fluidă
      console.log(`Demo preset "${preset.name}" applied`);
    }
  };

  const deletePreset = (presetId) => {
    const presetToDelete = presets.find(p => p.id === presetId);
    
    // Nu permitem ștergerea preseturilor demo
    if (presetToDelete && presetToDelete.isDemo) {
      window.alert('Presetările demo nu pot fi șterse.');
      return;
    }
    
    if (window.confirm('Sigur doriți să ștergeți această presetare?')) {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      setPresets(updatedPresets);
      
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('subtitlePresets', JSON.stringify(updatedPresets));
        }
        window.alert('Presetarea a fost ștearsă cu succes!');
      } catch (error) {
        console.error('Error deleting preset:', error);
        window.alert('Eroare la ștergerea presetării');
      }
    }
  };

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
          {compact ? 'Evidențiere' : (isMobile ? '✨ Evidențiere' : 'Evidențiere cuvânt')}
        </button>
        <button 
          className={`tab-button ${activeTab === 'presets' ? 'active' : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          {compact ? 'Preset' : (isMobile ? '💾 Preset' : 'Presetări')}
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
                  <option value="bottom">Jos (90%)</option>
                  <option value="bottom-20">Jos-20% (80%)</option>
                  <option value="bottom-30">Jos-30% (70%)</option>
                  <option value="bottom-40">Jos-40% (60%)</option>
                  <option value="middle">Centru (50%)</option>
                  <option value="top-40">Sus-40% (40%)</option>
                  <option value="top-30">Sus-30% (30%)</option>
                  <option value="top-20">Sus-20% (20%)</option>
                  <option value="top">Sus (10%)</option>
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
            <label>Evidențiere cuvânt curent:</label>
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
                Evidențiază cuvântul care este pronunțat în momentul respectiv (timing precis)
              </p>
            )}
          </div>
        </ResponsiveStyleGrid>
      )}
      
      {activeTab === 'presets' && (
        <div className="presets-section">
          {/* Demo Presets Quick Access */}
          <div className="style-item demo-presets">
            <label>Presetări Demo Rapide:</label>
            <div className="demo-presets-grid" style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {Object.entries(DEMO_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyDemoPreset(key)}
                  className="demo-preset-card"
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px',
                    fontWeight: '700',
                    color: '#1e293b'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{preset.icon}</span>
                    {preset.name}
                  </div>
                  {!compact && (
                    <div style={{ 
                      fontSize: '0.75rem',
                      color: '#64748b',
                      lineHeight: '1.3'
                    }}>
                      {preset.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Salvare presetare nouă */}
          <div className="style-item save-preset">
            <label>Salvează presetarea curentă:</label>
            <div className="save-preset-controls">
              {!showSavePreset ? (
                <button 
                  className="preset-button save"
                  onClick={() => setShowSavePreset(true)}
                >
                  + Salvează ca presetare
                </button>
              ) : (
                <div className="save-preset-form">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Numele presetării (ex: Subtitrare Cinema)"
                    className="preset-name-input"
                    onKeyPress={(e) => e.key === 'Enter' && savePreset()}
                  />
                  <div className="save-preset-buttons">
                    <button 
                      className="preset-button save"
                      onClick={savePreset}
                    >
                      Salvează
                    </button>
                    <button 
                      className="preset-button cancel"
                      onClick={() => {
                        setShowSavePreset(false);
                        setPresetName('');
                      }}
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lista presetărilor existente */}
          <div className="style-item presets-list">
            <label>Presetări salvate ({presets.length}):</label>
            {presets.length === 0 ? (
              <div className="no-presets">
                <p>Nu aveți presetări salvate încă.</p>
                <p>Configurați stilul subtitrărilor și salvați ca presetare pentru a le refolosi mai târziu.</p>
              </div>
            ) : (
              <div className="presets-grid">
                {presets.map((preset) => (
                  <div key={preset.id} className={`preset-item ${preset.isDemo ? 'demo-preset' : ''}`}>
                    <div className="preset-info">
                      <h4 className="preset-name">
                        {preset.isDemo && <span style={{ marginRight: '8px' }}>🌟</span>}
                        {preset.name}
                        {preset.isDemo && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '0.7rem',
                            background: '#10b981',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: '600'
                          }}>DEMO</span>
                        )}
                      </h4>
                      <div className="preset-details">
                        <span className="preset-font">{preset.style.fontFamily} {preset.style.fontSize}px</span>
                        <span className="preset-position">
                          {preset.style.useCustomPosition 
                            ? `Poziție: ${preset.style.customX}%, ${preset.style.customY}%`
                            : `Poziție: ${preset.style.position}`
                          }
                        </span>
                        {preset.description && (
                          <span className="preset-description" style={{
                            fontStyle: 'italic',
                            color: '#6b7280',
                            fontSize: '0.8rem'
                          }}>
                            {preset.description}
                          </span>
                        )}
                        <span className="preset-date">
                          {preset.isDemo ? 'Presetare sistem' : new Date(preset.createdAt).toLocaleDateString('ro-RO')}
                        </span>
                      </div>
                    </div>
                    <div className="preset-actions">
                      <button 
                        className="preset-button apply"
                        onClick={() => loadPreset(preset)}
                        title="Aplică această presetare"
                      >
                        Aplică
                      </button>
                      {!preset.isDemo && (
                        <button 
                          className="preset-button delete"
                          onClick={() => deletePreset(preset.id)}
                          title="Șterge această presetare"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* REMOVED STYLE PREVIEW - No longer needed since effects are visible directly */}
    </div>
  );
};

export default SubtitlesConfig;