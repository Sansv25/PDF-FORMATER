/**
 * FIREBASE CONFIGURATION
 */

const firebaseConfig = {
    apiKey: "AIzaSyDwGVNWIqXcb7nJQ6nM-ZuzVn-MDM6f0aw",
    authDomain: "onlinesql-8888b.firebaseapp.com",
    databaseURL: "https://onlinesql-8888b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "onlinesql-8888b",
    storageBucket: "onlinesql-8888b.firebasestorage.app",
    messagingSenderId: "343300022137",
    appId: "1:343300022137:web:d83b79c10a8c21d79a19a8",
    measurementId: "G-3JXSCKEBFY"
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
}
