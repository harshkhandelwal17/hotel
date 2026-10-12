const path = require('path');
const fs = require('fs');
const Hostel = require('../models/Hostel');

// In-memory cache for instant OCR response (Key: imageUrl + ':' + side)
const ocrCache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

// Periodic cache cleanup
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, item] of ocrCache.entries()) {
    if (now - item.timestamp > CACHE_TTL_MS) {
      ocrCache.delete(key);
    }
  }
};

/**
 * Scan ID Proof using Google Gemini Vision AI
 * @route POST /api/ocr/scan-id
 * @access Private (Hostel Staff / Admin / Superadmin)
 */
exports.scanIdCard = async (req, res, next) => {
  const scanStartTime = Date.now();
  try {
    const { imageUrl, side = 'front', hostelId, idProofType = 'Aadhaar' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required for scanning' });
    }

    // 1. Check in-memory cache for instant response (0.01s)
    cleanExpiredCache();
    const cacheKey = `${imageUrl}:${side}:${idProofType}`;
    if (ocrCache.has(cacheKey)) {
      const cached = ocrCache.get(cacheKey);
      console.log(`[OCR] ⚡ Served from cache in ${Date.now() - scanStartTime}ms for ${side} ID`);
      return res.status(200).json({
        success: true,
        side,
        data: cached.data,
        cached: true
      });
    }

    // 2. Resolve Hostel
    let targetHostelId = hostelId || req.user.assignedHostel;
    if (!targetHostelId && req.user.role === 'admin') {
      const myHostels = await Hostel.find({ owner: req.user.id });
      if (myHostels.length > 0) targetHostelId = myHostels[0]._id;
    }

    if (!targetHostelId && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Property context required for AI scanning' });
    }

    // 3. Check if property has AI OCR enabled (Superadmin bypasses)
    if (req.user.role !== 'superadmin' && targetHostelId) {
      const hostel = await Hostel.findById(targetHostelId);
      if (!hostel) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }

      if (!hostel.aiOcrEnabled) {
        return res.status(403).json({
          success: false,
          code: 'AI_OCR_DISABLED',
          message: `AI Scanner is not enabled for ${hostel.name}. Please contact Super Admin to activate AI features.`,
          aiOcrEnabled: false
        });
      }
    }

    // 4. Verify Gemini API Key
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      try {
        require('dotenv').config();
        apiKey = process.env.GEMINI_API_KEY;
      } catch (_) {}
    }
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in backend environment.'
      });
    }

    // 5. Download Image Buffer and Convert to Base64 (High-speed local read if available)
    let base64Image = '';
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:image/')) {
      const parts = imageUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) mimeType = mimeMatch[1];
      base64Image = parts[1];
    } else {
      // 🚀 SPEED OPTIMIZATION: Check if this file exists on local VPS disk first!
      // All WhatsApp photos and local uploads are written to uploads/ folder.
      // Reading from disk takes 1ms vs downloading from Cloudflare R2 (1000ms+).
      const filename = path.basename(imageUrl.split('?')[0]);
      const localPath = path.join(__dirname, '../../uploads', filename);

      if (fs.existsSync(localPath)) {
        const buffer = await fs.promises.readFile(localPath);
        base64Image = buffer.toString('base64');
        mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      } else if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
        return res.status(404).json({ success: false, message: 'Local image file not found on server' });
      } else {
        // Remote fetch with 8s timeout
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
        if (!imgRes.ok) {
          return res.status(400).json({ success: false, message: 'Could not fetch uploaded ID image for AI analysis' });
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Image = buffer.toString('base64');
        const headerType = imgRes.headers.get('content-type');
        if (headerType) mimeType = headerType.split(';')[0];
      }
    }

    // 6. Fast, concise prompts optimized for token speed and accuracy
    let prompt = '';
    if (side === 'front') {
      prompt = `Extract Indian ${idProofType} front details as JSON:
{
  "fullName": "Full name in English title case (e.g. Rahul Sharma)",
  "idProofNumber": "ID number with standard spaces (e.g. 1234 5678 9012 for Aadhaar)",
  "gender": "Male or Female or Other",
  "dateOfBirth": "DD/MM/YYYY or YYYY",
  "fatherName": "Father or husband name if present, else empty string"
}
Return ONLY valid JSON.`;
    } else {
      prompt = `Extract Indian ${idProofType} back address details as JSON:
{
  "address": "Complete clean residential address formatted as single comma-separated line (e.g., House No, Street, City, State - PINCODE)",
  "pincode": "6-digit postal PIN code (e.g. 452010)",
  "careOf": "Care of (C/O, S/O, D/O, W/O) person name if present, else empty string"
}
Return ONLY valid JSON.`;
    }

    // 7. Helper to clean and normalize extracted JSON
    const cleanOcrOutput = (data) => {
      if (!data || typeof data !== 'object') return {};
      if (side === 'front') {
        if (data.idProofNumber) {
          const digitsOnly = String(data.idProofNumber).replace(/[^0-9]/g, '');
          if (digitsOnly.length === 12) {
            data.idProofNumber = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 8)} ${digitsOnly.slice(8, 12)}`;
          }
        }
        if (data.gender) {
          const g = String(data.gender).toLowerCase();
          if (g.includes('fe') || g.includes('महिला')) data.gender = 'Female';
          else if (g.includes('ma') || g.includes('पुरुष')) data.gender = 'Male';
          else data.gender = 'Other';
        }
        if (data.dateOfBirth) {
          data.dateOfBirth = String(data.dateOfBirth).replace(/^(DOB|Date of Birth|Birth):?\s*/i, '').trim();
        }
        if (data.fullName) {
          data.fullName = String(data.fullName).replace(/^(Name|Full Name):?\s*/i, '').trim();
        }
      } else {
        if (data.pincode) {
          const m = String(data.pincode).match(/\b\d{6}\b/);
          if (m) data.pincode = m[0];
        }
        if (data.address) {
          data.address = String(data.address).replace(/^(Address|Permanent Address):?\s*/i, '').trim();
        }
      }
      return data;
    };

    const parseJsonText = (candidateText) => {
      try {
        const cleanedText = candidateText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          return JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
        }
        return JSON.parse(cleanedText);
      } catch (_) {
        return { rawText: candidateText };
      }
    };

    let extractedData = null;
    let successfulModel = '';
    let usedProvider = 'gemini';
    let lastErrorText = '';

    // 8. PRIMARY ENGINE: Google Gemini Vision AI
    // Highest accuracy for Indian Aadhaar and Hindi/English documents
    const candidateModels = [
      'gemini-3.5-flash-lite',   // 500 RPD free ⭐ (primary high-quota model)
      'gemini-3.1-flash-lite',   // 500 RPD free ⭐ (secondary high-quota model)
      'gemini-3-flash',          // 20 RPD fallback
      'gemini-3.5-flash',        // 20 RPD fallback
      'gemini-3.7-flash',        // 20 RPD last resort
    ];

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 300,
        responseMimeType: "application/json"
      }
    };

    if (apiKey) {
      for (const modelName of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          // 12-second timeout per model for fast failover
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
            signal: AbortSignal.timeout(12000)
          });

          if (response.ok) {
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            extractedData = cleanOcrOutput(parseJsonText(text));
            successfulModel = modelName;
            usedProvider = 'gemini';
            break;
          } else {
            lastErrorText = await response.text();
            console.warn(`[OCR] Gemini ${modelName} (${response.status}):`, lastErrorText.slice(0, 120));
            // Immediately continue to next model on 429, 404, 500, 503
          }
        } catch (err) {
          lastErrorText = err.message;
          console.warn(`[OCR] Gemini ${modelName} error:`, err.message);
        }
      }
    }

    // 9. SECONDARY ENGINE (FALLBACK): Groq Vision (Llama 3.2 Vision on LPU)
    // Runs when Gemini has 429 quota exhaustion or timeouts
    let groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      try {
        require('dotenv').config();
        groqApiKey = process.env.GROQ_API_KEY;
      } catch (_) {}
    }

    if (!extractedData && groqApiKey) {
      console.log('[OCR] 🔄 Falling back to Groq Llama 3.2 Vision engine...');
      const groqModels = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];
      for (const gModel of groqModels) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: gModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt + '\nReturn ONLY a JSON object.' },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                      }
                    }
                  ]
                }
              ],
              temperature: 0.1,
              max_tokens: 300,
              response_format: { type: 'json_object' }
            }),
            signal: AbortSignal.timeout(10000)
          });

          if (groqRes.ok) {
            const groqJson = await groqRes.json();
            const content = groqJson.choices?.[0]?.message?.content || '{}';
            extractedData = cleanOcrOutput(parseJsonText(content));
            successfulModel = gModel;
            usedProvider = 'groq';
            console.log(`[OCR] ⚡ Groq Vision succeeded with model: ${gModel}`);
            break;
          } else {
            const gErr = await groqRes.text();
            console.warn(`[OCR] Groq ${gModel} status ${groqRes.status}:`, gErr.slice(0, 120));
          }
        } catch (groqErr) {
          console.warn(`[OCR] Groq ${gModel} error:`, groqErr.message);
        }
      }
    }

    if (!extractedData) {
      console.error('[OCR] All AI Vision candidates failed:', lastErrorText);
      return res.status(502).json({
        success: false,
        message: 'AI OCR service busy or quota limit reached. Please fill fields manually or try again in a moment.',
        details: lastErrorText
      });
    }

    // 10. Store in cache for instant re-use
    ocrCache.set(cacheKey, {
      timestamp: Date.now(),
      data: extractedData
    });

    const totalElapsed = Date.now() - scanStartTime;
    console.log(`[OCR] 🚀 Successfully scanned ID (${side}) using ${usedProvider} (${successfulModel}) in ${totalElapsed}ms`);

    res.status(200).json({
      success: true,
      side,
      data: extractedData,
      provider: usedProvider,
      modelUsed: successfulModel,
      latencyMs: totalElapsed
    });

  } catch (error) {
    console.error('[OCR] ID scanning failed:', error);
    next(error);
  }
};
