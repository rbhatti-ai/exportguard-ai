// pages/index.js - Upload Screen
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setAnalyzing(true);
    
    const formData = new FormData();
    formData.append('invoice', file);
    
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    setResult(data);
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          📄 ExportGuard AI - CBSA Compliance
        </h1>
        
        {!result ? (
          <form onSubmit={handleUpload} className="bg-white p-12 rounded-2xl shadow-xl">
            <div className="border-4 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="upload"
              />
              <label htmlFor="upload" className="cursor-pointer">
                <div className="text-2xl mb-4">📱</div>
                <p className="text-xl font-medium text-gray-700 mb-2">
                  Drag invoice or take photo
                </p>
                <p className="text-gray-500 mb-8">PDF, JPG, PNG, HEIC supported</p>
                <div className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700">
                  Choose File
                </div>
              </label>
            </div>
            <button 
              type="submit" 
              disabled={!file || analyzing}
              className="w-full mt-8 bg-green-600 text-white py-4 rounded-xl text-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {analyzing ? '🔍 Analyzing...' : '🚀 Analyze CBSA Compliance'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">📊 Compliance Analysis Complete</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {result.complianceScore}%
                </div>
                <div className="text-lg text-gray-600 mb-6">
                  CBSA Compliance Score
                </div>
                {result.issues.map((issue, i) => (
                  <div key={i} className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="font-medium text-red-800">{issue.title}</div>
                    <div className="text-sm text-red-700">{issue.citation}</div>
                  </div>
                ))}
              </div>
              <div>
                <button className="w-full bg-blue-600 text-white py-3 rounded-xl mb-4">
                  🎤 Play Voice Report
                </button>
                <button className="w-full bg-green-600 text-white py-3 rounded-xl">
                  📄 Generate CERS Form
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
