/**
 * Zaxxy Store - Hardened Security Core Logic
 * Anti-Inspect Mobile (Eruda), Debugger Loop, & Obfuscation Target.
 */

let enableAntiInspect = true;

// 1. BOMBASTIS DETEKSI ERUDA & MOBILE INSPECTOR DI INJEKSI
(function() {
    const detectInspector = () => {
        if (!enableAntiInspect) return;

        // Cek apakah ada objek Eruda di window, atau ada komponen DOM Eruda yang terinjeksi
        if (
            window.eruda || 
            document.getElementById('eruda') || 
            document.querySelector('.eruda-container') ||
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__ // Proteksi tambahan devtools umum
        ) {
            // Tendang balik jika terdeteksi mencoba inspect
            document.body.innerHTML = `
                <div style="background:#030014;color:#ef4444;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;text-align:center;padding:20px;">
                    <h1 style="font-size:24px;margin-bottom:10px;">Security Violation</h1>
                    <p style="color:#94a3b8;font-size:14px;">Third-party inspection tools are strictly prohibited on this platform.</p>
                </div>
            `;
            window.location.href = "about:blank";
        }
    };
    
    // Jalankan pemeriksaan setiap 100 milidetik secara agresif
    setInterval(detectInspector, 100);
})();

// 2. Loop Proteksi Anti-Inspect Efek Debugger Otomatis
(function() {
    const block = () => {
        setInterval(() => {
            if (enableAntiInspect) {
                (function() {}).constructor("debugger")();
            }
        }, 20); // Dipercepat menjadi 20ms agar browser inspect freeze
    };
    try { block(); } catch (e) {}
})();

// 3. Proteksi Klik Kanan & Shortcut F12 / Inspect Element standard
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

// 4. Engine Visibility Kontrol Pintu Masuk Dashboard (Tetap Sama)
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

function handleAdminDashboardAccess() {
    if (localStorage.getItem(LOGIN_SESSION_KEY) === "true") {
        openAdminDashboardPanel();
    } else {
        openAdminLoginModal();
    }
}

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

document.addEventListener("DOMContentLoaded", () => {
    // Validasi awal saat script dimuat
    setTimeout(updateAdminNavButtons, 200);
});
