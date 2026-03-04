/**
 * build_bible_data.js
 * - Reads lectionary_2026.json
 * - Collects all scripture refs
 * - Fetches Saebeonyeok texts from holybible.or.kr
 * - Writes bible_text_2026.json for fully offline use
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const INPUT_LECTIONARY = path.resolve(process.cwd(), "lectionary_2026.json");
const OUTPUT_BIBLE_JSON = path.resolve(process.cwd(), "bible_text_2026.json");

const HOLY_BASE = "http://www.holybible.or.kr";
const VERSION_PATH = "/B_SAENEW/cgi/bibleftxt.php";
const VR = "SAENEW";

const MIN_DELAY_MS = 200;
const MAX_DELAY_MS = 500;
const MAX_RETRIES = 2;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function politeDelay() {
  await sleep(randInt(MIN_DELAY_MS, MAX_DELAY_MS));
}

const BOOK_VL = {
  "창세기": 1, "출애굽기": 2, "레위기": 3, "민수기": 4, "신명기": 5,
  "여호수아": 6, "사사기": 7, "룻기": 8, "사무엘상": 9, "사무엘하": 10,
  "열왕기상": 11, "열왕기하": 12, "역대상": 13, "역대하": 14, "에스라": 15,
  "느헤미야": 16, "에스더": 17, "욥기": 18, "시편": 19, "잠언": 20,
  "전도서": 21, "아가": 22, "이사야": 23, "예레미야": 24, "예레미야애가": 25,
  "에스겔": 26, "다니엘": 27, "호세아": 28, "요엘": 29, "아모스": 30,
  "오바댜": 31, "요나": 32, "미가": 33, "나훔": 34, "하박국": 35,
  "스바냐": 36, "학개": 37, "스가랴": 38, "말라기": 39,
  "마태복음": 40, "마가복음": 41, "누가복음": 42, "요한복음": 43,
  "사도행전": 44, "로마서": 45, "고린도전서": 46, "고린도후서": 47,
  "갈라디아서": 48, "에베소서": 49, "빌립보서": 50, "골로새서": 51,
  "데살로니가전서": 52, "데살로니가후서": 53, "디모데전서": 54, "디모데후서": 55,
  "디도서": 56, "빌레몬서": 57, "히브리서": 58, "야고보서": 59,
  "베드로전서": 60, "베드로후서": 61, "요한일서": 62, "요한이서": 63,
  "요한삼서": 64, "유다서": 65, "요한계시록": 66,
  "토빗기": 67, "유딧기": 68, "지혜서": 69, "집회서": 70, "바룩서": 71,
  "마카베오상": 74, "마카베오하": 75,
};

const BOOK_ALIASES = {
  "창": "창세기", "출": "출애굽기", "레": "레위기", "민": "민수기", "신": "신명기",
  "수": "여호수아", "삿": "사사기", "룻": "룻기",
  "삼상": "사무엘상", "삼하": "사무엘하",
  "왕상": "열왕기상", "왕하": "열왕기하",
  "대상": "역대상", "대하": "역대하",
  "스": "에스라", "느": "느헤미야", "에": "에스더",
  "욥": "욥기", "시": "시편", "잠": "잠언", "전": "전도서", "아": "아가",
  "사": "이사야", "렘": "예레미야", "애": "예레미야애가", "겔": "에스겔", "단": "다니엘",
  "호": "호세아", "욜": "요엘", "암": "아모스", "옵": "오바댜", "욘": "요나",
  "미": "미가", "나": "나훔", "합": "하박국", "습": "스바냐", "학": "학개", "슥": "스가랴", "말": "말라기",
  "마": "마태복음", "막": "마가복음", "눅": "누가복음", "요": "요한복음",
  "행": "사도행전", "롬": "로마서",
  "고전": "고린도전서", "고후": "고린도후서",
  "갈": "갈라디아서", "엡": "에베소서", "빌": "빌립보서", "골": "골로새서",
  "살전": "데살로니가전서", "살후": "데살로니가후서",
  "딤전": "디모데전서", "딤후": "디모데후서",
  "딛": "디도서", "몬": "빌레몬서",
  "히": "히브리서", "약": "야고보서",
  "벧전": "베드로전서", "벧후": "베드로후서",
  "요일": "요한일서", "요이": "요한이서", "요삼": "요한삼서",
  "유": "유다서", "계": "요한계시록",
  "지혜": "지혜서", "집회": "집회서", "토빗": "토빗기", "유딧": "유딧기", "바룩": "바룩서",
  "마카상": "마카베오상", "마카하": "마카베오하",
};

function stripVerseSuffixAB(s) {
  return s.replace(/(\d+)\s*[ab]\b/gi, "$1");
}

function normalizeSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

function resolveBookName(bookRaw) {
  const b = bookRaw.trim();
  return BOOK_ALIASES[b] ?? b;
}

function parseRef(ref) {
  let r = normalizeSpaces(stripVerseSuffixAB(ref));
  r = r.replace(/[()［］\[\],]/g, " ").replace(/\s+/g, " ").trim();
  const psalmMatch = r.match(/^(.+?)\s+(\d+)\s*편$/);
  if (psalmMatch) return { book: resolveBookName(psalmMatch[1]), chapter: parseInt(psalmMatch[2], 10), verseStart: null, verseEnd: null, crossChapter: false, raw: ref };
  const crossMatch = r.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*-\s*(\d+)\s*:\s*(\d+)/);
  if (crossMatch) return { book: resolveBookName(crossMatch[1]), chapter: parseInt(crossMatch[2], 10), verseStart: parseInt(crossMatch[3], 10), crossChapter: { chapter2: parseInt(crossMatch[4], 10), verseEnd2: parseInt(crossMatch[5], 10) }, raw: ref };
  const rangeMatch = r.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) return { book: resolveBookName(rangeMatch[1]), chapter: parseInt(rangeMatch[2], 10), verseStart: parseInt(rangeMatch[3], 10), verseEnd: parseInt(rangeMatch[4], 10), crossChapter: false, raw: ref };
  const singleMatch = r.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)/);
  if (singleMatch) return { book: resolveBookName(singleMatch[1]), chapter: parseInt(singleMatch[2], 10), verseStart: parseInt(singleMatch[3], 10), verseEnd: parseInt(singleMatch[3], 10), crossChapter: false, raw: ref };
  const chapterMatch = r.match(/^(.+?)\s+(\d+)/);
  if (chapterMatch) return { book: resolveBookName(chapterMatch[1]), chapter: parseInt(chapterMatch[2], 10), verseStart: null, verseEnd: null, crossChapter: false, raw: ref };
  throw new Error(`Unrecognized: "${ref}"`);
}

function buildUrl(vl, cn, cv) {
  const u = new URL(HOLY_BASE + VERSION_PATH);
  u.searchParams.set("VR", VR);
  u.searchParams.set("VL", String(vl));
  u.searchParams.set("CN", String(cn));
  u.searchParams.set("CV", String(cv));
  return u.toString();
}

async function fetchChapter(book, chapter) {
  const fullBook = resolveBookName(book);
  const vl = BOOK_VL[fullBook];
  if (!vl) throw new Error(`Unknown book "${book}"`);
  const url = buildUrl(vl, chapter, 99);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "http://www.holybible.or.kr/" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      return new TextDecoder('euc-kr').decode(buffer);
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await politeDelay();
    }
  }
}

async function fetchAndParse(book, chapter, vStart, vEnd) {
  const html = await fetchChapter(book, chapter);
  const verses = new Map();
  const blocks = html.split(/<ol\s+start=/gi);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const startMatch = block.match(/^(\d+)/);
    if (!startMatch) continue;
    let verseNum = parseInt(startMatch[1], 10);
    const fontRegex = /<font class=["']?tk4l["']?>([\s\S]*?)<\/font>/gi;
    let fontMatch;
    while ((fontMatch = fontRegex.exec(block)) !== null) {
      let text = fontMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
      if (text) { verses.set(verseNum, text); verseNum++; }
    }
  }
  const keys = Array.from(verses.keys()).sort((a, b) => a - b);
  if (!keys.length) return "";
  if (vStart == null) return keys.map(k => `${k} ${verses.get(k)}`).join("\n");
  const end = vEnd || keys[keys.length - 1];
  return keys.filter(k => k >= vStart && k <= end).map(k => `${k} ${verses.get(k)}`).join("\n");
}

async function fetchRangeText(p) {
  if (p.crossChapter) {
    const text1 = await fetchAndParse(p.book, p.chapter, p.verseStart, 999);
    await politeDelay();
    const text2 = await fetchAndParse(p.book, p.crossChapter.chapter2, 1, p.crossChapter.verseEnd2);
    return `${text1}\n${text2}`;
  }
  return await fetchAndParse(p.book, p.chapter, p.verseStart, p.verseEnd);
}

async function main() {
  const lectionary = JSON.parse(fs.readFileSync(INPUT_LECTIONARY, "utf-8"));
  let out = {};
  if (fs.existsSync(OUTPUT_BIBLE_JSON)) {
    try { out = JSON.parse(fs.readFileSync(OUTPUT_BIBLE_JSON, "utf-8")); } catch { out = {}; }
  }

  const errors = [];
  const seenStr = new Set();

  for (const day of lectionary) {
    for (const it of day.items) {
      const rawRef = it.ref || it;

      // Split by semicolon OR comma followed by numbers (e.g., "지혜 1:13-15, 2:23-24")
      // We use a regex that looks for comma/semicolon and ensures the next part might be a chapter reference
      const subRefs = rawRef.split(/[;,]/).map(s => s.trim()).filter(Boolean);
      let lastBook = "";
      let lastChapter = "";

      for (let sub of subRefs) {
        // Clean up common chars first for inheritance check
        sub = sub.replace(/[()［］\[\]]/g, "").trim();

        // Case 1: sub is just verses (e.g. "12-19" after "Job 1:1-5")
        if (/^\d/.test(sub) && !sub.includes(':') && !sub.includes(' ') && lastBook && lastChapter) {
          sub = `${lastBook} ${lastChapter}:${sub}`;
        }
        // Case 2: sub starts with digit/chapter but no book (e.g. "2:1-3")
        else if ((/^\d/.test(sub) || !sub.includes(' ')) && lastBook) {
          if (!sub.startsWith(lastBook)) sub = `${lastBook} ${sub}`;
        }

        if (seenStr.has(sub)) continue;
        seenStr.add(sub);

        try {
          const p = parseRef(sub);
          lastBook = p.book; // Update context
          lastChapter = p.chapter;

          const storeKey = p.crossChapter ? `${p.book} ${p.chapter}:${p.verseStart}-${p.crossChapter.chapter2}:${p.crossChapter.verseEnd2}` : (p.verseStart == null ? `${p.book} ${p.chapter}` : `${p.book} ${p.chapter}:${p.verseStart}-${p.verseEnd}`);

          if (out[storeKey] && out[storeKey].text && out[storeKey].text.trim().length > 5) continue;

          console.log(`Fetching: ${storeKey}`);
          const text = await fetchRangeText(p);
          out[storeKey] = { ref: storeKey, text };
          fs.writeFileSync(OUTPUT_BIBLE_JSON, JSON.stringify(out, null, 2), "utf-8");
          await politeDelay();
        } catch (e) {
          console.warn(`Error on ${sub}: ${e.message}`);
          errors.push({ raw: sub, error: e.message });
        }
      }
    }
  }

  if (errors.length > 0) {
    console.log("\n--- 수집 실패 목록 ---");
    const uniqueErrors = [...new Set(errors.map(e => `${e.raw} (${e.error})`))];
    uniqueErrors.forEach(e => console.log(e));
  }
  console.log("\nDone.");
}
main();
