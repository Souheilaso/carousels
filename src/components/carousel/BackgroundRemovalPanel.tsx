import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Scissors } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BackgroundRemovalPanelProps {
  selectedLayerId: string | null;
  onRemoveBackground: (layerId: string) => Promise<void>;
}

export function BackgroundRemovalPanel({
  selectedLayerId,
  onRemoveBackground,
}: BackgroundRemovalPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRemoveBackground = async () => {
    if (!selectedLayerId) {
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onRemoveBackground(selectedLayerId);
      
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } catch (error) {
      console.error('Background removal failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedLayerId) {
    return (
      <div className="panel">
        <div className="panel-header">Remove Background</div>
        <div className="panel-content">
          <p className="text-sm text-muted-foreground text-center py-4">
            Please select an image layer to remove its background
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">Remove Background</div>
      <div className="panel-content space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Remove the background from the selected image using AI.
          </p>
          <p className="text-xs text-muted-foreground">
            Note: This requires a Remove.bg API key. Set VITE_REMOVE_BG_API_KEY in your .env.local file.
          </p>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-center text-muted-foreground">
              Processing... {progress}%
            </p>
          </div>
        )}

        <Button
          onClick={handleRemoveBackground}
          disabled={isProcessing}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Scissors className="w-4 h-4 mr-2" />
              Remove Background
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

