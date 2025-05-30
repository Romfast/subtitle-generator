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

// DEMO PRESETS - EXTINS cu presetări noi
const DEMO_PRESETS = {
  'default': {
    name: 'Default',
    description: 'Setările recomandate pentru majoritatea videoclipurilor - verde deschis cu evidențiere galbenă',
    icon: '⭐',
    style: {
      fontSize: 48,
      fontFamily: 'Bebas Neue',
      fontColor: '#90EE90', // Verde deschis (Light Green)
      borderColor: '#000000',
      borderWidth: 2,
      position: 'bottom-30',
      useCustomPosition: true,
      customX: 50,
      customY: 70,
      allCaps: true,
      removePunctuation: false,
      useKaraoke: true,
      maxLines: 1,
      maxWordsPerLine: 4,
      currentWordColor: '#FFFF00', // Galben pentru evidențiere
      currentWordBorderColor: '#000000'
    }
  },  
  'cinema_classic': {
    name: 'Cinema Clasic',
    description: 'Stil clasic de cinema cu font mare și contur pronunțat',
    icon: '🎬',
    style: {
      fontSize: 32,
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
  'single_word_focus': {
    name: 'Un Cuvânt Focus',
    description: 'Un singur cuvânt evidențiat pe rând - perfect pentru impact maxim și atenție focalizată',
    icon: '🎯',
    style: {
      fontSize: 48,
      fontFamily: 'Poppins',
      fontColor: '#FFFFFF',
      borderColor: '#000000',
      borderWidth: 3,
      position: 'bottom-30',
      useCustomPosition: false,
      customX: 50,
      customY: 50,
      allCaps: true,
      removePunctuation: false,
      useKaraoke: true, // CRITICAL: Activat pentru evidențierea cuvântului
      maxLines: 1,
      maxWordsPerLine: 1, // CRITICAL: UN SINGUR CUVÂNT PER LINIE!
      currentWordColor: '#FF3366',
      currentWordBorderColor: '#FFFFFF'
    }
  },
  'rounded_soft': {
    name: 'Rotunjit Soft',
    description: 'Fonturi rotunjite și stiluri moi pentru un look prietenos',
    icon: '🌸',
    style: {
      fontSize: 28,
      fontFamily: 'Nunito',
      fontColor: '#F8F9FA',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      position: 'bottom-20',
      useCustomPosition: false,
      customX: 50,
      customY: 80,
      allCaps: false,
      removePunctuation: false,
      useKaraoke: true,
      maxLines: 2,
      maxWordsPerLine: 3,
      currentWordColor: '#F472B6',
      currentWordBorderColor: '#BE185D'
    }
  },
  'bold_impact': {
    name: 'Bold Impact',
    description: 'Font foarte mare și vizibil pentru impact maxim',
    icon: '💥',
    style: {
      fontSize: 64,
      fontFamily: 'Inter',
      fontColor: '#FFFFFF',
      borderColor: '#1F2937',
      borderWidth: 4,
      position: 'bottom-20',
      useCustomPosition: false,
      customX: 50,
      customY: 85,
      allCaps: true,
      removePunctuation: true,
      useKaraoke: false,
      maxLines: 1,
      maxWordsPerLine: 2,
      currentWordColor: '#EF4444',
      currentWordBorderColor: '#7F1D1D'
    }
  },
  'neon_futuristic': {
    name: 'Neon Futuristic',
    description: 'Stil futuristic cu culori neon și efecte vizuale',
    icon: '⚡',
    style: {
      fontSize: 36,
      fontFamily: 'Source Sans Pro',
      fontColor: '#00FFFF',
      borderColor: '#8B00FF',
      borderWidth: 2,
      position: 'bottom-30',
      useCustomPosition: false,
      customX: 50,
      customY: 30,
      allCaps: true,
      removePunctuation: false,
      useKaraoke: true,
      maxLines: 1,
      maxWordsPerLine: 3,
      currentWordColor: '#00FF88',
      currentWordBorderColor: '#FF0080'
    }
  },
  'documentary_clean': {
    name: 'Documentary Clean',
    description: 'Stil curat și profesional pentru documentare',
    icon: '📺',
    style: {
      fontSize: 26,
      fontFamily: 'Open Sans',
      fontColor: '#F9FAFB',
      borderColor: '#374151',
      borderWidth: 1,
      position: 'bottom-20',
      useCustomPosition: false,
      customX: 50,
      customY: 90,
      allCaps: false,
      removePunctuation: false,
      useKaraoke: false,
      maxLines: 2,
      maxWordsPerLine: 4,
      currentWordColor: '#3B82F6',
      currentWordBorderColor: '#1E40AF'
    }
  },
  'minimal_ultra': {
    name: 'Minimal Ultra',
    description: 'Extrem de simplu - doar text fără efecte',
    icon: '⚪',
    style: {
      fontSize: 24,
      fontFamily: 'Inter',
      fontColor: '#FFFFFF',
      borderColor: '#FFFFFF',
      borderWidth: 0,
      position: 'bottom-20',
      useCustomPosition: false,
      customX: 50,
      customY: 95,
      allCaps: false,
      removePunctuation: false,
      useKaraoke: false,
      maxLines: 1,
      maxWordsPerLine: 4,
      currentWordColor: '#D1D5DB',
      currentWordBorderColor: '#9CA3AF'
    }
  },
  'karaoke_party': {
    name: 'Karaoke Party',
    description: 'Perfect pentru karaoke cu evidențiere colorată',
    icon: '🎤',
    style: {
      fontSize: 42,
      fontFamily: 'Poppins',
      fontColor: '#FBBF24',
      borderColor: '#7C2D12',
      borderWidth: 3,
      position: 'bottom-30',
      useCustomPosition: false,
      customX: 50,
      customY: 45,
      allCaps: false,
      removePunctuation: false,
      useKaraoke: true,
      maxLines: 2,
      maxWordsPerLine: 2,
      currentWordColor: '#F59E0B',
      currentWordBorderColor: '#92400E'
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
    // CRITICAL FIX: Aplicăm toate setările prin handleStyleChange pentru sincronizare completă
    const newStyle = { ...preset.style };
    
    // Aplicăm fiecare setare individual pentru a declanșa toate update-urile
    Object.keys(newStyle).forEach(key => {
      handleStyleChange({
        target: {
          name: key,
          value: newStyle[key]
        }
      });
    });
    
    // Actualizează și starea locală pentru poziționare personalizată
    setUseCustomPosition(newStyle.useCustomPosition || false);
    
    // Log pentru debugging
    console.log(`Preset "${preset.name}" loaded with full sync`, newStyle);
    
    window.alert(`Presetarea "${preset.name}" a fost aplicată!`);
  };

  // Aplică preset demo direct - FIX COMPLET PENTRU SINCRONIZARE
  const applyDemoPreset = (presetKey) => {
    const preset = DEMO_PRESETS[presetKey];
    if (preset) {
      // CRITICAL FIX: Aplicăm toate setările prin handleStyleChange pentru sincronizare completă
      const newStyle = { ...preset.style };
      
      // Aplicăm fiecare setare individual pentru a declanșa toate update-urile
      Object.keys(newStyle).forEach(key => {
        handleStyleChange({
          target: {
            name: key,
            value: newStyle[key]
          }
        });
      });
      
      // Actualizează și starea locală pentru poziționare personalizată
      setUseCustomPosition(newStyle.useCustomPosition || false);
      
      // Log pentru debugging
      console.log(`Demo preset "${preset.name}" applied with full sync`, newStyle);
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

  // NEW: Determină ce configurări se aplică pentru styling
  const getActiveStyleConfiguration = () => {
    const config = {
      general: {
        font: subtitleStyle.fontFamily,
        size: subtitleStyle.fontSize,
        color: subtitleStyle.fontColor,
        border: subtitleStyle.borderColor,
        borderWidth: subtitleStyle.borderWidth,
        position: subtitleStyle.useCustomPosition ? 
          `Custom (${subtitleStyle.customX}%, ${subtitleStyle.customY}%)` : 
          subtitleStyle.position,
        caps: subtitleStyle.allCaps,
        punctuation: !subtitleStyle.removePunctuation
      },
      highlight: {
        enabled: subtitleStyle.useKaraoke,
        color: subtitleStyle.currentWordColor,
        border: subtitleStyle.currentWordBorderColor,
        effect: 'Mărime mărită + culoare'
      },
      layout: {
        wordsPerLine: subtitleStyle.maxWordsPerLine,
        maxLines: subtitleStyle.maxLines,
        mode: subtitleStyle.maxWordsPerLine === 1 ? 'Single Word Focus' : 'Multi-word'
      }
    };

    return config;
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

  // NEW: Componentă pentru afișarea configurației active
  const ActiveConfigurationDisplay = () => {
    const config = getActiveStyleConfiguration();
    
    return (
      <div className="active-configuration-display" style={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '0.9rem',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚙️</span>
          Configurația Activă
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
          fontSize: '0.8rem'
        }}>
          {/* Configurații Generale */}
          <div className="config-section">
            <div style={{ fontWeight: '600', color: '#667eea', marginBottom: '6px' }}>
              📝 Text General
            </div>
            <div style={{ color: '#64748b', lineHeight: '1.4' }}>
              <div>Font: <strong>{config.general.font}</strong></div>
              <div>Mărime: <strong>{config.general.size}px</strong></div>
              <div>Culoare: <span style={{ 
                display: 'inline-block', 
                width: '12px', 
                height: '12px', 
                backgroundColor: config.general.color,
                borderRadius: '2px',
                verticalAlign: 'middle',
                marginRight: '4px',
                border: '1px solid #ccc'
              }}></span><strong>{config.general.color}</strong></div>
              <div>Poziție: <strong>{config.general.position}</strong></div>
            </div>
          </div>

          {/* Configurații Evidențiere */}
          <div className="config-section">
            <div style={{ fontWeight: '600', color: config.highlight.enabled ? '#f59e0b' : '#9ca3af', marginBottom: '6px' }}>
              ✨ Evidențiere Cuvânt
            </div>
            <div style={{ color: '#64748b', lineHeight: '1.4' }}>
              <div>Status: <strong style={{ color: config.highlight.enabled ? '#059669' : '#dc2626' }}>
                {config.highlight.enabled ? 'ACTIVĂ' : 'DEZACTIVATĂ'}
              </strong></div>
              {config.highlight.enabled && (
                <>
                  <div>Culoare: <span style={{ 
                    display: 'inline-block', 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: config.highlight.color,
                    borderRadius: '2px',
                    verticalAlign: 'middle',
                    marginRight: '4px',
                    border: '1px solid #ccc'
                  }}></span><strong>{config.highlight.color}</strong></div>
                  <div>Efect: <strong>{config.highlight.effect}</strong></div>
                </>
              )}
            </div>
          </div>

          {/* Configurații Layout */}
          <div className="config-section">
            <div style={{ fontWeight: '600', color: '#8b5cf6', marginBottom: '6px' }}>
              📐 Layout
            </div>
            <div style={{ color: '#64748b', lineHeight: '1.4' }}>
              <div>Mod: <strong style={{ 
                color: config.layout.mode === 'Single Word Focus' ? '#dc2626' : '#059669' 
              }}>
                {config.layout.mode}
              </strong></div>
              <div>Cuvinte/linie: <strong>{config.layout.wordsPerLine}</strong></div>
              <div>Linii max: <strong>{config.layout.maxLines}</strong></div>
            </div>
          </div>
        </div>

        {/* Alertă pentru Single Word Focus */}
        {config.layout.mode === 'Single Word Focus' && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🎯</span>
            <strong>Modul Focus activ:</strong> Se afișează doar un cuvânt pe rând cu evidențiere automată
          </div>
        )}

        {/* Info aplicare configurări */}
        {config.highlight.enabled && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>💡</span>
            <div>
              <strong>Configurări aplicate:</strong><br/>
              • Text normal: folosește configurările generale<br/>
              • Cuvânt evidențiat: folosește configurările de evidențiere + mărire automată
            </div>
          </div>
        )}
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
      
      {/* NEW: Afișare configurație activă */}
      {!compact && <ActiveConfigurationDisplay />}
      
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
              {/* Fonturi rotunjite și moderne */}
              <option value="Poppins">Poppins (Rotunjit Modern)</option>
              <option value="Inter">Inter (Clean & Rotunjit)</option>
              <option value="Nunito">Nunito (Foarte Rotunjit)</option>
              <option value="Open Sans">Open Sans (Clasic Rotunjit)</option>
              <option value="Source Sans Pro">Source Sans Pro (Professional)</option>
              
              {/* Fonturi existente */}
              <option value="Montserrat">Montserrat (Geometric)</option>
              <option value="Quicksand">Quicksand (Friendly)</option>
              <option value="Comfortaa">Comfortaa (Soft)</option>
              
              {/* Fonturi clasice */}
              <option value="Arial">Arial (Standard)</option>
              <option value="Bebas Neue">Bebas Neue (Bold Display)</option>
              
              {!compact && (
                <>
                  <option value="Sans">Sans</option>
                  <option value="Serif">Serif</option>
                  <option value="Monospace">Monospace</option>
                  <option value="Verdana">Verdana</option>
                </>
              )}
            </select>
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se aplică pentru: textul normal al subtitrării
            </p>
          </div>
          
          <div className="style-item">
            <label>Mărime:</label>
            <div className="range-input-container">
              <input 
                type="range" 
                name="fontSize" 
                min="12" 
                max="84" 
                value={subtitleStyle.fontSize} 
                onChange={handleStyleChange}
                className="range-input"
              />
              <span className={`range-value ${subtitleStyle.fontSize > 60 ? 'large-font' : ''}`}>
                {subtitleStyle.fontSize}px
              </span>
            </div>
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Text normal: {subtitleStyle.fontSize}px | Cuvânt evidențiat: ~{Math.round(subtitleStyle.fontSize * 1.15)}px
            </p>
          </div>
          
          <div className="style-item">
            <label>Culoare text normal:</label>
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
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se aplică pentru: cuvintele neevidentiate
            </p>
          </div>
          
          <div className="style-item">
            <label>Contur text normal:</label>
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
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se aplică pentru: conturul cuvintelor neevidentiate
            </p>
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
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se aplică pentru: toate cuvintele (normal + evidențiat)
            </p>
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
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se aplică pentru: toate cuvintele (normal + evidențiat)
            </p>
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
              <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Se aplică pentru: toate cuvintele (normal + evidențiat)
              </p>
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
            <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se aplică pentru: întreaga subtitrare (toate cuvintele)
            </p>
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
              <option value={1}>1 (Focus mode)</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
            {subtitleStyle.maxWordsPerLine === 1 && (
              <p className="help-text" style={{ 
                margin: '4px 0 0 0', 
                fontSize: '0.75rem', 
                color: '#dc2626',
                fontWeight: '600'
              }}>
                🎯 Modul Focus: Se afișează doar un cuvânt pe rând
              </p>
            )}
          </div>
        </ResponsiveStyleGrid>
      )}
      
      {activeTab === 'highlight' && (
        <ResponsiveStyleGrid>
          <div className="style-item karaoke-toggle">
            <label>Activează evidențiere cuvânt:</label>
            <div className="toggle-switch">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={subtitleStyle.useKaraoke === true} 
                  onChange={() => handleToggleChange('useKaraoke')}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label" style={{
                color: subtitleStyle.useKaraoke ? '#059669' : '#dc2626',
                fontWeight: '700'
              }}>
                {subtitleStyle.useKaraoke === true ? 'ACTIVĂ' : 'DEZACTIVATĂ'}
              </span>
            </div>
            {!compact && (
              <p className="help-text">
                Evidențiază cuvântul care este pronunțat în momentul respectiv (timing precis)
              </p>
            )}
          </div>

          {subtitleStyle.useKaraoke && (
            <>
              <div className="style-item">
                <label>Culoare cuvânt evidențiat:</label>
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
                <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  ✨ Se aplică DOAR pentru cuvântul care este pronunțat acum
                </p>
              </div>
              
              <div className="style-item">
                <label>Contur cuvânt evidențiat:</label>
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
                <p className="help-text" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  ✨ Se aplică DOAR pentru conturul cuvântului evidențiat
                </p>
              </div>

              {/* Explicații detaliate despre evidențiere */}
              <div className="style-item" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <label style={{ color: '#047857', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                  💡 Cum funcționează evidențierea:
                </label>
                <div style={{ fontSize: '0.8rem', color: '#047857', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <strong>🎯 Cuvânt evidențiat:</strong>
                  </div>
                  <div style={{ marginLeft: '16px', marginBottom: '8px' }}>
                    • Folosește culoarea de evidențiere<br/>
                    • Folosește conturul de evidențiere<br/>
                    • Este cu ~15% mai mare decât restul<br/>
                    • Are efect de mărire și background subtil
                  </div>
                  
                  <div style={{ marginBottom: '6px' }}>
                    <strong>📝 Cuvinte normale:</strong>
                  </div>
                  <div style={{ marginLeft: '16px' }}>
                    • Folosesc configurările generale (culoare text normal)<br/>
                    • Folosesc conturul general<br/>
                    • Mărime normală (din setările generale)<br/>
                    • Fără efecte speciale
                  </div>
                </div>
              </div>
            </>
          )}

          {!subtitleStyle.useKaraoke && (
            <div className="style-item" style={{
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>😴</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Evidențierea este dezactivată
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  Toate cuvintele vor folosi doar configurările generale
                </div>
              </div>
            </div>
          )}
        </ResponsiveStyleGrid>
      )}
      
      {activeTab === 'presets' && (
        <div className="presets-section">
          {/* Demo Presets Quick Access */}
          <div className="style-item demo-presets">
            <label>Presetări Demo Rapide:</label>
            <div className="demo-presets-grid" style={{
              display: 'grid',
              gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {Object.entries(DEMO_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyDemoPreset(key)}
                  className={`demo-preset-card ${
                    preset.style.fontSize > 60 ? 'large-font-preset' : ''
                  } ${
                    preset.style.maxWordsPerLine === 1 ? 'single-word-preset' : ''
                  } ${
                    preset.style.useKaraoke ? 'karaoke-preset' : ''
                  }`}
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
                  {/* Badges pentru caracteristici speciale */}
                  <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {preset.style.useKaraoke && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: '#f59e0b',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>KARAOKE</span>
                    )}
                    {preset.style.maxWordsPerLine === 1 && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: '#dc2626',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>FOCUS</span>
                    )}
                    {preset.style.fontSize > 60 && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: '#7c2d12',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>XL FONT</span>
                    )}
                  </div>
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
                  <div key={preset.id} className={`preset-item ${preset.isDemo ? 'demo-preset' : ''} ${
                    preset.style?.fontSize > 60 ? 'large-font-preset' : ''
                  } ${
                    preset.style?.maxWordsPerLine === 1 ? 'single-word-preset' : ''
                  } ${
                    preset.style?.useKaraoke ? 'karaoke-preset' : ''
                  }`}>
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
                        <span className="preset-font">{preset.style?.fontFamily} {preset.style?.fontSize}px</span>
                        <span className="preset-position">
                          {preset.style?.useCustomPosition 
                            ? `Poziție: ${preset.style?.customX}%, ${preset.style?.customY}%`
                            : `Poziție: ${preset.style?.position}`
                          }
                        </span>
                        {/* Afișare configurări active */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {preset.style?.useKaraoke && (
                            <span style={{
                              fontSize: '0.6rem',
                              background: '#f59e0b',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>KARAOKE</span>
                          )}
                          {preset.style?.maxWordsPerLine === 1 && (
                            <span style={{
                              fontSize: '0.6rem',
                              background: '#dc2626',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>FOCUS</span>
                          )}
                          {preset.style?.fontSize > 60 && (
                            <span style={{
                              fontSize: '0.6rem',
                              background: '#7c2d12',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>XL FONT</span>
                          )}
                          {preset.style?.allCaps && (
                            <span style={{
                              fontSize: '0.6rem',
                              background: '#6b7280',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>ALL CAPS</span>
                          )}
                        </div>
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
    </div>
  );
};

export default SubtitlesConfig;