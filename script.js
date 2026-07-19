/**
 * Zaxxy Store - Main Catalog & Core Logic Engine
 */

// Core Security Engine (Anti-Inspect Debugger Tool)
let enableAntiInspect = true;
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

// Global Configuration & Constants (Aman: API_KEY sudah dipindah ke Backend)
const AUTO_SAVE_KEY = "zaxxy_product_form_draft";
const INVOICE_STORAGE_KEY = "zaxxy_active_invoice";
const LOGIN_SESSION_KEY = "zaxxy_admin_session";

let adminNotificationEmail = "zaxxyxml@gmail.com"; 

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

// Currency Formatter
function formatRupiahElement(element) {
    let number_string = element.value.replace(/[^,\d]/g, '').toString(),
        split   		= number_string.split('Custom'),
        sisa     		= split[0].length % 3,
        rupiah     		= split[0].substr(0, sisa),
        ribuan     		= split[0].substr(sisa).match(/\d{3}/gi);

    if(ribuan){
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    element.value = rupiah ? 'Rp ' + rupiah : '';
}

// UI Controls
function toggleMobileMenu() {
    const dropdown = document.getElementById("mobile-menu-dropdown");
    const icon = document.querySelector("#mobile-menu-btn i");
    if (dropdown.classList.contains("hidden")) {
        dropdown.classList.remove("hidden");
        icon.className = "fa-solid fa-xmark text-lg text-fuchsia-400";
    } else {
        dropdown.classList.add("hidden");
        icon.className = "fa-solid fa-bars text-lg";
    }
}

function updateAdminNavButtons() {
    const desktopBtn = document.getElementById("nav-admin-btn");
    const mobileBtn = document.getElementById("mobile-nav-admin-btn");
    
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

function switchAdminTab(targetTabId, currentButtonElement) {
    document.querySelectorAll('.admin-tab-content').forEach(contentBlock => {
        contentBlock.classList.replace('block', 'hidden');
    });
    document.getElementById(`tab-${targetTabId}`).classList.replace('hidden', 'block');
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.className = "admin-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5 font-semibold text-xs transition-all cursor-pointer duration-300";
    });
    currentButtonElement.className = "admin-tab-btn flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-purple-500/30 text-purple-300 font-bold text-xs transition-all cursor-pointer duration-300";
}

// Fetch Logic (Sudah Diperbaiki: URL Bersih Tanpa Membocorkan API_KEY ke Fitur Inspect)
async function secureFetchWithRetry(actionType, params = {}, retries = 3, delay = 2000) {
    let localApiUrl = `/api/invoice?type=${actionType}`;
    Object.keys(params).forEach(key => {
        localApiUrl += `&${key}=${encodeURIComponent(params[key])}`;
    });

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(localApiUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error("Gateway Timeout.");
}

// Lifecycle Init listeners
document.addEventListener("DOMContentLoaded", () => {
    bindSalesCounterListener();
    bindFirebaseCategoriesListener();
    bindFirebaseRealtimeProductListener();
    bindFirebaseRealtimePromoListener();
    bindSystemControlListeners(); 
    initAutoSaveEngine();
    checkActiveInvoiceOnLoad(); 
    updateAdminNavButtons();

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
});

function bindFirebaseCategoriesListener() {
    db.ref('categories').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            dynamicCategories = Object.values(data);
        } else {
            db.ref('categories').set(dynamicCategories);
        }
        updateCategoryDropdowns();
    });
}

function updateCategoryDropdowns() {
    const userFilter = document.getElementById("user-filter-category");
    const admSelect = document.getElementById("adm-prod-category");
    const currentUserVal = userFilter ? userFilter.value : "all";
    const currentAdmVal = admSelect ? admSelect.value : "";

    if (userFilter) {
        userFilter.innerHTML = `<option value="all">Semua Kategori</option>`;
        dynamicCategories.forEach(cat => {
            userFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        userFilter.value = currentUserVal;
    }

    if (admSelect) {
        admSelect.innerHTML = "";
        dynamicCategories.forEach(cat => {
            admSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        if (currentAdmVal && dynamicCategories.includes(currentAdmVal)) {
            admSelect.value = currentAdmVal;
        }
    }
}

async function addNewCustomCategory() {
    const inputField = document.getElementById("adm-new-category");
    const newCat = inputField.value.trim();
    if (!newCat) {
        showCustomToast("Gagal", "Nama kategori tidak boleh kosong.", "error");
        return;
    }
    if (dynamicCategories.includes(newCat)) {
        showCustomToast("Gagal", "Kategori sudah terdaftar.", "error");
        return;
    }

    try {
        const updatedList = [...dynamicCategories, newCat];
        await db.ref('categories').set(updatedList);
        showCustomToast("Berhasil", `Kategori "${newCat}" ditambahkan!`, "success");
        inputField.value = "";
    } catch (e) {
        showCustomToast("Gagal", "Terjadi kesalahan database.", "error");
    }
}

function toggleStockInputState() {
    const isUnlimited = document.getElementById("adm-prod-stock-unlimited").checked;
    const stockInput = document.getElementById("adm-prod-stock");
    if (isUnlimited) {
        stockInput.value = "";
        stockInput.disabled = true;
        stockInput.classList.add("opacity-30");
    } else {
        stockInput.disabled = false;
        stockInput.classList.remove("opacity-30");
    }
}

function addVariantRow(name = '', stock = '', isUnlimited = false, price = '') {
    const container = document.getElementById("adm-variants-list");
    const rowId = "var-row-" + Date.now() + Math.random().toString(36).substr(2, 5);
    const row = document.createElement("div");
    row.className = "flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 bg-[#120e2e]/90 p-4 rounded-xl border border-white/5 variant-data-row shadow-inner relative";
    row.id = rowId;
    
    row.innerHTML = `
        <div class="col-span-12 sm:col-span-4">
            <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1 sm:hidden">Nama Varian</label>
            <input type="text" placeholder="Nama Varian (contoh: Full Akun)" value="${name}" class="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 var-item-name">
        </div>
        <div class="col-span-6 sm:col-span-3">
            <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1 sm:hidden">Harga Kustom (Rp)</label>
            <input type="text" placeholder="Harga Kustom" value="${price}" oninput="formatRupiahElement(this)" class="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-purple-500 var-item-price">
        </div>
        <div class="col-span-3 sm:col-span-2">
            <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1 sm:hidden">Stok</label>
            <input type="number" placeholder="Stok" value="${stock}" ${isUnlimited ? 'disabled class="w-full bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 opacity-40 var-item-stock"' : 'class="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 var-item-stock"'} min="0">
        </div>
        <div class="col-span-3 sm:col-span-2 flex items-center justify-center pt-4 sm:pt-0">
            <label class="flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-lg border border-white/5 w-full justify-center">
                <input type="checkbox" ${isUnlimited ? 'checked' : ''} onchange="toggleVariantRowStock(this)" class="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-purple-600 accent-purple-600 var-item-unlimited">
                <span class="font-bold text-xs text-purple-400">∞</span>
            </label>
        </div>
        <div class="col-span-12 sm:col-span-1 flex justify-end items-center pt-2 sm:pt-0">
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="w-full sm:w-auto bg-rose-500/10 sm:bg-transparent text-rose-400 p-2 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer text-center"><i class="fa-solid fa-trash-can text-xs"></i><span class="inline sm:hidden ml-2 text-xs font-bold">Hapus</span></button>
        </div>
    `;
    container.appendChild(row);
}

function toggleVariantRowStock(checkbox) {
    const row = checkbox.closest(".variant-data-row");
    const stockInput = row.querySelector(".var-item-stock");
    if (checkbox.checked) {
        stockInput.value = "";
        stockInput.disabled = true;
        stockInput.classList.add("opacity-40", "bg-slate-950/40");
        stockInput.classList.remove("bg-slate-950");
    } else {
        stockInput.disabled = false;
        stockInput.classList.remove("opacity-40", "bg-slate-950/40");
        stockInput.classList.add("bg-slate-950");
    }
}

function closeAdminDashboardView() {
    const adminPanel = document.getElementById("view-admin-panel");
    adminPanel.classList.add("opacity-0");
    setTimeout(() => {
        adminPanel.classList.add("hidden");
        document.getElementById("view-store-panel").classList.remove("hidden");
    }, 300);
    showCustomToast("Kembali ke Toko", "Beralih ke tampilan halaman utama katalog pembeli.", "info");
}

function bindSystemControlListeners() {
    db.ref('system_control/broadcast').on('value', (snap) => {
        const data = snap.val() || { active: false, text: "" };
        const banner = document.getElementById("user-broadcast-banner");
        const textNode = document.getElementById("user-broadcast-text");
        const admStatus = document.getElementById("adm-broadcast-status");
        const admText = document.getElementById("adm-broadcast-text");

        if (data.active && data.text) {
            banner.classList.remove("hidden");
            textNode.innerText = data.text;
        } else {
            banner.classList.add("hidden");
        }

        if(document.getElementById("view-admin-panel").classList.contains("hidden") === false) {
            if(admStatus && !admStatus.dataset.focused) admStatus.value = String(data.active);
            if(admText && !admText.dataset.focused) admText.value = data.text;
        }
    });

    db.ref('system_control/config').on('value', (snap) => {
        const data = snap.val() || {};
        adminNotificationEmail = data.email || "zaxxyxml@gmail.com";
        enableAntiInspect = data.antiInspect !== undefined ? data.antiInspect : true;

        document.querySelectorAll(".user-cs-btn-nodes").forEach(btn => {
            if (data.wa_link) {
                btn.href = data.wa_link;
                btn.classList.remove("hidden");
                btn.classList.add("flex");
            } else {
                btn.classList.add("hidden");
            }
        });

        if(document.getElementById("view-admin-panel").classList.contains("hidden") === false) {
            document.getElementById("adm-sys-email").value = adminNotificationEmail;
            document.getElementById("adm-sys-wa").value = data.wa_link || "";
            document.getElementById("adm-sys-antiinspect").value = String(enableAntiInspect);
        }
    });

    db.ref('orders_log').orderByChild('timestamp').on('value', (snap) => {
        const data = snap.val();
        liveLogsList = [];
        let totalRevenue = 0;
        
        if (data) {
            Object.keys(data).forEach(key => {
                const order = data[key];
                totalRevenue += parseInt(order.amount) || 0;
                liveLogsList.unshift({ id: key, ...order });
            });
        }
        document.getElementById("adm-analytics-revenue").innerText = "Rp " + totalRevenue.toLocaleString('id-ID');
        filterAdminLogsTable();
    });
}

async function saveGlobalBroadcastConfig() {
    const isActive = document.getElementById("adm-broadcast-status").value === "true";
    const textContent = document.getElementById("adm-broadcast-text").value.trim();

    if (isActive && !textContent) {
        showCustomToast("Gagal kirim", "Isi pesan pengumuman tidak boleh kosong.", "error");
        return;
    }
    try {
        await db.ref('system_control/broadcast').set({ active: isActive, text: textContent });
        showCustomToast("Berhasil Synchronize", "Pengumuman disebarkan secara global.", "success");
    } catch (e) {
        showCustomToast("Gagal", "Terjadi kegagalan unggah server.", "error");
    }
}

async function saveAdvancedSystemConfig() {
    const email = document.getElementById("adm-sys-email").value.trim() || "zaxxyxml@gmail.com";
    const wa_link = document.getElementById("adm-sys-wa").value.trim();
    const antiInspect = document.getElementById("adm-sys-antiinspect").value === "true";

    try {
        await db.ref('system_control/config').set({ email, wa_link, antiInspect });
        showCustomToast("Sistem Diperbarui", "Konfigurasi sistem cloud berhasil disinkronkan.", "success");
    } catch (e) {
        showCustomToast("Gagal", "Akses database gagal.", "error");
    }
}

function initAutoSaveEngine() {
    const fields = ["adm-prod-name", "adm-prod-price", "adm-prod-img", "adm-prod-features", "adm-prod-link", "adm-prod-stock"];
    const badge = document.getElementById("draft-badge");
    const savedDraft = localStorage.getItem(AUTO_SAVE_KEY);
    
    if (savedDraft) {
        try {
            const draft = JSON.parse(savedDraft);
            if (!draft.id) {
                fields.forEach(fId => {
                    if (draft[fId] !== undefined) {
                        const inputEl = document.getElementById(fId);
                        inputEl.value = draft[fId];
                        if (fId === "adm-prod-price") formatRupiahElement(inputEl);
                    }
                });
                if (badge) badge.classList.remove("hidden");
            }
        } catch (e) {}
    }

    fields.forEach(fId => {
        document.getElementById(fId).addEventListener("input", () => {
            if (document.getElementById("adm-prod-id").value) return;
            const draft = {};
            let hasContent = false;
            fields.forEach(id => {
                const val = document.getElementById(id).value;
                draft[id] = val;
                if (val.trim() !== "") hasContent = true;
            });
            if (hasContent) {
                localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
                if (badge) badge.classList.remove("hidden");
            } else {
                clearAutoSaveDraft();
            }
        });
    });
}

function clearAutoSaveDraft() {
    localStorage.removeItem(AUTO_SAVE_KEY);
    const badge = document.getElementById("draft-badge");
    if (badge) badge.classList.add("hidden");
}

// Secret Trigger Click Logic
document.getElementById("brand-logo-trigger").addEventListener("click", () => {
    brandClickCounter++;
    clearTimeout(brandClickTimer);
    if (brandClickCounter === 3) {
        brandClickCounter = 0;
        handleAdminDashboardAccess();
    } else {
        brandClickTimer = setTimeout(() => { brandClickCounter = 0; }, 1200);
    }
});

function openAdminLoginModal() {
    document.getElementById("login-key").value = "";
    document.getElementById("login-remember").checked = false;
    document.getElementById("admin-login-modal").classList.remove("hidden");
}

function closeAdminLoginModal() { document.getElementById("admin-login-modal").classList.add("hidden"); }

function submitAdminLogin() {
    const clientInputKey = document.getElementById("login-key").value.trim();
    if (btoa(clientInputKey) === "MTc5MTA=") {
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

function openAdminDashboardPanel() {
    document.getElementById("view-store-panel").classList.add("hidden");
    const adminPanel = document.getElementById("view-admin-panel");
    adminPanel.classList.remove("hidden");
    setTimeout(() => { adminPanel.classList.remove("opacity-0"); }, 50);
    
    document.getElementById("nav-stat-products").innerText = productsList.length;
    db.ref('sales_count').once('value', (snap) => {
        const count = snap.val() || 0;
        document.getElementById("nav-stat-sales").innerText = count;
        document.getElementById("adm-analytics-count").innerText = count + " Trx";
    });
    showCustomToast("Akses Diterima", "Selamat datang di Admin Dashboard.", "success");
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

function toggleDiscountFieldState() {
    const type = document.getElementById("adm-select-type").value;
    const row = document.getElementById("adm-row-discount");
    if (type === "custom") {
        row.classList.remove("hidden");
    } else {
        row.classList.add("hidden");
        document.getElementById("adm-input-discount").value = "";
    }
}

function bindSalesCounterListener() {
    db.ref('sales_count').on('value', (snapshot) => {
        const count = snapshot.val() || 0;
        document.querySelectorAll(".sales-count-nodes").forEach(node => {
            node.innerText = count;
        });
        const navStat = document.getElementById("nav-stat-sales");
        if (navStat) navStat.innerText = count;
        const analyticCount = document.getElementById("adm-analytics-count");
        if (analyticCount) analyticCount.innerText = count + " Trx";
    });
}

function bindFirebaseRealtimeProductListener() {
    db.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        productsList = [];
        if (data) {
            Object.keys(data).forEach(key => {
                const item = data[key];
                productsList.push({
                    id: key,
                    name: item.name,
                    price: Math.max(0, parseInt(item.price) || 0), 
                    status: item.status || "active",
                    image: item.image || "",
                    category: item.category || "Browser Ujian",
                    badge: item.badge || "normal",
                    features: Array.isArray(item.features) ? item.features : [],
                    link: item.link || "#",
                    stock: item.stock !== undefined ? parseInt(item.stock) : -1,
                    variants: Array.isArray(item.variants) ? item.variants : [] 
                });
            });
        }
        document.getElementById("nav-stat-products").innerText = productsList.length;
        filterAdminProductsTable(); 
    });
}

function filterAdminProductsTable() {
    const query = document.getElementById("adm-search-product").value.toLowerCase();
    const statusFilter = document.getElementById("adm-filter-status-prod").value;
    
    const filtered = productsList.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderAdminProductsTableHTML(filtered);
    filterUserCatalog();
}

function filterUserCatalog() {
    const searchQuery = document.getElementById("user-search-catalog").value.toLowerCase();
    const categoryFilter = document.getElementById("user-filter-category").value;

    const filtered = productsList.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchQuery) || p.features.some(f => f.toLowerCase().includes(searchQuery));
        const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    renderUserCatalogHTML(filtered);
}

function renderAdminProductsTableHTML(list) {
    const tbody = document.getElementById("admin-product-table-body");
    tbody.innerHTML = "";

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-500 text-xs font-medium">Tidak ada produk ditemukan.</td></tr>`;
        return;
    }

    list.forEach(productObj => {
        let statusBadge = `<span class="px-2.5 py-1 rounded-md text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">Aktif</span>`;
        
        if (productObj.variants && productObj.variants.length > 0) {
            const allOut = productObj.variants.every(v => v.stock !== -1 && v.stock <= 0);
            if (allOut) statusBadge = `<span class="px-2.5 py-1 rounded-md text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">Stok Habis</span>`;
        } else if (productObj.stock !== -1 && productObj.stock <= 0) {
            statusBadge = `<span class="px-2.5 py-1 rounded-md text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">Stok Habis</span>`;
        }
        
        if (productObj.status === "maintenance") {
            statusBadge = `<span class="px-2.5 py-1 rounded-md text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase tracking-wider">Perbaikan</span>`;
        }

        let stockLabel = "";
        if (productObj.variants && productObj.variants.length > 0) {
            stockLabel = `<span class="bg-purple-500/10 text-purple-300 px-2 py-0.5 border border-purple-500/20 rounded font-semibold">${productObj.variants.length} Varian Suite</span>`;
        } else {
            stockLabel = productObj.stock === -1 ? "Bebas (∞)" : `${productObj.stock} pcs`;
        }

        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/5 transition-colors text-xs sm:text-sm border-b border-white/5";
        tr.innerHTML = `
            <td class="py-4 px-4 max-w-[220px]">
                <div class="font-bold text-slate-100 text-sm truncate">${productObj.name}</div> 
                <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span class="text-slate-500">${productObj.category}</span>
                    <span class="text-slate-600">|</span>
                    <span>Stok: ${stockLabel}</span>
                </div>
            </td>
            <td class="py-4 px-4 text-emerald-400 font-bold text-sm">Rp ${productObj.price.toLocaleString('id-ID')}</td>
            <td class="py-4 px-4">${statusBadge}</td>
            <td class="py-4 px-4 text-right space-x-1 whitespace-nowrap">
                <button onclick="editProductData('${productObj.id}')" class="text-cyan-400 p-2 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 rounded-xl transition-all cursor-pointer" title="Edit Data"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteProductFromFirebase('${productObj.id}')" class="text-rose-400 p-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer" title="Hapus Permanen"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAdminLogsTable() {
    const query = document.getElementById("adm-search-logs").value.toLowerCase();
    const filtered = liveLogsList.filter(log => {
        return log.invoice_id.toLowerCase().includes(query) || log.product_name.toLowerCase().includes(query);
    });

    const tableBody = document.getElementById("admin-live-logs-table");
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500 italic">Data tidak ditemukan...</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";
    filtered.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/5 transition-colors border-b border-white/5";
        tr.innerHTML = `
            <td class="py-3.5 px-5 font-mono text-purple-400 max-w-[120px] truncate font-bold">${item.invoice_id}</td>
            <td class="py-3.5 px-5 text-slate-400 font-normal">${item.date || '-'}</td>
            <td class="py-3.5 px-5 text-white font-bold truncate max-w-[200px]">${item.product_name}</td>
            <td class="py-3.5 px-5 text-emerald-400 font-black">Rp ${parseInt(item.amount).toLocaleString('id-ID')}</td>
            <td class="py-3.5 px-5 text-right text-slate-400"><span class="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 font-bold uppercase tracking-wide">${item.type || 'QRIS'}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

function exportProductsToJSON() {
    if (productsList.length === 0) {
        showCustomToast("Gagal", "Tidak ada data produk untuk diekspor.", "error");
        return;
    }
    const cleanList = productsList.map(({id, ...rest}) => rest);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zaxxy_products_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showCustomToast("Ekspor Sukses", "File cadangan JSON berhasil diunduh.", "success");
}

function importProductsFromJSON(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0) return;

    const reader = new FileReader();
    reader.onload = async function() {
        try {
            const parsedData = JSON.parse(reader.result);
            if (!parsedData || !Array.isArray(parsedData)) throw new Error("Format JSON harus berupa Array.");
            
            if (confirm(`Menemukan ${parsedData.length} produk di dalam file. Impor data ini ke Firebase sekarang?`)) {
                for (const prod of parsedData) {
                    if (prod.name && prod.link) {
                        await db.ref('products').push({
                            name: prod.name,
                            price: parseInt(prod.price) || 0,
                            status: prod.status || "active",
                            image: prod.image || "",
                            category: prod.category || "Browser Ujian",
                            badge: prod.badge || "normal",
                            link: prod.link,
                            features: Array.isArray(prod.features) ? prod.features : [],
                            stock: prod.stock !== undefined ? parseInt(prod.stock) : -1,
                            variants: Array.isArray(prod.variants) ? prod.variants : null 
                        });
                    }
                }
                showCustomToast("Impor Berhasil", `${parsedData.length} Produk dimigrasikan.`, "success");
                input.value = ""; 
            }
        } catch (e) {
            showCustomToast("Impor Gagal", "Struktur JSON tidak sesuai standar.", "error");
        }
    };
    reader.readAsText(input.files[0]);
}

async function submitProductToFirebase() {
    const id = document.getElementById("adm-prod-id").value;
    const name = document.getElementById("adm-prod-name").value.trim();
    const category = document.getElementById("adm-prod-category").value;
    const badge = document.getElementById("adm-prod-badge").value;
    const priceRaw = document.getElementById("adm-prod-price").value.replace(/[^0-9]/g, "");
    const price = Math.max(0, parseInt(priceRaw) || 0);
    const status = document.getElementById("adm-prod-status").value;
    const image = document.getElementById("adm-prod-img").value.trim();
    const link = document.getElementById("adm-prod-link").value.trim();
    const featuresRaw = document.getElementById("adm-prod-features").value;
    const isUnlimited = document.getElementById("adm-prod-stock-unlimited").checked;
    const stock = isUnlimited ? -1 : (parseInt(document.getElementById("adm-prod-stock").value) || 0);

    const variantRows = document.querySelectorAll(".variant-data-row");
    let variants = [];
    variantRows.forEach(row => {
        const vName = row.querySelector(".var-item-name").value.trim();
        const vPriceRaw = row.querySelector(".var-item-price").value.replace(/[^0-9]/g, "");
        const vPrice = parseInt(vPriceRaw) || 0; 
        const vUnlimited = row.querySelector(".var-item-unlimited").checked;
        const vStock = vUnlimited ? -1 : (parseInt(row.querySelector(".var-item-stock").value) || 0);
        if (vName) {
            variants.push({ name: vName, stock: vStock, price: vPrice });
        }
    });

    if (!name || !price || !link) {
        showCustomToast("Input Salah", "Mohon lengkapi data produk dasar.", "error");
        return;
    }

    let computedStatus = status;
    if (variants.length > 0) {
        const allOut = variants.every(v => v.stock !== -1 && v.stock <= 0);
        if (allOut) computedStatus = "out_of_stock";
    } else {
        if (!isUnlimited && stock <= 0) {
            computedStatus = "out_of_stock";
        }
    }

    const features = featuresRaw.split('\n').map(f => f.trim()).filter(f => f.length > 0);
    const productTargetRef = id ? db.ref('products/' + id) : db.ref('products').push();

    try {
        await productTargetRef.set({ 
            name, price, status: computedStatus, image, link, features, category, badge, stock,
            variants: variants.length > 0 ? variants : null 
        });
        showCustomToast("Berhasil", "Katalog berhasil diperbarui.", "success");
        clearAutoSaveDraft();
        resetProductForm();
    } catch (error) { showCustomToast("Error Firebase", "Akses ditolak database.", "error"); }
}

function editProductData(id) {
    const item = productsList.find(p => p.id === id);
    if (!item) return;

    document.getElementById("adm-prod-id").value = item.id;
    document.getElementById("adm-prod-name").value = item.name;
    document.getElementById("adm-prod-category").value = item.category;
    document.getElementById("adm-prod-badge").value = item.badge || "normal";
    
    const priceInput = document.getElementById("adm-prod-price");
    priceInput.value = String(item.price);
    formatRupiahElement(priceInput);

    document.getElementById("adm-prod-status").value = item.status || "active";
    document.getElementById("adm-prod-img").value = item.image;
    document.getElementById("adm-prod-link").value = item.link;
    document.getElementById("adm-prod-features").value = item.features.join('\n');

    if (item.stock === -1) {
        document.getElementById("adm-prod-stock-unlimited").checked = true;
        document.getElementById("adm-prod-stock").value = "";
    } else {
        document.getElementById("adm-prod-stock-unlimited").checked = false;
        document.getElementById("adm-prod-stock").value = item.stock;
    }
    toggleStockInputState();

    document.getElementById("adm-variants-list").innerHTML = "";
    if (item.variants && Array.isArray(item.variants)) {
        item.variants.forEach(v => {
            let formattedPrice = (v.price && v.price > 0) ? String(v.price) : "";
            addVariantRow(v.name, v.stock === -1 ? '' : v.stock, v.stock === -1, formattedPrice);
            
            const lastRow = document.getElementById("adm-variants-list").lastChild;
            if(lastRow && formattedPrice) {
                const pInput = lastRow.querySelector(".var-item-price");
                if(pInput) formatRupiahElement(pInput);
            }
        });
    }

    document.getElementById("product-form-title").innerHTML = `<i class="fa-solid fa-pen-to-square text-cyan-400"></i> Edit Informasi Produk`;
    document.getElementById("btn-cancel-edit-prod").classList.remove("hidden");
    clearAutoSaveDraft();

    const prodTabBtn = document.querySelectorAll('.admin-tab-btn')[1];
    switchAdminTab('produk', prodTabBtn);
}

function resetProductForm() {
    document.getElementById("adm-prod-id").value = "";
    document.getElementById("adm-prod-name").value = "";
    if (dynamicCategories.length > 0) {
        document.getElementById("adm-prod-category").value = dynamicCategories[0];
    }
    document.getElementById("adm-prod-badge").value = "normal";
    document.getElementById("adm-prod-price").value = "";
    document.getElementById("adm-prod-status").value = "active";
    document.getElementById("adm-prod-img").value = "";
    document.getElementById("adm-prod-link").value = "";
    document.getElementById("adm-prod-features").value = "";
    document.getElementById("adm-prod-stock").value = "";
    document.getElementById("adm-prod-stock-unlimited").checked = false;
    toggleStockInputState();
    document.getElementById("adm-variants-list").innerHTML = "";
    document.getElementById("product-form-title").innerHTML = `<i class="fa-solid fa-square-plus text-purple-400"></i> Tambah Produk Baru`;
    document.getElementById("btn-cancel-edit-prod").classList.add("hidden");
    clearAutoSaveDraft();
}

async function deleteProductFromFirebase(id) {
    if (confirm("Hapus produk ini?")) {
        try {
            await db.ref('products/' + id).remove();
            showCustomToast("Dihapus", "Produk dibersihkan dari server.", "success");
            if (document.getElementById("adm-prod-id").value === id) resetProductForm();
        } catch (error) { showCustomToast("Gagal", "Gagal menghapus.", "error"); }
    }
}

const UXMixins = { fallbackImg: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" };

function renderUserCatalogHTML(listToRender = productsList) {
    const container = document.getElementById("catalog-container");
    container.innerHTML = "";
    
    if (listToRender.length === 0) {
        container.className = "block w-full text-center py-12 text-slate-500 text-sm";
        container.innerHTML = `<i class="fa-solid fa-store-slash text-3xl mb-3 block text-slate-600"></i> Tidak ada produk atau mod yang cocok.`;
        return;
    }

    container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center w-full px-2 max-w-6xl mx-auto";
    listToRender.forEach(product => {
        let statusRibbon = "";
        let buttonHTML = `
            <button onclick="openCheckoutModal('${product.id}')" class="w-full bg-purple-950/40 border border-purple-500/30 hover:bg-gradient-to-r hover:from-violet-600 hover:to-fuchsia-600 hover:border-transparent text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 text-xs sm:text-sm flex items-center justify-center gap-2 group cursor-pointer">
                <span>Beli Sekarang</span><i class="fa-solid fa-arrow-right text-xs transform group-hover:translate-x-1 transition-transform"></i>
            </button>
        `;

        if (product.badge === "hot") {
            statusRibbon = `<div class="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-600 border border-amber-400 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-md shadow-lg shadow-orange-600/30"><i class="fa-solid fa-fire mr-1"></i> HOT DEALS</div>`;
        } else if (product.badge === "best_seller") {
            statusRibbon = `<div class="absolute top-4 left-4 bg-gradient-to-r from-cyan-500 to-blue-600 border border-cyan-400 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-md shadow-lg shadow-cyan-600/30"><i class="fa-solid fa-trophy mr-1"></i> BEST SELLER</div>`;
        }

        let stockBadgeHTML = "";
        if (product.variants && product.variants.length > 0) {
            stockBadgeHTML = `<div class="text-[11px] text-purple-400 mb-3 flex items-center gap-1.5 bg-purple-500/5 px-2.5 py-1 rounded-lg border border-purple-500/10 w-fit"><i class="fa-solid fa-layer-group"></i> Tersedia ${product.variants.length} Varian Pilihan</div>`;
        } else {
            if (product.stock === -1) {
                stockBadgeHTML = `<div class="text-[11px] text-emerald-400 mb-3 flex items-center gap-1.5 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10 w-fit"><i class="fa-solid fa-infinity"></i> Stok: Tidak Terbatas</div>`;
            } else {
                stockBadgeHTML = `<div class="text-[11px] text-slate-300 mb-3 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 w-fit"><i class="fa-solid fa-boxes-stacked text-purple-400"></i> Sisa Stok: ${product.stock}</div>`;
            }
        }

        if (product.variants && product.variants.length > 0) {
            const allOut = product.variants.every(v => v.stock !== -1 && v.stock <= 0);
            if (allOut) product.status = "out_of_stock";
        } else if (product.stock !== -1 && product.stock <= 0) {
            product.status = "out_of_stock";
        }

        if (product.status === "out_of_stock") {
            statusRibbon = `<div class="absolute top-4 left-4 bg-amber-500 border border-amber-400 text-[#030014] font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-md shadow-lg"><i class="fa-solid fa-boxes-empty mr-1"></i> Stok Habis</div>`;
            buttonHTML = `<button disabled class="w-full bg-slate-900 border border-white/5 text-slate-500 font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed"><i class="fa-solid fa-ban text-xs"></i> <span>Stok Habis</span></button>`;
        } else if (product.status === "maintenance") {
            statusRibbon = `<div class="absolute top-4 left-4 bg-rose-600 border border-rose-500 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-md shadow-lg animate-pulse"><i class="fa-solid fa-screwdriver-wrench mr-1"></i> Perbaikan</div>`;
            buttonHTML = `<button disabled class="w-full bg-slate-900 border border-white/5 text-slate-500 font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed"><i class="fa-solid fa-gears text-xs animate-spin"></i> <span>Sedang Perbaikan</span></button>`;
        }

        const card = document.createElement("div");
        card.className = "glass rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 glow-purple flex flex-col w-full shadow-xl relative";
        
        if(product.badge !== "normal") {
            card.style.borderColor = product.badge === "hot" ? "rgba(249, 115, 22, 0.4)" : "rgba(6, 182, 212, 0.4)";
        }

        card.innerHTML = `
            <div class="relative w-full aspect-square bg-slate-950 overflow-hidden border-b border-purple-500/10">
                <img src="${product.image || UXMixins.fallbackImg}" alt="${product.name}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" onerror="this.src='${UXMixins.fallbackImg}'">
                ${statusRibbon}
                <div class="absolute top-4 right-4 bg-slate-955/80 backdrop-blur-md border border-purple-500/20 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-lg">
                    Rp ${product.price.toLocaleString('id-ID')}
                </div>
            </div>
            <div class="p-5 sm:p-6 flex flex-col flex-1 justify-between bg-slate-950/20">
                <div>
                    <span class="text-[10px] uppercase tracking-wider font-bold text-violet-400 block mb-1">${product.category}</span>
                    <h3 class="text-base font-bold text-white mb-2 leading-snug tracking-wide uppercase line-clamp-2">${product.name}</h3>
                    ${stockBadgeHTML}
                    <ul class="space-y-2.5 mb-6 text-xs sm:text-sm text-slate-300">
                        ${product.features.length > 0 ? product.features.map(f => `
                            <li class="flex items-start gap-2.5">
                                <i class="fa-solid fa-shield-halved text-purple-400 mt-0.5 shrink-0 text-xs"></i>
                                <span class="leading-tight font-medium tracking-wide break-words">${f}</span>
                            </li>
                        `).join('') : '<li class="text-slate-500 text-xs italic">Tidak ada deskripsi.</li>'}
                    </ul>
                </div>
                ${buttonHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

function bindFirebaseRealtimePromoListener() {
    db.ref('promo_codes').on('value', (snapshot) => {
        const promos = snapshot.val();
        const tbody = document.getElementById("admin-promo-table-body");
        tbody.innerHTML = "";

        if (!promos) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500 text-xs font-medium">Belum ada kode promo.</td></tr>`;
            return;
        }

        Object.keys(promos).forEach(key => {
            const data = promos[key];
            const tr = document.createElement("tr");
            tr.className = "hover:bg-white/5 transition-colors text-xs sm:text-sm border-b border-white/5";
            tr.innerHTML = `
                <td class="py-4 px-4 font-mono font-bold text-violet-400">${key}</td>
                <td class="py-4 px-4">
                    ${data.discount_percentage === 100 ? '<span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">Gratis 100%</span>' : `<span class="text-slate-300 font-medium">${data.discount_percentage}% Diskon</span>`}
                </td>
                <td class="py-4 px-4 text-slate-400">${data.expiry_date || '-'}</td>
                <td class="py-4 px-4 text-slate-400">${data.used_count || 0} / ${data.max_uses == 0 ? '∞' : data.max_uses}</td>
                <td class="py-4 px-4 text-right">
                    <button onclick="deletePromoFromFirebase('${key}')" class="text-rose-400 p-2 hover:bg-rose-500/10 rounded-lg cursor-pointer"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

async function submitNewPromoToFirebase() {
    const code = document.getElementById("adm-input-code").value.trim().toUpperCase();
    const type = document.getElementById("adm-select-type").value;
    const discountInput = document.getElementById("adm-input-discount").value;
    const expiry = document.getElementById("adm-input-expiry").value;
    const maxUses = Math.max(0, parseInt(document.getElementById("adm-input-maxuses").value) || 0);

    if (!code) {
        showCustomToast("Input Salah", "String kupon wajib diisi.", "error");
        return;
    }

    let discountValue = 100;
    if (type === "custom") {
        discountValue = Math.min(99, Math.max(1, parseInt(discountInput) || 0));
    }

    try {
        await db.ref('promo_codes/' + code).set({
            discount_percentage: discountValue,
            expiry_date: expiry || "2035-12-31",
            max_uses: maxUses,
            used_count: 0
        });
        showCustomToast("Berhasil", `Kupon ${code} diunggah.`, "success");
        document.getElementById("adm-input-code").value = "";
        document.getElementById("adm-input-discount").value = "";
        document.getElementById("adm-input-expiry").value = "";
        document.getElementById("adm-input-maxuses").value = "";
    } catch (error) { showCustomToast("Error Firebase", "Gagal menyimpan kupon.", "error"); }
}

async function deletePromoFromFirebase(codeKey) {
    if (confirm(`Hapus kupon ${codeKey}?`)) {
        try {
            await db.ref('promo_codes/' + codeKey).remove();
            showCustomToast("Dihapus", "Voucher dihapus.", "success");
        } catch (error) { showCustomToast("Gagal", "Gagal menghapus kupon.", "error"); }
    }
}

function openCheckoutModal(productId) {
    const rawProd = productsList.find(p => p.id === productId);
    if (!rawProd) return;

    if (rawProd.variants && rawProd.variants.length > 0) {
        const allOut = rawProd.variants.every(v => v.stock !== -1 && v.stock <= 0);
        if (allOut) {
            showCustomToast("Batal otomatis", "Maaf seluruh pilihan varian barang ini telah habis.", "error");
            return;
        }
    } else if (rawProd.stock !== -1 && rawProd.stock <= 0) {
        showCustomToast("Batal otomatis", "Stok barang ini telah habis.", "error");
        return;
    }

    if (rawProd.status && rawProd.status !== "active") {
        showCustomToast("Akses Ditutup", "Produk ini sedang tidak dapat dibeli.", "error");
        return;
    }

    currentSelectedProduct = JSON.parse(JSON.stringify(rawProd));
    currentSelectedProduct.baseOriginalPrice = rawProd.price;
    
    activeDiscountPercentage = 0;
    activePromoCode = "";
    finalPayableAmount = currentSelectedProduct.price;

    document.getElementById("modal-product-name").innerText = currentSelectedProduct.name;
    document.getElementById("modal-product-img").src = currentSelectedProduct.image || UXMixins.fallbackImg;
    document.getElementById("modal-product-img").onerror = function() { this.src = UXMixins.fallbackImg; };
    
    const variantRow = document.getElementById("modal-variant-row");
    const variantSelect = document.getElementById("modal-variant-select");
    
    if (currentSelectedProduct.variants && currentSelectedProduct.variants.length > 0) {
        variantRow.classList.remove("hidden");
        variantSelect.innerHTML = "";
        
        currentSelectedProduct.variants.forEach((v, index) => {
            let stockInfoText = v.stock === -1 ? "Bebas" : `Sisa ${v.stock}`;
            let isDisableStr = (v.stock !== -1 && v.stock <= 0) ? "disabled" : "";
            let displayPrice = (v.price && v.price > 0) ? v.price : currentSelectedProduct.baseOriginalPrice;
            
            variantSelect.innerHTML += `<option value="${index}" ${isDisableStr}>${v.name} - (Rp ${displayPrice.toLocaleString('id-ID')}) [${stockInfoText}]</option>`;
        });
        
        let firstValIndex = currentSelectedProduct.variants.findIndex(v => v.stock === -1 || v.stock > 0);
        variantSelect.value = firstValIndex !== -1 ? firstValIndex : 0;
        handleModalVariantChange();
    } else {
        variantRow.classList.add("hidden");
        currentSelectedVariantIndex = null;
        recalculateTotalPrices();
    }

    document.getElementById("checkout-step-details").classList.remove("hidden");
    document.getElementById("checkout-step-qris").classList.add("hidden");
    document.getElementById("checkout-step-success").classList.add("hidden");
    document.getElementById("checkout-step-expired").classList.add("hidden");

    const modal = document.getElementById("checkout-modal");
    const card = document.getElementById("modal-card");
    modal.classList.remove("hidden");
    setTimeout(() => {
        card.classList.remove("scale-95", "opacity-0");
        card.classList.add("scale-100", "opacity-100");
    }, 50);
}

function handleModalVariantChange() {
    const select = document.getElementById("modal-variant-select");
    const stockInfo = document.getElementById("modal-variant-stock-info");
    const index = parseInt(select.value);
    currentSelectedVariantIndex = index;
    
    const variant = currentSelectedProduct.variants[index];
    if (variant) {
        let computedActivePrice = (variant.price && variant.price > 0) ? variant.price : currentSelectedProduct.baseOriginalPrice;
        
        currentSelectedProduct.price = computedActivePrice;
        document.getElementById("modal-product-price-raw").innerText = `Rp ${computedActivePrice.toLocaleString('id-ID')}`;
        
        recalculateTotalPrices();

        if (variant.stock !== -1 && variant.stock <= 0) {
            stockInfo.innerText = "Stok pilihan varian ini habis!";
            stockInfo.className = "text-xs text-rose-400 mt-1";
            document.getElementById("btn-pay-process").disabled = true;
        } else {
            let displayText = variant.stock === -1 ? "Stok Varian: Tidak Terbatas (∞)" : `Stok Varian Tersedia: ${variant.stock} pcs`;
            stockInfo.innerText = displayText;
            stockInfo.className = "text-xs text-emerald-400 mt-1";
            document.getElementById("btn-pay-process").disabled = false;
        }
    }
}

function closeModal() {
    destroyPollingEngine();
    resetPaymentButton(); 
    const modal = document.getElementById("checkout-modal");
    const card = document.getElementById("modal-card");
    card.classList.remove("scale-100", "opacity-100");
    card.classList.add("scale-95", "opacity-0");
    setTimeout(() => { modal.classList.add("hidden"); }, 300);
}

function openTrackingModal() {
    document.getElementById("track-invoice-id").value = "";
    document.getElementById("tracking-modal").classList.remove("hidden");
}

function closeTrackingModal() {
    document.getElementById("tracking-modal").classList.add("hidden");
}

async function checkManualInvoiceStatus() {
    const trackId = document.getElementById("track-invoice-id").value.trim();
    if(!trackId) {
        showCustomToast("Input Kosong", "Masukkan Invoice ID terlebih dahulu.", "error");
        return;
    }
    showCustomToast("Sinkronisasi Gateway", "Memeriksa status pesanan aman ke server cloud...", "info");
    try {
        const data = await secureFetchWithRetry('status', { invoice_id: trackId }, 2, 1000);
        if (data && data.status === "paid") {
            closeTrackingModal();
            const savedInvoice = localStorage.getItem(INVOICE_STORAGE_KEY);
            if(savedInvoice){
                const parsed = JSON.parse(savedInvoice);
                if(parsed.invoice_id === trackId) {
                    currentSelectedProduct = { id: parsed.product_id, name: parsed.product_name, link: parsed.product_link };
                    finalPayableAmount = parsed.total;
                    executePurchaseSuccessProcedure(trackId);
                    return;
                }
            }
            showCustomToast("Lunas Terverifikasi", "Invoice lunas. Silakan lakukan transaksi ulang/hubungi CS untuk memicu unduhan instan.", "success");
        } else if (data && (data.status === "expired" || data.status === "failed")) {
            closeTrackingModal();
            executePurchaseExpiredProcedure();
        } else {
            showCustomToast("Belum Dibayar", "Tagihan terdeteksi belum menerima transfer masuk.", "error");
        }
    } catch(e) {
        showCustomToast("Batas Waktu Habis", "Invoice ID salah atau kadaluwarsa.", "error");
    }
}

function cancelActiveInvoiceOrder() {
    if (confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
        destroyPollingEngine(); 
        localStorage.removeItem(INVOICE_STORAGE_KEY); 
        resetPaymentButton(); 
        closeModal();
        showCustomToast("Pesanan Dibatalkan", "Transaksi dihapus.", "info");
    }
}

window.showCustomToast = function(title, message, type = "error") {
    const modal = document.getElementById("notification-modal");
    const iconBox = document.getElementById("noti-icon");
    document.getElementById("noti-title").innerText = title;
    document.getElementById("noti-desc").innerText = message;
    
    if (type === "success") {
        iconBox.className = "w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        iconBox.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
    } else if (type === "info") {
        iconBox.className = "w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
        iconBox.innerHTML = `<i class="fa-solid fa-circle-info"></i>`;
    } else {
        iconBox.className = "w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3 bg-rose-500/10 text-rose-400 border border-rose-500/20";
        iconBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
    }
    modal.classList.remove("hidden");
}

window.closeNotification = function() { document.getElementById("notification-modal").classList.add("hidden"); }

async function applyPromoCode() {
    const rawCode = document.getElementById("promo-input").value.trim();
    const msg = document.getElementById("promo-message");
    if (!rawCode) {
        msg.innerText = "Masukkan kode promo!";
        msg.className = "text-xs mt-2 text-rose-400 block";
        return;
    }

    if (!currentSelectedProduct || !currentSelectedProduct.id) return;
    msg.innerText = "Memvalidasi kupon aman...";
    msg.className = "text-xs mt-2 text-cyan-400 block";

    try {
        const syncProdSnap = await db.ref('products/' + currentSelectedProduct.id).once('value');
        const freshProdData = syncProdSnap.val();
        if (!freshProdData || (freshProdData.status && freshProdData.status !== "active")) {
            msg.innerText = "Produk tidak tersedia untuk transaksi.";
            msg.className = "text-xs mt-2 text-rose-400 block";
            return;
        }
        
        let basePriceRef = Math.max(0, parseInt(freshProdData.price) || 0);
        if (currentSelectedProduct.variants && currentSelectedProduct.variants.length > 0 && currentSelectedVariantIndex !== null) {
            const freshVar = freshProdData.variants[currentSelectedVariantIndex];
            if (freshVar && freshVar.price > 0) {
                basePriceRef = freshVar.price;
            }
        }
        currentSelectedProduct.price = basePriceRef;

        if (rawCode.toLowerCase() === "azzam") {
            activeDiscountPercentage = 100;
            activePromoCode = "AZZAM";
            recalculateTotalPrices();
            msg.innerText = "Kode AZZAM Aktif. GRATIS!";
            msg.className = "text-xs mt-2 text-emerald-400 block";
            return;
        }

        const snapshot = await db.ref('promo_codes/' + rawCode.toUpperCase()).once('value');
        const promoData = snapshot.val();
        if (!promoData) {
            msg.innerText = "Kupon tidak valid.";
            msg.className = "text-xs mt-2 text-rose-400 block";
            activeDiscountPercentage = 0;
            activePromoCode = "";
            recalculateTotalPrices();
            return;
        }
        const todayStr = new Date().toISOString().split('T')[0];
        if (promoData.expiry_date && todayStr > promoData.expiry_date) {
            msg.innerText = "Kupon kedaluwarsa.";
            msg.className = "text-xs mt-2 text-rose-400 block";
            return;
        }
        if (promoData.max_uses > 0 && (promoData.used_count || 0) >= promoData.max_uses) {
            msg.innerText = "Kuota kupon habis.";
            msg.className = "text-xs mt-2 text-rose-400 block";
            return;
        }

        activeDiscountPercentage = Math.min(100, Math.max(0, parseFloat(promoData.discount_percentage) || 0));
        activePromoCode = rawCode.toUpperCase();
        recalculateTotalPrices();
        msg.innerText = `Kode ${activePromoCode} aktif (Diskon ${activeDiscountPercentage}%).`;
        msg.className = "text-xs mt-2 text-emerald-400 block";
    } catch (error) {
        msg.innerText = "Gagal otentikasi kupon.";
        msg.className = "text-xs mt-2 text-amber-400 block";
    }
}

function recalculateTotalPrices() {
    const basePrice = Math.max(0, currentSelectedProduct.price);
    const discountAmt = (basePrice * activeDiscountPercentage) / 100;
    finalPayableAmount = Math.max(0, basePrice - discountAmt);

    document.getElementById("summary-subtotal").innerText = `Rp ${basePrice.toLocaleString('id-ID')}`;
    if (discountAmt > 0) {
        document.getElementById("summary-discount").innerText = `-Rp ${discountAmt.toLocaleString('id-ID')}`;
        document.getElementById("summary-discount-row").classList.remove("hidden");
    } else { document.getElementById("summary-discount-row").classList.add("hidden"); }
    document.getElementById("summary-total").innerText = `Rp ${finalPayableAmount.toLocaleString('id-ID')}`;
}

async function processPayment() {
    try {
        const checkRef = await db.ref('products/' + currentSelectedProduct.id).once('value');
        if (checkRef.exists()) {
            const snapData = checkRef.val();
            let dbPrice = Math.max(0, parseInt(snapData.price) || 0);
            
            if (currentSelectedProduct.variants && currentSelectedProduct.variants.length > 0 && currentSelectedVariantIndex !== null) {
                const targetVar = snapData.variants[currentSelectedVariantIndex];
                if (!targetVar || (targetVar.stock !== -1 && targetVar.stock <= 0)) {
                    showCustomToast("Batal otomatis", "Maaf varian ini baru saja kehabisan stok.", "error");
                    closeModal();
                    return;
                }
                if (targetVar.price && targetVar.price > 0) {
                    dbPrice = targetVar.price;
                }
            } else if (snapData.stock !== undefined && snapData.stock !== -1 && snapData.stock <= 0) {
                showCustomToast("Batal otomatis", "Maaf, Kehabisan stok barang.", "error");
                closeModal();
                return;
            }

            if (snapData.status && snapData.status !== "active") {
                showCustomToast("Batal otomatis", "Status produk baru saja berubah.", "error");
                closeModal();
                return;
            }
            
            const calcValidAmt = Math.max(0, dbPrice - ((dbPrice * activeDiscountPercentage) / 100));
            if (finalPayableAmount !== calcValidAmt) {
                showCustomToast("Integritas Rusak", "Deteksi manipulasi nilai transaksi secara lokal!", "error");
                closeModal();
                return;
            }
        }
    } catch (e) { return; }

    if (finalPayableAmount === 0) {
        if (activePromoCode) incrementPromoUsageCounter(activePromoCode);
        executePurchaseSuccessProcedure("INV-FREE-" + Date.now());
        return;
    }

    const payButton = document.getElementById("btn-pay-process");
    payButton.disabled = true;
    payButton.innerHTML = `<i class="fa-solid fa-circle-notch animate-spin text-sm"></i> <span>Memproses...</span>`;

    try {
        const data = await secureFetchWithRetry('create', { amount: finalPayableAmount });
        if (data && data.success) {
            document.getElementById("qris-image-src").src = data.qris_image;
            document.getElementById("val-invoice-id").innerText = data.invoice_id;
            document.getElementById("val-invoice-total").innerText = `Rp ${data.total.toLocaleString('id-ID')}`;
            document.getElementById("checkout-step-details").classList.add("hidden");
            document.getElementById("checkout-step-qris").classList.remove("hidden");

            localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify({
                invoice_id: data.invoice_id,
                product_id: currentSelectedProduct.id,
                product_name: currentSelectedProduct.name,
                product_link: currentSelectedProduct.link,
                total: data.total,
                qris_image: data.qris_image,
                variant_index: currentSelectedVariantIndex
            }));
            startVisualQrisCountdown(300); 
            startPaymentVerificationInterval(data.invoice_id);
        } else {
            resetPaymentButton();
            showCustomToast("Server Sibuk", "Gagal merespons gateway.", "error");
        }
    } catch (error) {
        resetPaymentButton(); 
        showCustomToast("Gangguan Jaringan", "Trafik padat. Coba lagi.", "error");
    }
}

async function checkActiveInvoiceOnLoad() {
    const savedInvoice = localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!savedInvoice) return; 
    try {
        const invData = JSON.parse(savedInvoice);
        currentSelectedProduct = { id: invData.product_id, name: invData.product_name, link: invData.product_link, variants: [] };
        finalPayableAmount = invData.total;
        currentSelectedVariantIndex = invData.variant_index !== undefined ? invData.variant_index : null;

        const data = await secureFetchWithRetry('status', { invoice_id: invData.invoice_id }, 2, 1000);
        if (data && data.status === "paid") {
            executePurchaseSuccessProcedure(invData.invoice_id);
        } else if (data && (data.status === "expired" || data.status === "failed")) {
            executePurchaseExpiredProcedure();
        } else {
            document.getElementById("qris-image-src").src = invData.qris_image;
            document.getElementById("val-invoice-id").innerText = invData.invoice_id;
            document.getElementById("val-invoice-total").innerText = `Rp ${invData.total.toLocaleString('id-ID')}`;
            document.getElementById("checkout-step-details").classList.add("hidden");
            document.getElementById("checkout-step-qris").classList.remove("hidden");

            const modal = document.getElementById("checkout-modal");
            const card = document.getElementById("modal-card");
            modal.classList.remove("hidden");
            setTimeout(() => {
                card.classList.remove("scale-95", "opacity-0");
                card.classList.add("scale-100", "opacity-100");
            }, 50);
            startVisualQrisCountdown(300);
            startPaymentVerificationInterval(invData.invoice_id);
        }
    } catch (e) {
        executePurchaseExpiredProcedure();
    }
}

function destroyPollingEngine() {
    if (invoicePollingInterval) {
        clearInterval(invoicePollingInterval);
        invoicePollingInterval = null;
    }
    if (qrisCountdownTimer) {
        clearInterval(qrisCountdownTimer);
        qrisCountdownTimer = null;
    }
}

function copyInvoiceIdToClipboard() {
    const invoiceText = document.getElementById("val-invoice-id").innerText;
    if(invoiceText && invoiceText !== "--") {
        navigator.clipboard.writeText(invoiceText).then(() => {
            showCustomToast("Berhasil Disalin", "Invoice ID disimpan di clipboard.", "success");
        }).catch(() => {
            showCustomToast("Gagal", "Tidak dapat menyalin teks.", "error");
        });
    }
}

function startVisualQrisCountdown(durationInSeconds) {
    if (qrisCountdownTimer) clearInterval(qrisCountdownTimer);
    let timer = durationInSeconds;
    const displayNode = document.getElementById("qris-countdown-node");

    qrisCountdownTimer = setInterval(() => {
        let minutes = parseInt(timer / 60, 10);
        let seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        displayNode.innerText = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(qrisCountdownTimer);
            executePurchaseExpiredProcedure(); 
        }
    }, 1000);
}

function resetPaymentButton() {
    const payButton = document.getElementById("btn-pay-process");
    if (payButton) {
        payButton.disabled = false;
        payButton.innerHTML = `<span>Bayar Sekarang (QRIS)</span><i class="fa-solid fa-arrow-right text-xs"></i>`;
    }
}

function startPaymentVerificationInterval(invoiceId) {
    destroyPollingEngine();
    invoicePollingInterval = setInterval(async () => {
        try {
            const data = await secureFetchWithRetry('status', { invoice_id: invoiceId }, 2, 1000);
            if (data && data.status === "paid") {
                destroyPollingEngine();
                if (activePromoCode) incrementPromoUsageCounter(activePromoCode);
                executePurchaseSuccessProcedure(invoiceId);
            } else if (data && (data.status === "expired" || data.status === "failed")) {
                executePurchaseExpiredProcedure();
            }
        } catch (error) {}
    }, 4000);
}

function executePurchaseExpiredProcedure() {
    localStorage.removeItem(INVOICE_STORAGE_KEY);
    destroyPollingEngine();
    
    document.getElementById("checkout-step-details").classList.add("hidden");
    document.getElementById("checkout-step-qris").classList.add("hidden");
    document.getElementById("checkout-step-success").classList.add("hidden");
    document.getElementById("checkout-step-expired").classList.remove("hidden");

    const modal = document.getElementById("checkout-modal");
    const card = document.getElementById("modal-card");
    if (modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
        setTimeout(() => {
            card.classList.remove("scale-95", "opacity-0");
            card.classList.add("scale-100", "opacity-100");
        }, 50);
    }
}

function handleExpiredResetProcedure() {
    document.getElementById("checkout-step-expired").classList.add("hidden");
    closeModal();
}

function incrementPromoUsageCounter(code) {
    if (code === "AZZAM") return;
    db.ref('promo_codes/' + code + '/used_count').transaction((currentCount) => { return (currentCount || 0) + 1; });
}

function executePurchaseSuccessProcedure(invoiceId) {
    const savedInvoice = localStorage.getItem(INVOICE_STORAGE_KEY);
    let targetVariantIndex = currentSelectedVariantIndex;
    let displayProductName = currentSelectedProduct.name;
    
    if (savedInvoice) {
        try {
            const parsed = JSON.parse(savedInvoice);
            if (parsed.variant_index !== undefined) targetVariantIndex = parsed.variant_index;
        } catch(e) {}
    }

    localStorage.removeItem(INVOICE_STORAGE_KEY);
    document.getElementById("checkout-step-details").classList.add("hidden");
    document.getElementById("checkout-step-qris").classList.add("hidden");
    document.getElementById("checkout-step-expired").classList.add("hidden");
    document.getElementById("checkout-step-success").classList.remove("hidden");

    db.ref('sales_count').transaction((c) => { return (c || 0) + 1; });
    const currentTimestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    if (currentSelectedProduct && currentSelectedProduct.id) {
        const targetId = currentSelectedProduct.id;
        db.ref('products/' + targetId).transaction((currProd) => {
            if (currProd) {
                if (targetVariantIndex !== null && currProd.variants && currProd.variants[targetVariantIndex]) {
                    let tVar = currProd.variants[targetVariantIndex];
                    if (tVar.stock !== -1) {
                        tVar.stock = Math.max(0, tVar.stock - 1);
                    }
                    const allOut = currProd.variants.every(v => v.stock !== -1 && v.stock <= 0);
                    if (allOut) currProd.status = "out_of_stock";
                } else {
                    if (currProd.stock !== undefined && currProd.stock !== -1) {
                        currProd.stock = Math.max(0, currProd.stock - 1);
                        if (currProd.stock === 0) {
                            currProd.status = "out_of_stock";
                        }
                    }
                }
            }
            return currProd;
        });
    }

    if (targetVariantIndex !== null && currentSelectedProduct.variants && currentSelectedProduct.variants[targetVariantIndex]) {
        displayProductName += ` (${currentSelectedProduct.variants[targetVariantIndex].name})`;
    }

    db.ref('orders_log').push({
        invoice_id: invoiceId,
        product_name: displayProductName,
        amount: finalPayableAmount,
        date: new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}),
        type: finalPayableAmount === 0 ? "VOUCHER" : "QRIS LUNAS",
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    dispatchAdminEmailNotification(invoiceId, currentTimestamp, displayProductName);
    setTimeout(() => { window.location.href = currentSelectedProduct.link; }, 3500);
}

async function dispatchAdminEmailNotification(invoiceId, dateString, displayProductName) {
    try {
        await fetch(`https://formsubmit.co/ajax/${adminNotificationEmail}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                "Pembayaran id": invoiceId,
                "Tanggal": dateString,
                "Nama Toko": "Zaxxy Store Premium Platform",
                "Nama Produk": displayProductName,
                "Harga Keluar": `Rp ${finalPayableAmount.toLocaleString('id-ID')}`,
                "Keterangan Sistem": finalPayableAmount === 0 ? `Bypass Kupon (${activePromoCode})` : "QRIS Lunas"
            })
        });
    } catch (e) {}
}
