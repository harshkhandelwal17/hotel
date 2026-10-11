const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

let s3Client = null;
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
  });
}

exports.saveMediaBuffer = async (buffer, mimeType = 'image/jpeg') => {
  const ext = mimeType.includes('png') ? '.png' : '.jpg';
  const uniqueKey = `hotel_pms_uploads/wa-${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`;

  if (s3Client && process.env.R2_BUCKET_NAME) {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueKey,
      Body: buffer,
      ContentType: mimeType
    }));

    if (process.env.R2_PUBLIC_DOMAIN) {
      return `${process.env.R2_PUBLIC_DOMAIN}/${uniqueKey}`;
    }
    return `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${uniqueKey}`;
  } else {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `wa-${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`;
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  }
};

