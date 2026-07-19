/**
 * Zaxxy Store - Advanced Security Core Logic
 * Mengurus otentikasi tersembunyi, anti-inspect, dan visibilitas dashboard.
 */

// Konfigurasi Parameter Keamanan Global
let enableAntiInspect = true;

// 1. Loop Proteksi Anti-Inspect Efek Debugger
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

// 2. Proteksi Event Listener (Klik Kanan & Shortcut F12 / Inspect Element)
document.addEventListener('contextmenu', e => {
    if (enableAntiInspect) e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (!enableAntiInspect) return;
    if (e.keyCode == 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74)) || 
        (e.ctrlKey && e.keyCode == 85)) {
        e.preventDefault();
        return false;
    }
});

// 3. Engine Visibility Kontrol Pintu Masuk Dashboard di Navbar
function updateAdminNavButtons() {
    const desktopBtn = document.getElementById("nav-admin-btn");
    const mobileBtn = document.getElementById("mobile-nav-admin-btn");
    
    if (!desktopBtn || !mobileBtn) return;

    if (localStorage.getItem(LOGIN_SESSION_KEY) === "true") {
        desktopBtn.className = "hidden md:flex bg-purple-600/10 hover:bg-purple-600/20 px-4 py-2 rounded-xl text-xs font-bold text-purple-400 hover:text-purple-300 transition-all border border-purple-500/20 hover:border-purple-500/40 items-center gap-1.5 cursor-pointer shadow-sm";
        mobileBtn.className = "w-full bg-purple-600/10 hover:bg-purple-600/20 py-3 rounded-xl text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/20 flex items-center justify-center gap-2 cursor-pointer";
    } else {
        desktopBtn.className = "hidden";
        mobileBtn.className = "hidden";
    }
}

// 4. Handler Akses Validasi Awal Pintu Masuk
function handleAdminDashboardAccess() {
    if (localStorage.getItem(LOGIN_SESSION_KEY) === "true") {
        openAdminDashboardPanel();
    } else {
        openAdminLoginModal();
    }
}

// 5. Eksekusi Verifikasi Login Akses Key (Base64)
function submitAdminLogin() {
    const clientInputKey = document.getElementById("login-key").value.trim();
    if (btoa(clientInputKey) === "MTc5MTA=") { // Key: 17910
        if (document.getElementById("login-remember").checked) {
            localStorage.setItem(LOGIN_SESSION_KEY, "true");
        }
        updateAdminNavButtons();
        closeAdminLoginModal();
        openAdminDashboardPanel();
    } else {
        showCustomToast("Akses Ditolak", "Access Key Salah!", "error");
    }
}

// 6. Sesi Logout Admin
function logoutAdminDashboard() {
    localStorage.removeItem(LOGIN_SESSION_KEY);
    updateAdminNavButtons();
    const adminPanel = document.getElementById("view-admin-panel");
    adminPanel.classList.add("opacity-0");
    setTimeout(() => {
        adminPanel.classList.add("hidden");
        document.getElementById("view-store-panel").classList.remove("hidden");
    }, 300);
    showCustomToast("Logged Out", "Sesi admin ditutup.", "info");
}

// 7. Pemicu Rahasia (Secret Triple Click) Pada Brand Logo
document.addEventListener("DOMContentLoaded", () => {
    const trigger = document.getElementById("brand-logo-trigger");
    if (trigger) {
        trigger.addEventListener("click", () => {
            brandClickCounter++;
            clearTimeout(brandClickTimer);
            if (brandClickCounter === 3) {
                brandClickCounter = 0;
                handleAdminDashboardAccess();
            } else {
                brandClickTimer = setTimeout(() => { brandClickCounter = 0; }, 1200);
            }
        });
    }
    // Validasi navbar button saat script termuat
    setTimeout(updateAdminNavButtons, 200);
});
