
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { Download, Trash2 } from 'lucide-react';

interface PdfToolBaseProps {
  title: string;
  description: string;
  acceptedFileTypes: string;
  onProcess: (files: File[]) => Promise<Blob>;
  maxFiles?: number;
}

const PdfToolBase: React.FC<PdfToolBaseProps> = ({
  title,
  description,
  acceptedFileTypes,
  onProcess,
  maxFiles = 1,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (file: File) => {
    if (selectedFiles.length < maxFiles) {
      setSelectedFiles(prev => [...prev, file]);
      toast.success('File added successfully');
    } else {
      toast.error(`Maximum ${maxFiles} files allowed`);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    toast.success('All files cleared');
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await onProcess(selectedFiles);
      
      // Create download link
      const url = URL.createObjectURL(result);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate appropriate filename based on tool type
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      let filename = `processed_${timestamp}.pdf`;
      
      if (title.includes('Merge')) {
        filename = `merged_${timestamp}.pdf`;
      } else if (title.includes('Split')) {
        filename = `split_${timestamp}.pdf`;
      } else if (title.includes('Compress')) {
        filename = `compressed_${timestamp}.pdf`;
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Processing completed successfully!');
      
      // Clear files after successful processing
      setSelectedFiles([]);
    } catch (error) {
      console.error('Processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to process: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">1. Upload Files</h2>
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
          acceptedFileTypes={acceptedFileTypes}
          maxSizeMB={50}
          multiple={maxFiles > 1}
        />
        
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">
              Selected Files ({selectedFiles.length}/{maxFiles === Infinity ? '∞' : maxFiles})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium block truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">2. Process Files</h2>
        <p className="text-gray-600 mb-6">{description}</p>
        
        {selectedFiles.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              Ready to process {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        <Button
          onClick={handleProcess}
          disabled={selectedFiles.length === 0 || isProcessing}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {isProcessing ? 'Processing...' : `Process ${selectedFiles.length > 0 ? selectedFiles.length : ''} File${selectedFiles.length !== 1 ? 's' : ''}`}
        </Button>
      </Card>
    </div>
  );
};

export default PdfToolBase;
