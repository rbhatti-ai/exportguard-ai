export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For now, ignore the actual file and return a demo analysis
  // so you can show ExportGuard working end-to-end.

  return res.status(200).json({
    hsCode: '8479.89.00',
    valueCAD: 8500,
    destination: 'Mexico',
    complianceScore: 82,
    issues: [
      {
        title: 'CERS declaration required (value > $2,000 CAD)',
        citation: 'CBSA D20-1-1 – CERS reporting threshold',
      },
      {
        title: 'Proof-of-Report (POR#) missing on invoice',
        citation: 'CBSA Export Reporting – POR# documentation',
      },
      {
        title: 'Country of origin field not found',
        citation: 'CBSA commercial invoice data requirements',
      },
    ],
  });
}
