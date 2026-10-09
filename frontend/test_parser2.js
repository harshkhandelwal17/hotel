const rawText = `मक सट पसट सरसर, तहसल, gam, 661, VID, a, 661, Chaturvedi, , PO:, - 4871, hu वशषट पहचन परथकरण, Unique Identification Authority of India, 4, Bos 4, `;

let t = rawText;
const removePhrases = [
    /Unique Identification Authority of India/gi,
    /Government of India/gi,
    /भारतीय विशिष्ट पहचान प्राधिकरण/gi,
    /भारत सरकार/gi,
    /1947/g,
    /help@uidai\.gov\.in/gi,
    /www\.uidai\.gov\.in/gi,
    /VID/gi,
    /Enrollment/gi,
    /Update/gi,
    /पहचान/gi,
    /प्राधिकरण/gi,
    /विशिष्ट/gi,
    /परथकरण/gi, 
    /वशषट/gi,   
    /पहचन/gi    
];

removePhrases.forEach(regex => {
    t = t.replace(regex, ' ');
});

let address = t;
address = address
  .replace(/[\n\r]+/g, ', ')
  .replace(/[^\p{L}\p{N}\s,./:-]/gu, '') 
  .replace(/\s{2,}/g, ' ')
  .replace(/,,/g, ',')
  .trim()
  .replace(/^[,\\s]+/, '') 
  .replace(/[,\\s]+$/, '') 
  .substring(0, 250);

console.log("CLEANED:");
console.log(address);
