#Download cards from ALL EXISTING POKEMON CARDS sets using local a local pokemon-tcg-data repository (which I downloaded so I don't need to wait years to use the API)
#downloaded from https://github.com/PokeAPI/pokemon-tcg-data

import os
import requests
import json
import time

OUTPUT_DIR = "reference_images" # folder to store card images (no longer exist)
CARDS_DIR = "../pokemon-tcg-data/cards/en" # path to the JSON files (no longer exist)

def download_cards_from_set(set_id, output_dir):# download all cards from a specific set
    
    json_file = os.path.join(CARDS_DIR, f"{set_id}.json")
    
    if not os.path.exists(json_file):
        print(f"ERROR: {json_file} not found!")
        return {'downloaded': 0, 'skipped': 0, 'errors': 0}
    
    print(f"Reading card data from {set_id}.json")
    
    with open(json_file, 'r') as f:
        cards = json.load(f)
    
    print(f"Found {len(cards)} cards in {set_id}")
    
    total_downloaded = 0
    total_skipped = 0
    total_errors = 0
    
    for i, card in enumerate(cards, 1):
        try:
            card_name = card['name'].replace(' ', '_').replace('/', '-').replace(':', '').replace('?', '').replace("'", '')
            card_number = card.get('number', str(i))
            
            image_url = card['images'].get('large') or card['images'].get('small')
            
            if not image_url:
                print(f"[{i}/{len(cards)}] {card_name}: NO IMAGE URL CRASH OUT")
                total_errors += 1
                continue
            
            # Create filename
            filename = f"{card_name}_{set_id}_{card_number}.jpg"
            filepath = os.path.join(output_dir, filename)
            
            # Skip if exists
            if os.path.exists(filepath):
                print(f"[{i}/{len(cards)}] {card_name}: SKIP (exists)")
                total_skipped += 1
                continue
            
            # Download image
            print(f"[{i}/{len(cards)}] {card_name}...", end=' ', flush=True)
            
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            print(f"Done")
            total_downloaded += 1
            
            time.sleep(0.1)
            
        except Exception as e:
            print(f"ERROR: {str(e)[:50]}")
            total_errors += 1
            time.sleep(0.5)
    
    print(f"\n{set_id}: Downloaded={total_downloaded}, Skipped={total_skipped}, Errors={total_errors}")
    
    return {
        'downloaded': total_downloaded,
        'skipped': total_skipped,
        'errors': total_errors
    }

def main():
    print(f"\nImages will be saved to '{OUTPUT_DIR}' folder.")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Get all JSON files in the cards directory
    json_files = [f for f in os.listdir(CARDS_DIR) if f.endswith('.json')]
    json_files.sort()
    
    print(f"\nFound {len(json_files)} sets to download")
  
    overall_downloaded = 0
    overall_skipped = 0
    overall_errors = 0
    
    for i, json_file in enumerate(json_files, 1):
        set_id = json_file.replace('.json', '')
        print(f"\n{'='*60}")
        print(f"SET {i}/{len(json_files)}: {set_id.upper()}")
        print(f"{'='*60}")
        
        stats = download_cards_from_set(set_id, OUTPUT_DIR)
        overall_downloaded += stats['downloaded']
        overall_skipped += stats['skipped']
        overall_errors += stats['errors']
    

    print("ALL SETS DOWNLOAD COMPLETE")
    print(f"Total cards downloaded: {overall_downloaded}")
    print(f"Total cards skipped: {overall_skipped}")
    print(f"Total errors: {overall_errors}")
    print(f"Total cards in collection: {overall_downloaded + overall_skipped}")
    print(f"Saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
