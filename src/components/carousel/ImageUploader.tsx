import { useCallback, useState } from 'react';
import { Upload, Link, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleUrlImport = useCallback(() => {
    if (imageUrl) {
      onImageUpload(imageUrl);
      setImageUrl('');
    }
  }, [imageUrl, onImageUpload]);

  return (
    <div className="panel">
      <div className="panel-header">Images</div>
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
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop image here or click to upload
          </p>
        </div>

        {/* URL Import */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Import from URL</p>
          <div className="flex gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image URL..."
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
        </div>

        {/* Quick Search */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Quick Search</p>
          <div className="flex gap-2">
            <Input
              placeholder="Search Pexels..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button 
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
        </div>
      </div>
    </div>
  );
}
