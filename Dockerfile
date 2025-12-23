FROM python:3.11-slim

# Install only essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch torchvision && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf ~/.cache/pip

# Pre-download CLIP model to bake it into the Docker image
# This avoids downloading 338MB on every cold start
# Cache it in /app/.cache/clip to match runtime location
RUN mkdir -p /app/.cache/clip && \
    python -c "import clip; print('Downloading CLIP model...'); clip.load('ViT-B/32', device='cpu', download_root='/app/.cache/clip'); print('CLIP model cached successfully')"

# Copy only necessary application files
COPY Image_detection/ Image_detection/
COPY detector_models/ detector_models/
COPY Training/training_card_identifier/ Training/training_card_identifier/

# Expose port
EXPOSE 5000

# Run the application
CMD uvicorn Image_detection.main:app --host=0.0.0.0 --port=${PORT:-5000}
