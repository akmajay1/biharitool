/**
 * Canvas-based image processing utilities for production-ready image manipulation
 */

/**
 * Remove background using color similarity (fallback when AI fails)
 */
export const removeBackgroundByColor = async (
  imageElement: HTMLImageElement,
  tolerance: number = 10
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Sample corner pixels to determine background color
  const corners = [
    [0, 0], // top-left
    [canvas.width - 1, 0], // top-right
    [0, canvas.height - 1], // bottom-left
    [canvas.width - 1, canvas.height - 1] // bottom-right
  ];
  
  const backgroundColors = corners.map(([x, y]) => {
    const idx = (y * canvas.width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]];
  });
  
  // Use most common corner color as background
  const bgColor = backgroundColors[0];
  
  // Remove background pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const colorDistance = Math.sqrt(
      Math.pow(r - bgColor[0], 2) +
      Math.pow(g - bgColor[1], 2) +
      Math.pow(b - bgColor[2], 2)
    );
    
    if (colorDistance <= tolerance) {
      data[i + 3] = 0; // Make transparent
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/png'
    );
  });
};

/**
 * Change background to solid color
 */
export const changeBackgroundColor = async (
  imageElement: HTMLImageElement,
  backgroundColor: string,
  tolerance: number = 10
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  
  // Fill with background color first
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Create a temporary canvas for the original image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get temp canvas context');
  
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(imageElement, 0, 0);
  
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  // Sample corner pixels to determine background color
  const corners = [
    [0, 0],
    [tempCanvas.width - 1, 0],
    [0, tempCanvas.height - 1],
    [tempCanvas.width - 1, tempCanvas.height - 1]
  ];
  
  const oldBgColor = corners.map(([x, y]) => {
    const idx = (y * tempCanvas.width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]];
  })[0];
  
  // Remove old background
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const colorDistance = Math.sqrt(
      Math.pow(r - oldBgColor[0], 2) +
      Math.pow(g - oldBgColor[1], 2) +
      Math.pow(b - oldBgColor[2], 2)
    );
    
    if (colorDistance <= tolerance) {
      data[i + 3] = 0; // Make transparent
    }
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  
  // Draw the processed image on top of the colored background
  ctx.drawImage(tempCanvas, 0, 0);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/png'
    );
  });
};

/**
 * Basic face detection using skin color detection (fallback)
 */
export const detectFacesByColor = async (
  imageElement: HTMLImageElement
): Promise<Array<{x: number, y: number, width: number, height: number}>> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Simple skin color detection
  const skinPixels: Array<{x: number, y: number}> = [];
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Simple skin color detection
      if (r > 95 && g > 40 && b > 20 && 
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 && r > g && r > b) {
        skinPixels.push({x, y});
      }
    }
  }
  
  if (skinPixels.length === 0) return [];
  
  // Group skin pixels into potential face regions
  const faceRegions: Array<{x: number, y: number, width: number, height: number}> = [];
  const gridSize = 50;
  const grid: {[key: string]: number} = {};
  
  skinPixels.forEach(({x, y}) => {
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    const key = `${gridX},${gridY}`;
    grid[key] = (grid[key] || 0) + 1;
  });
  
  // Find regions with high skin pixel density
  Object.entries(grid).forEach(([key, count]) => {
    if (count > gridSize * 2) {
      const [gridX, gridY] = key.split(',').map(Number);
      faceRegions.push({
        x: gridX * gridSize,
        y: gridY * gridSize,
        width: gridSize * 2,
        height: gridSize * 2
      });
    }
  });
  
  return faceRegions;
};

/**
 * Apply blur effect to specific regions
 */
export const applyBlurToRegions = async (
  imageElement: HTMLImageElement,
  regions: Array<{x: number, y: number, width: number, height: number}>,
  blurRadius: number = 20
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  regions.forEach(region => {
    ctx.save();
    
    // Create clipping path for the region
    ctx.beginPath();
    ctx.ellipse(
      region.x + region.width / 2,
      region.y + region.height / 2,
      region.width / 2,
      region.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.clip();
    
    // Apply blur
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(imageElement, 0, 0);
    
    ctx.restore();
  });
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/png'
    );
  });
};

/**
 * High-quality image upscaling using interpolation
 */
export const upscaleImageCanvas = async (
  imageElement: HTMLImageElement,
  scaleFactor: number = 2
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth * scaleFactor;
  canvas.height = imageElement.naturalHeight * scaleFactor;
  
  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw upscaled image
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  
  // Apply unsharp mask for better quality
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  // Unsharp mask kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  const newData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += data[idx] * kernel[kernelIdx];
          }
        }
        const idx = (y * width + x) * 4 + c;
        newData[idx] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  
  const sharpenedImageData = new ImageData(newData, width, height);
  ctx.putImageData(sharpenedImageData, 0, 0);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/png'
    );
  });
};

/**
 * Add name and date watermark to image (exam photo style)
 */
export const addNameAndDate = async (
  imageElement: HTMLImageElement,
  name: string,
  date: string
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  // Calculate font size based on image dimensions
  const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.03);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  
  // Position text at bottom right (exam photo style)
  const margin = fontSize;
  const nameY = canvas.height - margin - fontSize;
  const dateY = canvas.height - margin;
  
  // Measure text to align properly
  const nameWidth = ctx.measureText(name).width;
  const dateWidth = ctx.measureText(date).width;
  const maxWidth = Math.max(nameWidth, dateWidth);
  
  const textX = canvas.width - maxWidth - margin;
  
  // Draw text with outline for better visibility
  ctx.strokeText(name, textX, nameY);
  ctx.fillText(name, textX, nameY);
  
  ctx.strokeText(date, textX, dateY);
  ctx.fillText(date, textX, dateY);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/jpeg',
      0.95
    );
  });
};