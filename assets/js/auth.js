/**
 * AUTHENTICATION LOGIC (Firebase)
 */

// Initialize Firebase (Assuming Firebase scripts are loaded in HTML)
let app, auth, database;

function initAuth() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK tidak terload dengan benar.');
        }

        if (!window.firebaseConfig) {
            throw new Error('Konfigurasi Firebase (firebase-config.js) tidak ditemukan.');
        }

        if (!firebase.apps.length) {
            app = firebase.initializeApp(window.firebaseConfig);
        } else {
            app = firebase.app();
        }
        
        auth = firebase.auth();
        database = firebase.database();

        // Monitor Auth State
        auth.onAuthStateChanged((user) => {
            const isLoginPage = window.location.pathname.includes('login.html');
            
            if (user) {
                // Jika di halaman login, pindah ke index
                if (isLoginPage) {
                    window.location.href = 'index.html';
                }
                updateUIForUser(user);
            } else {
                if (!isLoginPage) {
                    window.location.href = 'login.html';
                }
            }
        });
    } catch (error) {
        console.error('Auth Initialization Error:', error);
    }
}

// Generate or get unique Session ID for this device/browser
function getSessionId() {
    let sid = localStorage.getItem('fb_session_id');
    if (!sid) {
        sid = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('fb_session_id', sid);
    }
    return sid;
}

// Login Function
async function login(email, password) {
    // Pastikan Firebase sudah siap
    if (!auth || !database) {
        console.log('Firebase belum siap, mencoba inisialisasi...');
        await initAuth();
    }
    
    if (!auth) {
        return { success: false, message: 'Layanan Firebase gagal dimuat. Silakan cek koneksi internet dan refresh halaman.' };
    }

    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        return { success: true };
    } catch (error) {
        console.error('Login Error:', error);
        return { success: false, message: error.message };
    }
}

// Logout Function
async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout Error:', error);
    }
}

/**
 * LOGGING SYSTEM
 * Simpan riwayat aktivitas ke Firebase Realtime Database
 */
async function logActivity(type, details = {}) {
    if (!auth.currentUser) return;
    
    try {
        const user = auth.currentUser;
        const logRef = database.ref('logs').push();
        
        await logRef.set({
            uid: user.uid,
            email: user.email,
            type: type, // 'LOGIN', 'GENERATE_PDF', etc.
            details: details,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            device: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screen: `${window.screen.width}x${window.screen.height}`
            }
        });
    } catch (error) {
        console.error('Logging Error:', error);
    }
}

/**
 * CHECK SESSION STATUS
 * Dipanggil setiap kali pindah step untuk memastikan user masih valid
 */
async function checkSession() {
    try {
        console.log('Security: Checking session status...');
        
        // Pastikan Firebase sudah siap
        if (!auth || !database) {
            console.log('Security: Initializing Firebase...');
            await initAuth();
        }

        const user = auth.currentUser;
        if (!user) {
            console.warn('Security: No user found, redirecting...');
            window.location.href = 'login.html';
            return false;
        }

        // Cek apakah akun masih aktif dengan Timeout 3 detik agar tidak "macet"
        const tokenPromise = user.getIdToken(true);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
        );

        try {
            await Promise.race([tokenPromise, timeoutPromise]);
            console.log('Security: Token refreshed.');
        } catch (e) {
            console.warn('Security: Token check timeout/error, continuing anyway for UX.');
        }

        // Cek apakah sesi di DB masih milik kita
        const localSid = localStorage.getItem('fb_session_id');
        const sessionRef = database.ref('sessions/' + user.uid);
        const snapshot = await sessionRef.get();
        const latestSessionId = snapshot.val();
        
        console.log('Security: Local SID:', localSid, 'Remote SID:', latestSessionId);

        if (latestSessionId && localSid && latestSessionId !== localSid) {
            console.error('Security: Session mismatch! Kicking...');
            // Paksa login ulang untuk sinkronisasi sesi
            window.location.href = 'login.html';
            return false; 
        }

        console.log('Security: Session valid.');
        return true;
    } catch (error) {
        console.error('Security: Critical Session Check Error:', error);
        // Jika error sistem, biarkan lanjut agar tidak macet total
        return true; 
    }
}

// Update UI (Profile Dropdown, etc.)
function updateUIForUser(user) {
    const profileContainer = document.getElementById('user-profile');
    if (profileContainer) {
        profileContainer.innerHTML = `
            <div class="user-info" onclick="toggleUserDropdown()">
                <div class="user-avatar">
                    <span class="material-icons-round">account_circle</span>
                </div>
                <div class="user-details">
                    <span class="user-email">${user.email}</span>
                </div>
                <span class="material-icons-round">expand_more</span>
            </div>
            <div id="user-dropdown" class="user-dropdown hidden">
                <div class="dropdown-item" onclick="logout()">
                    <span class="material-icons-round">logout</span> Logout
                </div>
            </div>
        `;
    }
}

window.toggleUserDropdown = () => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

// Initialize when scripts are loaded
document.addEventListener('DOMContentLoaded', initAuth);

// Export functions to window
window.authApp = {
    login,
    logout,
    logActivity,
    checkSession
};
