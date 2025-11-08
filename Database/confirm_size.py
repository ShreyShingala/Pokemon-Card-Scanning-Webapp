import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# CONFIRM THAT ALL OF THE CARDS ARE IN THE DATABASE

SUPABASE_URL = os.getenv("supabaseurl")
SUPABASE_KEY = os.getenv("servicerolekey")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("boy fix the env variables")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def insert_card(card_data, setname):
    # Base card
    card_info = {
        "id": card_data["id"],
        "name": card_data["name"],
        "supertype": card_data.get("supertype"),
        "subtypes": card_data.get("subtypes"),
        "level": card_data.get("level"),
        "hp": card_data.get("hp"),
        "types": card_data.get("types"),
        "evolves_from": card_data.get("evolvesFrom"),
        "rarity": card_data.get("rarity"),
        "artist": card_data.get("artist"),
        "flavor_text": card_data.get("flavorText"),
        "retreat_cost": card_data.get("retreatCost"),
        "converted_retreat_cost": card_data.get("convertedRetreatCost"),
        "set_name": setname,
        "number": card_data.get("number"),
        "national_pokedex_numbers": card_data.get("nationalPokedexNumbers"),
        "image_small": card_data.get("images", {}).get("small"),
        "image_large": card_data.get("images", {}).get("large"),
    }

    supabase.table("cards").upsert(card_info).execute()

    # delete the existing data so there are no duplicates
    try:
        supabase.table("abilities").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("attacks").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("weaknesses").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("resistances").delete().eq("card_id", card_data["id"]).execute()
    except Exception:
        print("Issue")
        pass

    # Abilities
    for ability in card_data.get("abilities", []):
        supabase.table("abilities").insert({
            "card_id": card_data["id"],
            "name": ability["name"],
            "text": ability["text"],
            "type": ability.get("type")
        }).execute()

    # Attacks
    for atk in card_data.get("attacks", []):
        supabase.table("attacks").insert({
            "card_id": card_data["id"],
            "name": atk["name"],
            "cost": atk.get("cost"),
            "converted_energy_cost": atk.get("convertedEnergyCost"),
            "damage": atk.get("damage"),
            "description": atk.get("text")
        }).execute()

    # Weaknesses
    for wk in card_data.get("weaknesses", []):
        supabase.table("weaknesses").insert({
            "card_id": card_data["id"],
            "type": wk["type"],
            "value": wk["value"]
        }).execute()

    # Resistances
    for rs in card_data.get("resistances", []):
        supabase.table("resistances").insert({
            "card_id": card_data["id"],
            "type": rs["type"],
            "value": rs["value"]
        }).execute()
        
#Folder no longer exists, but it did at one point, if you wanna run this localy download the following link https://github.com/PokemonTCG/pokemon-tcg-data
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "pokemon-tcg-data", "cards", "en"))

total_local_cards = 0
total_files = 0
set_comparisons = []

try: #cause the github repo had .json files to represent each set
    for filename in sorted(os.listdir(DATA_FOLDER)):
        if filename.endswith(".json"):
            path = os.path.join(DATA_FOLDER, filename)
            set_name = filename.replace(".json", "")
            
            with open(path, "r") as f:
                cards_array = json.load(f)
            
            if not isinstance(cards_array, list):
                continue
            
            local_count = len(cards_array)
            total_local_cards += local_count
            total_files += 1
            
            db_response = supabase.table("cards").select("id", count="exact").eq("set_name", set_name).execute()
            db_count = db_response.count if hasattr(db_response, 'count') else len(db_response.data)
            
            missing_count = local_count - db_count
            
            set_comparisons.append({
                "filename": filename,
                "set_name": set_name,
                "local": local_count,
                "database": db_count,
                "missing": missing_count,
                "cards_array": cards_array if missing_count > 0 else None
            })
            
            if missing_count == 0:
                print(f"YAY {filename:30} | Local: {local_count:4} | DB: {db_count:4} | Missing: 0")
            else:
                print(f"Bruh  {filename:30} | Local: {local_count:4} | DB: {db_count:4} | Missing: {missing_count}")

    response = supabase.table("cards").select("id", count="exact").execute()
    total_db_count = response.count if hasattr(response, 'count') else len(response.data)
 
    print(f"Total JSON files:  {total_files}")
    print(f"Local cards:       {total_local_cards:,}")
    print(f"Database cards:    {total_db_count:,}")
    print(f"Missing cards:     {total_local_cards - total_db_count:,}")
    
    # Upload missing cards
    sets_with_missing = [s for s in set_comparisons if s["missing"] > 0]
    
    if sets_with_missing:
        print(f"Total sets with missing cards: {len(sets_with_missing)}")
        
        total_uploaded = 0
        total_failed = 0
        
        for set_info in sets_with_missing:
            filename = set_info["filename"]
            set_name = set_info["set_name"]
            cards_array = set_info["cards_array"]
            
            print(f"\nProcessing {filename}")
            
            # Get list of card IDs already in database for this set
            db_response = supabase.table("cards").select("id").eq("set_name", set_name).execute()
            existing_ids = {card["id"] for card in db_response.data}
            
            # Upload only missing cards
            for card_data in cards_array:
                card_id = card_data["id"]
                
                if card_id not in existing_ids:
                    try:
                        insert_card(card_data, set_name)
                        print(f"Uploaded {card_id}")
                        total_uploaded += 1
                    except Exception as e:
                        print(f"Failed {card_id}: {e}")
                        total_failed += 1

        print(f"Successfully uploaded: {total_uploaded}")
        print(f"Failed: {total_failed}")
    else:
        print("\nALL CARDS UPLOADED!")

except Exception as e:
    print(f"Failed to query database: {e}")
    import traceback
    traceback.print_exc()
