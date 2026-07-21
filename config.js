// Konfigurasi & Variabel Global
const API_KEY = "key_5fcfe74555ca411c";
const AUTO_SAVE_KEY = "zaxxy_product_form_draft";
const INVOICE_STORAGE_KEY = "zaxxy_active_invoice";
const LOGIN_SESSION_KEY = "zaxxy_admin_session";

let adminNotificationEmail = "zaxxyxml@gmail.com"; 
let enableAntiInspect = true;

// Inisialisasi Firebase Database
const firebaseConfig = {
    apiKey: "AIzaSyAM1ZNUdgDsxG0a4AE4_3voeIM9UTgXs5w",
    authDomain: "cbt-key-suite.firebaseapp.com",
    databaseURL: "https://cbt-key-suite-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "cbt-key-suite.firebasestorage.app",
    messagingSenderId: "646851767976",
    appId: "1:646851767976:web:e65faf7f052caadcef5c9d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// State Aplikasi Global
let productsList = [];
let liveLogsList = [];
let dynamicCategories = ["Browser Ujian", "Tools & Bypass", "Premium Mod"];
let brandClickCounter = 0;
let brandClickTimer = null;
let currentSelectedProduct = null;
let currentSelectedVariantIndex = null; 
let activeDiscountPercentage = 0;
let activePromoCode = "";
let finalPayableAmount = 0;
let invoicePollingInterval = null;
let qrisCountdownTimer = null;

// Proteksi Anti-Inspect
(function() {
    const block = () => {
        setInterval(() => {
            if (enableAntiInspect) {
                (function() {}).constructor("debugger")();
            }
        }, 50);
    };
    try { block(); } catch (e) {}
})();
