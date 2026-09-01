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

// ================= VALÓSÁGHŰ HAVAZÁS (CANVAS) OPTIMALIZÁLVA =================
const snowCanvas = document.getElementById('snowCanvas');
let isGameOpen = false;
let snowAnimationId = null;

if (snowCanvas) {
    const sCtx = snowCanvas.getContext('2d', { alpha: true });
    let width = (snowCanvas.width = window.innerWidth);
    let height = (snowCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = snowCanvas.width = window.innerWidth;
        height = snowCanvas.height = window.innerHeight;
    });

    const flakes = Array.from({ length: 45 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.0 + 0.8,
        speedY: Math.random() * 0.9 + 0.4,
        speedX: Math.random() * 0.4 - 0.2,
        opacity: Math.random() * 0.5 + 0.3
    }));

    function renderSnow() {
        if (isGameOpen) return; // Ha a játék nyitva van, a háttér havazás nem fogyasztja a processzort

        sCtx.clearRect(0, 0, width, height);
        for (let i = 0; i < flakes.length; i++) {
            const f = flakes[i];
            sCtx.beginPath();
            sCtx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            sCtx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
            sCtx.fill();

            f.y += f.speedY;
            f.x += f.speedX;

            if (f.y > height) f.y = -5;
            if (f.x > width) f.x = 0;
            if (f.x < 0) f.x = width;
        }
        snowAnimationId = requestAnimationFrame(renderSnow);
    }
    renderSnow();
}

// ================= HÁTTÉRZENE VEZÉRLÉS =================
const bgMusic = document.getElementById('bgMusic');
const musicToggleBtn = document.getElementById('musicToggleBtn');
const volumeSlider = document.getElementById('volumeSlider');

if (bgMusic) {
    bgMusic.volume = 0.3;
}

function toggleMusic() {
    if (!bgMusic) return;
    if (bgMusic.paused) {
        bgMusic.play().then(() => {
            musicToggleBtn.textContent = '🔊';
        }).catch(err => console.log("Audió hiba:", err));
    } else {
        bgMusic.pause();
        musicToggleBtn.textContent = '🔇';
    }
}

function changeVolume(val) {
    if (!bgMusic) return;
    bgMusic.volume = parseFloat(val);
    if (bgMusic.volume === 0 || bgMusic.paused) {
        musicToggleBtn.textContent = '🔇';
    } else {
        musicToggleBtn.textContent = '🔊';
    }
}

if (musicToggleBtn) musicToggleBtn.addEventListener('click', toggleMusic);
if (volumeSlider) volumeSlider.addEventListener('input', (e) => changeVolume(e.target.value));

document.addEventListener('click', function initAudio() {
    if (bgMusic && bgMusic.paused && bgMusic.volume > 0) {
        bgMusic.play().then(() => {
            musicToggleBtn.textContent = '🔊';
        }).catch(() => {});
    }
    document.removeEventListener('click', initAudio);
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
                particleCount: 90,
                spread: 75,
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

// ================= 60 FPS ULTRA-SMOOTH AJÁNDÉKELKAPÓ JÁTÉK =================
const gameModal = document.getElementById('gameModal');
const openGameBtn = document.getElementById('openGameBtn');
const openGameBtnFromResult = document.getElementById('openGameBtnFromResult');
const closeGameBtn = document.getElementById('closeGameBtn');
const restartGameBtn = document.getElementById('restartGameBtn');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
let gameAnimationId = null;
let score = 0;
let lives = 3;
let basket = { x: 130, y: 295, width: 55, height: 20 };
let items = [];
let isGameOver = false;
let lastFrameTime = 0;

function openGameModal() {
    if (gameModal) gameModal.classList.remove('hidden');
    isGameOpen = true; // Háttérhavazás felfüggesztése a lagmentes játékért
    restartGame();
}

function closeGameModal() {
    if (gameModal) gameModal.classList.add('hidden');
    isGameOpen = false;
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
    if (snowCanvas) renderSnow(); // Háttérhavazás visszakapcsolása
}

function restartGame() {
    score = 0;
    lives = 3;
    items = [];
    isGameOver = false;
    document.getElementById('gameOverScreen').classList.add('hidden');
    updateGameStats();
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
    lastFrameTime = performance.now();
    gameLoop(performance.now());
}

function updateGameStats() {
    document.getElementById('currentScore').textContent = score;
    document.getElementById('livesCount').textContent = '❤️'.repeat(Math.max(0, lives));
}

function spawnItem() {
    if (Math.random() < 0.03) {
        const isBomb = Math.random() < 0.22;
        items.push({
            x: Math.random() * (canvas.width - 32),
            y: -25,
            speed: 130 + Math.random() * 80, // Sebesség pixel/másodpercben
            type: isBomb ? 'bomb' : 'present',
            emoji: isBomb ? '💣' : '🎁'
        });
    }
}

function gameLoop(timestamp) {
    if (isGameOver) return;

    // Delta time számítás a teljesen akadásmentes mozgáshoz bármilyen kijelzőn (60Hz / 120Hz / 144Hz)
    const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
    lastFrameTime = timestamp;

    // Tiszta háttér kirajzolása
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Puttony kirajzolása
    ctx.font = '28px sans-serif';
    ctx.fillText('🧺', basket.x, basket.y + 15);

    spawnItem();

    // Elemek kirajzolása és ütközésvizsgálata
    ctx.font = '22px sans-serif'; // Csak egyszer állítjuk be a ciklus előtt
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed * dt;

        ctx.fillText(item.emoji, item.x, item.y);

        // Ütközés a puttonnyal
        if (item.y >= basket.y - 12 && item.y <= basket.y + 18 &&
            item.x + 22 >= basket.x && item.x <= basket.x + basket.width) {
            if (item.type === 'present') {
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

        // Képernyőről lecsúszás
        if (item.y > canvas.height) {
            if (item.type === 'present') {
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

    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX), { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
        }
    }, { passive: true });
}
