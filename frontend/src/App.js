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
    maxLines: 3,
    maxWidth: 50, // Procentaj din lățimea videoului - redus la 50%
    maxWordsPerLine: 4, // Strict 4 cuvinte pe linie
    useCustomPosition: false, // Flag pentru activarea poziției personalizate
    customX: 50, // Poziția X procentuală (0-100)
    customY: 90  // Poziția Y procentuală (0-100)
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
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      setError('Vă rugăm să selectați un fișier video.');
      return;
    }

    setError('');
    setIsProcessing(true);
    setUploadStatus('Se încarcă videoclipul...');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', videoFile);

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

      setSubtitles(response.data.subtitles);
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
      [name]: name === 'maxLines' || name === 'maxWidth' || name === 'maxWordsPerLine' || name === 'customX' || name === 'customY' ? parseInt(value, 10) : value
    }));
  };
  
  // Funcție pentru actualizarea poziției subtitrărilor prin drag-and-drop
  const updateSubtitlePosition = (x, y) => {
    setSubtitleStyle(prev => ({
      ...prev,
      customX: Math.round(x),
      customY: Math.round(y)
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
      const response = await axios.post(`${API_URL}/create-video`, {
        filename: uploadedFileName,
        subtitles: subtitles,
        style: subtitleStyle
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
        <section className="upload-section">
          <h2>1. Încărcați un video</h2>
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange} 
            ref={fileInputRef}
            className="file-input"
          />
          <button 
            onClick={handleUpload} 
            disabled={!videoFile || isProcessing}
            className="action-button"
          >
            Încarcă Video
          </button>
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <ProgressBar 
              progress={uploadProgress} 
              label="Progres încărcare" 
              status={progressStatus || "Se încarcă fișierul..."}
            />
          )}
        </section>

        {videoUrl && (
          <section className="video-preview">
            <h3>Previzualizare Video</h3>
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
                />
              )}
            </div>
          </section>
        )}

        {uploadedFileName && (
          <section className="generate-subtitles">
            <h2>2. Generați subtitrări</h2>
            <button 
              onClick={generateSubtitles} 
              disabled={isProcessing}
              className="action-button"
            >
              Generează subtitrări
            </button>
            
            {transcribeProgress > 0 && transcribeProgress < 100 && (
              <ProgressBar 
                progress={transcribeProgress} 
                label="Progres generare subtitrări" 
                status={progressStatus || "Se procesează audio..."}
              />
            )}
          </section>
        )}

        {subtitles.length > 0 && (
          <section className="customize-section">
            <h2>3. Editați și personalizați subtitrările</h2>
            
            <SubtitlesConfig 
              subtitleStyle={subtitleStyle}
              handleStyleChange={handleStyleChange}
            />
            
            <h3>Lista subtitrări</h3>
            <div className="subtitles-list">
              <div className="subtitle-header">
                <span className="subtitle-time">Timp</span>
                <span className="subtitle-text">Text</span>
                <span className="subtitle-duration">Durată</span>
              </div>
              
              {subtitles.map((subtitle, index) => (
                <EditableSubtitleItem
                  key={index}
                  subtitle={subtitle}
                  index={index}
                  formatTime={formatTime}
                  updateSubtitle={updateSubtitle}
                  seekToTime={seekToTime}
                />
              ))}
            </div>
          </section>
        )}

        {subtitles.length > 0 && (
          <section className="create-video-section">
            <h2>4. Creați videoclipul cu subtitrări</h2>
            <button 
              onClick={createVideoWithSubtitles} 
              disabled={isProcessing}
              className="action-button"
            >
              Creează videoclip cu subtitrări
            </button>
            
            {processProgress > 0 && processProgress < 100 && (
              <ProgressBar 
                progress={processProgress}
                label="Progres creare video"
                status={progressStatus || "Se procesează video..."}
              />
            )}
            
            {outputVideo && (
              <div className="download-section">
                <p>Videoclipul a fost creat cu succes!</p>
                <button 
                  onClick={downloadVideo}
                  className="download-button"
                >
                  Descarcă videoclipul
                </button>
              </div>
            )}
            
            <p className="mt-2 text-sm text-gray-600">
              Notă: Limita maximă de încărcare este de 3GB. Procesarea poate dura câteva minute, în funcție de lungimea videoclipului.
            </p>
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