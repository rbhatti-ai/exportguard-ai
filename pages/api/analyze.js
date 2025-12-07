export const config = {
  api: {
    bodyParser: false,
  },
};

async function readFormFields(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return {};

  const parts = buffer.toString('utf8').split(`--${boundary}`);
  const fields = {};

  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    const [rawHeaders, rawBody] = part.split('\r\n\r\n');
    const nameMatch = rawHeaders.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    if (!rawHeaders.includes('filename=')) {
      fields[name] = rawBody.replace(/\r\n--$/, '').trim();
    }
  }

  return fields;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fields = await readFormFields(req);

  const valueCAD = Number(fields.valueCAD || 0);
  const destination = (fields.destination || '').trim() || 'Unknown';

  // Simple CBSA logic (demo)
  const issues = [];
  let complianceScore = 100;

  const cersThreshold = 2000;
  const mode = 'Air';

  if (valueCAD >= cersThreshold || ['Air', 'Rail'].includes(mode)) {
    issues.push({
      title: 'CERS declaration required',
      citation: `Value ${valueCAD.toFixed(2)} CAD and mode ${mode} trigger CERS reporting threshold.`,
    });
    complianceScore -= 10;
  }

  issues.push({
    title: 'Proof-of-Report (POR#) missing on invoice',
    citation: 'POR# must appear on export documentation.',
  });
  complianceScore -= 8;

  issues.push({
    title: 'Country of origin field not detected',
    citation: 'Commercial invoices should state country of origin.',
  });
  complianceScore -= 10;

  if (complianceScore < 0) complianceScore = 0;

  return res.status(200).json({
    hsCode: '8479.89.00',
    valueCAD,
    destination,
    complianceScore,
    issues,
  });
}
