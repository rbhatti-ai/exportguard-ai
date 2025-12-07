import PDFDocument from 'pdfkit';

export const config = {
  api: {
    responseType: 'stream',
  },
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Create PDF document
    const doc = new PDFDocument({
      margin: 40,
      size: 'Letter',
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ExportGuard-CBSA-Report.pdf"');

    // Pipe PDF to response
    doc.pipe(res);

    // --- Header Section ---
    doc.fontSize(10).text('GOVERNMENT OF CANADA / GOUVERNEMENT DU CANADA', { align: 'center' });
    doc.fontSize(9).text('Canada Border Services Agency / Agence des services frontaliers du Canada', {
      align: 'center',
    });
    doc.fontSize(9).text('(CBSA / ASFC)', { align: 'center' });
    doc.moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();

    doc.moveDown(0.4);
    doc.fontSize(14).font('Helvetica-Bold').text('EXPORT COMPLIANCE ASSESSMENT REPORT', {
      align: 'center',
    });
    doc.fontSize(10).font('Helvetica').text('Prepared by ExportGuard AI | SinghLabs', {
      align: 'center',
    });

    doc.moveDown(0.6);

    // --- Report Metadata ---
    doc.fontSize(10).font('Helvetica-Bold').text('REPORT DETAILS', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Report Generated: ${new Date().toISOString().split('T')[0]}`, { width: 500 });
    doc.text(`Assessment Type: Canadian Export Reporting System (CERS) Compliance`, {
      width: 500,
    });
    doc.text(
      `Regulatory Framework: CBSA Memorandum D20-1-1 (Exporter Reporting), CERS User Guide`,
      { width: 500 }
    );
    doc.text(`Compliance Score: ${data.complianceScore || 'N/A'}%`, { width: 500 });

    doc.moveDown(0.4);

    // --- Shipment Information Section ---
    doc.fontSize(10).font('Helvetica-Bold').text('SECTION 1: SHIPMENT DETAILS', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica');

    const shipmentInfo = [
      ['Item Description', 'HS Code', data.hsCode || 'Pending'],
      ['Declared Value (CAD)', '', `$${(data.valueCAD || 0).toFixed(2)}`],
      ['Destination Country', '', data.destination || 'Not provided'],
      ['Country of Origin', '', data.origin || 'Not provided'],
      ['Mode of Transport', '', data.mode || 'Not specified'],
      ['Invoice Currency (Source)', '', data.valueSource?.sourceCurrency || 'N/A'],
      [
        'FX Conversion Note',
        '',
        data.valueSource?.fxNote || 'No currency conversion required',
      ],
    ];

    doc.fontSize(9);
    for (const row of shipmentInfo) {
      if (row[1]) {
        doc.text(`${row[0]}: ${row[2]}`, { width: 500 });
      } else {
        doc.text(`${row[0]}: ${row[2]}`, { width: 500 });
      }
    }

    doc.moveDown(0.4);

    // --- CERS Applicability Section ---
    doc.fontSize(10).font('Helvetica-Bold').text('SECTION 2: CBSA EXPORT REPORTING REQUIREMENTS', {
      underline: true,
    });
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica');

    const cersStatus = data.cersRequired ? 'REQUIRED' : 'NOT REQUIRED (Based on demo logic)';
    const cersColor = data.cersRequired ? 'red' : 'green';

    doc.text(
      `Canadian Export Reporting System (CERS) Declaration: ${cersStatus}`,
      { width: 500 }
    );

    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica').text(
      'REGULATORY BASIS (CBSA Memorandum D20-1-1, Exporter Reporting):',
      { underline: true }
    );
    doc.moveDown(0.1);
    doc.fontSize(8).text(
      `Non-restricted commercial goods valued at CAD 2,000 or more destined for countries other than the United States generally require an export declaration in CERS, or export using Air or Rail modes may trigger mandatory CERS reporting. [CBSA D20-1-1, Section: "Commercial goods valued at CAD 2,000 or more"] [CBSA Exporters' guide to reporting, "Determine if an export declaration and/or permit is required"]`,
      { width: 460 }
    );

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold').text('Proof-of-Report (POR#) Status:');
    const porStatus = data.porRequired ? 'REQUIRED' : 'NOT REQUIRED';
    doc.fontSize(9).font('Helvetica').text(`${porStatus}`, { width: 500 });
    doc.moveDown(0.1);
    doc.fontSize(8).text(
      `When CERS is filed, the Canadian Border Services Agency issues a Proof-of-Report number (POR#). This number must be recorded on all shipping and commercial documentation for audit and carrier compliance. [CBSA D20-1-1, Section: "Proof of report"]`,
      { width: 460 }
    );

    doc.moveDown(0.4);

    // --- Compliance Issues Section ---
    doc.fontSize(10).font('Helvetica-Bold').text('SECTION 3: COMPLIANCE FINDINGS', { underline: true });
    doc.moveDown(0.2);

    if (data.issues && data.issues.length > 0) {
      data.issues.forEach((issue, idx) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`Finding ${idx + 1}: ${issue.title}`);
        doc.fontSize(8).font('Helvetica').text(`Observation: ${issue.citation || 'N/A'}`, {
          width: 460,
        });
        doc.moveDown(0.1);
      });
    } else {
      doc.fontSize(9).text('No compliance issues identified.', { width: 500 });
    }

    doc.moveDown(0.4);

    // --- Recommendations Section ---
    doc.fontSize(10).font('Helvetica-Bold').text('SECTION 4: RECOMMENDED ACTIONS', {
      underline: true,
    });
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica');

    const actions = [];
    if (data.cersRequired) {
      actions.push(
        '1. File an export declaration in the CBSA Canadian Export Reporting System (CERS) portal at https://www.cbsa-asfc.gc.ca/services/export/portal-portail/menu-eng.html before shipping. Consult CBSA CERS User Guide for step-by-step instructions.'
      );
      actions.push(
        '2. Record the Proof-of-Report (POR#) number issued by CBSA on all commercial invoices, bills of lading, and carrier documentation.'
      );
    }
    if (!data.origin) {
      actions.push(
        '3. Add the country of origin for each product line to the commercial invoice and export declaration, as required by CBSA and international trading partners.'
      );
    }
    actions.push(
      '4. Retain all export documentation and CERS filings for a minimum of 6 years for CBSA audit purposes.'
    );
    actions.push(
      `5. For complex goods, restricted items, or export permits: consult CBSA's Export Control List (ECL) and contact Global Affairs Canada for permit requirements.`
    );

    actions.forEach((action) => {
      doc.fontSize(9).text(action, { width: 460 });
      doc.moveDown(0.2);
    });

    doc.moveDown(0.3);

    // --- Regulatory References Section ---
    doc.fontSize(10).font('Helvetica-Bold').text('SECTION 5: REGULATORY REFERENCES', {
      underline: true,
    });
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica');

    const references = [
  'CBSA Memorandum D20-1-1: Exporter Reporting (https://www.cbsa-asfc.gc.ca/publications/dm-md/d20/d20-1-1-eng.html)',
  "CBSA Exporters' Guide to Reporting (https://www.cbsa-asfc.gc.ca/services/export/guide-eng.html)",
  'Canadian Export Reporting System (CERS) User Guide (https://www.cbsa-asfc.gc.ca/services/export/cers-guide-scde-eng.html)',
  'CBSA Goods That Do Not Need an Export Declaration (https://www.cbsa-asfc.gc.ca/services/export/ndr-adr-eng.html)',
  'Global Affairs Canada - Export Control List (https://www.international.gc.ca/controls-controles/)',
];


    references.forEach((ref, idx) => {
      doc.text(`[${idx + 1}] ${ref}`, { width: 460 });
    });

    doc.moveDown(0.4);

    // --- Disclaimer Section ---
    doc.fontSize(9).font('Helvetica-Bold').text('IMPORTANT DISCLAIMER', { underline: true });
    doc.moveDown(0.1);
    doc.fontSize(8).font('Helvetica').text(
      `This report is an automated assessment generated by ExportGuard AI, a product of SinghLabs. It is provided for informational purposes only and does not constitute legal or compliance advice. This report is NOT an official CBSA ruling and does not replace guidance from the Canada Border Services Agency or a licensed customs broker.

Exporters are solely responsible for ensuring compliance with all applicable Canadian export regulations, including CERS filing requirements, export permits, and partner-country customs requirements. Always verify current CBSA rules and consult with CBSA directly or through a licensed broker before finalizing export transactions.

Responsibility for accuracy of data: This analysis is based on information you provided (invoice values, destination, origin, mode). ExportGuard AI does not verify the accuracy of OCR extractions or manually entered data. Errors in underlying data will result in incorrect compliance assessments.

Data Privacy: This report is for your use only. Do not share original invoices or sensitive commercial data through unsecured channels.`,
      { width: 460 }
    );

    doc.moveDown(0.4);

    // --- Footer ---
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 40;

    doc.moveTo(40, footerY).lineTo(555, footerY).stroke();
    doc.fontSize(8).text('ExportGuard AI | Powered by SinghLabs', 40, footerY + 5, {
      align: 'center',
    });
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleString()} | Confidential - For Internal Use Only`,
      40,
      footerY + 16,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Could not generate PDF report' });
  }
}
