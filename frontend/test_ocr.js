import Tesseract from 'tesseract.js';
import fs from 'fs';

async function testOCR() {
  const imageFile = '/Users/apple/.gemini/antigravity/brain/6ca0095e-5848-4c0b-b1d8-f87bc6728098/.user_uploaded/media_1791483047322_d82ad684.jpg';
  
  console.log("Running default OCR...");
  const result1 = await Tesseract.recognize(imageFile, 'eng+hin');
  console.log("Default OCR Output:", result1.data.text);
  
  console.log("\n\nRunning OCR with AUTO_OSD (psm: 1)...");
  try {
    const worker = await Tesseract.createWorker('eng+hin+osd');
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD,
    });
    const result2 = await worker.recognize(imageFile);
    console.log("OSD OCR Output:", result2.data.text);
    await worker.terminate();
  } catch (err) {
    console.error("OSD failed:", err.message);
  }
}

testOCR();

