const text = `Unique Identification Authority of India
Address: S/O Ram Chaturvedi, gam 661, PO: hu 4871, Bos 4, gli 131
VID : 1234 5678`;

let address = "";
const addressMatch = text.match(/(?:Address|Addres|पता|पत्ता|S\/O|D\/O|W\/O|C\/O)[\s:;.-]*([\s\S]+)/i);

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

address = address.replace(/[\n\r]+/g, ', ').replace(/\s{2,}/g, ' ').replace(/,,/g, ',').trim();
console.log(address);
