#Imma crash out, upload stopped halfway so I gotta use this now, curse this wifi
import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("supabaseurl")
SUPABASE_KEY = os.getenv("servicerolekey")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Fix the env boy")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Files that were already completed before the interruption
COMPLETED_FILES = [
    "swsh8.json", "bw10.json", "bw1.json", "hgss4.json", "ex11.json", "dv1.json",
    "sv4.json", "sm4.json", "pop3.json", "swsh4.json", "xy3.json", "base4.json",
    "swsh12pt5gg.json", "col1.json", "sv4pt5.json", "sv8.json", "ex6.json", "neo3.json",
    "sm8.json", "sm9.json", "ex7.json", "neo2.json", "ecard1.json", "sv9.json",
    "base5.json", "swsh5.json", "xy2.json", "dp1.json", "swsh11tg.json", "pop2.json",
    "xyp.json", "sm5.json", "sv5.json", "ex10.json", "swsh35.json", "sm12.json",
    "tk2a.json", "mcd11.json", "swsh12pt5.json", "bw11.json", "swsh9.json", "me1.json",
    "svp.json", "dp6.json", "smp.json", "swsh2.json", "xy5.json", "xy12.json",
    "swsh12.json", "base2.json", "swsh45.json", "gym2.json", "sm35.json", "sve.json",
    "pop9.json", "swsh9tg.json", "xy9.json", "mcd16.json", "pl1.json", "hgss2.json",
    "bw7.json", "sv10.json", "swsh45sv.json", "basep.json", "sv2.json", "sm2.json",
    "swshp.json", "pop5.json", "pop4.json", "sm3.json", "sv3.json", "ex16.json",
    "zsv10pt5.json", "hgss3.json", "bw6.json", "bp.json", "mcd17.json", "fut20.json",
    "xy8.json", "mcd21.json", "sm75.json", "pop8.json", "tk1a.json", "neo4.json",
    "ex1.json", "pgo.json", "base3.json", "swsh3.json", "xy4.json", "dp7.json",
    "ru1.json", "sv6pt5.json", "mcd22.json", "ex2.json", "tk1b.json", "swsh12tg.json",
    "sv3pt5.json", "bw9.json", "swsh10.json", "mcd18.json", "xy7.json", "xy10.json",
    "hsp.json", "dp4.json", "pop7.json", "det1.json", "ex15.json", "si1.json",
    "np.json", "bw5.json", "pl3.json", "mcd14.json", "mcd15.json", "pl2.json", "base1.json",
    "base6.json"
]

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

    # Delete existing related data to avoid duplicates on re-run
    try:
        supabase.table("abilities").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("attacks").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("weaknesses").delete().eq("card_id", card_data["id"]).execute()
        supabase.table("resistances").delete().eq("card_id", card_data["id"]).execute()
    except Exception:
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
    failed_cards = []
    
    all_files = sorted([f for f in os.listdir(DATA_FOLDER) if f.endswith(".json")])
    
    for filename in all_files: #loopy through all files
        if filename in COMPLETED_FILES: #already uploaded these
            continue
            
        path = os.path.join(DATA_FOLDER, filename)
        set_name = filename.replace(".json", "")
        
        with open(path, "r") as f:
            cards_array = json.load(f)
        
        if not isinstance(cards_array, list):
            print(f"Skipping {filename} - not an array")
            continue
        
        print(f"Processing {filename} ({len(cards_array)} cards)")
        
        for card_data in cards_array:
            try:
                insert_card(card_data, set_name)
                total_cards += 1
            except Exception as e:
                error_msg = str(e)
                card_id = card_data.get('id', 'unknown')
                print(f"Failed to upload card {card_id}: {error_msg}")
                failed_cards.append({
                    "file": filename,
                    "card_id": card_id,
                    "error": error_msg
                })
        
        total_files += 1
        print(f"Completed {filename}")
    
    print("\nFINALLY DONE!")
    print(f"Files processed: {total_files}")
    print(f"Cards uploaded: {total_cards}")
    print(f"Failed cards: {len(failed_cards)}")

    if failed_cards:
        with open("/Users/shrey/Downloads/Coding/Pokemon_Webapp/Database/failed_cards.json", "w") as f:
            json.dump(failed_cards, f, indent=2)
except Exception as e:
    print(f"Failed to connect to Supabase: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
