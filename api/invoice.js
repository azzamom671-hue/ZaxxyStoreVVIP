export default async function handler(req, res) {
    const { type, apikey, amount, invoice_id } = req.query;
    let targetUrl = '';
    
    if (type === 'create') {
        targetUrl = `https://gateways.fyxzpedia.biz.id/api/invoice?apikey=${apikey}&amount=${amount}`;
    } else if (type === 'status') {
        targetUrl = `https://gateways.fyxzpedia.biz.id/api/invoice/status?apikey=${apikey}&invoice_id=${invoice_id}`;
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
