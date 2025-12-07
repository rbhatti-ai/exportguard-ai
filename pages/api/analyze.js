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

// --- Helper: call external OCR/AI service (placeholder) ---
async function callOcrService(fileBuffer) {
  if (!fileBuffer) {
    return {
      ocrText: '',
      ocrHsCode: null,
      ocrValueCAD: null,
    };
  }

  // For now, just return empty values; real Document AI call comes later
  return {
    ocrText: '',
    ocrHsCode: null,
    ocrValueCAD: null,
  };
}

async function callOcrService(fileBuffer) {
  if (!fileBuffer) {
    return {
      ocrText: '',
      ocrHsCode: null,
      ocrValueCAD: null,
    };
  }

  // Placeholder only: replace with a real OCR/customs‑extraction API.
  // Example of what a real call might look like:
  //
  // const resp = await fetch('https://YOUR_OCR_ENDPOINT/customs-extract', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.OCR_API_KEY}`,
  //     'Content-Type': 'application/octet-stream',
  //   },
  //   body: fileBuffer,
  // });
  // const json = await resp.json();
  //
  // Map from your provider’s JSON into:
  //   hsCode: json.hs_code
  //   valueCAD: json.total_value_cad
  //   text: json.raw_text

  // For now, return a fixed demo response so the rest of the pipeline works.
  return {
    ocrText: 'Demo OCR result – invoice text not yet parsed.',
    ocrHsCode: '8479.89.00',
    ocrValueCAD: 8500,
  };
}

// --- Main handler: parse form → OCR → CBSA logic ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, file } = await parseMultipartForm(req);
const { ocrText, ocrHsCode, ocrValueCAD } = await callOcrService(file);

    // Inputs from user
    const typedValue = fields.valueCAD ? Number(fields.valueCAD) : null;
    const destination = (fields.destination || '').trim() || 'Unknown';
    const mode = (fields.mode || 'Air').trim(); // Air / Rail / Truck / Ocean

    // Call OCR / AI extraction (placeholder)
    const { ocrText, ocrHsCode, ocrValueCAD } = await callOcrService(file);

    // Decide which value to use
    const valueCAD = typedValue != null && !Number.isNaN(typedValue)
      ? typedValue
      : ocrValueCAD != null
      ? Number(ocrValueCAD)
      : 0;

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
