const fs = require('fs');

const content = `export const extractAddressFromBackId = async (imageFile) => {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    
    // Auto-rotate if image is portrait (Aadhaar cards are landscape)
    const preprocessImage = (source) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          if (img.height > img.width) {
            const canvas = document.createElement('canvas');
            canvas.width = img.height;
            canvas.height = img.width;
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-90 * Math.PI / 180); // Rotate 90 deg counter-clockwise
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            resolve(canvas.toDataURL('image/jpeg'));
          } else {
            resolve(source);
          }
        };
        img.onerror = () => resolve(source); // fallback to original
        img.src = source;
      });
    };

    const processedImage = await preprocessImage(imageFile);

    const worker = await Tesseract.createWorker('eng+hin', 1, {
      logger: m => console.log(m)
    });
    
    // PSM.AUTO (3) is fully automatic page segmentation, no OSD (much faster and no extra downloads)
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });
    
    const result = await worker.recognize(processedImage);
    await worker.terminate();
    
    let text = result.data.text || "";
    console.log("OCR Result Text:", text);

    let address = "";
    // Aadhaar cards have "Address" or "पता"
    const addressMatch = text.match(/(?:Address|पता)[\\s:;.-]*([\\s\\S]+)/i);
    
    if (addressMatch && addressMatch[1]) {
        // Extract everything after Address/पता
        address = addressMatch[1].trim();
        
        // Stop at a 6-digit PIN code to discard noise after it.
        const pinRegex = /(\\b\\d{6}\\b)/;
        const pinMatch = address.match(pinRegex);
        if (pinMatch) {
            const index = address.indexOf(pinMatch[0]);
            address = address.substring(0, index + 6);
        }
    } else {
        address = text.trim();
    }
    
    // Clean up noise, random special chars, extra spaces, newlines
    address = address
      .replace(/[\\n\\r]+/g, ', ')
      .replace(/[^a-zA-Z0-9\\s,./:-]/g, '') // remove weird symbols
      .replace(/\\s{2,}/g, ' ')
      .replace(/,,/g, ',')
      .trim();
      
    return address.substring(0, 250);

  } catch (error) {
    console.error("Error during OCR:", error);
    return "";
  }
};
`;

fs.writeFileSync('frontend/src/utils/idOcr.js', content);
