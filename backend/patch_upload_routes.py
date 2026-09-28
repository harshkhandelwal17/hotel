import sys

content = """const express = require('express');
const upload = require('../middlewares/upload');
const router = express.Router();

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
"""

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated uploadRoutes.js")
