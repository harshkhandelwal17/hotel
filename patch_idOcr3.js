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
          logger: m => {} 
        });
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });
        const result = await worker.recognize(imgSource);
        await worker.terminate();
        return result.data.text || "";
    };

    // Score text to find correct orientation
    const getScore = (text) => {
        const keywords = ['india', 'authority', 'unique', 'identification', 'government', 'address', 'vid', 'dob', 'male', 'female', 'year', 'birth', 'help', '1947', 'enrollment', 'father', 'husband', 'wife', 'पता', 'भारत', 'सरकार', 'प्राधिकरण', 'आधार', 'पहचान'];
        let score = 0;
        const lower = text.toLowerCase();
        for (const word of keywords) {
            if (lower.includes(word)) score++;
        }
        return score;
    };

    const parseAddress = (rawText) => {
        let t = rawText;
        
        // Remove known headers/footers to isolate the address
        const removePhrases = [
            /Unique Identification Authority of India/gi,
            /Government of India/gi,
            /भारतीय विशिष्ट पहचान प्राधिकरण/gi,
            /भारत सरकार/gi,
            /1947/g,
            /help@uidai\\.gov\\.in/gi,
            /www\\.uidai\\.gov\\.in/gi,
            /VID/gi,
            /Enrollment/gi,
            /Update/gi,
            /पहचान/gi,
            /प्राधिकरण/gi,
            /विशिष्ट/gi,
            /परथकरण/gi, // common mis-ocr
            /वशषट/gi,   // common mis-ocr
            /पहचन/gi    // common mis-ocr
        ];
        
        removePhrases.forEach(regex => {
            t = t.replace(regex, ' ');
        });

        let address = "";
        const addressMatch = t.match(/(?:Address|Addres|पता|पत्ता|S\\/O|D\\/O|W\\/O|C\\/O|SO:|DO:|WO:|CO:)[\s:;.-]*([\\s\\S]+)/i);
        
        if (addressMatch && addressMatch[1]) {
            address = addressMatch[1];
        } else {
            address = t; 
        }
        
        const pinRegex = /(\\b\\d{6}\\b)/;
        const pinMatch = address.match(pinRegex);
        if (pinMatch) {
            const index = address.indexOf(pinMatch[0]);
            address = address.substring(0, index + 6);
        }
        
        return address
          .replace(/[\\n\\r]+/g, ', ')
          .replace(/[^\\p{L}\\p{N}\\s,./:-]/gu, '') 
          .replace(/\\s{2,}/g, ' ')
          .replace(/,,/g, ',')
          .trim()
          .replace(/^[,\\s]+/, '') // remove leading commas/spaces
          .replace(/[,\\s]+$/, '') // remove trailing commas/spaces
          .substring(0, 250);
    };

    // Run pass 1
    let bestText = await processOCR(imageFile);
    let bestScore = getScore(bestText);

    if (bestScore < 3) {
        console.log("Score too low, rotating 90 degrees...");
        const rotated90 = await rotateImage(imageFile, 90);
        const text90 = await processOCR(rotated90);
        const score90 = getScore(text90);
        if (score90 > bestScore) {
            bestText = text90;
            bestScore = score90;
        }
        
        if (bestScore < 3) {
            console.log("Score still low, rotating -90 degrees...");
            const rotatedMinus90 = await rotateImage(imageFile, -90);
            const textMinus90 = await processOCR(rotatedMinus90);
            const scoreMinus90 = getScore(textMinus90);
            if (scoreMinus90 > bestScore) {
                bestText = textMinus90;
                bestScore = scoreMinus90;
            }
        }
    }

    return parseAddress(bestText);

  } catch (error) {
    console.error("Error during OCR:", error);
    return "";
  }
};
`;

fs.writeFileSync('frontend/src/utils/idOcr.js', content);
