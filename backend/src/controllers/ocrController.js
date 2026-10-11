const Hostel = require('../models/Hostel');

/**
 * Scan ID Proof using Google Gemini Vision AI
 * @route POST /api/ocr/scan-id
 * @access Private (Hostel Staff / Admin / Superadmin)
 */
exports.scanIdCard = async (req, res, next) => {
  try {
    const { imageUrl, side = 'front', hostelId, idProofType = 'Aadhaar' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required for scanning' });
    }

    // 1. Resolve Hostel
    let targetHostelId = hostelId || req.user.assignedHostel;
    if (!targetHostelId && req.user.role === 'admin') {
      const myHostels = await Hostel.find({ owner: req.user.id });
      if (myHostels.length > 0) targetHostelId = myHostels[0]._id;
    }

    if (!targetHostelId && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Property context required for AI scanning' });
    }

    // 2. Check if property has AI OCR enabled (Superadmin bypasses)
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

    // 3. Verify Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in backend environment. Please set GEMINI_API_KEY in .env file.'
      });
    }

    // 4. Download Image Buffer and Convert to Base64
    let base64Image = '';
    let mimeType = 'image/jpeg';

    if (imageUrl.startsWith('data:image/')) {
      const parts = imageUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) mimeType = mimeMatch[1];
      base64Image = parts[1];
    } else {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return res.status(400).json({ success: false, message: 'Could not fetch uploaded ID image for AI analysis' });
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Image = buffer.toString('base64');
      const headerType = imgRes.headers.get('content-type');
      if (headerType) mimeType = headerType.split(';')[0];
    }

    // 5. Construct Prompts for Front vs Back ID
    let prompt = '';
    if (side === 'front') {
      prompt = `You are a high-precision Indian government ID and Aadhaar OCR reader for an automated hotel check-in system.
Examine this ${idProofType} front image carefully.
Even if the image has glare, tilted angles, reflection, shadows, or mixed Hindi/English text, extract the exact information.

Return ONLY a valid JSON object matching this schema:
{
  "fullName": "Full name of the person in English with proper title case (e.g. Rahul Sharma). If name is written in both Hindi and English, extract the English name.",
  "idProofNumber": "ID proof number. For Aadhaar, extract 12 digits (format with spaces: 'XXXX XXXX XXXX'). For Passport/DL/Voter ID, extract official alphanumeric number.",
  "gender": "Male or Female or Other (standard capitalized)",
  "dateOfBirth": "Date of birth in DD/MM/YYYY format, or YYYY if only birth year is present",
  "fatherName": "Father's name or Husband's name if clearly present, otherwise empty string"
}

Do NOT wrap the output in markdown code blocks like \`\`\`json. Output ONLY the raw JSON string.`;
    } else {
      prompt = `You are a high-precision Indian government ID and Aadhaar OCR reader for an automated hotel check-in system.
Examine this ${idProofType} back image carefully to extract the permanent residential address.
Even if the image is tilted, has low resolution, glare, shadows, or mixed Hindi and English, decode the full English address.

Return ONLY a valid JSON object matching this schema:
{
  "address": "Complete permanent address formatted cleanly as a single comma-separated line (e.g., House No / Ward, Street or Mohalla, Village or Colony, Tehsil / Taluk, District, State - PINCODE). Clean any noisy words like UIDAI or Government of India.",
  "pincode": "6-digit postal PIN code (e.g. 452010)",
  "careOf": "Care of (C/O, S/O, D/O, W/O) person name if present, otherwise empty string"
}

Do NOT wrap the output in markdown code blocks like \`\`\`json. Output ONLY the raw JSON string.`;
    }

    // 6. Call Google Gemini 1.5 Flash Vision API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
        maxOutputTokens: 500,
        responseMimeType: "application/json"
      }
    };

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Gemini Vision API error:', errText);
      return res.status(502).json({
        success: false,
        message: 'AI Vision service error. Please try again or fill manually.',
        details: errText
      });
    }

    const result = await apiResponse.json();
    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse returned JSON cleanly
    let extractedData = {};
    try {
      const cleanedText = candidateText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      extractedData = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', candidateText);
      extractedData = { rawText: candidateText };
    }

    res.status(200).json({
      success: true,
      side,
      data: extractedData
    });

  } catch (error) {
    console.error('ID OCR scanning failed:', error);
    next(error);
  }
};
