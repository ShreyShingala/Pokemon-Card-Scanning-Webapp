# Hugging Face Spaces Dockerfile for Pokemon Card Scanner API
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create cache directory for CLIP
RUN mkdir -p .clip_cache

# Expose port (Hugging Face uses 7860 by default)
EXPOSE 7860

# Pre-download CLIP model during build to avoid runtime download
RUN python -c "import ssl; ssl._create_default_https_context = ssl._create_unverified_context; import clip; import os; os.makedirs('.clip_cache', exist_ok=True); clip.load('ViT-B/32', device='cpu', download_root='.clip_cache'); print('✓ CLIP model cached')"

# Start FastAPI server on port 7860
CMD ["uvicorn", "Image_detection.main:app", "--host", "0.0.0.0", "--port", "7860"]
