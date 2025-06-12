import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';
import ProgressBar from './ProgressBar';
import SubtitlesConfig from './SubtitlesConfig';
import SubtitlePreview from './SubtitlePreview';
import EditableSubtitleItem from './EditableSubtitleItem';
import { useToast } from './Toast'; // UX FIX #5: Import toast system
import './App.css';
import './ProgressBar.css';
import './SubtitlesConfig.css';

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
  const [layoutMode, setLayoutMode] = useState('side');
  const [isMobile, setIsMobile] = useState(false);
  const [loadingModel, setLoadingModel] = useState('');
  
  // UX FIX #5: Toast notification system
  const { addToast, ToastManager } = useToast();
  
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
  
  // FIX: Stări pentru secțiuni colapsabile - SEPARATE pentru fiecare secțiune
  const [sectionsExpanded, setSectionsExpanded] = useState({
    subtitlesList: false,
    subtitlesConfig: false
  });
  
  const [videoFitMode, setVideoFitMode] = useState('cover');
  
  // FIX: DOAR un state pentru subtitrări - ELIMINAT state local duplicat
  const [subtitleStyle, setSubtitleStyle] = useState({
    fontSize: 48,
    fontColor: '#00FF00',
    backgroundColor: '#000000',
    opacity: 80,
    position: 'bottom-30',
    fontFamily: 'Inter',
    borderColor: '#000000',
    borderWidth: 2,
    maxLines: 1,
    maxWidth: 50,
    useCustomPosition: false,
    customX: 50,
    customY: 70,
    currentWordColor: '#FFFF00',
    currentWordBorderColor: '#000000',
    allCaps: true,
    removePunctuation: false,
    useKaraoke: true,
    highlightMode: 'none'
  });

  const fileInputRef = useRef();
  const videoPlayerRef = useRef();
  const playerContainerRef = useRef();

  // Detectare mobil și verificare conexiune API
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
      setIsMobile(isMobileDevice);
      
      if (isMobileDevice) {
        setLayoutMode('bottom');
        // Pe mobil, setăm starea inițială dar nu forțăm colapsarea
        setSectionsExpanded(prev => ({
          ...prev,
          subtitlesList: false,
          subtitlesConfig: false
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
        setAvailableModels([
          { value: 'base', name: 'Base', size: '39MB' },
          { value: 'small', name: 'Small', size: '244MB' },
          { value: 'medium', name: 'Medium', size: '769MB' },
          { value: 'large', name: 'Large', size: '1.5GB' }
        ]);
      }
    };

    checkMobile();
    testApiConnection();
    fetchAvailableModels();
    
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Funcție pentru schimbarea modelului Whisper
  const handleModelChange = async (newModel) => {
    if (newModel === whisperModel || isProcessing) return;
    
    setModelLoading(true);
    setLoadingModel(newModel);
    
    // UX FIX #5: Toast for model loading
    addToast(`Se încarcă modelul ${newModel.toUpperCase()}...`, 'info', 2000, '🔄');
    
    try {
      const response = await axios.post(`${API_URL}/change-model`, { model: newModel });
      setWhisperModel(newModel);
      setUploadStatus(`Model schimbat la ${newModel.toUpperCase()} cu succes!`);
      
      // UX FIX #5: Success toast
      addToast(`Model ${newModel.toUpperCase()} încărcat cu succes!`, 'success', 3000, '✨');
      
      console.log('Model changed:', response.data);
    } catch (err) {
      console.error('Error changing model:', err);
      const errorMsg = `Eroare la schimbarea modelului: ${err.response?.data?.error || err.message}`;
      setError(errorMsg);
      
      // UX FIX #5: Error toast
      addToast('Eroare la încărcarea modelului', 'error', 4000);
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
          
          if (response.data.status !== 'completed' && response.data.status !== 'error') {
            setTimeout(checkProgress, 1000);
          } else if (response.data.status === 'error') {
            setError(`Eroare: ${response.data.message}`);
            setIsProcessing(false);
          } else if (response.data.status === 'completed' && completionCallback) {
            completionCallback(response.data);
          }
        }
      } catch (err) {
        console.error(`Error checking ${taskType} progress:`, err);
        setTimeout(checkProgress, 2000);
      }
    };
    
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
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: false,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          setUploadStatus(`Încărcare video: ${percentCompleted}%`);
        }
      });

      setUploadStatus('Videoclip încărcat cu succes!');
      setUploadedFileName(response.data.filename);
      
      // UX FIX #5: Success toast for upload
      addToast('Video încărcat cu succes!', 'success', 3000, '📹');
      
      if (response.data.task_id) {
        setUploadTaskId(response.data.task_id);
        pollTaskProgress(response.data.task_id, setUploadProgress, 'upload');
      }
      
      setIsProcessing(false);
    } catch (err) {
      console.error('Error uploading video:', err);
      const errorMsg = `Eroare la încărcarea videoclipului: ${err.message || 'Eroare necunoscută'}`;
      setError(errorMsg);
      
      // UX FIX #5: Error toast for upload
      addToast('Eroare la încărcarea videoclipului', 'error', 4000);
      
      setIsProcessing(false);
    }
  };

  const generateSubtitles = async () => {
    if (!uploadedFileName) {
      setError('Vă rugăm să încărcați mai întâi un videoclip.');
      return;
    }

    setError('');
    setUploadStatus(`Se generează subtitrările cu modelul ${whisperModel.toUpperCase()}...`);
    setIsProcessing(true);
    setTranscribeProgress(0);

    try {
      const response = await axios.post(`${API_URL}/generate-subtitles`, {
        filename: uploadedFileName,
        style: subtitleStyle,
        model: whisperModel
      });

      setSubtitles(response.data.subtitles);
      
      const modelUsed = response.data.model_used || whisperModel;
      setUploadStatus(`Subtitrări generate cu succes folosind modelul ${modelUsed.toUpperCase()}!`);
      
      // UX FIX #5: Success toast for subtitle generation
      addToast(`Subtitrări generate cu succes! (${response.data.subtitles.length} segmente)`, 'success', 4000, '🎵');
      
      // FIX: Expandează secțiunile pe desktop
      if (!isMobile) {
        setSectionsExpanded(prev => ({
          ...prev,
          subtitlesList: true,
          subtitlesConfig: true
        }));
      } else {
        setSectionsExpanded(prev => ({
          ...prev,
          subtitlesList: true
        }));
      }
      
      if (response.data.task_id) {
        setTranscribeTaskId(response.data.task_id);
        pollTaskProgress(response.data.task_id, setTranscribeProgress, 'transcribe');
      } else {
        setTranscribeProgress(100);
      }
    } catch (err) {
      console.error('Error generating subtitles:', err);
      const errorMsg = `Eroare la generarea subtitrărilor: ${err.response?.data?.error || err.message}`;
      setError(errorMsg);
      
      // UX FIX #5: Error toast for subtitle generation
      addToast('Eroare la generarea subtitrărilor', 'error', 4000);
      
      setTranscribeProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // FIX: Handler SIMPLIFICAT pentru schimbări de stil - SE APLICĂ DIRECT
  const handleStyleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    if (name === 'maxLines' || name === 'maxWidth' || name === 'customX' || 
        name === 'customY' || name === 'fontSize' || name === 'borderWidth') {
      processedValue = parseInt(value, 10);
    } else if (name === 'useCustomPosition' || name === 'allCaps' || 
               name === 'removePunctuation' || name === 'useKaraoke') {
      processedValue = Boolean(value);
    }
    // highlightMode should remain as string, no processing needed
    
    console.log('Style change applied immediately:', name, value, '->', processedValue);
    
    // Special debug for highlightMode
    if (name === 'highlightMode') {
      console.log('HIGHLIGHT MODE UPDATE:', processedValue);
    }
    
    // FIX: Aplicăm direct modificarea - fără pending
    setSubtitleStyle(prev => ({
      ...prev,
      [name]: processedValue
    }));
  }, []);
  
  // Funcție pentru actualizarea poziției subtitrărilor prin drag-and-drop
  const updateSubtitlePosition = useCallback((x, y, enableCustomPosition = false) => {
    console.log('Updating subtitle position:', { x, y, enableCustomPosition });
    
    setSubtitleStyle(prev => ({
      ...prev,
      customX: Math.round(x),
      customY: Math.round(y),
      useCustomPosition: enableCustomPosition ? true : prev.useCustomPosition
    }));
  }, []);

  // Funcție pentru actualizarea unei subtitrări
  const updateSubtitle = useCallback((index, newText) => {
    const updatedSubtitles = [...subtitles];
    updatedSubtitles[index] = {
      ...updatedSubtitles[index],
      text: newText
    };
    setSubtitles(updatedSubtitles);
    
    if (currentTime >= updatedSubtitles[index].start && 
        currentTime <= updatedSubtitles[index].end) {
      setCurrentTime(prev => prev + 0.001);
    }
  }, [subtitles, currentTime]);

  // Funcție pentru a descărca direct un fișier
  const directDownload = (url) => {
    console.log("Downloading from URL:", url);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
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
    setUploadStatus('Se creează videoclipul cu subtitrări...');
    setProcessProgress(0);

    try {
      console.log('=== CREATING VIDEO WITH SUBTITLES ===');
      console.log('Current subtitle style state:', JSON.stringify(subtitleStyle, null, 2));
      
      const stylePayload = {
        fontFamily: subtitleStyle.fontFamily || 'Arial',
        fontSize: parseInt(subtitleStyle.fontSize) || 24,
        fontColor: subtitleStyle.fontColor || '#FFFFFF',
        borderColor: subtitleStyle.borderColor || '#000000',
        borderWidth: parseInt(subtitleStyle.borderWidth) || 2,
        position: subtitleStyle.position || 'bottom',
        useCustomPosition: Boolean(subtitleStyle.useCustomPosition),
        customX: parseInt(subtitleStyle.customX) || 50,
        customY: parseInt(subtitleStyle.customY) || 90,
        allCaps: Boolean(subtitleStyle.allCaps),
        removePunctuation: Boolean(subtitleStyle.removePunctuation),
        useKaraoke: Boolean(subtitleStyle.useKaraoke),
        currentWordColor: subtitleStyle.currentWordColor || '#FFFF00',
        currentWordBorderColor: subtitleStyle.currentWordBorderColor || '#000000',
        highlightMode: subtitleStyle.highlightMode || 'none',  // NEW: Add highlight mode
        maxLines: parseInt(subtitleStyle.maxLines) || 1,
        maxWidth: parseInt(subtitleStyle.maxWidth) || 50,
        isMobile: isMobile,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      };
      
      console.log('Style payload being sent to backend:', JSON.stringify(stylePayload, null, 2));

      const response = await axios.post(`${API_URL}/create-video`, {
        filename: uploadedFileName,
        subtitles: subtitles,
        style: stylePayload
      });

      setOutputVideo(response.data.output_filename);
      setUploadStatus('Videoclip cu subtitrări creat. Se inițiază descărcarea...');
      
      if (response.data.task_id) {
        setProcessTaskId(response.data.task_id);
        
        const monitorProgress = async () => {
          try {
            const statusResponse = await axios.get(`${API_URL}/status/${response.data.task_id}`);
            if (statusResponse.data && statusResponse.data.progress !== undefined) {
              setProcessProgress(statusResponse.data.progress);
              setProgressStatus(statusResponse.data.message || '');
              
              if (statusResponse.data.status === 'completed') {
                const downloadUrl = `${API_URL}/download/${response.data.output_filename}`;
                console.log("Download initiated for:", downloadUrl);
                directDownload(downloadUrl);
                setUploadStatus('Videoclip cu subtitrări creat și descărcat cu succes!');
                
                // UX FIX #5: Success toast for video completion
                addToast('Video cu subtitrări creat cu succes!', 'success', 5000, '🎬');
                
                setIsProcessing(false);
                return;
              } else if (statusResponse.data.status === 'error') {
                setError(`Eroare: ${statusResponse.data.message}`);
                setIsProcessing(false);
                return;
              } 
              
              setTimeout(monitorProgress, 1000);
            }
          } catch (err) {
            console.error("Error monitoring task:", err);
            setIsProcessing(false);
            setError(`Eroare la monitorizarea progresului: ${err.message}`);
          }
        };
        
        monitorProgress();
      } else {
        setProcessProgress(100);
        const downloadUrl = `${API_URL}/download/${response.data.output_filename}`;
        directDownload(downloadUrl);
        setUploadStatus('Videoclip cu subtitrări creat și descărcat cu succes!');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error creating video with subtitles:', err);
      setError(`Eroare la crearea videoclipului: ${err.response?.data?.error || err.message}`);
      setProcessProgress(0);
      setIsProcessing(false);
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
      setPlaying(true);
    }
  };
  
  const toggleLayoutMode = () => {
    if (!isMobile) {
      setLayoutMode(prev => prev === 'side' ? 'bottom' : 'side');
    }
  };
  
  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
  };

  // FIX: Funcții pentru gestionarea colapsării SIMPLIFICATE
  const toggleSection = useCallback((sectionKey) => {
    setSectionsExpanded(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  // DEMO PRESETS - aplicare presetare demo 
  const applyDemoPreset = useCallback((presetName) => {
    const demoPresets = {
      'default': {
        fontSize: 48, fontFamily: 'Inter', fontColor: '#00FF00', borderColor: '#000000', borderWidth: 2,
        position: 'bottom-30', useCustomPosition: false, customX: 50, customY: 70, allCaps: true,
        removePunctuation: false, useKaraoke: true, maxLines: 1, currentWordColor: '#FFFF00', currentWordBorderColor: '#000000'
      },
      'cinema_classic': {
        fontSize: 32, fontFamily: 'Bebas Neue', fontColor: '#FFFFFF', borderColor: '#000000', borderWidth: 3,
        position: 'bottom', useCustomPosition: false, customX: 50, customY: 90, allCaps: true,
        removePunctuation: false, useKaraoke: false, maxLines: 1, currentWordColor: '#FFFF00', currentWordBorderColor: '#000000'
      },
      'single_word_focus': {
        fontSize: 56, fontFamily: 'Poppins', fontColor: '#FFFFFF', borderColor: '#000000', borderWidth: 3,
        position: 'bottom-30', useCustomPosition: false, customX: 50, customY: 50, allCaps: true,
        removePunctuation: false, useKaraoke: true, maxLines: 1, 
        currentWordColor: '#FF3366', 
        currentWordBorderColor: '#FFFFFF'
      },
      'rounded_soft': {
        fontSize: 28, fontFamily: 'Nunito', fontColor: '#F8F9FA', borderColor: '#E5E7EB', borderWidth: 1,
        position: 'bottom-20', useCustomPosition: false, customX: 50, customY: 80, allCaps: false,
        removePunctuation: false, useKaraoke: true, maxLines: 2, currentWordColor: '#F472B6', currentWordBorderColor: '#BE185D'
      },
      'bold_impact': {
        fontSize: 64, fontFamily: 'Inter', fontColor: '#FFFFFF', borderColor: '#1F2937', borderWidth: 4,
        position: 'bottom', useCustomPosition: false, customX: 50, customY: 85, allCaps: true,
        removePunctuation: true, useKaraoke: false, maxLines: 1, currentWordColor: '#EF4444', currentWordBorderColor: '#7F1D1D'
      },
      'neon_futuristic': {
        fontSize: 36, fontFamily: 'Source Sans Pro', fontColor: '#00FFFF', borderColor: '#8B00FF', borderWidth: 2,
        position: 'top-30', useCustomPosition: false, customX: 50, customY: 30, allCaps: true,
        removePunctuation: false, useKaraoke: true, maxLines: 1, currentWordColor: '#00FF88', currentWordBorderColor: '#FF0080'
      }
    };
    
    if (demoPresets[presetName]) {
      const newStyle = { ...demoPresets[presetName] };
      
      // FIX: Aplicăm direct (demo presets se aplică imediat)
      setSubtitleStyle(newStyle);
      
      console.log('Applied demo preset:', presetName, newStyle);
      setUploadStatus(`Preset "${presetName}" aplicat cu succes!`);
    }
  }, []);

  // Componente pentru secțiuni colapsabile
  const CollapsibleSection = ({ title, sectionKey, children, defaultExpanded = false, icon = "", badge = null }) => {
    const isExpanded = sectionsExpanded[sectionKey] ?? defaultExpanded;
    
    return (
      <div className="collapsible-section">
        <button 
          className={`collapsible-header ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={() => toggleSection(sectionKey)}
          type="button"
        >
          <span className="collapsible-title">
            {icon && <span className="section-icon">{icon}</span>}
            {title}
            {badge && <span className="section-badge">{badge}</span>}
          </span>
          <span className={`collapsible-arrow ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        <div className={`collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="collapsible-inner">
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
        {/* Caseta compact de control */}
        <section className="unified-control-panel">          
          <div className="unified-controls">
            <div className="control-row">
              <div className="file-selector-compact">
                <label>Selectați video:</label>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  className="compact-file-input"
                />
              </div>
              
              <div className="model-selector-compact">
                <label>Model Whisper:</label>
                <select 
                  value={whisperModel} 
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={isProcessing || modelLoading}
                  className="compact-select"
                >
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.name} ({model.size})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="action-buttons-row">
              <button 
                onClick={generateSubtitles} 
                disabled={!uploadedFileName || isProcessing || modelLoading}
                className="compact-action-button generate"
              >
                Generează Subtitrări
              </button>
              
              <button 
                onClick={createAndDownloadVideoWithSubtitles} 
                disabled={!subtitles.length || isProcessing}
                className="compact-action-button create"
              >
                Creează & Descarcă Video
              </button>
            </div>
            
          </div>
          
          {/* UX FIX #4: Enhanced progress bars with time estimation */}
          <div className="compact-progress">
            {uploadProgress > 0 && uploadProgress < 100 && (
              <ProgressBar 
                progress={uploadProgress} 
                label="Încărcare Video" 
                status={progressStatus || "Se încarcă videoclipul..."}
                showTime={true}
              />
            )}
            
            {transcribeProgress > 0 && transcribeProgress < 100 && (
              <ProgressBar 
                progress={transcribeProgress} 
                label={`Transcriere Audio (Model: ${whisperModel.toUpperCase()})`}
                status={progressStatus || "Se analizează conținutul audio..."}
                showTime={true}
              />
            )}
            
            {processProgress > 0 && processProgress < 100 && (
              <ProgressBar 
                progress={processProgress}
                label="Generare Video Final"
                status={progressStatus || "Se încorporează subtitrările..."}
                showTime={true}
              />
            )}
          </div>
        </section>

        {/* VIDEO SECTION - DOAR VIDEO, fără configurări */}
        {videoUrl && (
          <section className="video-section">
            <h2>Preview Video</h2>
            
            {/* Container pentru DOAR video - fără configurări */}
            <div className="video-container-standalone">
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
                
                {/* Instrucțiuni mobile compacte */}
                {isMobile && subtitles.length > 0 && (
                  <div className="mobile-instructions compact">
                    <span className="emoji">💡</span>
                    <span style={{ fontSize: '0.8rem' }}>Drag subtitrarea pentru poziționare</span>
                    <button
                      onClick={() => {
                        const newMode = videoFitMode === 'cover' ? 'contain' : 'cover';
                        setVideoFitMode(newMode);
                        if (videoPlayerRef.current) {
                          const videoEl = videoPlayerRef.current.getInternalPlayer();
                          if (videoEl && videoEl.style) {
                            videoEl.style.objectFit = newMode;
                          }
                        }
                      }}
                      style={{
                        padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(102, 126, 234, 0.8)',
                        color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                      }}
                      title={videoFitMode === 'cover' ? 'Arată tot video-ul' : 'Umple ecranul'}
                    >
                      {videoFitMode === 'cover' ? '📐' : '📱'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ===== SECȚIUNE SEPARATĂ - LISTA SUBTITRĂRI ===== */}
        {subtitles.length > 0 && (
          <section className="subtitles-list-section">
            <CollapsibleSection 
              title="Lista Subtitrări"
              sectionKey="subtitlesList"
              defaultExpanded={true}
              icon="📝"
              badge={`${subtitles.length}`}
            >
              <div className="subtitles-list-content">
                {!isMobile && (
                  <div className="subtitle-header-simplified">
                    <span className="subtitle-time-header">Start</span>
                    <span className="subtitle-text-header">Text subtitrare</span>
                  </div>
                )}
                
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
                      showTimeAndDuration={!isMobile}
                    />
                  ))}
                </div>
              </div>
            </CollapsibleSection>
          </section>
        )}

        {/* ===== SECȚIUNE SEPARATĂ - CONFIGURĂRI STIL ===== */}
        {subtitles.length > 0 && (
          <section className="subtitles-config-section">
            <CollapsibleSection 
              title="Configurări Stil"
              sectionKey="subtitlesConfig"
              defaultExpanded={true}
              icon="🎨"
            >
              <div className="config-content-unlimited">
                <SubtitlesConfig 
                  subtitleStyle={subtitleStyle}
                  handleStyleChange={handleStyleChange}
                  compact={true}
                />
              </div>
            </CollapsibleSection>
          </section>
        )}

        {/* Status messages la sfârșit */}
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
        
        {/* UX FIX #5: Toast notification system */}
        <ToastManager />
      </div>
    </div>
  );
}

export default App;