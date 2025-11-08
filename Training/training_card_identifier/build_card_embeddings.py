import os
import pickle
from PIL import Image
import torch
import clip
import numpy as np
from tqdm import tqdm
import ssl
import urllib.request

# Fix SSL certificate verification issue on macOS
ssl._create_default_https_context = ssl._create_unverified_context

# Paths
CARD_IMAGES_DIR = "/Users/shrey/Downloads/Coding/Pokemon_Webapp/Image_detection/reference_images"
OUTPUT_EMBEDDINGS_FILE = "clip_card_embeddings.pkl"

# Configuration
BATCH_SIZE = 32  # Process multiple images at once for 5-10x speedup

print("Building CLIP embeddings for card database...")

# Load CLIP model
device = "cpu"
print(f"Loading CLIP model (ViT-B/32) on {device}...")
model, preprocess = clip.load("ViT-B/32", device=device)
print("Model loaded successfully")

# Get all image files
print(f"\nScanning directory: {CARD_IMAGES_DIR}")
if not os.path.exists(CARD_IMAGES_DIR):
    raise FileNotFoundError(f"Card images directory not found: {CARD_IMAGES_DIR}")

image_files = [
    os.path.join(CARD_IMAGES_DIR, f) 
    for f in os.listdir(CARD_IMAGES_DIR) 
    if f.lower().endswith(('.jpg', '.jpeg', '.png'))
]

if len(image_files) == 0:
    raise ValueError(f"No image files found in {CARD_IMAGES_DIR}")

print(f"Found {len(image_files)} card images")

# Process images in batches for speed
image_paths = []
embeddings = []

print(f"\nExtracting embeddings (batch size: {BATCH_SIZE})...")
for i in tqdm(range(0, len(image_files), BATCH_SIZE), desc="Processing batches"):
    batch_files = image_files[i:i+BATCH_SIZE]
    
    # Load and preprocess batch
    batch_images = []
    valid_paths = []
    
    for img_path in batch_files:
        try:
            img = preprocess(Image.open(img_path))
            batch_images.append(img)
            valid_paths.append(img_path)
        except Exception as e:
            print(f"\nFailed to load {os.path.basename(img_path)}: {e}")
            continue
    
    if len(batch_images) == 0:
        continue
    
    # Stack into batch tensor
    batch_tensor = torch.stack(batch_images).to(device)
    
    # Extract embeddings (no gradient needed - we're not training!)
    with torch.no_grad():
        batch_emb = model.encode_image(batch_tensor)
        # Normalize for cosine similarity
        batch_emb /= batch_emb.norm(dim=-1, keepdim=True)
        embeddings.extend(batch_emb.cpu().numpy())
    
    image_paths.extend(valid_paths)

embeddings = np.array(embeddings).astype("float32")

# Save embeddings
print(f"\nSaving embeddings to {OUTPUT_EMBEDDINGS_FILE}...")
with open(OUTPUT_EMBEDDINGS_FILE, "wb") as f:
    pickle.dump({"paths": image_paths, "embeddings": embeddings}, f)

print(f"Total cards processed: {len(image_paths)}")
print(f"Embedding dimension: {embeddings.shape[1]}D")
print(f"File size: {os.path.getsize(OUTPUT_EMBEDDINGS_FILE) / 1024 / 1024:.2f} MB")
print(f"Output: {OUTPUT_EMBEDDINGS_FILE}")
