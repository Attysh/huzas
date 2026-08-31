import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// === IDE MÁSOLD BE A SAJÁT FIREBASE KONFIGURÁCIÓDAT ===
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

window.login = async function() {
    const name = document.getElementById('nameInput').value.trim();
    const pin = document.getElementById('pinInput').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!name || !pin) {
        errorEl.textContent = "Kérlek töltsd ki mindkét mezőt!";
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let foundUser = null;
        let foundDocId = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.name.toLowerCase() === name.toLowerCase() && data.pin === pin) {
                foundUser = data;
                foundDocId = docSnap.id;
            }
        });

        if (!foundUser) {
            errorEl.textContent = "Hibás név vagy PIN kód!";
            return;
        }

        currentUser = { id: foundDocId, ...foundUser };
        errorEl.textContent = "";
        updateUI();

    } catch (err) {
        console.error(err);
        errorEl.textContent = "Kapcsolódási hiba történt.";
    }
}

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
            alert("A sorsolás még nem indult el az admin által!");
            return;
        }

        // Frissítés Firestore-ban
        await updateDoc(userRef, { hasDrawn: true });
        currentUser.hasDrawn = true;
        updateUI();

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
        document.getElementById('welcomeMsg').textContent = `Szia, ${currentUser.name}!`;
    }
}

window.logout = function() {
    currentUser = null;
    document.getElementById('nameInput').value = '';
    document.getElementById('pinInput').value = '';
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
}

window.toggleAdminModal = function() {
    const modal = document.getElementById('adminModal');
    modal.classList.toggle('hidden');
}

// Egyszerű kliens oldali admin sorsolás generátor
window.runAdminDraw = async function() {
    const pass = document.getElementById('adminPass').value;
    const msgEl = document.getElementById('adminMsg');

    // Egyszerű admin jelszó védelem (változtasd meg kedvedre)
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
            msgEl.textContent = "Túl kevés felhasználó van az adatbázisban!";
            msgEl.className = "text-xs text-center text-red-400";
            return;
        }

        // Fisher-Yates keverés deadlock védelemmel
        let shuffled = [...users];
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 1000) {
            attempts++;
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            // Ellenőrzés, hogy senki se húzza saját magát
            valid = true;
            for (let i = 0; i < users.length; i++) {
                if (users[i].name === shuffled[i].name) {
                    valid = false;
                    break;
                }
            }
        }

        if (!valid) {
            msgEl.textContent = "Nem sikerült biztonságos párosítást találni, próbáld újra.";
            return;
        }

        // Firestore frissítése a zárt kör párosaival
        for (let i = 0; i < users.length; i++) {
            const currentUserId = users[i].id;
            const assignedPersonName = shuffled[(i + 1) % users.length].name; // Zárt kör logika
            
            const userRef = doc(db, "users", currentUserId);
            await updateDoc(userRef, {
                drawnPerson: assignedPersonName,
                hasDrawn: false
            });
        }

        msgEl.textContent = "Sikeres sorsolás és mentés a Firestore-ba! 🎉";
        msgEl.className = "text-xs text-center text-emerald-400";

    } catch (err) {
        console.error(err);
        msgEl.textContent = "Hiba történt a sorsolás alatt.";
        msgEl.className = "text-xs text-center text-red-400";
    }
}