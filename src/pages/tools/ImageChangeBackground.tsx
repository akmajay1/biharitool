
import React, { useState, useEffect } from 'react';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { removeBackgroundAI, loadImage } from '@/utils/aiUtils';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

const backgroundOptions = [
  { id: 'white', name: 'White', color: '#ffffff' },
  { id: 'blue', name: 'Blue', color: '#e6f7ff' },
  { id: 'red', name: 'Red', color: '#fff1f0' },
  { id: 'green', name: 'Green', color: '#f6ffed' },
  { id: 'gray', name: 'Gray', color: '#f5f5f5' },
];

const ImageChangeBackground = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState(backgroundOptions[0]);
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

  const changeBackground = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error('Please select an image first');
      return;
    }

    setLoading(true);
    try {
      toast.info('AI is removing the background...');
      
      // Step 1: Use AI to remove background
      const img = await loadImage(selectedFile);
      const transparentBlob = await removeBackgroundAI(img);
      
      // Step 2: Create canvas with new background
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Fill with selected background color
      ctx.fillStyle = selectedBackground.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load the transparent image
      const transparentImg = new Image();
      await new Promise<void>((resolve, reject) => {
        transparentImg.onload = () => resolve();
        transparentImg.onerror = () => reject(new Error('Failed to load transparent image'));
        transparentImg.src = URL.createObjectURL(transparentBlob);
      });
      
      // Draw the transparent subject over the new background
      ctx.drawImage(transparentImg, 0, 0);
      
      // Create output URL
      const outputUrl = canvas.toDataURL('image/png');
      setOutputUrl(outputUrl);
      
      toast.success('Background changed successfully with AI!');
    } catch (error) {
      console.error('Error changing background:', error);
      toast.error('Failed to change background. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `edited_${selectedFile?.name || 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded successfully!');
  };


  return (
    <ToolLayout
      title="Change Background"
      description="Replace image backgrounds with custom colors. Perfect for documents, forms, and photos."
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
          <h2 className="text-xl font-semibold mb-4">2. Configure Settings</h2>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Background Color</h3>
            <div className="flex flex-wrap gap-3">
              {backgroundOptions.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBackground(bg)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    selectedBackground.id === bg.id ? 'border-apple-blue' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: bg.color }}
                  title={bg.name}
                  aria-label={`Select ${bg.name} background`}
                />
              ))}
            </div>
            <p className="text-sm text-apple-darkgray mt-2">Selected: {selectedBackground.name}</p>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium mb-2 text-blue-800">🤖 AI-Powered Background Change</h3>
            <p className="text-sm text-blue-700">
              Our AI precisely identifies the subject and replaces only the background with your chosen color.
            </p>
          </div>
          
          <Button
            onClick={changeBackground}
            disabled={!selectedFile || loading}
            className="w-full"
          >
            {loading ? 'AI Processing...' : 'Change Background with AI'}
          </Button>
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
                Result
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

export default ImageChangeBackground;
