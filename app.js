import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// A te saját Firebase konfigurációd
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

// Belépés csak PIN kód alapján
window.login = async function() {
    const pin = document.getElementById('pinInput').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!pin) {
        errorEl.textContent = "Kérlek add meg a PIN kódodat!";
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
        errorEl.textContent = "Kapcsolódási hiba történt.";
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

// Garantált zárt kör generáló algoritmus
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
            msgEl.textContent = "Túl kevés résztvevő van az adatbázisban (min. 2 kell)!";
            msgEl.className = "text-xs text-center text-red-400";
            return;
        }

        // 1. Megkeverjük a résztvevőket (Fisher-Yates)
        let circle = [...users];
        for (let i = circle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [circle[i], circle[j]] = [circle[j], circle[i]];
        }

        // 2. Zárt kör (A -> B -> C -> A) mentése az adatbázisba
        for (let i = 0; i < circle.length; i++) {
            const giver = circle[i];
            const receiver = circle[(i + 1) % circle.length]; // A kör következő eleme
            
            const userRef = doc(db, "users", giver.id);
            await updateDoc(userRef, {
                drawnPerson: receiver.name,
                hasDrawn: false // Visszaállítjuk, hogy újra lehessen húzni
            });
        }

        msgEl.textContent = "Sikeres újrasorsolás! A zárt kör elkészült, senki sem húzza magát! 🎉";
        msgEl.className = "text-xs text-center text-emerald-400";

    } catch (err) {
        console.error(err);
        msgEl.textContent = "Hiba történt a sorsolás alatt.";
        msgEl.className = "text-xs text-center text-red-400";
    }
};
