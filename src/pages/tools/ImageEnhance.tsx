
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, Sparkles } from 'lucide-react';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { upscaleImage, loadImage } from '@/utils/aiUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ImageEnhance = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [denoise, setDenoise] = useState(false);
  const [imageInfo, setImageInfo] = useState<{ size: string; width: number; height: number } | null>(null);

  // Reset state when file changes
  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
          setOutputUrl(null);
        }
      };
      reader.readAsDataURL(selectedFile);

      // Set image information
      setImageInfo({
        size: formatFileSize(selectedFile.size),
        width: 0,
        height: 0,
      });

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setImageInfo(prev => ({
          size: prev?.size || '0 KB',
          width: img.width,
          height: img.height,
        }));
      };
      img.src = URL.createObjectURL(selectedFile);
      
      // Reset enhancement settings
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setSharpness(0);
      setDenoise(false);
    } else {
      setPreviewUrl(null);
      setOutputUrl(null);
      setImageInfo(null);
    }
  }, [selectedFile]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setOutputUrl(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOutputUrl(null);
    setImageInfo(null);
  };

  const enhanceImage = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error('Please select an image first');
      return;
    }

    setLoading(true);
    try {
      toast.info('AI is enhancing your image...');
      
      // Load image and apply AI upscaling if needed
      const img = await loadImage(selectedFile);
      const enhancedBlob = await upscaleImage(img, 1); // Keep original size for now
      
      // Additional processing based on enhancement type
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      const enhancedImg = await loadImage(enhancedBlob);
      canvas.width = enhancedImg.naturalWidth;
      canvas.height = enhancedImg.naturalHeight;
      
      // Draw the enhanced image
      ctx.drawImage(enhancedImg, 0, 0);
      
      // Apply additional filters based on enhancement type
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;
      
      // Apply brightness, contrast, and saturation
      for (let i = 0; i < data.length; i += 4) {
        // Brightness
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Apply brightness
        const brightnessAdjustment = brightness / 100;
        r = r * brightnessAdjustment;
        g = g * brightnessAdjustment;
        b = b * brightnessAdjustment;
        
        // Apply contrast
        const contrastFactor = (contrast / 100 + 0.5) ** 2;
        r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
        
        // Apply saturation
        const sat = saturation / 100;
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + sat * (r - gray);
        g = gray + sat * (g - gray);
        b = gray + sat * (b - gray);
        
        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      // Put image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Apply sharpening if needed
      if (sharpness > 0) {
        // Simulate sharpening with a simple technique
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // Draw original image
          tempCtx.drawImage(canvas, 0, 0);
          
          // Apply a blur for contrast
          ctx.filter = 'blur(1px)';
          ctx.drawImage(img, 0, 0);
          
          // Get the blurred image
          const blurredData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          
          // Reset filter
          ctx.filter = 'none';
          
          // Get the original image data
          const origData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
          const origPixels = origData.data;
          
          // Apply unsharp masking
          for (let i = 0; i < origPixels.length; i += 4) {
            origPixels[i] = Math.max(0, Math.min(255, origPixels[i] + sharpness * (origPixels[i] - blurredData[i]) / 10));
            origPixels[i + 1] = Math.max(0, Math.min(255, origPixels[i + 1] + sharpness * (origPixels[i + 1] - blurredData[i + 1]) / 10));
            origPixels[i + 2] = Math.max(0, Math.min(255, origPixels[i + 2] + sharpness * (origPixels[i + 2] - blurredData[i + 2]) / 10));
          }
          
          // Put the sharpened data back
          ctx.putImageData(origData, 0, 0);
        }
      }
      
      // Apply noise reduction (simulated)
      if (denoise) {
        ctx.filter = 'blur(0.5px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
      }
      
      // Convert canvas to image
      const outputUrl = canvas.toDataURL('image/png');
      setOutputUrl(outputUrl);
      
      toast.success('Image enhanced successfully!');
    } catch (error) {
      console.error('Error enhancing image:', error);
      toast.error('Failed to enhance image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `enhanced_${selectedFile?.name || 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded successfully!');
  };

  const applyAutoEnhance = () => {
    // Auto-enhance feature simulates AI enhancement by setting optimal values
    setBrightness(110);
    setContrast(120);
    setSaturation(110);
    setSharpness(5);
    setDenoise(true);
    
    toast.success('Auto-enhance settings applied');
  };

  return (
    <ToolLayout
      title="Image Quality Enhancer"
      description="Enhance and improve low-quality images using AI. Adjust brightness, contrast, sharpness, and remove noise."
      backLink="/image-tools"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Upload Image</h2>
          <FileUploader
            onFileSelect={handleFileSelect}
            acceptedFileTypes="image/*"
            maxSizeMB={10}
            selectedFile={selectedFile}
            onClearFile={handleClearFile}
          />
          {imageInfo && (
            <div className="mt-4 text-sm text-apple-darkgray">
              <p>Size: {imageInfo.size}</p>
              <p>Dimensions: {imageInfo.width} × {imageInfo.height} pixels</p>
            </div>
          )}
        </Card>

        {/* Settings Section */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">2. Enhancement Settings</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={applyAutoEnhance} 
              className="flex items-center gap-1"
              disabled={!selectedFile}
            >
              <Sparkles size={16} /> Auto-Enhance
            </Button>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Brightness</label>
                <span className="text-sm text-apple-darkgray">{brightness}%</span>
              </div>
              <Slider 
                value={[brightness]} 
                min={50} 
                max={150} 
                step={1}
                onValueChange={(values) => setBrightness(values[0])} 
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Contrast</label>
                <span className="text-sm text-apple-darkgray">{contrast}%</span>
              </div>
              <Slider 
                value={[contrast]} 
                min={50} 
                max={150} 
                step={1}
                onValueChange={(values) => setContrast(values[0])} 
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Saturation</label>
                <span className="text-sm text-apple-darkgray">{saturation}%</span>
              </div>
              <Slider 
                value={[saturation]} 
                min={0} 
                max={200} 
                step={1}
                onValueChange={(values) => setSaturation(values[0])} 
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Sharpness</label>
                <span className="text-sm text-apple-darkgray">{sharpness}</span>
              </div>
              <Slider 
                value={[sharpness]} 
                min={0} 
                max={10} 
                step={1}
                onValueChange={(values) => setSharpness(values[0])} 
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="denoise" 
                checked={denoise} 
                onCheckedChange={(checked) => setDenoise(checked === true)}
              />
              <Label htmlFor="denoise">Reduce noise</Label>
            </div>
            
            <Button
              onClick={enhanceImage}
              disabled={!selectedFile || loading}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Enhance Image'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Preview Section */}
      {(previewUrl || outputUrl) && (
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold mb-4">3. Preview & Download</h2>
          <Tabs defaultValue="original" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="result" disabled={!outputUrl}>
                Enhanced
              </TabsTrigger>
            </TabsList>
            <TabsContent value="original">
              {previewUrl && (
                <div className="flex justify-center bg-gray-50 border rounded-lg p-4">
                  <img 
                    src={previewUrl} 
                    alt="Original" 
                    className="max-h-96 object-contain"
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="result">
              {outputUrl && (
                <div className="flex flex-col items-center">
                  <div className="flex justify-center bg-gray-50 border rounded-lg p-4 mb-4">
                    <img 
                      src={outputUrl} 
                      alt="Result" 
                      className="max-h-96 object-contain"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={handleDownload} className="flex items-center gap-2">
                      <Download size={18} />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </ToolLayout>
  );
};

export default ImageEnhance;
