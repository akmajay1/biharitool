
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  className?: string;
  allowMultiple?: boolean;
  selectedFile?: File | null;
  onClearFile?: () => void;
  uploadProgress?: number;
  multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  acceptedFileTypes = 'image/*',
  maxSizeMB = 50,
  className = '',
  allowMultiple = false,
  selectedFile = null,
  onClearFile,
  uploadProgress,
  multiple = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const validateFile = useCallback((file: File): boolean => {
    // Check file size first
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File "${file.name}" is too large. Maximum size is ${maxSizeMB} MB.`);
      return false;
    }

    // Check file type if specified
    if (acceptedFileTypes && acceptedFileTypes !== '*') {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();
      
      // Handle different accepted file type formats
      const acceptedTypes = acceptedFileTypes.toLowerCase().split(',').map(type => type.trim());
      
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          // File extension check
          return fileExtension === type;
        } else if (type.includes('/')) {
          // MIME type check
          if (type.endsWith('/*')) {
            return mimeType.startsWith(type.replace('*', ''));
          }
          return mimeType === type;
        }
        return false;
      });

      if (!isValidType) {
        toast.error(`File "${file.name}" is not a supported format. Please upload: ${acceptedFileTypes}`);
        return false;
      }
    }
    
    return true;
  }, [acceptedFileTypes, maxSizeMB]);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      
      if (multiple) {
        files.forEach(file => {
          if (validateFile(file)) {
            onFileSelect(file);
          }
        });
      } else {
        const file = files[0];
        if (validateFile(file)) {
          onFileSelect(file);
        }
      }
    }
  }, [onFileSelect, validateFile, multiple]);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      if (multiple) {
        files.forEach(file => {
          if (validateFile(file)) {
            onFileSelect(file);
          }
        });
      } else {
        const file = files[0];
        if (validateFile(file)) {
          onFileSelect(file);
        }
      }
    }
    
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [onFileSelect, validateFile, multiple]);

  const getAcceptAttribute = () => {
    if (!acceptedFileTypes) return undefined;
    return acceptedFileTypes;
  };

  const getFileTypeText = () => {
    if (acceptedFileTypes === 'image/*') return 'images';
    if (acceptedFileTypes === '.pdf') return 'PDF files';
    if (acceptedFileTypes.includes('.doc') || acceptedFileTypes.includes('.docx')) return 'Word documents';
    if (acceptedFileTypes.includes('.xls') || acceptedFileTypes.includes('.xlsx')) return 'Excel files';
    if (acceptedFileTypes.includes('.ppt') || acceptedFileTypes.includes('.pptx')) return 'PowerPoint files';
    return 'files';
  };

  return (
    <div className={`w-full ${className}`}>
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-xl px-6 py-10 text-center transition-all duration-200 ${
            isDragging 
              ? 'border-blue-400 bg-blue-50 scale-105' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center">
            <div className={`mb-4 ${isDragging ? 'animate-bounce' : ''}`}>
              <Upload size={48} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium mb-2">
              {isDragging ? `Drop your ${getFileTypeText()} here` : `Drag and drop your ${getFileTypeText()}`}
            </p>
            <p className="text-gray-500 mb-4">or</p>
            <label htmlFor="fileInput" className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <FileText className="mr-2 h-4 w-4" />
                Browse {getFileTypeText()}
              </span>
              <input
                id="fileInput"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept={getAcceptAttribute()}
                multiple={multiple}
              />
            </label>
            <div className="mt-4 text-sm text-gray-500">
              <p>Maximum file size: {maxSizeMB} MB</p>
              {multiple && <p>You can select multiple files</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-xl p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-medium">{selectedFile.name}</div>
                <div className="text-sm text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>
            {onClearFile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFile}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Remove file"
              >
                <X size={18} />
              </Button>
            )}
          </div>
          
          {typeof uploadProgress === 'number' && uploadProgress < 100 && (
            <div className="mt-3">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
