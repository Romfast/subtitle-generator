import React, { useState, useEffect, useCallback } from 'react';
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
  // FIX: State local pentru toate configurările - NU se aplică automat
  const [localStyle, setLocalStyle] = useState(subtitleStyle);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [useCustomPosition, setUseCustomPosition] = useState(subtitleStyle.useCustomPosition || false);
  const [isMobile, setIsMobile] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  
  // UX FIX #3: Mobile tab system state
  const [activeTab, setActiveTab] = useState('style');

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

  // FIX: Actualizăm state-ul local când se schimbă style-ul extern (ex. preset aplicat)
  useEffect(() => {
    setLocalStyle(subtitleStyle);
    setUseCustomPosition(subtitleStyle.useCustomPosition || false);
    setHasChanges(false);
  }, [subtitleStyle]);

  // Încarcă presetările la pornire
  useEffect(() => {
    loadPresets();
  }, []);

  // FIX: Handler pentru modificări LOCALE - nu trimite la parent
  const handleLocalChange = useCallback((e) => {
    const { name, value, type } = e.target;
    
    let processedValue = value;
    if (type === 'number' || type === 'range') {
      processedValue = parseInt(value, 10);
    } else if (type === 'checkbox') {
      processedValue = e.target.checked;
    }
    
    console.log(`Local change: ${name} = ${processedValue}`);
    
    setLocalStyle(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Marcăm că avem modificări
    setHasChanges(true);
  }, []);

  // FIX: Handler pentru toggle-uri
  const handleLocalToggle = useCallback((name) => {
    const newValue = !localStyle[name];
    
    setLocalStyle(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    setHasChanges(true);
  }, [localStyle]);

  // FIX: Handler pentru poziționare personalizată
  const handleCustomPositionToggle = useCallback(() => {
    const newValue = !useCustomPosition;
    setUseCustomPosition(newValue);
    
    setLocalStyle(prev => ({
      ...prev,
      useCustomPosition: newValue
    }));
    
    setHasChanges(true);
  }, [useCustomPosition]);

  // FIX: Handler pentru culorile predefinite
  const handlePredefinedColorSelect = useCallback((name, colorValue) => {
    setLocalStyle(prev => ({
      ...prev,
      [name]: colorValue
    }));
    
    setHasChanges(true);
  }, []);

  // FIX: Funcții pentru aplicarea și resetarea modificărilor
  const applyChanges = useCallback(() => {
    // Trimitem toate modificările la parent
    Object.keys(localStyle).forEach(key => {
      handleStyleChange({
        target: {
          name: key,
          value: localStyle[key]
        }
      });
    });
    
    setHasChanges(false);
    console.log('Applied local changes:', localStyle);
  }, [localStyle, handleStyleChange]);

  const resetChanges = useCallback(() => {
    setLocalStyle(subtitleStyle);
    setUseCustomPosition(subtitleStyle.useCustomPosition || false);
    setHasChanges(false);
    console.log('Reset to original style:', subtitleStyle);
  }, [subtitleStyle]);

  // Funcții pentru presetări
  const loadPresets = () => {
    try {
      let savedPresets = [];
      
      if (typeof localStorage !== 'undefined') {
        const storedPresets = localStorage.getItem('subtitlePresets');
        if (storedPresets) {
          savedPresets = JSON.parse(storedPresets);
          console.log('Loaded presets from localStorage:', savedPresets);
        }
      }
      
      // Adăugăm presetările demo ca fallback și exemple
      const demoPresets = Object.entries(DEMO_PRESETS).map(([key, preset], index) => ({
        id: `demo_${key}`,
        name: `${preset.icon} ${preset.name}`,
        description: `Presetare ${preset.name}`,
        style: preset.style,
        createdAt: new Date().toISOString(),
        isDemo: true
      }));
      
      // Combinăm presetările demo cu cele salvate
      const allPresets = [...demoPresets, ...savedPresets];
      setPresets(allPresets);
      
      console.log('All presets loaded:', allPresets);
    } catch (error) {
      console.error('Error loading presets:', error);
      // Fallback doar cu presetări demo
      const demoPresets = Object.entries(DEMO_PRESETS).map(([key, preset], index) => ({
        id: `demo_${key}`,
        name: `${preset.icon} ${preset.name}`,
        description: `Presetare ${preset.name}`,
        style: preset.style,
        createdAt: new Date().toISOString(),
        isDemo: true
      }));
      setPresets(demoPresets);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) {
      alert('Vă rugăm să introduceți un nume pentru presetare');
      return;
    }

    const newPreset = {
      id: Date.now(),
      name: presetName.trim(),
      style: { ...localStyle }, // FIX: Salvăm state-ul local
      createdAt: new Date().toISOString(),
      isDemo: false
    };

    // Filtrăm doar presetările salvate de utilizator (nu demo)
    const userPresets = presets.filter(p => !p.isDemo);
    const updatedUserPresets = [...userPresets, newPreset];
    
    // Actualizăm lista completă
    const demoPresets = presets.filter(p => p.isDemo);
    const allPresets = [...demoPresets, ...updatedUserPresets];
    setPresets(allPresets);
    
    try {
      if (typeof localStorage !== 'undefined') {
        // Salvăm doar presetările utilizatorului, nu pe cele demo
        localStorage.setItem('subtitlePresets', JSON.stringify(updatedUserPresets));
        alert(`Presetarea "${newPreset.name}" a fost salvată cu succes!`);
      } else {
        alert(`Presetarea "${newPreset.name}" a fost salvată temporar!`);
      }
      setPresetName('');
      setShowSavePreset(false);
    } catch (error) {
      console.error('Error saving preset:', error);
      alert('Eroare la salvarea presetării');
    }
  };

  // FIX: Încărcare preset - actualizează local style
  const loadPreset = (preset) => {
    const newStyle = { ...preset.style };
    
    setLocalStyle(newStyle);
    setUseCustomPosition(newStyle.useCustomPosition || false);
    setHasChanges(true); // Marcăm că avem modificări de aplicat
    
    console.log(`Preset "${preset.name}" loaded into local state`, newStyle);
    alert(`Presetarea "${preset.name}" a fost încărcată! Apăsați "Aplică Setările" pentru a vizualiza.`);
  };

  // FIX: Aplică preset demo direct
  const applyDemoPreset = (presetKey) => {
    const preset = DEMO_PRESETS[presetKey];
    if (preset) {
      const newStyle = { ...preset.style };
      
      setLocalStyle(newStyle);
      setUseCustomPosition(newStyle.useCustomPosition || false);
      setHasChanges(true);
      
      console.log(`Demo preset "${preset.name}" loaded into local state`, newStyle);
    }
  };

  const deletePreset = (presetId) => {
    const presetToDelete = presets.find(p => p.id === presetId);
    
    if (presetToDelete && presetToDelete.isDemo) {
      alert('Presetările demo nu pot fi șterse.');
      return;
    }
    
    if (window.confirm('Sigur doriți să ștergeți această presetare?')) {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      setPresets(updatedPresets);
      
      // Salvăm doar presetările utilizatorului
      const userPresets = updatedPresets.filter(p => !p.isDemo);
      
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('subtitlePresets', JSON.stringify(userPresets));
        }
        alert('Presetarea a fost ștearsă cu succes!');
      } catch (error) {
        console.error('Error deleting preset:', error);
        alert('Eroare la ștergerea presetării');
      }
    }
  };

  // FIX: Spinner Component pentru fontSize
  const FontSizeSpinner = ({ value, onChange }) => {
    return (
      <div className="font-size-spinner">
        <label className="control-label">Mărime Font</label>
        <div className="spinner-container">
          <input 
            type="number"
            name="fontSize"
            value={value}
            min="12"
            max="84"
            step="2"
            onChange={onChange}
            className="modern-number-input"
          />
          <span className="font-size-unit">px</span>
          <div className="spinner-buttons">
            <button 
              type="button"
              onClick={() => onChange({
                target: { 
                  name: 'fontSize', 
                  value: Math.min(84, value + 2) 
                }
              })}
              className="spinner-btn up"
            >
              ▲
            </button>
            <button 
              type="button"
              onClick={() => onChange({
                target: { 
                  name: 'fontSize', 
                  value: Math.max(12, value - 2) 
                }
              })}
              className="spinner-btn down"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    );
  };

  // BorderWidth Spinner
  const BorderWidthSpinner = ({ value, onChange }) => {
    return (
      <div className="border-width-spinner">
        <label className="control-label">Grosime Contur</label>
        <div className="border-spinner-container">
          <input 
            type="number"
            name="borderWidth"
            value={value}
            min="0"
            max="8"
            step="0.5"
            onChange={onChange}
            className="border-number-input"
          />
          <span className="border-size-unit">px</span>
          <div className="border-spinner-buttons">
            <button 
              type="button"
              onClick={() => onChange({
                target: { 
                  name: 'borderWidth', 
                  value: Math.min(8, value + 0.5) 
                }
              })}
              className="border-spinner-btn up"
            >
              ▲
            </button>
            <button 
              type="button"
              onClick={() => onChange({
                target: { 
                  name: 'borderWidth', 
                  value: Math.max(0, value - 0.5) 
                }
              })}
              className="border-spinner-btn down"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Range slider simplificat fără state local
  const SimpleRangeSlider = ({ name, value, min, max, label, unit = '', step = 1 }) => {
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
          onChange={handleLocalChange}
          className="modern-range-slider"
          style={{
            background: `linear-gradient(to right, #667eea 0%, #667eea ${((value - min) / (max - min)) * 100}%, #e2e8f0 ${((value - min) / (max - min)) * 100}%, #e2e8f0 100%)`
          }}
        />
      </div>
    );
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
            onChange={handleLocalChange}
            className="modern-color-picker"
          />
          <span className="color-value">{currentColor}</span>
        </div>
        
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

  // UX FIX #3: Mobile tab component
  const MobileTabNavigation = () => {
    if (!isMobile) return null;
    
    const tabs = [
      { id: 'presets', label: '⚡ Presets', icon: '⚡' },
      { id: 'style', label: '🎨 Stil', icon: '🎨' },
      { id: 'highlight', label: '✨ Evidențiere', icon: '✨' },
      { id: 'position', label: '📍 Poziție', icon: '📍' },
      { id: 'layout', label: '📐 Layout', icon: '📐' },
      { id: 'saved', label: '💾 Salvate', icon: '💾' }
    ];
    
    return (
      <div className="mobile-tab-navigation">
        <div className="mobile-tab-list">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`mobile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                // UX FIX #3: Haptic feedback
                if (navigator.vibrate) {
                  navigator.vibrate(30);
                }
              }}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label.split(' ')[1] || tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="subtitle-style-controls-modern">
      {/* UX FIX #3: Mobile tab navigation */}
      <MobileTabNavigation />
      
      {/* Demo Presets - shown on desktop always, on mobile only when presets tab active */}
      {(!isMobile || activeTab === 'presets') && (
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
      )}

      {/* FIX: Butonul de aplicare setări în header-ul configurărilor */}
      {hasChanges && (
        <div className="pending-changes-panel">
          <div className="pending-changes-info">
            <span className="changes-icon">⚠️</span>
            <span>Aveți modificări neaplicate la configurarea subtitrărilor</span>
          </div>
          <div className="changes-buttons">
            <button 
              onClick={applyChanges}
              className="apply-changes-button"
            >
              ✅ Aplică Setările
            </button>
            <button 
              onClick={resetChanges}
              className="reset-changes-button"
            >
              ↶ Resetează
            </button>
          </div>
        </div>
      )}

      {/* Toate configurațiile într-un singur container fără tab-uri */}
      <div className="unified-controls-container">
        
        {/* Secțiunea Font și Dimensiuni - shown on desktop always, on mobile only when style tab active */}
        {(!isMobile || activeTab === 'style') && (
          <div className="control-group">
            <h4 className="group-title">🎨 Stil Text</h4>
          <div className="controls-grid">
            
            <ModernSelect 
              name="fontFamily"
              value={localStyle.fontFamily}
              label="Font"
              onChange={handleLocalChange}
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

            <FontSizeSpinner 
              value={localStyle.fontSize || 48}
              onChange={handleLocalChange}
            />

            <div className="control-item">
              <span className="control-label">Culoare Text</span>
              <ModernColorSelector 
                colorType="text"
                currentColor={localStyle.fontColor}
                colorName="fontColor"
              />
            </div>

            <div className="control-item">
              <span className="control-label">Culoare Contur</span>
              <ModernColorSelector 
                colorType="border"
                currentColor={localStyle.borderColor}
                colorName="borderColor"
              />
            </div>

            <BorderWidthSpinner 
              value={localStyle.borderWidth || 2}
              onChange={handleLocalChange}
            />

            </div>
          </div>
        )}

        {/* Secțiunea Evidențiere Cuvânt - shown on desktop always, on mobile only when highlight tab active */}
        {(!isMobile || activeTab === 'highlight') && (
          <div className="control-group">
            <h4 className="group-title">✨ Evidențiere Cuvânt</h4>
          <div className="controls-grid">
            
            <ModernToggle 
              name="useKaraoke"
              checked={localStyle.useKaraoke === true}
              label="Activează Karaoke"
              onChange={handleLocalToggle}
            />

            {localStyle.useKaraoke && (
              <>
                <div className="control-item">
                  <span className="control-label">Culoare Evidențiere</span>
                  <ModernColorSelector 
                    colorType="highlight"
                    currentColor={localStyle.currentWordColor || '#FFFF00'}
                    colorName="currentWordColor"
                  />
                </div>

                <div className="control-item">
                  <span className="control-label">Contur Evidențiere</span>
                  <ModernColorSelector 
                    colorType="border"
                    currentColor={localStyle.currentWordBorderColor || '#000000'}
                    colorName="currentWordBorderColor"
                  />
                </div>
              </>
            )}

            </div>
          </div>
        )}

        {/* Secțiunea Poziționare - shown on desktop always, on mobile only when position tab active */}
        {(!isMobile || activeTab === 'position') && (
          <div className="control-group">
            <h4 className="group-title">📍 Poziționare</h4>
          <div className="controls-grid">
            
            <ModernSelect 
              name="position"
              value={localStyle.position}
              label="Poziție Predefinită"
              onChange={handleLocalChange}
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
              onChange={handleCustomPositionToggle}
            />

            {useCustomPosition && (
              <>
                <SimpleRangeSlider 
                  name="customX"
                  value={localStyle.customX || 50}
                  min={0}
                  max={100}
                  label="Poziție X"
                  unit="%"
                />

                <SimpleRangeSlider 
                  name="customY"
                  value={localStyle.customY || 90}
                  min={0}
                  max={100}
                  label="Poziție Y"
                  unit="%"
                />
              </>
            )}

            </div>
          </div>
        )}

        {/* Secțiunea Layout și Opțiuni - shown on desktop always, on mobile only when layout tab active */}
        {(!isMobile || activeTab === 'layout') && (
          <div className="control-group">
            <h4 className="group-title">📐 Layout și Opțiuni</h4>
          <div className="controls-grid">
            
            <SimpleRangeSlider 
              name="maxLines"
              value={localStyle.maxLines || 2}
              min={1}
              max={4}
              label="Linii Maxime"
            />

            <ModernToggle 
              name="allCaps"
              checked={localStyle.allCaps || false}
              label="ALL CAPS"
              onChange={handleLocalToggle}
            />

            <ModernToggle 
              name="removePunctuation"
              checked={localStyle.removePunctuation || false}
              label="Fără Punctuație"
              onChange={handleLocalToggle}
            />

            </div>
          </div>
        )}

        {/* Salvare presetări - shown on desktop always, on mobile only when saved tab active */}
        {(!isMobile || activeTab === 'saved') && (
          <div className="control-group">
            <h4 className="group-title">💾 Presetări Personale</h4>
          
          {/* Buton salvare centralizat și mare */}
          <div style={{ 
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            {!showSavePreset ? (
              <button 
                onClick={() => setShowSavePreset(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 32px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '1rem',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: '300px'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
                }}
              >
                💾 Salvează Configurația Curentă
              </button>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                alignItems: 'center',
                maxWidth: '300px',
                margin: '0 auto'
              }}>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Numele presetării"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && savePreset()}
                />
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button 
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    style={{
                      flex: 1,
                      background: presetName.trim() ? '#10b981' : '#e5e7eb',
                      color: presetName.trim() ? 'white' : '#9ca3af',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: '600'
                    }}
                  >
                    ✅ Salvează
                  </button>
                  <button 
                    onClick={() => {
                      setShowSavePreset(false);
                      setPresetName('');
                    }}
                    style={{
                      flex: 1,
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ❌ Anulează
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lista simplificată de presetări */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px'
          }}>
            <div style={{
              fontWeight: '700',
              fontSize: '0.9rem',
              color: '#1e293b',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              📋 Presetări Disponibile ({presets.length})
            </div>
            
            {presets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                padding: '20px'
              }}>
                Nu există presetări salvate
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {presets.map((preset) => (
                  <div key={preset.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: preset.isDemo ? 
                      'rgba(102, 126, 234, 0.1)' : 
                      'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '0.9rem',
                        color: preset.isDemo ? '#4f46e5' : '#1e293b',
                        marginBottom: '4px'
                      }}>
                        {preset.name}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b'
                      }}>
                        {preset.style?.fontFamily} {preset.style?.fontSize}px
                        {preset.isDemo && ' • Demo'}
                        {preset.style?.useKaraoke && ' • 🎤'}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => loadPreset(preset)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        📥
                      </button>
                      
                      {!preset.isDemo && (
                        <button 
                          onClick={() => deletePreset(preset.id)}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          🗑️
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

        {/* Info Box - Status actual - always shown on desktop, shown on all tabs on mobile */}
        <div className="status-info-box">
          <div className="status-row">
            <span className="status-label">Font:</span>
            <span className="status-value">{localStyle.fontFamily} {localStyle.fontSize}px</span>
          </div>
          <div className="status-row">
            <span className="status-label">Contur:</span>
            <span className="status-value">{localStyle.borderWidth}px</span>
          </div>
          <div className="status-row">
            <span className="status-label">Linii:</span>
            <span className="status-value">{localStyle.maxLines || 2}</span>
          </div>
          <div className="status-row">
            <span className="status-label">Karaoke:</span>
            <span className={`status-value ${localStyle.useKaraoke ? 'active' : 'inactive'}`}>
              {localStyle.useKaraoke ? 'ACTIV' : 'DEZACTIVAT'}
            </span>
          </div>
          <div className="status-row">
            <span className="status-label">Poziție:</span>
            <span className="status-value">
              {useCustomPosition ? 
                `Manual (${localStyle.customX}%, ${localStyle.customY}%)` : 
                localStyle.position
              }
            </span>
          </div>
          {hasChanges && (
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className="status-value" style={{ color: '#f59e0b' }}>
                MODIFICĂRI NEAPLICATE
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubtitlesConfig;