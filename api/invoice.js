export default async function handler(req, res) {
    // Ambil parameter dari client (Kecuali apikey, kita hapus dari requst client)
    const { type, amount, invoice_id } = req.query;
    
    // AMAN: Taruh API Key Fyxzpedia kamu di sini (Server-Side)
    // Pengguna/pembeli tidak akan pernah bisa melihat text di bawah ini lewat inspect/Eruda!
    const RAHASIA_API_KEY = "key_5fcfe74555ca411c"; 
    
    let targetUrl = '';

    if (type === 'create') {
        // Otomatis menyuntikkan API Key rahasia dari server sebelum menembak Fyxzpedia
        targetUrl = `https://gateways.fyxzpedia.biz.id/api/invoice?apikey=${RAHASIA_API_KEY}&amount=${amount}`;
    } else if (type === 'status') {
        // Otomatis menyuntikkan API Key rahasia dari server sebelum mengecek status
        targetUrl = `https://gateways.fyxzpedia.biz.id/api/invoice/status?apikey=${RAHASIA_API_KEY}&invoice_id=${invoice_id}`;
    } else {
        return res.status(400).json({ error: 'Parameter type salah' });
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        const data = await response.json();
        return res.status(200).json(data);
        
    } catch (error) {
        return res.status(500).json({ error: 'Gateway Connection Timeout' });
    }
}
