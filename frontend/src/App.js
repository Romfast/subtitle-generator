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
    setUploadStatus('Se generează subtitrările... Acest proces poate dura câteva minute.');
    setIsProcessing(true);
    setTranscribeProgress(0);

    try {
      // Trimitem și stilul actual pentru a fi folosit la generarea subtitrărilor
      // Acest lucru permite aplicarea parametrilor de maxLines și maxWordsPerLine chiar la generare
      const response = await axios.post(`${API_URL}/generate-subtitles`, {
        filename: uploadedFileName,
        style: subtitleStyle  // Trimitem stilul complet
      });

      // Adăugăm o întârziere mai mare la fiecare subtitrare pentru a îmbunătăți sincronizarea
      // 500ms în loc de 50ms
      const adjustedSubtitles = response.data.subtitles.map(subtitle => ({
        ...subtitle,
        start: subtitle.start + 0.5, // Adăugăm 500ms întârziere pentru o mai bună sincronizare
        end: subtitle.end + 0.5 // Ajustăm și timpul de sfârșit
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
                disabled={!uploadedFileName || isProcessing}
                className="action-button generate-button"
              >
                2. Generează Subtitrări
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