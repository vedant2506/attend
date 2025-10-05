// *** STEP 1: ADD YOUR SUPABASE DETAILS HERE ***
const SUPABASE_URL = 'https://hrshatipygqtlqtjkozm.supabase.co';      // <-- PASTE YOUR URL HERE
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc2hhdGlweWdxdGxxdGprb3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Njc5MDIsImV4cCI6MjA3NTI0MzkwMn0.KKzsKiBOO9AlQqX-ickVMBA9qXexF-cgiVeMVFcF26M'; // <-- PASTE YOUR ANON KEY HERE

// *** STEP 2: INITIALIZE THE SUPABASE CLIENT ***
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase Initialized!');


// --- DOM Elements ---
// (This section is unchanged)
const homeView = document.getElementById('home-view');
const teacherView = document.getElementById('teacher-view');
const studentView = document.getElementById('student-view');
const summaryView = document.getElementById('summary-view');
const teacherBtn = document.getElementById('teacher-btn');
const studentBtn = document.getElementById('student-btn');
const backBtns = document.querySelectorAll('.back-btn');
const startSessionBtn = document.getElementById('start-session-btn');
const qrcodeContainer = document.getElementById('qrcode-container');
const qrcodeEl = document.getElementById('qrcode');
const timerEl = document.getElementById('timer');
const fallbackBtn = document.getElementById('fallback-btn');
const alphanumericContainer = document.getElementById('alphanumeric-container');
const alphanumericCodeEl = document.getElementById('alphanumeric-code');
const alphanumericTimerEl = document.getElementById('alphanumeric-timer');
const endSessionBtn = document.getElementById('end-session-btn');
const studentLoginView = document.getElementById('student-login-view');
const studentRollInput = document.getElementById('student-roll-input');
const studentLoginBtn = document.getElementById('student-login-btn');
const studentDashboard = document.getElementById('student-dashboard');
const loggedInStudentEl = document.getElementById('logged-in-student');
const scanBtn = document.getElementById('scan-btn');
const scannerContainer = document.getElementById('scanner-container');
const videoEl = document.getElementById('scanner-video');
const scanResultEl = document.getElementById('scan-result');
const manualEntryLink = document.getElementById('manual-entry-link');
const manualEntryContainer = document.getElementById('manual-entry-container');
const manualCodeInput = document.getElementById('manual-code-input');
const submitCodeBtn = document.getElementById('submit-code-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const copyReportBtn = document.getElementById('copy-report-btn');


// --- State Variables & Mock Database ---
let sessionInterval;
let qr;
let currentAlphanumericCode = '';
// *** NEW: The session ID is now critical for tracking live sessions ***
let currentSessionId = '';

const classRoster = [];
for (let i = 1; i <= 78; i++) {
    classRoster.push({ studentId: `roll_${i}`, rollNo: i.toString() });
}
const teacherInfo = {
    subject: 'Live Trial Lecture'
};


// --- View Navigation ---
// (This section is unchanged)
function showView(view) {
    [homeView, teacherView, studentView, summaryView].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
}
teacherBtn.addEventListener('click', () => showView(teacherView));
studentBtn.addEventListener('click', () => showView(studentView));
backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        stopSession();
        stopScanner();
        showView(homeView);
    });
});
newSessionBtn.addEventListener('click', () => {
    // We don't need clearSessionData anymore as the teacher starts a new session
    showView(teacherView);
});


// --- Teacher Logic ---
// *** MODIFIED: This function is now async and clears the database ***
startSessionBtn.addEventListener('click', async () => {
    currentSessionId = `session_${Date.now()}`;
    console.log(`Starting new session with ID: ${currentSessionId}`);

    // For the demo, we clear ALL previous records to start fresh.
    // In a real app, you would not do this.
    const { error } = await db.from('records').delete().neq('student_id', 'never_match_this_string');
    if (error) {
        console.error('Error clearing old records:', error);
        alert('Could not start a new session. Check the console.');
        return;
    }
    console.log('Previous session records cleared from the database.');

    startSessionBtn.style.display = 'none';
    fallbackBtn.style.display = 'block';
    endSessionBtn.style.display = 'block';
    qrcodeContainer.style.display = 'block';
    generateDynamicQrCode();
    sessionInterval = setInterval(generateDynamicQrCode, 15000);
});

fallbackBtn.addEventListener('click', () => {
    clearInterval(sessionInterval);
    qrcodeContainer.style.display = 'none';
    alphanumericContainer.style.display = 'block';
    generateNumericCode();
    sessionInterval = setInterval(generateNumericCode, 30000);
});

endSessionBtn.addEventListener('click', showSessionSummary); // This now has a new implementation
copyReportBtn.addEventListener('click', copyAbsentListToClipboard);

// *** MODIFIED: This function now fetches live data from Supabase ***
async function showSessionSummary() {
    stopSession();
    console.log(`Fetching records for session: ${currentSessionId}`);
    
    // Fetch all present student records for this session from the live database
    const { data: presentRecords, error } = await db
        .from('records')
        .select('student_id')
        .eq('session_id', currentSessionId);

    if (error) {
        console.error('Error fetching summary:', error);
        alert('Could not fetch the session summary. Please check the console.');
        return;
    }

    const presentStudentIds = presentRecords.map(record => record.student_id);
    const absentStudents = classRoster.filter(student => !presentStudentIds.includes(student.studentId));
    const absentRollNos = absentStudents.map(student => student.rollNo).join(', ') || 'None';

    // The rest of this function is the same as before
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB');
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('summary-subject').textContent = teacherInfo.subject;
    document.getElementById('summary-date').textContent = formattedDate;
    document.getElementById('summary-time').textContent = formattedTime;
    document.getElementById('summary-present').textContent = `${presentStudentIds.length} / ${classRoster.length}`;
    document.getElementById('summary-absent').textContent = `${absentStudents.length} / ${classRoster.length}`;
    document.getElementById('summary-absent-list').textContent = absentRollNos;
    showView(summaryView);
}


// --- Student Logic ---
// *** REMOVED: We no longer use localStorage for attendance data ***

studentLoginBtn.addEventListener('click', () => {
    // (This function is unchanged)
    const rollNo = studentRollInput.value.trim();
    const isValid = classRoster.some(student => student.rollNo === rollNo);

    if (isValid) {
        sessionStorage.setItem('loggedInStudentRoll', rollNo);
        studentLoginView.style.display = 'none';
        studentDashboard.style.display = 'block';
        loggedInStudentEl.textContent = `Logged in as Roll No: ${rollNo}`;
    } else {
        alert('Invalid Roll Number. Please try again.');
    }
});

// *** MODIFIED: This function now sends data to and checks with Supabase ***
async function handleScanResult(data) {
    stopScanner();
    const rollNo = sessionStorage.getItem('loggedInStudentRoll');
    if (!rollNo) {
        alert("Error: Not logged in.");
        return;
    }
    const studentId = `roll_${rollNo}`;

    // Check if student is already marked present IN THE LIVE DATABASE
    const { data: existingRecord, error: checkError } = await db.from('records')
        .select()
        .eq('session_id', currentSessionId)
        .eq('student_id', studentId);

    if (checkError) {
        console.error("Error checking existing record:", checkError);
        scanResultEl.textContent = 'A network error occurred. Please try again.';
        scanResultEl.className = 'result-error';
        return;
    }
    
    if (existingRecord.length > 0) {
        scanResultEl.textContent = `You are already marked present, Roll No: ${rollNo}.`;
        scanResultEl.className = 'result-success';
        return;
    }
    
    const fingerprint = await getDeviceFingerprint();
    const isProxy = await checkForProxyAttendance(fingerprint);

    // *** SEND THE NEW RECORD TO THE LIVE DATABASE ***
    const { error } = await db.from('records').insert({
        student_id: studentId,
        roll_no: rollNo,
        fingerprint: fingerprint,
        session_id: currentSessionId
    });

    if (error) {
        console.error('Error saving attendance:', error);
        scanResultEl.textContent = 'Error saving attendance. Please try again.';
        scanResultEl.className = 'result-error';
        return;
    }

    if (isProxy) {
        scanResultEl.innerHTML = `<strong>Attendance Marked for Roll No: ${rollNo}.</strong><br><span style="color: #f59e0b; font-weight: bold;">Warning: Suspicious activity detected. This has been flagged.</span>`;
        scanResultEl.className = '';
    } else {
        scanResultEl.textContent = `Success, Roll No: ${rollNo}! You have been marked present.`;
        scanResultEl.className = 'result-success';
    }
}

// *** MODIFIED: This function now checks the live database ***
async function checkForProxyAttendance(fingerprint) {
    const { data, error } = await db
        .from('records')
        .select()
        .eq('session_id', currentSessionId)
        .eq('fingerprint', fingerprint);
    
    if (error) {
        console.error("Proxy check error:", error);
        return false; // Fail safe, assume not a proxy on error
    }
    
    return data && data.length > 0;
}


// --- Unchanged Helper Functions ---
scanBtn.addEventListener('click', startScanner);
manualEntryLink.addEventListener('click', (e) => { e.preventDefault(); manualEntryContainer.style.display = 'block'; manualEntryLink.style.display = 'none'; });

function generateDynamicQrCode() { const qrData = `CS101-ATTENDANCE-${Date.now()}`; qrcodeEl.innerHTML = ''; qr = new QRCode(qrcodeEl, { text: qrData, width: 256, height: 256, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H }); startTimer(15, timerEl, "New QR code in"); }
function generateNumericCode() { const code = Math.floor(100000 + Math.random() * 900000); currentAlphanumericCode = code.toString(); alphanumericCodeEl.textContent = `${code.toString().substring(0, 3)} - ${code.toString().substring(3, 6)}`; startTimer(30, alphanumericTimerEl, "New code in"); }
function startTimer(duration, element, text) { let timeLeft = duration; element.textContent = `${text} ${timeLeft}s...`; const timerInterval = setInterval(() => { timeLeft--; element.textContent = `${text} ${timeLeft}s...`; if (timeLeft <= 0) clearInterval(timerInterval); }, 1000); }
function copyAbsentListToClipboard() { const absentListText = document.getElementById('summary-absent-list').textContent; const reportText = `Absent Roll Numbers for ${teacherInfo.subject}:\n${absentListText}`; navigator.clipboard.writeText(reportText).then(() => alert('Absent list copied to clipboard!')).catch(err => alert('Could not copy text.')); }
async function getDeviceFingerprint() { const components = [navigator.userAgent, `${screen.width}x${screen.height}`, new Date().getTimezoneOffset(), navigator.language, navigator.hardwareConcurrency]; const data = components.join('---'); let hash = 0; for (let i = 0; i < data.length; i++) { const char = data.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash |= 0; } return hash.toString(); }
function startScanner() { scannerContainer.style.display = 'block'; scanBtn.style.display = 'none'; scanResultEl.textContent = 'Point camera at the QR code...'; scanResultEl.className = ''; navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => { videoEl.srcObject = stream; videoEl.setAttribute("playsinline", true); videoEl.play(); requestAnimationFrame(tick); }).catch(err => { console.error("Camera Error:", err); scanResultEl.textContent = 'Could not access camera. Please check permissions.'; scanResultEl.className = 'result-error'; }); }
function tick() { if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) { const canvas = document.createElement('canvas'); canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight; const ctx = canvas.getContext('2d'); ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height); const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }); if (code) { handleScanResult(code.data); return; } } requestAnimationFrame(tick); }
function stopScanner() { if (videoEl.srcObject) { videoEl.srcObject.getTracks().forEach(track => track.stop()); } scannerContainer.style.display = 'none'; scanBtn.style.display = 'block'; }
submitCodeBtn.addEventListener('click', () => { const enteredCode = manualCodeInput.value.trim(); if (!enteredCode) return; console.log(`Simulating submission of manual code: ${enteredCode}`); handleScanResult(`MANUAL_CODE_SUBMISSION_${Date.now()}`); manualCodeInput.value = ''; });
function stopSession() { clearInterval(sessionInterval); startSessionBtn.style.display = 'block'; fallbackBtn.style.display = 'none'; endSessionBtn.style.display = 'none'; qrcodeContainer.style.display = 'none'; alphanumericContainer.style.display = 'none'; }