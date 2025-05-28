import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';
import ProgressBar from './ProgressBar';
import SubtitlesConfig from './SubtitlesConfig';
import SubtitlePreview from './SubtitlePreview';
import EditableSubtitleItem from './EditableSubtitleItem';
import './App.css';
import './ProgressBar.css';

// Backend API base URL
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Configurare axios
axios.defaults.timeout = 3600000; // 1 oră pentru încărcări mari

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [subtitles, setSubtitles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [outputVideo, setOutputVideo] = useState('');
  const [apiStatus, setApiStatus] = useState('Verificare conexiune...');
  const [layoutMode, setLayoutMode] = useState('side'); // 'side' sau 'bottom'
  const [isMobile, setIsMobile] = useState(false);
  const [loadingModel, setLoadingModel] = useState(''); // Modelul care se încarcă
  
  // Stări pentru model Whisper
  const [whisperModel, setWhisperModel] = useState('small');
  const [availableModels, setAvailableModels] = useState([]);
  const [modelLoading, setModelLoading] = useState(false);
  
  // Stări pentru videoplayer și subtitrări
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  
  // Stări pentru monitorizarea progresului
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTaskId, setUploadTaskId] = useState(null);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcribeTaskId, setTranscribeTaskId] = useState(null);
  const [processProgress, setProcessProgress] = useState(0);
  const [processTaskId, setProcessTaskId] = useState(null);
  const [progressStatus, setProgressStatus] = useState('');
  
  // Stări pentru secțiuni colapsabile pe mobil - stabilizate
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [whisperSelectorExpanded, setWhisperSelectorExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    whisper: true,
    settings: false // Configurările sunt inițial colapsate pe ambele platforme
  });
  const [videoFitMode, setVideoFitMode] = useState('cover'); // 'cover' sau 'contain'
  
  const [subtitleStyle, setSubtitleStyle] = useState({
    fontSize: 24,
    fontColor: '#FFFFFF',
    backgroundColor: '#000000',
    opacity: 80,
    position: 'bottom', // 'bottom', 'top', 'middle', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    fontFamily: 'Bebas Neue', // Font default
    borderColor: '#000000',
    borderWidth: 2,
    maxLines: 1,  // Inițializat cu 1 linie
    maxWidth: 50, // Procentaj din lățimea videoului
    maxWordsPerLine: 3, // Inițializat cu 3 cuvinte per linie
    useCustomPosition: false, // Flag pentru activarea poziției personalizate
    customX: 50, // Poziția X procentuală (0-100)
    customY: 90,  // Poziția Y procentuală (0-100)
    currentWordColor: '#FFFF00', // Culoare cuvânt curent (galben default)
    currentWordBorderColor: '#000000', // Culoare contur cuvânt curent
    allCaps: true, // Opțiune pentru ALL CAPS
    removePunctuation: false, // Opțiune pentru eliminarea punctuației
    useKaraoke: false // Modificat din true în false pentru a dezactiva implicit evidențierea cuvântului curent
  });

  const fileInputRef = useRef();
  const videoPlayerRef = useRef();
  const playerContainerRef = useRef();

  // Detectare mobil și verificare conexiune API
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
      setIsMobile(isMobileDevice);
      
      // Pe mobil, layout-ul este mereu 'bottom'
      if (isMobileDevice) {
        setLayoutMode('bottom');
        // Pe mobil, setările sunt inițial colapsate pentru a economisi spațiu
        setSettingsExpanded(false);
        // Pe mobil, Whisper selector rămâne expandat pentru acces ușor
        setExpandedSections(prev => ({
          ...prev,
          whisper: true,
          settings: false
        }));
      }
    };
    
    const testApiConnection = async () => {
      try {
        const response = await axios.get(`${API_URL}/test`);
        if (response.status === 200) {
          setApiStatus('API conectat cu succes');
          console.log('API test response:', response.data);
        }
      } catch (err) {
        setApiStatus(`Eroare la conectarea la API: ${err.message}`);
        console.error('API connection error:', err);
      }
    };

    const fetchAvailableModels = async () => {
      try {
        const response = await axios.get(`${API_URL}/available-models`);
        setAvailableModels(response.data.models);
        setWhisperModel(response.data.current_model);
        console.log('Available models:', response.data);
      } catch (err) {
        console.error('Error fetching available models:', err);
        // Setăm modele default dacă API-ul nu răspunde
        setAvailableModels([
          { 
            value: 'base', 
            name: 'Base', 
            size: '39MB'
          },
          { 
            value: 'small', 
            name: 'Small', 
            size: '244MB'
          },
          { 
            value: 'medium', 
            name: 'Medium', 
            size: '769MB'
          },
          { 
            value: 'large', 
            name: 'Large', 
            size: '1.5GB'
          }
        ]);
      }
    };

    checkMobile();
    testApiConnection();
    fetchAvailableModels();
    
    // Adaugă listener pentru resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Funcție pentru schimbarea modelului Whisper
  const handleModelChange = async (newModel) => {
    if (newModel === whisperModel || isProcessing) return;
    
    setModelLoading(true);
    setLoadingModel(newModel);
    try {
      const response = await axios.post(`${API_URL}/change-model`, { model: newModel });
      setWhisperModel(newModel);
      setUploadStatus(`Model schimbat la ${newModel.toUpperCase()} cu succes!`);
      console.log('Model changed:', response.data);
    } catch (err) {
      console.error('Error changing model:', err);
      setError(`Eroare la schimbarea modelului: ${err.response?.data?.error || err.message}`);
    } finally {
      setModelLoading(false);
      setLoadingModel('');
    }
  };
  
  // Funcție pentru monitorizarea progresului unei activități
  const pollTaskProgress = async (taskId, setProgressFunc, taskType, completionCallback = null) => {
    if (!taskId) return;
    
    const checkProgress = async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${taskId}`);
        if (response.data && response.data.progress !== undefined) {
          setProgressFunc(response.data.progress);
          setProgressStatus(response.data.message || '');
          
          // Dacă task-ul nu e complet, continuăm polling-ul
          if (response.data.status !== 'completed' && response.data.status !== 'error') {
            setTimeout(checkProgress, 1000);
          } else if (response.data.status === 'error') {
            setError(`Eroare: ${response.data.message}`);
            setIsProcessing(false);
          } else if (response.data.status === 'completed' && completionCallback) {
            // Apelăm callback-ul la finalizare
            completionCallback(response.data);
          }
        }
      } catch (err) {
        console.error(`Error checking ${taskType} progress:`, err);
        setTimeout(checkProgress, 2000); // În caz de eroare, mărim intervalul
      }
    };
    
    // Pornim verificarea periodică
    checkProgress();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setUploadStatus('');
      setError('');
      setUploadedFileName('');
      setSubtitles([]);
      setOutputVideo('');
      
      // Încărcăm automat fișierul după ce e selectat
      handleUpload(file);
    }
  };

  const handleUpload = async (fileToUpload = null) => {
    const file = fileToUpload || videoFile;
    if (!file) {
      setError('Vă rugăm să selectați un fișier video.');
      return;
    }

    setError('');
    setIsProcessing(true);
    setUploadStatus('Se încarcă videoclipul...');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`Uploading to ${API_URL}/upload`);
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: false,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          setUploadStatus(`Încărcare video: ${percentCompleted}%`);
        }
      });

      setUploadStatus('Videoclip încărcat cu succes!');
      setUploadedFileName(response.data.filename);
      
      // Verificăm progresul pe server dacă primim un task_id
      if (response.data.task_id) {
        setUploadTaskId(response.data.task_id);
        pollTaskProgress(response.data.task_id, setUploadProgress, 'upload');
      }
      
      setIsProcessing(false);
    } catch (err) {
      console.error('Error uploading video:', err);
      setError(`Eroare la încărcarea videoclipului: ${err.message || 'Eroare necunoscută'}`);
      setIsProcessing(false);
    }
  };

  const generateSubtitles = async () => {
    if (!uploadedFileName) {
      setError('Vă rugăm să încărcați mai întâi un videoclip.');
      return;
    }

    setError('');
    setUploadStatus(`Se generează subtitrările cu modelul ${whisperModel.toUpperCase()}... Acest proces poate dura câteva minute.`);
    setIsProcessing(true);
    setTranscribeProgress(0);

    try {
      // Trimitem și stilul actual pentru a fi folosit la generarea subtitrărilor
      // Include și modelul Whisper selectat
      const response = await axios.post(`${API_URL}/generate-subtitles`, {
        filename: uploadedFileName,
        style: subtitleStyle,
        model: whisperModel  // Adăugăm modelul selectat
      });

      // Folosim direct subtitrările din răspuns, fără modificări de timing
      setSubtitles(response.data.subtitles);
      
      const modelUsed = response.data.model_used || whisperModel;
      setUploadStatus(`Subtitrări generate cu succes folosind modelul ${modelUsed.toUpperCase()}!`);
      
      // Verificăm progresul pe server dacă primim un task_id
      if (response.data.task_id) {
        setTranscribeTaskId(response.data.task_id);
        pollTaskProgress(response.data.task_id, setTranscribeProgress, 'transcribe');
      } else {
        setTranscribeProgress(100);
      }
    } catch (err) {
      console.error('Error generating subtitles:', err);
      setError(`Eroare la generarea subtitrărilor: ${err.response?.data?.error || err.message}`);
      setTranscribeProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStyleChange = (e) => {
    const { name, value } = e.target;
    setSubtitleStyle(prev => ({
      ...prev,
      [name]: name === 'maxLines' || name === 'maxWidth' || name === 'maxWordsPerLine' || 
               name === 'customX' || name === 'customY' || name === 'fontSize' ? 
               parseInt(value, 10) : value
    }));
  };
  
  // Funcție pentru actualizarea poziției subtitrărilor prin drag-and-drop
  const updateSubtitlePosition = (x, y, enableCustomPosition = false) => {
    setSubtitleStyle(prev => ({
      ...prev,
      customX: Math.round(x),
      customY: Math.round(y),
      useCustomPosition: enableCustomPosition ? true : prev.useCustomPosition
    }));
  };

  // Funcție pentru actualizarea unei subtitrări
  const updateSubtitle = (index, newText) => {
    const updatedSubtitles = [...subtitles];
    updatedSubtitles[index] = {
      ...updatedSubtitles[index],
      text: newText
    };
    setSubtitles(updatedSubtitles);
    
    // Dacă subtitrarea e cea curent afișată, actualizăm și starea currentTime
    // pentru a forța reîmprospătarea previzualizării
    if (currentTime >= updatedSubtitles[index].start && 
        currentTime <= updatedSubtitles[index].end) {
      // Facem o mică modificare la currentTime pentru a forța reactualizarea
      setCurrentTime(prev => prev + 0.001);
    }
  };

  // Funcție pentru a descărca direct un fișier
  const directDownload = (url) => {
    console.log("Downloading from URL:", url);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', ''); // Forțează descărcarea
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createAndDownloadVideoWithSubtitles = async () => {
    if (!uploadedFileName || subtitles.length === 0) {
      setError('Asigurați-vă că ați încărcat un videoclip și ați generat subtitrări.');
      return;
    }

    setError('');
    setIsProcessing(true);
    setUploadStatus('Se creează videoclipul cu subtitrări... Acest proces poate dura câteva minute.');
    setProcessProgress(0);

    try {
      // Transmitem toate opțiunile de stil inclusiv useKaraoke pentru evidențierea cuvintelor
      // și poziționarea personalizată dacă există
      const response = await axios.post(`${API_URL}/create-video`, {
        filename: uploadedFileName,
        subtitles: subtitles,
        style: subtitleStyle
      });

      setOutputVideo(response.data.output_filename);
      setUploadStatus('Videoclip cu subtitrări creat. Se inițiază descărcarea...');
      
      // Verificăm progresul pe server
      if (response.data.task_id) {
        setProcessTaskId(response.data.task_id);
        
        // Folosim polling cu funcție de callback
        const monitorProgress = async () => {
          try {
            const statusResponse = await axios.get(`${API_URL}/status/${response.data.task_id}`);
            if (statusResponse.data && statusResponse.data.progress !== undefined) {
              setProcessProgress(statusResponse.data.progress);
              setProgressStatus(statusResponse.data.message || '');
              
              // Verificăm statusul
              if (statusResponse.data.status === 'completed') {
                // Descărcăm automat fișierul când procesarea e gata
                const downloadUrl = `${API_URL}/download/${response.data.output_filename}`;
                console.log("Download initiated for:", downloadUrl);
                directDownload(downloadUrl);
                setUploadStatus('Videoclip cu subtitrări creat și descărcat cu succes!');
                setIsProcessing(false); // Oprim rotița de progres
                return; // Oprim monitorizarea
              } else if (statusResponse.data.status === 'error') {
                setError(`Eroare: ${statusResponse.data.message}`);
                setIsProcessing(false);
                return; // Oprim monitorizarea
              } 
              
              // Continuăm monitorizarea dacă task-ul e în curs
              setTimeout(monitorProgress, 1000);
            }
          } catch (err) {
            console.error("Error monitoring task:", err);
            setIsProcessing(false); // Oprim rotița în caz de eroare
            setError(`Eroare la monitorizarea progresului: ${err.message}`);
          }
        };
        
        // Începem monitorizarea
        monitorProgress();
      } else {
        setProcessProgress(100);
        // Descărcăm direct fișierul dacă nu avem task_id
        const downloadUrl = `${API_URL}/download/${response.data.output_filename}`;
        directDownload(downloadUrl);
        setUploadStatus('Videoclip cu subtitrări creat și descărcat cu succes!');
        setIsProcessing(false); // Oprim rotița de progres
      }
    } catch (err) {
      console.error('Error creating video with subtitles:', err);
      setError(`Eroare la crearea videoclipului: ${err.response?.data?.error || err.message}`);
      setProcessProgress(0);
      setIsProcessing(false); // Asigurăm oprirea rotiței în caz de eroare
    }
  };

  const downloadVideo = () => {
    if (outputVideo) {
      window.open(`${API_URL}/download/${outputVideo}`, '_blank');
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const seekToTime = (time) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(time, 'seconds');
      // Setam playing la true pentru a vedea imediat subtitrarea
      setPlaying(true);
    }
  };
  
  // Toggle intre layout side/bottom (doar pe desktop)
  const toggleLayoutMode = () => {
    if (!isMobile) {
      setLayoutMode(prev => prev === 'side' ? 'bottom' : 'side');
    }
  };
  
  // Handler pentru actualizarea timpului curent al videoclipului
  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
  };

  // Obține descrierea modelului curent
  const getCurrentModelDescription = () => {
    const currentModel = availableModels.find(model => model.value === whisperModel);
    return currentModel ? currentModel.description : '';
  };

  // Componente pentru secțiuni colapsabile pe mobil - stabilizate
  const CollapsibleSection = ({ title, sectionKey, children, defaultExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(expandedSections[sectionKey] ?? defaultExpanded);
    
    const toggleExpanded = () => {
      const newState = !isExpanded;
      setIsExpanded(newState);
      setExpandedSections(prev => ({
        ...prev,
        [sectionKey]: newState
      }));
    };
    
    return (
      <div className="collapsible-section">
        <button 
          className="collapsible-header"
          onClick={toggleExpanded}
          type="button"
        >
          <span>{title}</span>
          <span className={`collapsible-arrow ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        <div className={`collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
          <div style={{ padding: isExpanded ? '20px' : '0 20px' }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Generator de Subtitrări Automate</h1>
        {isMobile && (
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
            Interfață optimizată pentru mobil
          </p>
        )}
      </header>

      <div className="main-container">
        <section className="control-panel">
          <h2>Acțiuni</h2>
          
          <div className="control-panel-content">
            {/* Selector pentru modelul Whisper - ULTRA COMPACT */}
            <div className="whisper-model-selector ultra-compact">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                  Model:
                </label>
                <select 
                  value={whisperModel} 
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="model-select ultra-compact"
                  disabled={isProcessing || modelLoading}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    minWidth: '120px'
                  }}
                >
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.name} ({model.size})
                    </option>
                  ))}
                </select>
                <span className={`model-indicator compact ${whisperModel}`} style={{
                  fontSize: '0.7rem',
                  padding: '4px 8px'
                }}>
                  {whisperModel.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="horizontal-controls">
              <div className="file-select-area">
                <label className="control-label">1. Selectați video:</label>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  className="file-input"
                />
              </div>
              
              <button 
                onClick={generateSubtitles} 
                disabled={!uploadedFileName || isProcessing || modelLoading}
                className="action-button generate-button"
              >
                2. Generează Subtitrări ({whisperModel.toUpperCase()})
              </button>
              
              <button 
                onClick={createAndDownloadVideoWithSubtitles} 
                disabled={!subtitles.length || isProcessing}
                className="action-button create-button"
              >
                3. Creează & Descarcă Video
              </button>
            </div>
          </div>
          
          {/* Bare de progres */}
          <div className="progress-indicators">
            {uploadProgress > 0 && uploadProgress < 100 && (
              <ProgressBar 
                progress={uploadProgress} 
                label="Progres încărcare" 
                status={progressStatus || "Se încarcă fișierul..."}
              />
            )}
            
            {transcribeProgress > 0 && transcribeProgress < 100 && (
              <ProgressBar 
                progress={transcribeProgress} 
                label={`Progres generare subtitrări (${whisperModel.toUpperCase()})`}
                status={progressStatus || "Se procesează audio..."}
              />
            )}
            
            {processProgress > 0 && processProgress < 100 && (
              <ProgressBar 
                progress={processProgress}
                label="Progres creare video"
                status={progressStatus || "Se procesează video..."}
              />
            )}
          </div>
        </section>

        {videoUrl && (
          <section className="video-section">
            <h2>Previzualizare și editare</h2>
            
            {!isMobile && (
              <div className="layout-controls">
                <button 
                  onClick={toggleLayoutMode} 
                  className="layout-toggle-button"
                >
                  Schimbă Layout: {layoutMode === 'side' ? 'Lateral' : 'Sub video'}
                </button>
              </div>
            )}
            
            <div className={`video-subtitle-container ${layoutMode}`}>
              {/* ========== VIDEO PREVIEW - PRIMUL ELEMENT ========== */}
              <div className="video-preview-container">
                <div className="player-wrapper" ref={playerContainerRef}>
                  <ReactPlayer 
                    ref={videoPlayerRef}
                    url={videoUrl} 
                    controls 
                    width="100%" 
                    height="100%" 
                    className={`react-player ${isMobile && videoFitMode === 'contain' ? 'contain-video' : ''}`}
                    playing={playing}
                    onProgress={handleProgress}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                  />
                  
                  {/* Overlay pentru subtitrări peste video */}
                  {subtitles.length > 0 && (
                    <SubtitlePreview 
                      subtitles={subtitles}
                      currentTime={currentTime}
                      subtitleStyle={subtitleStyle}
                      updatePosition={updateSubtitlePosition}
                      updateSubtitle={updateSubtitle}
                    />
                  )}
                </div>
              </div>
              
              {/* ========== INSTRUCTIUNI MOBILE - ULTRA COMPACT ========== */}
              {isMobile && subtitles.length > 0 && (
                <div className="mobile-instructions compact">
                  <span className="emoji">💡</span>
                  <span style={{ fontSize: '0.8rem' }}>Drag subtitrarea pentru poziționare</span>
                  <button
                    onClick={() => {
                      const newMode = videoFitMode === 'cover' ? 'contain' : 'cover';
                      setVideoFitMode(newMode);
                      // Force update video player
                      if (videoPlayerRef.current) {
                        const videoEl = videoPlayerRef.current.getInternalPlayer();
                        if (videoEl && videoEl.style) {
                          videoEl.style.objectFit = newMode;
                        }
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      background: 'rgba(102, 126, 234, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    title={videoFitMode === 'cover' ? 'Arată tot video-ul' : 'Umple ecranul'}
                  >
                    {videoFitMode === 'cover' ? '📐' : '📱'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ========== CONFIGURARI SUBTITLES - COLAPSABILE COMPACT ========== */}
        {subtitles.length > 0 && (
          <section className="customize-section ultra-compact">
            <CollapsibleSection 
              title="🎨 Configurări"
              sectionKey="settings"
              defaultExpanded={false}
            >
              <SubtitlesConfig 
                subtitleStyle={subtitleStyle}
                handleStyleChange={handleStyleChange}
                compact={true}
              />
            </CollapsibleSection>
          </section>
        )}

        {/* ========== SUBTITLES PANEL ========== */}
        {subtitles.length > 0 && (
          <div className="subtitles-panel">
            <h4>
              Subtitrări ({subtitles.length})
            </h4>
            <div className="subtitles-list">
              <div className="subtitle-header">
                <span className="subtitle-time">Timp</span>
                <span className="subtitle-text">Text</span>
                <span className="subtitle-duration">Dur.</span>
              </div>
              
              <div className="subtitle-items-container">
                {subtitles.map((subtitle, index) => (
                  <EditableSubtitleItem
                    key={index}
                    subtitle={subtitle}
                    index={index}
                    formatTime={formatTime}
                    updateSubtitle={updateSubtitle}
                    seekToTime={seekToTime}
                    isActive={currentTime >= subtitle.start && currentTime <= subtitle.end}
                    subtitleStyle={subtitleStyle}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== STATUS MESSAGES - MOVED TO BOTTOM ========== */}
        <div className="bottom-status">
          {uploadStatus && (
            <div className={`status-message compact ${error ? 'error' : ''}`}>
              {uploadStatus}
            </div>
          )}
          
          {error && (
            <div className="error-message compact">
              {error}
            </div>
          )}
          
          <div className="api-status compact">
            API: {apiStatus.replace('Status API: ', '')}
            {availableModels.length > 0 && (
              <span> | Model: <strong>{whisperModel.toUpperCase()}</strong></span>
            )}
            {isMobile && <span> | 📱</span>}
          </div>
        </div>
        
        {(isProcessing || modelLoading) && (
          <div className="processing-overlay">
            <div className="processing-spinner"></div>
            <p>
              {modelLoading 
                ? `Se încarcă modelul ${loadingModel.toUpperCase()}...`
                : 'Se procesează... Vă rugăm să așteptați.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;