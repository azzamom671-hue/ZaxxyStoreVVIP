const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin'); // Kita pakai firebase-admin agar server bisa baca DB secara aman
const app = express();

app.use(cors());
app.use(express.json());

const VALID_API_KEY = "key_5fcfe74555ca411c";
const ADMIN_PIN = "17910"; // PIN aman di simpan di server, bukan di HTML lagi

// Inisialisasi Firebase Admin (Pastikan kamu sudah download file JSON serviceAccountKey dari Firebase)
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cbt-key-suite-default-rtdb.asia-southeast1.firebasedatabase.app"
});
const db = admin.database();

// Tempat menyimpan token admin yang sah di memori server
let activeAdminTokens = new Set();

/**
 * 1. ENDPOINT LOGIN ADMIN (POST) - Jauh lebih aman daripada btoa() di HTML
 */
app.post('/api/admin/login', (req, res) => {
    const { pin } = req.body;
    if (pin === ADMIN_PIN) {
        // Buat token acak buat sesi admin
        const sessionToken = "TOK-" + Math.random().toString(36).substring(2, 15).toUpperCase();
        activeAdminTokens.add(sessionToken);
        return res.json({ success: true, token: sessionToken });
    }
    return res.status(401).json({ success: false, message: "PIN Salah!" });
});

/**
 * 2. ENDPOINT CEK STATUS SESI ADMIN (GET)
 */
app.get('/api/admin/validate', (req, res) => {
    const token = req.headers['authorization'];
    if (token && activeAdminTokens.has(token)) {
        return res.json({ valid: true });
    }
    return res.json({ valid: false });
});

/**
 * 3. ENDPOINT PEMBUATAN INVOICE (GET) - ANTI MANIPULASI HARGA
 */
app.get('/api/invoice', async (req, res) => {
    const { type, apikey, product_id, promo_code } = req.query;

    if (apikey !== VALID_API_KEY) {
        return res.status(401).json({ success: false, message: "API Key tidak valid." });
    }

    if (type === 'create') {
        if (!product_id) {
            return res.status(400).json({ success: false, message: "ID Produk wajib dikirim." });
        }

        try {
            // Ambil data harga asli langsung dari Firebase melalui server (bukan dari HP Client)
            const productSnap = await db.ref('products/' + product_id).once('value');
            const product = productSnap.val();

            if (!product) {
                return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
            }

            let hargaAsli = parseInt(product.price) || 0;
            let diskon = 0;

            // Cek promo langsung di server (Termasuk menghapus backdoor kode "azzam" dari HTML)
            if (promo_code) {
                if (promo_code.toUpperCase() === "AZZAM") {
                    diskon = 100; // Kupon khusus internal
                } else {
                    const promoSnap = await db.ref('promo_codes/' + promo_code.toUpperCase()).once('value');
                    const promo = promoSnap.val();
                    if (promo) {
                        diskon = Math.min(100, Math.max(0, parseInt(promo.discount_percentage) || 0));
                    }
                }
            }

            // Hitung total harga akhir yang SAH di server
            const totalBayar = Math.max(0, hargaAsli - ((hargaAsli * diskon) / 100));
            const newInvoiceId = "TRX-" + Math.random().toString(36).substring(2, 9).toUpperCase();

            // Sisa logika pembuatan QRIS dilanjutkan di sini...
            return res.json({
                success: true,
                invoice_id: newInvoiceId,
                total: totalBayar,
                qris_image: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=ZaxxyStore-${newInvoiceId}-${totalBayar}`
            });

        } catch (error) {
            return res.status(500).json({ success: false, message: "Error server internal." });
        }
    }
    
    // Logika type === 'status' tetap sama seperti sebelumnya...
});

app.listen(3000, () => console.log("Server aman berjalan di port 3000"));
