import json

def merge():
    try:
        with open('lectionary_2026.json', 'r', encoding='utf-8') as f:
            main_data = json.load(f)
        with open('lectionary_2026_jan.json', 'r', encoding='utf-8') as f:
            jan_data = json.load(f)
            
        jan_map = {d['date']: d for d in jan_data}
        
        updated_count = 0
        for i, d in enumerate(main_data):
            if d['date'] in jan_map:
                main_data[i] = jan_map[d['date']]
                updated_count += 1
                
        with open('lectionary_2026.json', 'w', encoding='utf-8') as f:
            json.dump(main_data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully merged {updated_count} January entries.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    merge()
