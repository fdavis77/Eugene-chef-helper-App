/**
 * Compresses and resizes an image file.
 * @param file The image file to process.
 * @param maxWidth The maximum width for the output image.
 * @param maxHeight The maximum height for the output image.
 * @param quality The quality of the output JPEG image (0 to 1).
 * @returns A Promise that resolves with the compressed image as a File object.
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1080,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      } else {
        reject(new Error("FileReader did not return a string."));
      }
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context.'));
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Canvas toBlob failed.'));
          }
          // Create a new file from the blob
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = reject;

    reader.readAsDataURL(file);
  });
};