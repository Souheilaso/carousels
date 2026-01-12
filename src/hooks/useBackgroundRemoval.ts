import { useState, useRef } from 'react';
import { toast } from 'sonner';

export function useBackgroundRemoval() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const modelRef = useRef<any>(null);

  const removeBackground = async (imageElement: HTMLImageElement): Promise<string> => {
    setIsRemoving(true);
    setProgress(10);

    try {
      // Dynamic import to avoid loading the heavy model upfront
      const { pipeline, env } = await import('@huggingface/transformers');
      
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      setProgress(30);
      toast.info('Loading AI model...');

      if (!modelRef.current) {
        modelRef.current = await pipeline(
          'image-segmentation',
          'Xenova/segformer-b0-finetuned-ade-512-512',
          { device: 'webgpu' }
        );
      }

      setProgress(50);
      toast.info('Processing image...');

      // Convert image to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const MAX_DIM = 1024;
      let width = imageElement.naturalWidth;
      let height = imageElement.naturalHeight;

      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageElement, 0, 0, width, height);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      setProgress(70);

      const result = await modelRef.current(imageData);

      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }

      setProgress(85);

      // Apply mask
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = width;
      outputCanvas.height = height;
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) throw new Error('Could not get output canvas context');

      outputCtx.drawImage(canvas, 0, 0);

      const outputImageData = outputCtx.getImageData(0, 0, width, height);
      const data = outputImageData.data;

      for (let i = 0; i < result[0].mask.data.length; i++) {
        const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
        data[i * 4 + 3] = alpha;
      }

      outputCtx.putImageData(outputImageData, 0, 0);

      setProgress(100);
      toast.success('Background removed!');

      return outputCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Background removal failed:', error);
      toast.error('Failed to remove background. Try a different image.');
      throw error;
    } finally {
      setIsRemoving(false);
      setProgress(0);
    }
  };

  return {
    removeBackground,
    isRemoving,
    progress,
  };
}
