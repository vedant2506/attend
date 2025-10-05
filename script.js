// --- DOM Elements ---
const homeView = document.getElementById('home-view');
const teacherView = document.getElementById('teacher-view');
const studentView = document.getElementById('student-view');

const teacherBtn = document.getElementById('teacher-btn');
const studentBtn = document.getElementById('student-btn');
const backBtns = document.querySelectorAll('.back-btn');

// Teacher View Elements
const startSessionBtn = document.getElementById('start-session-btn');
const qrcodeContainer = document.getElementById('qrcode-container');
const qrcodeEl = document.getElementById('qrcode');
const timerEl = document.getElementById('timer');
const fallbackBtn = document.getElementById('fallback-btn');
const alphanumericContainer = document.getElementById('alphanumeric-container');
const alphanumericCodeEl = document.getElementById('alphanumeric-code');
const alphanumericTimerEl = document.getElementById('alphanumeric-timer');

// Student View Elements
const scanBtn = document.getElementById('scan-btn');
const scannerContainer = document.getElementById('scanner-container');
const videoEl = document.getElementById('scanner-video');
const scanResultEl = document.getElementById('scan-result');
const manualEntryLink = document.getElementById('manual-entry-link');
const manualEntryContainer = document.getElementById('manual-entry-container');
const manualCodeInput = document.getElementById('manual-code-input');
const submitCodeBtn = document.getElementById('submit-code-btn');

// --- State Variables ---
let sessionInterval; // Used for both QR and Alphanumeric intervals
let qr;
let currentAlphanumericCode = ''; // Will only be set on the teacher's client

// --- View Navigation ---
function showView(view) {
    homeView.classList.remove('active');
    teacherView.classList.remove('active');
    studentView.classList.remove('active');
    view.classList.add('active');
}

teacherBtn.addEventListener('click', () => showView(teacherView));
studentBtn.addEventListener('click', () => showView(studentView));
backBtns.forEach(btn => btn.addEventListener('click', () => {
    stopSession();
    stopScanner();
    showView(homeView);
}));

// --- Teacher Logic ---
startSessionBtn.addEventListener('click', () => {
    startSessionBtn.style.display = 'none';
    fallbackBtn.style.display = 'block';
    // Start with QR Code mode by default
    qrcodeContainer.style.display = 'block';
    generateDynamicQrCode();
    sessionInterval = setInterval(generateDynamicQrCode, 15000);
});

fallbackBtn.addEventListener('click', () => {
    // Switch to alphanumeric mode
    clearInterval(sessionInterval); // Stop the current timer
    qrcodeContainer.style.display = 'none';
    alphanumericContainer.style.display = 'block';
    generateAlphanumericCode();
    sessionInterval = setInterval(generateAlphanumericCode, 30000);
});

function generateDynamicQrCode() {
    const qrData = `CS101-ATTENDANCE-${Date.now()}`;
    qrcodeEl.innerHTML = '';
    qr = new QRCode(qrcodeEl, {
        text: qrData, width: 256, height: 256,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    startTimer(15, timerEl, "New QR code in");
}

function generateAlphanumericCode() {
    const words = ["LION", "TIGER", "BEAR", "WOLF", "FOX", "EAGLE", "SHARK"];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(10 + Math.random() * 90);
    
    currentAlphanumericCode = `${word1}${number}${word2}`;
    alphanumericCodeEl.textContent = `${word1} - ${number} - ${word2}`;
    startTimer(30, alphanumericTimerEl, "New code in");
}

function startTimer(duration, element, text) {
    let timeLeft = duration;
    element.textContent = `${text} ${timeLeft} seconds...`;
    const timerInterval = setInterval(() => {
        timeLeft--;
        element.textContent = `${text} ${timeLeft} seconds...`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function stopSession() {
    clearInterval(sessionInterval);
    startSessionBtn.style.display = 'block';
    fallbackBtn.style.display = 'none';
    qrcodeContainer.style.display = 'none';
    alphanumericContainer.style.display = 'none';
}

// --- Device Fingerprinting Logic ---
async function getDeviceFingerprint() {
    const components = [
        navigator.userAgent,
        `${screen.width}x${screen.height}`,
        new Date().getTimezoneOffset(),
        navigator.language,
        navigator.hardwareConcurrency
    ];
    const data = components.join('---');
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString();
}

// --- Student Logic ---
const attendanceDB = JSON.parse(localStorage.getItem('attendanceRecords')) || [];

function saveAttendanceRecord(record) {
    attendanceDB.push(record);
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceDB));
}

scanBtn.addEventListener('click', startScanner);

manualEntryLink.addEventListener('click', (e) => {
    e.preventDefault();
    manualEntryContainer.style.display = 'block';
    manualEntryLink.style.display = 'none';
});

submitCodeBtn.addEventListener('click', () => {
    const enteredCode = manualCodeInput.value.trim();
    if (enteredCode === '') {
        scanResultEl.textContent = 'Please enter a code.';
        scanResultEl.className = 'result-error';
        return;
    }
    // *** CRITICAL FIX ***
    // In a real app, we'd send 'enteredCode' to a server for validation.
    // Since we can't do that in this prototype, we'll just assume it's correct
    // and call handleScanResult to continue the flow with fingerprinting.
    console.log(`Simulating submission of manual code: ${enteredCode}`);
    handleScanResult(`MANUAL_CODE_SUBMISSION_${Date.now()}`); 
    manualCodeInput.value = '';
});

function startScanner() {
    // ... (rest of the student logic is unchanged)
    scannerContainer.style.display = 'block';
    scanBtn.style.display = 'none';
    scanResultEl.textContent = 'Point camera at the QR code...';
    scanResultEl.className = '';

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            videoEl.srcObject = stream;
            videoEl.setAttribute("playsinline", true);
            videoEl.play();
            requestAnimationFrame(tick);
        })
        .catch(err => {
            console.error("Camera Error:", err);
            scanResultEl.textContent = 'Could not access camera. Please check permissions.';
            scanResultEl.className = 'result-error';
        });
}

function tick() {
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            handleScanResult(code.data);
            return;
        }
    }
    requestAnimationFrame(tick);
}

function checkForProxyAttendance(newStudentId, fingerprint) {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentRecords = attendanceDB.filter(record => record.timestamp > fiveMinutesAgo);
    return recentRecords.find(record => 
        record.fingerprint === fingerprint && record.studentId !== newStudentId
    );
}

async function handleScanResult(data) {
    stopScanner();
    const studentId = prompt("For testing, please enter your Student ID (e.g., 'Student_A', 'Student_B'):");
    if (!studentId) {
        scanResultEl.textContent = 'Scan cancelled. No Student ID entered.';
        scanResultEl.className = 'result-error';
        return;
    }

    const fingerprint = await getDeviceFingerprint();
    const flag = checkForProxyAttendance(studentId, fingerprint);
    
    saveAttendanceRecord({
        studentId: studentId,
        timestamp: Date.now(),
        fingerprint: fingerprint,
        qrData: data
    });

    if (flag) {
        scanResultEl.innerHTML = `
            <strong>Attendance Marked for ${studentId}.</strong><br>
            <span style="color: #f59e0b; font-weight: bold;">
                Warning: This device was also used for ${flag.studentId} less than 5 minutes ago. 
                This activity has been flagged for review.
            </span>
        `;
        scanResultEl.className = '';
    } else {
        scanResultEl.textContent = `Success, ${studentId}! You have been marked present.`;
        scanResultEl.className = 'result-success';
    }
}

function stopScanner() {
    if (videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach(track => track.stop());
    }
    scannerContainer.style.display = 'none';
    scanBtn.style.display = 'block';
}