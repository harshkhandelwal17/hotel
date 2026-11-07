const express = require('express');
const path = require('path');
const fs = require('fs');
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');
const router = express.Router();

// Fast CORS-safe image proxy so browser QR scanner can read Cloudflare R2 / remote ID photos onto <canvas>
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'Image URL required' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Check local uploads folder first
    const filename = path.basename(url.split('?')[0]);
    const localPath = path.join(__dirname, '../../uploads', filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ success: false, message: 'Invalid remote URL' });
    }

    const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) {
      return res.status(imgRes.status).json({ success: false, message: 'Failed to fetch remote image' });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    const arrayBuffer = await imgRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Image proxy error' });
  }
});

router.use(protect);

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  let fileUrl = '';
  if (req.file.location) {
    // R2 Upload
    fileUrl = req.file.location;
    // If public domain is configured, use it instead of the ugly s3 url
    if (process.env.R2_PUBLIC_DOMAIN) {
      fileUrl = `${process.env.R2_PUBLIC_DOMAIN}/${req.file.key}`;
    }
  } else {
    // Local Upload
    fileUrl = `/uploads/${req.file.filename}`;
  }
  
  res.status(200).json({ success: true, url: fileUrl });
});

module.exports = router;
