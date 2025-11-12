# ACTUAL API THAT WILL WORK WITH WEBAPP
import os

# Quick runtime workaround for macOS/Linux environments where multiple OpenMP
# runtimes are linked (e.g. libomp from different libraries). Without this,
# some builds will abort with "Initializing libomp.dylib, but found libomp.dylib
# already initialized" causing the Python process to crash and client fetches
# to fail. Setting KMP_DUPLICATE_LIB_OK allows the process to continue. This
# is a tolerated workaround during development; for production you should
# ensure a single OpenMP runtime is used.
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import cv2
import numpy as np
import os
import json
import uuid
from .scan_card import getbounding, crop_out_card, get_text_from_image, get_best_matched_clip, initialize_clip_matcher
import uvicorn
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback
import io
from PIL import Image


load_dotenv()

SUPABASE_URL = os.getenv("supabaseurl")
SUPABASE_KEY = os.getenv("servicerolekey")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Pokemon Card Scanner API", version="1.0.0")

def convert_numpy_types(obj):
    """Recursively convert numpy types to Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj


async def read_image_from_upload(file: UploadFile): #read and turn an UploadFile into an OpenCV BGR image.
    image_data = await file.read()

    # Try OpenCV first (works for JPEG/PNG/WebP if OpenCV built with codecs)
    try:
        np_array = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
        if image is not None:
            return image, image_data
    except Exception:
        image = None

    # Try Pillow (broad format support). If the pillow-heif plugin is installed
    # the Pillow opener will handle HEIC/HEIF files automatically. Attempt to
    # register the pillow-heif opener if available so Image.open can read HEIC.
    try:
        try:
            # Register pillow-heif as an opener so Pillow can open .heic/.heif
            import pillow_heif
            try:
                pillow_heif.register_heif_opener()
            except Exception:
                # If registration fails, proceed — Pillow may still open other formats
                pass
        except Exception:
            # pillow_heif not installed — we'll still try Pillow for JPEG/PNG/etc
            pass

        pil_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        return image, image_data
    except Exception:
        pass

    return None, image_data

# Add CORS middleware to allow requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # REMEMBER TO CHANGE TO DOMAIN NAME
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload da card
class CardUpload(BaseModel):
    card_id: str
    username: str # user_id of individual
    quantity: int = 1

# User registration model
class UserRegistration(BaseModel):
    user_id: str  
    email: str
    password: str
    name: str
    
# Update quantity model
class UpdateQuantity(BaseModel):
    user_id: str
    card_id: str
    quantity: int

# Database helper functions
def get_card_from_db(card_id: str):
    try:
        response = supabase.table("cards").select("*").eq("id", card_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error fetching card from database: {e}")
        return None
    
def get_weaknesses_from_db(card_id: str): #maybe i'll need this later
    try:
        response = supabase.table("weaknesses").select("*").eq("card_id", card_id).execute()
        if response.data:
            return response.data
        return []
    except Exception as e:
        print(f"Error fetching weaknesses from database: {e}")
        return []

def get_resistances_from_db(card_id: str):  #maybe i'll need this later
    try:
        response = supabase.table("resistances").select("*").eq("card_id", card_id).execute()
        if response.data:
            return response.data
        return []
    except Exception as e:
        print(f"Error fetching resistances from database: {e}")
        return []

def get_abilities_from_db(card_id: str): #maybe i'll need this later
    try:
        response = supabase.table("abilities").select("*").eq("card_id", card_id).execute()
        if response.data:
            return response.data
        return []
    except Exception as e: 
        print(f"Error fetching abilities from database: {e}")
        return []

def get_card_attacks_from_db(card_id: str):  #maybe i'll need this later
    try:
        response = (supabase.table("attacks").select("*").eq("card_id", card_id).execute())
        if response.data:
            return response.data
        return []
    except Exception as e:
        print(f"Error fetching attack details from database: {e}")
        return []

def add_card_to_user_collection(username: str, card_id: str, quantity: int = 1): #add card to user collection
    try:
        # username is actually the Supabase user UUID
        user_id = username
        
        existing = supabase.table("user_cards").select("*").eq("user_id", user_id).eq("card_id", card_id).execute()
        
        if existing.data and len(existing.data) > 0: # Update quantity by 1
            current_qty = existing.data[0].get("quantity", 0)
            new_qty = current_qty + quantity
            
            response = supabase.table("user_cards").update({
                "quantity": new_qty,
                "acquired_at": datetime.now().isoformat()
            }).eq("user_id", user_id).eq("card_id", card_id).execute()
            
            return {"success": True, "action": "updated", "new_quantity": new_qty}
        
        else: # Insert new record cause no existing
            response = supabase.table("user_cards").insert({
                "user_id": user_id,
                "card_id": card_id,
                "quantity": quantity,
                "acquired_at": datetime.now().isoformat()
            }).execute()
            
            return {"success": True, "action": "added", "quantity": quantity}
        
    except Exception as e:
        print(f"Error adding card to user collection: {e}")
        return {"success": False, "error": str(e)}

# Global flag to track CLIP initialization
_clip_initialized = False

# Initialize CLIP matcher on startup (non-blocking)
@app.on_event("startup")
async def startup_event():
    import asyncio
    global _clip_initialized
    
    # Run CLIP initialization in background thread to not block startup
    def init_clip_background():
        global _clip_initialized
        print("Initializing CLIP in background...")
        if initialize_clip_matcher():
            _clip_initialized = True
            print("CLIP ready")
        else:
            print("CLIP failed to initialize")
    
    # Run in thread pool executor to not block event loop
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, init_clip_background)
    print("CLIP initialization started in background")

@app.get("/") #home page
async def root(): #check if up
    return {
        "status": "online", 
        "service": "Pokemon Card Scanner API",
        "clip_initialized": _clip_initialized
    }

@app.get("/health") #health check with CLIP status
async def health():
    return {
        "status": "healthy",
        "clip_ready": _clip_initialized
    }

@app.post("/scan_card_extra_info/") #Scan uploaded image and return extra info (for seeing the process work)
async def scan_card_extra_info(file: UploadFile = File(...)):
    try:
        # Check if CLIP is ready
        if not _clip_initialized:
            return JSONResponse(
                content={
                    "error": "CLIP model is still initializing. Please try again in a moment.",
                    "clip_ready": False
                },
                status_code=503
            )
        
        # GET THE IMAGE (supports HEIC/HEIF via Pillow/pyheif fallback)
        image, _ = await read_image_from_upload(file)

        if image is None:
            return JSONResponse(
                content={"error": "Invalid or unsupported image file"},
                status_code=400
            )

        # Detect card bounding box
        result = getbounding(image, display=False)
        
        if result is None or not isinstance(result, tuple):
            return JSONResponse(
                content={"error": "Failed to detect card"},
                status_code=400
            )

        model, bbox, bbox_image = result

        if bbox is None:
            return JSONResponse(
                content={"error": "No card detected in image"},
                status_code=404
            )
        
        # Crop the card
        card_image = crop_out_card(image, bbox, save_path=None, debug=False)
        
        if card_image is None:
            return JSONResponse(
                content={"error": "Failed to crop card"},
                status_code=500
            )
        
        # Extract text with OCR
        card_info, annotated_image = get_text_from_image(card_image, debug=True, getmore=True, show_window=False)

        detected_name = card_info.get('name')
        best, matches = get_best_matched_clip(card_image, top_k=5, show_image=False, ocr_name=detected_name)
        
        filename = best['card_name']
        
        parts = filename.split("_")
        card_num = parts[-1].replace(".jpg", "")
        set_name = parts[-2]
        card_id = f"{set_name}-{card_num}"
        
        # Fetch full card data from database
        card_data = get_card_from_db(card_id)
        
        # Convert images to base64 for JSON response
        _, base_image_encoded = cv2.imencode('.jpg', image)
        base_image_base64 = base64.b64encode(base_image_encoded).decode('utf-8')
        
        _, bbox_image_encoded = cv2.imencode('.jpg', bbox_image)
        bbox_image_base64 = base64.b64encode(bbox_image_encoded).decode('utf-8')
        
        _, cropped_image_encoded = cv2.imencode('.jpg', card_image)
        cropped_image_base64 = base64.b64encode(cropped_image_encoded).decode('utf-8')
        
        _, annotated_image_encoded = cv2.imencode('.jpg', annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode('utf-8')
        
        # Build response with images and data
        return JSONResponse(content={
            "success": True,
            "base_image": f"data:image/jpeg;base64,{base_image_base64}",
            "bbox_image": f"data:image/jpeg;base64,{bbox_image_base64}",
            "cropped_image": f"data:image/jpeg;base64,{cropped_image_base64}",
            "annotated_image": f"data:image/jpeg;base64,{annotated_image_base64}",
            "card_info": card_info,
            "best_match": {
                "card_id": card_id,
                "card_name": best['card_name'],
                "card_path": best.get('card_path', ''),
                "similarity": best['similarity'],
                "set_name": set_name,
                "card_number": card_num
            },
            "top_matches": [
                {
                    "rank": m['rank'],
                    "card_name": m['card_name'],
                    "card_path": m.get('card_path', ''),
                    "similarity": m['similarity']
                }
                for m in matches
            ],
            "card_data": card_data
        }, status_code=200)

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Internal server error",
                "details": str(e)
            },
            status_code=500
        )

@app.post("/scan_card/") #Scan uploaded image (no extra info just straight business)
async def scan_card(file: UploadFile = File(...)): 
    try:
        # Check if CLIP is ready
        if not _clip_initialized:
            return JSONResponse(
                content={
                    "error": "CLIP model is still initializing. Please try again in a moment.",
                    "clip_ready": False
                },
                status_code=503  # Service Unavailable
            )
        
        image, _ = await read_image_from_upload(file)

        if image is None:
            return JSONResponse(
                content={"error": "Invalid or unsupported image file"},
                status_code=400
            )

        # Detect card bounding box
        result = getbounding(image, display=False)
        
        if result is None or not isinstance(result, tuple):
            return JSONResponse(
                content={"error": "Failed to detect card"},
                status_code=400
            )
        
        model, bbox, bbox_image = result
        
        if bbox is None:
            return JSONResponse(
                content={"error": "No card detected in image"},
                status_code=404
            )
        
        # Crop the card
        card_image = crop_out_card(image, bbox, save_path=None)
        
        if card_image is None:
            return JSONResponse(
                content={"error": "Failed to crop card"},
                status_code=500
            )
        
        # Extract text with OCR
        card_info = get_text_from_image(card_image, debug=False)
        
        # Find matches with CLIP
        detected_name = card_info.get('name')
        best, matches = get_best_matched_clip(card_image, top_k=5, show_image=False, ocr_name=detected_name)
        
        filename = best['card_name']
        
        parts = filename.split("_")
        card_num = parts[-1].replace(".jpg", "")
        set_name = parts[-2]
        card_id = f"{set_name}-{card_num}"
        
        # Fetch full card data from database
        card_data = get_card_from_db(card_id)
        
        # Build response
        response_data = {
            "success": True,
            "card_info": card_info,
            "best_match": {
                "card_id": card_id,
                "card_name": best['card_name'],
                "card_path": best.get('card_path', ''),
                "similarity": best['similarity'],
                "set_name": set_name,
                "card_number": card_num
            },
            "top_matches": [
                {
                    "rank": m['rank'],
                    "card_name": m['card_name'],
                    "card_path": m.get('card_path', ''),
                    "similarity": m['similarity']
                }
                for m in matches
            ],
            "card_data": card_data
        }
        
        return JSONResponse(content=response_data, status_code=200)

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Internal server error",
                "details": str(e)
            },
            status_code=500
        )

@app.post("/scan_multiple_cards/") #Scan multiple Pokemon cards from a single image, ONLY FOR UPLOADING IMAGES
async def scan_multiple_cards(file: UploadFile = File(...)):
    try:
        # Check if CLIP is ready
        if not _clip_initialized:
            return JSONResponse(
                content={
                    "error": "CLIP model is still initializing. Please try again in a moment.",
                    "clip_ready": False
                },
                status_code=503
            )
        
        image, _ = await read_image_from_upload(file)

        if image is None:
            return JSONResponse(
                content={"error": "Invalid or unsupported image file"},
                status_code=400
            )

        # Detect multiple cards with 70% confidence threshold
        result = getbounding(image, display=False, multi_card=True, conf_threshold=0.7)
        
        if result is None or not isinstance(result, tuple):
            return JSONResponse(
                content={"error": "Failed to detect cards"},
                status_code=400
            )
        
        model, bbox_list, bbox_image = result
        
        if not bbox_list or len(bbox_list) == 0:
            return JSONResponse(
                content={
                    "error": "No cards detected with sufficient confidence (>70%)",
                    "cards_found": 0
                },
                status_code=404
            )
        
        print(f"\nProcessing {len(bbox_list)} cards in parallel")
        
        # Function to process a single card
        def process_single_card(idx, bbox_data, image_copy):
            # Need a copy of image to avoid threading issues
            bbox_norm = bbox_data['bbox_norm']
            confidence = bbox_data['confidence']
            card_num = idx + 1
            
            print(f"\nCard {card_num}/{len(bbox_list)} (Confidence: {confidence:.1%})")
            
            try:
                # Crop the card (use image_copy to avoid threading issues)
                card_image = crop_out_card(image_copy, bbox_norm, save_path=None, debug=False)
                
                if card_image is None:
                    print(f"Failed to crop card {card_num}")
                    return {
                        "success": False,
                        "card_number": card_num,
                        "error": "Failed to crop card",
                        "confidence": confidence
                    }
                
                # Extract text with OCR
                card_info = get_text_from_image(card_image, debug=False)
                detected_name = card_info.get('name', 'Unknown')
                print(f"OCR detected name: {detected_name}")
                
                # Find matches with CLIP
                best, matches = get_best_matched_clip(card_image, top_k=5, show_image=False, ocr_name=detected_name)
                
                if not best:
                    print(f"No CLIP match found for card {card_num}")
                    return {
                        "success": False,
                        "card_number": card_num,
                        "error": "No visual match found",
                        "confidence": confidence,
                        "ocr_name": detected_name
                    }
                
                filename = best['card_name']
                parts = filename.split("_")
                card_number = parts[-1].replace(".jpg", "")
                set_name = parts[-2]
                card_id = f"{set_name}-{card_number}"
                
                print(f"Identified as: {card_id} (similarity: {best['similarity']:.4f})")
                
                # Fetch full card data from database
                card_data = get_card_from_db(card_id)
                
                # Convert cropped card to base64 for response
                _, cropped_encoded = cv2.imencode('.jpg', card_image)
                cropped_base64 = base64.b64encode(cropped_encoded).decode('utf-8')
                
                # Build all match variants with full card data
                all_match_variants = []
                for m in matches[:10]:  # Get top 10 matches to give user more options
                    variant_filename = m['card_name']
                    variant_parts = variant_filename.split("_")
                    variant_card_num = variant_parts[-1].replace(".jpg", "")
                    variant_set = variant_parts[-2]
                    variant_card_id = f"{variant_set}-{variant_card_num}"
                    
                    # Fetch card data for this variant
                    variant_card_data = get_card_from_db(variant_card_id)
                    
                    all_match_variants.append({
                        "rank": m['rank'],
                        "card_id": variant_card_id,
                        "card_name": m['card_name'],
                        "similarity": m['similarity'],
                        "set_name": variant_set,
                        "card_number_in_set": variant_card_num,
                        "card_data": variant_card_data
                    })
                
                return {
                    "success": True,
                    "card_number": card_num,
                    "detection_confidence": confidence,
                    "card_id": card_id,
                    "card_name": best['card_name'],
                    "similarity": best['similarity'],
                    "set_name": set_name,
                    "card_number_in_set": card_number,
                    "ocr_info": card_info,
                    "cropped_image": f"data:image/jpeg;base64,{cropped_base64}",
                    "bbox": bbox_norm,
                    "card_data": card_data,
                    "all_matches": all_match_variants
                }
                
            except Exception as e:
                print(f"Error processing card {card_num}: {e}")
                traceback.print_exc()
                return {
                    "success": False,
                    "card_number": card_num,
                    "error": str(e),
                    "confidence": confidence
                }
        
        # Process cards in parallel using ThreadPoolExecutor
        processed_cards = []
        failed_cards = []
        
        # Use max 10 worker, hopefully this runs fine
        max_workers = min(10, len(bbox_list))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_idx = {
                executor.submit(process_single_card, idx, bbox_data, image): idx 
                for idx, bbox_data in enumerate(bbox_list)
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_idx):
                result = future.result()
                
                if result["success"]:
                    processed_cards.append(result)
                else:
                    failed_cards.append({
                        "card_number": result["card_number"],
                        "error": result["error"],
                        "confidence": result.get("confidence", 0)
                    })
        
        # Sort processed cards by card_number to maintain original order
        processed_cards.sort(key=lambda x: x["card_number"])
        failed_cards.sort(key=lambda x: x["card_number"])
        
        print(f"\nALL THREADS COMPLETED")
        print(f"{len(processed_cards)} successful, {len(failed_cards)} failed")
        
        # Convert bbox image with all detections to base64
        _, bbox_image_encoded = cv2.imencode('.jpg', bbox_image)
        bbox_image_base64 = base64.b64encode(bbox_image_encoded).decode('utf-8')

        print(f"BUILDING RESPONSE")

        # Build response
        response_data = {
            "success": True,
            "total_detected": len(bbox_list),
            "successfully_processed": len(processed_cards),
            "failed": len(failed_cards),
            "detection_image": f"data:image/jpeg;base64,{bbox_image_base64}",
            "cards": processed_cards,
            "failed_cards": failed_cards if failed_cards else None
        }

        print("built now send")

        # Convert numpy types to Python types for JSON serialization
        response_data = convert_numpy_types(response_data)

        return JSONResponse(content=response_data, status_code=200)

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Internal server error",
                "details": str(e)
            },
            status_code=500
        )

@app.post("/add_to_collection/") #Add card to user's collection
async def add_to_collection(card_upload: CardUpload): 
    try:
        result = add_card_to_user_collection(
            username=card_upload.username,
            card_id=card_upload.card_id,
            quantity=card_upload.quantity
        )
        
        if result["success"]:
            return JSONResponse(content=result, status_code=200)
        else:
            # Return error with appropriate status code
            error_message = result.get("error", "Unknown error")
            print(f"Failed to add card: {error_message}")
            return JSONResponse(
                content={
                    "success": False,
                    "error": error_message
                }, 
                status_code=400
            )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Failed to add card to collection",
                "details": str(e)
            },
            status_code=500
        )

@app.post("/add_user/")
async def add_user(user_data: UserRegistration): #Add user to bookkeeping table
    try:
        #we hash trust
        user_record = {
            "id": user_data.user_id,
            "email": user_data.email,
            "password_hash": user_data.password,
            "name": user_data.name,
            "created_at": datetime.now().isoformat()
        }
        
        result = supabase.table("users").insert(user_record).execute()
        
        if result.data:
            return JSONResponse(
                content={
                    "success": True,
                    "message": "User added to bookkeeping table"
                },
                status_code=200
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "Failed to insert user"
                },
                status_code=400
            )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Failed to add user to bookkeeping table",
                "details": str(e)
            },
            status_code=500
        )

@app.get("/user/{user_id}") #Get user info from bookkeeping table
async def get_user(user_id: str):
    try:
        response = supabase.table("users").select("id, name, email, created_at").eq("id", user_id).execute()
        
        if response.data and len(response.data) > 0:
            return JSONResponse(
                content={
                    "success": True,
                    "user": response.data[0]
                },
                status_code=200
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "error": "User not found"
                },
                status_code=404
            )
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Failed to fetch user",
                "details": str(e)
            },
            status_code=500
        )

@app.get("/user_collection/{username}") #Fetch user's card collection
async def get_user_collection(username: str):
    try:
        # username is actually the Supabase user UUID
        user_id = username

        # Validate that user_id is a valid UUID
        try:
            uuid.UUID(user_id)
        except ValueError:
            return JSONResponse(
                content={"error": "Invalid user ID format"},
                status_code=400
            )

        # Fetch user cards with all related data in ONE query using joins
        # Nest the related tables under the cards join
        # If you don't join this will legit take years to fetch
        response = supabase.table("user_cards").select(
            """
            id,
            user_id,
            card_id,
            quantity,
            acquired_at,
            cards!user_cards_card_id_fkey(
                *,
                attacks(*),
                weaknesses(*),
                resistances(*),
                abilities(*)
            )
            """
        ).eq("user_id", user_id).execute()

        # The data is already joined, just format it properly
        collection_with_details = []
        for user_card in response.data:
            card_data = user_card.get("cards", {})
            collection_with_details.append({
                "id": user_card["id"],
                "user_id": user_card["user_id"],
                "card_id": user_card["card_id"],
                "quantity": user_card["quantity"],
                "acquired_at": user_card.get("acquired_at"),
                "card_details": card_data if isinstance(card_data, dict) else {},
                "attack_details": card_data.get("attacks", []) if isinstance(card_data, dict) else [],
                "weakness_details": card_data.get("weaknesses", []) if isinstance(card_data, dict) else [],
                "resistance_details": card_data.get("resistances", []) if isinstance(card_data, dict) else [],
                "ability_details": card_data.get("abilities", []) if isinstance(card_data, dict) else []
            })
        
        return JSONResponse(content={
            "success": True,
            "username": username,
            "total_cards": len(collection_with_details),
            "collection": collection_with_details
        }, status_code=200)
        
    except Exception as e:
        traceback.print_exc()
        
        return JSONResponse(
            content={
                "error": "Failed to fetch collection",
                "details": str(e)
            },
            status_code=500
        )

@app.get("/make_collection_opposite/{username}") #Make user's collection opposite visibility
async def make_collection_opposite(username: str): 
    try:
        # username is actually the Supabase user UUID
        user_id = username
        
        current_status = supabase.table("users").select("show_on_leaderboard").eq("id", user_id).execute()
        
        if current_status.data and len(current_status.data) > 0:
            is_public = current_status.data[0].get("show_on_leaderboard", False)
            new_status = not is_public
            
            response = supabase.table("users").update({
                "show_on_leaderboard": new_status
            }).eq("id", user_id).execute()
            
            return JSONResponse(content={
                "success": True,
                "username": username,
                "new_is_public_status": new_status
            }, status_code=200)
        else:
            return JSONResponse(
                content={
                    "error": "User not found"
                },
                status_code=404
            )
        
    except Exception as e:
        traceback.print_exc()
        
        return JSONResponse(
            content={
                "error": "Failed to toggle collection visibility",
                "details": str(e)
            },
            status_code=500
        )

@app.get("/leaderboard/") #Get leaderboard of users with most cards in public profiles
async def get_leaderboard(): 
    try:
        # Fetch users who have public profiles
        public_users = supabase.table("users").select("id, name").eq("show_on_leaderboard", True).execute()
        
        leaderboard = []
        
        for user in public_users.data:
            user_id = user["id"]
            user_name = user["name"]
            
            # Skip users with invalid UUIDs
            try:
                uuid.UUID(user_id)
            except ValueError:
                continue
            
            unique_cards = supabase.table("user_cards").select("card_id", count="exact").eq("user_id", user_id).execute().count
            unique_cards = unique_cards if unique_cards is not None else 0
            
            resp_cards = supabase.table("user_cards").select("quantity").eq("user_id", user_id).execute()
            rows = resp_cards.data if (resp_cards and resp_cards.data) else []
            total_cards = sum([r.get("quantity", 0) for r in rows])

            leaderboard.append({
                "user_id": user_id,
                "name": user_name,
                "unique_cards": unique_cards,
                "total_cards": total_cards
            })
        
        # Sort leaderboard by unique_cards descending
        leaderboard.sort(key=lambda x: x["unique_cards"], reverse=True)

        return JSONResponse(content={
            "success": True,
            "leaderboard": leaderboard
        }, status_code=200)
        
    except Exception as e:
        traceback.print_exc()
        
        return JSONResponse(
            content={
                "error": "Failed to fetch leaderboard",
                "details": str(e)
            },
            status_code=500
        )

@app.get("/profile_status/{user_id}") #returns if user profile is public or private
async def profile_status(user_id: str):
    try:
        resp = supabase.table("users").select("show_on_leaderboard").eq("id", user_id).execute()
        if resp.data and len(resp.data) > 0:
            row = resp.data[0]
            is_public = bool(row.get("show_on_leaderboard", False))
            return JSONResponse(content={"success": True, "is_public": is_public}, status_code=200)
        else:
            return JSONResponse(content={"success": False, "error": "User not found"}, status_code=404)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(content={"error": "Failed to fetch profile status", "details": str(e)}, status_code=500)

@app.get("/total_cards/{username}") #Get total number of cards in user's collection
async def get_total_cards(username: str): 
    try:
        # username is actually the Supabase user UUID
        user_id = username
        
        total_cards = supabase.table("user_cards").select("card_id", count="exact").eq("user_id", user_id).execute().count
        
        return JSONResponse(content={
            "success": True,
            "username": username,
            "total_cards": total_cards
        }, status_code=200)
        
    except Exception as e:
        traceback.print_exc()
        
        return JSONResponse(
            content={
                "error": "Failed to fetch total cards",
                "details": str(e)
            },
            status_code=500
        )

@app.post("/update_quantity/") # Update quantity in user_cards table (add or subtract cards)
async def update_quantity(data: UpdateQuantity):
    try:
        
        response = supabase.table("user_cards").update({"quantity": data.quantity}).eq("user_id", data.user_id).eq("card_id", data.card_id).execute()   
        
        return JSONResponse(content={
            "success": True,
            "message": "Quantity updated successfully",
            "new_quantity": data.quantity
        }, status_code=200)
        
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Failed to update quantity",
                "details": str(e)
            },
            status_code=500
        )

@app.post("/delete_card/") # Delete a card from user's collection
async def delete_card_from_collection(user_id: str, card_id: str):
    try:
        response = supabase.table("user_cards").delete().eq("user_id", user_id).eq("card_id", card_id).execute()
        
        return JSONResponse(content={
            "success": True,
            "message": "Card deleted successfully"
        }, status_code=200)
        
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            content={
                "error": "Failed to delete card",
                "details": str(e)
            },
            status_code=500
        )

@app.get("/card/{card_id}") #Get card details by card ID
async def get_card_details(card_id: str):
    try:
        card_data = get_card_from_db(card_id)
        
        if card_data:
            return JSONResponse(content={
                "success": True,
                "card_data": card_data
            }, status_code=200)
        else:
            return JSONResponse(
                content={"error": "Card not found"},
                status_code=404
            )
        
    except Exception as e:
        traceback.print_exc()
        
        return JSONResponse(
            content={
                "error": "Failed to fetch card details",
                "details": str(e)
            },
            status_code=500
        )

if __name__ == "__main__":
    print("Starting Pokemon Card Scanner API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)