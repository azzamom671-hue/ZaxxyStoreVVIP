const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware keamanan & parsing data
app.use(cors());
app.use(express.json());

// API Key yang disinkronkan langsung dari file HTML kamu
const VALID_API_KEY = "key_5fcfe74555ca411c";

// Database sementara di dalam memori server untuk menyimpan invoice aktif saat testing
const localInvoiceSessionDb = {};

/**
 * Endpoint Utama Gateway Pembayaran Otomatis Zaxxy Store
 * Menangani pembuatan QRIS dan pengecekan status sinkronisasi
 */
app.get('/api/invoice', (req, res) => {
    const { type, apikey, amount, invoice_id } = req.query;

    // 1. Validasi Keamanan API Key
    if (apikey !== VALID_API_KEY) {
        return res.status(401).json({ 
            success: false, 
            message: "Akses Ditolak: API Key tidak valid." 
        });
    }

    // 2. Prosedur Pembuatan Invoice Baru (type = create)
    if (type === 'create') {
        if (!amount || parseInt(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Nominal pembayaran tidak valid." });
        }

        // Generator ID Transaksi Acak (Contoh: TRX-K8J2S1A)
        const newInvoiceId = "TRX-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        const totalAmount = parseInt(amount);

        // Simpan data transaksi ke penyimpanan lokal server
        localInvoiceSessionDb[newInvoiceId] = {
            invoice_id: newInvoiceId,
            total: totalAmount,
            status: "unpaid", // Status awal: belum dibayar
            createdAt: Date.now()
        };

        // Mengembalikan respons objek sesuai struktur destrukturisasi di HTML kamu
        return res.json({
            success: true,
            invoice_id: newInvoiceId,
            total: totalAmount,
            // Menggunakan QR Code generator dinamis pihak ketiga untuk kebutuhan testing mockup QRIS
            qris_image: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=ZaxxyStore-MockPay-${newInvoiceId}-${totalAmount}`
        });
    }

    // 3. Prosedur Pemeriksaan Status Pembayaran Gateway (type = status)
    if (type === 'status') {
        if (!invoice_id) {
            return res.status(400).json({ success: false, message: "Parameter invoice_id kosong." });
        }

        const currentTx = localInvoiceSessionDb[invoice_id];

        // Jika invoice tidak ditemukan di memori backend
        if (!currentTx) {
            return res.status(404).json({ success: false, status: "failed" });
        }

        // SIMULASI TESTING: Otomatis ubah status ke 'paid' jika masa tunggu demo sudah lewat 15 detik
        if (currentTx.status === "unpaid" && (Date.now() - currentTx.createdAt) > 15000) {
            currentTx.status = "paid";
        }

        // Mengembalikan respons status pembayaran ('unpaid', 'paid', 'expired', atau 'failed')
        return res.json({
            success: true,
            invoice_id: currentTx.invoice_id,
            status: currentTx.status 
        });
    }

    // Jalur jika parameter tipe query salah atau tidak dikenal
    return res.status(400).json({ success: false, message: "Aksi tipe gateway tidak dikenal." });
});

// Menjalankan server backend utama
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Zaxxy Store Secure Payment Server Aktif!`);
    console.log(`  Berjalan pada tautan: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
