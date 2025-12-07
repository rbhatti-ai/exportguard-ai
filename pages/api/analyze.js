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
  const mode = (fields.mode || 'Air').trim(); // Air / Rail / Truck / Ocean

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
      )} CAD and mode ${mode} trigger CBSA electronic export reporting.`,
    });
    complianceScore -= 10;
  } else {
    issues.push({
      title: 'CERS declaration not required (demo logic)',
      citation: `Value below ${cersThreshold} CAD and mode ${mode} do not trigger CERS in this simplified checker.`,
    });
  }

  issues.push({
    title: 'Proof-of-Report (POR#) missing on invoice',
    citation: 'POR# should appear on commercial documentation used for export reporting.',
  });
  complianceScore -= 8;

  issues.push({
    title: 'Country of origin field not detected',
    citation: 'Commercial invoices should state the country of origin for each line item.',
  });
  complianceScore -= 10;

  if (complianceScore < 0) complianceScore = 0;

  return res.status(200).json({
    hsCode: '8479.89.00',
    valueCAD,
    destination,
    mode,
    complianceScore,
    issues,
  });
}
