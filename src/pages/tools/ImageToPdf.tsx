
import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { Download, Trash2, Image as ImageIcon } from 'lucide-react';

interface PageSize {
  name: string;
  width: number;
  height: number;
}

const pageSizes: PageSize[] = [
  { name: 'A4', width: 210, height: 297 },
  { name: 'Letter', width: 216, height: 279 },
  { name: 'Legal', width: 216, height: 356 },
  { name: 'A3', width: 297, height: 420 },
  { name: 'A5', width: 148, height: 210 },
];

const ImageToPdf = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(pageSizes[0]);
  const [imageQuality, setImageQuality] = useState<number>(80);
  const [fitMode, setFitMode] = useState<'fit' | 'fill' | 'stretch'>('fit');

  const handleFileSelect = (file: File) => {
    setSelectedFiles(prev => [...prev, file]);
    toast.success('Image added successfully');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    toast.success('All images cleared');
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
  };

  const convertToPdf = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsProcessing(true);
    try {
      const pdf = new jsPDF({
        orientation: pageSize.height > pageSize.width ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pageSize.width, pageSize.height]
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // 10mm margin
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          // Load image
          const imgData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Get image dimensions
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = imgData;
          });

          // Add new page for each image except the first one
          if (i > 0) {
            pdf.addPage();
          }

          let imgWidth = img.width;
          let imgHeight = img.height;
          let x = margin;
          let y = margin;

          // Calculate dimensions based on fit mode
          switch (fitMode) {
            case 'fit':
              // Maintain aspect ratio, fit within available space
              const scaleX = availableWidth / imgWidth;
              const scaleY = availableHeight / imgHeight;
              const scale = Math.min(scaleX, scaleY);
              
              imgWidth = imgWidth * scale;
              imgHeight = imgHeight * scale;
              
              // Center image
              x = (pageWidth - imgWidth) / 2;
              y = (pageHeight - imgHeight) / 2;
              break;
              
            case 'fill':
              // Fill available space, may crop image
              const fillScaleX = availableWidth / imgWidth;
              const fillScaleY = availableHeight / imgHeight;
              const fillScale = Math.max(fillScaleX, fillScaleY);
              
              imgWidth = imgWidth * fillScale;
              imgHeight = imgHeight * fillScale;
              
              // Center image (may overflow)
              x = (pageWidth - imgWidth) / 2;
              y = (pageHeight - imgHeight) / 2;
              break;
              
            case 'stretch':
              // Stretch to fill entire available space
              imgWidth = availableWidth;
              imgHeight = availableHeight;
              break;
          }

          // Add image to PDF
          pdf.addImage(
            imgData,
            file.type.includes('png') ? 'PNG' : 'JPEG',
            x,
            y,
            imgWidth,
            imgHeight,
            undefined,
            'FAST' // Compression method
          );

          console.log(`Added image ${i + 1}/${selectedFiles.length}: ${file.name}`);
        } catch (error) {
          console.error(`Error processing image ${file.name}:`, error);
          toast.error(`Failed to process ${file.name}`);
        }
      }

      // Save PDF
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      pdf.save(`images-to-pdf_${timestamp}.pdf`);
      
      toast.success(`PDF created successfully with ${selectedFiles.length} images!`);
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast.error('Failed to create PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Image to PDF"
      description="Convert your images into a PDF document. Perfect for creating documents from photos or scanned images."
      backLink="/pdf-tools"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">1. Upload Images</h2>
            {selectedFiles.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFiles}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </div>
          
          <FileUploader
            onFileSelect={handleFileSelect}
            acceptedFileTypes="image/*"
            maxSizeMB={10}
            multiple={true}
          />
          
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Selected Images ({selectedFiles.length})</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <ImageIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium block truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <span className="text-xs text-gray-400 px-2 py-1 bg-gray-200 rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveFile(index, index - 1)}
                          className="h-6 w-6 p-0"
                          title="Move up"
                        >
                          ↑
                        </Button>
                      )}
                      {index < selectedFiles.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveFile(index, index + 1)}
                          className="h-6 w-6 p-0"
                          title="Move down"
                        >
                          ↓
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">2. PDF Settings</h2>
          
          <div className="space-y-6">
            <div>
              <Label>Page Size</Label>
              <Select value={pageSize.name} onValueChange={(value) => {
                const size = pageSizes.find(s => s.name === value);
                if (size) setPageSize(size);
              }}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map((size) => (
                    <SelectItem key={size.name} value={size.name}>
                      {size.name} ({size.width} × {size.height} mm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Image Fit Mode</Label>
              <Select value={fitMode} onValueChange={(value: 'fit' | 'fill' | 'stretch') => setFitMode(value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit (maintain aspect ratio)</SelectItem>
                  <SelectItem value="fill">Fill (may crop)</SelectItem>
                  <SelectItem value="stretch">Stretch (may distort)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Image Quality: {imageQuality}%</Label>
              <Slider
                value={[imageQuality]}
                onValueChange={(value) => setImageQuality(value[0])}
                max={100}
                min={10}
                step={10}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher quality = larger file size
              </p>
            </div>
          </div>
          
          <Button
            onClick={convertToPdf}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="w-full mt-6"
          >
            <Download className="mr-2 h-4 w-4" />
            {isProcessing ? 'Creating PDF...' : `Convert ${selectedFiles.length} Images to PDF`}
          </Button>
        </Card>
      </div>
    </ToolLayout>
  );
};

export default ImageToPdf;
