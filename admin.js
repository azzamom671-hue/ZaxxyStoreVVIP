const UXMixins = { fallbackImg: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" };

// Formatting & Utilities
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

async function secureFetchWithRetry(actionType, params = {}, retries = 3, delay = 2000) {
    let localApiUrl = `/api/invoice?type=${actionType}&apikey=${API_KEY}`;
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

// Inisialisasi Aplikasi User saat DOM Siap
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

// Modal Checkout Logic
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

function resetPaymentButton() {
    const payButton = document.getElementById("btn-pay-process");
    if (payButton) {
        payButton.disabled = false;
        payButton.innerHTML = `<span>Bayar Sekarang (QRIS)</span><i class="fa-solid fa-arrow-right text-xs"></i>`;
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
