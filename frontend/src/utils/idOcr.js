export const extractAddressFromBackId = async (imageFile) => {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    const result = await Tesseract.recognize(
      imageFile,
      'eng+hin', 
      { logger: m => console.log(m) }
    );
    let text = result.data.text || "";
    console.log("OCR Result Text:", text);

    let address = "";
    // Aadhaar cards have "Address" or "पता"
    const addressMatch = text.match(/(?:Address|पता)[\s:;.-]*([\s\S]+)/i);
    
    if (addressMatch && addressMatch[1]) {
        // Extract everything after Address/पता
        address = addressMatch[1].trim();
        
        // Sometimes Aadhaar numbers or random noise is at the end. 
        // We can stop at a 6-digit PIN code if found, to discard noise after it.
        const pinRegex = /(\b\d{6}\b)/;
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
      .replace(/[\n\r]+/g, ', ')
      .replace(/[^a-zA-Z0-9\s,./:-]/g, '') // remove weird symbols
      .replace(/\s{2,}/g, ' ')
      .replace(/,,/g, ',')
      .trim();
      
    // Return at most 250 characters to prevent huge garbage strings
    return address.substring(0, 250);

  } catch (error) {
    console.error("Error during OCR:", error);
    return "";
  }
};

