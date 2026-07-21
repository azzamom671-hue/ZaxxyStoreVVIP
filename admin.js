// Autentikasi & Tampilan Dashboard
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

function openAdminLoginModal() {
    document.getElementById("login-key").value = "";
    document.getElementById("login-remember").checked = false;
    document.getElementById("admin-login-modal").classList.remove("hidden");
}

function closeAdminLoginModal() { 
    document.getElementById("admin-login-modal").classList.add("hidden"); 
}

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

function closeAdminDashboardView() {
    const adminPanel = document.getElementById("view-admin-panel");
    adminPanel.classList.add("opacity-0");
    setTimeout(() => {
        adminPanel.classList.add("hidden");
        document.getElementById("view-store-panel").classList.remove("hidden");
    }, 300);
    showCustomToast("Kembali ke Toko", "Beralih ke tampilan halaman utama katalog pembeli.", "info");
}

function switchAdminTab(targetTabId, currentButtonElement) {
    document.querySelectorAll('.admin-tab-content').forEach(contentBlock => {
        contentBlock.classList.replace('block', 'hidden');
    });

    document.getElementById(`tab-${targetTabId}`).classList.replace('hidden', 'block');

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.className = "admin-tab-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5 font-semibold text-xs transition-all cursor-pointer";
    });

    currentButtonElement.className = "admin-tab-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-purple-950/40";
}

// Event Listeners Admin ke Firebase
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

function renderAdminProductsTableHTML(list) {
    const tbody = document.getElementById("admin-product-table-body");
    tbody.innerHTML = "";

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-500 text-xs font-medium">Tidak ada produk ditemukan.</td></tr>`;
        return;
    }

    list.forEach(productObj => {
        let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider inline-block">Aktif</span>`;
        
        if (productObj.variants && productObj.variants.length > 0) {
            const allOut = productObj.variants.every(v => v.stock !== -1 && v.stock <= 0);
            if (allOut) statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider inline-block">Stok Habis</span>`;
        } else if (productObj.stock !== -1 && productObj.stock <= 0) {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider inline-block">Stok Habis</span>`;
        }
        
        if (productObj.status === "maintenance") {
            statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase tracking-wider inline-block">Perbaikan</span>`;
        }

        let stockLabel = "";
        if (productObj.variants && productObj.variants.length > 0) {
            stockLabel = `<span class="bg-purple-500/10 text-purple-300 px-2 py-0.5 border border-purple-500/20 rounded font-semibold">${productObj.variants.length} Varian</span>`;
        } else {
            stockLabel = productObj.stock === -1 ? "Bebas (∞)" : `${productObj.stock} pcs`;
        }

        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/5 transition-colors text-xs sm:text-sm border-b border-white/5";
        tr.innerHTML = `
            <td class="py-3.5 px-3 sm:px-4 align-top">
                <div class="font-bold text-slate-100 text-xs sm:text-sm leading-snug break-words">${productObj.name}</div> 
                <div class="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span class="text-slate-500 font-medium">${productObj.category}</span>
                    <span class="text-slate-600">|</span>
                    <span>Stok: ${stockLabel}</span>
                </div>
                <div class="mt-1.5 sm:hidden flex items-center gap-2">
                    <span class="text-emerald-400 font-extrabold text-xs">Rp ${productObj.price.toLocaleString('id-ID')}</span>
                    ${statusBadge}
                </div>
            </td>
            <td class="py-4 px-4 text-emerald-400 font-extrabold text-sm hidden sm:table-cell align-middle">Rp ${productObj.price.toLocaleString('id-ID')}</td>
            <td class="py-4 px-4 hidden sm:table-cell align-middle">${statusBadge}</td>
            <td class="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap align-top sm:align-middle">
                <button onclick="editProductData('${productObj.id}')" class="text-cyan-400 p-1.5 sm:p-2 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 rounded-xl transition-all cursor-pointer" title="Edit Data"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteProductFromFirebase('${productObj.id}')" class="text-rose-400 p-1.5 sm:p-2 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer" title="Hapus Permanen"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Form & Varian Produk Logic
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
    row.className = "flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 bg-[#09071c]/90 p-3.5 rounded-xl border border-white/10 variant-data-row shadow-inner relative";
    row.id = rowId;
    
    row.innerHTML = `
        <div class="col-span-12 sm:col-span-4">
            <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1 sm:hidden">Nama Varian</label>
            <input type="text" placeholder="Nama Varian" value="${name}" class="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 var-item-name">
        </div>
        <div class="col-span-6 sm:col-span-3">
            <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1 sm:hidden">Harga Kustom (Rp)</label>
            <input type="text" placeholder="Harga Kustom" value="${price}" oninput="formatRupiahElement(this)" class="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-purple-500 var-item-price">
        </div>
        <div class="col-span-3 sm:col-span-2">
            <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1 sm:hidden">Stok</label>
            <input type="number" placeholder="Stok" value="${stock}" ${isUnlimited ? 'disabled class="w-full bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 opacity-40 var-item-stock"' : 'class="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 var-item-stock"'} min="0">
        </div>
        <div class="col-span-3 sm:col-span-2 flex items-center justify-center pt-2 sm:pt-0">
            <label class="flex items-center gap-1.5 text-[11px] text-slate-400 select-none cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-lg border border-white/10 w-full justify-center">
                <input type="checkbox" ${isUnlimited ? 'checked' : ''} onchange="toggleVariantRowStock(this)" class="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-purple-600 accent-purple-600 var-item-unlimited">
                <span class="font-bold text-xs text-purple-400">∞</span>
            </label>
        </div>
        <div class="col-span-12 sm:col-span-1 flex justify-end items-center pt-2 sm:pt-0">
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="w-full sm:w-auto bg-rose-500/10 sm:bg-transparent text-rose-400 p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer text-center"><i class="fa-solid fa-trash-can text-xs"></i><span class="inline sm:hidden ml-2 text-xs font-bold">Hapus</span></button>
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

// Backup & Export / Import JSON
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

// Manajemen Voucher & Kupon Promo
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
                <td class="py-3 px-3 sm:px-4 align-top">
                    <div class="font-mono font-bold text-violet-400 text-xs sm:text-sm break-all">${key}</div>
                    <div class="mt-1 sm:hidden flex items-center gap-1.5 flex-wrap">
                        ${data.discount_percentage === 100 ? '<span class="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">Gratis 100%</span>' : `<span class="text-slate-300 text-[10px] font-medium">${data.discount_percentage}% Diskon</span>`}
                        <span class="text-slate-600">|</span>
                        <span class="text-[10px] text-slate-400">Exp: ${data.expiry_date || '-'}</span>
                    </div>
                </td>
                <td class="py-4 px-4 hidden sm:table-cell align-middle">
                    ${data.discount_percentage === 100 ? '<span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">Gratis 100%</span>' : `<span class="text-slate-300 font-medium">${data.discount_percentage}% Diskon</span>`}
                </td>
                <td class="py-4 px-4 text-slate-400 hidden sm:table-cell align-middle">${data.expiry_date || '-'}</td>
                <td class="py-3 px-3 sm:px-4 text-slate-400 text-xs align-top sm:align-middle">${data.used_count || 0} / ${data.max_uses == 0 ? '∞' : data.max_uses}</td>
                <td class="py-3 px-3 sm:px-4 text-right align-top sm:align-middle">
                    <button onclick="deletePromoFromFirebase('${key}')" class="text-rose-400 p-1.5 sm:p-2 hover:bg-rose-500/10 rounded-lg cursor-pointer"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
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

function incrementPromoUsageCounter(code) {
    if (code === "AZZAM") return;
    db.ref('promo_codes/' + code + '/used_count').transaction((currentCount) => { return (currentCount || 0) + 1; });
}

// System Config & Live Logs Feed
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
        tr.className = "hover:bg-white/5 transition-colors border-b border-white/5 text-xs";
        tr.innerHTML = `
            <td class="py-3 px-2 sm:px-5 align-top">
                <div class="font-mono text-purple-400 font-bold text-[10px] sm:text-xs break-all">${item.invoice_id}</div>
                <div class="text-[9px] sm:text-[10px] text-slate-400 sm:hidden mt-1 font-sans">${item.date || '-'}</div>
            </td>
            <td class="py-3 px-5 hidden sm:table-cell text-slate-400 font-normal align-middle">${item.date || '-'}</td>
            <td class="py-3 px-2 sm:px-5 align-top">
                <div class="text-white font-bold text-xs leading-snug break-words">${item.product_name}</div>
                <div class="text-emerald-400 font-black sm:hidden mt-1 text-xs">Rp ${parseInt(item.amount).toLocaleString('id-ID')}</div>
            </td>
            <td class="py-3 px-5 text-emerald-400 font-black hidden sm:table-cell text-xs align-middle">Rp ${parseInt(item.amount).toLocaleString('id-ID')}</td>
            <td class="py-3 px-2 sm:px-5 text-right align-top sm:align-middle">
                <span class="px-1.5 sm:px-2.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-white/5 border border-white/10 font-bold uppercase tracking-wider inline-block">${item.type || 'QRIS'}</span>
            </td>
        `;
        tableBody.appendChild(tr);
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

async function clearAllTransactionsHistory() {
    if (confirm("Reset seluruh data riwayat transaksi dan counter secara permanen?")) {
        try {
            await db.ref('orders_log').remove();
            await db.ref('sales_count').set(0);
            showCustomToast("Reset Sukses", "Riwayat transaksi dibersihkan.", "success");
        } catch(e) {
            showCustomToast("Gagal", "Gagal mereset data.", "error");
        }
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
