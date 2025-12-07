import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('valueCAD', window.exportguard_valueCAD || '');
      formData.append('destination', window.exportguard_destination || '');
      formData.append('origin', window.exportguard_origin || '');
      formData.append('currency', window.exportguard_currency || 'CAD');
      formData.append('mode', window.exportguard_mode || 'Air');
      formData.append('invoice', file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Analysis failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Could not analyze this document yet. Please try another file.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSummary = () => {
    if (!result) return null;

    return {
      cersRequired: !!result.cersRequired,
      porRequired: !!result.porRequired,
      permitChecked: false,
      cersSource:
        'CBSA Exporters’ guide to reporting and Memorandum D20-1-1 (commercial goods valued at CAD 2,000 or more; US vs non-US destinations).',
      porSource:
        'CBSA exporter reporting and CERS guides describing Proof-of-Report (POR#) on commercial documents.',
    };
  };

  const summary = getSummary();

  const openLink = (url) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '40px',
        background: '#f3f4f6',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 8 }}>ExportGuard AI</h1>
        <p style={{ marginBottom: 24, color: '#4b5563' }}>
          Upload a commercial invoice image or PDF and get an instant CBSA export-compliance view
          based on CERS thresholds, POR# expectations, and origin data.
        </p>

        {!result && (
          <form
            onSubmit={handleUpload}
            style={{
              background: '#ffffff',
              padding: 32,
              borderRadius: 16,
              boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>1. Upload invoice</h2>
            <div
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                marginBottom: 24,
                background: '#f9fafb',
              }}
            >
              <input
                id="upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="upload" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  Drag &amp; drop invoice, or click to choose
                </div>
                <div style={{ color: '#6b7280', marginBottom: 16 }}>
                  PDF, JPG, JPEG, PNG, HEIC up to 25 MB
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '10px 22px',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: 999,
                    fontWeight: 500,
                  }}
                >
                  Select file
                </span>
              </label>
              {file && (
                <div style={{ marginTop: 16, color: '#374151' }}>
                  Selected: <strong>{file.name}</strong>
                </div>
              )}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>2. Shipment details</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Declared value
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <select
                    name="currency"
                    defaultValue="CAD"
                    onChange={(e) => (window.exportguard_currency = e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    name="valueCAD"
                    onChange={(e) => (window.exportguard_valueCAD = e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      width: 140,
                    }}
                    placeholder="1350"
                  />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Leave blank to let ExportGuard read the total from the invoice automatically.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Destination country
                </label>
                <input
                  type="text"
                  name="destination"
                  onChange={(e) => (window.exportguard_destination = e.target.value)}
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    width: 220,
                  }}
                  placeholder="United States, Mexico, Germany…"
                />
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  CBSA CERS rules differ for shipments to the United States vs other destinations.
                </div>
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Country of origin
                </label>
                <input
                  type="text"
                  name="origin"
                  onChange={(e) => (window.exportguard_origin = e.target.value)}
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    width: 200,
                  }}
                  placeholder="Canada, USA, China…"
                />
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Mode of transport
                </label>
                <select
                  name="mode"
                  defaultValue="Air"
                  onChange={(e) => (window.exportguard_mode = e.target.value)}
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    width: 180,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="Air">Air</option>
                  <option value="Rail">Rail</option>
                  <option value="Truck">Truck</option>
                  <option value="Ocean">Ocean</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || analyzing}
              style={{
                width: '100%',
                marginTop: 24,
                padding: '14px 18px',
                background: analyzing ? '#9ca3af' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 600,
                cursor: !file || analyzing ? 'not-allowed' : 'pointer',
              }}
            >
              {analyzing ? 'Analyzing invoice…' : 'Analyze CBSA compliance'}
            </button>

            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}
          </form>
        )}

        {result && (
          <div
            style={{
              marginTop: 24,
              background: '#ffffff',
              padding: 28,
              borderRadius: 16,
              boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Compliance analysis</h2>

            {summary && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 10,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  fontSize: 14,
                  color: '#1d4ed8',
                }}
              >
                <strong>CBSA summary:</strong>{' '}
                CERS:{' '}
                <strong>{summary.cersRequired ? 'Required' : 'Not required (demo logic)'}</strong>{' '}
                · POR#:{' '}
                <strong>{summary.porRequired ? 'Required' : 'Not required (demo logic)'}</strong>{' '}
                · Export permit: <strong>Not checked in this demo</strong>
                <br />
                <span style={{ fontSize: 12, color: '#4b5563' }}>
                  Based on CBSA Exporters’ guide to reporting, CERS user guides and Memorandum
                  D20-1-1 on exporter reporting thresholds. This is guidance only and does not
                  replace advice from CBSA or a licensed customs broker.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 800, color: '#16a34a' }}>
                  {result.complianceScore ?? 0}%
                </div>
                <div style={{ color: '#6b7280', marginTop: 4 }}>CBSA compliance score</div>
                <div style={{ marginTop: 16, fontSize: 14, color: '#4b5563' }}>
                  HS: <strong>{result.hsCode || 'n/a'}</strong>
                  <br />
                  Value (CAD): <strong>{result.valueCAD ?? 'n/a'}</strong>
                  <br />
                  Destination: <strong>{result.destination || 'n/a'}</strong>
                  <br />
                  Origin: <strong>{result.origin || 'n/a'}</strong>
                  <br />
                  Mode: <strong>{result.mode || 'n/a'}</strong>
                </div>
                {result.valueSource && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
                    <div>
                      Source value:{' '}
                      <strong>
                        {result.valueSource.sourceAmount ?? 'n/a'}{' '}
                        {result.valueSource.sourceCurrency || ''}
                      </strong>
                    </div>
                    <div>FX note: {result.valueSource.fxNote}</div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 260 }}>
                {(result.issues || []).map((issue, i) => {
                  const titleLower = (issue.title || '').toLowerCase();
                  const isCers = titleLower.includes('cers');
                  const isPor = titleLower.includes('proof-of-report');
                  const isOrigin = titleLower.includes('country of origin');

                  return (
                    <div
                      key={i}
                      style={{
                        background: '#fef2f2',
                        borderLeft: '4px solid #dc2626',
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 10,
                        fontSize: 14,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#b91c1c' }}>{issue.title}</div>
                      {issue.citation && (
                        <div style={{ color: '#7f1d1d', marginTop: 2 }}>{issue.citation}</div>
                      )}

                      {/* Sources & links */}
                      <div style={{ marginTop: 6, fontSize: 12, color: '#7f1d1d' }}>
                        <strong>Sources &amp; next steps:</strong>
                        <br />
                        {isCers && (
                          <>
                            • Review CBSA{' '}
                            <button
                              type="button"
                              onClick={() =>
                                openLink(
                                  'https://www.cbsa-asfc.gc.ca/services/export/guide-eng.html'
                                )
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#1d4ed8',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Exporters’ guide to reporting
                            </button>{' '}
                            and{' '}
                            <button
                              type="button"
                              onClick={() =>
                                openLink(
                                  'https://www.cbsa-asfc.gc.ca/publications/dm-md/d20/d20-1-1-eng.html'
                                )
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#1d4ed8',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Memorandum D20-1-1 (Exporter Reporting)
                            </button>
                            .
                            <br />
                            • File an export declaration in the{' '}
                            <button
                              type="button"
                              onClick={() =>
                                openLink(
                                  'https://www.cbsa-asfc.gc.ca/services/export/portal-portail/menu-eng.html'
                                )
                              }
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#1d4ed8',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              CERS portal
                            </button>{' '}
                            if your goods are not exempt. [web:298][web:300][web:339]
                          </>
                        )}

                        {isPor && (
                          <>
                            • After filing in CERS, record the Proof-of-Report number (POR#) on this
                            invoice or related documents for carriers and audit.
                            <br />
                            • See POR# usage in CBSA exporter guidance and CERS user guides. [web:298][web:300]
                          </>
                        )}

                        {isOrigin && (
                          <>
                            • Add the country of origin for each product line on the commercial
                            invoice.
                            <br />
                            • Refer to CBSA’s origin and certificates guidance and CERS data
                            elements. [web:298][web:316][web:303]
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setFile(null);
              }}
              style={{
                marginTop: 20,
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Analyze another invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
