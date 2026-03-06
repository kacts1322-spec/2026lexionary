const CONFIG = {
    password: '0000',
    storageKey: 'lectionary_auth'
};

let lectionaryData = [];
let bibleTextData = {};
let currentYear = 2026;
let currentMonth = new Date().getMonth();
let selectedDate = new Date();

if (selectedDate.getFullYear() !== 2026) {
    selectedDate = new Date('2026-01-01');
    currentYear = 2026;
    currentMonth = 0;
}

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

        if (!lecRes.ok) {
            console.error('Lectionary data fetch failed:', lecRes.status, lecRes.statusText);
        }
        if (!bibRes.ok) {
            console.error('Bible text data fetch failed:', bibRes.status, bibRes.statusText);
        }

        if (!lecRes.ok || !bibRes.ok) throw new Error('Data sync required');

        lectionaryData = await lecRes.json();
        bibleTextData = await bibRes.json();
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Data loading failed:', error);
        showLoadingError();
    }
}

function showLoadingError() {
    bibleCardsContainer.innerHTML = `
        <div class="error-msg">
            <strong>✨ 환영합니다!</strong><br>
            데이터를 불러오는 데 문제가 발생했습니다.<br><br>
            <strong>💡 해결 방법:</strong><br>
            1. 네트워크 연결을 확인해 주세요.<br>
            2. 로컬 파일 시스템에서 직접 실행 중이라면 <strong>'Live Server'</strong>를 사용해 주세요.<br>
            3. GitHub Pages나 Vercel에 모든 JSON 파일이 업로드되었는지 확인해 주세요.
        </div>
    `;
}

function setupEventListeners() {
    const handleLogin = () => {
        if (passwordInput.value === CONFIG.password) {
            localStorage.setItem(CONFIG.storageKey, 'true');
            authScreen.classList.add('hidden');
            mainScreen.classList.remove('hidden');
        } else {
            alert('비밀번호가 올바르지 않습니다.');
            passwordInput.value = '';
        }
    };

    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
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
    showDateContent(selectedDate);
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderCalendar() {
    monthDisplay.innerText = `${currentYear}년 ${currentMonth + 1}월`;

    // Clear only date cells
    const oldCells = calendarGrid.querySelectorAll('.date-cell');
    oldCells.forEach(c => c.remove());

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'date-cell empty';
        calendarGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        const dateStr = formatDate(dateObj);
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
            showDateContent(selectedDate);
        });

        calendarGrid.appendChild(cell);
    }
}

function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function isSelected(date) {
    return date.toDateString() === selectedDate.toDateString();
}

function showDateContent(date) {
    const dateStr = formatDate(date);
    const dayData = lectionaryData.find(item => item.date === dateStr);

    selectedDateDisplay.querySelector('h3').innerText = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${getDayName(date)})`;
    selectedDateDisplay.querySelector('.season-info').innerText = dayData ? (dayData.season || '평일') : '평일';

    bibleCardsContainer.innerHTML = '';

    // Logic for related readings (Gospel on weekdays etc.)
    let itemsToShow = dayData && dayData.items ? dayData.items.map(it => it.ref || it) : [];
    const dayOfWeek = date.getDay();

    // Custom logic: Add previous/next Sunday Gospel for context if it's a weekday
    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
        const prevSun = getPreviousSunday(date);
        const prevSunData = lectionaryData.find(item => item.date === prevSun);
        if (prevSunData && prevSunData.items && prevSunData.items.length > 0) {
            const gospel = prevSunData.items[prevSunData.items.length - 1];
            itemsToShow = [gospel.ref || gospel, ...itemsToShow];
        }
    } else if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        const nextSun = getNextSunday(date);
        const nextSunData = lectionaryData.find(item => item.date === nextSun);
        if (nextSunData && nextSunData.items && nextSunData.items.length > 0) {
            const gospel = nextSunData.items[nextSunData.items.length - 1];
            itemsToShow = [gospel.ref || gospel, ...itemsToShow];
        }
    }

    if (itemsToShow.length === 0) {
        bibleCardsContainer.innerHTML = '<p style="color: #64748b; text-align: center; padding: 2rem;">선택한 날짜의 성서정과 데이터가 없습니다.</p>';
        return;
    }

    itemsToShow.forEach(ref => {
        bibleCardsContainer.appendChild(createBibleCard(ref));
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
    const normalized = normalizeRef(ref);
    if (bibleTextData[normalized]) return bibleTextData[normalized].text;
    return "성경 본문을 불러오는 중이거나 데이터가 없습니다.";
}

function normalizeRef(ref) {
    let r = ref.trim().replace(/\s+/g, ' ');
    if (r.endsWith('편')) r = r.replace('편', '').trim();
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
    return formatDate(date);
}

function getNextSunday(d) {
    const date = new Date(d);
    date.setDate(date.getDate() + (7 - date.getDay()) % 7);
    if (date.getTime() === d.getTime()) date.setDate(date.getDate() + 7);
    return formatDate(date);
}

init();
