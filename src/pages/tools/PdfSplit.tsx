
import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { toast } from 'sonner';
import { Download, Trash2, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PdfSplit = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'pages' | 'range' | 'single'>('single');
  const [pageRange, setPageRange] = useState<string>('');
  const [pagesPerFile, setPagesPerFile] = useState<number>(1);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    try {
      const fileBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      const count = pdf.getPageCount();
      setPageCount(count);
      toast.success(`PDF loaded: ${count} pages found`);
    } catch (error) {
      console.error('Error reading PDF:', error);
      toast.error('Failed to read PDF file');
      setPageCount(0);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPageCount(0);
    setPageRange('');
    setPagesPerFile(1);
  };

  const downloadPdf = (pdfBytes: Uint8Array, filename: string) => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const splitIntoSinglePages = async () => {
    if (!selectedFile) return;

    try {
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      const totalPages = pdf.getPageCount();
      
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        
        const pdfBytes = await newPdf.save();
        const filename = `page_${i + 1}_of_${totalPages}.pdf`;
        downloadPdf(pdfBytes, filename);
        
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast.success(`Successfully split PDF into ${totalPages} individual pages`);
    } catch (error) {
      console.error('Error splitting PDF:', error);
      throw error;
    }
  };

  const splitByPageRange = async () => {
    if (!selectedFile || !pageRange) return;

    try {
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      const totalPages = pdf.getPageCount();
      
      // Parse page range (e.g., "1-3,5,7-9")
      const ranges = pageRange.split(',').map(range => range.trim());
      let pageNumbers: number[] = [];
      
      for (const range of ranges) {
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(n => parseInt(n.trim()));
          if (start < 1 || end > totalPages || start > end) {
            throw new Error(`Invalid page range: ${range}`);
          }
          for (let i = start; i <= end; i++) {
            pageNumbers.push(i - 1); // Convert to 0-based index
          }
        } else {
          const pageNum = parseInt(range);
          if (pageNum < 1 || pageNum > totalPages) {
            throw new Error(`Invalid page number: ${pageNum}`);
          }
          pageNumbers.push(pageNum - 1); // Convert to 0-based index
        }
      }
      
      // Remove duplicates and sort
      pageNumbers = [...new Set(pageNumbers)].sort((a, b) => a - b);
      
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pageNumbers);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const filename = `pages_${pageRange.replace(/,/g, '_').replace(/-/g, 'to')}.pdf`;
      downloadPdf(pdfBytes, filename);
      
      toast.success(`Successfully extracted ${pageNumbers.length} pages`);
    } catch (error) {
      console.error('Error splitting PDF by range:', error);
      throw error;
    }
  };

  const splitByPagesPerFile = async () => {
    if (!selectedFile || pagesPerFile < 1) return;

    try {
      const fileBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);
      const totalPages = pdf.getPageCount();
      
      const numFiles = Math.ceil(totalPages / pagesPerFile);
      
      for (let fileIndex = 0; fileIndex < numFiles; fileIndex++) {
        const newPdf = await PDFDocument.create();
        const startPage = fileIndex * pagesPerFile;
        const endPage = Math.min(startPage + pagesPerFile, totalPages);
        
        const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
        const copiedPages = await newPdf.copyPages(pdf, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        
        const pdfBytes = await newPdf.save();
        const filename = `part_${fileIndex + 1}_pages_${startPage + 1}-${endPage}.pdf`;
        downloadPdf(pdfBytes, filename);
        
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast.success(`Successfully split PDF into ${numFiles} files`);
    } catch (error) {
      console.error('Error splitting PDF by pages per file:', error);
      throw error;
    }
  };

  const handleSplit = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setIsProcessing(true);
    try {
      switch (splitMode) {
        case 'single':
          await splitIntoSinglePages();
          break;
        case 'range':
          if (!pageRange.trim()) {
            toast.error('Please enter a page range');
            return;
          }
          await splitByPageRange();
          break;
        case 'pages':
          if (pagesPerFile < 1) {
            toast.error('Pages per file must be at least 1');
            return;
          }
          await splitByPagesPerFile();
          break;
      }
    } catch (error) {
      console.error('Split error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to split PDF: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Split PDF"
      description="Extract pages from your PDF or split into multiple documents."
      backLink="/pdf-tools"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Upload PDF</h2>
          {!selectedFile ? (
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
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)} • {pageCount} pages
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
          <h2 className="text-xl font-semibold mb-4">2. Choose Split Method</h2>
          
          <Tabs value={splitMode} onValueChange={(value) => setSplitMode(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Single Pages</TabsTrigger>
              <TabsTrigger value="range">Page Range</TabsTrigger>
              <TabsTrigger value="pages">Pages per File</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Split into individual pages. Each page will be saved as a separate PDF.
              </p>
            </TabsContent>
            
            <TabsContent value="range" className="mt-4">
              <Label htmlFor="pageRange">Page Range (e.g., 1-3,5,7-9)</Label>
              <Input
                id="pageRange"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="1-3,5,7-9"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Specify pages to extract. Use commas for multiple ranges.
              </p>
            </TabsContent>
            
            <TabsContent value="pages" className="mt-4">
              <Label htmlFor="pagesPerFile">Pages per File</Label>
              <Input
                id="pagesPerFile"
                type="number"
                min="1"
                max={pageCount}
                value={pagesPerFile}
                onChange={(e) => setPagesPerFile(parseInt(e.target.value) || 1)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Split PDF into files with this many pages each.
              </p>
            </TabsContent>
          </Tabs>
          
          <Button
            onClick={handleSplit}
            disabled={!selectedFile || isProcessing || pageCount === 0}
            className="w-full mt-6"
          >
            <Download className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Split PDF'}
          </Button>
        </Card>
      </div>
    </ToolLayout>
  );
};

export default PdfSplit;
