
import React, { useState, useEffect, useRef } from 'react';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUploader from '@/components/UI/FileUploader';
import { formatFileSize } from '@/utils/imageUtils';
import { addNameAndDate } from '@/utils/canvasUtils';
import { loadImage } from '@/utils/aiUtils';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const fontOptions = [
  { id: 'arial', name: 'Arial', value: 'Arial, sans-serif' },
  { id: 'georgia', name: 'Georgia', value: 'Georgia, serif' },
  { id: 'timesNewRoman', name: 'Times New Roman', value: 'Times New Roman, serif' },
  { id: 'verdana', name: 'Verdana', value: 'Verdana, sans-serif' },
  { id: 'courier', name: 'Courier', value: 'Courier, monospace' },
];

const positionOptions = [
  { id: 'bottomRight', name: 'Bottom Right' },
  { id: 'bottomLeft', name: 'Bottom Left' },
  { id: 'bottomCenter', name: 'Bottom Center' },
  { id: 'topRight', name: 'Top Right' },
  { id: 'topLeft', name: 'Top Left' },
  { id: 'topCenter', name: 'Top Center' },
];

const ImageAddNameDate = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageInfo, setImageInfo] = useState<{ size: string; width: number; height: number } | null>(null);
  
  const [nameText, setNameText] = useState('John Doe');
  const [includeDate, setIncludeDate] = useState(true);
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [useCurrentDate, setUseCurrentDate] = useState(true);
  const [position, setPosition] = useState('bottomCenter');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('arial');
  const [textColor, setTextColor] = useState('#000000');
  const [addBackground, setAddBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundOpacity, setBackgroundOpacity] = useState(70);
  const [padding, setPadding] = useState(10);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  const addNameAndDate = async () => {
    if (!selectedFile || !previewUrl) {
      toast.error('Please select an image first');
      return;
    }

    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      const img = new Image();
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image onto canvas
        ctx.drawImage(img, 0, 0);
        
        // Format date if needed
        let dateString = '';
        if (includeDate) {
          const dateObj = useCurrentDate ? new Date() : new Date(customDate);
          dateString = formatDate(dateObj, dateFormat);
        }
        
        // Calculate dynamic font size (4% of image width)
        const dynamicFontSize = Math.max(Math.floor(img.width * 0.04), 20);
        
        // Configure text style
        const selectedFont = fontOptions.find(f => f.id === fontFamily)?.value || 'Arial, sans-serif';
        ctx.font = `bold ${dynamicFontSize}px ${selectedFont}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        
        // Calculate positions for exam photo style (bottom center, full width)
        const centerX = img.width / 2;
        const bottomMargin = Math.max(Math.floor(img.height * 0.05), 30);
        
        // Position for name (higher up)
        const nameY = img.height - bottomMargin - (includeDate ? dynamicFontSize + 10 : 0);
        
        // Position for date (below name)
        const dateY = img.height - bottomMargin;
        
        // Add background if needed
        if (addBackground) {
          const bgColor = hexToRgba(backgroundColor, backgroundOpacity / 100);
          ctx.fillStyle = bgColor;
          
          // Calculate background dimensions
          const nameWidth = ctx.measureText(nameText).width;
          const dateWidth = includeDate && dateString ? ctx.measureText(dateString).width : 0;
          const maxWidth = Math.max(nameWidth, dateWidth);
          const bgWidth = maxWidth + padding * 2;
          const bgHeight = dynamicFontSize * (includeDate ? 2.5 : 1.2) + padding;
          
          ctx.fillRect(
            centerX - bgWidth / 2,
            nameY - dynamicFontSize - padding / 2,
            bgWidth,
            bgHeight
          );
          
          // Reset text color
          ctx.fillStyle = textColor;
        }
        
        // Draw name
        ctx.fillText(nameText, centerX, nameY);
        
        // Draw date if included
        if (includeDate && dateString) {
          ctx.fillText(dateString, centerX, dateY);
        }
        
        // Create output URL
        const outputUrl = canvas.toDataURL('image/jpeg');
        setOutputUrl(outputUrl);
        setLoading(false);
        toast.success('Name and date added successfully!');
      };
      
      img.onerror = () => {
        setLoading(false);
        toast.error('Failed to load image');
      };
      
      img.src = previewUrl;
    } catch (error) {
      console.error('Error adding name and date:', error);
      toast.error('Failed to add name and date. Please try again.');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `signed_${selectedFile?.name || 'image'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded successfully!');
  };

  // Helper function to format date
  const formatDate = (date: Date, format: string): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year.toString())
      .replace('yy', year.toString().substr(-2));
  };

  // Helper function to calculate position
  const calculatePosition = (
    position: string, 
    textWidth: number, 
    textHeight: number, 
    imgWidth: number, 
    imgHeight: number, 
    padding: number
  ) => {
    let x = padding;
    let y = textHeight + padding;
    
    switch (position) {
      case 'bottomRight':
        x = imgWidth - textWidth - padding;
        y = imgHeight - padding;
        break;
      case 'bottomLeft':
        x = padding;
        y = imgHeight - padding;
        break;
      case 'bottomCenter':
        x = (imgWidth - textWidth) / 2;
        y = imgHeight - padding;
        break;
      case 'topRight':
        x = imgWidth - textWidth - padding;
        y = textHeight + padding;
        break;
      case 'topLeft':
        x = padding;
        y = textHeight + padding;
        break;
      case 'topCenter':
        x = (imgWidth - textWidth) / 2;
        y = textHeight + padding;
        break;
    }
    
    return { x, y };
  };

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <ToolLayout
      title="Add Name & Date"
      description="Stamp your name and date onto photos or documents. Perfect for signing documents, adding watermarks, or dating photos."
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
          <h2 className="text-xl font-semibold mb-4">2. Configure Text</h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="nameText" className="block text-sm font-medium mb-1">Name or Text</label>
              <Input 
                id="nameText"
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                placeholder="Enter name or text"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="includeDate" 
                checked={includeDate} 
                onCheckedChange={setIncludeDate} 
              />
              <Label htmlFor="includeDate">Include Date</Label>
            </div>
            
            {includeDate && (
              <>
                <div>
                  <label htmlFor="dateFormat" className="block text-sm font-medium mb-1">Date Format</label>
                  <Select
                    value={dateFormat}
                    onValueChange={setDateFormat}
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      <SelectItem value="dd.MM.yyyy">DD.MM.YYYY</SelectItem>
                      <SelectItem value="dd-MM-yy">DD-MM-YY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="useCurrentDate" 
                    checked={useCurrentDate} 
                    onCheckedChange={setUseCurrentDate} 
                  />
                  <Label htmlFor="useCurrentDate">Use Current Date</Label>
                </div>
                
                {!useCurrentDate && (
                  <div>
                    <label htmlFor="customDate" className="block text-sm font-medium mb-1">Custom Date</label>
                    <Input 
                      id="customDate"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
            
            <div>
              <label htmlFor="position" className="block text-sm font-medium mb-1">Position</label>
              <Select
                value={position}
                onValueChange={setPosition}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="fontFamily" className="block text-sm font-medium mb-1">Font Family</label>
              <Select
                value={fontFamily}
                onValueChange={setFontFamily}
              >
                <SelectTrigger id="fontFamily">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="fontSize" className="block text-sm font-medium">Font Size: {fontSize}px</label>
              </div>
              <Slider 
                id="fontSize"
                value={[fontSize]} 
                min={8} 
                max={72} 
                step={1}
                onValueChange={(values) => setFontSize(values[0])} 
              />
            </div>
            
            <div>
              <label htmlFor="textColor" className="block text-sm font-medium mb-1">Text Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  id="textColor"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 p-0 border-0 rounded-md cursor-pointer"
                />
                <span className="text-sm">{textColor}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="addBackground" 
                checked={addBackground} 
                onCheckedChange={setAddBackground} 
              />
              <Label htmlFor="addBackground">Add Background</Label>
            </div>
            
            {addBackground && (
              <>
                <div>
                  <label htmlFor="backgroundColor" className="block text-sm font-medium mb-1">Background Color</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="color" 
                      id="backgroundColor"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 p-0 border-0 rounded-md cursor-pointer"
                    />
                    <span className="text-sm">{backgroundColor}</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label htmlFor="backgroundOpacity" className="block text-sm font-medium">Opacity: {backgroundOpacity}%</label>
                  </div>
                  <Slider 
                    id="backgroundOpacity"
                    value={[backgroundOpacity]} 
                    min={1} 
                    max={100} 
                    step={1}
                    onValueChange={(values) => setBackgroundOpacity(values[0])} 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label htmlFor="padding" className="block text-sm font-medium">Padding: {padding}px</label>
                  </div>
                  <Slider 
                    id="padding"
                    value={[padding]} 
                    min={0} 
                    max={50} 
                    step={1}
                    onValueChange={(values) => setPadding(values[0])} 
                  />
                </div>
              </>
            )}
          </div>
          
          <Button
            onClick={addNameAndDate}
            disabled={!selectedFile || loading || (!nameText && !includeDate)}
            className="w-full mt-6"
          >
            {loading ? 'Processing...' : 'Add Name & Date'}
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

export default ImageAddNameDate;
