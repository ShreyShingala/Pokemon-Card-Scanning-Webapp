import faiss
import pickle
import numpy as np
import os

# Files
EMBEDDINGS_FILE = "clip_card_embeddings.pkl"
FAISS_INDEX_FILE = "clip_card_index.faiss"
INDEX_MAP_FILE = "clip_card_index_map.pkl"

print("Building FAISS index for fast similarity search...")

# Check if embeddings file exists
if not os.path.exists(EMBEDDINGS_FILE):
    raise FileNotFoundError(
        f"Embeddings file not found: {EMBEDDINGS_FILE}\n"
    )

# Load embeddings
print(f"Loading embeddings from {EMBEDDINGS_FILE}...")
with open(EMBEDDINGS_FILE, "rb") as f:
    data = pickle.load(f)

image_paths = data["paths"]
embeddings = data["embeddings"]

print(f"Loaded {len(image_paths)} card embeddings")
print(f"Embedding dimension: {embeddings.shape[1]}D")

# Create FAISS index
print("\nCreating FAISS index...")
d = embeddings.shape[1]  # dimension of embeddings (512 for ViT-B/32)
index = faiss.IndexFlatIP(d)  # Inner Product = Cosine similarity (for normalized vectors)
index.add(embeddings)

print(f"Index created with {index.ntotal} vectors")

# Save index
print(f"\nSaving FAISS index to {FAISS_INDEX_FILE}...")
faiss.write_index(index, FAISS_INDEX_FILE)
print(f"Saving index mapping to {INDEX_MAP_FILE}...")
with open(INDEX_MAP_FILE, "wb") as f:
    pickle.dump(image_paths, f)


print(f"Total cards indexed: {len(image_paths)}")
print(f"Index file: {FAISS_INDEX_FILE}")
print(f"Map file: {INDEX_MAP_FILE}")