import { useCallback, useState } from 'react';
import { Upload, Link, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ImageSearchResults, ImageSource } from './ImageSearchResults';
import { PinterestAuth } from './PinterestAuth';
import { isPinterestUrl, isPinterestImageUrl, getPinterestInstructions, getProxiedPinterestImageUrl } from '@/lib/pinterest';
import { toast } from 'sonner';

type UploadKind = 'image' | 'video';

interface MediaUploaderProps {
  onUpload: (payload: { type: UploadKind; url: string }) => void;
}

export function ImageUploader({ onUpload }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<ImageSource>('pexels');
  const [pinterestAuthenticated, setPinterestAuthenticated] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const type: UploadKind = file.type.startsWith('video/') ? 'video' : 'image';
          onUpload({ type, url: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const type: UploadKind = file.type.startsWith('video/') ? 'video' : 'image';
          onUpload({ type, url: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const handleUrlImport = useCallback(() => {
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return;

    // Validate URL format
    try {
      new URL(trimmedUrl);
    } catch {
      toast.error('Invalid URL format', {
        description: 'Please enter a valid URL starting with http:// or https://',
        duration: 4000,
      });
      return;
    }

    // Check if it's a Pinterest URL
    if (isPinterestUrl(trimmedUrl)) {
      // If it's a direct Pinterest image URL, use proxied URL to avoid CORS
      if (isPinterestImageUrl(trimmedUrl)) {
        const proxiedUrl = getProxiedPinterestImageUrl(trimmedUrl);
        onUpload({ type: 'image', url: proxiedUrl });
        setImageUrl('');
        toast.info('Loading Pinterest image...');
        return;
      }
      
      // If it's a Pinterest pin page URL, show instructions
      if (trimmedUrl.includes('pinterest.com/pin/')) {
        toast.error('Please use "Copy image address" from Pinterest. Direct pin URLs are not supported.', {
          description: 'Right-click the image on Pinterest → Copy image address → Paste here',
          duration: 5000,
        });
        return;
      }
    }

    // Regular URL import - check if it looks like an image or video
    const isVideo = trimmedUrl.match(/\.(mp4|mov|webm|avi|mkv)$/i);
    const isImage = trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i) || 
                    trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp)/i); // Some URLs have query params
    
    if (!isVideo && !isImage) {
      // Still try to load it as an image (might be a direct image URL without extension)
      toast.info('Loading image from URL...');
    } else if (isVideo) {
      toast.info('Loading video from URL...');
    } else {
      toast.info('Loading image from URL...');
    }

    const type: UploadKind = isVideo ? 'video' : 'image';
    onUpload({ type, url: trimmedUrl });
    setImageUrl('');
  }, [imageUrl, onUpload]);

  const handleSearch = useCallback(() => {
    // Search is triggered automatically by ImageSearchResults component
    // This function can be used for manual trigger if needed
  }, []);

  const handleSelectSearchImage = useCallback((imageUrl: string) => {
    onUpload({ type: 'image', url: imageUrl });
  }, [onUpload]);

  return (
    <div className="panel">
      <div className="panel-header">Images & Videos</div>
      <div className="panel-content space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer',
            isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop image/video here or click to upload
          </p>
        </div>

        {/* URL Import */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Import from URL (image or video)</p>
          <div className="flex gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUrlImport();
                }
              }}
              placeholder="Paste image URL or Pinterest image address..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button 
              onClick={handleUrlImport}
              size="icon"
              variant="outline"
              className="shrink-0 border-border hover:bg-muted"
            >
              <Link className="w-4 h-4" />
            </Button>
          </div>
          {isPinterestUrl(imageUrl) && !isPinterestImageUrl(imageUrl) && (
            <p className="text-xs text-amber-500/80">
              💡 Tip: Right-click the Pinterest image → "Copy image address" to get the direct URL
            </p>
          )}
        </div>

        {/* Quick Search */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Quick Search</p>
          <Tabs value={searchSource} onValueChange={(v) => setSearchSource(v as ImageSource)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pexels">Pexels</TabsTrigger>
              <TabsTrigger value="pinterest">Pinterest</TabsTrigger>
            </TabsList>
            <TabsContent value="pexels" className="space-y-2 mt-2">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search Pexels..."
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button 
                  onClick={handleSearch}
                  size="icon"
                  variant="outline"
                  className="shrink-0 border-border hover:bg-muted"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Free stock images from Pexels
              </p>
            </TabsContent>
            <TabsContent value="pinterest" className="space-y-2 mt-2">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search Pinterest..."
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button 
                  onClick={handleSearch}
                  size="icon"
                  variant="outline"
                  className="shrink-0 border-border hover:bg-muted"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Search your Pinterest pins (requires authentication)
              </p>
              <PinterestAuth onAuthChange={setPinterestAuthenticated} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="pt-2 border-t border-border">
            <ImageSearchResults 
              query={searchQuery} 
              source={searchSource}
              onSelectImage={handleSelectSearchImage} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
