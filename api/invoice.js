// api/invoice.js
const API_KEY_MYDUIT = "key_5fcfe74555ca411c";

export default async function handler(req, res) {
  // Set Header CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { action, invoice_id } = req.query;

  try {
    // 1. Pengecekan Status Invoice (GET /api/invoice.js?action=status&invoice_id=XXX)
    if (action === "status" && invoice_id) {
      const response = await fetch(
        `https://app.myduit.web.id/api/invoice/status?apikey=${API_KEY_MYDUIT}&invoice_id=${invoice_id}`
      );
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 2. Buat Invoice Baru (POST /api/invoice.js atau GET /api/invoice.js?amount=XXX)
    let amount = req.query.amount || (req.body && req.body.amount);

    if (!amount) {
      return res.status(400).json({ status: false, message: "Amount wajib diisi" });
    }

    const response = await fetch(
      `https://app.myduit.web.id/api/invoice?apikey=${API_KEY_MYDUIT}&amount=${amount}`
    );
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error("MyDuit Proxy Error:", error);
    return res.status(500).json({ status: false, message: "Gagal terhubung ke Gateway MyDuit" });
  }
}
