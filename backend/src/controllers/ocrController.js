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
    } else if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      // Direct disk read: zero network latency!
      const filename = path.basename(imageUrl.split('?')[0]);
      const localPath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(localPath)) {
        const buffer = await fs.promises.readFile(localPath);
        base64Image = buffer.toString('base64');
        mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      } else {
        return res.status(404).json({ success: false, message: 'Local image file not found on server' });
      }
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

    // 6. Fast, concise prompts optimized for token speed
    let prompt = '';
    if (side === 'front') {
      prompt = `Extract Indian ${idProofType} front details as JSON:
{
  "fullName": "Full name in English title case (e.g. Rahul Sharma)",
  "idProofNumber": "ID number with spaces (e.g. 1234 5678 9012 for Aadhaar)",
  "gender": "Male or Female or Other",
  "dateOfBirth": "DD/MM/YYYY or YYYY",
  "fatherName": "Father's or husband's name if present, else empty string"
}
Return ONLY valid JSON.`;
    } else {
      prompt = `Extract Indian ${idProofType} back address details as JSON:
{
  "address": "Complete clean residential address formatted as single comma-separated line (e.g., House No, Street, Colony, City, State - PINCODE). Clean UIDAI or noisy text.",
  "pincode": "6-digit postal PIN code (e.g. 452010)",
  "careOf": "Care of (C/O, S/O, D/O, W/O) person name if present, else empty string"
}
Return ONLY valid JSON.`;
    }

    // 7. Active, ultra-fast Gemini candidate models (Lite model first for instant speed & high quota)
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash'
    ];

    const requestPayload = {
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

    let apiResponse = null;
    let successfulModel = '';
    let lastErrorText = '';

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        // Fast 6.5-second timeout per model
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(6500)
        });

        if (response.ok) {
          apiResponse = response;
          successfulModel = modelName;
          break;
        } else {
          lastErrorText = await response.text();
          console.warn(`[OCR] Gemini ${modelName} returned ${response.status}:`, lastErrorText.slice(0, 150));
          // Continue to next model on 404, 503, 500, or 429
          if (response.status !== 404 && response.status !== 503 && response.status !== 429 && response.status !== 500) {
            break;
          }
        }
      } catch (err) {
        lastErrorText = err.message;
        console.warn(`[OCR] Model ${modelName} attempt error:`, err.message);
      }
    }

    if (!apiResponse) {
      console.error('[OCR] All Gemini Vision candidates failed:', lastErrorText);
      return res.status(502).json({
        success: false,
        message: 'AI OCR service busy or quota limit reached. Please fill fields manually or try again in a moment.',
        details: lastErrorText
      });
    }

    const result = await apiResponse.json();
    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // 8. Robust JSON extraction
    let extractedData = {};
    try {
      const cleanedText = candidateText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        extractedData = JSON.parse(cleanedText.substring(firstBrace, lastBrace + 1));
      } else {
        extractedData = JSON.parse(cleanedText);
      }
    } catch (parseErr) {
      console.error('[OCR] Failed to parse JSON output:', candidateText);
      extractedData = { rawText: candidateText };
    }

    // 9. Store in cache for instant re-use
    ocrCache.set(cacheKey, {
      timestamp: Date.now(),
      data: extractedData
    });

    const totalElapsed = Date.now() - scanStartTime;
    console.log(`[OCR] 🚀 Successfully scanned ID (${side}) using ${successfulModel} in ${totalElapsed}ms`);

    res.status(200).json({
      success: true,
      side,
      data: extractedData,
      modelUsed: successfulModel,
      latencyMs: totalElapsed
    });

  } catch (error) {
    console.error('[OCR] ID scanning failed:', error);
    next(error);
  }
};
