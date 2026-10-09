const text = ` gam, 661, VID, a, 661, Chaturvedi, , PO:, - 4871, hu , Unique Identification Authority of India, 4, Bos 4, gli 131`;

const cleanAddress = (address) => {
    return address
      .replace(/[\n\r]+/g, ', ')
      .replace(/[^\p{L}\p{N}\s,./:-]/gu, '') 
      .replace(/\s{2,}/g, ' ')
      .replace(/,,/g, ',')
      .trim()
      .substring(0, 250);
}
console.log(cleanAddress(text));
