const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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

const extractStorageKey = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.includes('hotel_pms_uploads/')) {
    return 'hotel_pms_uploads/' + imageUrl.split('hotel_pms_uploads/')[1].split('?')[0];
  }
  try {
    const parsed = new URL(imageUrl);
    const key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
    return key || null;
  } catch (_) {
    return null;
  }
};

exports.extractStorageKey = extractStorageKey;

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

exports.deleteMediaFile = async (imageUrl) => {
  if (!imageUrl) return false;
  try {
    const isCloudflare = s3Client && process.env.R2_BUCKET_NAME && (
      imageUrl.includes('r2.cloudflarestorage.com') ||
      (process.env.R2_PUBLIC_DOMAIN && imageUrl.includes(process.env.R2_PUBLIC_DOMAIN)) ||
      imageUrl.includes('r2.dev') ||
      imageUrl.includes('hotel_pms_uploads/')
    );

    if (isCloudflare) {
      const key = extractStorageKey(imageUrl);
      if (key) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key
        }));
        console.log(`[Storage] 🗑️ Deleted file from Cloudflare R2: ${key}`);
        return true;
      }
    } else if (imageUrl.includes('/uploads/')) {
      const filename = path.basename(imageUrl.split('?')[0]);
      const filePath = path.join(__dirname, '../../uploads', filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`[Storage] 🗑️ Deleted local file: ${filename}`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[Storage] ⚠️ Failed to delete media file (${imageUrl}):`, err.message);
  }
  return false;
};


