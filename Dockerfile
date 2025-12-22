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

# Copy only necessary application files
COPY Image_detection/ Image_detection/
COPY detector_models/ detector_models/
COPY Training/training_card_identifier/clip_card_index.faiss Training/training_card_identifier/

# Expose port
EXPOSE 5000

# Run the application
CMD uvicorn Image_detection.main:app --host=0.0.0.0 --port=${PORT:-5000}
