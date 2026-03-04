const CONFIG = {
    password: '1212',
    storageKey: 'lectionary_auth'
};

let lectionaryData = [];
let bibleTextData = {};
let currentYear = 2026;
let currentMonth = 0; // 0-indexed
let selectedDate = new Date();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const calendarGrid = document.getElementById('calendar-grid');
const monthDisplay = document.getElementById('current-month-display');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-button');
const bibleCardsContainer = document.getElementById('bible-cards-container');
const selectedDateDisplay = document.getElementById('selected-date-display');

// Init
async function init() {
    checkAuth();
    await loadData();
    setupEventListeners();
    renderCalendar();
    showDateContent(selectedDate);
}

function checkAuth() {
    const isAuth = localStorage.getItem(CONFIG.storageKey) === 'true';
    if (isAuth) {
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
    }
}

async function loadData() {
    try {
        const [lecRes, bibRes] = await Promise.all([
            fetch('lectionary_2026.json'),
            fetch('bible_text_2026.json')
        ]);
        if (!lecRes.ok || !bibRes.ok) throw new Error('파일을 찾을 수 없습니다.');
        lectionaryData = await lecRes.json();
        bibleTextData = await bibRes.json();
    } catch (error) {
        console.error('Data loading failed:', error);
        showLoadingError();
    }
}

function showLoadingError() {
    bibleCardsContainer.innerHTML = `
        <div class="error-msg">
            <strong>⚠️ 데이터를 불러올 수 없습니다.</strong><br>
            브라우저 보안 정책(CORS)으로 인해 로컬 파일 시스템에서는 파일 로드가 제한될 수 있습니다.<br>
            - VS Code 'Live Server'로 실행하거나<br>
            - GitHub Pages에 올려서 확인해 주세요.
        </div>
    `;
}

function setupEventListeners() {
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === CONFIG.password) {
            localStorage.setItem(CONFIG.storageKey, 'true');
            authScreen.classList.add('hidden');
            mainScreen.classList.remove('hidden');
        } else {
            alert('비밀번호가 올바르지 않습니다.');
        }
    });

    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    todayBtn.addEventListener('click', goToToday);
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

function goToToday() {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDate = today;
    renderCalendar();
    showDateContent(today);
}

function renderCalendar() {
    monthDisplay.innerText = `${currentYear}년 ${currentMonth + 1}월`;

    const dateCells = calendarGrid.querySelectorAll('.date-cell');
    dateCells.forEach(cell => cell.remove());

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'date-cell empty';
        calendarGrid.appendChild(emptyCell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayData = lectionaryData.find(item => item.date === dateStr);

        const cell = document.createElement('div');
        cell.className = 'date-cell';
        if (isToday(dateObj)) cell.classList.add('today');
        if (isSelected(dateObj)) cell.classList.add('selected');

        cell.innerText = d;

        if (dayData && dayData.liturgicalColor) {
            const dot = document.createElement('div');
            dot.className = `liturgical-dot color-${dayData.liturgicalColor}`;
            cell.appendChild(dot);
        }

        cell.addEventListener('click', () => {
            selectedDate = dateObj;
            renderCalendar();
            showDateContent(dateObj);
        });

        calendarGrid.appendChild(cell);
    }
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function isSelected(date) {
    return date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
}

function showDateContent(date) {
    const dateStr = date.toISOString().split('T')[0];
    const dayData = lectionaryData.find(item => item.date === dateStr);

    selectedDateDisplay.querySelector('h3').innerText = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${getDayName(date)})`;
    selectedDateDisplay.querySelector('.season-info').innerText = dayData ? dayData.season : '';

    bibleCardsContainer.innerHTML = '';

    if (!dayData) {
        bibleCardsContainer.innerHTML = '<p>데이터가 없습니다.</p>';
        return;
    }

    let items = dayData.items.map(it => it.ref || it);
    let itemsToShow = [...items];
    const dayOfWeek = date.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
        const prevSun = getPreviousSunday(date);
        const prevSunData = lectionaryData.find(item => item.date === prevSun);
        if (prevSunData) {
            const gospel = prevSunData.items[prevSunData.items.length - 1];
            itemsToShow = [gospel.ref || gospel, ...itemsToShow];
        }
    } else if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const nextSun = getNextSunday(date);
        const nextSunData = lectionaryData.find(item => item.date === nextSun);
        if (nextSunData) {
            const gospel = nextSunData.items[nextSunData.items.length - 1];
            itemsToShow = [gospel.ref || gospel, ...itemsToShow];
        }
    }

    itemsToShow.forEach(ref => {
        const card = createBibleCard(ref);
        bibleCardsContainer.appendChild(card);
    });
}

function createBibleCard(ref) {
    const card = document.createElement('div');
    card.className = 'bible-card';

    const title = document.createElement('h4');
    title.innerText = ref;
    card.appendChild(title);

    const textDiv = document.createElement('div');
    textDiv.className = 'bible-text';

    textDiv.innerText = getBibleText(ref);
    card.appendChild(textDiv);

    return card;
}

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
};

function getBibleText(ref) {
    if (bibleTextData[ref]) return bibleTextData[ref].text;

    // Try normalized match
    const normalized = normalizeRef(ref);
    if (bibleTextData[normalized]) return bibleTextData[normalized].text;

    return "본문 데이터가 없습니다. (수집 스크립트 실행 확인 필요)";
}

function normalizeRef(ref) {
    let r = ref.trim().replace(/\s+/g, ' ');
    // Handle Psalm special case
    if (r.endsWith('편')) {
        r = r.replace('편', '').trim();
    }

    // Replace abbreviation with full name
    const parts = r.split(' ');
    if (parts.length >= 1) {
        const book = parts[0];
        const fullBook = BOOK_ALIASES[book] || book;
        parts[0] = fullBook;
        return parts.join(' ');
    }
    return r;
}

function getDayName(date) {
    return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}

function getPreviousSunday(d) {
    const date = new Date(d);
    date.setDate(date.getDate() - date.getDay());
    return date.toISOString().split('T')[0];
}

function getNextSunday(d) {
    const date = new Date(d);
    date.setDate(date.getDate() + (7 - date.getDay()) % 7);
    if (date.getTime() === d.getTime()) date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
}

init();
