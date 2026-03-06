import json

def check_missing():
    try:
        with open('lectionary_2026.json', 'r', encoding='utf-8') as f:
            lec_data = json.load(f)
        with open('bible_text_2026.json', 'r', encoding='utf-8') as f:
            bib_data = json.load(f)
            
        missing = []
        for d in lec_data:
            for it in d['items']:
                ref = it if isinstance(it, str) else it.get('ref', '')
                if ref and ref not in bib_data:
                    # Try normalized key
                    # (Simplified normalization for script)
                    missing.append(ref)
                    
        if missing:
            print("Missing references:")
            for m in list(set(missing))[:30]:
                print(f"- {m}")
        else:
            print("No missing references found!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_missing()
