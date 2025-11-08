#!/usr/bin/env bash
set -euo pipefail

# Render startup script for backend service.

echo "=== Render start script: preparing model assets ==="

PYTHON=${PYTHON:-python3}
PORT=${PORT:-8000}
USE_SUPABASE=${USE_SUPABASE:-false}

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
DST_DIR="$ROOT_DIR/Training/training_card_identifier"
mkdir -p "$DST_DIR"

# If model files are already present in the repository at the expected location,
if [ -f "$DST_DIR/clip_card_index.faiss" ] && [ -f "$DST_DIR/clip_card_index_map.pkl" ]; then
	echo "Model files already present in repo at $DST_DIR — skipping download."
else

if [ "$USE_SUPABASE" = "true" ]; then
	echo "Using Supabase to download model assets..."
	if [ -z "${SUPABASE_URL-}" ] || [ -z "${SUPABASE_KEY-}" ]; then
		echo "SUPABASE_URL or SUPABASE_KEY not set — skipping Supabase download"
	else
		$PYTHON - <<PY
from supabase import create_client
import os
import sys

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
bucket = os.environ.get('SUPABASE_BUCKET', 'models')
index_path = os.environ.get('SUPABASE_INDEX_PATH', 'indexes/clip_card_index.faiss')
map_path = os.environ.get('SUPABASE_MAP_PATH', 'indexes/clip_card_index_map.pkl')
weights_path = os.environ.get('SUPABASE_WEIGHTS_PATH', 'weights/best.pt')
dst = os.path.join(os.path.dirname(__file__), 'Training', 'training_card_identifier')

print('Connecting to Supabase...')
client = create_client(url, key)

def download(obj_path, dst_name):
		print('Downloading', obj_path)
		try:
				res = client.storage.from_(bucket).download(obj_path)
				if res is None:
						print('Download returned None for', obj_path)
						return False
				try:
						data = res.read()
				except Exception:
						data = res
				with open(os.path.join(dst, dst_name), 'wb') as f:
						f.write(data)
				print('Saved', dst_name)
				return True
		except Exception as e:
				print('Error downloading', obj_path, e)
				return False

download(index_path, 'clip_card_index.faiss')
download(map_path, 'clip_card_index_map.pkl')
download(weights_path, os.path.basename(weights_path))
PY
	fi
else
	echo "Using Hugging Face snapshot_download to get model assets..."
	if [ -z "${HF_MODEL_REPO_ID-}" ] || [ -z "${HF_TOKEN-}" ]; then
		echo "HF_MODEL_REPO_ID or HF_TOKEN not set — skipping Hugging Face download"
	else
		export HUGGINGFACEHUB_API_TOKEN="$HF_TOKEN"
		$PYTHON - <<PY
from huggingface_hub import snapshot_download
import os, shutil

repo = os.environ.get('HF_MODEL_REPO_ID')
dst = os.path.join(os.path.dirname(__file__), 'Training', 'training_card_identifier')
print('Downloading snapshot for', repo)
snap = snapshot_download(repo_id=repo, token=os.environ.get('HF_TOKEN'), allow_patterns=['indexes/*','weights/*'])
print('Snapshot at', snap)

src_idx = os.path.join(snap, 'indexes', 'clip_card_index.faiss')
src_map = os.path.join(snap, 'indexes', 'clip_card_index_map.pkl')
src_emb = os.path.join(snap, 'indexes', 'clip_card_embeddings.pkl')

os.makedirs(dst, exist_ok=True)

def copy_if_exists(src, dst_name):
		if os.path.exists(src):
				shutil.copy(src, os.path.join(dst, dst_name))
				print('Copied', src, '->', dst_name)
				return True
		return False

copied = copy_if_exists(src_idx, 'clip_card_index.faiss')
copied = copy_if_exists(src_map, 'clip_card_index_map.pkl') or copied
copied = copy_if_exists(src_emb, 'clip_card_index_map.pkl') or copied
if not copied:
		print('No expected index/map files found in snapshot — check repo contents')
PY
	fi
fi

fi

echo "Starting uvicorn on port ${PORT}..."
exec uvicorn Image_detection.main:app --host 0.0.0.0 --port ${PORT}

