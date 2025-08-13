
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, QrCode, Link, Mail, Phone, MapPin, CreditCard, User } from 'lucide-react';
import QRCode from 'qrcode';
import ToolLayout from '../../components/Layout/ToolLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const QrGenerator = () => {
  const [qrContent, setQrContent] = useState<string>('');
  const [contentType, setContentType] = useState<string>('url');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrSize, setQrSize] = useState<number>(300);
  const [qrColor, setQrColor] = useState<string>('#000000');
  const [qrBgColor, setQrBgColor] = useState<string>('#ffffff');
  
  // Form fields for different content types
  const [urlValue, setUrlValue] = useState<string>('https://');
  const [textValue, setTextValue] = useState<string>('');
  const [emailData, setEmailData] = useState({ 
    address: '', 
    subject: '', 
    body: '' 
  });
  const [phoneValue, setPhoneValue] = useState<string>('');
  const [locationData, setLocationData] = useState({ 
    latitude: '', 
    longitude: '', 
    name: '' 
  });
  const [contactData, setContactData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    website: ''
  });
  
  // Update QR content when inputs change
  useEffect(() => {
    let content = '';
    
    switch (contentType) {
      case 'url':
        content = urlValue;
        break;
      case 'text':
        content = textValue;
        break;
      case 'email':
        content = `mailto:${emailData.address}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
        break;
      case 'phone':
        content = `tel:${phoneValue}`;
        break;
      case 'location':
        if (locationData.latitude && locationData.longitude) {
          content = `geo:${locationData.latitude},${locationData.longitude}?q=${encodeURIComponent(locationData.name || `${locationData.latitude},${locationData.longitude}`)}`;
        }
        break;
      case 'contact':
        // vCard format
        content = 'BEGIN:VCARD\nVERSION:3.0\n';
        if (contactData.name) content += `N:${contactData.name}\nFN:${contactData.name}\n`;
        if (contactData.phone) content += `TEL:${contactData.phone}\n`;
        if (contactData.email) content += `EMAIL:${contactData.email}\n`;
        if (contactData.address) content += `ADR:;;${contactData.address};;;\n`;
        if (contactData.website) content += `URL:${contactData.website}\n`;
        content += 'END:VCARD';
        break;
    }
    
    setQrContent(content);
  }, [contentType, urlValue, textValue, emailData, phoneValue, locationData, contactData]);
  
  const generateQRCode = async () => {
    if (!qrContent) {
      toast.error('Please enter content for the QR code');
      return;
    }
    
    try {
      // Generate QR code using the proper library
      const qrDataUrl = await QRCode.toDataURL(qrContent, {
        width: qrSize,
        color: {
          dark: qrColor,
          light: qrBgColor
        },
        errorCorrectionLevel: 'M',
        margin: 1
      });
      
      setQrImage(qrDataUrl);
      toast.success('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };
  
  const downloadQRCode = () => {
    if (!qrImage) return;
    
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR code downloaded successfully');
  };
  
  const renderContentForm = () => {
    switch (contentType) {
      case 'url':
        return (
          <div className="space-y-4">
            <Label htmlFor="url-input">Website or URL</Label>
            <Input
              id="url-input"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-4">
            <Label htmlFor="text-input">Text Content</Label>
            <Textarea
              id="text-input"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Enter your text here"
              rows={5}
            />
          </div>
        );
      
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                type="email"
                value={emailData.address}
                onChange={(e) => setEmailData({...emailData, address: e.target.value})}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject (Optional)</Label>
              <Input
                id="email-subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="email-body">Message (Optional)</Label>
              <Textarea
                id="email-body"
                value={emailData.body}
                onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                placeholder="Email body"
                rows={3}
              />
            </div>
          </div>
        );
      
      case 'phone':
        return (
          <div className="space-y-4">
            <Label htmlFor="phone-input">Phone Number</Label>
            <Input
              id="phone-input"
              value={phoneValue}
              onChange={(e) => setPhoneValue(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        );
      
      case 'location':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-name">Location Name (Optional)</Label>
              <Input
                id="location-name"
                value={locationData.name}
                onChange={(e) => setLocationData({...locationData, name: e.target.value})}
                placeholder="My Location"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={locationData.latitude}
                  onChange={(e) => setLocationData({...locationData, latitude: e.target.value})}
                  placeholder="37.7749"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={locationData.longitude}
                  onChange={(e) => setLocationData({...locationData, longitude: e.target.value})}
                  placeholder="-122.4194"
                />
              </div>
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="contact-name">Full Name</Label>
              <Input
                id="contact-name"
                value={contactData.name}
                onChange={(e) => setContactData({...contactData, name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone Number</Label>
              <Input
                id="contact-phone"
                value={contactData.phone}
                onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                value={contactData.email}
                onChange={(e) => setContactData({...contactData, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="contact-address">Address</Label>
              <Textarea
                id="contact-address"
                value={contactData.address}
                onChange={(e) => setContactData({...contactData, address: e.target.value})}
                placeholder="123 Main St, City, Country"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="contact-website">Website</Label>
              <Input
                id="contact-website"
                value={contactData.website}
                onChange={(e) => setContactData({...contactData, website: e.target.value})}
                placeholder="https://example.com"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <ToolLayout
      title="QR Code Generator"
      description="Create custom QR codes for websites, text, contact info, and more. Perfect for marketing, business cards, and sharing information."
      backLink="/image-tools"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Content Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">1. Choose Content Type</h2>
          
          <div className="mb-6">
            <RadioGroup
              value={contentType}
              onValueChange={setContentType}
              className="grid grid-cols-2 md:grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="cursor-pointer flex items-center">
                  <Link size={16} className="mr-2" />
                  URL
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="cursor-pointer flex items-center">
                  <QrCode size={16} className="mr-2" />
                  Text
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="cursor-pointer flex items-center">
                  <Mail size={16} className="mr-2" />
                  Email
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone" className="cursor-pointer flex items-center">
                  <Phone size={16} className="mr-2" />
                  Phone
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                <RadioGroupItem value="location" id="location" />
                <Label htmlFor="location" className="cursor-pointer flex items-center">
                  <MapPin size={16} className="mr-2" />
                  Location
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                <RadioGroupItem value="contact" id="contact" />
                <Label htmlFor="contact" className="cursor-pointer flex items-center">
                  <User size={16} className="mr-2" />
                  Contact
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">2. Enter Content</h3>
            {renderContentForm()}
          </div>
        </Card>

        {/* QR Code Settings & Preview */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">3. Customize QR Code</h2>
            
            <div className="space-y-6">
              <div>
                <Label htmlFor="qr-size">Size (pixels)</Label>
                <Select 
                  value={qrSize.toString()} 
                  onValueChange={(value) => setQrSize(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200">200 × 200</SelectItem>
                    <SelectItem value="300">300 × 300</SelectItem>
                    <SelectItem value="400">400 × 400</SelectItem>
                    <SelectItem value="500">500 × 500</SelectItem>
                    <SelectItem value="600">600 × 600</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="qr-color">QR Code Color</Label>
                  <div className="flex mt-1">
                    <Input 
                      type="color" 
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="w-12 h-10 p-1 border-r-0 rounded-r-none"
                    />
                    <Input
                      type="text"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="flex-1 rounded-l-none"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="qr-bg-color">Background Color</Label>
                  <div className="flex mt-1">
                    <Input 
                      type="color" 
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="w-12 h-10 p-1 border-r-0 rounded-r-none"
                    />
                    <Input
                      type="text"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="flex-1 rounded-l-none"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={generateQRCode}
                disabled={!qrContent}
                className="w-full"
              >
                Generate QR Code
              </Button>
            </div>
          </Card>
          
          {qrImage && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">4. Download QR Code</h2>
              <div className="flex flex-col items-center">
                <div className="border p-4 bg-white rounded-lg mb-4">
                  <img 
                    src={qrImage} 
                    alt="Generated QR Code" 
                    className="max-w-full"
                  />
                </div>
                <Button onClick={downloadQRCode} className="flex items-center gap-2">
                  <Download size={18} />
                  Download QR Code
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </ToolLayout>
  );
};

export default QrGenerator;
