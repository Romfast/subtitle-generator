import os
import json
import time
import uuid
import subprocess
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import whisper
import ffmpeg
import webvtt
from werkzeug.utils import secure_filename
from subtitles_utils import format_srt_with_line_limits
from custom_position import create_ass_file_with_custom_position

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

# Load Whisper model
model_size = os.environ.get('WHISPER_MODEL', 'base')
print(f"Loading Whisper model: {model_size}")
model = whisper.load_model(model_size)

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

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
        
        update_task_status(task_id, "processing", 30, "Audio extras. Începere transcriere...")
        
        # Transcribe audio
        print(f"Transcribing audio: {audio_path}")
        # Imitam raportarea progresului pentru fiecare segment procesat 
        # (în realitate Whisper nu raportează progresul)
        
        # Folosim un custom callback pentru a raporta progresul
        class ProgressCallback:
            def __init__(self):
                self.last_segment_time = 0
                self.last_update_time = time.time()
            
            def __call__(self, segment_idx, segment_count):
                # Raportăm progresul doar la fiecare 2 secunde pentru a evita prea multe actualizări
                current_time = time.time()
                if current_time - self.last_update_time > 2:
                    progress = min(30 + int((segment_idx / max(segment_count, 1)) * 60), 90)
                    update_task_status(task_id, "transcribing", progress, 
                                      f"Transcriere: {segment_idx}/{segment_count} segmente")
                    self.last_update_time = current_time
                return True
        
        progress_callback = ProgressCallback()
        
        # Simulăm progresul pentru că Whisper nu oferă un callback de progres
        update_task_status(task_id, "transcribing", 40, "Procesare audio...")
        
        result = model.transcribe(
            audio_path, 
            language='ro', 
            fp16=False, 
            verbose=False
        )
        
        update_task_status(task_id, "processing", 90, "Transcriere finalizată. Generare subtitrări...")
        
        # Create subtitle file in VTT format
        subtitle_path = os.path.join(UPLOAD_FOLDER, f"{os.path.splitext(filename)[0]}.vtt")
        
        with open(subtitle_path, 'w', encoding='utf-8') as vtt_file:
            vtt_file.write("WEBVTT\n\n")
            
            for i, segment in enumerate(result['segments']):
                start_time = format_timestamp(segment['start'])
                end_time = format_timestamp(segment['end'])
                text = segment['text'].strip()
                
                vtt_file.write(f"{start_time} --> {end_time}\n")
                vtt_file.write(f"{text}\n\n")
                
                # Raportăm progresul pentru fiecare 10% de segmente procesate
                if i % max(1, len(result['segments']) // 10) == 0:
                    progress = 90 + int((i / len(result['segments'])) * 10)
                    update_task_status(task_id, "generating_subtitles", progress, 
                                      f"Generare subtitrări: {i}/{len(result['segments'])}")
        
        # Clean up temporary files
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        update_task_status(task_id, "completed", 100, "Subtitrări generate cu succes")
        
        return jsonify({
            'message': 'Subtitles generated successfully',
            'subtitle_path': subtitle_path,
            'subtitles': [
                {
                    'start': segment['start'],
                    'end': segment['end'],
                    'text': segment['text'].strip()
                }
                for segment in result['segments']
            ],
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
        # Generate a unique ID for the output file
        unique_id = str(uuid.uuid4())[:8]
        base_name = os.path.splitext(filename)[0]
        output_filename = f"{base_name}_subtitled_{unique_id}.mp4"
        output_path = os.path.join(PROCESSED_FOLDER, output_filename)
        
        update_task_status(task_id, "processing", 10, "Creare fișier temporar de subtitrări")
        
        # Formatează subtitrările pentru a respecta numărul maxim de linii și lățimea maximă
        max_lines = style.get('maxLines', 3)
        max_width = style.get('maxWidth', 50)
        max_words_per_line = style.get('maxWordsPerLine', 4)
        
        # Modificăm funcția split_subtitle_into_lines pentru a limita numărul de cuvinte per linie
        def custom_split_subtitle(text):
            words = text.split()
            lines = []
            
            for i in range(0, len(words), max_words_per_line):
                # Luăm maxim max_words_per_line cuvinte pentru fiecare linie
                line_words = words[i:i + max_words_per_line]
                lines.append(" ".join(line_words))
                
                # Dacă am ajuns la numărul maxim de linii, ne oprim
                if len(lines) >= max_lines:
                    # Dacă mai avem cuvinte rămase, le adăugăm la ultima linie
                    if i + max_words_per_line < len(words):
                        remaining_words = words[i + max_words_per_line:]
                        lines[-1] = lines[-1] + " " + " ".join(remaining_words)
                    break
            
            return "\n".join(lines)
        
        # Aplicăm formtarea personalizată pentru fiecare subtitrare
        # Împărțim subtitrările în segmente mai mici cu maxim 4 cuvinte
        formatted_subtitles = format_srt_with_line_limits(
            subtitles, 
            max_lines, 
            max_width, 
            max_words_per_line
        )
        
        # Create a temporary SRT file with the subtitles
        temp_srt_path = os.path.join(tempfile.gettempdir(), f"{base_name}_{unique_id}.srt")
        
        with open(temp_srt_path, 'w', encoding='utf-8') as srt_file:
            for i, sub in enumerate(formatted_subtitles, 1):
                start_time = format_srt_timestamp(sub['start'])
                end_time = format_srt_timestamp(sub['end'])
                text = sub['text'].strip()
                
                srt_file.write(f"{i}\n")
                srt_file.write(f"{start_time} --> {end_time}\n")
                srt_file.write(f"{text}\n\n")
                
                # Actualizăm progresul pentru fiecare 10% din subtitrări procesate
                if i % max(1, len(subtitles) // 10) == 0:
                    progress = 10 + int((i / len(subtitles)) * 20)
                    update_task_status(task_id, "creating_subtitles", progress, 
                                     f"Creare fișier subtitrări: {i}/{len(subtitles)}")
        
        # Extract style parameters
        font_size = style.get('fontSize', 24)
        font_color = style.get('fontColor', 'white')
        border_color = style.get('borderColor', 'black')
        border_width = style.get('borderWidth', 2)
        position = style.get('position', 'bottom')
        font_family = style.get('fontFamily', 'Sans')
        use_custom_position = style.get('useCustomPosition', False)
        custom_x = style.get('customX', 50)
        custom_y = style.get('customY', 90)
        
        update_task_status(task_id, "processing", 30, "Aplicare subtitrări pe video")
        
        # Map position to FFmpeg subtitle positioning
        if use_custom_position:
            # Pentru poziționare manuală, folosim coordonate absolute
            # Valorile ASS pentru poziție: 1=jos-stânga, 2=jos-centru, 3=jos-dreapta, etc.
            vertical_position = f"{custom_y}%"
            horizontal_position = f"{custom_x}%"
            text_align = 2  # Centrat
        else:
            # Map position to FFmpeg subtitle positioning
            position_map = {
                'top': '10',
                'middle': '(h-text_h)/2',
                'bottom': 'h-text_h-10',
                'top-left': '10',
                'top-right': '10',
                'bottom-left': 'h-text_h-10',
                'bottom-right': 'h-text_h-10'
            }
            
            horizontal_map = {
                'top': '(w-text_w)/2',
                'middle': '(w-text_w)/2',
                'bottom': '(w-text_w)/2',
                'top-left': '10',
                'top-right': 'w-text_w-10',
                'bottom-left': '10',
                'bottom-right': 'w-text_w-10'
            }
            
            text_align_map = {
                'top': 2,        # Centrat
                'middle': 2,     # Centrat
                'bottom': 2,     # Centrat
                'top-left': 1,   # Stânga
                'top-right': 3,  # Dreapta
                'bottom-left': 1,# Stânga
                'bottom-right': 3 # Dreapta
            }
            
            vertical_position = position_map.get(position, 'h-text_h-10')
            horizontal_position = horizontal_map.get(position, '(w-text_w)/2')
            text_align = text_align_map.get(position, 2)
            
        # Construim opțiunile pentru stilul subtitrărilor cu poziționarea corectă
        subtitle_style = (
            f"FontName={font_family},"
            f"FontSize={font_size},"
            f"PrimaryColour={hex_to_ass_color(font_color)},"
            f"OutlineColour={hex_to_ass_color(border_color)},"
            f"BorderStyle=1,"
            f"Outline={border_width},"
            f"Alignment={text_align},"
            f"MarginL=10,"
            f"MarginR=10,"
            f"MarginV=10"
        )
        
        if use_custom_position:
            # Pentru poziționare manuală, creăm un fișier ASS personalizat
            ass_path = os.path.join(tempfile.gettempdir(), f"{base_name}_{unique_id}.ass")
            
            # Creăm fișierul ASS cu poziție personalizată
            create_ass_file_with_custom_position(
                temp_srt_path,
                ass_path,
                style,
                formatted_subtitles
            )
            
            # Folosim fișierul ASS pentru subtitrări în loc de SRT
            vf_filter = f"ass={ass_path}"
        else:
            vf_filter = f"subtitles={temp_srt_path}:force_style='{subtitle_style}'"
        
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
            
        if use_custom_position and os.path.exists(ass_path):
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
        'version': '1.0'
    }), 200

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)