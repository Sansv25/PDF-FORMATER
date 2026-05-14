/**
 * Image Compression Utility using browser-image-compression
 */

const compressionConfig = {
    maxSizeMB: 0.5,          // Max size in MB
    maxWidthOrHeight: 1280, // Max width or height
    useWebWorker: true,
    fileType: 'image/jpeg'  // Convert to jpeg for better compression
};

async function compressImage(file) {
    try {
        console.log(`Compressing ${file.name}... original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        const compressedFile = await imageCompression(file, compressionConfig);
        console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        return compressedFile;
    } catch (error) {
        console.error('Compression error:', error);
        return file; // Return original on error
    }
}
