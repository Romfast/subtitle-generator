import React, { useState, useEffect } from 'react';
import './SubtitlesConfig.css';

// Lista extinsă de culori predefinite pentru design modern
const predefinedColors = {
  text: [
    { name: 'Alb', value: '#FFFFFF' },
    { name: 'Galben', value: '#FFFF00' },
    { name: 'Verde Lime', value: '#00FF00' },
    { name: 'Verde Neon', value: '#39FF14' },
    { name: 'Cyan', value: '#00FFFF' },
    { name: 'Albastru Sky', value: '#00BFFF' },
    { name: 'Roz', value: '#FF00FF' },
    { name: 'Roz Hot', value: '#FF69B4' },
    { name: 'Roșu', value: '#FF0000' },
    { name: 'Portocaliu', value: '#FFA500' },
    { name: 'Auriu', value: '#FFD700' },
    { name: 'Verde Mint', value: '#98FB98' }
  ],
  border: [
    { name: 'Negru', value: '#000000' },
    { name: 'Gri Închis', value: '#333333' },
    { name: 'Gri', value: '#666666' },
    { name: 'Albastru Închis', value: '#000080' },
    { name: 'Verde Închis', value: '#006400' },
    { name: 'Maro', value: '#8B4513' },
    { name: 'Roșu Închis', value: '#8B0000' },
    { name: 'Violet', value: '#800080' }
  ],
  highlight: [
    { name: 'Galben', value: '#FFFF00' },
    { name: 'Roșu Aprins', value: '#FF0000' },
    { name: 'Verde Neon', value: '#39FF14' },
    { name: 'Albastru Electric', value: '#00BFFF' },
    { name: 'Portocaliu Aprins', value: '#FF6600' },
    { name: 'Roz Aprins', value: '#FF69B4' },
    { name: 'Cyan Aprins', value: '#00FFFF' },
    { name: 'Lime', value: '#32CD32' },
    { name: 'Auriu', value: '#FFD700' },
    { name: 'Corai', value: '#FF7F50' }
  ]
};

// DEMO PRESETS EXTINSE
const DEMO_PRESETS = {
  'default': {
    name: 'Default', icon: '⭐', color: '#10b981',
    style: {
      fontSize: 48, fontFamily: 'Inter', fontColor: '#00FF00', borderColor: '#000000', borderWidth: 2,
      position: 'bottom-30', useCustomPosition: false, customX: 50, customY: 70, allCaps: true,
      removePunctuation: false, useKaraoke: true, maxLines: 1, currentWordColor: '#FFFF00', currentWordBorderColor: '#000000'
    }
  },
  'cinema_classic': {
    name: 'Cinema', icon: '🎬', color: '#1f2937',
    style: {
      fontSize: 32, fontFamily: 'Bebas Neue', fontColor: '#FFFFFF', borderColor: '#000000', borderWidth: 3,
      position: 'bottom', useCustomPosition: false, customX: 50, customY: 90, allCaps: true,
      removePunctuation: false, useKaraoke: false, maxLines: 1, currentWordColor: '#FFFF00', currentWordBorderColor: '#000000'
    }
  },
  'single_word_focus': {
    name: 'Focus', icon: '🎯', color: '#dc2626',
    style: {
      fontSize: 56, fontFamily: 'Poppins', fontColor: '#FFFFFF', borderColor: '#000000', borderWidth: 3,
      position: 'bottom-30', useCustomPosition: false, customX: 50, customY: 50, allCaps: true,
      removePunctuation: false, useKaraoke: true, maxLines: 1, currentWordColor: '#FF3366', currentWordBorderColor: '#FFFFFF'
    }
  },
  'rounded_soft': {
    name: 'Soft', icon: '🌸', color: '#ec4899',
    style: {
      fontSize: 28, fontFamily: 'Nunito', fontColor: '#F8F9FA', borderColor: '#E5E7EB', borderWidth: 1,
      position: 'bottom-20', useCustomPosition: false, customX: 50, customY: 80, allCaps: false,
      removePunctuation: false, useKaraoke: true, maxLines: 2, currentWordColor: '#F472B6', currentWordBorderColor: '#BE185D'
    }
  },
  'bold_impact': {
    name: 'Impact', icon: '💥', color: '#1f2937',
    style: {
      fontSize: 64, fontFamily: 'Inter', fontColor: '#FFFFFF', borderColor: '#1F2937', borderWidth: 4,
      position: 'bottom-20', useCustomPosition: false, customX: 50, customY: 85, allCaps: true,
      removePunctuation: true, useKaraoke: false, maxLines: 1, currentWordColor: '#EF4444', currentWordBorderColor: '#7F1D1D'
    }
  },
  'neon_futuristic': {
    name: 'Neon', icon: '⚡', color: '#8b5cf6',
    style: {
      fontSize: 36, fontFamily: 'Source Sans Pro', fontColor: '#00FFFF', borderColor: '#8B00FF', borderWidth: 2,
      position: 'bottom-30', useCustomPosition: false, customX: 50, customY: 30, allCaps: true,
      removePunctuation: false, useKaraoke: true, maxLines: 1, currentWordColor: '#00FF88', currentWordBorderColor: '#FF0080'
    }
  }
};

const SubtitlesConfig = ({ subtitleStyle, handleStyleChange, compact = false }) => {
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
          description: `Presetare ${preset.name}`,
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
    const newStyle = { ...preset.style };
    
    Object.keys(newStyle).forEach(key => {
      handleStyleChange({
        target: {
          name: key,
          value: newStyle[key]
        }
      });
    });
    
    setUseCustomPosition(newStyle.useCustomPosition || false);
    
    console.log(`Preset "${preset.name}" loaded with full sync`, newStyle);
    
    window.alert(`Presetarea "${preset.name}" a fost aplicată!`);
  };

  // FIX #5: Aplică preset demo direct
  const applyDemoPreset = (presetKey) => {
    const preset = DEMO_PRESETS[presetKey];
    if (preset) {
      const newStyle = { ...preset.style };
      
      Object.keys(newStyle).forEach(key => {
        handleStyleChange({
          target: {
            name: key,
            value: newStyle[key]
          }
        });
      });
      
      setUseCustomPosition(newStyle.useCustomPosition || false);
      
      console.log(`Demo preset "${preset.name}" applied with full sync`, newStyle);
    }
  };

  const deletePreset = (presetId) => {
    const presetToDelete = presets.find(p => p.id === presetId);
    
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
    
    const event = {
      target: {
        name: 'useCustomPosition',
        value: newValue
      }
    };
    handleStyleChange(event);
  };

  const handleToggleChange = (name) => {
    const newValue = !subtitleStyle[name];
    handleStyleChange({
      target: {
        name,
        value: newValue
      }
    });
  };

  const handlePositionChange = (e) => {
    const { name, value } = e.target;
    handleStyleChange({
      target: {
        name,
        value: parseInt(value, 10)
      }
    });
  };

  const handlePredefinedColorSelect = (name, colorValue) => {
    handleStyleChange({
      target: {
        name,
        value: colorValue
      }
    });
  };

  // FIX #4 & #7: Range input cu suport complet pentru drag
  const handleRangeChange = (e) => {
    const { name, value } = e.target;
    handleStyleChange({
      target: {
        name,
        value: parseInt(value, 10)
      }
    });
  };

  // Componentă pentru selectorul de culori cu design modern
  const ModernColorSelector = ({ colorType, currentColor, colorName }) => {
    return (
      <div className="modern-color-section">
        <div className="color-input-row">
          <input 
            type="color" 
            name={colorName} 
            value={currentColor} 
            onChange={handleStyleChange}
            className="modern-color-picker"
          />
          <span className="color-value">{currentColor}</span>
        </div>
        
        {/* FIX #6: Mai multe culori predefinite în grid compact */}
        <div className="predefined-colors-grid">
          {predefinedColors[colorType].map((color, index) => (
            <button 
              key={index}
              className={`color-swatch-modern ${currentColor === color.value ? 'selected' : ''}`}
              style={{ backgroundColor: color.value }}
              title={color.name}
              onClick={() => handlePredefinedColorSelect(colorName, color.value)}
            />
          ))}
        </div>
      </div>
    );
  };

  // FIX #7: Range slider cu drag complet
  const ModernRangeSlider = ({ name, value, min, max, label, unit = '', step = 1 }) => {
    return (
      <div className="modern-range-container">
        <div className="range-header">
          <span className="range-label">{label}</span>
          <span className="range-value-display">{value}{unit}</span>
        </div>
        <input 
          type="range" 
          name={name} 
          min={min} 
          max={max}
          step={step}
          value={value} 
          onChange={handleRangeChange}
          className="modern-range-slider"
          style={{
            background: `linear-gradient(to right, #667eea 0%, #667eea ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`
          }}
        />
      </div>
    );
  };

  // Toggle switch modern
  const ModernToggle = ({ name, checked, label, onChange }) => {
    return (
      <div className="modern-toggle-container">
        <span className="toggle-label-modern">{label}</span>
        <label className="modern-toggle-switch">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={() => onChange(name)}
          />
          <span className="toggle-slider-modern"></span>
        </label>
        <span className={`toggle-status ${checked ? 'active' : 'inactive'}`}>
          {checked ? 'ON' : 'OFF'}
        </span>
      </div>
    );
  };

  // Select modern
  const ModernSelect = ({ name, value, options, label, onChange }) => {
    return (
      <div className="modern-select-container">
        <label className="modern-select-label">{label}</label>
        <select 
          name={name} 
          value={value} 
          onChange={onChange}
          className="modern-select"
        >
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="subtitle-style-controls-modern">
      {/* FIX #5: Demo Presets la început pentru acces rapid */}
      <div className="demo-presets-section">
        <h4 className="section-title">⚡ Preseturi Rapide</h4>
        <div className="demo-presets-grid-modern">
          {Object.entries(DEMO_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyDemoPreset(key)}
              className="demo-preset-btn-modern"
              style={{ backgroundColor: preset.color }}
              title={`Aplicați presetul ${preset.name}`}
            >
              <span className="preset-icon">{preset.icon}</span>
              <span className="preset-name">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FIX #10: Toate configurațiile într-un singur container fără tab-uri */}
      <div className="unified-controls-container">
        
        {/* Secțiunea Font și Dimensiuni */}
        <div className="control-group">
          <h4 className="group-title">🎨 Stil Text</h4>
          <div className="controls-grid">
            
            <ModernSelect 
              name="fontFamily"
              value={subtitleStyle.fontFamily}
              label="Font"
              onChange={handleStyleChange}
              options={[
                { value: 'Poppins', label: 'Poppins (Modern)' },
                { value: 'Inter', label: 'Inter (Clean)' },
                { value: 'Nunito', label: 'Nunito (Rotunjit)' },
                { value: 'Bebas Neue', label: 'Bebas Neue (Bold)' },
                { value: 'Open Sans', label: 'Open Sans (Clasic)' },
                { value: 'Source Sans Pro', label: 'Source Sans Pro' },
                { value: 'Montserrat', label: 'Montserrat' },
                { value: 'Arial', label: 'Arial (Standard)' }
              ]}
            />

            <ModernRangeSlider 
              name="fontSize"
              value={subtitleStyle.fontSize}
              min={12}
              max={84}
              label="Mărime Font"
              unit="px"
            />

            <div className="control-item">
              <span className="control-label">Culoare Text</span>
              <ModernColorSelector 
                colorType="text"
                currentColor={subtitleStyle.fontColor}
                colorName="fontColor"
              />
            </div>

            <div className="control-item">
              <span className="control-label">Culoare Contur</span>
              <ModernColorSelector 
                colorType="border"
                currentColor={subtitleStyle.borderColor}
                colorName="borderColor"
              />
            </div>

            <ModernRangeSlider 
              name="borderWidth"
              value={subtitleStyle.borderWidth}
              min={0}
              max={5}
              step={0.5}
              label="Grosime Contur"
              unit="px"
            />

          </div>
        </div>

        {/* Secțiunea Evidențiere Cuvânt */}
        <div className="control-group">
          <h4 className="group-title">✨ Evidențiere Cuvânt</h4>
          <div className="controls-grid">
            
            <ModernToggle 
              name="useKaraoke"
              checked={subtitleStyle.useKaraoke === true}
              label="Activează Karaoke"
              onChange={handleToggleChange}
            />

            {subtitleStyle.useKaraoke && (
              <>
                <div className="control-item">
                  <span className="control-label">Culoare Evidențiere</span>
                  <ModernColorSelector 
                    colorType="highlight"
                    currentColor={subtitleStyle.currentWordColor || '#FFFF00'}
                    colorName="currentWordColor"
                  />
                </div>

                <div className="control-item">
                  <span className="control-label">Contur Evidențiere</span>
                  <ModernColorSelector 
                    colorType="border"
                    currentColor={subtitleStyle.currentWordBorderColor || '#000000'}
                    colorName="currentWordBorderColor"
                  />
                </div>
              </>
            )}

          </div>
        </div>

        {/* Secțiunea Poziționare */}
        <div className="control-group">
          <h4 className="group-title">📍 Poziționare</h4>
          <div className="controls-grid">
            
            <ModernSelect 
              name="position"
              value={subtitleStyle.position}
              label="Poziție Predefinită"
              onChange={handleStyleChange}
              options={[
                { value: 'bottom', label: 'Jos (90%)' },
                { value: 'bottom-20', label: 'Jos-20% (80%)' },
                { value: 'bottom-30', label: 'Jos-30% (70%)' },
                { value: 'bottom-40', label: 'Jos-40% (60%)' },
                { value: 'middle', label: 'Centru (50%)' },
                { value: 'top-40', label: 'Sus-40% (40%)' },
                { value: 'top-30', label: 'Sus-30% (30%)' },
                { value: 'top-20', label: 'Sus-20% (20%)' },
                { value: 'top', label: 'Sus (10%)' }
              ]}
            />

            <ModernToggle 
              name="useCustomPosition"
              checked={useCustomPosition}
              label="Poziție Manuală"
              onChange={() => toggleCustomPosition()}
            />

            {useCustomPosition && (
              <>
                <ModernRangeSlider 
                  name="customX"
                  value={subtitleStyle.customX || 50}
                  min={0}
                  max={100}
                  label="Poziție X"
                  unit="%"
                />

                <ModernRangeSlider 
                  name="customY"
                  value={subtitleStyle.customY || 90}
                  min={0}
                  max={100}
                  label="Poziție Y"
                  unit="%"
                />
              </>
            )}

          </div>
        </div>

        {/* Secțiunea Layout și Opțiuni */}
        <div className="control-group">
          <h4 className="group-title">📐 Layout și Opțiuni</h4>
          <div className="controls-grid">
            
            {/* FIX #8: Configurare funcțională pentru numărul de linii */}
            <ModernRangeSlider 
              name="maxLines"
              value={subtitleStyle.maxLines || 2}
              min={1}
              max={4}
              label="Linii Maxime"
            />

            <ModernToggle 
              name="allCaps"
              checked={subtitleStyle.allCaps || false}
              label="ALL CAPS"
              onChange={handleToggleChange}
            />

            <ModernToggle 
              name="removePunctuation"
              checked={subtitleStyle.removePunctuation || false}
              label="Fără Punctuație"
              onChange={handleToggleChange}
            />

          </div>
        </div>

        {/* Salvare presetări */}
        <div className="control-group">
          <h4 className="group-title">💾 Presetări Personale</h4>
          <div className="controls-grid">
            
            {!showSavePreset ? (
              <button 
                className="preset-button save"
                onClick={() => setShowSavePreset(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                + Salvează Configurația Curentă
              </button>
            ) : (
              <div className="save-preset-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Numele presetării"
                  style={{
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && savePreset()}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={savePreset}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    Salvează
                  </button>
                  <button 
                    onClick={() => {
                      setShowSavePreset(false);
                      setPresetName('');
                    }}
                    style={{
                      background: '#e5e7eb',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer'
                    }}
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {/* Lista presetărilor salvate */}
            {presets.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#6b7280' }}>
                  Presetări salvate ({presets.length}):
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {presets.map((preset) => (
                    <div key={preset.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'rgba(248, 250, 252, 0.8)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                          {preset.isDemo && '🌟 '}{preset.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {preset.style?.fontFamily} {preset.style?.fontSize}px
                        </div>
                      </div>
                      <button 
                        onClick={() => loadPreset(preset)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Aplică
                      </button>
                      {!preset.isDemo && (
                        <button 
                          onClick={() => deletePreset(preset.id)}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Info Box - Status actual */}
        <div className="status-info-box">
          <div className="status-row">
            <span className="status-label">Font:</span>
            <span className="status-value">{subtitleStyle.fontFamily} {subtitleStyle.fontSize}px</span>
          </div>
          <div className="status-row">
            <span className="status-label">Linii:</span>
            <span className="status-value">{subtitleStyle.maxLines || 2} (auto-calculate cuvinte)</span>
          </div>
          <div className="status-row">
            <span className="status-label">Karaoke:</span>
            <span className={`status-value ${subtitleStyle.useKaraoke ? 'active' : 'inactive'}`}>
              {subtitleStyle.useKaraoke ? 'ACTIV' : 'DEZACTIVAT'}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Poziție:</span>
            <span className="status-value">
              {useCustomPosition ? 
                `Manual (${subtitleStyle.customX}%, ${subtitleStyle.customY}%)` : 
                subtitleStyle.position
              }
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SubtitlesConfig;