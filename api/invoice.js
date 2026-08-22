// api/invoice.js
const API_KEY_MYDUIT = "key_5fcfe74555ca411c";

export default async function handler(req, res) {
  // 1. Set Header CORS agar bisa diakses dari frontend web
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight request browser
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { action, invoice_id } = req.query;

  try {
    // 2. Pengecekan Status Invoice Real-time
    if (action === "status") {
      if (!invoice_id) {
        return res.status(400).json({ 
          status: false, 
          message: "Parameter invoice_id wajib disertakan" 
        });
      }

      const response = await fetch(
        `https://app.myduit.web.id/api/invoice/status?apikey=${API_KEY_MYDUIT}&invoice_id=${encodeURIComponent(invoice_id)}`
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 3. Pembuatan Invoice QRIS Baru
    let amount = req.query.amount;
    
    // Cek jika amount dikirim via POST body
    if (!amount && req.body) {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      amount = body.amount;
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ 
        status: false, 
        message: "Parameter amount tidak valid atau kosong" 
      });
    }

    const response = await fetch(
      `https://app.myduit.web.id/api/invoice?apikey=${API_KEY_MYDUIT}&amount=${parseInt(amount)}`
    );
    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    console.error("MyDuit Gateway Error:", error);
    return res.status(500).json({ 
      status: false, 
      message: "Gagal terhubung ke server MyDuit: " + error.message 
    });
  }
}
