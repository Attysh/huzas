import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// A te egyedi Firebase konfigurációd
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

// ================= VALÓSÁGHŰ HAVAZÁS ANIMÁCIÓ (CANVAS) =================
const snowCanvas = document.getElementById('snowCanvas');
if (snowCanvas) {
    const sCtx = snowCanvas.getContext('2d');
    let width = (snowCanvas.width = window.innerWidth);
    let height = (snowCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = snowCanvas.width = window.innerWidth;
        height = snowCanvas.height = window.innerHeight;
    });

    const flakes = Array.from({ length: 65 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.8 + 0.8,
        speedY: Math.random() * 1.2 + 0.5,
        speedX: Math.random() * 0.6 - 0.3,
        opacity: Math.random() * 0.7 + 0.3
    }));

    function renderSnow() {
        sCtx.clearRect(0, 0, width, height);
        sCtx.fillStyle = '#ffffff';

        for (const f of flakes) {
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
        requestAnimationFrame(renderSnow);
    }
    renderSnow();
}

// ================= HÁTTÉRZENE VEZÉRLÉS =================
const bgMusic = document.getElementById('bgMusic');
const musicToggleBtn = document.getElementById('musicToggleBtn');

if (bgMusic) {
    bgMusic.volume = 0.3;
}

window.toggleMusic = function() {
    if (!bgMusic) return;
    if (bgMusic.paused) {
        bgMusic.play().then(() => {
            musicToggleBtn.textContent = '🔊';
        }).catch(err => console.log(err));
    } else {
        bgMusic.pause();
        musicToggleBtn.textContent = '🔇';
    }
};

window.changeVolume = function(val) {
    if (!bgMusic) return;
    bgMusic.volume = parseFloat(val);
    if (bgMusic.volume === 0 || bgMusic.paused) {
        musicToggleBtn.textContent = '🔇';
    } else {
        musicToggleBtn.textContent = '🔊';
    }
};

document.addEventListener('click', function initAudio() {
    if (bgMusic && bgMusic.paused && bgMusic.volume > 0) {
        bgMusic.play().then(() => {
            musicToggleBtn.textContent = '🔊';
        }).catch(() => {});
    }
    document.removeEventListener('click', initAudio);
}, { once: true });

// ================= BELÉPÉS ÉS HÚZÁS =================
window.login = async function() {
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
};

window.drawName = async function() {
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
                particleCount: 100,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#10b981', '#fbbf24', '#ffffff']
            });
        }

    } catch (err) {
        console.error(err);
        alert("Hiba történt a sorsolás során.");
    }
};

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

window.logout = function() {
    currentUser = null;
    document.getElementById('pinInput').value = '';
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('draw-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
};

window.toggleAdminModal = function() {
    const modal = document.getElementById('adminModal');
    modal.classList.toggle('hidden');
};

// ================= ZÁRT KÖRŰ SORSOLÁS GENERÁTOR =================
window.runAdminDraw = async function() {
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

        // Fisher-Yates zárt kör keverés
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
};

// ================= EASTER EGG =================
let santaClicks = 0;
window.triggerSantaEasterEgg = function() {
    santaClicks++;
    const santaEl = document.getElementById('santa-icon');

    if (typeof confetti === 'function') {
        confetti({
            particleCount: 35,
            spread: 55,
            origin: { y: 0.35 },
            colors: ['#ef4444', '#10b981', '#fbbf24', '#ffffff']
        });
    }

    santaEl.style.transform = 'scale(1.4) rotate(15deg)';
    setTimeout(() => { santaEl.style.transform = ''; }, 200);

    if (santaClicks === 5) {
        santaEl.textContent = '🦹';
        alert("Ho-ho-ho! A Grincs leselkedik az ajándékok után! 🎄");
    }
};

// ================= AJÁNDÉKELKAPÓ MINI-JÁTÉK =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let gameAnimationId = null;
let score = 0;
let lives = 3;
let basket = { x: 145, y: 330, width: 60, height: 20 };
let items = [];
let isGameOver = false;

window.openGameModal = function() {
    document.getElementById('gameModal').classList.remove('hidden');
    restartGame();
};

window.closeGameModal = function() {
    document.getElementById('gameModal').classList.add('hidden');
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
};

window.restartGame = function() {
    score = 0;
    lives = 3;
    items = [];
    isGameOver = false;
    document.getElementById('gameOverScreen').classList.add('hidden');
    updateGameStats();
    if (gameAnimationId) cancelAnimationFrame(gameAnimationId);
    gameLoop();
};

function updateGameStats() {
    document.getElementById('currentScore').textContent = score;
    document.getElementById('livesCount').textContent = '❤️'.repeat(Math.max(0, lives));
}

function spawnItem() {
    if (Math.random() < 0.035) {
        const isBomb = Math.random() < 0.25;
        items.push({
            x: Math.random() * (canvas.width - 30),
            y: -20,
            speed: 2 + Math.random() * 2,
            type: isBomb ? 'bomb' : 'present',
            emoji: isBomb ? '💣' : '🎁'
        });
    }
}

function gameLoop() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '30px Arial';
    ctx.fillText('🧺', basket.x, basket.y + 15);

    spawnItem();
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;

        ctx.font = '24px Arial';
        ctx.fillText(item.emoji, item.x, item.y);

        if (item.y >= basket.y - 10 && item.y <= basket.y + 20 &&
            item.x + 20 >= basket.x && item.x <= basket.x + basket.width) {
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
