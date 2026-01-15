// Background removal service client
// Using Remove.bg API as default (free tier available)

const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';

export interface RemoveBackgroundOptions {
  imageUrl?: string;
  imageFile?: File;
  size?: 'auto' | 'preview' | 'small' | 'regular' | 'medium' | 'hd' | 'full' | '4k';
  format?: 'auto' | 'png' | 'jpg' | 'zip';
}

export interface RemoveBackgroundResult {
  imageDataUrl: string;
  width: number;
  height: number;
}

/**
 * Remove background from an image using Remove.bg API
 */
export async function removeBackground(
  options: RemoveBackgroundOptions
): Promise<RemoveBackgroundResult> {
  const apiKey = import.meta.env.VITE_REMOVE_BG_API_KEY;

  if (!apiKey) {
    throw new Error('Remove.bg API key is not configured. Please set VITE_REMOVE_BG_API_KEY in your .env.local file.');
  }

  const formData = new FormData();

  if (options.imageFile) {
    formData.append('image_file', options.imageFile);
  } else if (options.imageUrl) {
    formData.append('image_url', options.imageUrl);
  } else {
    throw new Error('Either imageUrl or imageFile must be provided');
  }

  if (options.size) {
    formData.append('size', options.size);
  }

  if (options.format) {
    formData.append('format', options.format);
  }

  const response = await fetch(REMOVE_BG_API_URL, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`Remove.bg API error: ${error.error?.message || response.statusText}`);
  }

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  // Get image dimensions
  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  return {
    imageDataUrl: imageUrl,
    width: img.width,
    height: img.height,
  };
}

/**
 * Alternative: Use ClipDrop API if available
 */
export async function removeBackgroundClipDrop(
  imageFile: File
): Promise<RemoveBackgroundResult> {
  const apiKey = import.meta.env.VITE_CLIPDROP_API_KEY;

  if (!apiKey) {
    throw new Error('ClipDrop API key is not configured. Please set VITE_CLIPDROP_API_KEY in your .env.local file.');
  }

  const formData = new FormData();
  formData.append('image_file', imageFile);

  const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ClipDrop API error: ${response.statusText}`);
  }

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  return {
    imageDataUrl: imageUrl,
    width: img.width,
    height: img.height,
  };
}

