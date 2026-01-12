# Pokemon Card Scanning Webapp

Demo: https://pokemon-card-scanning-webapp.vercel.app/

Video demo: https://www.youtube.com/watch?v=83ed0eN-RR0

Link to the collection of images: https://drive.google.com/drive/folders/1MwCMRrEN_vw53t0sZqYlTFMOYj2QhaP7

Live API: https://huggingface.co/spaces/ShreyShingala/pokemon-scanner-api

## Overview

Super cool webapp to help manage your pokemon card collection online. Uses a YOLOv8 detector to scan for bounding boxes, then a mix of OCR and a CLIP+FAISS model to detect visual similarity and get the actual card. Next.js frontend so you can actually add to your collection, view the leaderboard, etc. 

## Features
Key capabilities
- Real-time card detection with YOLOv8 and per-card cropping
- Per-card identification via CLIP embeddings + FAISS nearest-neighbor search
- Multi-card detection and parallel per-card processing
- Responsive camera UI for mobile scanning and desktop
- Production-ready deployment with `systemd` + Caddy reverse proxy

## Repo layout

- `Image_detection/` — FastAPI backend stuff
- `Training/` — Training models stuff
- `pokemon-scanner-next/` — Next.js frontend stuff
- `detector_models/` - Where the actual models are located
- `Database` - schema and original database population (~20k distinct pokemon cards in database)
- `nest-deploy/` — Miscellaneous self hosting files ($0 cost to deploy when the server feels like working)

## How It Was Made

Data collection:
- Wrote scrapers to collect sanitize card images and data from public card databases.
- The curated dataset contains ~20,000 unique cards (all in supabase).

Training
- Converted COCO annotations to YOLO format and then train a YOLOv8 model to detect bounding boxes.
- Using all of the images saved locally (~40+GB) built a CLIP+FAISS model to get visual similarity.

Webapp:
- Created and hosted the api to interact with the models
- Actually made the webapp and made it look pretty, with camera inputs to detect cards.

## How scanning works

1. Image is captured in the Next.js camera UI (single or multi-card).
2. Upload image to the FastAPI app.
3. YOLOv8 detector returns bounding boxes and boxes with confidence above threshold are cropped.
4. Each crop is processed in parallel with OCR name extraction and CLIP embedding generation.
5. CLIP embedding is searched against a FAISS index (nearest neighbors) and OCR provides a sanity check on candidate filenames.
6. The API builds a combined result (detection crop, OCR text, top matches) and returns it to the frontend.
7. Honestly could've just used the CLIP+FAISS model and it woudld've been so much faster, but this is cooler.

## Backend Deployment

The FastAPI backend is deployed on Hugging Face Spaces using Docker:

- **Docker SDK**: Custom Dockerfile with Python 3.11, system dependencies (git, build-essential, OpenCV libs, libheif), and all Python packages
