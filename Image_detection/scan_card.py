# MAIN MODULE FOR POKEMON CARD SCANNER USING YOLO + CLIP + FAISS + BACK BACK END FOR API
# ALSO RUN BY ITESLF JUST FOR TESTING PURPOSES
import cv2
import easyocr
import requests
import urllib.request
import os
import numpy as np
import logging
from PIL import Image as PILImage
import re
import ssl
import json
import torch
import unicodedata
from ultralytics import YOLO
ssl._create_default_https_context = ssl._create_unverified_context #Mac was throwing a hissy fit

_clip_model = None
_clip_preprocess = None
_faiss_index = None
_faiss_image_paths = None

def take_picture(): #take picture from the webcam
    cap = cv2.VideoCapture(0)
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print("Failed to grab camera frame")
            break
        
        cv2.imshow('Pokemon Card Scanner - Press SPACE to capture, ESC to exit', frame)
        key = cv2.waitKey(1)

        if key % 256 == 27:  # ESC pressed
            cap.release()
            cv2.destroyAllWindows()
            return None
            
        elif key % 256 == 32:  # SPACE pressed
            cap.release()
            cv2.destroyAllWindows()
            return frame
    
    cap.release()
    cv2.destroyAllWindows()
    return None

def getbounding(image_input=None, display=True, multi_card=False, conf_threshold=0.7): #detect pokemon card in image using
    
    if YOLO is None:
        print("YOLO not available!")
        return None
    
    project_root = os.path.join(os.path.dirname(__file__), '..')
    model_path = os.path.join(project_root, 'detector_models/pokemon_detector4/weights/best.pt')
    
    try:
        model = YOLO(model_path)
        if image_input is not None: # Check if input is a file path or numpy array
            
            if isinstance(image_input, str):
                print(f"\nDetecting Pokemon card in: {image_input}")
                image = cv2.imread(image_input)
                source_for_yolo = image_input
                
            else: # It's a numpy array (frame from camera)
                print(f"\nDetecting Pokemon card in captured frame...")
                image = image_input
                source_for_yolo = image_input
            
            # Use appropriate confidence threshold
            detection_conf = conf_threshold if multi_card else 0.25
            results = model(source_for_yolo, conf=detection_conf, verbose=False)
            result = results[0]  # Get the first result

            # Check if any detections were made
            if len(result.boxes) == 0:
                print("No Pokemon card detected in the image!")
                if display:
                    cv2.putText(image, 'No card detected', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    cv2.imshow('Card Detection', image)
                    print("Press any key to close...")
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
                
                if multi_card:
                    return model, [], image
                return model, None, image
            
            h, w = image.shape[:2]
            bbox_image = image.copy()
            
            if multi_card:
                # Process ALL detected cards above threshold
                bbox_list = []
                print(f"\nDetected {len(result.boxes)} card(s) with confidence >= {conf_threshold:.0%}")
                
                for idx, box in enumerate(result.boxes):
                    bbox_xyxy = box.xyxy[0].cpu().numpy()  # [x1, y1, x2, y2] in pixels
                    confidence = box.conf[0].cpu().numpy()
                    
                    # Convert to normalized coordinates
                    x1, y1, x2, y2 = bbox_xyxy
                    bbox_norm = [x1/w, y1/h, x2/w, y2/h]
                    
                    bbox_list.append({
                        'bbox_norm': bbox_norm,
                        'confidence': float(confidence),
                        'index': idx
                    })
                    
                    # Draw bounding box with different colors for each card
                    color = ((idx * 80) % 255, (idx * 120 + 100) % 255, (idx * 160 + 50) % 255)
                    cv2.rectangle(bbox_image, (int(x1), int(y1)), (int(x2), int(y2)), color, 3)
                    
                    # Add label with card number and confidence
                    text = f'Card {idx+1} ({confidence:.1%})'
                    cv2.putText(bbox_image, text, (int(x1), int(y1) - 10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    
                    print(f"  Card {idx+1}: Confidence {confidence:.1%} at [{bbox_norm[0]:.3f}, {bbox_norm[1]:.3f}, {bbox_norm[2]:.3f}, {bbox_norm[3]:.3f}]")
                
                if display:
                    cv2.imshow('YOLO Multi-Card Detection', bbox_image)
                    print("\nPress any key to close the window...")
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
                
                return model, bbox_list, bbox_image
            
            else:
                # Single card mode - return only the highest confidence detection
                box = result.boxes[0] 
                bbox_xyxy = box.xyxy[0].cpu().numpy()  # [x1, y1, x2, y2] in pixels
                confidence = box.conf[0].cpu().numpy()
                
                # Convert to normalized coordinates [x1, y1, x2, y2]
                x1, y1, x2, y2 = bbox_xyxy
                bbox_norm = [x1/w, y1/h, x2/w, y2/h]
                
                # Draw bounding box on image copy for visualization
                cv2.rectangle(bbox_image, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 3)
                cv2.circle(bbox_image, (int(x1), int(y1)), 5, (0, 0, 255), -1)  # Top-left
                cv2.circle(bbox_image, (int(x2), int(y2)), 5, (255, 0, 0), -1)  # Bottom-right
                
                # Add text
                text = f'Pokemon Card ({confidence:.1%})'
                cv2.putText(bbox_image, text, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                if display:
                    # Display
                    cv2.imshow('YOLO Card Detection', bbox_image)
                    print("\nPress any key to close the window...")
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
                
                return model, bbox_norm, bbox_image
        
        return model
        
    except Exception as e:
        print(f"Error loading or testing YOLO model: {e}")
        import traceback
        traceback.print_exc()
        return None

def crop_out_card(image_input, bbox_norm, save_path=None, debug=False): #When given an image and bounding box, crops out the card
    try:
        # Load image if it's a path, otherwise use the array directly
        if isinstance(image_input, str):
            image = cv2.imread(image_input)
        else:
            image = image_input
            
        h, w = image.shape[:2]
        
        # Convert normalized bbox to pixel coordinates
        x1 = int(bbox_norm[0] * w)
        y1 = int(bbox_norm[1] * h)
        x2 = int(bbox_norm[2] * w)
        y2 = int(bbox_norm[3] * h)
        
        # Crop the card region
        card_image = image[y1:y2, x1:x2]
        
        if save_path:
            cv2.imwrite(save_path, card_image)
            print(f"Cropped card image saved to: {save_path}")
            
        if debug:
            cv2.imshow('Cropped Card', card_image)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        
        return card_image
    
    except Exception as e:
        print(f"Error cropping card from image: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_text_from_image(image, debug=False, getmore=False, show_window=True): #uses ocr to extract text from card images
    reader = easyocr.Reader(['en'], gpu=False)
    reader.whitelist = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-"
    
    h, w = image.shape[:2]
    if debug:
        debug_image = image.copy()
        
    results = reader.readtext(image)
    card_info = {
        'name': None,
        'hp': None,
        'card_number': None
    }
    
    # Check if this is an energy card first
    is_energy_card = False
    
    if debug:
        print("OCR DETECTED TEXT:")
    
    # Track potential name candidates for debugging
    name_candidates = []
    hp_candidates = []
    
    for detection in results:
        bbox, text, confidence = detection
        
        top_left = tuple(map(int, bbox[0]))
        bottom_right = tuple(map(int, bbox[2]))
        y_position = (top_left[1] + bottom_right[1]) / 2 / h  # Normalized Y position
        x_position = (top_left[0] + bottom_right[0]) / 2 / w  # Normalized X position

        if debug:
            print(f"Text: '{text}' | Confidence: {confidence:.2f} | Y-pos: {y_position:.2f} | X-pos: {x_position:.2f}")
            cv2.rectangle(debug_image, top_left, bottom_right, (0, 255, 0), 2)
            cv2.putText(debug_image, text, (top_left[0], top_left[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        # Check for "ENERGY" text only in top 20%
        potential_energy_matches = ["ENERGY", "ENFRGY", "ENERBY", "ENERG", "ENCRGY", "ENERCY"]
        if y_position < 0.20:
            if any(match in text.upper() for match in potential_energy_matches):
                is_energy_card = True
                card_info['name'] = 'Energy'
        
        # Track potential names (top 25% of card)
        if y_position < 0.25 and confidence > 0.7:
            name_candidates.append((text, confidence, y_position, x_position))
            
        if y_position < 0.25 and confidence > 0.7 and x_position > 0.6:
            hp_candidates.append((text, confidence, y_position, x_position))
        
        # Only process HP and card number if NOT an energy card
        if not is_energy_card:
            
            if getmore: #idk why I coded this, only really need the name and the clip model does everything else 
                hp_match = re.search(r'HP\s*(\d+)|(\d+)\s*HP', text, re.IGNORECASE)
                if hp_match and y_position < 0.3 and x_position > 0.5:
                    hp_value = hp_match.group(1) or hp_match.group(2)
                    if card_info['hp'] is None or confidence > 0.5:
                        card_info['hp'] = int(hp_value)
                
                if text.strip().upper() == "HP" and y_position < 0.3 and x_position > 0.5:
                    for other_detection in results:
                        other_bbox, other_text, other_conf = other_detection
                        other_top_left = tuple(map(int, other_bbox[0]))
                        if abs(other_top_left[1] - top_left[1]) < 100:
                            num_match = re.match(r'^\d+$', other_text.strip())
                            if num_match and card_info['hp'] is None:
                                card_info['hp'] = int(other_text.strip())

                if card_info['hp'] is None or confidence > 0.5:
                    if y_position < 0.3 and x_position > 0.5:
                        if text.strip().isdigit():
                            card_info['hp'] = int(text.strip())
                        else:
                            num_match = re.match(r'^\d+$', text.strip())
                            if num_match and card_info['hp'] < int(num_match.group().strip()):
                                card_info['hp'] = int(num_match.group().strip())

                card_num_match = re.search(r'(\d+)\s*/\s*(\d+)', text)
                if card_num_match and y_position > 0.7 and x_position > 0.5:
                    numerator = card_num_match.group(1)
                    denominator = card_num_match.group(2)
                    card_info['card_number'] = f"{numerator}/{denominator}"
            
            # Extract Pokemon Name
            if y_position < 0.2 and x_position < 0.7 and confidence > 0.8:
                text_lower = text.lower()
                excluded_phrases = ['evolves', 'put', 'stage', 'on the', 'from', 'card', 'length', 'weight', 'trainer', 'Supporter', 'Item', 'Tool', 'Ability']
                excluded_words = ['basic', 'stage', 'hp']

                is_excluded = any(phrase in text_lower for phrase in excluded_phrases)
                is_excluded_word = text_lower in excluded_words
                
                has_hp = re.search(r'HP', text, re.IGNORECASE)
                
                word_count = len(text.split())
                
                if not is_excluded and not is_excluded_word and not has_hp and 1 <= word_count <= 3:
                    is_capitalized = text[0].isupper() if text else False
                    if card_info['name'] is None:
                        card_info['name'] = text.strip()
                    elif is_capitalized and not (card_info['name'][0].isupper() if card_info['name'] else False):
                        card_info['name'] = text.strip()
                    elif word_count < len(card_info['name'].split()) and is_capitalized:
                        card_info['name'] = text.strip()
                        
            if card_info['name'] is None and y_position < 0.25 and confidence > 0.7:
                text_clean = text.strip()
                if (text_clean[0].isupper() if text_clean else False) and len(text_clean.split()) == 1:
                    excluded_words = ['STAGE', 'BASIC', 'HP', 'CARD', 'EVOLVES', 'PUT', 'TRAINER']
                    if text_clean.upper() not in excluded_words:
                        card_info['name'] = text_clean
    
    if debug:
        print("NAME CANDIDATES (top 25% of card):")
        for text, conf, y_pos, x_pos in name_candidates:
            print(f"  '{text}' | Conf: {conf:.2f} | Y: {y_pos:.2f} | X: {x_pos:.2f}")
        
        print("\nEXTRACTED CARD INFO:")
        print(f"Name: {card_info['name']}")
        print(f"HP: {card_info['hp']}")
        print(f"Card Number: {card_info['card_number']}")
        if is_energy_card:
            print("Card Type: ENERGY CARD")
        
        # Only show window if show_window is True
        if show_window:
            cv2.imshow('OCR Detection Results', debug_image)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        
        return card_info, debug_image
    
    return card_info

def initialize_clip_matcher(): #Lazy initialize CLIP, FAISS and mappings. Force CPU and disable SSL checks cause it throws fits at me.
    global _clip_model, _clip_preprocess, _faiss_index, _faiss_image_paths

    if _clip_model is not None:
        return True

    # Paths to index/map built earlier
    project_root = os.path.join(os.path.dirname(__file__), '..')
    index_path = os.path.join(project_root, 'Training', 'training_card_identifier', 'clip_card_index.faiss')
    map_path = os.path.join(project_root, 'Training', 'training_card_identifier', 'clip_card_index_map.pkl')

    # Quick existence checks
    if not os.path.exists(index_path) or not os.path.exists(map_path):
        print(f"CLIP/FAISS index or map not found. Expected at:\n  {index_path}\n  {map_path}")
        return False

    # Some hacky force fixes
    os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
    try:
        ssl._create_default_https_context = ssl._create_unverified_context
    except Exception:
        pass

    # Import torch/clip/faiss lazily
    try:
        # Force CPU to avoid MPS cause it causes issues
        torch.set_default_device('cpu')
        torch_device = 'cpu'

        import clip
        import faiss
        import pickle

        # Load CLIP model (force jit=False)
        try:
            cache_model = os.path.expanduser('~/.cache/clip/ViT-B-32.pt')
            if os.path.exists(cache_model):
                print(f"Using cached CLIP model: {cache_model}")
            else:
                print(f"CLIP model not cached - will download 338MB (may cause OOM on 512MB instances)")
            _clip_model, _clip_preprocess = clip.load('ViT-B/32', device=torch_device, jit=False, download_root=os.path.expanduser('~/.cache/clip'))
        except Exception as e:
            print(f"Error loading CLIP model (likely OOM): {e}")
            raise

        # Load FAISS index and mapping
        _faiss_index = faiss.read_index(index_path)
        with open(map_path, 'rb') as f:
            _faiss_image_paths = pickle.load(f)

        print(f"CLIP + FAISS initialized: indexed {_faiss_index.ntotal} cards")
        return True

    except Exception as e:
        print(f"Failed to initialize CLIP matcher: {e}")
        return False


def find_matches_with_clip(cropped_image, top_k=5): #Return top_k matches (list of dict) for a cropped card image (numpy BGR array).
    if not initialize_clip_matcher():
        return None
    
    try:
        img_rgb = cv2.cvtColor(cropped_image, cv2.COLOR_BGR2RGB)
        pil_img = PILImage.fromarray(img_rgb)
        input_tensor = _clip_preprocess(pil_img).unsqueeze(0).to('cpu')
    except Exception as e:
        print(f"Failed to preprocess image for CLIP: {e}")
        return None

    with torch.no_grad():
        emb = _clip_model.encode_image(input_tensor)
        emb = emb / emb.norm(dim=-1, keepdim=True)
        emb_np = emb.cpu().numpy().astype('float32')

    # Search FAISS
    D, I = _faiss_index.search(emb_np, top_k)

    # Get the current project root to fix image paths
    project_root = os.path.join(os.path.dirname(__file__), '..')
    new_image_base = os.path.join(project_root, 'Image_detection', 'reference_images', 'EverySinglePokemonCard')
    
    results = []
    for rank, (score, idx) in enumerate(zip(D[0], I[0]), start=1):
        old_path = _faiss_image_paths[idx]
        name = os.path.basename(old_path)
        
        # Fix the path to point to the new location
        new_path = os.path.join(new_image_base, name)
        
        # Fallback to old path if new path doesn't exist (shouldn't happen but just in case)
        if not os.path.exists(new_path) and os.path.exists(old_path):
            new_path = old_path
        
        results.append({'rank': rank, 'card_name': name, 'card_path': new_path, 'similarity': float(score)})

    return results

def get_best_matched_clip(cropped_image, top_k=5, show_image=False, ocr_name=None): #Find best matches for cropped_image and optionally display the top result using OpenCV.
    matches = find_matches_with_clip(cropped_image, top_k=top_k)
    if not matches:
        print("No matches found or CLIP matcher failed to initialize.")
        return None, None

    print("\nTop matches (CLIP similarity scores):")
    for m in matches:
        print(f"Rank {m['rank']}: {m['card_name']} — similarity={m['similarity']:.4f}")
        
    # Sanity check: prefer match where OCR name appears in filename
    best = matches[0]  # default to highest similarity
    
    if ocr_name:
                
        def normalize_text(text): #Remove accents and convert to lowercase for comparison.
            # Normalize unicode (NFD = decomposed form, then filter out combining marks)
            nfd = unicodedata.normalize('NFD', text)
            without_accents = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
            return without_accents.lower()
        
        ocr_normalized = normalize_text(ocr_name)
        ocr_words = ocr_normalized.split(" ")
        print(f"\nSanity check: looking for OCR name '{ocr_name}' in filenames...")
        
        found_match = False
        for m in matches:
            filename_normalized = normalize_text(m['card_name'])
            
            # Check if all words from OCR name appear in filename
            all_words_found = all(word in filename_normalized for word in ocr_words)
            
            if all_words_found:
                print(f"Match found: '{ocr_name}' in '{m['card_name']}'")
                best = m
                found_match = True
                break
        
        if not found_match:
            # Check only the top 1000 matches for any word match (looser)
            matches = find_matches_with_clip(cropped_image, top_k=1000)
            print(f"Scanning {len(matches)} matches for OCR name '{ocr_name}' (looser match)...")
            for m in matches:
                filename_normalized = normalize_text(m['card_name'])
                if any(word and word in filename_normalized for word in ocr_words):
                    print(f"Looser match found in top-{len(matches)}: '{ocr_name}' in '{m['card_name']}'")
                    best = m
                    found_match = True
                    break
            if not found_match:
                print(f"WARNING: OCR name '{ocr_name}' not found in top-{len(matches)} filenames, using highest similarity match.")
   
    return best, matches

def main(): #Main loop was being run when testing this file solo
    print("Starting Pokemon Card Scanner (YOLO)")
    print("\nCamera mode:")
    print("Press SPACE to capture a card, ESC to exit")

    captured_frame = take_picture()
    
    # If an image was captured, convert to BGR format for OpenCV
    if captured_frame is not None:
        captured_frame = cv2.cvtColor(captured_frame, cv2.COLOR_RGB2BGR)

    cv2.imshow("Captured Frame", captured_frame)
    cv2.waitKey(1)
    cv2.destroyAllWindows()

    if captured_frame is None:
        print("No image captured. Exiting.")
        return
    
    print(f"Processing captured frame...")

    # Detect card in the captured frame
    result = getbounding(captured_frame, display=True)

    if result and isinstance(result, tuple):
        model, bboxes = result
        if bboxes is not None:
            print(f"1 card detected at [{bboxes[0]:.3f}, {bboxes[1]:.3f}, {bboxes[2]:.3f}, {bboxes[3]:.3f}]")
        else:
            print(f"No cards detected")
            return
    else:
        print(f"Detection failed")
        return
    
    # Crop the card from the frame (optionally save for debugging)
    cropped_card = crop_out_card(captured_frame, bboxes, save_path=None, debug=True)  # Set to None to not save

    if cropped_card is not None:
        print(f"Cropped card image created successfully.")
    else:
        print(f"Failed to create cropped card image.")
    
    print("\nExtracting text from cropped card image...")
    card_info = get_text_from_image(cropped_card, debug=True)
    
    # Use CLIP+FAISS to find visually similar card variants
    print("\nRunning visual search (CLIP + FAISS)...")
    detected_name = card_info.get('name')
    best, matches = get_best_matched_clip(cropped_card, top_k=5, show_image=True, ocr_name=detected_name)
    if best:
        print(f"Best visual match: {best['card_name']} (similarity={best['similarity']:.4f})")
    else:
        print("No visual match found.")

    if not matches:
        print("No matches available.")
    else:
        idx = 0
        max_matches = len(matches)
        while idx < max_matches:
            m = matches[idx]
            print(f"\nShowing match {idx+1}/{max_matches}: {m['card_name']} (similarity={m['similarity']:.4f})")
            best_path = m['card_path'] #NOTETOSELF PATHS ONLY EXISTED BEFORE WHEN TRAINING, NOW JUST CHECK WITH THE DATABASE (THO I DON'T EVEN NEED TO RUN FILE AGAIN)
            if os.path.exists(best_path):
                img = cv2.imread(best_path)
                if img is not None:
                    window_name = f'CLIP Match {idx+1}/{max_matches}'
                    cv2.imshow(window_name, img)
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
                else:
                    print(f"Failed to read image at {best_path}")
            else:
                print(f"Image path does not exist: {best_path}")

            resp = input("Is this the card? [Y]es / [N]o / [Q]uit: ").strip().lower()
            if resp == 'y':
                print("Great! Card identification complete.")
                best = m
                break
            elif resp == 'q':
                print("Exiting without confirmation.")
                break
            elif resp == 'n':
                idx += 1
                continue
            else:
                print("Invalid input. Please enter Y, N, or Q.")
                # Re-show the same match on invalid input
        else:
            print("No more matches to show. Exiting.")

    cv2.destroyAllWindows()

    if best:
        filename = best['card_name'] # best is a dict, use dict key access
        parts = filename.split("_")
        
        card_num = parts[-1].replace(".jpg", "")
        set_name = parts[-2]
        
        card_id = f"{set_name}-{card_num}"
        
        jsonpath = "pokemon-tcg-data/cards/en"
        
        totalcarddata = None
        for file in os.listdir(jsonpath):
            if file.endswith(".json"):
                if file.lower().startswith(set_name.lower()):
                    filepath = os.path.join(jsonpath, file)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            json_data = json.load(f)
                        
                        # JSON files contain arrays of cards
                        if isinstance(json_data, list):
                            for card in json_data:
                                if isinstance(card, dict) and card.get('id') == card_id:
                                    totalcarddata = card
                                    break
                        
                        if totalcarddata:
                            break
                    except Exception as e:
                        print(f"Error reading {filepath}: {e}")
                        continue
        
        if totalcarddata is None:
            print(f"\nNo card data found for ID '{card_id}' in {jsonpath}")
        else:
            print(f"\nFound card data for ID '{card_id}'")
            print("FINAL CARD INFORMATION:")
            for key, value in totalcarddata.items():
                print(f"  {key}: {value}")
    else:
        print("\nNo card was identified successfully.")

if __name__ == "__main__":
    main()