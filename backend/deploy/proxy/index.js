const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const headers = {
      'Authorization': process.env.AUTHORIZATION,
      'accept': 'application/json',
      'content-type': 'application/json',
    };

    let response;
    if (req.method === 'GET') {
      response = await fetch(url, { headers });
    } else if (req.method === 'POST') {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body)
      });
    }

    const data = await response.json();
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
