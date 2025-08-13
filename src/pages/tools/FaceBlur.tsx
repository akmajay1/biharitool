
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, UserRoundX } from 'lucide-react';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { detectFaces, loadImage } from '@/utils/aiUtils';

const FaceBlur = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blurRadius, setBlurRadius] = useState(20);
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

  const blurFaces = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error('Please select an image first');
      return;
    }

    setLoading(true);
    try {
      toast.info('AI is detecting faces...');
      
      // Load the image and detect faces
      const img = await loadImage(selectedFile);
      const faces = await detectFaces(img);
      
      if (faces.length === 0) {
        toast.warning('No faces detected in the image');
        setLoading(false);
        return;
      }
      
      toast.info(`Found ${faces.length} face(s), applying blur...`);

      // Create a canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      // Apply blur to each detected face
      faces.forEach((face, index) => {
        ctx.save();
        
        // Create clipping path for the face region
        ctx.beginPath();
        ctx.ellipse(
          face.x + face.width / 2,
          face.y + face.height / 2,
          face.width / 2,
          face.height / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.closePath();
        ctx.clip();
        
        // Apply blur effect
        ctx.filter = `blur(${blurRadius}px)`;
        ctx.drawImage(img, 0, 0);
        
        ctx.restore();
      });
      
      // Convert canvas to image
      const outputUrl = canvas.toDataURL('image/png');
      setOutputUrl(outputUrl);
      
      toast.success(`Successfully blurred ${faces.length} face(s)!`);
    } catch (error) {
      console.error('Error blurring faces:', error);
      toast.error('Failed to detect or blur faces. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `blurred_${selectedFile?.name || 'image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded successfully!');
  };

  return (
    <ToolLayout
      title="Face Blurring"
      description="Automatically detect and blur faces in images to protect privacy. Perfect for publishing photos while maintaining anonymity."
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
          <h2 className="text-xl font-semibold mb-4">2. AI Face Detection</h2>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium mb-2 text-blue-800">🤖 AI-Powered Face Detection</h3>
            <p className="text-sm text-blue-700">
              Our AI automatically detects all faces in the image and applies precise blur effects to protect privacy.
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-2">Blur Strength: {blurRadius}px</h3>
            <Slider 
              value={[blurRadius]} 
              min={5} 
              max={50} 
              step={1}
              onValueChange={(values) => setBlurRadius(values[0])} 
            />
            <p className="text-sm text-apple-darkgray mt-2">
              Higher values create a stronger blur effect
            </p>
          </div>
          
          <Button
            onClick={blurFaces}
            disabled={!selectedFile || loading}
            className="w-full"
          >
            {loading ? 'AI Detecting & Blurring...' : 'Detect & Blur Faces'}
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
                Blurred
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

export default FaceBlur;
