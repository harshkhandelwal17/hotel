const text = `मक सट पसट सरसर, तहसल, gam, 661, VID, a, 661, Chaturvedi, , PO:, - 4871, hu वशषट पहचन परथकरण, Unique Identification Authority of India, 4, Bos 4, `;

const parseAadhaar = (rawText) => {
    let t = rawText;
    
    // Remove known headers/footers
    const removePhrases = [
        /Unique Identification Authority of India/gi,
        /Government of India/gi,
        /भारतीय विशिष्ट पहचान प्राधिकरण/gi,
        /भारत सरकार/gi,
        /1947/g,
        /help@uidai\.gov\.in/gi,
        /www\.uidai\.gov\.in/gi,
        /VID[\s:]*[0-9\s]+/gi
    ];
    
    removePhrases.forEach(regex => {
        t = t.replace(regex, ' ');
    });

    let address = "";
    // Try to find the exact address block
    const addressMatch = t.match(/(?:Address|Addres|पता|पत्ता|S\/O|D\/O|W\/O|C\/O|SO:|DO:|WO:|CO:)[\s:;.-]*([\s\S]+)/i);
    
    if (addressMatch && addressMatch[1]) {
        address = addressMatch[1];
    } else {
        address = t; // fallback to everything remaining
    }
    
    // Stop at 6-digit pin code
    const pinRegex = /(\b\d{6}\b)/;
    const pinMatch = address.match(pinRegex);
    if (pinMatch) {
        const index = address.indexOf(pinMatch[0]);
        address = address.substring(0, index + 6);
    }
    
    // Clean up
    return address
      .replace(/[\n\r]+/g, ', ')
      .replace(/[^\p{L}\p{N}\s,./:-]/gu, '') 
      .replace(/\s{2,}/g, ' ')
      .replace(/,,/g, ',')
      .trim()
      .substring(0, 250);
};

console.log(parseAadhaar(text));
