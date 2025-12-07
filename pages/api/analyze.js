// api/analyze.js - Document Intelligence + Threshold Engine
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const file = req.body.invoice;
  
  // OCR Extraction
  const { data: { text } } = await Tesseract.recognize(file, 'eng');
  
  // AI Analysis
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'system',
      content: `You are ExportGuard AI, CBSA compliance expert. Analyze this invoice text and return JSON:
      {
        "hsCode": "8479.89.00",
        "valueCAD": 8500,
        "destination": "Mexico", 
        "quantity": 100,
        "complianceScore": 82,
        "issues": [
          {"title": "CERS Required", "citation": "D20-1-1 para 14.2"},
          {"title": "POR# Missing", "citation": "Export Guide"}
        ]
      }`
    }, {
      role: 'user', 
      content: text
    }]
  });

  const result = JSON.parse(completion.choices[0].message.content);
  res.json(result);
}
