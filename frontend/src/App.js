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
  
  const [subtitleStyle, setSubtitleStyle] = useState({
    fontSize: 24,
    fontColor: '#FFFFFF',
    backgroundColor: '#000000',
    opacity: 80,
    position: 'bottom', // 'bottom', 'top', 'middle', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    fontFamily: 'Sans',
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
    allCaps: false, // Opțiune pentru ALL CAPS
    removePunctuation: false // Opțiune pentru eliminarea punctuației
  });

  const fileInputRef = useRef();
  const videoPlayerRef = useRef();
  const playerContainerRef = useRef();

  // Verificare conexiune API la încărcarea componentei
  useEffect(() => {
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

    testApiConnection();
    
    // Detectăm lățimea ecranului și setăm layout-ul implicit
    const handleResize = () => {
      setLayoutMode(window.innerWidth < 992 ? 'bottom' : 'side');
    };
    
    // Setare layout inițial
    handleResize();
    
    // Adaugă listener pentru resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Funcție pentru monitorizarea progresului unei activități
  const pollTaskProgress = async (taskId, setProgressFunc, taskType, interval = 1000) => {
    if (!taskId) return;
    
    const checkProgress = async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${taskId}`);
        if (response.data && response.data.progress !== undefined) {
          setProgressFunc(response.data.progress);
          setProgressStatus(response.data.message || '');
          
          // Dacă task-ul nu e complet, continuăm polling-ul
          if (response.data.status !== 'completed' && response.data.status !== 'error') {
            setTimeout(checkProgress, interval);
          } else if (response.data.status === 'error') {
            setError(`Eroare: ${response.data.message}`);
            setIsProcessing(false);
          }
        }
      } catch (err) {
        console.error(`Error checking ${taskType} progress:`, err);
        setTimeout(checkProgress, interval * 2); // În caz de eroare, mărim intervalul
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
    setUploadStatus('Se generează subtitrările... Acest proces poate dura câteva minute.');
    setIsProcessing(true);
    setTranscribeProgress(0);

    try {
      const response = await axios.post(`${API_URL}/generate-subtitles`, {
        filename: uploadedFileName
      });

      // Adăugăm o întârziere mică la fiecare subtitrare pentru a evita apariția prematură
      const adjustedSubtitles = response.data.subtitles.map(subtitle => ({
        ...subtitle,
        start: subtitle.start + 0.05 // Adăugăm 50ms pentru a evita apariția prematură
      }));

      setSubtitles(adjustedSubtitles);
      setUploadStatus('Subtitrări generate cu succes!');
      
      // Verificăm progresul pe server dacă primim un task_id
      if (response.data.task_id) {
        setTranscribeTaskId(response.data.task_id);
        pollTaskProgress(response.data.task_id, setTranscribeProgress, 'transcribe');
      } else {
        setTranscribeProgress(100); // Dacă nu avem task_id, presupunem că s-a terminat
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
  };

  const createVideoWithSubtitles = async () => {
    if (!uploadedFileName || subtitles.length === 0) {
      setError('Asigurați-vă că ați încărcat un videoclip și ați generat subtitrări.');
      return;
    }

    setError('');
    setIsProcessing(true);
    setUploadStatus('Se creează videoclipul cu subtitrări... Acest proces poate dura câteva minute.');
    setProcessProgress(0);

    try {
      // Transmit toate opțiunile de stil, inclusiv allCaps și removePunctuation
      const response = await axios.post(`${API_URL}/create-video`, {
        filename: uploadedFileName,
        subtitles: subtitles,
        style: {
          ...subtitleStyle,
          // Asigură-te că acestea sunt trimise explicit
          allCaps: subtitleStyle.allCaps || false,
          removePunctuation: subtitleStyle.removePunctuation || false,
          currentWordColor: subtitleStyle.currentWordColor || '#FFFF00',
          currentWordBorderColor: subtitleStyle.currentWordBorderColor || '#000000'
        }
      });

      setOutputVideo(response.data.output_filename);
      setUploadStatus('Videoclip cu subtitrări creat cu succes!');
      
      // Verificăm progresul pe server dacă primim un task_id
      if (response.data.task_id) {
        setProcessTaskId(response.data.task_id);
        pollTaskProgress(response.data.task_id, setProcessProgress, 'process');
      } else {
        setProcessProgress(100); // Dacă nu avem task_id, presupunem că s-a terminat
      }
    } catch (err) {
      console.error('Error creating video with subtitles:', err);
      setError(`Eroare la crearea videoclipului: ${err.response?.data?.error || err.message}`);
      setProcessProgress(0);
    } finally {
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
      // Setam playing la true pentru a vedea imediat subtitrarea
      setPlaying(true);
    }
  };
  
  // Toggle intre layout side/bottom
  const toggleLayoutMode = () => {
    setLayoutMode(prev => prev === 'side' ? 'bottom' : 'side');
  };
  
  // Handler pentru actualizarea timpului curent al videoclipului
  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Generator de Subtitrări Automate</h1>
      </header>

      <div className="main-container">
        <section className="control-panel">
          <h2>Acțiuni</h2>
          
          <div className="control-panel-content">
            <div className="file-select-area">
              <label className="control-label">1. Selectați un fișier video:</label>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileChange} 
                ref={fileInputRef}
                className="file-input"
              />
            </div>
            
            <div className="all-buttons-container">
              <div className="button-group">
                <h3 className="button-group-label">2. Procesare:</h3>
                <button 
                  onClick={generateSubtitles} 
                  disabled={!uploadedFileName || isProcessing}
                  className="action-button generate-button"
                >
                  Generează Subtitrări
                </button>
              </div>
              
              <div className="button-group">
                <h3 className="button-group-label">3. Finalizare:</h3>
                <button 
                  onClick={createVideoWithSubtitles} 
                  disabled={!subtitles.length || isProcessing}
                  className="action-button create-button"
                >
                  Creează Video
                </button>
                
                {outputVideo && (
                  <button 
                    onClick={downloadVideo}
                    className="action-button download-button"
                  >
                    Descarcă Video
                  </button>
                )}
              </div>
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
                label="Progres generare subtitrări" 
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
            
            <div className="layout-controls">
              <button 
                onClick={toggleLayoutMode} 
                className="layout-toggle-button"
              >
                Schimbă Layout: {layoutMode === 'side' ? 'Lateral' : 'Sub video'}
              </button>
            </div>
            
            <div className={`video-subtitle-container ${layoutMode}`}>
              <div className="video-preview-container">
                <div className="player-wrapper" ref={playerContainerRef}>
                  <ReactPlayer 
                    ref={videoPlayerRef}
                    url={videoUrl} 
                    controls 
                    width="100%" 
                    height="100%" 
                    className="react-player"
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
              
              {subtitles.length > 0 && (
                <div className="subtitles-panel">
                  <h4>Subtitrări</h4>
                  <div className="subtitles-list">
                    <div className="subtitle-header">
                      <span className="subtitle-time">Timp</span>
                      <span className="subtitle-text">Text</span>
                      <span className="subtitle-duration">Durată</span>
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
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {subtitles.length > 0 && (
          <section className="customize-section">
            <h2>Personalizare subtitrări</h2>
            
            <SubtitlesConfig 
              subtitleStyle={subtitleStyle}
              handleStyleChange={handleStyleChange}
            />
          </section>
        )}

        {uploadStatus && (
          <div className={`status-message ${error ? 'error' : ''}`}>
            {uploadStatus}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="api-status">
          Status API: {apiStatus}
        </div>
        
        {isProcessing && (
          <div className="processing-overlay">
            <div className="processing-spinner"></div>
            <p>Se procesează... Vă rugăm să așteptați.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;