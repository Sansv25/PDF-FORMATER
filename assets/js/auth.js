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
            console.log('User is logged in:', user.email);
            
            // Check for Single Session
            const currentSessionId = getSessionId();
            const sessionRef = database.ref('sessions/' + user.uid);
            
            // Listen for session changes
            sessionRef.on('value', (snapshot) => {
                const activeSessionId = snapshot.val();
                if (activeSessionId && activeSessionId !== currentSessionId) {
                    console.warn('Another device logged in. Logging out...');
                    alert('Akun Anda telah login di perangkat lain. Anda akan dikeluarkan.');
                    logout();
                }
            });

            if (isLoginPage) {
                window.location.href = 'index.html';
            }
            updateUIForUser(user);
        } else {
            console.log('User is logged out');
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
    let sid = localStorage.getItem('app_session_id');
    if (!sid) {
        sid = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('app_session_id', sid);
    }
    return sid;
}

// Login Function
async function login(email, password) {
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = result.user;
        
        // Update Session ID in Database upon login
        const newSessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('app_session_id', newSessionId);
        await database.ref('sessions/' + user.uid).set(newSessionId);
        
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
    logout
};
