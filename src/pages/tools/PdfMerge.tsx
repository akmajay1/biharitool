
import React from 'react';
import { PDFDocument } from 'pdf-lib';
import ToolLayout from '../../components/Layout/ToolLayout';
import PdfToolBase from '../../components/PDF/PdfToolBase';

const PdfMerge = () => {
  const handleMergePDF = async (files: File[]): Promise<Blob> => {
    if (files.length < 2) {
      throw new Error('Please select at least 2 PDF files to merge.');
    }

    try {
      const mergedPdf = await PDFDocument.create();
      
      // Process files in the order they were uploaded
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const fileBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(fileBuffer);
          const pageCount = pdf.getPageCount();
          
          if (pageCount === 0) {
            console.warn(`File ${file.name} has no pages, skipping...`);
            continue;
          }
          
          // Copy all pages from this PDF
          const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
          const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
          
          copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
          });
          
          console.log(`Successfully merged ${pageCount} pages from ${file.name}`);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          throw new Error(`Failed to process ${file.name}. Please ensure it's a valid PDF file.`);
        }
      }
      
      if (mergedPdf.getPageCount() === 0) {
        throw new Error('No valid pages found in the selected files.');
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      return new Blob([mergedPdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('PDF merge error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while merging PDFs.');
    }
  };

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine multiple PDF files into a single document."
      backLink="/pdf-tools"
    >
      <PdfToolBase
        title="Merge PDF"
        description="Upload multiple PDF files and combine them into a single document. The files will be merged in the order they were uploaded. Minimum 2 files required."
        acceptedFileTypes=".pdf"
        onProcess={handleMergePDF}
        maxFiles={10}
      />
    </ToolLayout>
  );
};

export default PdfMerge;
