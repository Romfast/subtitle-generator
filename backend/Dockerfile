FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-freefont-ttf \
    fonts-liberation \
    fonts-dejavu \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories for uploads and processed videos
RUN mkdir -p /app/uploads /app/processed /shared

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
