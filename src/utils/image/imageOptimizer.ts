/**
 * Murugan App - Image Optimization Pipeline
 * Handles multi-resolution generation, format conversion, and compression
 */

export interface ImageSize {
  size: number;
  type: 'thumbnail' | 'small' | 'medium' | 'large';
  quality: number;
}

export interface ImageUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large?: string;
  original: string;
}

export interface ImageMetadata {
  urls: ImageUrls;
  width: number;
  height: number;
  fileSizeKB: number;
  lqip: string; // Low Quality Image Placeholder (base64)
  format: string;
  aspectRatio: number;
}

export interface OptimizationConfig {
  sizes: ImageSize[];
  formats: ('webp' | 'avif' | 'jpg')[];
  stripExif: boolean;
  normalizeColorProfile: boolean;
  generateLQIP: boolean;
}

/**
 * Default optimization configuration
 */
export const DEFAULT_CONFIG: OptimizationConfig = {
  sizes: [
    { size: 128, type: 'thumbnail', quality: 55 },
    { size: 480, type: 'small', quality: 65 },
    { size: 1080, type: 'medium', quality: 75 },
    { size: 1920, type: 'large', quality: 85 },
  ],
  formats: ['webp', 'avif', 'jpg'],
  stripExif: true,
  normalizeColorProfile: true,
  generateLQIP: true,
};

/**
 * Image Optimizer Class
 * Handles client-side image preparation before upload
 */
export class ImageOptimizer {
  constructor(private config: OptimizationConfig = DEFAULT_CONFIG) {}

  /**
   * Validate image file
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Allowed: PNG, JPG, WEBP, AVIF`,
      };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 50MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Read image file and get dimensions
   */
  async readImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Resize image to target size
   */
  async resizeImage(
    img: HTMLImageElement,
    targetSize: number,
    quality: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Calculate new dimensions maintaining aspect ratio
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > targetSize) {
        height = (height * targetSize) / width;
        width = targetSize;
      }
    } else {
      if (height > targetSize) {
        width = (width * targetSize) / height;
        height = targetSize;
      }
    }

    canvas.width = width;
    canvas.height = height;

    // Draw resized image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/webp',
        quality / 100
      );
    });
  }

  /**
   * Generate LQIP (Low Quality Image Placeholder)
   */
  async generateLQIP(img: HTMLImageElement): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Create tiny 20px version
    const size = 20;
    const aspectRatio = img.width / img.height;
    const width = aspectRatio > 1 ? size : size * aspectRatio;
    const height = aspectRatio > 1 ? size / aspectRatio : size;

    canvas.width = width;
    canvas.height = height;

    // Draw tiny image
    ctx.drawImage(img, 0, 0, width, height);

    // Apply blur effect
    ctx.filter = 'blur(10px)';
    ctx.drawImage(canvas, 0, 0);

    // Convert to base64
    return canvas.toDataURL('image/webp', 0.1);
  }

  /**
   * Prepare image for upload (client-side optimization)
   */
  async prepareImageForUpload(
    file: File
  ): Promise<{
    originalFile: File;
    thumbnail: Blob;
    metadata: Partial<ImageMetadata>;
  }> {
    // Validate
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Read image
    const img = await this.readImage(file);

    // Generate thumbnail
    const thumbnailBlob = await this.resizeImage(img, 128, 55);

    // Generate LQIP
    const lqip = this.config.generateLQIP ? await this.generateLQIP(img) : '';

    // Prepare metadata
    const metadata: Partial<ImageMetadata> = {
      width: img.width,
      height: img.height,
      aspectRatio: img.width / img.height,
      lqip,
      format: file.type,
    };

    return {
      originalFile: file,
      thumbnail: thumbnailBlob,
      metadata,
    };
  }

  /**
   * Get storage path for image
   */
  getStoragePath(
    type: 'banner' | 'wallpaper' | 'sparkle' | 'photos',
    id: string,
    size: string,
    format: string = 'webp'
  ): string {
    return `/${type}s/${id}/${size}/${id}.${format}`;
  }
}

/**
 * Upload image with optimization
 * This would be called from admin panel
 */
export async function uploadOptimizedImage(
  file: File,
  type: 'banner' | 'wallpaper' | 'sparkle' | 'photos',
  category?: string
): Promise<ImageMetadata> {
  const optimizer = new ImageOptimizer();

  try {
    // Prepare image
    console.log('[ImageOptimizer] Preparing image for upload...');
    const { originalFile, thumbnail, metadata } = await optimizer.prepareImageForUpload(file);

    // Create FormData
    const formData = new FormData();
    formData.append('original', originalFile);
    formData.append('thumbnail', thumbnail, 'thumbnail.webp');
    formData.append('type', type);
    if (category) formData.append('category', category);
    formData.append('metadata', JSON.stringify(metadata));

    // Upload to backend
    console.log('[ImageOptimizer] Uploading to backend...');
    const response = await fetch('/api/admin/upload/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[ImageOptimizer] Upload complete:', result);

    return result.metadata;
  } catch (error) {
    console.error('[ImageOptimizer] Upload failed:', error);
    throw error;
  }
}

/**
 * Progressive image loader for mobile app
 * Loads images in stages: LQIP → Thumbnail → Small → Medium → Large
 */
export class ProgressiveImageLoader {
  private loadedImages: Map<string, string> = new Map();

  /**
   * Load image progressively
   */
  async loadImage(
    urls: ImageUrls,
    onProgress: (stage: string, url: string) => void
  ): Promise<void> {
    try {
      // Stage 1: Show LQIP immediately (if available)
      if (urls.thumbnail) {
        onProgress('lqip', urls.thumbnail);
      }

      // Stage 2: Load thumbnail
      await this.loadImageUrl(urls.thumbnail);
      onProgress('thumbnail', urls.thumbnail);

      // Stage 3: Load small
      await this.loadImageUrl(urls.small);
      onProgress('small', urls.small);

      // Stage 4: Load medium (lazy)
      setTimeout(async () => {
        await this.loadImageUrl(urls.medium);
        onProgress('medium', urls.medium);
      }, 100);

      // Stage 5: Load large only if needed (full-screen)
      if (urls.large) {
        setTimeout(async () => {
          await this.loadImageUrl(urls.large!);
          onProgress('large', urls.large!);
        }, 500);
      }
    } catch (error) {
      console.error('[ProgressiveImageLoader] Failed to load image:', error);
    }
  }

  /**
   * Load single image URL
   */
  private async loadImageUrl(url: string): Promise<void> {
    if (this.loadedImages.has(url)) {
      return; // Already loaded
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(url, 'loaded');
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Preload next images for smooth scrolling
   */
  async preloadImages(urls: ImageUrls[]): Promise<void> {
    const promises = urls.map((url) => this.loadImageUrl(url.small));
    await Promise.allSettled(promises);
    console.log(`[ProgressiveImageLoader] Preloaded ${urls.length} images`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.loadedImages.clear();
  }
}

/**
 * React component for progressive image loading
 */
export function useProgressiveImage(urls: ImageUrls) {
  const [currentUrl, setCurrentUrl] = React.useState(urls.thumbnail);
  const [isLoading, setIsLoading] = React.useState(true);
  const loader = React.useRef(new ProgressiveImageLoader()).current;

  React.useEffect(() => {
    setIsLoading(true);
    
    loader.loadImage(urls, (stage, url) => {
      setCurrentUrl(url);
      if (stage === 'medium') {
        setIsLoading(false);
      }
    });
  }, [urls, loader]);

  return { currentUrl, isLoading };
}

// For non-React usage
declare const React: any;
