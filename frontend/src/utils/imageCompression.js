export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.match(/image.*/)) return resolve(file);
    
    // Use ObjectURL instead of FileReader (readAsDataURL) to save massive RAM
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    
    image.onload = () => {
      // Instantly free the memory used by the object URL
      URL.revokeObjectURL(objectUrl);
      
      const canvas = document.createElement('canvas');
      let width = image.width;
      let height = image.height;
      
      // 2000px max dimensions + 0.85 quality ensures high-density Aadhaar QR code dots remain crisp
      const MAX_WIDTH = 2000;
      const MAX_HEIGHT = 2000;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      // Draw image to canvas
      ctx.drawImage(image, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        // Clear canvas memory completely after blob extraction
        canvas.width = 0;
        canvas.height = 0;
        
        if (!blob) return reject(new Error('Canvas is empty'));
        
        const newFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(newFile);
      }, 'image/jpeg', 0.85);
    };
    
    image.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    
    image.src = objectUrl;
  });
};
