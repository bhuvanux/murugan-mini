import { toast } from 'sonner';

export interface CompressionResult {
    file: File;
    originalSize: number;
    optimizedSize: number;
    width: number;
    height: number;
}

/**
 * Compresses an image file to WebP format with max width and quality settings.
 * @param file Original file
 * @param maxWidth Max width in pixels (default 1440)
 * @param quality Quality from 0 to 1 (default 0.8)
 */
export const compressImage = async (
    file: File,
    maxWidth: number = 1440,
    quality: number = 0.8
): Promise<CompressionResult> => {
    return new Promise((resolve, reject) => {
        // 1. Create content for Image
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                // 2. Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // 3. Draw to canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // 4. Export as WebP
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'));
                            return;
                        }

                        // Create new File object
                        const optimizedFile = new File(
                            [blob],
                            file.name.replace(/\.[^/.]+$/, "") + ".webp",
                            { type: 'image/webp' }
                        );

                        resolve({
                            file: optimizedFile,
                            originalSize: file.size,
                            optimizedSize: optimizedFile.size,
                            width,
                            height
                        });
                    },
                    'image/webp',
                    quality
                );
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
};
