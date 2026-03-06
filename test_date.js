function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

const testDates = [
    '2026-03-02', // Mon
    '2026-03-03', // Tue
    '2026-03-04', // Wed
    '2026-03-05', // Thu
    '2026-03-06', // Fri
    '2026-03-07', // Sat
    '2026-03-08'  // Sun
];

testDates.forEach(ds => {
    const d = new Date(ds);
    const dayOfWeek = d.getDay();
    let target = "";
    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
        target = "Prev Sun: " + getPreviousSunday(d);
    } else if (dayOfWeek >= 4 && dayOfWeek <= 6) {
        target = "Next Sun: " + getNextSunday(d);
    } else {
        target = "Sunday itself";
    }
    console.log(`${ds} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}): ${target}`);
});
