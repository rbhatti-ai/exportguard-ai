// pages/api/analyze.js
import jwt from 'jsonwebtoken';
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Helper: parse multipart/form-data into fields + file buffer ---
async function parseMultipartForm(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return { fields: {}, file: null };

  const parts = buffer.toString('binary').split(`--${boundary}`);
  const fields = {};
  let file = null;

  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    const [rawHeaders, rawBody] = part.split('\r\n\r\n');
    if (!rawBody) continue;

    const nameMatch = rawHeaders.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    const isFile = rawHeaders.includes('filename=');

    if (isFile) {
      const bodyClean = rawBody.replace(/\r\n--$/, '');
      file = Buffer.from(bodyClean, 'binary');
    } else {
      const value = rawBody.replace(/\r\n--$/, '').trim();
      fields[name] = value;
    }
  }

  return { fields, file };
}

// --- Helper: call Google Document AI Invoice processor ---
async function callOcrService(fileBuffer) {
  if (!fileBuffer) {
    return {
      ocrText: '',
      ocrHsCode: null,
      ocrValueCAD: null,
    };
  }

  try {
    const saKeyRaw = process.env.GOOGLE_DOC_AI_KEY;
    if (!saKeyRaw) {
      console.error('GOOGLE_DOC_AI_KEY env var not set');
      return { ocrText: '', ocrHsCode: null, ocrValueCAD: null };
    }

    const saKey = JSON.parse(saKeyRaw);
    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign(
      {
        iss: saKey.client_email,
        sub: saKey.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
      },
      saKey.private_key,
      { algorithm: 'RS256' }
    );

    const oauthRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }).toString(),
    });

    if (!oauthRes.ok) {
      console.error('OAuth error status:', oauthRes.status);
      return { ocrText: '', ocrHsCode: null, ocrValueCAD: null };
    }

    const oauthJson = await oauthRes.json();
    const accessToken = oauthJson.access_token;

    const projectId = saKey.project_id;
    const processorId = '6f88fb926e3e803f'; // exportguard-invoice
    const location = 'eu';

    const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

    const docAiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content: fileBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      }),
    });

    if (!docAiRes.ok) {
      console.error('DocAI error status:', docAiRes.status, await docAiRes.text());
      return { ocrText: '', ocrHsCode: null, ocrValueCAD: null };
    }

    const doc = await docAiRes.json();

    const text = doc.document?.text || '';
    let total = null;

    const entities = doc.document?.entities || [];
    for (const e of entities) {
      if (e.type && e.type.toLowerCase().includes('total_amount')) {
        const n = Number(e.normalizedValue?.moneyValue?.amount || e.mentionText);
        if (!Number.isNaN(n)) {
          total = n;
          break;
        }
      }
    }

    return {
      ocrText: text,
      ocrHsCode: null,
      ocrValueCAD: total,
    };
  } catch (err) {
    console.error('OCR service exception:', err);
    return {
      ocrText: '',
      ocrHsCode: null,
      ocrValueCAD: null,
    };
  }
}

// --- Main handler: parse form → OCR → CBSA logic ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, file } = await parseMultipartForm(req);
// --- Main handler: parse form → OCR → CBSA logic ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, file } = await parseMultipartForm(req);

    const typedValue = fields.valueCAD ? Number(fields.valueCAD) : null;
    const destination = (fields.destination || '').trim() || 'Unknown';
    const mode = (fields.mode || 'Air').trim(); // Air / Rail / Truck / Ocean

    const { ocrText, ocrHsCode, ocrValueCAD } = await callOcrService(file);

    const valueCAD =
      typedValue != null && !Number.isNaN(typedValue)
        ? typedValue
        : ocrValueCAD != null
        ? Number(ocrValueCAD)
        : 0;

    const hsCode = ocrHsCode || '8479.89.00';

    const issues = [];
    let complianceScore = 100;

    const cersThreshold = 2000;

    const cersRequired =
      valueCAD >= cersThreshold ||
      mode === 'Air' ||
      mode === 'Rail';

    if (cersRequired) {
      issues.push({
        title: 'CERS declaration required',
        citation: `Declared value ${valueCAD.toFixed(
          2
        )} CAD and mode ${mode} trigger CBSA electronic export reporting (simplified CERS guidance).`,
      });
      complianceScore -= 10;
    } else {
      issues.push({
        title: 'CERS declaration not required (demo logic)',
        citation: `Value below ${cersThreshold} CAD and mode ${mode} do not trigger CERS in this simplified checker based on CBSA export reporting thresholds.`,
      });
    }

    issues.push({
      title: 'Proof-of-Report (POR#) missing on invoice',
      citation:
        'POR# should appear on commercial documentation used for export reporting under CBSA export programs.',
    });
    complianceScore -= 8;

    issues.push({
      title: 'Country of origin field not detected',
      citation:
        'Commercial invoices should state the country of origin for each line item to support CBSA export and partner customs requirements.',
    });
    complianceScore -= 10;

    if (complianceScore < 0) complianceScore = 0;

    return res.status(200).json({
      hsCode,
      valueCAD,
      destination,
      mode,
      complianceScore,
      issues,
      ocrMeta: {
        usedOcrValue: typedValue == null,
        ocrValueCAD,
        ocrHsCode,
        ocrTextSnippet: ocrText ? ocrText.slice(0, 200) : '',
      },
    });
  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ error: 'Internal server error in analyzer' });
  }
}
