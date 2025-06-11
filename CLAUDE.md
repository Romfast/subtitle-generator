# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Romanian subtitle generator application that uses Whisper AI for automatic transcription and FFmpeg for video processing. It consists of three main components:

- **Frontend (React)**: User interface for video upload, subtitle editing, and style customization
- **Backend (Python/Flask)**: API handling Whisper transcription, subtitle processing, and video generation
- **Nginx**: Reverse proxy with optional Basic Auth protection

## Development Commands

### Docker Development (Primary)
```bash
# Start all services
docker-compose up -d --build

# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs [nginx|frontend|backend]

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build [service-name]
```

### Frontend Development
```bash
cd frontend
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python app.py      # Development server (port 5000)
```

## Architecture

### Video Processing Pipeline
1. Video upload to `/app/uploads` (backend volume)
2. Whisper transcription with configurable models (base/small/medium/large)
3. Subtitle editing with custom styling options
4. FFmpeg video processing with ASS subtitle overlay
5. Final video generation in `/app/processed`

### Key Backend Components
- `app.py`: Main Flask application with API endpoints
- `subtitles_utils.py`: SRT formatting and subtitle processing utilities
- `custom_position.py`: ASS file generation for advanced subtitle styling

### Key Frontend Components
- `App.js`: Main application with video player and subtitle management
- `SubtitlesConfig.js`: Style configuration (font, size, color, position)
- `EditableSubtitleItem.js`: Individual subtitle editing interface
- `SubtitlePreview.js`: Real-time subtitle preview overlay

### State Management
The React frontend uses hooks for state management without external libraries. Key states include:
- Video file and upload progress
- Subtitle data and editing states
- Whisper model selection and loading
- Video processing progress tracking

## Environment Configuration

### Required Environment Variables
- `WHISPER_MODEL`: Whisper model size (base/small/medium/large, default: small)
- `MAX_UPLOAD_SIZE`: Maximum file upload size (default: 3000MB)
- `AUTH_USERNAME`/`AUTH_PASSWORD`: Optional Basic Auth credentials
- `BACKEND_API_KEY`/`REQUIRE_API_KEY`: Optional API key protection

### File Limits and Timeouts
- Nginx configured for large file uploads (3GB default)
- Extended timeouts for video processing operations
- Memory limits: Backend container limited to 4GB RAM

## Development Notes

### Model Management
- Whisper models are cached in Docker volume `whisper_models`
- Model switching requires backend restart and model download
- Model loading is thread-safe with locking mechanism

### File Handling
- Uploaded videos stored in persistent Docker volume
- Processed videos automatically cleaned up after download
- Temporary files managed in `/tmp` during processing

### API Integration
- Frontend communicates via proxy through Nginx
- CORS configured for development flexibility
- Progress tracking via polling endpoints for long operations