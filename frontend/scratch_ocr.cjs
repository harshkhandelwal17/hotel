const Tesseract = require('tesseract.js');
const fs = require('fs');

async function testOCR() {
  const imagePath = '/Users/apple/.gemini/antigravity/brain/6ca0095e-5848-4c0b-b1d8-f87bc6728098/.user_uploaded/media_1791483047322_d82ad684.jpg';
  
  if (!fs.existsSync(imagePath)) {
      console.log('Image not found');
      return;
  }
  
  const worker = await Tesseract.createWorker('eng+hin+osd', 1, {
    logger: m => console.log(m.status, m.progress)
  });
  
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD,
  });
  
  const result = await worker.recognize(imagePath);
  console.log("-------------------");
  console.log("Raw OCR Result Text:", result.data.text);
  
  let text = result.data.text || "";
  let address = "";
  const addressMatch = text.match(/(?:Address|पता)[\s:;.-]*([\s\S]+)/i);
  if (addressMatch && addressMatch[1]) {
      address = addressMatch[1].trim();
      const pinRegex = /(\b\d{6}\b)/;
      const pinMatch = address.match(pinRegex);
      if (pinMatch) {
          const index = address.indexOf(pinMatch[0]);
          address = address.substring(0, index + 6);
      }
  } else {
      address = text.trim();
  }
  address = address.replace(/[\n\r]+/g, ', ').replace(/[^a-zA-Z0-9\s,./:-]/g, '').replace(/\s{2,}/g, ' ').replace(/,,/g, ',').trim();
  console.log("-------------------");
  console.log("Cleaned Address:", address);
  
  await worker.terminate();
}

testOCR();
