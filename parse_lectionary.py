import json
import os
import re

# 성경 약칭 및 정규화 맵
BOOK_MAP = {
    "창": "창세기", "출": "출애굽기", "레": "레위기", "민": "민수기", "신": "신명기",
    "수": "여호수아", "삿": "사사기", "룻": "룻기", "삼상": "사무엘상", "삼하": "사무엘하",
    "왕상": "열왕기상", "왕하": "열왕기하", "대상": "역대상", "대하": "역대하",
    "스": "에스라", "느": "느헤미야", "에": "에스더", "욥": "욥기", "시": "시편",
    "잠": "잠언", "전": "전도서", "아": "아가", "사": "이사야", "렘": "예레미야",
    "애": "예레미야애가", "겔": "에스겔", "단": "다니엘", "호": "호세아", "욜": "요엘",
    "암": "아모스", "옵": "오바댜", "욘": "요나", "미": "미가", "나": "나훔",
    "합": "하박국", "습": "스바냐", "학": "학개", "슥": "스가랴", "말": "말라기",
    "마": "마태복음", "막": "마가복음", "눅": "누가복음", "요": "요한복음",
    "행": "사도행전", "롬": "로마서", "고전": "고린도전서", "고후": "고린도후서",
    "갈": "갈라디아서", "엡": "에베소서", "빌": "빌립보서", "골": "골로새서",
    "살전": "데살로니가전서", "살후": "데살로니가후서", "딤전": "디모데전서", "딤후": "디모데후서",
    "딛": "디도서", "몬": "빌레몬서", "히": "히브리서", "약": "야고보서",
    "벧전": "베드로전서", "벧후": "베드로후서", "요일": "요한일서", "요이": "요한이서",
    "요삼": "요한삼서", "유": "유다서", "계": "요한계시록", "지혜": "지혜서"
}

def normalize_ref(ref_str, last_book, last_chapter):
    """
    참조 문자열을 정규화하고 상속 로직을 적용함.
    예: '18-19' -> '시편 72:18-19' (last_book='시편', last_chapter='72' 인 경우)
    """
    s = ref_str.strip()
    # 괄호 제거
    s = re.sub(r'\(.*?\)', '', s).strip()
    if not s: return None, last_book, last_chapter

    # 1. 권명이 있는지 확인
    book_match = re.match(r'^([가-힣]{1,3})\s*', s)
    current_book = last_book
    current_chapter = last_chapter
    
    found_book = False
    if book_match:
        alias = book_match.group(1)
        if alias in BOOK_MAP:
            current_book = BOOK_MAP[alias]
            s = s[len(alias):].strip()
            found_book = True
        elif alias in BOOK_MAP.values(): # 이미 정규화된 경우
            current_book = alias
            s = s[len(alias):].strip()
            found_book = True

    # 2. 장:절 또는 장 형태 파악
    # Case: "72:1-7" or "72"
    parts = s.split(':')
    if len(parts) > 1:
        current_chapter = parts[0].strip()
        rest = parts[1].strip()
        # 시편의 경우 "편" 제거
        current_chapter = current_chapter.replace("편", "").strip()
        normalized = f"{current_book} {current_chapter}:{rest}"
    else:
        # 숫자로 시작하면 장번호이거나 절번호임
        if s and s[0].isdigit():
            # '-'가 있으면 절 범위일 가능성이 높음 (상속 필요)
            # 만약 권명을 새로 찾았다면 이건 장 번호임
            if found_book:
                normalized = f"{current_book} {s}"
                if '-' not in s: # 장 번호인 경우만 업데이트
                    current_chapter = s.replace("편", "").strip()
            else:
                # 권명을 못 찾았는데 숫자로 시작하면 상속
                if current_chapter:
                    normalized = f"{current_book} {current_chapter}:{s}"
                else:
                    normalized = f"{current_book} {s}"
                    current_chapter = s.replace("편", "").strip()
        else:
            # 권명만 있고 숫자 없는 경우 (드묾)
            normalized = f"{current_book} {s}".strip()

    return normalized, current_book, current_chapter

def parse():
    color_map = {
        "흰색": "white", "보라": "purple", "초록": "green", "빨강": "red", "검정": "black",
        "보라/빨강": "purple", "검정/흰색": "black", "흰색/초록": "white", "보라/흰색": "white"
    }

    results = []
    if not os.path.exists('lectionary_raw.txt'):
        print("Error: lectionary_raw.txt not found")
        return

    with open('lectionary_raw.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line: continue
            
        parts = line.split('\t')
        if len(parts) < 5: continue

        date = parts[0]
        weekday = parts[1]
        season = parts[2]
        raw_color = parts[3]
        refs_raw = parts[4]

        color = color_map.get(raw_color, "green")
        
        items = []
        last_book = ""
        last_chapter = ""
        
        # 콤마로 분리하여 각 참조 처리
        sub_refs = [r.strip() for r in refs_raw.split(',') if r.strip()]
        for sub in sub_refs:
            norm, last_book, last_chapter = normalize_ref(sub, last_book, last_chapter)
            if norm:
                items.append({"ref": norm})

        entry = {
            "date": date, "weekday": weekday, "season": season,
            "liturgicalColor": color, "items": items
        }
        results.append(entry)

    # 중복 제거 및 날짜순 정렬
    seen_dates = set()
    final_results = []
    for r in sorted(results, key=lambda x: x['date']):
        if r['date'] not in seen_dates:
            final_results.append(r)
            seen_dates.add(r['date'])

    with open('lectionary_2026.json', 'w', encoding='utf-8') as f:
        json.dump(final_results, f, ensure_ascii=False, indent=2)

    print(f"Successfully parsed {len(final_results)} entries into lectionary_2026.json")

if __name__ == "__main__":
    parse()
