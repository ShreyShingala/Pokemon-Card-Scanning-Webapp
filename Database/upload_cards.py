import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("supabaseurl")
SUPABASE_KEY = os.getenv("servicerolekey")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Boy fix this")
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

    # Delete existing related data to avoid duplicates on re-runs
    try:
        supabase.table("abilities").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("attacks").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("weaknesses").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("resistances").delete().eq("card_id", card_data["id"]).execute()
    except Exception:
        print("issue")
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

try:    
    total_cards = 0
    total_files = 0
    
    for filename in os.listdir(DATA_FOLDER):
        if filename.endswith(".json"):
            path = os.path.join(DATA_FOLDER, filename)
            set_name = filename.replace(".json", "")
            
            with open(path, "r") as f:
                cards_array = json.load(f)
            
            if not isinstance(cards_array, list):
                print(f"Skipping {filename} - not an array")
                continue
            
            print(f"Processing {filename} ({len(cards_array)} cards")
            
            for card_data in cards_array:
                try:
                    insert_card(card_data, set_name)
                    total_cards += 1
                except Exception as e:
                    print(f"Failed to upload card {card_data.get('id', 'unknown')}: {e}")
            
            total_files += 1
            print(f"Completed {filename}")

    print(f"Finally Free!")
    print(f"Files processed: {total_files}")
    print(f"Cards uploaded: {total_cards}")

except Exception as e:
    print(f"Failed to connect {e}")
    import traceback
    traceback.print_exc()
    exit(1)
