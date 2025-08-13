
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download, FileText, Image, Trash2, Settings } from 'lucide-react';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ConversionSettings {
  format: 'png' | 'jpeg';
  quality: number;
  scale: number;
  pageRange: 'all' | 'custom';
  customPages: string;
}

const PdfToImage = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImages, setResultImages] = useState<{ url: string; pageNumber: number }[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'png',
    quality: 90,
    scale: 2.0,
    pageRange: 'all',
    customPages: ''
  });

  const handleFileSelect = async (file: File) => {
    setPdfFile(file);
    setResultImages([]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);
      toast.success(`PDF loaded: ${pdf.numPages} pages found`);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF file');
      setTotalPages(0);
    }
  };

  const clearFile = () => {
    setPdfFile(null);
    setResultImages([]);
    setTotalPages(0);
  };

  const parsePageNumbers = (customPages: string, totalPages: number): number[] => {
    if (!customPages.trim()) return [];
    
    const pageNumbers: number[] = [];
    const ranges = customPages.split(',').map(range => range.trim());
    
    for (const range of ranges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(n => parseInt(n.trim()));
        if (start >= 1 && end <= totalPages && start <= end) {
          for (let i = start; i <= end; i++) {
            pageNumbers.push(i);
          }
        }
      } else {
        const pageNum = parseInt(range);
        if (pageNum >= 1 && pageNum <= totalPages) {
          pageNumbers.push(pageNum);
        }
      }
    }
    
    return [...new Set(pageNumbers)].sort((a, b) => a - b);
  };

  const convertToImages = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setIsProcessing(true);
    setResultImages([]);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let pagesToConvert: number[] = [];
      
      if (settings.pageRange === 'all') {
        pagesToConvert = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
      } else {
        pagesToConvert = parsePageNumbers(settings.customPages, pdf.numPages);
        if (pagesToConvert.length === 0) {
          toast.error('Please enter valid page numbers');
          setIsProcessing(false);
          return;
        }
      }
      
      const images: { url: string; pageNumber: number }[] = [];
      
      for (const pageNumber of pagesToConvert) {
        try {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: settings.scale });
          
          // Create canvas for rendering
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          if (!context) {
            throw new Error('Could not get canvas context');
          }
          
          // Render PDF page to canvas
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          await page.render(renderContext).promise;
          
          // Convert canvas to image
          let imageDataUrl: string;
          
          if (settings.format === 'jpeg') {
            imageDataUrl = canvas.toDataURL('image/jpeg', settings.quality / 100);
          } else {
            imageDataUrl = canvas.toDataURL('image/png');
          }
          
          images.push({ url: imageDataUrl, pageNumber });
          
          // Update progress
          toast.success(`Converted page ${pageNumber}`);
        } catch (error) {
          console.error(`Error converting page ${pageNumber}:`, error);
          toast.error(`Failed to convert page ${pageNumber}`);
        }
      }
      
      setResultImages(images);
      
      if (images.length > 0) {
        toast.success(`Successfully converted ${images.length} page${images.length > 1 ? 's' : ''}!`);
      }
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      toast.error('Failed to convert PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (url: string, pageNumber: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-${pageNumber}.${settings.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded page ${pageNumber}`);
  };

  const downloadAllImages = () => {
    resultImages.forEach(({ url, pageNumber }, index) => {
      setTimeout(() => {
        downloadImage(url, pageNumber);
      }, index * 200); // Stagger downloads
    });
    toast.success('Downloading all images...');
  };

  return (
    <ToolLayout
      title="PDF to Image"
      description="Convert PDF pages to high-quality images. Extract charts, graphics, or text as images from your PDF documents."
      backLink="/pdf-tools"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Upload PDF</h2>
          {!pdfFile ? (
            <FileUploader
              onFileSelect={handleFileSelect}
              acceptedFileTypes=".pdf"
              maxSizeMB={50}
              multiple={false}
            />
          ) : (
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">{pdfFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(pdfFile.size)} • {totalPages} pages
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">2. Conversion Settings</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Output Format</Label>
              <Select 
                value={settings.format} 
                onValueChange={(value: 'png' | 'jpeg') => 
                  setSettings(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG (Lossless, larger file)</SelectItem>
                  <SelectItem value="jpeg">JPEG (Compressed, smaller file)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.format === 'jpeg' && (
              <div>
                <Label>JPEG Quality: {settings.quality}%</Label>
                <Slider
                  value={[settings.quality]}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, quality: value[0] }))}
                  max={100}
                  min={10}
                  step={10}
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label>Resolution Scale: {settings.scale}x</Label>
              <Slider
                value={[settings.scale]}
                onValueChange={(value) => setSettings(prev => ({ ...prev, scale: value[0] }))}
                max={4}
                min={0.5}
                step={0.5}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher scale = better quality but larger files
              </p>
            </div>

            <div>
              <Label>Pages to Convert</Label>
              <Select 
                value={settings.pageRange} 
                onValueChange={(value: 'all' | 'custom') => 
                  setSettings(prev => ({ ...prev, pageRange: value }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pages</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              
              {settings.pageRange === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="e.g., 1-3,5,7-9"
                    value={settings.customPages}
                    onChange={(e) => setSettings(prev => ({ ...prev, customPages: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter page numbers or ranges (1-{totalPages})
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            className="w-full mt-6"
            disabled={!pdfFile || isProcessing || totalPages === 0}
            onClick={convertToImages}
          >
            <Settings className="mr-2 h-4 w-4" />
            {isProcessing ? 'Converting...' : 'Convert to Images'}
          </Button>
        </Card>
      </div>

      {/* Results Section */}
      {resultImages.length > 0 && (
        <Card className="mt-8 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">3. Converted Images</h2>
            <Button 
              variant="outline"
              onClick={downloadAllImages}
            >
              <Download className="h-4 w-4 mr-1" /> Download All ({resultImages.length})
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resultImages.map(({ url, pageNumber }) => (
              <div key={pageNumber} className="border rounded-lg p-3 bg-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">Page {pageNumber}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadImage(url, pageNumber)}
                  >
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </div>
                <div className="bg-gray-100 rounded-md overflow-hidden">
                  <img 
                    src={url} 
                    alt={`Page ${pageNumber}`} 
                    className="w-full h-auto object-contain max-h-48"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </ToolLayout>
  );
};

export default PdfToImage;
