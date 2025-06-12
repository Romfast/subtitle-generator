import os
import json
import time
import uuid
import subprocess
import tempfile
import re
import threading
import gc
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import whisper
import ffmpeg
import webvtt
from werkzeug.utils import secure_filename
from subtitles_utils import format_srt_with_line_limits, break_long_subtitles, split_subtitle_into_lines
from custom_position import create_ass_file_with_custom_position, create_karaoke_ass_file, create_word_by_word_karaoke, create_precise_word_highlighting_ass

app = Flask(__name__)

# Configurare CORS mai permisivă pentru a accepta toate cererile
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Configuration
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
PROCESSED_FOLDER = os.path.join(os.getcwd(), 'processed')
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'mp3', 'wav'}

# Configurare pentru încărcarea fișierelor mari
app.config['MAX_CONTENT_LENGTH'] = None  # Eliminăm limita de mărime
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# Variabile globale pentru gestionarea modelelor Whisper
current_model = None
current_model_name = None
model_lock = threading.Lock()

# Dicționar cu informații despre modelele Whisper disponibile
AVAILABLE_MODELS = {
    'base': {
        'name': 'Base (rapid, mai puțin precis)',
        'size': '39 MB',
        'description': 'Cel mai rapid model, potrivit pentru teste rapide și demo-uri'
    },
    'small': {
        'name': 'Small (echilibru bun)',
        'size': '244 MB', 
        'description': 'Recomandat: echilibru optim între viteză și precizie'
    },
    'medium': {
        'name': 'Medium (precizie bună)',
        'size': '769 MB',
        'description': 'Precizie îmbunătățită, timpul de procesare mai mare'
    },
    'large': {
        'name': 'Large (cea mai bună precizie)',
        'size': '1550 MB',
        'description': 'Cea mai bună precizie, procesare foarte lentă'
    }
}

def load_whisper_model(model_size):
    """Încarcă un model Whisper specific, cu gestionarea memoriei."""
    global current_model, current_model_name
    
    with model_lock:
        # Dacă modelul curent este deja cel dorit, nu facem nimic
        if current_model_name == model_size and current_model is not None:
            print(f"Model {model_size} already loaded")
            return current_model
        
        # Eliberăm memoria pentru modelul anterior
        if current_model is not None:
            print(f"Unloading previous model: {current_model_name}")
            del current_model
            gc.collect()  # Forțează garbage collection
            time.sleep(1)  # Dăm timp pentru eliberarea memoriei
        
        print(f"Loading Whisper model: {model_size}")
        try:
            current_model = whisper.load_model(model_size)
            current_model_name = model_size
            print(f"Successfully loaded model: {model_size}")
            return current_model
        except Exception as e:
            print(f"Error loading model {model_size}: {str(e)}")
            # Fallback la modelul base dacă nu se poate încărca cel dorit
            if model_size != 'base':
                print("Falling back to base model")
                try:
                    current_model = whisper.load_model('base')
                    current_model_name = 'base'
                    return current_model
                except Exception as fallback_error:
                    print(f"Failed to load fallback model: {fallback_error}")
                    raise e
            else:
                raise e

# Inițializare model la pornirea aplicației
initial_model_size = os.environ.get('WHISPER_MODEL', 'small')
print(f"Initializing with model: {initial_model_size}")
try:
    current_model = load_whisper_model(initial_model_size)
    print(f"Application started with model: {current_model_name}")
except Exception as e:
    print(f"Failed to initialize Whisper model: {e}")
    current_model = None
    current_model_name = None

# Dicționar global pentru a stoca progresul activităților
processing_status = {}

@app.route('/api/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """Returnează statusul și progresul pentru un task specific."""
    if task_id in processing_status:
        return jsonify(processing_status[task_id]), 200
    return jsonify({'error': 'Task ID not found'}), 404

def update_task_status(task_id, status, progress, message=""):
    """Actualizează statusul unui task."""
    processing_status[task_id] = {
        'status': status,
        'progress': progress,
        'message': message,
        'timestamp': time.time()
    }
    print(f"Task {task_id}: {status} - {progress}% - {message}")

@app.route('/api/available-models', methods=['GET'])
def get_available_models():
    """Returnează lista modelelor Whisper disponibile și modelul curent."""
    models_list = []
    for model_key, model_info in AVAILABLE_MODELS.items():
        models_list.append({
            'value': model_key,
            'name': model_info['name'],
            'size': model_info['size'],
            'description': model_info['description']
        })
    
    return jsonify({
        'models': models_list,
        'current_model': current_model_name or 'none'
    }), 200

@app.route('/api/change-model', methods=['POST'])
def change_whisper_model():
    """Schimbă modelul Whisper curent."""
    data = request.json
    new_model = data.get('model', 'small')
    
    if new_model not in AVAILABLE_MODELS:
        return jsonify({'error': f'Model "{new_model}" not available'}), 400
    
    try:
        print(f"Request to change model to: {new_model}")
        model = load_whisper_model(new_model)
        
        return jsonify({
            'message': f'Model changed to {new_model}',
            'current_model': current_model_name,
            'model_info': AVAILABLE_MODELS[new_model]
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load model {new_model}: {str(e)}'}), 500

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_subtitle_text(text, style):
    """Procesează textul subtitrării conform opțiunilor de stil."""
    processed_text = text
    
    # Aplicăm ALL CAPS dacă este activat
    if style.get('allCaps', False):
        processed_text = processed_text.upper()
    
    # Eliminăm semnele de punctuație dacă este selectat
    if style.get('removePunctuation', False):
        processed_text = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()]', '', processed_text)
        processed_text = re.sub(r'\s{2,}', ' ', processed_text)  # eliminăm spațiile multiple
    
    return processed_text

def hex_to_ass_color(hex_color):
    """Convert hex color to ASS color format."""
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]
    
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        # ASS uses BGR format with alpha in front
        return f'&H00{b:02X}{g:02X}{r:02X}'
    
    return '&H00FFFFFF'  # Default to white if invalid

# FIX #6: Funcție îmbunătățită pentru ajustarea fontului pe mobil
def adjust_font_size_for_video(base_size, video_width=1280, reference_width=1920, is_mobile=False, screen_width=None):
    """
    FIX #6: Ajustează dimensiunea fontului proporțional cu lățimea video-ului,
    cu tratament special pentru dispozitivele mobile.
    
    Args:
        base_size: Dimensiunea de bază a fontului (ex: 24)
        video_width: Lățimea video-ului țintă
        reference_width: Lățimea de referință pentru dimensiunea fontului
        is_mobile: Dacă cererea vine de pe mobil
        screen_width: Lățimea ecranului utilizatorului
    
    Returns:
        int: Dimensiunea fontului ajustată
    """
    # FIX #6: Factorul de scaling pentru dimensiunea fontului
    scaling_factor = max(0.75, video_width / reference_width)
    
    # FIX #6: TRATAMENT SPECIAL PENTRU MOBIL
    if is_mobile:
        # Pe mobil, fonturile trebuie să fie mai mari pentru lizibilitate
        # dar proporțional cu lățimea ecranului utilizatorului
        mobile_scaling_factor = 1.0
        
        if screen_width:
            # Dacă avem lățimea ecranului, calculăm factorul de scalare
            if screen_width <= 480:  # Telefoane foarte mici
                mobile_scaling_factor = 1.8
            elif screen_width <= 768:  # Telefoane normale
                mobile_scaling_factor = 1.6
            else:  # Tablete sau ecrane mai mari
                mobile_scaling_factor = 1.4
        else:
            # Fallback pentru când nu avem informații despre ecran
            mobile_scaling_factor = 1.6
        
        # Aplicăm factorul de scalare pentru mobil
        scaling_factor = scaling_factor * mobile_scaling_factor
        
        print(f"Mobile font scaling: base_factor={scaling_factor/mobile_scaling_factor:.2f}, "
              f"mobile_factor={mobile_scaling_factor}, combined={scaling_factor:.2f}")
    
    # Adăugăm un bonus pentru dimensiuni mai mici pentru lizibilitate
    size_bonus = 0
    if video_width < 1280:
        size_bonus = 4 if not is_mobile else 6  # Bonus mai mare pe mobil
    
    # Pe mobil, adăugăm un bonus suplimentar pentru lizibilitate
    mobile_bonus = 0
    if is_mobile:
        if base_size > 60:
            mobile_bonus = 4  # Bonus redus pentru fonturi mari
        elif base_size > 40:
            mobile_bonus = 6  # Bonus mediu pentru fonturi mari
        else:
            mobile_bonus = 8  # Bonus mare pentru fonturi mici
    
    # Calculăm dimensiunea finală
    adjusted_size = max(18, int(base_size * scaling_factor) + size_bonus + mobile_bonus)
    
    # FIX #6: Ajustăm limitele pentru mobil
    min_size = 24 if is_mobile else 18  # Minim mai mare pe mobil
    max_size = min(150 if is_mobile else 120, video_height * 0.18 if 'video_height' in locals() else 200)
    
    final_size = max(min_size, min(max_size, adjusted_size))
    
    print(f"Font size calculation: base={base_size}, video_width={video_width}, "
          f"factor={scaling_factor:.2f}, bonus={size_bonus}, mobile_bonus={mobile_bonus}, "
          f"final={final_size}, is_mobile={is_mobile}")
    
    return final_size

@app.route('/api/upload', methods=['POST'])
def upload_file():
    print("API: Received upload request")
    # Create a unique task ID for this upload
    task_id = str(uuid.uuid4())
    update_task_status(task_id, "started", 0, "Inițializare încărcare")
    
    # Check if a file was included in the request
    if 'file' not in request.files:
        print("API: No file part in request")
        update_task_status(task_id, "error", 0, "Nu s-a găsit fișierul în cerere")
        return jsonify({'error': 'No file part', 'task_id': task_id}), 400
    
    file = request.files['file']
    
    # Check if the file was selected
    if file.filename == '':
        print("API: Empty filename")
        update_task_status(task_id, "error", 0, "Nume de fișier gol")
        return jsonify({'error': 'No file selected', 'task_id': task_id}), 400
    
    if file and allowed_file(file.filename):
        print(f"API: Processing file {file.filename}")
        update_task_status(task_id, "processing", 10, f"Procesare fișier: {file.filename}")
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        extension = file.filename.rsplit('.', 1)[1].lower()
        secure_name = secure_filename(file.filename)
        base_name = secure_name.rsplit('.', 1)[0] if '.' in secure_name else secure_name
        unique_filename = f"{base_name}_{unique_id}.{extension}"
        
        # Save the file
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Simulate chunk-by-chunk upload with progress updates
        chunk_size = 1024 * 1024  # 1MB chunks
        total_size = 0
        file_size = 0
        
        try:
            # First, determine file size by seeking to the end
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            # Open a file to write chunks
            with open(file_path, 'wb') as out_file:
                chunk = file.read(chunk_size)
                while chunk:
                    out_file.write(chunk)
                    total_size += len(chunk)
                    progress = int((total_size / file_size) * 90) if file_size > 0 else 0
                    update_task_status(task_id, "uploading", 10 + progress, f"Încărcare: {total_size}/{file_size} bytes")
                    chunk = file.read(chunk_size)
            
            print(f"API: File saved successfully to {file_path}")
            update_task_status(task_id, "completed", 100, "Fișier încărcat cu succes")
            
            return jsonify({
                'message': 'File uploaded successfully',
                'file_id': unique_id,
                'filename': unique_filename,
                'path': file_path,
                'task_id': task_id
            }), 200
            
        except Exception as e:
            print(f"API: Error during file upload: {str(e)}")
            update_task_status(task_id, "error", 0, f"Eroare la încărcare: {str(e)}")
            return jsonify({'error': f'Upload error: {str(e)}', 'task_id': task_id}), 500
    
    print(f"API: File type not allowed: {file.filename}")
    update_task_status(task_id, "error", 0, f"Tip de fișier nepermis: {file.filename}")
    return jsonify({'error': 'File type not allowed', 'task_id': task_id}), 400

@app.route('/api/generate-subtitles', methods=['POST'])
def generate_subtitles():
    data = request.json
    filename = data.get('filename')
    style = data.get('style', {})
    requested_model = data.get('model', current_model_name)  # Model solicitat din frontend
    
    # FIX #8: Folosim maxLines din configurare
    max_lines = style.get('maxLines', 2)
    # FIX #9: Nu mai folosim maxWordsPerLine - se calculează automat
    max_width_percent = style.get('maxWidth', 50)  # Crescut la 70% pentru mai mult spați
    
    # Create a unique task ID for transcription
    task_id = str(uuid.uuid4())
    update_task_status(task_id, "started", 0, "Inițializare transcriere")
    
    if not filename:
        update_task_status(task_id, "error", 0, "Nu s-a specificat numele fișierului")
        return jsonify({'error': 'No filename provided', 'task_id': task_id}), 400
    
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    if not os.path.exists(file_path):
        update_task_status(task_id, "error", 0, "Fișierul nu a fost găsit")
        return jsonify({'error': 'File not found', 'task_id': task_id}), 404
    
    try:
        # Verificăm dacă trebuie să schimbăm modelul
        model_to_use = current_model
        if requested_model and requested_model != current_model_name:
            update_task_status(task_id, "processing", 5, f"Încărcare model {requested_model.upper()}")
            try:
                model_to_use = load_whisper_model(requested_model)
                print(f"Switched to model: {requested_model} for this transcription")
            except Exception as e:
                print(f"Failed to switch to {requested_model}, using current model {current_model_name}: {str(e)}")
                model_to_use = current_model
        
        # Verificăm dacă avem un model disponibil
        if model_to_use is None:
            update_task_status(task_id, "error", 0, "Nu s-a putut încărca modelul Whisper")
            return jsonify({'error': 'No Whisper model available', 'task_id': task_id}), 500
        
        # Extract audio from video
        update_task_status(task_id, "processing", 10, "Extragere audio din video")
        audio_path = os.path.join(tempfile.gettempdir(), f"{os.path.splitext(filename)[0]}.wav")
        
        try:
            subprocess.run([
                'ffmpeg', '-i', file_path, '-vn', '-acodec', 'pcm_s16le', 
                '-ar', '16000', '-ac', '1', audio_path
            ], check=True)
        except subprocess.CalledProcessError as e:
            update_task_status(task_id, "error", 10, f"Eroare la extragerea audio: {str(e)}")
            return jsonify({'error': f'Failed to extract audio: {str(e)}', 'task_id': task_id}), 500
        
        update_task_status(task_id, "processing", 30, f"Audio extras. Transcriere cu model {current_model_name.upper()}...")
        
        # Transcribe audio cu modelul curent - PĂSTREAZĂ INFORMAȚIILE DE TIMING WORD-LEVEL
        print(f"Transcribing audio: {audio_path} with model: {current_model_name}")
        
        update_task_status(task_id, "transcribing", 40, f"Procesare audio cu {current_model_name.upper()}...")
        
        result = model_to_use.transcribe(
            audio_path, 
            language='ro', 
            fp16=False, 
            verbose=True,  # Pentru a obține informații detaliate
            word_timestamps=True  # CRITICAL: Obține timing-ul pentru fiecare cuvânt
        )
        
        update_task_status(task_id, "processing", 90, "Transcriere finalizată. Generare subtitrări...")
        
        # Pregătim subtitrările inițiale din rezultatul Whisper CU WORD TIMESTAMPS
        raw_subtitles = []
        for segment in result['segments']:
            # Păstrăm informațiile de timing pentru cuvinte dacă sunt disponibile
            words_with_timing = []
            if 'words' in segment and segment['words']:
                for word_info in segment['words']:
                    words_with_timing.append({
                        'word': word_info.get('word', '').strip(),
                        'start': word_info.get('start', segment['start']),
                        'end': word_info.get('end', segment['end'])
                    })
            
            subtitle_data = {
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text'].strip(),
                'words': words_with_timing  # ADĂUGĂM INFORMAȚIILE DE TIMING PENTRU CUVINTE
            }
            raw_subtitles.append(subtitle_data)
        
        # FIX #8 & #9: Folosim noile funcții cu calculare automată
        # Obținem dimensiunile video pentru calcul precis
        try:
            probe_cmd = [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0',
                file_path
            ]
            video_dimensions = subprocess.check_output(probe_cmd, universal_newlines=True).strip()
            if 'x' in video_dimensions:
                video_width, video_height = map(int, video_dimensions.split('x'))
                print(f"Video dimensions for subtitle calculation: {video_width}x{video_height}")
            else:
                video_width = 1920  # Default
        except Exception as e:
            print(f"Could not determine video dimensions, using default: {e}")
            video_width = 1920

         # Importăm noile funcții
        from subtitles_utils import format_srt_with_auto_lines
        
        # Aplicăm noua formatare automată
        formatted_subtitles = format_srt_with_auto_lines(
            raw_subtitles, 
            max_lines=max_lines,           # FIX #8: Configurabil
            max_width_percent=max_width_percent,  # FIX #9: 70% în loc de 50%
            video_width=video_width        # FIX #9: Dimensiuni reale video
        )
        
        # Create subtitle file in VTT format
        subtitle_path = os.path.join(UPLOAD_FOLDER, f"{os.path.splitext(filename)[0]}.vtt")
        
        with open(subtitle_path, 'w', encoding='utf-8') as vtt_file:
            vtt_file.write("WEBVTT\n\n")
            
            for i, subtitle in enumerate(formatted_subtitles):
                start_time = format_timestamp(subtitle['start'])
                end_time = format_timestamp(subtitle['end'])
                text = subtitle['text']
                
                vtt_file.write(f"{start_time} --> {end_time}\n")
                vtt_file.write(f"{text}\n\n")
                
                # Raportăm progresul pentru fiecare 10% de segmente procesate
                if i % max(1, len(formatted_subtitles) // 10) == 0:
                    progress = 90 + int((i / len(formatted_subtitles)) * 10)
                    update_task_status(task_id, "generating_subtitles", progress, 
                                      f"Generare subtitrări: {i}/{len(formatted_subtitles)}")
        
        # Clean up temporary files
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        update_task_status(task_id, "completed", 100, f"Subtitrări generate cu succes folosind {current_model_name.upper()}")
        
        return jsonify({
            'message': 'Subtitles generated successfully',
            'subtitle_path': subtitle_path,
            'subtitles': formatted_subtitles,
            'model_used': current_model_name,
            'task_id': task_id
        }), 200
    
    except Exception as e:
        print(f"Error generating subtitles: {str(e)}")
        update_task_status(task_id, "error", 0, f"Eroare la generarea subtitrărilor: {str(e)}")
        return jsonify({'error': f'Failed to generate subtitles: {str(e)}', 'task_id': task_id}), 500

def format_timestamp(seconds):
    """Convert seconds to VTT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    
    return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}".replace('.', ',')

@app.route('/api/create-video', methods=['POST'])
def create_video_with_subtitles():
    data = request.json
    filename = data.get('filename')
    subtitles = data.get('subtitles', [])
    style = data.get('style', {})
    
    # Create a unique task ID for video processing
    task_id = str(uuid.uuid4())
    update_task_status(task_id, "started", 0, "Inițializare procesare video")
    
    if not filename or not subtitles:
        update_task_status(task_id, "error", 0, "Lipsesc fișierul sau subtitrările")
        return jsonify({'error': 'Missing filename or subtitles', 'task_id': task_id}), 400
    
    input_path = os.path.join(UPLOAD_FOLDER, filename)
    
    if not os.path.exists(input_path):
        update_task_status(task_id, "error", 0, "Fișierul video nu a fost găsit")
        return jsonify({'error': 'Video file not found', 'task_id': task_id}), 404
    
    try:
        # CRITICAL FIX: Transmitem toate opțiunile de stil inclusiv poziționarea EXACTĂ
        print('=== VIDEO GENERATION DEBUG ===')
        print('Raw style received from frontend:', json.dumps(style, indent=2))
        
        # FIX #6: Extragem informațiile despre dispozitivul mobil
        is_mobile = style.get('isMobile', False)
        screen_width = style.get('screenWidth', None)
        screen_height = style.get('screenHeight', None)
        
        print(f'Mobile detection: is_mobile={is_mobile}, screen_width={screen_width}, screen_height={screen_height}')
        
        # Validăm și normalizăm stilul primit
        validated_style = {
            'fontFamily': style.get('fontFamily', 'Arial'),
            'fontSize': int(style.get('fontSize', 24)),
            'fontColor': style.get('fontColor', '#FFFFFF'),
            'borderColor': style.get('borderColor', '#000000'),
            'borderWidth': int(style.get('borderWidth', 2)),
            'position': style.get('position', 'bottom'),
            'useCustomPosition': bool(style.get('useCustomPosition', False)),
            'customX': int(style.get('customX', 50)),
            'customY': int(style.get('customY', 90)),
            'allCaps': bool(style.get('allCaps', False)),
            'removePunctuation': bool(style.get('removePunctuation', False)),
            'useKaraoke': bool(style.get('useKaraoke', False)),
            'currentWordColor': style.get('currentWordColor', '#FFFF00'),
            'currentWordBorderColor': style.get('currentWordBorderColor', '#000000'),
            'highlightMode': style.get('highlightMode', 'none'),  # NEW: Highlight mode support
            'maxLines': int(style.get('maxLines', 2)),  # FIX #8: Include maxLines
            'maxWidth': int(style.get('maxWidth', 50)),   # FIX #9: Folosim 70% implicit
            # CRITICAL FIX: Add maxWordsPerLine parameter
            'maxWordsPerLine': style.get('maxWordsPerLine', None),  # None = auto-calculation
            # FIX #6: Adăugăm informații mobile
            'isMobile': is_mobile,
            'screenWidth': screen_width,
            'screenHeight': screen_height
        }
        
        print('Validated and normalized style:', json.dumps(validated_style, indent=2))
        print('=== END VIDEO GENERATION DEBUG ===\n')
        
        # Verificăm dimensiunea video-ului real pentru a face ajustări mai precise
        try:
            # Obținem dimensiunile video-ului original
            probe_cmd = [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0',
                input_path
            ]
            video_dimensions = subprocess.check_output(probe_cmd, universal_newlines=True).strip()
            if 'x' in video_dimensions:
                video_width, video_height = map(int, video_dimensions.split('x'))
                print(f"Detected video dimensions: {video_width}x{video_height}")
            else:
                # Valori default dacă nu putem determina dimensiunile
                video_width, video_height = 1280, 720
        except Exception as e:
            print(f"Could not determine video dimensions: {str(e)}")
            # Valori default
            video_width, video_height = 1280, 720
        
        # Generate a unique ID for the output file
        unique_id = str(uuid.uuid4())[:8]
        base_name = os.path.splitext(filename)[0]
        output_filename = f"{base_name}_subtitled_{unique_id}.mp4"
        output_path = os.path.join(PROCESSED_FOLDER, output_filename)
        
        update_task_status(task_id, "processing", 10, "Creare fișier temporar de subtitrări")
        
        # Extragem parametrii de stil din stilul validat
        # FIX #8 & #9: Folosim noile funcții cu calculare automată
        max_lines = validated_style['maxLines']
        max_width = validated_style['maxWidth']
        
        # Importăm noile funcții
        from subtitles_utils import format_srt_with_auto_lines
        
        # Aplicăm formatarea automată pentru video final
        formatted_subtitles = format_srt_with_auto_lines(
            subtitles, 
            max_lines=max_lines,
            max_width_percent=max_width,
            video_width=video_width
        )
        
        # DEBUG: Verificăm primele 3 subtitrări formatate
        print("DEBUG: Checking first 3 formatted subtitles:")
        for i, sub in enumerate(formatted_subtitles[:3]):
            newline_char = '\n'
            print(f"  Subtitle {i+1}: '{sub['text']}' (contains \\n: {newline_char in sub['text']})")
        
        # Create a temporary SRT file with the subtitles
        temp_srt_path = os.path.join(tempfile.gettempdir(), f"{base_name}_{unique_id}.srt")
        
        with open(temp_srt_path, 'w', encoding='utf-8') as srt_file:
            for i, sub in enumerate(formatted_subtitles, 1):
                start_time = format_srt_timestamp(sub['start'])
                end_time = format_srt_timestamp(sub['end'])
                
                # Procesează textul conform opțiunilor de stil (ALL CAPS, eliminare punctuație, formatare pe linii)
                from custom_position import process_text_with_options
                text = process_text_with_options(sub['text'].strip(), validated_style)
                
                srt_file.write(f"{i}\n")
                srt_file.write(f"{start_time} --> {end_time}\n")
                srt_file.write(f"{text}\n\n")
                
                # Actualizăm progresul pentru fiecare 10% din subtitrări procesate
                if i % max(1, len(subtitles) // 10) == 0:
                    progress = 10 + int((i / len(subtitles)) * 20)
                    update_task_status(task_id, "creating_subtitles", progress, 
                                     f"Creare fișier subtitrări: {i}/{len(subtitles)}")
        
        # Extract style parameters din stilul validat
        font_family = validated_style['fontFamily']
        base_font_size = validated_style['fontSize']
        
        # FIX #6: Ajustăm dimensiunea fontului pentru video cu tratament special pentru mobil
        font_size = adjust_font_size_for_video(
            base_font_size, 
            video_width, 
            1920, 
            is_mobile=is_mobile,
            screen_width=screen_width
        )
        
        print(f"Font size adjusted from {base_font_size} to {font_size} for video width {video_width}px "
              f"(mobile: {is_mobile}, screen: {screen_width}px)")
        
        font_color = validated_style['fontColor']
        border_color = validated_style['borderColor']
        border_width = validated_style['borderWidth']
        position = validated_style['position']
        use_custom_position = validated_style['useCustomPosition']
        custom_x = validated_style['customX']
        custom_y = validated_style['customY']

        # Asigură-te că culorile sunt în format corect (cu # în față)
        if font_color and not font_color.startswith('#'):
            font_color = '#' + font_color
            
        if border_color and not border_color.startswith('#'):
            border_color = '#' + border_color

        # Extragem parametrii pentru cuvântul curent
        current_word_color = validated_style['currentWordColor']
        if current_word_color and not current_word_color.startswith('#'):
            current_word_color = '#' + current_word_color
            
        current_word_border_color = validated_style['currentWordBorderColor']
        if current_word_border_color and not current_word_border_color.startswith('#'):
            current_word_border_color = '#' + current_word_border_color
            
        # Activăm sau dezactivăm karaoke (evidențierea cuvântului curent)
        use_karaoke = validated_style['useKaraoke']
        
        # NEW: Extragem modul de evidențiere
        highlight_mode = validated_style.get('highlightMode', 'none')

        # Log pentru debugging
        print(f"Applying subtitle style: font={font_family}, size={font_size}, color={font_color}, border={border_color}, width={border_width}")
        print(f"Position: {'custom' if use_custom_position else position}, X={custom_x}, Y={custom_y}")
        print(f"Word highlighting: {use_karaoke}, current word color: {current_word_color}, highlight mode: {highlight_mode}")
        print(f"Mobile optimizations: is_mobile={is_mobile}, screen_width={screen_width}")

        update_task_status(task_id, "processing", 30, "Aplicare subtitrări cu stil personalizat")
        
        # Create ASS file with precise word highlighting
        ass_path = os.path.join(tempfile.gettempdir(), f"{base_name}_{unique_id}.ass")
        
        print("Using formatted subtitles with auto-calculated word distribution")
        
        # Alegem metoda potrivită pentru karaoke
        if use_custom_position:
            if use_karaoke:
                create_precise_word_highlighting_ass(
                    temp_srt_path,
                    ass_path,
                    {
                        'fontFamily': font_family,
                        'fontSize': font_size,
                        'fontColor': font_color,
                        'borderColor': border_color,
                        'borderWidth': border_width,
                        'useCustomPosition': use_custom_position,
                        'customX': custom_x,
                        'customY': custom_y,
                        'currentWordColor': current_word_color,
                        'currentWordBorderColor': current_word_border_color,
                        'highlightMode': highlight_mode,  # NEW: Add highlight mode
                        'allCaps': validated_style['allCaps'],
                        'removePunctuation': validated_style['removePunctuation'],
                        'useKaraoke': True,
                        'textAlign': 2,
                        # CRITICAL FIX: Add line formatting parameters
                        'maxLines': validated_style['maxLines'],
                        'maxWordsPerLine': validated_style.get('maxWordsPerLine'),
                        'videoWidth': video_width,
                        # FIX #6: Transmitem informații mobile
                        'isMobile': is_mobile,
                        'screenWidth': screen_width
                    },
                    formatted_subtitles
                )
            else:
                create_ass_file_with_custom_position(
                    temp_srt_path,
                    ass_path,
                    {
                        'fontFamily': font_family,
                        'fontSize': font_size,
                        'fontColor': font_color,
                        'borderColor': border_color,
                        'borderWidth': border_width,
                        'useCustomPosition': use_custom_position,
                        'customX': custom_x,
                        'customY': custom_y,
                        'allCaps': validated_style['allCaps'],
                        'removePunctuation': validated_style['removePunctuation'],
                        # CRITICAL FIX: Add line formatting parameters
                        'maxLines': validated_style['maxLines'],
                        'maxWordsPerLine': validated_style.get('maxWordsPerLine'),
                        'videoWidth': video_width,
                        # FIX #6: Transmitem informații mobile
                        'isMobile': is_mobile,
                        'screenWidth': screen_width
                    },
                    formatted_subtitles
                )
        else:
            if use_karaoke:
                create_precise_word_highlighting_ass(
                    temp_srt_path,
                    ass_path,
                    {
                        'fontFamily': font_family,
                        'fontSize': font_size,
                        'fontColor': font_color,
                        'borderColor': border_color,
                        'borderWidth': border_width,
                        'position': position,
                        'currentWordColor': current_word_color,
                        'currentWordBorderColor': current_word_border_color,
                        'highlightMode': highlight_mode,  # NEW: Add highlight mode
                        'allCaps': validated_style['allCaps'],
                        'removePunctuation': validated_style['removePunctuation'],
                        'useKaraoke': True,
                        # CRITICAL FIX: Add line formatting parameters
                        'maxLines': validated_style['maxLines'],
                        'maxWordsPerLine': validated_style.get('maxWordsPerLine'),
                        'videoWidth': video_width,
                        # FIX #6: Transmitem informații mobile
                        'isMobile': is_mobile,
                        'screenWidth': screen_width
                    },
                    formatted_subtitles
                )
            else:
                create_ass_file_with_custom_position(
                    temp_srt_path,
                    ass_path,
                    {
                        'fontFamily': font_family,
                        'fontSize': font_size,
                        'fontColor': font_color,
                        'borderColor': border_color,
                        'borderWidth': border_width,
                        'position': position,
                        'allCaps': validated_style['allCaps'],
                        'removePunctuation': validated_style['removePunctuation'],
                        # CRITICAL FIX: Add line formatting parameters
                        'maxLines': validated_style['maxLines'],
                        'maxWordsPerLine': validated_style.get('maxWordsPerLine'),
                        'videoWidth': video_width,
                        # FIX #6: Transmitem informații mobile
                        'isMobile': is_mobile,
                        'screenWidth': screen_width
                    },
                    formatted_subtitles
                )
        
        print(f"Created ASS file at {ass_path}")
        
        # Folosim filtrul 'ass' direct
        vf_filter = f"ass={ass_path}:fontsdir=/usr/share/fonts"
        
        # Create the FFmpeg command for adding styled subtitles
        ffmpeg_cmd = [
            'ffmpeg', '-i', input_path,
            '-vf', vf_filter,
            '-c:a', 'copy',
            '-preset', 'fast',
            output_path
        ]
        
        update_task_status(task_id, "processing", 40, "Procesare video cu FFmpeg")
        
        # Set up process to capture progress
        process = subprocess.Popen(
            ffmpeg_cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            universal_newlines=True
        )
        
        # Procesăm outputul pentru a extrage progresul
        last_progress_time = time.time()
        
        # Citim stderr-ul pentru a vedea progresul FFmpeg
        for line in process.stderr:
            if "time=" in line and time.time() - last_progress_time > 0.5:
                # Extragem timpul curent din output-ul ffmpeg
                time_match = line.split("time=")[1].split()[0]
                if ":" in time_match:
                    # Convertim formatul HH:MM:SS.MS în secunde
                    h, m, s = time_match.split(":")
                    current_time = int(h) * 3600 + int(m) * 60 + float(s)
                    
                    # Obținem durata totală a video-ului (dacă e disponibilă)
                    duration = 0
                    if "Duration:" in line:
                        duration_str = line.split("Duration:")[1].split(",")[0].strip()
                        h, m, s = duration_str.split(":")
                        duration = int(h) * 3600 + int(m) * 60 + float(s)
                    
                    # Calculăm progresul (între 40% și 95%)
                    if duration > 0:
                        progress = 40 + int((current_time / duration) * 55)
                        update_task_status(task_id, "encoding", progress, 
                                         f"Procesare video: {time_match}/{duration_str}")
                    
                    last_progress_time = time.time()
        
        # Așteptăm finalizarea procesului
        process.wait()
        
        # Verificăm dacă procesul s-a încheiat cu succes
        if process.returncode != 0:
            error_message = "Eroare la procesarea video cu FFmpeg"
            update_task_status(task_id, "error", 0, error_message)
            return jsonify({'error': error_message, 'task_id': task_id}), 500
        
        # Clean up temporary files
        if os.path.exists(temp_srt_path):
            os.remove(temp_srt_path)
            
        if os.path.exists(ass_path):
            os.remove(ass_path)
        
        update_task_status(task_id, "completed", 100, "Video cu subtitrări creat cu succes")
        
        return jsonify({
            'message': 'Video with subtitles created successfully',
            'output_filename': output_filename,
            'output_path': output_path,
            'task_id': task_id
        }), 200
    
    except Exception as e:
        print(f"Error creating video with subtitles: {str(e)}")
        update_task_status(task_id, "error", 0, f"Eroare la crearea videoclipului: {str(e)}")
        return jsonify({'error': f'Failed to create video: {str(e)}', 'task_id': task_id}), 500

def format_srt_timestamp(seconds):
    """Convert seconds to SRT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds_int = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    
    return f"{hours:02d}:{minutes:02d}:{seconds_int:02d},{milliseconds:03d}"

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    file_path = os.path.join(PROCESSED_FOLDER, filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(file_path, as_attachment=True)

@app.route('/api/test', methods=['GET'])
def test_connection():
    """Rută simplă pentru testarea conexiunii la backend."""
    return jsonify({
        'status': 'ok',
        'message': 'Backend API este funcțional',
        'upload_folder': UPLOAD_FOLDER,
        'processed_folder': PROCESSED_FOLDER,
        'current_whisper_model': current_model_name,
        'available_models': list(AVAILABLE_MODELS.keys()),
        'version': '1.0'
    }), 200

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    print(f"Whisper model loaded: {current_model_name}")
    print(f"Available models: {list(AVAILABLE_MODELS.keys())}")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)