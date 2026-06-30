// /api/lead.js
//
// This function runs on Vercel's servers — never in the visitor's browser —
// so your Kit API key stays private. The quiz calls this endpoint, and this
// function calls Kit on your behalf.
//
// Required setup in Vercel:
//   Environment variable: KIT_API_KEY = your secret Kit API key
//
// Required setup in Kit:
//   A custom field named exactly: Quiz Results
//   (Settings -> Custom Fields -> Add Field)

export default async function handler(req, res) {
  // Handle CORS preflight FIRST, before any other method checks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, summary, resultPackage } = req.body;

    if (!email || !summary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lines = summary.map((item, i) =>
      `Q${i + 1}: ${item.question}\nA: ${item.answer || '(skipped)'}`
    );
    const quizResultsText =
      `Recommended package: ${resultPackage || 'N/A'}\n\n` + lines.join('\n\n');

    const KIT_API_KEY = process.env.KIT_API_KEY;

    if (!KIT_API_KEY) {
      console.error('KIT_API_KEY environment variable is not set.');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const kitResponse = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': KIT_API_KEY
      },
      body: JSON.stringify({
        email_address: email,
        first_name: name || '',
        fields: {
          'quiz_results': quizResultsText
        }
      })
    });

    const kitData = await kitResponse.json();

    if (!kitResponse.ok) {
      console.error('Kit API error:', kitData);
      return res.status(502).json({ error: 'Failed to save lead to Kit', details: kitData });
    }

    return res.status(200).json({ success: true, kit: kitData });

  } catch (err) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
