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
        padding: '40px 24px',
        background: '#f4f5fb', // soft light background
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          background: '#fdfcfb',
          borderRadius: 24,
          boxShadow: '0 18px 45px rgba(15,23,42,0.12)',
          padding: 28,
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Top nav / brand bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Logo placeholder – point src to your hosted Self-1.jpg when available */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #facc15',
                backgroundColor: '#111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
              }}
            >
              {/* Replace text with <img src="/Self-1.jpg" alt="SinghLabs" style={{width:'100%',height:'100%',objectFit:'cover'}} /> once the file is in /public */}
              <span role="img" aria-label="SinghLabs">
                🎓
              </span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>ExportGuard AI</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                CBSA export-readiness assistant for Canadian commercial invoices
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: 'right',
              fontSize: 11,
              color: '#4b5563',
              maxWidth: 280,
            }}
          >
            <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>Created by SinghLabs</div>
            <div>
              A research and innovation company that has expertise in designing AI powered
              solutions to support Canadian businesses in supply chain management, trade &amp;
              commerce, regulatory compliance, safety, human resources and other key functional
              domains.
            </div>
          </div>
        </header>

        <main style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {/* Left: input card */}
          {!result && (
            <section
              style={{
                flex: 1,
                minWidth: 320,
                background: '#ffffff',
                borderRadius: 18,
                padding: 24,
                border: '1px solid #e5e7eb',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
                1. Upload invoice
              </h2>

              <form onSubmit={handleUpload}>
                <div
                  style={{
                    border: '2px dashed #cbd5f5',
                    borderRadius: 14,
                    padding: 28,
                    textAlign: 'center',
                    marginBottom: 20,
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
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                      Drag &amp; drop invoice, or click to browse
                    </div>
                    <div style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>
                      PDF, JPG, JPEG, PNG, HEIC up to 25 MB
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '9px 20px',
                        background: '#1d4ed8',
                        color: '#ffffff',
                        borderRadius: 999,
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      Select file
                    </span>
                  </label>
                  {file && (
                    <div style={{ marginTop: 16, color: '#374151', fontSize: 13 }}>
                      Selected: <strong>{file.name}</strong>
                    </div>
                  )}
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    marginBottom: 8,
                    marginTop: 4,
                    color: '#111827',
                  }}
                >
                  2. Shipment details
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      Declared value
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <select
                        name="currency"
                        defaultValue="CAD"
                        onChange={(e) => (window.exportguard_currency = e.target.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          fontSize: 13,
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
                          borderRadius: 10,
                          border: '1px solid #d1d5db',
                          width: 150,
                          fontSize: 13,
                        }}
                        placeholder="Invoice total"
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                      Leave empty to let ExportGuard read the total from the invoice automatically.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      Destination country
                    </label>
                    <input
                      type="text"
                      name="destination"
                      onChange={(e) => (window.exportguard_destination = e.target.value)}
                      style={{
                        marginTop: 6,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        width: '100%',
                        fontSize: 13,
                      }}
                      placeholder="United States, Mexico, Germany…"
                    />
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                      CBSA CERS rules differ for shipments to the United States vs other countries.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      Country of origin
                    </label>
                    <input
                      type="text"
                      name="origin"
                      onChange={(e) => (window.exportguard_origin = e.target.value)}
                      style={{
                        marginTop: 6,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        width: '100%',
                        fontSize: 13,
                      }}
                      placeholder="Canada, USA, China…"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      Mode of transport
                    </label>
                    <select
                      name="mode"
                      defaultValue="Air"
                      onChange={(e) => (window.exportguard_mode = e.target.value)}
                      style={{
                        marginTop: 6,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        fontSize: 13,
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
                    marginTop: 22,
                    padding: '13px 18px',
                    background: analyzing ? '#9ca3af' : '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: !file || analyzing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {analyzing ? 'Analyzing invoice…' : 'Analyze CBSA compliance'}
                </button>

                {error && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 10,
                      borderRadius: 10,
                      background: '#fef2f2',
                      color: '#b91c1c',
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </div>
                )}
              </form>
            </section>
          )}

          {/* Right or full-width: analysis card */}
          {result && (
            <section
              style={{
                flex: 1.2,
                minWidth: 360,
                background: '#ffffff',
                borderRadius: 18,
                padding: 22,
                border: '1px solid #e5e7eb',
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
                Compliance analysis
              </h2>

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
                  <strong>
                    {summary.cersRequired ? 'Required' : 'Not required (demo logic)'}
                  </strong>{' '}
                  · POR#:{' '}
                  <strong>
                    {summary.porRequired ? 'Required' : 'Not required (demo logic)'}
                  </strong>{' '}
                  · Export permit: <strong>Not checked in this demo</strong>
                  <br />
                  <span style={{ fontSize: 11, color: '#4b5563' }}>
                    Guidance only, based on CBSA Exporters’ guide to reporting, CERS user guides and
                    Memorandum D20-1-1 on exporter reporting thresholds. Always confirm with CBSA
                    resources or a licensed customs broker.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 38, fontWeight: 800, color: '#15803d' }}>
                    {result.complianceScore ?? 0}%
                  </div>
                  <div style={{ color: '#6b7280', marginTop: 4, fontSize: 13 }}>
                    CBSA compliance score (ExportGuard)
                  </div>
                  <div style={{ marginTop: 14, fontSize: 14, color: '#4b5563' }}>
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
                    <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
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
                          borderRadius: 10,
                          marginBottom: 10,
                          fontSize: 14,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#b91c1c' }}>{issue.title}</div>
                        {issue.citation && (
                          <div style={{ color: '#7f1d1d', marginTop: 2 }}>{issue.citation}</div>
                        )}

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
                                Memorandum D20-1-1
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
                              • After filing in CERS, record the Proof-of-Report number (POR#) on
                              this invoice or related documents for carriers and audit.
                              <br />
                              • See POR# usage in CBSA exporter guidance and CERS user guides.
                              [web:298][web:300]
                            </>
                          )}

                          {isOrigin && (
                            <>
                              • Add the country of origin for each product line on the commercial
                              invoice.
                              <br />
                              • Refer to CBSA’s origin and certificates guidance and CERS mandatory
                              data elements. [web:298][web:316][web:303]
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
                  padding: '9px 18px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Analyze another invoice
              </button>
               <div
  style={{
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px solid #e5e7eb',
    fontSize: 12,
    color: '#6b7280',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  }}
>
  <span>Help improve ExportGuard for Canadian exporters.</span>
  <button
    type="button"
    onClick={() =>
      openLink('https://forms.gle/YOUR_EXPORTGUARD_FEEDBACK_ID')
    }
    style={{
      border: 'none',
      background: '#111827',
      color: '#f9fafb',
      padding: '6px 14px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      cursor: 'pointer',
    }}
  >
    Share feedback (2–3 minutes)
  </button>
</div>
   
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
