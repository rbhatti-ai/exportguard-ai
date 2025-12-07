import jwt from 'jsonwebtoken';

// pages/api/analyze.js

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
      ocrValue: null,       // raw invoice total
      ocrCurrency: null,    // invoice currency if we can detect it
    };
  }

  try {
    const saKeyRaw = process.env.GOOGLE_DOC_AI_KEY;
    if (!saKeyRaw) {
      console.error('GOOGLE_DOC_AI_KEY env var not set');
      return { ocrText: '', ocrHsCode: null, ocrValue: null, ocrCurrency: null };
    }

    const saKey = JSON.parse(saKeyRaw);
    const now = Math.floor(Date.now() / 1000);

    // 1) Create JWT for service account
    const jwtToken = jwt.sign(
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

    // 2) Exchange JWT for OAuth access token
    const oauthRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }).toString(),
    });

    if (!oauthRes.ok) {
      console.error('OAuth error status:', oauthRes.status, await oauthRes.text());
      return { ocrText: '', ocrHsCode: null, ocrValue: null, ocrCurrency: null };
    }

    const { access_token: accessToken } = await oauthRes.json();

    // 3) Call your Document AI processor
    const projectId = saKey.project_id;
    const location = 'eu';
    const processorId = '6f88fb926e3e803f'; // exportguard-invoice

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
          mimeType: 'application/pdf', // change if you only send images
        },
      }),
    });

    if (!docAiRes.ok) {
      console.error('DocAI error status:', docAiRes.status, await docAiRes.text());
      return { ocrText: '', ocrHsCode: null, ocrValue: null, ocrCurrency: null };
    }

    const doc = await docAiRes.json();

    // Optional debugging: first few entities
    console.log(
      'DocAI entities:',
      JSON.stringify(doc.document?.entities?.slice(0, 20) || [], null, 2)
    );

    const text = doc.document?.text || '';
    let total = null;
    let currency = null;

    const entities = doc.document?.entities || [];
    for (const e of entities) {
      const t = (e.type || '').toLowerCase();

      // Heuristic: pick invoice total
      if (t.includes('total_amount') || t.includes('invoice_total') || t === 'total') {
        const money = e.normalizedValue?.moneyValue;
        if (money) {
          const n = Number(money.amount);
          if (!Number.isNaN(n)) {
            total = n;
            currency = money.currencyCode || null;
            break;
          }
        }
        const n = Number(e.mentionText);
        if (!Number.isNaN(n)) {
          total = n;
          // currency may still be null; we handle that downstream
          break;
        }
      }
    }

    return {
      ocrText: text,
      ocrHsCode: null,     // invoice model doesn’t return HS code yet
      ocrValue: total,     // raw invoice total in invoice currency
      ocrCurrency: currency || null,
    };
  } catch (err) {
    console.error('OCR service exception:', err);
    return {
      ocrText: '',
      ocrHsCode: null,
      ocrValue: null,
      ocrCurrency: null,
    };
  }
}

// --- Helper: currency → CAD converter using CBSA FX API (simplified) ---
// NOTE: In production, you should cache results server-side to avoid
// hitting the API on every request.
async function convertToCAD(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) {
    return { valueCAD: 0, fxNote: 'No amount to convert' };
  }

  const cur = (currency || 'CAD').toUpperCase();
  const numericAmount = Number(amount);

  if (cur === 'CAD') {
    return { valueCAD: numericAmount, fxNote: 'Already in CAD' };
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const url =
      `https://bcd-api-dca-ipa.cbsa-asfc.cloud-nuage.canada.ca/` +
      `exchange-rate-lambda/exchange-rates` +
      `?fromCurrency=${encodeURIComponent(cur)}` +
      `&toCurrency=CAD` +
      `&startDate=${today}&endDate=${today}&limit=1`;

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error('CBSA FX error status:', resp.status, await resp.text());
      // Fallback: treat as CAD if we cannot fetch a rate
      return {
        valueCAD: numericAmount,
        fxNote: `FX API failed for ${cur}→CAD; amount treated as CAD`,
      };
    }

    const json = await resp.json();
    const rates = json.ForeignExchangeRates || [];
    const first = rates[0];

    const rateStr = first?.Rate;
    const rate = rateStr != null ? Number(rateStr) : NaN;

    if (!rate || Number.isNaN(rate)) {
      console.error('CBSA FX missing/invalid rate for', cur, 'payload:', json);
      return {
        valueCAD: numericAmount,
        fxNote: `No valid FX rate for ${cur}→CAD; amount treated as CAD`,
      };
    }

    // CBSA docs: Rate is the number of CAD required for 1 unit of FromCurrency. [web:310]
    const valueCAD = numericAmount * rate;

    return {
      valueCAD,
      fxNote: `CBSA FX: ${cur}→CAD at rate ${rate}`,
    };
  } catch (err) {
    console.error('CBSA FX exception:', err);
    return {
      valueCAD: numericAmount,
      fxNote: `FX exception for ${cur}→CAD; amount treated as CAD`,
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

    // Inputs from user
    const typedValue = fields.valueCAD ? Number(fields.valueCAD) : null;
    const typedCurrency = (fields.currency || 'CAD').trim();
    const destination = (fields.destination || '').trim() || 'Unknown';
    const mode = (fields.mode || 'Air').trim(); // Air / Rail / Truck / Ocean

    // Call OCR / AI extraction
    const { ocrText, ocrHsCode, ocrValue, ocrCurrency } = await callOcrService(file);

    // Decide which value + currency to use
    let sourceAmount = null;
    let sourceCurrency = 'CAD';

    if (typedValue != null && !Number.isNaN(typedValue)) {
      sourceAmount = typedValue;
      sourceCurrency = typedCurrency || 'CAD';
    } else if (ocrValue != null && !Number.isNaN(Number(ocrValue))) {
      sourceAmount = Number(ocrValue);
      // If Document AI gave a currency, use it; otherwise assume USD for demo.
      sourceCurrency = ocrCurrency || 'USD';
    } else {
      sourceAmount = 0;
      sourceCurrency = 'CAD';
    }

    const { valueCAD, fxNote } = await convertToCAD(sourceAmount, sourceCurrency);

    const hsCode = ocrHsCode || '8479.89.00';

    // --- CBSA-style CERS / POR# / origin logic (demo) ---
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
        )} CAD and mode ${mode} trigger CBSA electronic export reporting (CERS guidance for commercial exports).`,
      });
      complianceScore -= 10;
    } else {
      issues.push({
        title: 'CERS declaration not required (demo logic)',
        citation: `Value below ${cersThreshold} CAD and mode ${mode} do not trigger CERS in this simplified checker based on CBSA export reporting thresholds.`,
      });
    }

    // POR# expectation
    issues.push({
      title: 'Proof-of-Report (POR#) missing on invoice',
      citation:
        'POR# should appear on commercial documentation used for export reporting under CBSA export programs.',
    });
    complianceScore -= 8;

    // Country of origin expectation
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
        ocrValue,
        ocrCurrency,
        ocrHsCode,
        ocrTextSnippet: ocrText ? ocrText.slice(0, 200) : '',
      },
      valueSource: {
        sourceAmount,
        sourceCurrency,
        fxNote,
      },
    });
  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ error: 'Internal server error in analyzer' });
  }
}
