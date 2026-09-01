import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCI5Mj9LXVfKNq5CHBvr7Fc7XOOQLo5XiY",
    authDomain: "mikulas-2026.firebaseapp.com",
    projectId: "mikulas-2026",
    storageBucket: "mikulas-2026.firebasestorage.app",
    messagingSenderId: "21606446291",
    appId: "1:21606446291:web:9f0d5e873eae20353a9026"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUser = null;
let isGameOpen = false;

// ================= ULTRA-KÖNNYŰ HÁTTÉR HAVAZÁS =================
const snowCanvas = document.getElementById('snowCanvas');
if (snowCanvas) {
    const sCtx = snowCanvas.getContext('2d');
    let width = (snowCanvas.width = window.innerWidth);
    let height = (snowCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = snowCanvas.width = window.innerWidth;
        height = snowCanvas.height = window.innerHeight;
    });

    const flakes = Array.from({ length: 40 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1,
        vy: Math.random() * 0.8 + 0.3,
        vx: Math.random() * 0.4 - 0.2
    }));

    function renderSnow() {
        if (!isGameOpen) {
            sCtx.clearRect(0, 0, width, height);
            sCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            sCtx.beginPath();
            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i];
                sCtx.moveTo(f.x, f.y);
                sCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
                f.y += f.vy;
                f.x += f.vx;
                if (f.y > height) f.y = -5;
                if (f.x > width) f.x = 0;
                if (f.x < 0) f.x = width;
            }
            sCtx.fill();
        }
        requestAnimationFrame(renderSnow);
    }
    renderSnow();
}

// ================= WEB AUDIO API KARÁCSONYI SZINTETIZÁTOR (Garantáltan megszólal) =================
let audioCtx = null;
let isMusicPlaying = false;
let masterGain = null;
let synthTimer = null;
let currentNoteIndex = 0;

// Jingle Bells dallam frekvenciák (Hz) és hosszak
const melody = [
    { f: 329.63, d: 0.25 }, { f: 329.63, d: 0.25 }, { f: 329.63, d: 0.5 },
    { f: 329.63, d: 0.25 }, { f: 329.63, d: 0.25 }, { f: 329.63, d: 0.5 },
    { f: 329.63, d: 0.25 }, { f: 392.00, d: 0.25 }, { f: 261.63, d: 0.35 }, { f: 293.66, d: 0.15 },
    { f: 329.63, d: 0.8 },
    { f: 349.23, d: 0.25 }, { f: 349.23, d: 0.25 }, { f: 349.23, d: 0.35 }, { f: 349.23, d: 0.15 },
    { f: 349.23, d: 0.25 }, { f: 329.63, d: 0.25 }, { f: 329.63, d: 0.25 }, { f: 329.63, d: 0.15 }, { f: 329.63, d: 0.15 },
    { f: 329.63, d: 0.25 }, { f: 293.66, d: 0.25 }, { f: 293.66, d: 0.25 }, { f: 329.63, d: 0.25 },
    { f: 293.66, d: 0.5 },  { f: 392.00, d: 0.5 }
];

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
    }
}

function playNote(freq, duration) {
    if (!isMusicPlaying || !audioCtx) return;

    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();

    osc.type = 'sine'; // Tiszta, harang-szerű téli hang
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    noteGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playSongStep() {
    if (!isMusicPlaying) return;
    const note = melody[currentNoteIndex];
    playNote(note.f, note.d);

    currentNoteIndex = (currentNoteIndex + 1) % melody.length;
    synthTimer = setTimeout(playSongStep, note.d * 900);
}

const musicToggleBtn = document.getElementById('musicToggleBtn');
const volumeSlider = document.getElementById('volumeSlider');

function startMusic() {
    initAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isMusicPlaying = true;
    musicToggleBtn.textContent = '🔊';
    playSongStep();
}

function stopMusic() {
    isMusicPlaying = false;
    musicToggleBtn.textContent = '🔇';
    if (synthTimer) clearTimeout(synthTimer);
}

function toggleMusic() {
    if (isMusicPlaying) {
        stopMusic();
    } else {
        startMusic();
    }
}

if (musicToggleBtn) musicToggleBtn.addEventListener('click', toggleMusic);
if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        initAudioContext();
        const val = parseFloat(e.target.value);
        masterGain.gain.setValueAtTime(val * 0.4, audioCtx.currentTime);
        if (val === 0) {
            stopMusic();
        } else if (!isMusicPlaying) {
            startMusic();
        }
    });
}

// Első kattintáskor automatikus indítás
document.addEventListener('click', function autoPlayOnFirstUserAction() {
    if (!isMusicPlaying) {
        startMusic();
    }
    document.removeEventListener('click', autoPlayOnFirstUserAction);
}, { once: true });

// ================= BELÉPÉS ÉS HÚZÁS =================
async function login() {
    const pin = document.getElementById('pinInput').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!pin) {
        errorEl.textContent = "Kérlek add meg a 4 jegyű PIN kódodat!";
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let foundUser = null;
        let foundDocId = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (String(data.pin).trim() === pin) {
                foundUser = data;
                foundDocId = docSnap.id;
            }
        });

        if (!foundUser) {
            errorEl.textContent = "Hibás vagy nem létező PIN kód!";
            return;
        }

        currentUser = { id: foundDocId, ...foundUser };
        errorEl.textContent = "";
        updateUI();

    } catch (err) {
        console.error(err);
        errorEl.textContent = "Kapcsolódási hiba az adatbázishoz.";
    }
}

async function drawName() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.id);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData.hasDrawn) {
            currentUser = { id: currentUser.id, ...userData };
            updateUI();
            return;
        }

        if (!userData.drawnPerson) {
            alert("A sorsolást az admin még nem indította el!");
            return;
        }

        await updateDoc(userRef, { hasDrawn: true });
        currentUser.hasDrawn = true;
        currentUser.drawnPerson = userData.drawnPerson;
        updateUI();

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#10b981', '#fbbf24', '#ffffff']
            });
        }

    } catch (err) {
        console.error(err);
        alert("Hiba történt a sorsolás során.");
    }
}

function updateUI() {
    document.getElementById('login-section').classList.add('hidden');

    if (currentUser.hasDrawn) {
        document.getElementById('draw-section').classList.add('hidden');
        document.getElementById('result-section').classList.remove('hidden');
        document.getElementById('drawnName').textContent = currentUser.drawnPerson;
    } else {
        document.getElementById('result-section').classList.add('hidden');
        document.getElementById('draw-section').classList.remove('hidden');
        document.getElementById('welcomeMsg').textContent = `Szia, ${currentUser.name}! 👋`;
    }
}

function logout() {
    currentUser = null;
    document.getElementById('pinInput').value = '';
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('draw-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
}

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) loginBtn.addEventListener('click', login);

const drawBtn = document.getElementById('drawBtn');
if (drawBtn) drawBtn.addEventListener('click', drawName);

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// ================= ADMIN MODAL =================
const adminModal = document.getElementById('adminModal');
const openAdminBtn = document.getElementById('openAdminBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const runAdminDrawBtn = document.getElementById('runAdminDrawBtn');

function toggleAdminModal() {
    if (adminModal) adminModal.classList.toggle('hidden');
}

if (openAdminBtn) openAdminBtn.addEventListener('click', toggleAdminModal);
if (closeAdminBtn) closeAdminBtn.addEventListener('click', toggleAdminModal);

async function runAdminDraw() {
    const pass = document.getElementById('adminPass').value;
    const msgEl = document.getElementById('adminMsg');

    if (pass !== "mikulas2026") {
        msgEl.textContent = "Hibás admin jelszó!";
        msgEl.className = "text-xs text-center text-red-400";
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let users = [];
        querySnapshot.forEach((docSnap) => {
            users.push({ id: docSnap.id, name: docSnap.data().name });
        });

        if (users.length < 2) {
            msgEl.textContent = "Túl kevés résztvevő van (min. 2 kell)!";
            msgEl.className = "text-xs text-center text-red-400";
            return;
        }

        let circle = [...users];
        for (let i = circle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [circle[i], circle[j]] = [circle[j], circle[i]];
        }

        for (let i = 0; i < circle.length; i++) {
            const giver = circle[i];
            const receiver = circle[(i + 1) % circle.length];
            
            const userRef = doc(db, "users", giver.id);
            await updateDoc(userRef, {
                drawnPerson: receiver.name,
                hasDrawn: false
            });
        }

        msgEl.textContent = "Sikeres újrasorsolás! Zárt kör kész! 🎉";
        msgEl.className = "text-xs text-center text-emerald-400";

    } catch (err) {
        console.error(err);
        msgEl.textContent = "Hiba történt a sorsolás alatt.";
        msgEl.className = "text-xs text-center text-red-400";
    }
}

if (runAdminDrawBtn) runAdminDrawBtn.addEventListener('click', runAdminDraw);

// ================= EASTER EGG =================
let santaClicks = 0;
const santaIcon = document.getElementById('santa-icon');

if (santaIcon) {
    santaIcon.addEventListener('click', () => {
        santaClicks++;
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 30,
                spread: 50,
                origin: { y: 0.35 },
                colors: ['#ef4444', '#10b981', '#fbbf24', '#ffffff']
            });
        }

        santaIcon.style.transform = 'scale(1.4) rotate(15deg)';
        setTimeout(() => { santaIcon.style.transform = ''; }, 200);

        if (santaClicks === 5) {
            santaIcon.textContent = '🦹';
            alert("Ho-ho-ho! A Grincs leselkedik az ajándékok után! 🎄");
        }
    });
}

// ================= TELJESEN OPTIMALIZÁLT 60-120 FPS JÁTÉK =================
const gameModal = document.getElementById('gameModal');
const openGameBtn = document.getElementById('openGameBtn');
const openGameBtnFromResult = document.getElementById('openGameBtnFromResult');
const closeGameBtn = document.getElementById('closeGameBtn');
const restartGameBtn = document.getElementById('restartGameBtn');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let gameAnimationId = null;
let score = 0;
let lives = 3;
let basket = { x: 135, y: 290, width: 50, height: 18 };
let items = [];
let isGameOver = false;
let lastSpawn = 0;
let lastTime = 0;

function openGameModal() {
    if (gameModal) gameModal.classList.remove('hidden');
    isGameOpen = true;
    restartGame();
}

function closeGameModal() {
    if (gameModal) gameModal.classList.add('hidden');
    isGameOpen = false;
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
}

function restartGame() {
    score = 0;
    lives = 3;
    items = [];
    isGameOver = false;
    lastTime = performance.now();
    lastSpawn = performance.now();
    document.getElementById('gameOverScreen').classList.add('hidden');
    updateGameStats();
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
    gameAnimationId = requestAnimationFrame(gameLoop);
}

function updateGameStats() {
    document.getElementById('currentScore').textContent = score;
    document.getElementById('livesCount').textContent = '❤️'.repeat(Math.max(0, lives));
}

// Egyszerűsített, gyors vektoros rajzolás (nem használ nehézkes emoji fontokat)
function drawPresent(x, y) {
    ctx.fillStyle = '#ef4444'; // Piros doboz
    ctx.fillRect(x, y, 22, 22);
    ctx.fillStyle = '#fbbf24'; // Arany szalag
    ctx.fillRect(x + 9, y, 4, 22);
    ctx.fillRect(x, y + 9, 22, 4);
}

function drawBomb(x, y) {
    ctx.fillStyle = '#334155'; // Sötétszürke bomba
    ctx.beginPath();
    ctx.arc(x + 11, y + 11, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316'; // Kanóc lángja
    ctx.fillRect(x + 9, y - 3, 4, 4);
}

function drawBasket(x, y, w, h) {
    ctx.fillStyle = '#b45309'; // Puttony fa keret
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [0, 0, 8, 8]);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x + 5, y + 3, w - 10, h - 6);
}

function gameLoop(now) {
    if (isGameOver) return;

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Tiszta canvas ürítés
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elemek generálása időalapon (nem véletlenszerű képkockánként)
    if (now - lastSpawn > 650) {
        lastSpawn = now;
        const isBomb = Math.random() < 0.25;
        items.push({
            x: Math.random() * (canvas.width - 26) + 2,
            y: -20,
            vy: 140 + Math.random() * 60,
            isBomb: isBomb
        });
    }

    // Puttony rajzolása
    drawBasket(basket.x, basket.y, basket.width, basket.height);

    // Elemek mozgatása és kirajzolása
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.vy * dt;

        if (item.isBomb) {
            drawBomb(item.x, item.y);
        } else {
            drawPresent(item.x, item.y);
        }

        // Ütközés a kosárral
        if (item.y + 22 >= basket.y && item.y <= basket.y + basket.height &&
            item.x + 22 >= basket.x && item.x <= basket.x + basket.width) {
            if (!item.isBomb) {
                score += 10;
            } else {
                lives--;
            }
            items.splice(i, 1);
            updateGameStats();

            if (lives <= 0) {
                endGame();
                return;
            }
            continue;
        }

        // Leesett elemek
        if (item.y > canvas.height) {
            if (!item.isBomb) {
                lives--;
                updateGameStats();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            items.splice(i, 1);
        }
    }

    gameAnimationId = requestAnimationFrame(gameLoop);
}

function endGame() {
    isGameOver = true;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

if (openGameBtn) openGameBtn.addEventListener('click', openGameModal);
if (openGameBtnFromResult) openGameBtnFromResult.addEventListener('click', openGameModal);
if (closeGameBtn) closeGameBtn.addEventListener('click', closeGameModal);
if (restartGameBtn) restartGameBtn.addEventListener('click', restartGame);

if (canvas) {
    const handleMove = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        const rootX = clientX - rect.left;
        basket.x = Math.max(0, Math.min(canvas.width - basket.width, rootX - basket.width / 2));
    };

    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX));
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
        }
    }, { passive: true });
}
