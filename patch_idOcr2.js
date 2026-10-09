const fs = require('fs');

const content = `export const extractAddressFromBackId = async (imageFile) => {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    
    // Helper to rotate image by a specific degree
    const rotateImage = (source, degrees) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          if (degrees === 0) {
             resolve(source);
             return;
          }
          const canvas = document.createElement('canvas');
          if (degrees === 90 || degrees === -90 || degrees === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          const ctx = canvas.getContext('2d');
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(degrees * Math.PI / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => resolve(source);
        img.src = source;
      });
    };

    const processOCR = async (imgSource) => {
        const worker = await Tesseract.createWorker('eng+hin', 1, {
          logger: m => {} // suppress logs
        });
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });
        const result = await worker.recognize(imgSource);
        await worker.terminate();
        return result.data.text || "";
    };

    const parseAddress = (text) => {
        let address = "";
        const addressMatch = text.match(/(?:Address|Addres|पता|पत्ता|S\\/O|D\\/O|W\\/O|C\\/O|SO|DO|WO|CO)[\\s:;.-]*([\\s\\S]+)/i);
        
        if (addressMatch && addressMatch[1]) {
            address = addressMatch[1].trim();
            const pinRegex = /(\\b\\d{6}\\b)/;
            const pinMatch = address.match(pinRegex);
            if (pinMatch) {
                const index = address.indexOf(pinMatch[0]);
                address = address.substring(0, index + 6);
            }
            return address;
        }
        return null; // Not found
    };

    const cleanAddress = (address) => {
        return address
          .replace(/[\\n\\r]+/g, ', ')
          // KEEP ALL LETTERS (INCLUDING HINDI) and numbers. Remove weird symbols.
          // \\p{L} matches any letter in any language. \\p{N} matches numbers.
          .replace(/[^\\p{L}\\p{N}\\s,./:-]/gu, '') 
          .replace(/\\s{2,}/g, ' ')
          .replace(/,,/g, ',')
          .trim()
          .substring(0, 250);
    }

    // Pass 1: Original
    let text = await processOCR(imageFile);
    let parsed = parseAddress(text);

    // Pass 2: If not found, rotate 90 degrees clockwise
    if (!parsed) {
        console.log("Address not found, rotating 90 degrees...");
        const rotated90 = await rotateImage(imageFile, 90);
        text = await processOCR(rotated90);
        parsed = parseAddress(text);
    }

    // Pass 3: If not found, rotate 90 degrees counter-clockwise
    if (!parsed) {
        console.log("Address not found, rotating -90 degrees...");
        const rotatedMinus90 = await rotateImage(imageFile, -90);
        text = await processOCR(rotatedMinus90);
        parsed = parseAddress(text);
    }

    // If still not found, just use the raw text from original (fallback)
    if (!parsed) {
        parsed = text.trim();
    }

    return cleanAddress(parsed);

  } catch (error) {
    console.error("Error during OCR:", error);
    return "";
  }
};
`;

fs.writeFileSync('frontend/src/utils/idOcr.js', content);
