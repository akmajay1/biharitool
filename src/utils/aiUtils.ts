import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js for production deployment
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';

// Disable WebGPU for better compatibility
const deviceConfig = {
  device: 'wasm' as const
};

const MAX_IMAGE_DIMENSION = 1024;

/**
 * Resize image if needed to fit within max dimensions while maintaining aspect ratio
 */
function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

/**
 * Remove background using AI segmentation model
 */
export const removeBackgroundAI = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Starting AI background removal...');
    const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', deviceConfig);
    
    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    console.log('Image converted to base64');
    
    // Process the image with the segmentation model
    console.log('Processing with AI segmentation model...');
    const result = await segmenter(imageData);
    
    console.log('Segmentation result:', result);
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }
    
    // Create a new canvas for the masked image
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply the mask
    const outputImageData = outputCtx.getImageData(
      0, 0,
      outputCanvas.width,
      outputCanvas.height
    );
    const data = outputImageData.data;
    
    // Apply inverted mask to alpha channel (keep subject, remove background)
    for (let i = 0; i < result[0].mask.data.length; i++) {
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('AI mask applied successfully');
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully created final blob');
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error removing background with AI:', error);
    throw error;
  }
};

/**
 * Detect faces in an image using AI
 */
export const detectFaces = async (imageElement: HTMLImageElement): Promise<Array<{x: number, y: number, width: number, height: number}>> => {
  try {
    console.log('Starting AI face detection...');
    const detector = await pipeline('object-detection', 'Xenova/yolos-tiny', deviceConfig);
    
    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed
    resizeImageIfNeeded(canvas, ctx, imageElement);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Detect objects
    const result = await detector(imageData);
    
    // Filter for faces/persons and convert to face coordinates
    const faces = result
      .filter((detection: any) => 
        detection.label.toLowerCase().includes('person') || 
        detection.label.toLowerCase().includes('face')
      )
      .map((detection: any) => ({
        x: detection.box.xmin,
        y: detection.box.ymin,
        width: detection.box.xmax - detection.box.xmin,
        height: detection.box.ymax - detection.box.ymin
      }));
    
    console.log(`Detected ${faces.length} faces`);
    return faces;
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw error;
  }
};

/**
 * Upscale image using super-resolution
 */
export const upscaleImage = async (imageElement: HTMLImageElement, scaleFactor: number = 2): Promise<Blob> => {
  try {
    console.log('Starting AI image upscaling...');
    
    // For now, we'll use a high-quality bicubic interpolation
    // Real SR models are too large for browser deployment
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Set new dimensions
    canvas.width = imageElement.naturalWidth * scaleFactor;
    canvas.height = imageElement.naturalHeight * scaleFactor;
    
    // Use high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw upscaled image
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Apply sharpening filter
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Simple sharpening kernel
    const sharpenKernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    const newData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sum += data[idx] * sharpenKernel[kernelIdx];
            }
          }
          const idx = (y * width + x) * 4 + c;
          newData[idx] = Math.max(0, Math.min(255, sum));
        }
      }
    }
    
    const sharpenedImageData = new ImageData(newData, width, height);
    ctx.putImageData(sharpenedImageData, 0, 0);
    
    console.log('Image upscaled successfully');
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error upscaling image:', error);
    throw error;
  }
};

/**
 * Load image from file or blob
 */
export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Intelligent image compression with quality preservation
 */
export const intelligentCompress = async (file: File, targetSizeKB: number): Promise<Blob> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Start with original dimensions
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  
  // Calculate initial quality based on target size
  let quality = Math.min(0.95, targetSizeKB * 1024 / file.size);
  
  // Binary search for optimal quality/size ratio
  let low = 0.1;
  let high = 0.95;
  let bestBlob: Blob | null = null;
  
  for (let i = 0; i < 10; i++) { // Max 10 iterations
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    
    if (!blob) break;
    
    const sizeKB = blob.size / 1024;
    
    if (Math.abs(sizeKB - targetSizeKB) < targetSizeKB * 0.1) {
      // Within 10% of target
      bestBlob = blob;
      break;
    }
    
    if (sizeKB > targetSizeKB) {
      high = quality;
      quality = (low + quality) / 2;
    } else {
      low = quality;
      quality = (quality + high) / 2;
      bestBlob = blob; // Keep this as it's under target
    }
  }
  
  return bestBlob || file;
};
